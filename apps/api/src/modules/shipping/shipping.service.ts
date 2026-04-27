import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class ShippingService {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }
  private get s() {
    return this.database.schema;
  }

  async findAvailable(state?: string) {
    const zones = await this.db.query.shippingZones.findMany({
      where: eq(this.s.shippingZones.isActive, true),
    });

    // Filter to zones that cover the requested state (or return all if no state given)
    const filtered = state
      ? zones.filter(
          (z) =>
            z.states.length === 0 ||
            z.states.some((s) => s.toLowerCase() === state.toLowerCase()),
        )
      : zones;

    return filtered.map((z) => ({
      zoneId: z.id,
      name: z.name,
      carrier: z.carrier,
      estimatedDaysMin: z.estimatedDaysMin,
      estimatedDaysMax: z.estimatedDaysMax,
      cost: z.baseRate,
      freeShippingThreshold: z.freeShippingThreshold ?? null,
      podEnabled: z.podEnabled,
    }));
  }

  async findById(id: string) {
    return this.db.query.shippingZones.findFirst({
      where: and(eq(this.s.shippingZones.id, id), eq(this.s.shippingZones.isActive, true)),
    });
  }
}
