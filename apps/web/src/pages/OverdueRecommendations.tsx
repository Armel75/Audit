import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock3, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;

interface Recommendation {
  id: number;
  title: string;
  targetDate: string | null;
  status: string;
  priority?: { name: string };
  department?: { name: string };
  assigneeUser?: { firstName: string; lastName: string };
  assigneeName?: string;
}

const statusLabels: Record<string, string> = {
  OPEN: 'Ouverte',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolue',
  CLOSED: 'Clôturée',
  REJECTED: 'Rejetée',
  PENDING_VALIDATION: 'En validation',
};

export default function OverdueRecommendations() {
  const [recos, setRecos] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date().toISOString();
    apiFetch(`${API_BASE}/recommendations?limit=100`)
      .then(res => res.json())
      .then((data: Recommendation[]) => {
        const overdue = data.filter(r => {
          if (!r.targetDate) return false;
          if (r.status === 'CLOSED' || r.status === 'REJECTED') return false;
          return new Date(r.targetDate) < new Date();
        });
        setRecos(overdue);
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
              <Clock3 className="w-6 h-6 text-amber-500" />
              Recommandations en retard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {recos.length} recommandation(s) dont la date cible est dépassée
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Chargement...</div>
      ) : recos.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Aucune recommandation en retard. Bon suivi !</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4">Titre</th>
                <th className="px-6 py-4">Date cible</th>
                <th className="px-6 py-4">Priorité</th>
                <th className="px-6 py-4">Département</th>
                <th className="px-6 py-4">Assigné</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {recos.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{r.title}</td>
                  <td className="px-6 py-4 text-red-600 font-medium">
                    {r.targetDate ? new Date(r.targetDate).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{r.priority?.name || '-'}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{r.department?.name || '-'}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{r.assigneeUser ? `${r.assigneeUser.firstName} ${r.assigneeUser.lastName}` : r.assigneeName || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/recommendations/${r.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
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
