import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;

type Target = 'main' | 'dg' | 'missions' | 'pilotage';

interface DashboardExportButtonsProps {
  target: Target;
  period: { year: number; month: number | null };
  scope?: 'all' | 'mine';
}

const BASE_NAMES: Record<Target, string> = {
  main: 'tableau_de_bord',
  dg: 'tableau_bord_strategique',
  missions: 'tableau_bord_missions',
  pilotage: 'pilotage_audit',
};

/**
 * Boutons « Export PDF / Export Excel » des indicateurs du tableau de bord.
 * Reprend la période (et le scope missions) actuellement sélectionnée.
 */
export default function DashboardExportButtons({ target, period, scope }: DashboardExportButtonsProps) {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(format);
      const params = new URLSearchParams({ year: String(period.year) });
      if (period.month !== null) params.set('month', String(period.month + 1));
      if (scope) params.set('scope', scope);

      const res = await apiFetch(`${API_BASE}/dashboard/${target}/export/${format}?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${BASE_NAMES[target]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Erreur export indicateurs (${target}/${format}):`, err);
      alert("Erreur lors de l'export des indicateurs.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={exporting !== null}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700"
      >
        {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        Export Tableau de bord PDF
      </button>
      <button
        type="button"
        onClick={() => handleExport('excel')}
        disabled={exporting !== null}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
        Export Tableau de bord Excel
      </button>
    </div>
  );
}
