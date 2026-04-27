import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { and, gte, lte, sql, desc, eq } from 'drizzle-orm';

@Injectable()
export class AdminReportsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }
  private get s() {
    return this.database.schema;
  }

  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);

    const [[current], [previous], [customers], [pending], [lowStock]] = await Promise.all([
      this.db
        .select({
          revenue: sql<string>`COALESCE(SUM(total), 0)`,
          orders: sql<number>`COUNT(*)`,
        })
        .from(this.s.orders)
        .where(
          and(
            gte(this.s.orders.createdAt, thirtyDaysAgo),
            sql`${this.s.orders.status} != 'CANCELLED'`,
          ),
        ),
      this.db
        .select({ revenue: sql<string>`COALESCE(SUM(total), 0)` })
        .from(this.s.orders)
        .where(
          and(
            gte(this.s.orders.createdAt, sixtyDaysAgo),
            lte(this.s.orders.createdAt, thirtyDaysAgo),
            sql`${this.s.orders.status} != 'CANCELLED'`,
          ),
        ),
      this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(this.s.user)
        .where(eq(this.s.user.role, 'user')),
      this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(this.s.orders)
        .where(sql`${this.s.orders.status} IN ('PAID', 'PROCESSING')`),
      this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(this.s.inventory)
        .where(
          sql`${this.s.inventory.quantity} - ${this.s.inventory.reservedQuantity} <= ${this.s.inventory.lowStockThreshold}`,
        ),
    ]);

    const rev30 = parseFloat(current.revenue || '0');
    const revPrev = parseFloat(previous.revenue || '0');

    return {
      revenue30d: Math.round(rev30),
      orders30d: Number(current.orders),
      totalCustomers: Number(customers.count),
      lowStockCount: Number(lowStock.count),
      pendingFulfillment: Number(pending.count),
      revenueChangePercent: revPrev > 0 ? Math.round(((rev30 - revPrev) / revPrev) * 100) : 0,
    };
  }

  async getSalesReport(startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day') {
    const truncFn = groupBy === 'month' ? 'month' : groupBy === 'week' ? 'week' : 'day';

    return this.db
      .select({
        date: sql<string>`DATE_TRUNC('${sql.raw(truncFn)}', created_at)::date`,
        revenue: sql<string>`COALESCE(SUM(total), 0)`,
        orders: sql<number>`COUNT(*)`,
        aov: sql<string>`COALESCE(AVG(total), 0)`,
      })
      .from(this.s.orders)
      .where(
        and(
          gte(this.s.orders.createdAt, startDate),
          lte(this.s.orders.createdAt, endDate),
          sql`${this.s.orders.status} != 'CANCELLED'`,
        ),
      )
      .groupBy(sql`DATE_TRUNC('${sql.raw(truncFn)}', created_at)`)
      .orderBy(sql`DATE_TRUNC('${sql.raw(truncFn)}', created_at)`);
  }

  async getTopProducts(limit = 10) {
    const rows = await this.db
      .select({
        productId: this.s.orderItems.variantId,
        productName: this.s.orderItems.productName,
        unitsSold: sql<number>`SUM(${this.s.orderItems.quantity})`,
        revenue: sql<string>`SUM(${this.s.orderItems.totalPrice})`,
      })
      .from(this.s.orderItems)
      .groupBy(this.s.orderItems.variantId, this.s.orderItems.productName)
      .orderBy(desc(sql`SUM(${this.s.orderItems.quantity})`))
      .limit(limit);

    return rows.map((r) => ({
      productId: r.productId ?? '',
      productName: r.productName,
      unitsSold: Number(r.unitsSold),
      revenue: r.revenue,
    }));
  }
}
