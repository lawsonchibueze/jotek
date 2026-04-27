'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; slug: string };
}

type StatusFilter = 'pending' | 'approved' | 'all';

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'All', value: 'all' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'text-amber-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('pending');

  const { data, isLoading } = useQuery<{ data: AdminReview[]; total: number }>({
    queryKey: ['admin-reviews', status],
    queryFn: () => api.get(`/admin/reviews?status=${status}&limit=50`),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      api.patch(`/admin/reviews/${id}`, { isApproved: approve }),
    onSuccess: (_, { approve }) => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success(approve ? 'Review approved' : 'Review rejected');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Review deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviews = data?.data ?? [];
  const isPending = approveMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        {data && (
          <span className="text-sm text-gray-500">{data.total} total</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              status === tab.value
                ? 'border-b-2 border-brand-500 text-brand-600'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && reviews.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
          {status === 'pending'
            ? 'No reviews pending moderation'
            : 'No reviews found'}
        </div>
      )}

      {/* Review cards */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              {/* Left: content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/products/${review.product.id}`}
                    className="font-semibold text-gray-900 hover:text-brand-500"
                    target="_blank"
                  >
                    {review.product.name}
                  </Link>
                  {review.isVerifiedPurchase && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Verified Purchase
                    </span>
                  )}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      review.isApproved
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700',
                    )}
                  >
                    {review.isApproved ? 'Published' : 'Pending'}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <Stars rating={review.rating} />
                  <span>{review.user.name}</span>
                  <span>{review.user.email}</span>
                  <span>{new Date(review.createdAt).toLocaleDateString('en-NG')}</span>
                </div>

                {review.title && (
                  <p className="mt-2 font-medium text-gray-900">{review.title}</p>
                )}
                {review.body && (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-gray-600">
                    {review.body}
                  </p>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex flex-shrink-0 gap-2 sm:flex-col sm:items-end">
                {!review.isApproved ? (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      approveMutation.mutate({ id: review.id, approve: true })
                    }
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      approveMutation.mutate({ id: review.id, approve: false })
                    }
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                )}
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (confirm('Delete this review permanently?'))
                      deleteMutation.mutate(review.id);
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
