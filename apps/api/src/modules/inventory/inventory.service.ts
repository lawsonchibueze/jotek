import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { QueueService } from '@core/queue/queue.service';
import { eq, lte, sql } from 'drizzle-orm';

@Injectable()
export class InventoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly queue: QueueService,
  ) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  async findAll(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    return this.db.query.inventory.findMany({
      with: { variant: { with: { product: { columns: { id: true, name: true, sku: true } } } } },
      limit,
      offset,
    });
  }

  async findLowStock() {
    return this.db
      .select()
      .from(this.s.inventory)
      .where(
        sql`${this.s.inventory.quantity} - ${this.s.inventory.reservedQuantity} <= ${this.s.inventory.lowStockThreshold}`,
      );
  }

  async updateQuantity(variantId: string, quantity: number) {
    const inv = await this.db.query.inventory.findFirst({
      where: eq(this.s.inventory.variantId, variantId),
    });

    if (!inv) throw new NotFoundException('Inventory record not found');

    const prevAvailable = inv.quantity - inv.reservedQuantity;
    const nextAvailable = quantity - inv.reservedQuantity;

    const [updated] = await this.db
      .update(this.s.inventory)
      .set({ quantity, lastUpdated: new Date() })
      .where(eq(this.s.inventory.variantId, variantId))
      .returning();

    // Keep search index in sync (inStock facet)
    const variant = await this.db.query.productVariants.findFirst({
      where: eq(this.s.productVariants.id, variantId),
      columns: { productId: true },
    });
    if (variant) await this.queue.dispatchSyncProduct(variant.productId);

    // Fire back-in-stock notifications when crossing 0 → available
    if (prevAvailable <= 0 && nextAvailable > 0) {
      await this.queue.dispatchNotifyBackInStock(variantId);
    }

    return updated;
  }

  async decrementOnSale(variantId: string, quantity: number) {
    await this.db
      .update(this.s.inventory)
      .set({
        quantity: sql`${this.s.inventory.quantity} - ${quantity}`,
        reservedQuantity: sql`GREATEST(0, ${this.s.inventory.reservedQuantity} - ${quantity})`,
        lastUpdated: new Date(),
      })
      .where(eq(this.s.inventory.variantId, variantId));
  }
}
