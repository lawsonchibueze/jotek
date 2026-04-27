import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'About Jotek',
  description: 'Learn about Jotek, a Nigerian electronics and gadget store focused on authentic products and reliable support.',
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About Jotek"
      title="Premium electronics, sold with confidence."
      intro="Jotek.ng is being built as a trusted destination for mobile phones, laptops, accessories, audio gear, smart watches, power banks and gaming products in Nigeria."
      cta={{ label: 'Shop electronics', href: '/search' }}
      sections={[
        {
          title: 'Authenticity first',
          body: 'Electronics purchases are trust-heavy. Jotek focuses on clear product information, authentic stock, warranty visibility and responsive after-sales support.',
        },
        {
          title: 'Built for Nigerian shoppers',
          body: 'The platform supports Naira pricing, Paystack payments, WhatsApp support and delivery workflows designed around Lagos and nationwide shipping expectations.',
        },
      ]}
    />
  );
}
