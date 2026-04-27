import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import type { DashboardStats, SalesReport, TopProduct, Order } from '@jotek/types';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  PACKED: 'bg-purple-100 text-purple-700',
  SHIPPED: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);

async function getData() {
  const [stats, sales, recentOrders, topProducts] = await Promise.allSettled([
    api.get<DashboardStats>('/admin/reports/stats'),
    api.get<SalesReport[]>('/admin/reports/sales?period=30'),
    api.get<{ data: Order[] }>('/admin/orders?limit=8'),
    api.get<TopProduct[]>('/admin/reports/top-products?limit=5'),
  ]);

  return {
    stats: stats.status === 'fulfilled' ? stats.value : null,
    sales: sales.status === 'fulfilled' ? sales.value : [],
    recentOrders: recentOrders.status === 'fulfilled' ? recentOrders.value.data : [],
    topProducts: topProducts.status === 'fulfilled' ? topProducts.value : [],
  };
}

export default async function DashboardPage() {
  const { stats, sales, recentOrders, topProducts } = await getData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Store performance — last 30 days</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatsCard
          label="Revenue"
          value={stats ? fmt(stats.revenue30d) : '—'}
          trend={stats?.revenueChangePercent}
          icon="₦"
          accent="default"
        />
        <StatsCard
          label="Orders"
          value={stats?.orders30d ?? '—'}
          sub="non-cancelled"
          icon="◫"
        />
        <StatsCard
          label="Pending Fulfilment"
          value={stats?.pendingFulfillment ?? '—'}
          sub="Paid + Processing"
          icon="⏳"
          accent={
            (stats?.pendingFulfillment ?? 0) > 20 ? 'warning' : 'default'
          }
        />
        <StatsCard
          label="Customers"
          value={stats?.totalCustomers ?? '—'}
          icon="◉"
          accent="success"
        />
        <StatsCard
          label="Low Stock SKUs"
          value={stats?.lowStockCount ?? '—'}
          icon="⚠"
          accent={(stats?.lowStockCount ?? 0) > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Charts */}
      <DashboardCharts sales={sales as SalesReport[]} />

      {/* Bottom row: recent orders + top products */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-xl border border-gray-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href="/orders"
              className="text-xs font-medium text-brand-500 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                No orders yet
              </p>
            )}
            {(recentOrders as Order[]).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between px-6 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium text-brand-500 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  <span className="ml-2 text-gray-500 truncate">
                    {order.customerName}
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <span className="font-medium text-gray-900">
                    {fmt(parseFloat(order.total))}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Top Products</h2>
            <p className="text-xs text-gray-400">By units sold (all time)</p>
          </div>
          <div className="divide-y divide-gray-50">
            {(topProducts as TopProduct[]).length === 0 && (
              <p className="px-6 py-8 text-center text-sm text-gray-400">
                No sales data yet
              </p>
            )}
            {(topProducts as TopProduct[]).map((product, i) => (
              <div
                key={product.productId || i}
                className="flex items-center gap-3 px-6 py-3 text-sm"
              >
                <span className="w-5 flex-shrink-0 text-center text-xs font-bold text-gray-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {product.productName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {product.unitsSold} sold · {fmt(parseFloat(product.revenue))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
