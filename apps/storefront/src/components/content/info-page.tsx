import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface InfoPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  cta?: { label: string; href: string };
}

export function InfoPage({ eyebrow, title, intro, sections, cta }: InfoPageProps) {
  return (
    <div className="bg-white">
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-500">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black text-gray-950 sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-gray-600">{intro}</p>
          {cta && (
            <Link href={cta.href} className="btn-primary mt-8 inline-flex">
              {cta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {sections.map((section) => (
            <article key={section.title} className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-black text-gray-950">{section.title}</h2>
              <p className="mt-2 leading-7 text-gray-600">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
