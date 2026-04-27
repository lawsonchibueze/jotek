import type { Metadata } from 'next';
import { api } from '@/lib/api';
import type { CustomerUser } from '@jotek/types';

export const metadata: Metadata = { title: 'Customers' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const { page = '1', q = '' } = await searchParams;
  const qs = new URLSearchParams({ page, limit: '25', ...(q && { q }) });
  const result = await api
    .get<{ data: CustomerUser[]; total: number }>(`/admin/customers?${qs}`)
    .catch(() => ({ data: [], total: 0 }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-right">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  No customers yet
                </td>
              </tr>
            )}
            {result.data.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{customer.name}</td>
                <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                <td className="px-4 py-3 text-gray-500">{customer.phoneNumber ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(customer.createdAt).toLocaleDateString('en-NG')}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">
                  {(customer as CustomerUser & { orderCount?: number }).orderCount ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">{result.total} customers total</p>
    </div>
  );
}
