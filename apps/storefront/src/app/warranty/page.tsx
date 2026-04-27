import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/info-page';

export const metadata: Metadata = {
  title: 'Warranty Policy',
  description: 'Warranty information for Jotek electronics and gadget purchases.',
};

export default function WarrantyPage() {
  return (
    <InfoPage
      eyebrow="Warranty"
      title="Warranty-backed gadget purchases."
      intro="Product pages show warranty months so customers know what coverage applies before checkout."
      sections={[
        {
          title: 'Coverage',
          body: 'Warranty coverage depends on the product, brand, condition and supplier terms. Customers should keep invoices and order confirmation details.',
        },
        {
          title: 'Exclusions',
          body: 'Warranty generally excludes physical damage, water damage, unauthorized repairs, misuse and missing serial number verification.',
        },
        {
          title: 'Claims',
          body: 'Warranty claims should be submitted with order number, product photos where needed and a clear description of the fault.',
        },
      ]}
    />
  );
}
