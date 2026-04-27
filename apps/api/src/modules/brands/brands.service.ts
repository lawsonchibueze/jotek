import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { eq } from 'drizzle-orm';
import { generateSlug } from '../../utils/slug';

@Injectable()
export class BrandsService {
  constructor(private readonly database: DatabaseService) {}

  findAll() {
    return this.database.db.query.brands.findMany({
      where: eq(this.database.schema.brands.isActive, true),
      orderBy: this.database.schema.brands.sortOrder,
    });
  }

  findFeatured() {
    return this.database.db.query.brands.findMany({
      where: eq(this.database.schema.brands.isFeatured, true),
      orderBy: this.database.schema.brands.sortOrder,
    });
  }

  async findBySlug(slug: string) {
    const brand = await this.database.db.query.brands.findFirst({
      where: eq(this.database.schema.brands.slug, slug),
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(data: { name: string; logoUrl?: string; description?: string; isFeatured?: boolean; sortOrder?: number }) {
    const [brand] = await this.database.db
      .insert(this.database.schema.brands)
      .values({ ...data, slug: generateSlug(data.name) })
      .returning();
    return brand;
  }

  async update(id: string, data: any) {
    const [updated] = await this.database.db
      .update(this.database.schema.brands)
      .set(data)
      .where(eq(this.database.schema.brands.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Brand not found');
    return updated;
  }

  async remove(id: string) {
    await this.database.db
      .update(this.database.schema.brands)
      .set({ isActive: false })
      .where(eq(this.database.schema.brands.id, id));
  }
}
