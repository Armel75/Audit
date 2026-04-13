import React, { useMemo } from 'react';
import {
  MISSION_FILTER_COLUMNS,
  OPERATORS_BY_TYPE,
  MISSION_STATUS_OPTIONS,
  getMissionStatusLabel,
} from '../../constants/missionFilterColumns';
import type { ColumnType } from '../../constants/missionFilterColumns';

type Props = {
  field: string;
  op: string;
  value: any;
  onChange: (v: any) => void;
  users: { id: number; firstName: string; lastName: string }[];
};

export const MissionValueInput: React.FC<Props> = ({
  field,
  op,
  value,
  onChange,
  users,
}) => {
  const col = useMemo(
    () =>
      MISSION_FILTER_COLUMNS.find((c) => c.field === field) as
        | {
            field: string;
            label: string;
            type: ColumnType;
            enumValues?: { value: string; label: string }[];
          }
        | undefined,
    [field]
  );

  if (!col) return null;

  const opMeta = OPERATORS_BY_TYPE[col.type].find((x) => x.op === op);
  const needsValue = opMeta?.needsValue ?? true;
  if (!needsValue)
    return <div className="text-xs text-slate-500 italic px-2">—</div>;

  // ========== USER SELECT (Chef de mission) ==========
  if (col.type === 'userSelect') {
    const selected = value == null ? '' : String(value);
    return (
      <select
        className="h-8 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') return onChange(undefined);
          onChange(Number(v));
        }}
      >
        <option value="" disabled>
          Choisir…
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.firstName} {u.lastName}
          </option>
        ))}
      </select>
    );
  }

  // ========== ENUM (Statut) ==========
  if (col.type === 'enum') {
    if (field === 'status') {
      if (op === 'in') {
        const v: string[] = Array.isArray(value) ? value.map(String) : [];
        return (
          <select
            multiple
            className="h-24 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
            value={v}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const selected = Array.from(e.target.selectedOptions).map(
                (opt) => opt.value
              );
              onChange(selected);
            }}
          >
            {MISSION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      }

      const selected = value == null ? '' : String(value);
      return (
        <select
          className="h-8 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Choisir…
          </option>
          {MISSION_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }

    // Enum générique
    const enumValues = col.enumValues ?? [];
    if (op === 'in') {
      const v: string[] = Array.isArray(value) ? value : [];
      return (
        <input
          className="h-8 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
          placeholder="ex: VAL1,VAL2"
          value={v.join(',')}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />
      );
    }
    return (
      <select
        className="h-8 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Choisir…
        </option>
        {enumValues.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
    );
  }

  // ========== NUMBER (Année du plan) ==========
  if (col.type === 'number') {
    if (op === 'between') {
      const v: [number | '', number | ''] =
        Array.isArray(value) && value.length >= 2
          ? [value[0] ?? '', value[1] ?? '']
          : ['', ''];
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="h-8 w-24 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
            placeholder="min"
            value={v[0]}
            onChange={(e) =>
              onChange([
                e.target.value === '' ? '' : Number(e.target.value),
                v[1],
              ])
            }
          />
          <span className="text-xs text-slate-500">et</span>
          <input
            type="number"
            className="h-8 w-24 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
            placeholder="max"
            value={v[1]}
            onChange={(e) =>
              onChange([
                v[0],
                e.target.value === '' ? '' : Number(e.target.value),
              ])
            }
          />
        </div>
      );
    }
    return (
      <input
        type="number"
        className="h-8 w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        }
      />
    );
  }

  // ========== DATE ==========
  if (col.type === 'date') {
    if (op === 'between') {
      const v: [string, string] =
        Array.isArray(value) && value.length >= 2
          ? [value[0] ?? '', value[1] ?? '']
          : ['', ''];
      return (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="h-8 w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
            value={v[0]}
            onChange={(e) => onChange([e.target.value, v[1]])}
          />
          <span className="text-xs text-slate-500">et</span>
          <input
            type="date"
            className="h-8 w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
            value={v[1]}
            onChange={(e) => onChange([v[0], e.target.value])}
          />
        </div>
      );
    }
    return (
      <input
        type="date"
        className="h-8 w-40 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // ========== STRING (défaut) ==========
  return (
    <input
      className="h-8 w-56 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
