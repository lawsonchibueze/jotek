import type { Metadata } from 'next';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'Audit Log' };
export const dynamic = 'force-dynamic';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  adminEmail: string;
  ip: string;
  createdAt: string;
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const { page = '1' } = await searchParams;
  const result = await api
    .get<{ data: AuditEntry[]; total: number }>(`/admin/audit-log?page=${page}&limit=30`)
    .catch(() => ({ data: [], total: 0 }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-mono text-xs">
            {result.data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center font-sans text-gray-400">
                  No audit entries
                </td>
              </tr>
            )}
            {result.data.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">
                  {new Date(entry.createdAt).toLocaleString('en-NG')}
                </td>
                <td className="px-4 py-2 text-gray-700">{entry.adminEmail}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {entry.entity}:{entry.entityId.slice(0, 8)}
                </td>
                <td className="px-4 py-2 text-gray-400">{entry.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">{result.total} entries total</p>
    </div>
  );
}
