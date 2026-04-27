'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ShieldCheck, Store } from 'lucide-react';
import { toast } from 'sonner';
import { signIn } from '@/lib/auth-client';

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
      // @ts-expect-error twoFactor plugin types are not exposed by better-auth here.
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
    <div className="grid min-h-screen bg-[#090909] text-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <Image
          src="/hero/admin-login-devices.png"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.76)_100%)]" />
        <div className="absolute inset-x-10 bottom-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-200">
              Jotek operations
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-normal">
              Manage products, orders and inventory with confidence.
            </h1>
            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              {['Orders', 'Inventory', 'Payments'].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-white/85 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(255,122,0,0.22),transparent_34%),#f6f7fb] px-4 py-10 text-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
          <div className="mb-8">
            <span className="inline-flex rounded-md bg-black px-2 py-1">
              <Image
                src="/jotek-logo.jpeg"
                alt="Jotek"
                width={132}
                height={46}
                priority
                className="h-auto w-auto"
              />
            </span>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-brand-500">
              <LockKeyhole className="h-4 w-4" />
              Staff-only admin console
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-normal text-gray-950">
              Sign in to Jotek Admin
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Secure access for products, orders, inventory, reports and fulfilment.
            </p>
            {STOREFRONT_URL ? (
              <Link
                href={STOREFRONT_URL}
                className="mt-4 inline-flex items-center text-sm font-semibold text-brand-500 hover:underline"
              >
                <Store className="mr-2 h-4 w-4" />
                Visit Jotek store
              </Link>
            ) : null}
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
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
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTwoFactor} className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the 6-digit code from your authenticator app.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Authentication Code
                </label>
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
                {loading ? 'Verifying...' : 'Verify'}
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

          <div className="mt-8 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs leading-5 text-gray-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-500" />
            Admin sessions are protected with secure cookies and optional two-factor verification.
          </div>
        </div>
      </main>
    </div>
  );
}
