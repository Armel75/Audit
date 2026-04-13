import React, { useState, useMemo } from 'react';

interface SearchSelectProps {
  label?: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const SearchSelect: React.FC<SearchSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  required = false,
  disabled = false,
}) => {
  const [search, setSearch] = useState('');
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, options]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-slate-900 mb-2">{label}</label>
      )}
      <input
        type="text"
        className="w-full px-4 py-2 mb-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        placeholder={placeholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        disabled={disabled}
        autoComplete="off"
      />
      <select
        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 hover:border-slate-300"
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">Sélectionner...</option>
        {filteredOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

export default SearchSelect;
