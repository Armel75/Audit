import React from 'react';

interface PremiumTabsProps<T extends string> {
  tabs: Array<{
    value: T;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Composant d'onglets premium Tailwind, accessible et cohérent avec le design system existant.
 */
export function PremiumTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: PremiumTabsProps<T>) {
  return (
    <div className={`flex border-b border-slate-200 dark:border-slate-700 ${className}`} role="tablist">
      {tabs.map(({ value: tabValue, label, icon: Icon }) => (
        <button
          key={tabValue}
          type="button"
          role="tab"
          aria-selected={value === tabValue}
          tabIndex={value === tabValue ? 0 : -1}
          onClick={() => onChange(tabValue)}
          className={`
            group relative min-w-[160px] px-5 py-2.5 flex items-center gap-2 font-semibold text-sm
            transition-colors border-b-2
            ${value === tabValue
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-slate-900'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-slate-800'}
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
          `}
        >
          {Icon && <Icon className="w-5 h-5" />}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
