import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Smartphone, Star, Truck } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import type { ProductCard as ProductCardType } from '@jotek/types';

interface ProductCardProps {
  product: ProductCardType;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const hasDiscount =
    product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.minPrice);

  const discountPercent = hasDiscount
    ? Math.round(
        ((parseFloat(product.compareAtPrice!) - parseFloat(product.minPrice)) /
          parseFloat(product.compareAtPrice!)) *
          100,
      )
    : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-lg',
        className,
      )}
    >
      <div className="relative aspect-square bg-gray-50">
        <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
          {!product.isInStock && <span className="badge-oos">Out of Stock</span>}
          {hasDiscount && product.isInStock && <span className="badge-sale">-{discountPercent}%</span>}
        </div>
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.name}
            fill
            className="object-contain p-5 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <Smartphone className="h-16 w-16" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="min-h-[3.9rem]">
          {product.brand && (
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              {product.brand.name}
            </p>
          )}
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-gray-900 group-hover:text-brand-500">
            {product.name}
          </h3>
        </div>

        {product.reviewCount > 0 ? (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3.5 w-3.5 fill-accent-500 text-accent-500" />
            <span className="font-semibold text-gray-700">{product.rating.toFixed(1)}</span>
            <span>({product.reviewCount})</span>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Verified stock
          </div>
        )}

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-black text-gray-950">
              {formatPrice(product.minPrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500">
            {product.warrantyMonths > 0 && (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                {product.warrantyMonths}m warranty
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Truck className="h-3 w-3 text-accent-500" />
              NG delivery
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
