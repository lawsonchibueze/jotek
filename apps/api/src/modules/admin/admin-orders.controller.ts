import { Body, Controller, Get, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '@core/auth/guards/admin.guard';
import { UpdateOrderStatusDto } from '../orders/dto/create-order.dto';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DatabaseService } from '@core/database/database.service';
import { desc, eq, sql } from 'drizzle-orm';

@ApiTags('admin')
@Controller('admin/orders')
@UseGuards(AdminGuard)
export class AdminOrdersController {
  private readonly logger = new Logger(AdminOrdersController.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  private mapOrder(order: any) {
    return {
      ...order,
      customerName: order.user?.name ?? order.guestEmail ?? 'Guest',
      customerEmail: order.user?.email ?? order.guestEmail ?? '',
      customerPhone: order.user?.phoneNumber ?? order.guestPhone ?? null,
      items: order.items?.map((i: any) => ({ ...i, variantLabel: i.variantDescription })) ?? [],
      payment: order.payment
        ? {
            id: order.payment.id,
            reference: order.payment.paystackReference,
            channel: order.payment.channel,
            status: order.payment.status,
            amountKobo: order.payment.amountKobo,
            verifiedAt: order.payment.verifiedAt,
            createdAt: order.payment.createdAt,
          }
        : null,
    };
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const offset = (Number(page) - 1) * Number(limit);
    const where = status ? eq(this.s.orders.status, status as any) : undefined;

    const [data, [{ count }]] = await Promise.all([
      this.db.query.orders.findMany({
        where,
        with: {
          user: { columns: { id: true, name: true, email: true, phoneNumber: true } },
          items: true,
          payment: true,
        },
        orderBy: [desc(this.s.orders.createdAt)],
        limit: Number(limit),
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.s.orders)
        .where(where),
    ]);

    return {
      data: data.map((o) => this.mapOrder(o)),
      total: Number(count),
      pages: Math.ceil(Number(count) / Number(limit)),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(this.s.orders.id, id),
      with: {
        user: { columns: { id: true, name: true, email: true, phoneNumber: true } },
        items: true,
        payment: true,
        shipment: true,
      },
    });

    if (!order) return null;

    return this.mapOrder(order);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    await this.ordersService.updateStatus(id, dto);

    if (dto.status === 'DELIVERED') {
      await this.db
        .update(this.s.shipments)
        .set({ status: 'DELIVERED', deliveredAt: new Date(), updatedAt: new Date() })
        .where(eq(this.s.shipments.orderId, id));
    }

    // Notify customer on shipping milestones
    if (dto.status === 'SHIPPED' || dto.status === 'DELIVERED') {
      const order = await this.db.query.orders.findFirst({
        where: eq(this.s.orders.id, id),
        with: {
          user: { columns: { phoneNumber: true } },
        } as any,
      });
      const phone =
        (order as any)?.user?.phoneNumber ?? order?.guestPhone ?? null;
      if (order && phone) {
        this.notifications
          .sendOrderSms(phone, order.orderNumber, dto.status)
          .catch((err) =>
            this.logger.error(`SMS on ${dto.status} failed: ${err.message}`),
          );
      }
    }

    return this.findOne(id);
  }

  @Patch(':id/shipment')
  async upsertShipment(@Param('id') id: string, @Body() body: any) {
    const existing = await this.db.query.shipments.findFirst({
      where: eq(this.s.shipments.orderId, id),
    });

    const shipmentData = {
      carrier: body.carrier,
      trackingNumber: body.trackingNumber ?? null,
      trackingUrl: body.trackingUrl ?? null,
      status: 'IN_TRANSIT' as const,
      estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : null,
    };

    if (existing) {
      await this.db
        .update(this.s.shipments)
        .set({ ...shipmentData, updatedAt: new Date() })
        .where(eq(this.s.shipments.id, existing.id));
    } else {
      await this.db.insert(this.s.shipments).values({ orderId: id, ...shipmentData });
    }

    return this.findOne(id);
  }

  @Post(':id/refund')
  refund(@Param('id') id: string) {
    return this.paymentsService.initiateRefund(id);
  }
}
