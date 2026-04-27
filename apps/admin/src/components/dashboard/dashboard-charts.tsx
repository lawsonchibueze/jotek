'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SalesReport } from '@jotek/types';

interface Props {
  sales: SalesReport[];
}

const fmtAbbrev = (n: number) => {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n}`;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 4px rgba(0,0,0,.06)',
};

export function DashboardCharts({ sales }: Props) {
  const data = sales.map((s) => ({
    date: fmtDate(s.date),
    revenue: Math.round(parseFloat(s.revenue)),
    orders: Number(s.orders),
    aov: Math.round(parseFloat(s.aov)),
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
        No sales data yet — orders will appear here once placed
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Revenue area chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-gray-900">Revenue</h3>
          <p className="text-xs text-gray-400">Last 30 days</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={fmtAbbrev}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              formatter={(val: number) => [`₦${val.toLocaleString('en-NG')}`, 'Revenue']}
              contentStyle={tooltipStyle}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#revGrad)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders bar chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-gray-900">Orders</h3>
          <p className="text-xs text-gray-400">Last 30 days</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(val: number) => [val, 'Orders']}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="orders" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
