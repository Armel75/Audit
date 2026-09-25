import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;

interface ListExportButtonsProps {
  /** Chemin API d'export, ex : /export/risques (le format est ajouté : /pdf, /excel). */
  path: string;
  /** Nom de base du fichier téléchargé, ex : risques. */
  fileName: string;
  /** Variante compacte (petits boutons icône) pour intégration dans des cartes/lignes. */
  compact?: boolean;
}

/**
 * Boutons « Export PDF / Export Excel » pour les listes de consultation du référentiel.
 * Même comportement que les pages Entités auditables / Processus métier.
 */
export default function ListExportButtons({ path, fileName, compact = false }: ListExportButtonsProps) {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(format);
      const res = await apiFetch(`${API_BASE}${path}/${format}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Erreur export ${path}/${format}:`, err);
      alert("Erreur lors de l'export.");
    } finally {
      setExporting(null);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
          title="Exporter en PDF"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-emerald-600 text-emerald-600 text-xs font-medium transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700"
        >
          {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          PDF
        </button>
        <button
          type="button"
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
          title="Exporter en Excel"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-medium transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          Excel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleExport('pdf')}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-slate-700"
      >
        {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        Export PDF
      </button>
      <button
        type="button"
        onClick={() => handleExport('excel')}
        disabled={exporting !== null}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        Export Excel
      </button>
    </div>
  );
}
