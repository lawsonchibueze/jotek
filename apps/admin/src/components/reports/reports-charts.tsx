'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SalesReport } from '@jotek/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { notation: 'compact', currency: 'NGN', style: 'currency' }).format(n);

export function ReportsCharts({ sales }: { sales: SalesReport[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 font-semibold text-gray-900">Daily Revenue (Last 90 Days)</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={sales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
          <Tooltip
            formatter={(value: number) => [fmt(value), 'Revenue']}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey={(d: SalesReport) => parseFloat(d.revenue)} fill="#0A2463" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
