'use client';

import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';
import { Headphones, Menu, Search, ShieldCheck, ShoppingCart, Truck, User, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SearchAutocomplete } from './search-autocomplete';
import { Logo } from './logo';
import type { Cart } from '@jotek/types';

const NAV_LINKS = [
  { label: 'Phones', href: '/category/mobile-phones' },
  { label: 'Laptops', href: '/category/laptops' },
  { label: 'Accessories', href: '/category/accessories' },
  { label: 'JBL Speakers', href: '/brand/jbl' },
  { label: 'Smart Watches', href: '/search?q=smart%20watch' },
  { label: 'Gaming', href: '/category/gaming' },
  { label: 'Deals', href: '/deals' },
];

const TRUST_LINKS = [
  { icon: ShieldCheck, text: 'Original products' },
  { icon: Truck, text: 'Lagos express delivery' },
  { icon: Headphones, text: 'WhatsApp support' },
];

export function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: cart } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart'),
    staleTime: 30_000,
  });
  const cartCount = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="bg-black text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 px-4 py-2 text-[11px] font-medium sm:justify-between sm:text-xs">
          <span>Pay securely with Paystack. Nationwide delivery across Nigeria.</span>
          <div className="hidden items-center gap-4 lg:flex">
            {TRUST_LINKS.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 text-white/80">
                <Icon className="h-3.5 w-3.5 text-accent-400" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Logo compact className="flex-shrink-0" />

          <div className="hidden flex-1 md:block">
            <SearchAutocomplete />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/search" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden">
              <Search className="h-5 w-5" />
            </Link>

            {session ? (
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100">
                  <User className="h-5 w-5" />
                  <span className="hidden text-sm font-medium sm:block">
                    {session.user.name?.split(' ')[0]}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-1 hidden w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg group-hover:block">
                  <Link href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Account</Link>
                  <Link href="/account/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Orders</Link>
                  <Link href="/account/wishlist" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Wishlist</Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="btn-ghost text-sm">
                Sign In
              </Link>
            )}

            <Link href="/cart" className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <nav className="hidden border-t border-gray-100 lg:block">
          <div className="flex gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:text-brand-500"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 lg:hidden">
          <form action="/search">
            <div className="relative">
              <input
                name="q"
                type="search"
                placeholder="Search phones, laptops, JBL, PS5..."
                className="input pr-12"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>
          <nav className="mt-4 grid grid-cols-2 gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
