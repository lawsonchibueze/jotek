import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'Contact Jotek',
  description: 'Contact Jotek for electronics orders, delivery questions, warranty support and product availability.',
};

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Talk to Jotek support."
      intro="Need help choosing a phone, laptop, JBL speaker, accessory or gaming product? Reach out before or after your purchase."
      sections={[
        {
          title: 'WhatsApp support',
          body: 'Use the WhatsApp link on product pages for product availability, compatibility checks and delivery questions.',
        },
        {
          title: 'Email',
          body: 'For receipts, warranty claims, business orders and detailed support requests, email support@jotek.ng.',
        },
        {
          title: 'Support hours',
          body: 'Support is planned for Monday to Saturday, 9am to 7pm West Africa Time.',
        },
      ]}
    />
  );
}
