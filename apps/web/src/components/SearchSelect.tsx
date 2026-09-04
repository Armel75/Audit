import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchSelectProps {
  label?: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
}

/**
 * Combobox « recherche + sélection » contenu dans son conteneur.
 * Remplace le <select> natif (dont le popup ne peut pas être contraint et
 * débordait du modal pour les options aux titres longs).
 */
export const SearchSelect: React.FC<SearchSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  disabled = false,
  error = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((opt) => opt.value === value) ?? null;

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [search, options]);

  // Fermeture au clic extérieur ou à la touche Échap.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => !v);
    setSearch('');
  };

  const selectOption = (opt: { label: string; value: string }) => {
    onChange(opt.value);
    setSearch('');
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setSearch('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">{label}</label>
      )}

      {/* Champ affichage / ouverture */}
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-invalid={error}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed
          ${error
            ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900'
            : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 hover:border-slate-300 dark:hover:border-slate-500'
          }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Panneau contenu (scroll + troncature), jamais plus large que le champ */}
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
            />
            {selected && (
              <button
                type="button"
                onClick={clear}
                title="Effacer la sélection"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">Aucun résultat</li>
            )}
            {filteredOptions.map((opt) => {
              const isActive = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => selectOption(opt)}
                    className={`w-full text-left flex items-start gap-2 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex-1 min-w-0 line-clamp-2 break-words" title={opt.label}>
                      {opt.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchSelect;
