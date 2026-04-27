'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/', icon: '◈' },
  { label: 'Orders', href: '/orders', icon: '◫' },
  { label: 'Products', href: '/products', icon: '▦' },
  { label: 'Inventory', href: '/inventory', icon: '▤' },
  { label: 'Customers', href: '/customers', icon: '◉' },
  { label: 'Reviews', href: '/reviews', icon: '★' },
  { label: 'Promotions', href: '/promotions', icon: '◈' },
  { label: 'Reports', href: '/reports', icon: '▣' },
  { label: 'Audit Log', href: '/audit-log', icon: '◱' },
  { label: 'Settings', href: '/settings', icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="rounded bg-black px-2 py-1">
          <Image src="/jotek-logo.jpeg" alt="Jotek" width={92} height={32} className="h-auto w-auto" />
        </span>
        <span className="ml-2 rounded bg-brand-500 px-1.5 py-0.5 text-xs font-medium text-white">Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <span>⎋</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
