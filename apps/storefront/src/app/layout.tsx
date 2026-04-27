import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://jotek.ng'),
  title: {
    template: '%s | Jotek — Electronics & Gadgets Nigeria',
    default: 'Jotek — Buy Electronics & Gadgets in Nigeria',
  },
  description:
    'Shop the latest phones, laptops, accessories, JBL speakers, PS5, and more at Jotek. Authentic products, warranty guaranteed. Fast delivery across Nigeria.',
  keywords: ['electronics Nigeria', 'buy phone Nigeria', 'laptop Nigeria', 'Jotek'],
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://jotek.ng',
    siteName: 'Jotek',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Jotek Electronics' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@jotekng',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://jotek.ng' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={inter.variable}>
      <body>
        <QueryProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </body>
    </html>
  );
}
