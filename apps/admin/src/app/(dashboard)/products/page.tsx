import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductTableActions } from '@/components/products/product-table-actions';
import type { ProductCard } from '@jotek/types';

export const metadata: Metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

const fmt = (n: string | number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(
    typeof n === 'string' ? parseFloat(n) : n,
  );

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { page = '1', q = '' } = await searchParams;
  const qs = new URLSearchParams({ page, limit: '20', includeInactive: 'true', ...(q && { q }) });
  const result = await api
    .get<{ data: ProductCard[]; meta: { total: number } }>(`/admin/products?${qs}`)
    .catch(() => ({ data: [], meta: { total: 0 } }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-3">
          <Link href="/products/new" className="btn-primary">
            + Add Product
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-left">Condition</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  No products found
                </td>
              </tr>
            )}
            {result.data.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium text-gray-900 hover:text-brand-500"
                  >
                    {product.name}
                  </Link>
                  {product.shortDescription && (
                    <p className="mt-0.5 text-xs text-gray-400 truncate max-w-xs">
                      {product.shortDescription}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{product.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {product.compareAtPrice ? (
                    <span className="text-red-600">{fmt(product.minPrice)}</span>
                  ) : (
                    fmt(product.minPrice)
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-gray-500">
                  {product.condition.toLowerCase().replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.isInStock
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {product.isInStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ProductTableActions productId={product.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">{result.meta.total} products total</p>
    </div>
  );
}
