'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Logo } from '@/components/layout/logo';

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authClient.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: '/account',
      });
      toast.success('Account created! Please check your email to verify.');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-500">Shop smarter with order tracking & wishlist</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          {[
            { name: 'name', label: 'Full name', type: 'text', placeholder: 'Emeka Okafor' },
            { name: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            { name: 'confirmPassword', label: 'Confirm password', type: 'password', placeholder: '••••••••' },
          ].map((field) => (
            <div key={field.name}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{field.label}</label>
              <input
                {...register(field.name as any)}
                type={field.type}
                placeholder={field.placeholder}
                className="input"
              />
              {errors[field.name as keyof FormData] && (
                <p className="mt-1 text-xs text-red-500">
                  {errors[field.name as keyof FormData]?.message}
                </p>
              )}
            </div>
          ))}

          <p className="text-xs text-gray-400">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-brand-500 hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-brand-500 hover:underline">Privacy Policy</Link>.
          </p>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
