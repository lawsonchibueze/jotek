'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { resetPassword } from '@/lib/auth-client';
import { Logo } from '@/components/layout/logo';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="w-full max-w-md text-center">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Invalid reset link</h1>
        <p className="mt-2 text-sm text-gray-500">
          This link is missing or malformed. Request a new one.
        </p>
        <Link href="/forgot-password" className="btn-primary mt-6 inline-flex">
          Request new link
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await resetPassword({ newPassword: data.newPassword, token });
      if (error) throw new Error(error.message ?? 'Reset failed');
      toast.success('Password reset. You can now sign in.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'Reset link is invalid or expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Choose a new password</h1>
        <p className="mt-2 text-sm text-gray-500">At least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
          <input
            {...register('newPassword')}
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
          <input
            {...register('confirmPassword')}
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-brand-500 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
