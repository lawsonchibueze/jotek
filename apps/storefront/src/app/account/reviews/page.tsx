'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface UserReview {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string };
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('text-base', i <= rating ? 'text-accent-500' : 'text-gray-200')}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function AccountReviewsPage() {
  const qc = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery<UserReview[]>({
    queryKey: ['account-reviews'],
    queryFn: () => api.get('/account/reviews'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/account/reviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-reviews'] });
      toast.success('Review removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">← Account</Link>
        <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        {reviews.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
            {reviews.length}
          </span>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {isLoading && (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-gray-100" />)}
          </div>
        )}

        {!isLoading && reviews.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <div className="text-4xl">⭐</div>
            <p className="mt-3 font-medium text-gray-900">No reviews yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Reviews you write on product pages will appear here.
            </p>
            <Link href="/" className="btn-primary mt-6 inline-flex">
              Browse Products
            </Link>
          </div>
        )}

        {reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${review.product.slug}`}
                  className="font-semibold text-gray-900 hover:text-brand-500 truncate block"
                >
                  {review.product.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
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
                    {review.isApproved ? 'Published' : 'Pending approval'}
                  </span>
                </div>
                {review.title && (
                  <p className="mt-2 font-medium text-gray-900">{review.title}</p>
                )}
                {review.body && (
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {review.body}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete this review?')) deleteMutation.mutate(review.id);
                }}
                disabled={deleteMutation.isPending}
                className="flex-shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
