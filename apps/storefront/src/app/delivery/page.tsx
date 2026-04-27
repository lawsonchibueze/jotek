import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'Delivery Information',
  description: 'Delivery information for Jotek orders in Lagos and across Nigeria.',
};

export default function DeliveryPage() {
  return (
    <InfoPage
      eyebrow="Delivery"
      title="Delivery across Nigeria."
      intro="Jotek checkout calculates delivery based on your state and available shipping zones."
      sections={[
        {
          title: 'Lagos delivery',
          body: 'Lagos orders can support faster fulfilment depending on stock availability, payment confirmation and delivery address.',
        },
        {
          title: 'Nationwide delivery',
          body: 'Orders outside Lagos are routed through available courier zones with estimated delivery windows shown during checkout.',
        },
        {
          title: 'Delivery confirmation',
          body: 'Customers should provide a reachable phone number and accurate address details to prevent failed delivery attempts.',
        },
      ]}
    />
  );
}
