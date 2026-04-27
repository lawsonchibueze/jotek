'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function ReindexSearchButton() {
  const mutation = useMutation({
    mutationFn: () => api.post<{ indexed: number }>('/search/reindex', {}),
    onSuccess: (data) => toast.success(`Reindexed ${data.indexed} products`),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="btn-secondary disabled:opacity-50"
    >
      {mutation.isPending ? 'Reindexing…' : 'Reindex All Products'}
    </button>
  );
}
