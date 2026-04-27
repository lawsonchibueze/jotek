import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Jotek.ng.',
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="How Jotek handles customer data."
      intro="Jotek collects only the information needed to process orders, payments, delivery, account access and support."
      sections={[
        {
          title: 'Information collected',
          body: 'Customer information may include name, email, phone number, delivery address, order history, payment reference and support messages.',
        },
        {
          title: 'How it is used',
          body: 'Data is used to process orders, verify payments, provide delivery updates, prevent fraud and support customer requests.',
        },
        {
          title: 'Third-party services',
          body: 'Jotek may use providers such as Paystack, email, SMS, hosting, storage and analytics services to operate the platform.',
        },
      ]}
    />
  );
}
