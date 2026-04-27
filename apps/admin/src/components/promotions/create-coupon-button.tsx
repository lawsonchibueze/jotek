'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

const TYPE_OPTIONS: { value: CouponType; label: string }[] = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount (₦)' },
  { value: 'FREE_SHIPPING', label: 'Free Shipping' },
];

export function CreateCouponButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE' as CouponType,
    value: 10,
    maxDiscountAmount: '',
    usageLimit: '',
    minOrderAmount: '',
    expiresAt: '',
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  function close() {
    setOpen(false);
    setForm({
      code: '',
      type: 'PERCENTAGE',
      value: 10,
      maxDiscountAmount: '',
      usageLimit: '',
      minOrderAmount: '',
      expiresAt: '',
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/coupons', {
        code: form.code,
        type: form.type,
        value: form.type === 'FREE_SHIPPING' ? 0 : form.value,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success('Coupon created');
      close();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Create Coupon
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-bold text-gray-900">New Coupon</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code</label>
            <input
              required
              className="input font-mono uppercase tracking-widest"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="SAVE10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => set('type', e.target.value as CouponType)}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {form.type !== 'FREE_SHIPPING' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {form.type === 'PERCENTAGE' ? 'Percent off' : 'Amount off (₦)'}
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  max={form.type === 'PERCENTAGE' ? 100 : undefined}
                  className="input"
                  value={form.value}
                  onChange={(e) => set('value', Number(e.target.value))}
                />
              </div>
              {form.type === 'PERCENTAGE' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Max discount (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.maxDiscountAmount}
                    onChange={(e) => set('maxDiscountAmount', e.target.value)}
                    placeholder="No cap"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Usage Limit
              </label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.usageLimit}
                onChange={(e) => set('usageLimit', e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Min Order (₦)
              </label>
              <input
                type="number"
                min={0}
                className="input"
                value={form.minOrderAmount}
                onChange={(e) => set('minOrderAmount', e.target.value)}
                placeholder="None"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expiry Date
            </label>
            <input
              type="date"
              className="input"
              value={form.expiresAt}
              onChange={(e) => set('expiresAt', e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Coupon'}
            </button>
            <button type="button" onClick={close} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
