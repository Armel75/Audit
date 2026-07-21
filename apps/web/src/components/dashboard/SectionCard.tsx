import { cn } from './tokens';

export function SectionCard({
  title, subtitle, action, children, className,
}: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/30 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-700 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white sm:text-base">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
