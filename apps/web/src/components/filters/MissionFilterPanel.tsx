import React, { useState, useEffect } from 'react';
import { X, Plus, FileSpreadsheet, FileText, RotateCcw, Play } from 'lucide-react';
import { MissionFilterRow } from './MissionFilterRow';
import { serializeToPayload } from './serialize';
import type { FilterRowState, Logic, QueryPayload } from './types';
import { MISSION_FILTER_COLUMNS, OPERATORS_BY_TYPE } from '../../constants/missionFilterColumns';
import { apiFetch } from '../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;
const MAX_ROWS = 10;

function newRow(): FilterRowState {
  const defaultCol = MISSION_FILTER_COLUMNS[0];
  return {
    id: crypto.randomUUID(),
    field: defaultCol.field,
    op: OPERATORS_BY_TYPE[defaultCol.type][0].op,
    value: undefined,
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Remonte le payload appliqué + les données filtrées */
  onApply: (payload: QueryPayload, data: any[]) => void;
  onReset: () => void;
  /** Données filtrées actuellement affichées (pour activer export) */
  currentData: any[];
  /** Payload appliqué actif */
  appliedPayload: QueryPayload | null;
  /** Mode actif ou archive */
  mode: 'active' | 'archive';
};

export const MissionFilterPanel: React.FC<Props> = ({
  open,
  onClose,
  onApply,
  onReset,
  currentData,
  appliedPayload,
  mode,
}) => {
  const [rows, setRows] = useState<FilterRowState[]>([newRow()]);
  const [logic, setLogic] = useState<Logic>('AND');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);

  // Charger la liste des utilisateurs (pour le filtre chef de mission)
  useEffect(() => {
    if (!open) return;
    apiFetch(`${API_BASE}/users`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
  }, [open]);

  const updateRow = (idx: number, next: FilterRowState) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? next : r)));
  };

  const removeRow = (idx: number) => {
    setRows((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated.length === 0 ? [newRow()] : updated;
    });
  };

  const addRow = () => {
    if (rows.length < MAX_ROWS) setRows((prev) => [...prev, newRow()]);
  };

  const handleReset = () => {
    setRows([newRow()]);
    setLogic('AND');
    onReset();
  };

  const handleApply = async () => {
    const payload = serializeToPayload(rows, logic);
    if (payload.filters.length === 0) {
      onReset();
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch(`${API_BASE}/missions/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, mode }),
      });
      const data = await res.json();
      const missions = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      onApply(payload, missions);
    } catch (err) {
      console.error('Erreur filtre missions:', err);
    } finally {
      setLoading(false);
    }
  };

  const canExport = appliedPayload && appliedPayload.filters.length > 0 && currentData.length > 0;

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!appliedPayload) return;
    try {
      setExporting(format);
      const res = await apiFetch(`${API_BASE}/missions/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appliedPayload, mode }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Erreur export ${format.toUpperCase()}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `missions_export.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Erreur export ${format}:`, err);
      alert(`Erreur lors de l'export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[720px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Filtrer les missions
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Logic selector */}
          {rows.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Combiner les critères avec
              </span>
              <select
                value={logic}
                onChange={(e) => setLogic(e.target.value as Logic)}
                className="h-8 w-20 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm font-medium"
              >
                <option value="AND">ET</option>
                <option value="OR">OU</option>
              </select>
            </div>
          )}

          {/* Filter rows */}
          {rows.map((row, idx) => (
            <MissionFilterRow
              key={row.id}
              row={row}
              onChange={(next) => updateRow(idx, next)}
              onRemove={() => removeRow(idx)}
              users={users}
            />
          ))}

          {/* Add row */}
          {rows.length < MAX_ROWS && (
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              Ajouter un critère
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 space-y-3">
          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              disabled={!canExport || exporting === 'pdf'}
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              {exporting === 'pdf' ? 'Export…' : 'Exporter PDF'}
            </button>
            <button
              disabled={!canExport || exporting === 'excel'}
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === 'excel' ? 'Export…' : 'Exporter Excel'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow hover:shadow-md transition disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {loading ? 'Application…' : 'Appliquer les filtres'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
