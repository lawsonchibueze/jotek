import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BatteryCharging,
  Cable,
  CreditCard,
  Gamepad2,
  Headphones,
  Laptop,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  Watch,
} from 'lucide-react';
import { serverFetch } from '@/lib/api';
import { ProductCard } from '@/components/shop/product-card';
import type { ProductCard as ProductCardType, Brand, Category } from '@jotek/types';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Jotek — Premium Electronics & Gadgets in Nigeria',
  description:
    'Shop authentic phones, laptops, accessories, JBL speakers, smart watches, earpods, power banks and gaming gear at Jotek.ng.',
};

async function getHomepageData() {
  const [featuredProducts, brands, categories] = await Promise.allSettled([
    serverFetch<{ data: ProductCardType[] }>('/products?limit=8&sort=popular', 30),
    serverFetch<Brand[]>('/brands?featured=true', 300),
    serverFetch<Category[]>('/categories', 300),
  ]);

  return {
    featuredProducts:
      featuredProducts.status === 'fulfilled' ? featuredProducts.value.data : [],
    brands: brands.status === 'fulfilled' ? brands.value : [],
    categories: categories.status === 'fulfilled' ? categories.value : [],
  };
}

const categoryFallbacks = [
  { label: 'Mobile Phones', href: '/category/mobile-phones', icon: Smartphone, tone: 'bg-blue-50 text-blue-700' },
  { label: 'Laptops', href: '/category/laptops', icon: Laptop, tone: 'bg-slate-100 text-slate-700' },
  { label: 'Accessories', href: '/category/accessories', icon: Cable, tone: 'bg-amber-50 text-amber-700' },
  { label: 'JBL Speakers', href: '/brand/jbl', icon: Headphones, tone: 'bg-orange-50 text-orange-700' },
  { label: 'Smart Watches', href: '/search?q=smart%20watch', icon: Watch, tone: 'bg-emerald-50 text-emerald-700' },
  { label: 'Power Banks', href: '/search?q=power%20bank', icon: BatteryCharging, tone: 'bg-violet-50 text-violet-700' },
  { label: 'Gaming', href: '/category/gaming', icon: Gamepad2, tone: 'bg-red-50 text-red-700' },
];

const trustItems = [
  { title: 'Authentic stock', text: 'Original products with clear warranty coverage.', icon: ShieldCheck },
  { title: 'Paystack checkout', text: 'Card, transfer and USSD payment options.', icon: CreditCard },
  { title: 'Nigeria delivery', text: 'Lagos express and nationwide courier options.', icon: Truck },
  { title: 'Human support', text: 'WhatsApp help before and after purchase.', icon: MessageCircle },
];

export default async function HomePage() {
  const { featuredProducts, brands, categories } = await getHomepageData();
  const heroProducts = featuredProducts.filter((p) => p.primaryImage).slice(0, 3);
  const visibleCategories = categoryFallbacks.map((fallback) => {
    const match = categories.find((c) => c.slug === fallback.href.split('/').pop());
    return {
      ...fallback,
      label: match?.name ?? fallback.label,
      href: match ? `/category/${match.slug}` : fallback.href,
    };
  });

  return (
    <div className="bg-white">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_right,#fff7ed,transparent_32%),linear-gradient(135deg,#050505_0%,#111827_54%,#0A2463_100%)] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-orange-100">
              <Sparkles className="h-3.5 w-3.5 text-accent-400" />
              Premium gadgets, built for Nigerian shoppers
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Authentic electronics delivered with confidence.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Shop mobile phones, laptops, JBL speakers, earpods, smart watches, power
              banks, PS5 accessories and everyday tech essentials from Jotek.ng.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/search" className="btn-primary bg-accent-500 px-7 hover:bg-accent-400">
                Shop Electronics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/deals" className="btn-secondary border-white/30 bg-white/10 px-7 text-white hover:bg-white/15">
                View Deals
              </Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
              {['Warranty-backed', 'Paystack secure', 'WhatsApp support'].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white/80">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[360px] lg:min-h-[460px]">
            <div className="absolute inset-x-8 top-10 h-64 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="relative grid h-full grid-cols-2 gap-4">
              <div className="flex flex-col justify-end gap-4 pb-8">
                {heroProducts[0] ? (
                  <HeroProduct product={heroProducts[0]} large />
                ) : (
                  <HeroDevice label="Flagship phones" icon={Smartphone} large />
                )}
                {heroProducts[1] ? (
                  <HeroProduct product={heroProducts[1]} />
                ) : (
                  <HeroDevice label="Power accessories" icon={BatteryCharging} />
                )}
              </div>
              <div className="flex flex-col gap-4 pt-8">
                <div className="rounded-2xl border border-white/10 bg-white p-5 text-gray-900 shadow-2xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-500">Today at Jotek</p>
                  <p className="mt-2 text-3xl font-black">Up to 25% off</p>
                  <p className="mt-1 text-sm text-gray-500">Selected accessories and audio deals.</p>
                </div>
                {heroProducts[2] ? (
                  <HeroProduct product={heroProducts[2]} />
                ) : (
                  <HeroDevice label="JBL audio zone" icon={Headphones} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {trustItems.map(({ title, text, icon: Icon }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="rounded-lg bg-gray-100 p-2 text-brand-500">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{title}</h2>
                <p className="mt-1 text-sm leading-5 text-gray-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-500">Shop by category</p>
            <h2 className="mt-1 text-2xl font-black text-gray-900">Find the right tech faster</h2>
          </div>
          <Link href="/search" className="hidden text-sm font-semibold text-brand-500 hover:underline sm:inline-flex">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {visibleCategories.map(({ label, href, icon: Icon, tone }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
            >
              <div className={`mb-4 inline-flex rounded-lg p-3 ${tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-gray-900 group-hover:text-brand-500">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-500">Featured picks</p>
              <h2 className="mt-1 text-2xl font-black text-gray-900">Popular electronics this week</h2>
            </div>
            <Link href="/search" className="text-sm font-semibold text-brand-500 hover:underline">
              View all
            </Link>
          </div>
          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
              <p className="text-lg font-bold text-gray-900">Products are being prepared.</p>
              <p className="mt-2 text-sm text-gray-500">
                Add products in the admin dashboard to populate this premium storefront.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <PromoCard
            title="Phone upgrade desk"
            text="Latest smartphones, earpods, cases, chargers and screen protection."
            href="/category/mobile-phones"
          />
          <PromoCard
            title="Work and study laptops"
            text="HP, Lenovo, Dell and accessories for school, business and remote work."
            href="/category/laptops"
          />
          <PromoCard
            title="Sound and gaming zone"
            text="JBL speakers, headsets, PS5 accessories and portable power essentials."
            href="/category/gaming"
          />
        </div>
      </section>

      {brands.length > 0 && (
        <section className="border-t border-gray-100 bg-white py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
              Trusted brands at Jotek
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {brands.map((brand) => (
                <Link key={brand.id} href={`/brand/${brand.slug}`} className="opacity-70 transition-opacity hover:opacity-100">
                  {brand.logoUrl ? (
                    <Image src={brand.logoUrl} alt={brand.name} width={96} height={40} className="h-8 w-auto object-contain" />
                  ) : (
                    <span className="text-sm font-black uppercase tracking-wide text-gray-600">{brand.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function HeroProduct({ product, large = false }: { product: ProductCardType; large?: boolean }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group rounded-2xl border border-white/10 bg-white p-4 text-gray-900 shadow-2xl transition hover:-translate-y-1 ${
        large ? 'min-h-[220px]' : 'min-h-[170px]'
      }`}
    >
      <div className="relative mx-auto aspect-square max-h-36">
        {product.primaryImage && (
          <Image src={product.primaryImage} alt={product.name} fill className="object-contain" sizes="180px" />
        )}
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-bold group-hover:text-brand-500">{product.name}</p>
    </Link>
  );
}

function HeroDevice({
  label,
  icon: Icon,
  large = false,
}: {
  label: string;
  icon: typeof Smartphone;
  large?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white p-5 text-gray-900 shadow-2xl ${large ? 'min-h-[220px]' : 'min-h-[170px]'}`}>
      <div className="flex aspect-square max-h-32 items-center justify-center rounded-2xl bg-gray-100 text-brand-500">
        <Icon className="h-14 w-14" />
      </div>
      <p className="mt-4 text-sm font-black">{label}</p>
    </div>
  );
}

function PromoCard({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md">
      <p className="text-lg font-black text-gray-900 group-hover:text-brand-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
      <span className="mt-5 inline-flex items-center text-sm font-semibold text-accent-500">
        Shop now
        <ArrowRight className="ml-2 h-4 w-4" />
      </span>
    </Link>
  );
}
