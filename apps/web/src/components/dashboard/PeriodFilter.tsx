import { CalendarDays } from 'lucide-react';
import { cn } from './tokens';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export type PeriodFilterValue = {
  year: number;
  month: number | null;
};

export function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodFilterValue;
  onChange: (v: PeriodFilterValue) => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="rounded-2xl border border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/40 dark:to-slate-800 p-4 shadow-sm">
      {/* En-tête avec libellé explicite */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
          <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-400">
          Filtrer par période
        </span>
        {value.month !== null && (
          <span className="ml-auto rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
            {MONTHS_FR[value.month]} {value.year}
          </span>
        )}
        {value.month === null && (
          <span className="ml-auto rounded-full bg-slate-200 dark:bg-slate-700 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            {value.year} · Vue annuelle
          </span>
        )}
      </div>

      {/* Années — toujours visibles, gros boutons */}
      <div className="mb-3">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          1. Choisir une année
        </p>
        <div className="flex gap-2">
          {years.map(y => (
            <button
              key={y}
              onClick={() => onChange({ ...value, year: y })}
              className={cn(
                'flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold transition-all duration-150 border-2',
                value.year === y
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-105'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm'
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Mois — toujours visibles */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            2. Choisir un mois
          </p>
          <button
            onClick={() => onChange({ ...value, month: null })}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-2',
              value.month === null
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-105'
                : 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-500 hover:shadow-sm'
            )}
          >
            📅 Tous les mois
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {MONTHS_FR.map((m, i) => {
            const isFuture = value.year === currentYear && i > now.getMonth();
            return (
              <button
                key={m}
                disabled={isFuture}
                onClick={() => onChange({ ...value, month: i })}
                className={cn(
                  'rounded-lg px-2 py-2.5 text-xs font-bold transition-all duration-150 border-2',
                  isFuture && 'cursor-not-allowed',
                  value.month === i
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-105'
                    : !isFuture
                      ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer'
                      : 'bg-slate-100/50 text-slate-400 border-slate-200 dark:bg-slate-700/30 dark:text-slate-500 dark:border-slate-600/50'
                )}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
