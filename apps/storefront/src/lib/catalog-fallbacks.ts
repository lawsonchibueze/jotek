import type { Brand, Category, PaginatedResponse, ProductCard } from '@jotek/types';

type CategorySeed = Pick<Category, 'name' | 'slug' | 'metaDescription' | 'sortOrder'>;
type BrandSeed = Pick<Brand, 'name' | 'slug' | 'description' | 'sortOrder'>;

const categorySeeds: CategorySeed[] = [
  {
    name: 'Mobile Phones',
    slug: 'mobile-phones',
    metaDescription:
      'Shop authentic mobile phones at Jotek. Find flagship and everyday smartphones with warranty-backed support.',
    sortOrder: 1,
  },
  {
    name: 'Laptops',
    slug: 'laptops',
    metaDescription:
      'Shop laptops for work, school and business at Jotek with reliable Nigerian delivery.',
    sortOrder: 2,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    metaDescription:
      'Shop phone accessories, computer accessories, chargers, cables and power essentials at Jotek.',
    sortOrder: 3,
  },
  {
    name: 'Gaming',
    slug: 'gaming',
    metaDescription:
      'Shop PS5-ready gaming accessories, controllers, headsets and console gear at Jotek.',
    sortOrder: 4,
  },
];

const brandSeeds: BrandSeed[] = [
  {
    name: 'JBL',
    slug: 'jbl',
    description:
      'Shop JBL speakers and audio accessories at Jotek with authentic product support.',
    sortOrder: 1,
  },
];

export const fallbackCategories: Category[] = categorySeeds.map((category) => ({
  id: `fallback-category-${category.slug}`,
  name: category.name,
  slug: category.slug,
  parentId: null,
  imageUrl: null,
  isActive: true,
  sortOrder: category.sortOrder,
  metaTitle: `${category.name} | Jotek`,
  metaDescription: category.metaDescription,
}));

export const fallbackBrands: Brand[] = brandSeeds.map((brand) => ({
  id: `fallback-brand-${brand.slug}`,
  name: brand.name,
  slug: brand.slug,
  logoUrl: null,
  description: brand.description,
  isActive: true,
  isFeatured: true,
  sortOrder: brand.sortOrder,
}));

export function getFallbackCategory(slug: string): Category | null {
  return fallbackCategories.find((category) => category.slug === slug) ?? null;
}

export function getFallbackBrand(slug: string): Brand | null {
  return fallbackBrands.find((brand) => brand.slug === slug) ?? null;
}

export function emptyProductPage(
  page: number,
  limit = 24,
): PaginatedResponse<ProductCard> {
  return {
    data: [],
    meta: {
      total: 0,
      page,
      limit,
      totalPages: 0,
    },
  };
}
