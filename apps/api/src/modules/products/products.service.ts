import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@core/database/database.service';
import { QueueService } from '@core/queue/queue.service';
import { eq, and, isNull, desc, asc, sql, inArray } from 'drizzle-orm';
import { CreateProductDto, ProductListQueryDto, UpdateProductDto } from './dto/product.dto';
import { generateSlug } from '../../utils/slug';

@Injectable()
export class ProductsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly queue: QueueService,
  ) {}

  private get db() {
    return this.database.db;
  }
  private get s() {
    return this.database.schema;
  }

  async findAll(query: ProductListQueryDto) {
    const { page = 1, limit = 24, category, brand, minPrice, maxPrice, condition, inStockOnly, sort } = query;
    const offset = (page - 1) * limit;

    const conditions = query.includeInactive
      ? [isNull(this.s.products.deletedAt)]
      : [isNull(this.s.products.deletedAt), eq(this.s.products.isActive, true)];

    if (category) {
      const cat = await this.db.query.categories.findFirst({
        where: eq(this.s.categories.slug, category),
      });
      if (cat) conditions.push(eq(this.s.products.categoryId, cat.id));
    }

    if (brand) {
      const br = await this.db.query.brands.findFirst({
        where: eq(this.s.brands.slug, brand),
      });
      if (br) conditions.push(eq(this.s.products.brandId, br.id));
    }

    if (condition) {
      conditions.push(eq(this.s.products.condition, condition));
    }

    const orderBy = (() => {
      switch (sort) {
        case 'newest':
        default:
          return desc(this.s.products.createdAt);
      }
    })();

    const [products, [{ count }]] = await Promise.all([
      this.db.query.products.findMany({
        where: and(...conditions),
        with: {
          brand: { columns: { id: true, name: true, slug: true } },
          category: { columns: { id: true, name: true, slug: true } },
          variants: {
            where: eq(this.s.productVariants.isActive, true),
            with: { inventory: true },
          },
          images: {
            where: eq(this.s.productImages.isPrimary, true),
            limit: 1,
          },
        },
        limit,
        offset,
        orderBy: [orderBy],
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(this.s.products)
        .where(and(...conditions)),
    ]);

    return {
      data: products.map((p) => this.toCard(p)),
      meta: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }

  async findById(id: string) {
    const product = await this.db.query.products.findFirst({
      where: and(eq(this.s.products.id, id), isNull(this.s.products.deletedAt)),
      with: {
        brand: true,
        category: true,
        variants: {
          with: { inventory: true },
          orderBy: [asc(this.s.productVariants.sortOrder)],
        },
        images: { orderBy: [asc(this.s.productImages.sortOrder)] },
      },
    });
    if (!product) throw new NotFoundException(`Product not found: ${id}`);
    return product;
  }

  async updateStock(productId: string, stockQuantity: number) {
    // Updates quantity on all variants for this product (simple flat stock model)
    const variants = await this.db.query.productVariants.findMany({
      where: eq(this.s.productVariants.productId, productId),
      columns: { id: true },
    });
    for (const v of variants) {
      await this.db
        .update(this.s.inventory)
        .set({ quantity: stockQuantity, lastUpdated: new Date() })
        .where(eq(this.s.inventory.variantId, v.id));
    }
    await this.queue.dispatchSyncProduct(productId);
    return { updated: variants.length };
  }

  async findBySlug(slug: string) {
    const product = await this.db.query.products.findFirst({
      where: and(
        eq(this.s.products.slug, slug),
        isNull(this.s.products.deletedAt),
        eq(this.s.products.isActive, true),
      ),
      with: {
        brand: true,
        category: true,
        variants: {
          with: { inventory: true },
          orderBy: [asc(this.s.productVariants.sortOrder)],
        },
        images: {
          orderBy: [asc(this.s.productImages.sortOrder)],
        },
      },
    });

    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    return product;
  }

  async create(dto: CreateProductDto) {
    const slug = generateSlug(dto.name);

    const [product] = await this.db
      .insert(this.s.products)
      .values({
        sku: dto.sku,
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        condition: dto.condition ?? 'NEW',
        warrantyMonths: dto.warrantyMonths ?? 12,
        isActive: dto.isActive ?? false,
        isFeatured: dto.isFeatured ?? false,
        tags: dto.tags ?? [],
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      })
      .returning();

    // Insert variants and their inventory records
    if (dto.variants?.length) {
      const insertedVariants = await this.db
        .insert(this.s.productVariants)
        .values(
          dto.variants.map((v, i) => ({
            productId: product.id,
            sku: v.sku,
            color: v.color,
            colorHex: v.colorHex,
            storage: v.storage,
            ram: v.ram,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            weightKg: v.weightKg,
            isDefault: i === 0 || (v.isDefault ?? false),
            sortOrder: i,
          })),
        )
        .returning();

      await this.db.insert(this.s.inventory).values(
        insertedVariants.map((v, i) => ({
          variantId: v.id,
          quantity: dto.variants[i]?.stockQuantity ?? 0,
        })),
      );
    }

    if (dto.images?.length) {
      await this.db.insert(this.s.productImages).values(
        dto.images.map((img, i) => ({
          productId: product.id,
          url: img.url,
          altText: img.altText,
          isPrimary: img.isPrimary ?? i === 0,
          sortOrder: img.sortOrder ?? i,
        })),
      );
    }

    const created = await this.findBySlug(slug);
    await this.queue.dispatchSyncProduct(created.id);
    return created;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.db.query.products.findFirst({
      where: eq(this.s.products.id, id),
    });
    if (!existing) throw new NotFoundException('Product not found');

    await this.db
      .update(this.s.products)
      .set({
        name: dto.name ?? existing.name,
        description: dto.description,
        shortDescription: dto.shortDescription,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        condition: dto.condition ?? existing.condition,
        warrantyMonths: dto.warrantyMonths ?? existing.warrantyMonths,
        isActive: dto.isActive ?? existing.isActive,
        isFeatured: dto.isFeatured ?? existing.isFeatured,
        tags: dto.tags ?? existing.tags,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        updatedAt: new Date(),
      })
      .where(eq(this.s.products.id, id));

    // Replace images if provided
    if (dto.images !== undefined) {
      await this.db
        .delete(this.s.productImages)
        .where(eq(this.s.productImages.productId, id));
      if (dto.images.length) {
        await this.db.insert(this.s.productImages).values(
          dto.images.map((img, i) => ({
            productId: id,
            url: img.url,
            altText: img.altText,
            isPrimary: img.isPrimary ?? i === 0,
            sortOrder: img.sortOrder ?? i,
          })),
        );
      }
    }

    // Upsert variants by SKU
    if (dto.variants?.length) {
      const existingVariants = await this.db.query.productVariants.findMany({
        where: eq(this.s.productVariants.productId, id),
        columns: { id: true, sku: true },
      });
      const existingBySku = new Map(existingVariants.map((v) => [v.sku, v.id]));

      for (const [i, v] of dto.variants.entries()) {
        const existingId = existingBySku.get(v.sku);
        if (existingId) {
          await this.db
            .update(this.s.productVariants)
            .set({
              color: v.color,
              colorHex: v.colorHex,
              storage: v.storage,
              ram: v.ram,
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              weightKg: v.weightKg,
              isDefault: v.isDefault ?? i === 0,
            })
            .where(eq(this.s.productVariants.id, existingId));
        } else {
          const [inserted] = await this.db
            .insert(this.s.productVariants)
            .values({
              productId: id,
              sku: v.sku,
              color: v.color,
              colorHex: v.colorHex,
              storage: v.storage,
              ram: v.ram,
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              weightKg: v.weightKg,
              isDefault: v.isDefault ?? false,
              sortOrder: existingVariants.length + i,
            })
            .returning();
          await this.db.insert(this.s.inventory).values({
            variantId: inserted.id,
            quantity: v.stockQuantity ?? 0,
          });
        }
      }
    }

    const updated = await this.findBySlug(existing.slug);
    await this.queue.dispatchSyncProduct(updated.id);
    return updated;
  }

  async softDelete(id: string) {
    await this.db
      .update(this.s.products)
      .set({ deletedAt: new Date() })
      .where(eq(this.s.products.id, id));
    await this.queue.dispatchDeleteProduct(id);
  }

  private toCard(product: any) {
    const primaryImage = product.images?.[0]?.url ?? null;
    const prices = product.variants?.map((v: any) => parseFloat(v.price)) ?? [];
    const minPrice = prices.length ? Math.min(...prices).toFixed(2) : '0';
    const maxPrice = prices.length ? Math.max(...prices).toFixed(2) : '0';
    const isInStock = product.variants?.some(
      (v: any) => v.inventory && v.inventory.quantity - v.inventory.reservedQuantity > 0,
    );

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      primaryImage,
      minPrice,
      maxPrice,
      compareAtPrice: product.variants?.[0]?.compareAtPrice ?? null,
      isInStock: !!isInStock,
      brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
      category: product.category
        ? { name: product.category.name, slug: product.category.slug }
        : null,
      condition: product.condition,
      warrantyMonths: product.warrantyMonths,
      rating: 0,
      reviewCount: 0,
    };
  }
}
