'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AppliedCoupon } from '@jotek/types';

interface Props {
  appliedCoupon: AppliedCoupon | null;
}

export function CouponInput({ appliedCoupon }: Props) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');

  const applyMutation = useMutation({
    mutationFn: () => api.post('/cart/apply-coupon', { code: code.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Coupon applied');
      setCode('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => api.delete('/cart/coupon'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Coupon removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (appliedCoupon) {
    return (
      <div className="rounded-lg bg-green-50 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
              <Ticket className="h-3.5 w-3.5" />
              {appliedCoupon.code}
            </p>
            <p className="text-xs text-green-600">
              -{formatPrice(appliedCoupon.discountAmount)} discount applied
            </p>
          </div>
          <button
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Coupon code"
        className="input flex-1 text-sm uppercase"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (code.trim()) applyMutation.mutate();
          }
        }}
      />
      <button
        onClick={() => applyMutation.mutate()}
        disabled={!code.trim() || applyMutation.isPending}
        className="btn-secondary px-3 text-sm disabled:opacity-50"
      >
        {applyMutation.isPending ? '...' : 'Apply'}
      </button>
    </div>
  );
}
