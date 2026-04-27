import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { and, eq, isNull } from 'drizzle-orm';

@Injectable()
export class StockAlertsService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db; }
  private get s() { return this.database.schema; }

  async subscribe(params: { variantId: string; email: string; userId?: string }) {
    const { variantId, email, userId } = params;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address');
    }

    const variant = await this.db.query.productVariants.findFirst({
      where: eq(this.s.productVariants.id, variantId),
    });
    if (!variant) throw new BadRequestException('Variant not found');

    // Only accept subscription if variant is currently unavailable — otherwise
    // there's no benefit to subscribing.
    const inv = await this.db.query.inventory.findFirst({
      where: eq(this.s.inventory.variantId, variantId),
    });
    const available = (inv?.quantity ?? 0) - (inv?.reservedQuantity ?? 0);
    if (available > 0) {
      throw new BadRequestException('This product is already in stock');
    }

    // Dedupe pending alerts by (variantId, email, notifiedAt=NULL).
    const existing = await this.db.query.stockAlertSubscriptions.findFirst({
      where: and(
        eq(this.s.stockAlertSubscriptions.variantId, variantId),
        eq(this.s.stockAlertSubscriptions.email, email),
        isNull(this.s.stockAlertSubscriptions.notifiedAt),
      ),
    });
    if (existing) return { alreadySubscribed: true };

    await this.db.insert(this.s.stockAlertSubscriptions).values({
      variantId,
      email,
    });

    return { alreadySubscribed: false };
  }
}
