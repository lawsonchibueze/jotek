import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/api';
import { emptyProductPage, getFallbackCategory } from '@/lib/catalog-fallbacks';
import { ProductCard } from '@/components/shop/product-card';
import type {
  Category,
  PaginatedResponse,
  ProductCard as ProductCardType,
} from '@jotek/types';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const category = await serverFetch<Category>(`/categories/${slug}`, 300);
    return {
      title: `${category.name} - Buy ${category.name} in Nigeria | Jotek`,
      description:
        category.metaDescription ||
        `Shop ${category.name} at Jotek. Authentic products, warranty guaranteed. Fast delivery across Nigeria.`,
    };
  } catch {
    const fallback = getFallbackCategory(slug);
    if (fallback) {
      return {
        title: `${fallback.name} - Buy ${fallback.name} in Nigeria | Jotek`,
        description:
          fallback.metaDescription ||
          `Shop ${fallback.name} at Jotek. Authentic products, warranty guaranteed. Fast delivery across Nigeria.`,
      };
    }

    return { title: 'Category Not Found' };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [categoryResult, productsResult] = await Promise.allSettled([
    serverFetch<Category>(`/categories/${slug}`, 300),
    serverFetch<PaginatedResponse<ProductCardType>>(
      `/products?category=${slug}&page=${page}&sort=${sp.sort || 'newest'}&limit=24`,
      60,
    ),
  ]);

  const category =
    categoryResult.status === 'fulfilled'
      ? categoryResult.value
      : getFallbackCategory(slug);

  if (!category) {
    notFound();
  }

  const products =
    productsResult.status === 'fulfilled'
      ? productsResult.value
      : emptyProductPage(page);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-500">
          Home
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="font-medium text-gray-900">{category.name}</span>
      </nav>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {products.meta.total} product{products.meta.total !== 1 ? 's' : ''}
          </p>
        </div>

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {products.data.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {category.name} products are being prepared.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Add products in the admin dashboard to populate this category.
          </p>
          <Link
            href="/search"
            className="mt-4 inline-block text-sm font-semibold text-brand-500 hover:underline"
          >
            Browse all products
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {products.meta.totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: products.meta.totalPages }).map((_, i) => (
                <Link
                  key={i}
                  href={`?page=${i + 1}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    i + 1 === page
                      ? 'bg-brand-500 text-white'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
