'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Props {
  productId: string;
  current: number;
}

export function AdjustStockButton({ productId, current }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(current);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await api.patch(`/admin/products/${productId}/stock`, { stockQuantity: qty });
      toast.success('Stock updated');
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary py-1 text-xs">
        Adjust
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <input
        type="number"
        min={0}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <button disabled={loading} onClick={handleSave} className="btn-primary py-1 text-xs">
        Save
      </button>
      <button onClick={() => setOpen(false)} className="btn-secondary py-1 text-xs">
        Cancel
      </button>
    </div>
  );
}
