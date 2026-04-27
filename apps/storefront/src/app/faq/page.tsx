import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Jotek orders, payment, delivery, returns and warranty.',
};

export default function FaqPage() {
  return (
    <InfoPage
      eyebrow="FAQ"
      title="Common questions before you buy."
      intro="These are the core answers buyers need before paying for electronics online."
      sections={[
        {
          title: 'Are products original?',
          body: 'Jotek is positioned around authentic electronics with clear warranty information. Product pages should show condition, warranty months and stock availability.',
        },
        {
          title: 'How can I pay?',
          body: 'Checkout supports Paystack-powered card, bank transfer and USSD options. Pay-on-delivery may be limited by order value and delivery zone.',
        },
        {
          title: 'Can I track my order?',
          body: 'Yes. Customers can use the order tracking page with their order number and phone number.',
        },
      ]}
    />
  );
}
