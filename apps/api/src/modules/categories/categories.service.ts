import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { eq, isNull } from 'drizzle-orm';
import { generateSlug } from '../../utils/slug';

@Injectable()
export class CategoriesService {
  constructor(private readonly database: DatabaseService) {}

  async findTree() {
    const all = await this.database.db.query.categories.findMany({
      where: eq(this.database.schema.categories.isActive, true),
      orderBy: this.database.schema.categories.sortOrder,
    });

    const map = new Map(all.map((c) => [c.id, { ...c, children: [] as any[] }]));
    const roots: any[] = [];

    for (const cat of map.values()) {
      if (cat.parentId) {
        map.get(cat.parentId)?.children.push(cat);
      } else {
        roots.push(cat);
      }
    }

    return roots;
  }

  async findBySlug(slug: string) {
    const category = await this.database.db.query.categories.findFirst({
      where: eq(this.database.schema.categories.slug, slug),
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(data: { name: string; parentId?: string; imageUrl?: string; sortOrder?: number; metaTitle?: string; metaDescription?: string }) {
    const [category] = await this.database.db
      .insert(this.database.schema.categories)
      .values({ ...data, slug: generateSlug(data.name) })
      .returning();
    return category;
  }

  async update(id: string, data: Partial<ReturnType<CategoriesService['create']>>) {
    const [updated] = await this.database.db
      .update(this.database.schema.categories)
      .set({ ...data as any, updatedAt: new Date() })
      .where(eq(this.database.schema.categories.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Category not found');
    return updated;
  }

  async remove(id: string) {
    await this.database.db
      .update(this.database.schema.categories)
      .set({ isActive: false })
      .where(eq(this.database.schema.categories.id, id));
  }
}
