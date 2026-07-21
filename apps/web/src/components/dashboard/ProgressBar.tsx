import { cn, type Tone } from './tokens';

const barColor: Record<Tone, string> = {
  slate: 'bg-slate-500', blue: 'bg-blue-600', amber: 'bg-amber-500', emerald: 'bg-emerald-600',
  red: 'bg-red-600', violet: 'bg-violet-600', indigo: 'bg-indigo-600', rose: 'bg-rose-600',
};

export function ProgressBar({ value, tone = 'blue', showLabel = true, size = 'md' }: {
  value: number; tone?: Tone; showLabel?: boolean; size?: 'sm' | 'md';
}) {
  const heights = { sm: 'h-1.5', md: 'h-2.5' };
  return (
    <div className="flex items-center gap-3">
      <div className={cn(heights[size], 'flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700')}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {showLabel ? <span className="w-10 text-right text-xs font-medium text-slate-600 dark:text-slate-300">{value}%</span> : null}
    </div>
  );
}
