import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { OptionalSessionGuard } from '@core/auth/guards/optional-session.guard';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import type { User } from '@core/auth/auth';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @UseGuards(OptionalSessionGuard)
  initialize(
    @Body() body: { orderId: string },
    @CurrentUser() user?: User,
  ) {
    return this.paymentsService.initializeTransaction(body.orderId, user?.email);
  }
}
