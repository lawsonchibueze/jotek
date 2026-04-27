import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { AdjustStockButton } from '@/components/inventory/adjust-stock-button';

export const metadata: Metadata = { title: 'Inventory' };
export const dynamic = 'force-dynamic';

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  available: number;
  lowStockThreshold: number;
}

export default async function InventoryPage() {
  const result = await api
    .get<{ data: InventoryItem[] }>('/admin/inventory')
    .catch(() => ({ data: [] }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-right">In Stock</th>
              <th className="px-4 py-3 text-right">Reserved</th>
              <th className="px-4 py-3 text-right">Available</th>
              <th className="px-4 py-3 text-left">Alert</th>
              <th className="px-4 py-3 text-right">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  No inventory records
                </td>
              </tr>
            )}
            {result.data.map((item) => {
              const isLow = item.available <= item.lowStockThreshold;
              return (
                <tr key={item.productId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{item.sku}</td>
                  <td className="px-4 py-3 text-right">{item.stockQuantity}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{item.reservedQuantity}</td>
                  <td className={`px-4 py-3 text-right font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.available}
                  </td>
                  <td className="px-4 py-3">
                    {isLow && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Low Stock
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdjustStockButton productId={item.productId} current={item.stockQuantity} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
