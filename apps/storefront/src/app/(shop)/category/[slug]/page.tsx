import type { Metadata } from 'next';
import { serverFetch } from '@/lib/api';
import { ProductCard } from '@/components/shop/product-card';
import type { PaginatedResponse, ProductCard as ProductCardType, Category } from '@jotek/types';
import { notFound } from 'next/navigation';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string; brand?: string; minPrice?: string; maxPrice?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await serverFetch<Category>(`/categories/${slug}`, 300);
    return {
      title: `${category.name} — Buy ${category.name} in Nigeria | Jotek`,
      description: category.metaDescription || `Shop ${category.name} at Jotek. Authentic products, warranty guaranteed. Fast delivery across Nigeria.`,
    };
  } catch {
    return { title: 'Category Not Found' };
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  let category: Category;
  let products: PaginatedResponse<ProductCardType>;

  try {
    [category, products] = await Promise.all([
      serverFetch<Category>(`/categories/${slug}`, 300),
      serverFetch<PaginatedResponse<ProductCardType>>(
        `/products?category=${slug}&page=${page}&sort=${sp.sort || 'newest'}&limit=24`,
        60,
      ),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <a href="/" className="hover:text-brand-500">Home</a>
        <span className="mx-2">›</span>
        <span className="font-medium text-gray-900">{category.name}</span>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{products.meta.total} products</p>
        </div>

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {products.data.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-gray-500">No products found in this category.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {products.meta.totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              {Array.from({ length: products.meta.totalPages }).map((_, i) => (
                <a
                  key={i}
                  href={`?page=${i + 1}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    i + 1 === page
                      ? 'bg-brand-500 text-white'
                      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
