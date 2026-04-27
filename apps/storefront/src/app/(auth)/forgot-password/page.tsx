'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { forgetPassword } from '@/lib/auth-client';
import { Logo } from '@/components/layout/logo';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { error } = await forgetPassword({
        email: data.email,
        redirectTo: '/reset-password',
      });
      if (error) throw new Error(error.message ?? 'Request failed');
      // Always show success — don't leak whether the email exists in our system
      setSubmitted(true);
    } catch (err: any) {
      // Still show success on any non-400 error to avoid email enumeration
      setSubmitted(true);
      if (process.env.NODE_ENV === 'development') {
        toast.error(err.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-500">
            {submitted
              ? "If an account exists for that email, we've sent a reset link."
              : 'Enter your email and we\'ll send you a link to reset your password.'}
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email address</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        ) : (
          <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-green-700">
              The link expires in 1 hour. If you don't see it, check your spam folder.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-brand-500 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
