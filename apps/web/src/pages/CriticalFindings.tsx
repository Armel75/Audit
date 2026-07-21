import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;

interface Finding {
  id: number;
  title: string;
  description: string;
  status: string;
  riskLevel?: { name: string; level?: number };
  mission?: { id: number; title: string };
  severityScore?: number;
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  CONFIRMED: 'Confirmé',
  ADDRESSED: 'Traité',
  REJECTED: 'Rejeté',
};

export default function CriticalFindings() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_BASE}/findings?limit=200`)
      .then(res => res.json())
      .then((data: Finding[]) => {
        // Filtrer par niveau de risque critique (level >= 4 ou nom = critique)
        const critical = (Array.isArray(data) ? data : []).filter(f =>
          (f.riskLevel?.level && f.riskLevel.level >= 4) ||
          f.riskLevel?.name?.toLowerCase() === 'critique'
        );
        setFindings(critical);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-6 lg:px-0 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              Constats critiques
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {findings.length} constat(s) avec un niveau de risque critique
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Chargement...</div>
      ) : findings.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Aucun constat critique ouvert. Bon travail !</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4">Titre</th>
                <th className="px-6 py-4">Mission</th>
                <th className="px-6 py-4">Risque</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {findings.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{f.title}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{f.mission?.title || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                      Critique
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{statusLabels[f.status] || f.status}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/findings/${f.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                      Voir détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
