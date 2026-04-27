'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { formatDate, cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { id: string; name: string };
}

interface Props {
  productId: string;
  initialReviews: Review[];
}

function Stars({ rating, interactive = false, onSelect }: {
  rating: number;
  interactive?: boolean;
  onSelect?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? (hovered || rating) : rating;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type={interactive ? 'button' : undefined}
          onClick={interactive ? () => onSelect?.(i) : undefined}
          onMouseEnter={interactive ? () => setHovered(i) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          className={cn(
            'text-xl leading-none transition-colors',
            i <= display ? 'text-accent-500' : 'text-gray-200',
            interactive && 'cursor-pointer hover:scale-110',
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId, initialReviews }: Props) {
  const qc = useQueryClient();
  const { data: session } = useSession();

  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { data: reviews = initialReviews } = useQuery<Review[]>({
    queryKey: ['reviews', productId],
    queryFn: () => api.get(`/reviews/product/${productId}`),
    initialData: initialReviews,
    staleTime: 60_000,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/reviews', { productId, rating, title: title || undefined, body: body || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', productId] });
      toast.success('Review submitted! It will appear after approval.');
      setShowForm(false);
      setRating(0);
      setTitle('');
      setBody('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="mt-16 border-t border-gray-200 pt-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm text-gray-500">
                {avgRating.toFixed(1)} out of 5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {session && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary self-start sm:self-auto">
            Write a Review
          </button>
        )}
        {!session && (
          <a href="/login" className="text-sm text-brand-500 hover:underline">
            Sign in to write a review
          </a>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-4 font-semibold text-gray-900">Your Review</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Rating *</label>
              <Stars rating={rating} interactive onSelect={setRating} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarise your experience"
                className="input"
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Review</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Tell others about the product..."
                className="input resize-none"
                maxLength={2000}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => submitMutation.mutate()}
                disabled={rating === 0 || submitMutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting…' : 'Submit Review'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
            {rating === 0 && (
              <p className="text-xs text-gray-400">Please select a star rating to continue.</p>
            )}
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                      {review.user.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{review.user.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} />
                  {review.isVerifiedPurchase && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Verified Purchase
                    </span>
                  )}
                </div>
              </div>
              {review.title && (
                <p className="mt-3 font-medium text-gray-900">{review.title}</p>
              )}
              {review.body && (
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{review.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
