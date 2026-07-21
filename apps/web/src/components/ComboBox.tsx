import React, { useState, useRef, useEffect } from 'react';

interface Option {
  label: string;
  value: string;
}

interface ComboBoxProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const ComboBox: React.FC<ComboBoxProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  required = false,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selectedLabel = options.find(opt => opt.value === value)?.label || '';

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">{label}</label>
      )}
      <button
        type="button"
        className={`w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium text-left transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 hover:border-slate-300 dark:hover:border-slate-500 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        tabIndex={0}
      >
        {selectedLabel || 'Sélectionner...'}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg dark:shadow-slate-900/50">
          <input
            type="text"
            className="w-full px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-transparent dark:text-slate-200 focus:outline-none"
            placeholder={placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <ul className="max-h-56 overflow-auto" role="listbox">
            {filtered.length === 0 && (
              <li className="px-4 py-2 text-slate-400 dark:text-slate-500">Aucun résultat</li>
            )}
            {filtered.map(opt => (
              <li
                key={opt.value}
                className={`px-4 py-2 cursor-pointer dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 ${opt.value === value ? 'bg-emerald-100 dark:bg-emerald-900/60 font-semibold' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setSearch('');
                }}
                role="option"
                aria-selected={opt.value === value}
                tabIndex={-1}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {required && !value && (
        <span className="text-xs text-red-500">Ce champ est requis</span>
      )}
    </div>
  );
};

export default ComboBox;
