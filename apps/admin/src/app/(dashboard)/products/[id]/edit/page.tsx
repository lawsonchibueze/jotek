import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductForm } from '@/components/products/product-form';

export const metadata: Metadata = { title: 'Edit Product' };
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  const product = await api
    .get<any>(`/admin/products/${id}`)
    .catch(() => null);

  if (!product) notFound();

  return (
    <div className="max-w-4xl space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-0.5 text-sm text-gray-500">{product.name}</p>
        </div>
      </div>
      <ProductForm productId={id} initialData={product} />
    </div>
  );
}
