'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Props {
  id: string;
  isActive: boolean;
}

export function CouponRowActions({ id, isActive }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await api.patch(`/admin/coupons/${id}`, { isActive: !isActive });
      toast.success(isActive ? 'Coupon deactivated' : 'Coupon activated');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this coupon? Orders using it will not be affected.')) return;
    setLoading(true);
    try {
      await api.delete(`/admin/coupons/${id}`);
      toast.success('Coupon deleted');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading}
        onClick={toggle}
        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isActive
            ? 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600'
            : 'border-green-200 text-green-600 hover:bg-green-50'
        }`}
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </button>
      <button
        disabled={loading}
        onClick={remove}
        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
