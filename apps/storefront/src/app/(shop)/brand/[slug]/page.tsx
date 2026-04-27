import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverFetch } from '@/lib/api';
import { emptyProductPage, getFallbackBrand } from '@/lib/catalog-fallbacks';
import { ProductCard } from '@/components/shop/product-card';
import type {
  Brand,
  PaginatedResponse,
  ProductCard as ProductCardType,
} from '@jotek/types';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const brand = await serverFetch<Brand>(`/brands/${slug}`, 300);
    return {
      title: `${brand.name} - Shop ${brand.name} Products in Nigeria | Jotek`,
      description: `Browse authentic ${brand.name} products at Jotek. Genuine warranty, fast delivery across Nigeria.`,
    };
  } catch {
    const fallback = getFallbackBrand(slug);
    if (fallback) {
      return {
        title: `${fallback.name} - Shop ${fallback.name} Products in Nigeria | Jotek`,
        description:
          fallback.description ||
          `Browse authentic ${fallback.name} products at Jotek. Genuine warranty, fast delivery across Nigeria.`,
      };
    }

    return { title: 'Brand Not Found' };
  }
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;

  const [brandResult, productsResult] = await Promise.allSettled([
    serverFetch<Brand>(`/brands/${slug}`, 300),
    serverFetch<PaginatedResponse<ProductCardType>>(
      `/products?brand=${slug}&page=${page}&sort=${sp.sort || 'newest'}&limit=24`,
      60,
    ),
  ]);

  const brand =
    brandResult.status === 'fulfilled' ? brandResult.value : getFallbackBrand(slug);

  if (!brand) {
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
        <Link href="/search" className="hover:text-brand-500">
          Brands
        </Link>
        <span className="mx-2">&gt;</span>
        <span className="font-medium text-gray-900">{brand.name}</span>
      </nav>

      <div className="flex items-center gap-4">
        {brand.logoUrl && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-2">
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              fill
              className="object-contain p-2"
              sizes="64px"
            />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {products.meta.total} product{products.meta.total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {products.data.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-lg font-semibold text-gray-900">
            {brand.name} products are being prepared.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Add products in the admin dashboard to populate this brand page.
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
