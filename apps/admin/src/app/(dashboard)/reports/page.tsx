import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { ReportsCharts } from '@/components/reports/reports-charts';
import type { SalesReport, TopProduct } from '@jotek/types';

export const metadata: Metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

export default async function ReportsPage() {
  const [sales, top] = await Promise.allSettled([
    api.get<SalesReport[]>('/admin/reports/sales?period=90d'),
    api.get<TopProduct[]>('/admin/reports/top-products?limit=10'),
  ]);

  const salesData = sales.status === 'fulfilled' ? sales.value : [];
  const topProducts = top.status === 'fulfilled' ? top.value : [];
  const totalRevenue = salesData.reduce((s, r) => s + parseFloat(r.revenue), 0);
  const totalOrders = salesData.reduce((s, r) => s + r.orders, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Revenue (90d)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{fmt(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Orders (90d)</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalOrders}</p>
        </div>
      </div>

      <ReportsCharts sales={salesData} />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4 font-semibold text-gray-900">
          Top Products (90d)
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Units Sold</th>
              <th className="px-4 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topProducts.map((product, i) => (
              <tr key={product.productId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{product.productName}</td>
                <td className="px-4 py-3 text-right">{product.unitsSold}</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(parseFloat(product.revenue))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
