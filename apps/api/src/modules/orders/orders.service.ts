import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { QueueService } from '@core/queue/queue.service';
import { CartService } from '../cart/cart.service';
import { eq, and, desc, sql } from 'drizzle-orm';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/create-order.dto';
import { generateOrderNumber } from '../../utils/slug';
import type { User } from '@core/auth/auth';

// Nigerian VAT (7.5%) — displayed prices are VAT-inclusive, so we derive the
// embedded tax from the total: embeddedVAT = total × rate / (100 + rate).
// Record it for FIRS reporting & receipt transparency; it does NOT change
// the amount the customer pays.
const VAT_RATE = 7.5;

// How long a PENDING_PAYMENT order holds its inventory reservation before
// auto-cancellation. Matches typical Paystack checkout-page lifetime.
const PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;
const INVENTORY_COMMITTED_TAG = '[INVENTORY_COMMITTED]';
const INVENTORY_RESTOCKED_TAG = '[INVENTORY_RESTOCKED]';

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  RETURNED: ['REFUNDED'],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly cartService: CartService,
    private readonly queue: QueueService,
  ) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  private appendAdminNote(existing: string | null | undefined, note: string) {
    return [existing, note].filter(Boolean).join('\n');
  }

  private async releaseReservedInventory(tx: any, orderId: string) {
    const items = await tx.query.orderItems.findMany({
      where: eq(this.s.orderItems.orderId, orderId),
    });

    for (const item of items) {
      if (!item.variantId) continue;
      await tx
        .update(this.s.inventory)
        .set({
          reservedQuantity: sql`GREATEST(0, ${this.s.inventory.reservedQuantity} - ${item.quantity})`,
          lastUpdated: new Date(),
        })
        .where(eq(this.s.inventory.variantId, item.variantId));
    }
  }

  private async restockCommittedInventory(tx: any, order: any) {
    if (!order.adminNotes?.includes(INVENTORY_COMMITTED_TAG)) return order.adminNotes ?? null;
    if (order.adminNotes?.includes(INVENTORY_RESTOCKED_TAG)) return order.adminNotes ?? null;

    const items = await tx.query.orderItems.findMany({
      where: eq(this.s.orderItems.orderId, order.id),
    });

    for (const item of items) {
      if (!item.variantId) continue;
      await tx
        .update(this.s.inventory)
        .set({
          quantity: sql`${this.s.inventory.quantity} + ${item.quantity}`,
          reservedQuantity: sql`GREATEST(0, ${this.s.inventory.reservedQuantity} - ${item.quantity})`,
          lastUpdated: new Date(),
        })
        .where(eq(this.s.inventory.variantId, item.variantId));
    }

    return this.appendAdminNote(
      order.adminNotes,
      `${INVENTORY_RESTOCKED_TAG} ${new Date().toISOString()}`,
    );
  }

  private async applyCancellationInventory(tx: any, order: any) {
    if (order.adminNotes?.includes(INVENTORY_COMMITTED_TAG)) {
      return this.restockCommittedInventory(tx, order);
    }

    await this.releaseReservedInventory(tx, order.id);
    return order.adminNotes ?? null;
  }

  async create(dto: CreateOrderDto, user?: User) {
    // 1. Fetch and validate cart
    const cart = await this.db.query.carts.findFirst({
      where: eq(this.s.carts.id, dto.cartId),
      with: {
        items: {
          with: {
            variant: {
              with: { inventory: true, product: { with: { images: true } } },
            },
          },
        },
        coupon: true,
      },
    });

    if (!cart || !cart.items.length) {
      throw new BadRequestException('Cart is empty or not found');
    }

    // 2. Fetch shipping zone
    const zone = await this.db.query.shippingZones.findFirst({
      where: eq(this.s.shippingZones.id, dto.shippingZoneId),
    });

    if (!zone || !zone.isActive) throw new BadRequestException('Invalid shipping zone');

    // 3. Validate POD
    if (dto.paymentMethod === 'PAY_ON_DELIVERY' && !zone.podEnabled) {
      throw new BadRequestException('Pay-on-Delivery is not available for this zone');
    }

    // 4. Resolve shipping address
    let shippingAddress: any;

    if (dto.addressId) {
      const addr = await this.db.query.addresses.findFirst({
        where: and(
          eq(this.s.addresses.id, dto.addressId),
          eq(this.s.addresses.userId, user!.id),
        ),
      });
      if (!addr) throw new BadRequestException('Address not found');
      shippingAddress = addr;
    } else if (dto.guestAddress) {
      shippingAddress = { ...dto.guestAddress, country: 'NG' };
    } else {
      throw new BadRequestException('Shipping address is required');
    }

    // 5. Compute totals
    let subtotal = 0;
    for (const item of cart.items) {
      subtotal += parseFloat(item.priceAtAdd) * item.quantity;
    }

    let discountAmount = 0;
    if (cart.coupon) {
      const c = cart.coupon;
      if (c.type === 'PERCENTAGE') {
        discountAmount = Math.min(
          (subtotal * parseFloat(c.value)) / 100,
          c.maxDiscountAmount ? parseFloat(c.maxDiscountAmount) : Infinity,
        );
      } else if (c.type === 'FIXED_AMOUNT') {
        discountAmount = parseFloat(c.value);
      } else if (c.type === 'FREE_SHIPPING') {
        // handled in shippingFee
      }
    }

    let shippingFee =
      cart.coupon?.type === 'FREE_SHIPPING' ? 0 : parseFloat(zone.baseRate.toString());

    const total = Math.max(0, subtotal - discountAmount + shippingFee);
    const taxAmount = total * (VAT_RATE / (100 + VAT_RATE));

    // 6. Validate POD max order value (₦150,000 cap)
    if (dto.paymentMethod === 'PAY_ON_DELIVERY' && total > 150_000) {
      throw new BadRequestException('Pay-on-Delivery is only available for orders under ₦150,000');
    }

    // 7. Create order in a transaction
    const orderNumber = generateOrderNumber();

    const order = await this.db.transaction(async (tx) => {
      const [created] = await tx.insert(this.s.orders).values({
      orderNumber,
      userId: user?.id ?? null,
      guestEmail: dto.guestEmail,
      guestPhone: dto.guestPhone,
      status: dto.paymentMethod === 'PAY_ON_DELIVERY' ? 'PROCESSING' : 'PENDING_PAYMENT',
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      paymentMethod: dto.paymentMethod,
      deliveryMethod: dto.deliveryMethod,
      shippingAddress,
      shippingZoneId: zone.id,
      couponId: cart.couponId ?? null,
      notes: dto.notes,
      }).returning();

    // 8. Insert order items (snapshot variant + product data)
      await tx.insert(this.s.orderItems).values(
      cart.items.map((item) => ({
        orderId: created.id,
        variantId: item.variantId,
        productName: item.variant.product?.name ?? 'Unknown',
        variantDescription: [item.variant.color, item.variant.storage, item.variant.ram]
          .filter(Boolean)
          .join(' / '),
        imageUrl: item.variant.product?.images?.[0]?.url ?? null,
        quantity: item.quantity,
        unitPrice: item.priceAtAdd,
        totalPrice: (parseFloat(item.priceAtAdd) * item.quantity).toFixed(2),
      })),
    );

    // 9. Reserve inventory
    for (const item of cart.items) {
      const [reserved] = await tx
        .update(this.s.inventory)
        .set({
          reservedQuantity: sql`${this.s.inventory.reservedQuantity} + ${item.quantity}`,
          lastUpdated: new Date(),
        })
        .where(
          and(
            eq(this.s.inventory.variantId, item.variantId),
            sql`${this.s.inventory.quantity} - ${this.s.inventory.reservedQuantity} >= ${item.quantity}`,
          ),
        )
        .returning({ id: this.s.inventory.id });

      if (!reserved) {
        throw new BadRequestException(
          `Insufficient stock for ${item.variant.product?.name ?? 'selected item'}`,
        );
      }
    }

    // 10. Mark coupon as used (count bump — actual usage record created post-payment)
      return created;
    });

    // 11. For POD the order is immediately "paid" in the fulfilment sense —
    //     no Paystack webhook will fire, so dispatch the post-paid job here
    //     so inventory decrements and confirmation email/SMS still send.
    //     For Paystack orders, schedule a timeout to release the reservation
    //     if the customer never completes payment.
    if (dto.paymentMethod === 'PAY_ON_DELIVERY') {
      await this.queue.dispatchOrderPaid(order.id);
    } else {
      await this.queue.dispatchReleaseStaleReservation(order.id, PAYMENT_TIMEOUT_MS);
    }

    return { order, total: total.toFixed(2) };
  }

  async findByUser(userId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const orders = await this.db.query.orders.findMany({
      where: eq(this.s.orders.userId, userId),
      with: { items: true, payment: true, shipment: true },
      orderBy: [desc(this.s.orders.createdAt)],
      limit,
      offset,
    });
    return orders;
  }

  async findByOrderNumber(orderNumber: string, userId?: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(this.s.orders.orderNumber, orderNumber),
      with: { items: true, payment: true, shipment: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Ownership: if the order belongs to a logged-in user, require the
    // requester to be that same user. Guest orders (order.userId === null)
    // stay accessible by order number — customers need to reach their
    // confirmation page after checkout without a session.
    if (order.userId) {
      if (!userId || order.userId !== userId) {
        throw new NotFoundException('Order not found');
      }
    }

    return order;
  }

  async trackPublic(orderNumber: string, phone: string) {
    const order = await this.db.query.orders.findFirst({
      where: eq(this.s.orders.orderNumber, orderNumber),
      with: { shipment: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Verify phone matches either address or guest phone
    const addr = order.shippingAddress as any;
    const matchesPhone =
      order.guestPhone === phone ||
      (addr?.phone === phone);

    if (!matchesPhone) throw new NotFoundException('Order not found');

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      shipment: order.shipment,
    };
  }

  async cancel(orderNumber: string, userId: string) {
    const order = await this.findByOrderNumber(orderNumber, userId);
    if (!['PENDING_PAYMENT', 'PROCESSING'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    return this.db.transaction(async (tx) => {
      const current = await tx.query.orders.findFirst({
        where: eq(this.s.orders.id, order.id),
      });

      if (!current) throw new NotFoundException('Order not found');
      if (!['PENDING_PAYMENT', 'PROCESSING'].includes(current.status)) {
        throw new BadRequestException('Order cannot be cancelled at this stage');
      }

      const adminNotes = await this.applyCancellationInventory(tx, current);

      const [cancelled] = await tx
        .update(this.s.orders)
        .set({
          status: 'CANCELLED',
          adminNotes,
          cancelledReason: 'CUSTOMER_CANCELLED',
          updatedAt: new Date(),
        })
        .where(eq(this.s.orders.id, order.id))
        .returning();

      return cancelled;
    });
  }

  private readonly RETURN_WINDOW_DAYS = 7;
  private readonly RETURN_TAG = '[RETURN REQUESTED]';

  async requestReturn(orderNumber: string, userId: string, reason: string) {
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('Please provide a reason (at least 10 characters)');
    }

    const order = await this.findByOrderNumber(orderNumber, userId);

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    // Enforce return window based on when the order was last updated (i.e. DELIVERED timestamp)
    const deliveredAt = new Date(order.updatedAt).getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    if (Date.now() - deliveredAt > this.RETURN_WINDOW_DAYS * msPerDay) {
      throw new BadRequestException(
        `Return window (${this.RETURN_WINDOW_DAYS} days after delivery) has closed`,
      );
    }

    if (order.adminNotes?.includes(this.RETURN_TAG)) {
      throw new BadRequestException('A return has already been requested for this order');
    }

    const stamp = new Date().toISOString();
    const newNote = `${this.RETURN_TAG} ${stamp}\nReason: ${reason.trim()}`;
    const merged = order.adminNotes ? `${newNote}\n\n---\n${order.adminNotes}` : newNote;

    await this.db
      .update(this.s.orders)
      .set({ adminNotes: merged, updatedAt: new Date() })
      .where(eq(this.s.orders.id, order.id));

    return { success: true };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    return this.db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: eq(this.s.orders.id, id),
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status === dto.status) return order;

      const allowed = ADMIN_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(`Cannot move order from ${order.status} to ${dto.status}`);
      }

      let adminNotes = order.adminNotes ?? null;
      if (dto.status === 'CANCELLED') {
        adminNotes = await this.applyCancellationInventory(tx, order);
      }

      if (dto.adminNotes) {
        adminNotes = this.appendAdminNote(adminNotes, dto.adminNotes);
      }

      const [updated] = await tx
        .update(this.s.orders)
        .set({
          status: dto.status as any,
          adminNotes,
          cancelledReason: dto.status === 'CANCELLED' ? dto.cancelledReason : order.cancelledReason,
          updatedAt: new Date(),
        })
        .where(eq(this.s.orders.id, id))
        .returning();

      return updated;
    });
  }
}
