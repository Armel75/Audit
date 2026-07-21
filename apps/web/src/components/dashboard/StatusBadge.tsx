import { cn, statusBadgeStyles, statusLabelsMap } from './tokens';

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', statusBadgeStyles[value] || 'bg-slate-100 text-slate-700 border-slate-200')}>
      {statusLabelsMap[value] || value}
    </span>
  );
}
