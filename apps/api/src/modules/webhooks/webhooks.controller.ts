import {
  Controller,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PaymentsService } from '../payments/payments.service';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('paystack')
  @HttpCode(200)
  async handlePaystack(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // Step 1: Verify HMAC-SHA512 signature
    // Paystack uses SHA512, NOT SHA256.
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException('Missing raw body');
    }

    const hash = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex');

    const expected = Buffer.from(hash, 'hex');
    const received = Buffer.from(signature ?? '', 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      this.logger.warn('Invalid Paystack webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Step 2: Parse event
    const event = JSON.parse(rawBody.toString('utf8'));
    this.logger.log(`Paystack webhook: ${event.event} — ${event.data?.reference}`);

    // Step 3: Route by event type
    switch (event.event) {
      case 'charge.success':
        await this.paymentsService.handleWebhookSuccess(
          event.data.reference,
          event.data,
        ).catch((err) => {
          this.logger.error(`Webhook processing error: ${err.message}`, err.stack);
          // Still return 200 so Paystack doesn't retry — errors are logged
        });
        break;

      case 'charge.failed':
        await this.paymentsService.handleWebhookFailure(
          event.data.reference,
          event.data,
        ).catch((err) => {
          this.logger.error(`Failed-payment webhook processing error: ${err.message}`, err.stack);
        });
        break;

      case 'refund.processed':
        this.logger.log(`Refund processed: ${event.data.transaction_reference}`);
        break;

      default:
        this.logger.debug(`Unhandled Paystack event: ${event.event}`);
    }

    // Must respond 200 quickly (< 5 seconds)
    return { received: true };
  }
}
