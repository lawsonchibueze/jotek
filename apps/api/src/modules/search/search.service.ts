import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Typesense, { Client as TypesenseClient } from 'typesense';
import { eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '@core/database/database.service';

const PRODUCTS_COLLECTION = 'jotek_products';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: TypesenseClient;

  constructor(private readonly database: DatabaseService) {
    this.client = new Typesense.Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: Number(process.env.TYPESENSE_PORT) || 8108,
          protocol: (process.env.TYPESENSE_PROTOCOL as 'http' | 'https') || 'http',
        },
      ],
      apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
      connectionTimeoutSeconds: 5,
    });
  }

  async onModuleInit() {
    try {
      await this.ensureCollection();
    } catch (err: any) {
      this.logger.warn(`Typesense init failed (non-fatal): ${err.message}`);
    }
  }

  private async ensureCollection() {
    try {
      const existing = await this.client.collections(PRODUCTS_COLLECTION).retrieve();
      // Idempotent schema migration — add fields introduced after the collection
      // was first created. New fields must be optional so existing docs pass.
      const fieldNames = new Set(existing.fields?.map((f: any) => f.name) ?? []);
      const missing: any[] = [];
      if (!fieldNames.has('onSale')) {
        missing.push({ name: 'onSale', type: 'bool', facet: true, optional: true });
      }
      if (missing.length) {
        await this.client.collections(PRODUCTS_COLLECTION).update({ fields: missing });
        this.logger.log(`Typesense: added missing fields (${missing.map((f) => f.name).join(', ')})`);
      }
    } catch {
      await this.client.collections().create({
        name: PRODUCTS_COLLECTION,
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'slug', type: 'string', index: false },
          { name: 'shortDescription', type: 'string', optional: true },
          { name: 'brandName', type: 'string', facet: true, optional: true },
          { name: 'brandSlug', type: 'string', optional: true },
          { name: 'categoryName', type: 'string', facet: true, optional: true },
          { name: 'categorySlug', type: 'string', optional: true },
          { name: 'minPrice', type: 'float', facet: true },
          { name: 'maxPrice', type: 'float' },
          { name: 'condition', type: 'string', facet: true },
          { name: 'isInStock', type: 'bool', facet: true },
          { name: 'onSale', type: 'bool', facet: true, optional: true },
          { name: 'warrantyMonths', type: 'int32' },
          { name: 'rating', type: 'float', optional: true },
          { name: 'reviewCount', type: 'int32', optional: true },
          { name: 'primaryImage', type: 'string', optional: true, index: false },
          { name: 'tags', type: 'string[]', optional: true },
          { name: 'createdAt', type: 'int64' },
        ],
        default_sorting_field: 'createdAt',
      });
      this.logger.log('Typesense collection created');
    }
  }

  async search(params: {
    query?: string;
    page?: number;
    limit?: number;
    categorySlug?: string;
    brandSlug?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    inStockOnly?: boolean;
    onSaleOnly?: boolean;
    sort?: string;
  }) {
    const {
      query = '*',
      page = 1,
      limit = 24,
      categorySlug,
      brandSlug,
      minPrice,
      maxPrice,
      condition,
      inStockOnly,
      onSaleOnly,
      sort,
    } = params;

    const filterParts: string[] = [];
    if (categorySlug) filterParts.push(`categorySlug:=${categorySlug}`);
    if (brandSlug) filterParts.push(`brandSlug:=${brandSlug}`);
    if (minPrice !== undefined) filterParts.push(`minPrice:>=${minPrice}`);
    if (maxPrice !== undefined) filterParts.push(`maxPrice:<=${maxPrice}`);
    if (condition) filterParts.push(`condition:=${condition}`);
    if (inStockOnly) filterParts.push(`isInStock:=true`);
    if (onSaleOnly) filterParts.push(`onSale:=true`);

    const sortBy = (() => {
      switch (sort) {
        case 'price_asc': return 'minPrice:asc';
        case 'price_desc': return 'minPrice:desc';
        case 'rating': return 'rating:desc';
        case 'newest': return 'createdAt:desc';
        default: return '_text_match:desc,createdAt:desc';
      }
    })();

    try {
      const result = await this.client.collections(PRODUCTS_COLLECTION).documents().search({
        q: query || '*',
        query_by: 'name,shortDescription,brandName,categoryName,tags',
        filter_by: filterParts.join(' && ') || undefined,
        facet_by: 'categoryName,brandName,condition,isInStock',
        max_facet_values: 20,
        sort_by: sortBy,
        page,
        per_page: limit,
        highlight_full_fields: 'name',
      });

      const rawFacets: Record<string, Array<{ value: string; count: number }>> = {};
      for (const fc of result.facet_counts ?? []) {
        rawFacets[fc.field_name] = fc.counts.map((c: any) => ({ value: c.value, count: c.count }));
      }

      return {
        products: (result.hits ?? []).map((h: any) => {
          const d = h.document;
          return {
            id: d.id,
            name: d.name,
            slug: d.slug,
            shortDescription: d.shortDescription || null,
            primaryImage: d.primaryImage || null,
            minPrice: (d.minPrice as number).toFixed(2),
            maxPrice: (d.maxPrice as number).toFixed(2),
            compareAtPrice: null,
            isInStock: d.isInStock,
            brand: d.brandName ? { name: d.brandName, slug: d.brandSlug || '' } : null,
            category: d.categoryName ? { name: d.categoryName, slug: d.categorySlug || '' } : null,
            condition: d.condition,
            warrantyMonths: d.warrantyMonths ?? 0,
            rating: d.rating ?? 0,
            reviewCount: d.reviewCount ?? 0,
          };
        }),
        facets: {
          categories: rawFacets['categoryName'] ?? [],
          brands: rawFacets['brandName'] ?? [],
          conditions: rawFacets['condition'] ?? [],
        },
        meta: {
          total: result.found,
          page,
          limit,
          totalPages: Math.ceil(result.found / limit),
          query: query === '*' ? null : query,
        },
      };
    } catch (err: any) {
      this.logger.error(`Typesense search failed: ${err.message}`);
      return {
        products: [],
        facets: { categories: [], brands: [], conditions: [] },
        meta: { total: 0, page, limit, totalPages: 0, query },
      };
    }
  }

  async indexProduct(product: any) {
    const doc = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription ?? '',
      brandName: product.brand?.name ?? '',
      brandSlug: product.brand?.slug ?? '',
      categoryName: product.category?.name ?? '',
      categorySlug: product.category?.slug ?? '',
      minPrice: Math.min(...(product.variants?.map((v: any) => parseFloat(v.price)) ?? [0])),
      maxPrice: Math.max(...(product.variants?.map((v: any) => parseFloat(v.price)) ?? [0])),
      condition: product.condition,
      isInStock: product.variants?.some(
        (v: any) => v.inventory && (v.inventory.quantity - v.inventory.reservedQuantity) > 0,
      ) ?? false,
      onSale: product.variants?.some(
        (v: any) =>
          v.compareAtPrice &&
          parseFloat(v.compareAtPrice) > parseFloat(v.price),
      ) ?? false,
      warrantyMonths: product.warrantyMonths,
      rating: 0,
      reviewCount: 0,
      primaryImage: product.images?.[0]?.url ?? '',
      tags: product.tags ?? [],
      createdAt: Math.floor(new Date(product.createdAt).getTime() / 1000),
    };

    try {
      await this.client.collections(PRODUCTS_COLLECTION).documents().upsert(doc);
    } catch (err: any) {
      this.logger.error(`Failed to index product ${product.id}: ${err.message}`);
    }
  }

  async deleteProduct(productId: string) {
    try {
      await this.client.collections(PRODUCTS_COLLECTION).documents(productId).delete();
    } catch {
      // Product may not be indexed — ignore
    }
  }

  /**
   * Re-index every active product. Use after adding new Typesense fields so
   * historic docs pick up the new attributes (e.g. `onSale`).
   */
  async reindexAll(): Promise<{ indexed: number }> {
    const { db, schema: s } = this.database;
    const products = await db.query.products.findMany({
      where: isNull(s.products.deletedAt),
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

    for (const p of products) {
      await this.indexProduct(p);
    }
    this.logger.log(`Reindexed ${products.length} products`);
    return { indexed: products.length };
  }
}
