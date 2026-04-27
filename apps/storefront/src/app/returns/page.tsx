import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'Returns & Refunds',
  description: 'Returns and refund policy for Jotek electronics orders.',
};

export default function ReturnsPage() {
  return (
    <InfoPage
      eyebrow="Returns"
      title="A clear return process for electronics."
      intro="Electronics returns need inspection, order verification and condition checks. This policy gives customers a predictable starting point."
      sections={[
        {
          title: 'Return window',
          body: 'Eligible delivered orders may request a return within the stated return window shown on the order and product policy.',
        },
        {
          title: 'Product condition',
          body: 'Returned items should include accessories, packaging and must not show misuse, tampering or avoidable damage.',
        },
        {
          title: 'Refunds',
          body: 'Approved refunds are processed after inspection and payment reconciliation. Paystack refunds should be handled from the admin payment workflow.',
        },
      ]}
    />
  );
}
