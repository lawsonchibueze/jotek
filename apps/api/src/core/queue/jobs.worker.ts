import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DatabaseService } from '@core/database/database.service';
import { RedisService } from '@core/redis/redis.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { SearchService } from '@modules/search/search.service';

const makeWorkerConnection = () =>
  new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

const INVENTORY_COMMITTED_TAG = '[INVENTORY_COMMITTED]';
const ORDER_PAID_JOB_DONE_TAG = '[ORDER_PAID_JOB_DONE]';

@Injectable()
export class JobsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsWorker.name);
  private worker!: Worker;

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly search: SearchService,
  ) {}

  onModuleInit() {
    this.worker = new Worker('jobs', (job: Job) => this.process(job), {
      connection: makeWorkerConnection(),
      concurrency: 5,
    });

    this.worker.on('completed', (job) =>
      this.logger.log(`Job ${job.name}:${job.id} completed`),
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job ${job?.name}:${job?.id} failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'order-paid':
        return this.handleOrderPaid(job.data.orderId);
      case 'sync-product':
        return this.handleSyncProduct(job.data.productId);
      case 'delete-product':
        return this.handleDeleteProduct(job.data.productId);
      case 'release-stale-reservation':
        return this.handleReleaseStaleReservation(job.data.orderId);
      case 'sweep-abandoned-carts':
        return this.handleSweepAbandonedCarts();
      case 'notify-back-in-stock':
        return this.handleNotifyBackInStock(job.data.variantId);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleNotifyBackInStock(variantId: string) {
    const { db, schema: s } = this.database;

    const variant = await db.query.productVariants.findFirst({
      where: eq(s.productVariants.id, variantId),
      with: {
        product: { with: { images: true } },
      } as any,
    });
    if (!variant || !(variant as any).product) return;

    const product = (variant as any).product;
    const primaryImage =
      product.images?.find((i: any) => i.isPrimary)?.url ?? product.images?.[0]?.url ?? null;
    const variantDescription = [variant.color, variant.storage, variant.ram].filter(Boolean).join(' / ') || null;
    const storefront = (process.env.STOREFRONT_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const productUrl = `${storefront}/products/${product.slug}`;

    const pending = await db.query.stockAlertSubscriptions.findMany({
      where: and(
        eq(s.stockAlertSubscriptions.variantId, variantId),
        isNull(s.stockAlertSubscriptions.notifiedAt),
      ),
    });

    for (const alert of pending) {
      try {
        await this.notifications.sendBackInStockEmail({
          to: alert.email,
          productName: product.name,
          variantDescription,
          productUrl,
          imageUrl: primaryImage,
        });
        await db
          .update(s.stockAlertSubscriptions)
          .set({ notifiedAt: new Date() })
          .where(eq(s.stockAlertSubscriptions.id, alert.id));
      } catch (err: any) {
        this.logger.error(`Back-in-stock email failed for alert ${alert.id}: ${err.message}`);
      }
    }

    if (pending.length) {
      this.logger.log(`Notified ${pending.length} subscribers for variant ${variantId}`);
    }
  }

  private async handleSweepAbandonedCarts() {
    const { db, schema: s } = this.database;

    // Carts with items, logged-in user (guests have no email), not touched in
    // the last 24h, and not older than 30d (stale — unlikely to convert).
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const carts = await db.query.carts.findMany({
      where: sql`${s.carts.userId} IS NOT NULL
        AND ${s.carts.updatedAt} <= ${twentyFourHoursAgo.toISOString()}
        AND ${s.carts.updatedAt} >= ${thirtyDaysAgo.toISOString()}`,
      with: {
        user: { columns: { email: true, name: true } } as any,
        items: {
          with: {
            variant: {
              with: { product: { with: { images: true } } },
            },
          },
        },
      } as any,
      limit: 100,
    });

    const storefront = (process.env.STOREFRONT_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    let sent = 0;

    for (const cart of carts as any[]) {
      if (!cart.items?.length) continue;
      if (!cart.user?.email) continue;

      // Dedupe via Redis — don't re-email the same cart for 7 days even if
      // the user keeps bumping it (e.g. adding then removing items).
      const key = `cart:abandoned-sent:${cart.id}`;
      if (await this.redis.exists(key)) continue;

      const items = cart.items.map((it: any) => ({
        name: it.variant?.product?.name ?? 'Item',
        variantDescription: [it.variant?.color, it.variant?.storage, it.variant?.ram]
          .filter(Boolean)
          .join(' / ') || null,
        imageUrl: it.variant?.product?.images?.find((i: any) => i.isPrimary)?.url
          ?? it.variant?.product?.images?.[0]?.url
          ?? null,
        price: it.priceAtAdd,
        quantity: it.quantity,
      }));

      try {
        await this.notifications.sendAbandonedCartEmail({
          to: cart.user.email,
          name: cart.user.name ?? cart.user.email,
          items,
          cartUrl: `${storefront}/cart`,
        });
        await this.redis.set(key, '1', 7 * 24 * 60 * 60);
        sent++;
      } catch (err: any) {
        this.logger.error(`Abandoned-cart email failed for ${cart.id}: ${err.message}`);
      }
    }

    if (sent > 0) this.logger.log(`Abandoned-cart sweep sent ${sent} emails`);
  }

  private async handleReleaseStaleReservation(orderId: string) {
    const { db, schema: s } = this.database;

    let order = await db.query.orders.findFirst({
      where: eq(s.orders.id, orderId),
      with: { items: true } as any,
    });

    if (!order) return;

    // Only cancel orders still awaiting payment. Anything else (PAID, PROCESSING,
    // CANCELLED) means the timeout is irrelevant — either the customer paid or
    // the order was already cancelled elsewhere.
    if (order.status !== 'PENDING_PAYMENT') {
      this.logger.log(`Stale-reservation skip: order ${orderId} is ${order.status}`);
      return;
    }

    await db
      .update(s.orders)
      .set({
        status: 'CANCELLED',
        cancelledReason: 'PAYMENT_TIMEOUT',
        updatedAt: new Date(),
      })
      .where(eq(s.orders.id, orderId));

    // Release reserved inventory so other shoppers aren't blocked
    for (const item of (order as any).items ?? []) {
      if (!item.variantId) continue;
      await db
        .update(s.inventory)
        .set({
          reservedQuantity: sql`GREATEST(0, ${s.inventory.reservedQuantity} - ${item.quantity})`,
          lastUpdated: new Date(),
        })
        .where(eq(s.inventory.variantId, item.variantId));
    }

    this.logger.log(`Released stale reservation for order ${orderId}`);
  }

  private async handleOrderPaid(orderId: string) {
    const { db, schema: s } = this.database;

    let order = await db.query.orders.findFirst({
      where: eq(s.orders.id, orderId),
      with: {
        items: true,
        user: true,
      } as any,
    });

    if (!order) {
      this.logger.error(`Order not found for order-paid job: ${orderId}`);
      return;
    }

    // Move inventory from reserved → sold
    if (order.adminNotes?.includes(ORDER_PAID_JOB_DONE_TAG)) {
      this.logger.log(`order-paid skipped for ${orderId}; already completed`);
      return;
    }

    if (!order.adminNotes?.includes(INVENTORY_COMMITTED_TAG)) {
      if (!['PAID', 'PROCESSING'].includes(order.status)) {
        this.logger.warn(`order-paid skipped for ${orderId}; order is ${order.status}`);
        return;
      }

      await db.transaction(async (tx) => {
        const locked = await tx.query.orders.findFirst({
          where: eq(s.orders.id, orderId),
          with: { items: true } as any,
        });

        if (!locked) return;
        if (locked.adminNotes?.includes(INVENTORY_COMMITTED_TAG)) return;
        if (!['PAID', 'PROCESSING'].includes(locked.status)) {
          throw new Error(`Order ${orderId} is ${locked.status}; cannot commit inventory`);
        }

        for (const item of (locked as any).items ?? []) {
          if (!item.variantId) continue;
          const [updated] = await tx
            .update(s.inventory)
            .set({
              quantity: sql`${s.inventory.quantity} - ${item.quantity}`,
              reservedQuantity: sql`GREATEST(0, ${s.inventory.reservedQuantity} - ${item.quantity})`,
              lastUpdated: new Date(),
            })
            .where(
              and(
                eq(s.inventory.variantId, item.variantId),
                sql`${s.inventory.quantity} >= ${item.quantity}`,
              ),
            )
            .returning({ id: s.inventory.id });

          if (!updated) {
            throw new Error(`Insufficient committed inventory for variant ${item.variantId}`);
          }
        }

        if (locked.couponId) {
          await tx
            .update(s.coupons)
            .set({ usedCount: sql`${s.coupons.usedCount} + 1` })
            .where(eq(s.coupons.id, locked.couponId));

          await tx.insert(s.couponUsages).values({
            couponId: locked.couponId,
            userId: locked.userId ?? null,
            orderId: locked.id,
            discountApplied: locked.discountAmount,
          });
        }

        await tx
          .update(s.orders)
          .set({
            status: 'PROCESSING',
            adminNotes: sql`COALESCE(${s.orders.adminNotes} || E'\n', '') || ${`${INVENTORY_COMMITTED_TAG} ${new Date().toISOString()}`}`,
            updatedAt: new Date(),
          })
          .where(eq(s.orders.id, orderId));
      });

      order = await db.query.orders.findFirst({
        where: eq(s.orders.id, orderId),
        with: {
          items: true,
          user: true,
        } as any,
      });

      if (!order) return;
    }

    const variantIds: string[] = [];
    for (const item of (order as any).items ?? []) {
      if (item.variantId) variantIds.push(item.variantId);
    }

    // Re-index affected products so search's inStock facet stays accurate
    if (variantIds.length) {
      const variants = await db.query.productVariants.findMany({
        where: inArray(s.productVariants.id, variantIds),
        columns: { productId: true },
      });
      const productIds = [...new Set(variants.map((v) => v.productId))];
      for (const pid of productIds) {
        await this.handleSyncProduct(pid).catch((err) =>
          this.logger.error(`Post-paid re-index failed for ${pid}: ${err.message}`),
        );
      }
    }

    // Confirmation email
    const recipientEmail = (order as any).user?.email ?? order.guestEmail;
    if (recipientEmail) {
      await this.notifications.sendOrderConfirmation({
        to: recipientEmail,
        name: (order as any).user?.name ?? recipientEmail,
        orderNumber: order.orderNumber,
        total: parseFloat(order.total.toString()).toFixed(2),
        items: ((order as any).items ?? []).map((i: any) => ({
          name: [i.productName, i.variantDescription].filter(Boolean).join(' — '),
          quantity: i.quantity,
          price: parseFloat((i.unitPrice ?? 0).toString()).toFixed(2),
        })),
      });
    }

    // SMS notification
    const phone = (order as any).user?.phoneNumber ?? order.guestPhone;
    if (phone) {
      await this.notifications.sendOrderSms(phone, order.orderNumber, 'PAID');
    }

    // Low-stock admin alert (debounced to once per 12h)
    await this.maybeSendLowStockAlert().catch((err) =>
      this.logger.error(`Low-stock alert check failed: ${err.message}`),
    );

    await db
      .update(s.orders)
      .set({
        adminNotes: sql`COALESCE(${s.orders.adminNotes} || E'\n', '') || ${`${ORDER_PAID_JOB_DONE_TAG} ${new Date().toISOString()}`}`,
        updatedAt: new Date(),
      })
      .where(eq(s.orders.id, orderId));

    this.logger.log(`order-paid handled for ${orderId}`);
  }

  private async maybeSendLowStockAlert() {
    const DEBOUNCE_KEY = 'alert:low-stock:sent';
    const DEBOUNCE_SECONDS = 12 * 60 * 60;

    if (await this.redis.exists(DEBOUNCE_KEY)) return;

    const { db, schema: s } = this.database;

    // Fetch low-stock rows together with variant SKU + product name
    const rows = await db
      .select({
        sku: s.productVariants.sku,
        name: s.products.name,
        quantity: sql<number>`${s.inventory.quantity} - ${s.inventory.reservedQuantity}`,
      })
      .from(s.inventory)
      .innerJoin(s.productVariants, eq(s.productVariants.id, s.inventory.variantId))
      .innerJoin(s.products, eq(s.products.id, s.productVariants.productId))
      .where(
        sql`${s.inventory.quantity} - ${s.inventory.reservedQuantity} <= ${s.inventory.lowStockThreshold}`,
      );

    if (!rows.length) return;

    await this.notifications.sendAdminLowStockAlert(
      rows.map((r) => ({ sku: r.sku, name: r.name, quantity: Number(r.quantity) })),
    );

    // Mark as sent to suppress further alerts for 12h
    await this.redis.set(DEBOUNCE_KEY, '1', DEBOUNCE_SECONDS);
    this.logger.log(`Low-stock alert sent for ${rows.length} items`);
  }

  private async handleSyncProduct(productId: string) {
    const { db, schema: s } = this.database;

    const product = await db.query.products.findFirst({
      where: eq(s.products.id, productId),
      with: {
        brand: true,
        category: true,
        variants: { with: { inventory: true } },
        images: {
          where: eq(s.productImages.isPrimary, true),
          limit: 1,
        },
      },
    });

    if (!product) {
      this.logger.warn(`Product ${productId} not found for sync`);
      return;
    }

    await this.search.indexProduct(product);
    this.logger.log(`sync-product handled for ${productId}`);
  }

  private async handleDeleteProduct(productId: string) {
    await this.search.deleteProduct(productId);
    this.logger.log(`delete-product handled for ${productId}`);
  }
}
