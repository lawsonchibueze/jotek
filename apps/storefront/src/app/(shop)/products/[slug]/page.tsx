import type { Metadata } from 'next';
import { serverFetch } from '@/lib/api';
import type { Product, ProductCard as ProductCardType, PaginatedResponse } from '@jotek/types';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ProductReviews } from '@/components/shop/product-reviews';
import { ProductActions } from '@/components/shop/product-actions';
import { ProductCard } from '@/components/shop/product-card';

export const revalidate = 30;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await serverFetch<Product>(`/products/${slug}`, 30);
    return {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.shortDescription || undefined,
      openGraph: {
        title: product.name,
        description: product.shortDescription || undefined,
        images: product.images[0] ? [{ url: product.images[0].url }] : [],
      },
    };
  } catch {
    return { title: 'Product Not Found' };
  }
}

const RELATED_LIMIT = 8;

async function getRelated(product: Product): Promise<ProductCardType[]> {
  // Prefer same category — highest cross-sell relevance. Fall back to brand if
  // the category bucket is thin (e.g. new categories with 1-2 items).
  const pulls: Promise<PaginatedResponse<ProductCardType> | null>[] = [];
  if (product.category?.slug) {
    pulls.push(
      serverFetch<PaginatedResponse<ProductCardType>>(
        `/products?category=${product.category.slug}&limit=${RELATED_LIMIT + 1}&sort=popular`,
        60,
      ).catch(() => null),
    );
  }
  if (product.brand?.slug) {
    pulls.push(
      serverFetch<PaginatedResponse<ProductCardType>>(
        `/products?brand=${product.brand.slug}&limit=${RELATED_LIMIT + 1}&sort=popular`,
        60,
      ).catch(() => null),
    );
  }

  const results = await Promise.all(pulls);
  const seen = new Set<string>([product.id]);
  const out: ProductCardType[] = [];
  for (const res of results) {
    for (const p of res?.data ?? []) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
      if (out.length >= RELATED_LIMIT) return out;
    }
  }
  return out;
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348000000000';

  let product: Product;
  let initialReviews: any[] = [];
  let related: ProductCardType[] = [];
  try {
    product = await serverFetch<Product>(`/products/${slug}`, 30);
    [initialReviews, related] = await Promise.all([
      serverFetch<any[]>(`/reviews/product/${product.id}`, 60).catch(() => []),
      getRelated(product),
    ]);
  } catch {
    notFound();
  }

  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];

  // JSON-LD schema.org Product markup
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((i) => i.url),
    description: product.description,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand?.name },
    offers: {
      '@type': 'Offer',
      url: `https://jotek.ng/products/${product.slug}`,
      priceCurrency: 'NGN',
      price: defaultVariant?.price,
      itemCondition:
        product.condition === 'NEW'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/RefurbishedCondition',
      availability:
        defaultVariant?.inventory?.availableQuantity ?? 0 > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Jotek' },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50">
              {primaryImage ? (
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.altText || product.name}
                  fill
                  priority
                  className="object-contain p-8"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  No image
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <div key={img.id} className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
                    <Image src={img.url} alt={img.altText || `View ${i + 1}`} fill className="object-contain p-1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {product.brand && (
              <p className="text-sm font-medium uppercase tracking-wide text-gray-400">
                {product.brand.name}
              </p>
            )}
            <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{product.name}</h1>

            <ProductActions product={product} defaultVariantId={defaultVariant?.id ?? ''} />

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { icon: '🛡️', text: `${product.warrantyMonths} month warranty` },
                { icon: '✅', text: '100% authentic product' },
                { icon: '↩️', text: '7-day return policy' },
                { icon: '🚚', text: 'Nationwide delivery' },
              ].map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-base">{badge.icon}</span>
                  <span className="text-xs text-gray-600">{badge.text}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${whatsappNumber}?text=I'm interested in ${encodeURIComponent(product.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-green-500 py-3 text-sm font-medium text-green-600 transition-colors hover:bg-green-50"
            >
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-900">Product Description</h2>
            <div
              className="prose prose-sm mt-4 max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}

        {/* Reviews */}
        <ProductReviews productId={product.id} initialReviews={initialReviews} />

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-gray-200 pt-12">
            <h2 className="text-xl font-bold text-gray-900">You might also like</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {related.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
