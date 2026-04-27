interface Props {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  icon?: string;
  accent?: 'default' | 'warning' | 'danger' | 'success';
}

export function StatsCard({ label, value, sub, trend, icon, accent = 'default' }: Props) {
  const accentClass = {
    default: 'bg-brand-50 text-brand-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    success: 'bg-green-50 text-green-600',
  }[accent];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && (
          <span className={`flex-shrink-0 rounded-lg p-1.5 text-base leading-none ${accentClass}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      {trend !== undefined && (
        <div
          className={`mt-2 flex items-center gap-1 text-xs font-medium ${
            trend >= 0 ? 'text-green-600' : 'text-red-500'
          }`}
        >
          <span>{trend >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend)}% vs prior 30 days</span>
        </div>
      )}
    </div>
  );
}
