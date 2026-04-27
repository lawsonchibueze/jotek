import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { RedisService } from '@core/redis/redis.service';
import { QueueService } from '@core/queue/queue.service';
import { and, desc, eq, sql } from 'drizzle-orm';
import axios from 'axios';

const PAYSTACK_BASE = 'https://api.paystack.co';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly queue: QueueService,
  ) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeTransaction(orderId: string, userEmail?: string) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new BadRequestException('Paystack is not configured');
    }

    const order = await this.db.query.orders.findFirst({
      where: eq(this.s.orders.id, orderId),
      with: { user: true } as any,
    });

    if (!order) throw new BadRequestException('Order not found');
    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const email =
      userEmail ??
      (order as any).user?.email ??
      order.guestEmail;

    if (!email) {
      throw new BadRequestException('Customer email is required before payment');
    }

    const reference = `JTK-${orderId.split('-')[0]}-${Date.now()}`;
    const amountKobo = Math.round(parseFloat(order.total.toString()) * 100);

    const existingPending = await this.db.query.payments.findFirst({
      where: and(
        eq(this.s.payments.orderId, order.id),
        eq(this.s.payments.status, 'PENDING'),
      ),
      orderBy: [desc(this.s.payments.createdAt)],
    });

    const existingInit = existingPending?.paystackResponse as
      | { authorization_url?: string }
      | null;
    const pendingAgeMs = existingPending
      ? Date.now() - new Date(existingPending.createdAt).getTime()
      : Infinity;

    if (existingPending && existingInit?.authorization_url && pendingAgeMs < 25 * 60 * 1000) {
      return {
        authorizationUrl: existingInit.authorization_url,
        reference: existingPending.paystackReference,
        orderId: order.id,
        orderNumber: order.orderNumber,
      };
    }

    const response = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email,
        amount: amountKobo,
        reference,
        metadata: {
          order_id: order.id,
          order_number: order.orderNumber,
        },
        callback_url: `${process.env.STOREFRONT_URL}/order-confirmation/${order.orderNumber}`,
        channels: ['card', 'bank', 'ussd', 'bank_transfer', 'mobile_money'],
      },
      { headers: this.headers },
    );

    // Create payment record
    await this.db.insert(this.s.payments).values({
      orderId: order.id,
      paystackReference: reference,
      amountKobo: amountKobo.toString(),
      status: 'PENDING',
      paystackResponse: response.data.data,
    });

    return {
      authorizationUrl: response.data.data.authorization_url,
      reference,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  async verifyTransaction(reference: string) {
    const response = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${reference}`,
      { headers: this.headers },
    );
    return response.data.data;
  }

  async handleWebhookSuccess(reference: string, paystackData: any) {
    // Idempotency — check if already processed
    const idempotencyKey = `paystack:processed:${reference}`;
    const alreadyProcessed = !(await this.redis.setIfAbsent(idempotencyKey, '1', 86400));

    if (alreadyProcessed) {
      this.logger.warn(`Duplicate webhook for reference: ${reference}`);
      return;
    }

    // Find the payment record
    const payment = await this.db.query.payments.findFirst({
      where: eq(this.s.payments.paystackReference, reference),
      with: { order: true } as any,
    });

    if (!payment) {
      this.logger.error(`Payment record not found for reference: ${reference}`);
      await this.redis.del(idempotencyKey);
      return;
    }

    if (payment.status === 'SUCCESS') {
      this.logger.log(`Payment ${reference} already marked successful`);
      return;
    }

    // Server-to-server verification
    const verified = await this.verifyTransaction(reference);

    if (verified.status !== 'success') {
      this.logger.error(`Verification failed for reference: ${reference}`);
      await this.redis.del(idempotencyKey);
      return;
    }

    // Amount verification — compare kobo amounts
    const expectedKobo = Number(payment.amountKobo);
    if (verified.amount !== expectedKobo) {
      this.logger.error(
        `Amount mismatch for ${reference}: expected ${expectedKobo} got ${verified.amount}`,
      );
      await this.db
        .update(this.s.orders)
        .set({
          status: 'PENDING_PAYMENT',
          adminNotes: sql`COALESCE(${this.s.orders.adminNotes} || E'\n', '') || ${`[PAYMENT_AMOUNT_MISMATCH] ${new Date().toISOString()} Reference: ${reference}`}`,
          updatedAt: new Date(),
        })
        .where(eq(this.s.orders.id, payment.orderId));
      return;
    }

    // Mark payment as successful (even if the order was auto-cancelled — the
    // payment record is the source of truth for what Paystack accepted).
    await this.db
      .update(this.s.payments)
      .set({
        status: 'SUCCESS',
        channel: verified.channel,
        paystackResponse: paystackData,
        verifiedAt: new Date(),
      })
      .where(eq(this.s.payments.paystackReference, reference));

    const [advancedOrder] = await this.db
      .update(this.s.orders)
      .set({ status: 'PAID', updatedAt: new Date() })
      .where(
        and(
          eq(this.s.orders.id, payment.orderId),
          eq(this.s.orders.status, 'PENDING_PAYMENT'),
        ),
      )
      .returning();

    // If the order timed out and was auto-cancelled before this webhook arrived,
    // don't silently flip it back to PAID — that would skip refund logic and
    // risk oversell since the reservation was already released. Flag for manual
    // reconciliation (admin can trigger a refund from the order page).
    const orderRow = (payment as any).order;
    if (!advancedOrder) {
      this.logger.warn(
        `Late or duplicate Paystack webhook for ${reference}: order ${payment.orderId} is ${orderRow?.status ?? 'unknown'}. Payment succeeded but order not advanced.`,
      );
      await this.db
        .update(this.s.orders)
        .set({
          adminNotes: sql`COALESCE(${this.s.orders.adminNotes} || E'\n', '') || ${`[LATE_OR_DUPLICATE_PAYMENT] ${new Date().toISOString()} Reference: ${reference}. Review for refund/reconciliation.`}`,
          updatedAt: new Date(),
        })
        .where(eq(this.s.orders.id, payment.orderId));
      return;
    }

    this.logger.log(`Order ${payment.orderId} marked as PAID (ref: ${reference})`);

    await this.queue.dispatchOrderPaid(payment.orderId);
  }

  async handleWebhookFailure(reference: string, paystackData: any) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(this.s.payments.paystackReference, reference),
    });

    if (!payment) {
      this.logger.warn(`Failed payment webhook without local record: ${reference}`);
      return;
    }

    if (payment.status === 'SUCCESS') {
      this.logger.warn(`Ignoring failed webhook for already-successful payment: ${reference}`);
      return;
    }

    await this.db
      .update(this.s.payments)
      .set({
        status: 'FAILED',
        paystackResponse: paystackData,
        verifiedAt: new Date(),
      })
      .where(eq(this.s.payments.paystackReference, reference));

    await this.db
      .update(this.s.orders)
      .set({
        adminNotes: sql`COALESCE(${this.s.orders.adminNotes} || E'\n', '') || ${`[PAYMENT_FAILED] ${new Date().toISOString()} Reference: ${reference}`}`,
        updatedAt: new Date(),
      })
      .where(eq(this.s.orders.id, payment.orderId));
  }

  async initiateRefund(orderId: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(this.s.payments.orderId, orderId),
    });

    if (!payment || payment.status !== 'SUCCESS') {
      throw new BadRequestException('No successful payment found for this order');
    }

    const response = await axios.post(
      `${PAYSTACK_BASE}/refund`,
      { transaction: payment.paystackReference },
      { headers: this.headers },
    );

    await this.db
      .update(this.s.payments)
      .set({ status: 'REVERSED' })
      .where(eq(this.s.payments.id, payment.id));

    await this.db
      .update(this.s.orders)
      .set({ status: 'REFUNDED', updatedAt: new Date() })
      .where(eq(this.s.orders.id, orderId));

    return response.data;
  }
}
