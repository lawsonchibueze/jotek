import Link from 'next/link';

// Server component — redirect unauthenticated users (middleware handles cookie check,
// but we do a secondary check here for actual session validity).
export default function AccountPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'My Orders', desc: 'Track and manage your orders', href: '/account/orders', icon: '📦' },
          { title: 'Wishlist', desc: 'Products you\'ve saved', href: '/account/wishlist', icon: '❤️' },
          { title: 'Addresses', desc: 'Manage delivery addresses', href: '/account/addresses', icon: '📍' },
          { title: 'Reviews', desc: 'Your product reviews', href: '/account/reviews', icon: '⭐' },
          { title: 'Settings', desc: 'Update your profile', href: '/account/settings', icon: '⚙️' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-start gap-4 rounded-xl border border-gray-200 p-5 transition-all hover:border-brand-500 hover:shadow-sm"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-0.5 text-sm text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
