import { cn, type Tone, toneMap } from './tokens';

export function MetricRow({ label, value, hint, tone = 'slate' }: { label: string; value: string; hint?: string; tone?: Tone }) {
  const t = toneMap[tone];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
        <span className={cn('rounded-full px-2.5 py-1 text-sm font-bold', t.soft, t.text)}>{value}</span>
      </div>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
