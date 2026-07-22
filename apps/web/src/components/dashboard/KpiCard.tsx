import { cn, type Tone, toneMap } from './tokens';

export function KpiCard({ label, value, hint, tone, icon: Icon, action }: {
  label: string; value: string; hint: string; tone: Tone; icon: React.ComponentType<{ className?: string }>; action?: React.ReactNode;
}) {
  const t = toneMap[tone];
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', t.soft, t.border)}>
          <Icon className={cn('h-5 w-5', t.text)} />
        </div>
      </div>
      <div className="mt-4 flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
      {action && (
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700">
          {action}
        </div>
      )}
    </div>
  );
}
