'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    image: '/hero/phones-watches.png',
    eyebrow: 'New flagship arrivals',
    title: 'Premium phones, smart watches and earpods.',
    description:
      'Shop authentic mobile devices and wearable tech with clear warranty support, Paystack checkout and fast Nigerian delivery.',
    primaryHref: '/category/mobile-phones',
    primaryLabel: 'Shop Phones',
    secondaryHref: '/search?q=smart%20watch',
    secondaryLabel: 'Smart Watches',
    tag: 'Warranty-backed devices',
  },
  {
    image: '/hero/gaming-ps5.png',
    eyebrow: 'Gaming zone',
    title: 'Console accessories built for serious play.',
    description:
      'Controllers, headsets, charging docks and PS5-ready accessories curated for clean setups and weekend sessions.',
    primaryHref: '/category/gaming',
    primaryLabel: 'Shop Gaming',
    secondaryHref: '/deals',
    secondaryLabel: 'See Deals',
    tag: 'Console-ready gear',
  },
  {
    image: '/hero/accessories-audio.png',
    eyebrow: 'Power and sound',
    title: 'Audio, chargers and power banks that work hard.',
    description:
      'Portable speakers, earpods, power banks, fast chargers, cables and laptop accessories for everyday Nigerian tech life.',
    primaryHref: '/search?q=power%20bank',
    primaryLabel: 'Shop Accessories',
    secondaryHref: '/brand/jbl',
    secondaryLabel: 'Audio Zone',
    tag: 'Everyday essentials',
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const slide = slides[active];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, []);

  const next = () => setActive((current) => (current + 1) % slides.length);
  const previous = () =>
    setActive((current) => (current - 1 + slides.length) % slides.length);

  return (
    <section className="relative min-h-[620px] overflow-hidden bg-black text-white sm:min-h-[680px] lg:min-h-[720px]">
      {slides.map((item, index) => (
        <Image
          key={item.image}
          src={item.image}
          alt=""
          fill
          priority={index === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-700 ${
            index === active ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.72)_32%,rgba(0,0,0,0.2)_72%,rgba(0,0,0,0.05)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />

      <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-16 sm:min-h-[680px] sm:px-6 lg:min-h-[720px] lg:px-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-100 backdrop-blur">
            {slide.eyebrow}
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            {slide.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/78 sm:text-lg">
            {slide.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={slide.primaryHref} className="btn-primary bg-accent-500 px-7 hover:bg-accent-400">
              {slide.primaryLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href={slide.secondaryHref} className="btn-secondary border-white/30 bg-white/10 px-7 text-white hover:bg-white/15">
              {slide.secondaryLabel}
            </Link>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            {['Authentic stock', 'Paystack secure', 'WhatsApp support'].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white/82 backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 flex w-[min(92vw,80rem)] -translate-x-1/2 items-center justify-between gap-4">
        <div className="hidden rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur sm:block">
          {slide.tag}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={previous}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-white/15"
            aria-label="Previous hero slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex rounded-full border border-white/15 bg-black/35 px-2 py-2 backdrop-blur">
            {slides.map((item, index) => (
              <button
                key={item.image}
                type="button"
                onClick={() => setActive(index)}
                className={`mx-1 h-2.5 rounded-full transition-all ${
                  index === active ? 'w-8 bg-accent-500' : 'w-2.5 bg-white/50 hover:bg-white'
                }`}
                aria-label={`Show ${item.eyebrow} slide`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-white/15"
            aria-label="Next hero slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
