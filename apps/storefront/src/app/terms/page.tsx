import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for using Jotek.ng.',
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Terms for shopping on Jotek.ng."
      intro="These terms define the baseline expectations for orders, pricing, payments, delivery and customer responsibilities."
      sections={[
        {
          title: 'Orders and pricing',
          body: 'Product prices, availability and promotions may change. Orders are confirmed after checkout validation and successful payment or approved pay-on-delivery conditions.',
        },
        {
          title: 'Payments',
          body: 'Online payments are processed through Paystack. Customers should complete payment only through the official checkout flow.',
        },
        {
          title: 'Customer responsibility',
          body: 'Customers are responsible for providing accurate contact, delivery and order information to avoid delays or failed fulfilment.',
        },
      ]}
    />
  );
}
