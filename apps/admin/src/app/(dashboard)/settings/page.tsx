import type { Metadata } from 'next';
import { TwoFactorSetup } from '@/components/settings/two-factor-setup';
import { ReindexSearchButton } from '@/components/settings/reindex-search-button';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Two-Factor Authentication</h2>
        <p className="mb-4 text-sm text-gray-500">
          Protect your account with a time-based OTP authenticator app.
        </p>
        <TwoFactorSetup />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Search Index</h2>
        <p className="mb-4 text-sm text-gray-500">
          Rebuild the Typesense product index from the database. Use this after
          deploying a change to the search schema (e.g. a new filter field)
          to backfill historic products. Normal product edits sync automatically
          — you only need this for one-off migrations.
        </p>
        <ReindexSearchButton />
      </section>
    </div>
  );
}
