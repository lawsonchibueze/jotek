import { redirect } from 'next/navigation';

// /deals is a canonical vanity URL for the on-sale listing. The search page
// renders the actual UI — keeping one code path for filters, sort, pagination.
export default function DealsPage() {
  redirect('/search?onSale=true');
}
