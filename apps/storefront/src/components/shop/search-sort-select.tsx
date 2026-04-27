'use client';

interface Props {
  currentSort: string;
  options: Array<{ value: string; label: string }>;
}

export function SearchSortSelect({ currentSort, options }: Props) {
  return (
    <select
      defaultValue={currentSort}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
      onChange={(e) => {
        const url = new URL(window.location.href);
        url.searchParams.set('sort', e.target.value);
        url.searchParams.delete('page');
        window.location.href = url.toString();
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
