import Link from 'next/link';
import { Mail, MessageCircle, ShieldCheck, Truck } from 'lucide-react';
import { Logo } from './logo';

const shopLinks = [
  ['Mobile Phones', '/category/mobile-phones'],
  ['Laptops', '/category/laptops'],
  ['Phone Accessories', '/category/accessories'],
  ['JBL Speakers', '/brand/jbl'],
  ['Gaming', '/category/gaming'],
  ['Deals', '/deals'],
];

const supportLinks = [
  ['Track Order', '/track'],
  ['Delivery Information', '/delivery'],
  ['Returns & Refunds', '/returns'],
  ['Warranty Policy', '/warranty'],
  ['FAQ', '/faq'],
  ['Contact', '/contact'],
];

export function Footer() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348000000000';

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-500">
              Jotek supplies authentic phones, laptops, accessories, audio gear and gaming
              products with warranty-backed confidence across Nigeria.
            </p>
            <div className="mt-5 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-1">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Authentic products
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent-500" />
                Lagos express and nationwide delivery
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Shop</h4>
            <ul className="mt-4 space-y-2">
              {shopLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-gray-500 hover:text-brand-500">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Support</h4>
            <ul className="mt-4 space-y-2">
              {supportLinks.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-gray-500 hover:text-brand-500">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">Contact</h4>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-500"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  WhatsApp Support
                </a>
              </li>
              <li>
                <a href="mailto:support@jotek.ng" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-500">
                  <Mail className="h-4 w-4 text-brand-500" />
                  support@jotek.ng
                </a>
              </li>
            </ul>
            <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
              Mon-Sat, 9am-7pm WAT
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 sm:flex-row">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Jotek Nigeria. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
