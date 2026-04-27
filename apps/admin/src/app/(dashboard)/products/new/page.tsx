import type { Metadata } from 'next';
import { ProductForm } from '@/components/products/product-form';

export const metadata: Metadata = { title: 'Add Product' };

export default function NewProductPage() {
  return (
    <div className="max-w-4xl space-y-2">
      <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
      <ProductForm />
    </div>
  );
}
