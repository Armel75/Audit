import { Siren } from 'lucide-react';
import { cn } from './tokens';

const severityStyles = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  medium: 'border-blue-200 bg-blue-50 text-blue-700',
} as const;

export function AlertCard({ title, detail, severity, action }: {
  title: string; detail: string; severity: 'critical' | 'high' | 'medium'; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', severityStyles[severity])}>
          <Siren className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
            <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', severityStyles[severity])}>
              {severity === 'critical' ? 'Critique' : severity === 'high' ? 'Élevée' : 'Surveillance'}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{detail}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
