import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { and, eq, inArray } from 'drizzle-orm';

@Injectable()
export class ReviewsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  async findByProduct(productId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return this.db.query.reviews.findMany({
      where: and(
        eq(this.s.reviews.productId, productId),
        eq(this.s.reviews.isApproved, true),
      ),
      with: { user: { columns: { id: true, name: true } } },
      limit,
      offset,
      orderBy: this.s.reviews.createdAt,
    });
  }

  async create(params: {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    body?: string;
  }) {
    if (params.rating < 1 || params.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const existing = await this.db.query.reviews.findFirst({
      where: and(
        eq(this.s.reviews.productId, params.productId),
        eq(this.s.reviews.userId, params.userId),
      ),
    });

    if (existing) throw new BadRequestException('You have already reviewed this product');

    // Derive verified-purchase server-side: did the user ever have a delivered
    // order containing any variant of this product? Client can't spoof this.
    const isVerifiedPurchase = await this.hasDeliveredPurchase(
      params.userId,
      params.productId,
    );

    const [review] = await this.db
      .insert(this.s.reviews)
      .values({
        productId: params.productId,
        userId: params.userId,
        rating: params.rating,
        title: params.title,
        body: params.body,
        isVerifiedPurchase,
        isApproved: false,
      })
      .returning();

    return review;
  }

  private async hasDeliveredPurchase(userId: string, productId: string): Promise<boolean> {
    const { db, schema: s } = this.database;

    // All variant IDs for the product
    const variants = await db.query.productVariants.findMany({
      where: eq(s.productVariants.productId, productId),
      columns: { id: true },
    });
    if (!variants.length) return false;
    const variantIds = variants.map((v) => v.id);

    // Orders owned by this user that are DELIVERED
    const deliveredOrders = await db.query.orders.findMany({
      where: and(
        eq(s.orders.userId, userId),
        eq(s.orders.status, 'DELIVERED'),
      ),
      columns: { id: true },
    });
    if (!deliveredOrders.length) return false;
    const orderIds = deliveredOrders.map((o) => o.id);

    // Any matching order item?
    const item = await db.query.orderItems.findFirst({
      where: and(
        inArray(s.orderItems.orderId, orderIds),
        inArray(s.orderItems.variantId, variantIds),
      ),
      columns: { id: true },
    });

    return !!item;
  }
}
