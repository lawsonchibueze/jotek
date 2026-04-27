'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth-client';
import Image from 'next/image';

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim();

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        toast.error(result.error.message ?? 'Invalid credentials');
        return;
      }
      if ((result.data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
        setStep('2fa');
        return;
      }
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // @ts-expect-error — twoFactor plugin types
      const result = await signIn.twoFactor({ code });
      if (result.error) {
        toast.error(result.error.message ?? 'Invalid code');
        return;
      }
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <span className="inline-flex rounded-md bg-black px-2 py-1">
            <Image src="/jotek-logo.jpeg" alt="Jotek" width={132} height={46} priority className="h-auto w-auto" />
          </span>
          <p className="mt-1 text-sm text-gray-500">Admin Dashboard</p>
          {STOREFRONT_URL ? (
            <Link
              href={STOREFRONT_URL}
              className="mt-3 inline-flex text-sm font-semibold text-brand-500 hover:underline"
            >
              Visit Jotek store
            </Link>
          ) : null}
        </div>

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTwoFactor} className="space-y-4">
            <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app.</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Authentication Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                className="input text-center tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              className="w-full text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setStep('credentials')}
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
