'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function ProductTableActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setLoading(true);
    try {
      await api.delete(`/admin/products/${productId}`);
      toast.success('Product deleted');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/products/${productId}/edit`} className="btn-secondary py-1 text-xs">
        Edit
      </Link>
      <button
        disabled={loading}
        onClick={handleDelete}
        className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
