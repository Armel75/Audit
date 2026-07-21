import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Finding {
  id: number;
  title: string;
  description: string;
  status: 'DRAFT' | 'CONFIRMED' | 'ADDRESSED' | 'REJECTED';
  riskLevel: { name: string; color: string } | null;
  _count: { recos: number };
}

const findingStatusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' },
  SUBMITTED: { label: 'Soumis', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' },
  CONFIRMED: { label: 'Confirmé', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200' },
  ADDRESSED: { label: 'Traité', color: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' },
};

export default function MissionFindings() {
  const { id } = useParams<{ id: string }>();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    apiFetch(`${API_BASE}/missions/${id}`)
      .then(res => res.json())
      .then(data => {
        setFindings(data.findings || []);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-6">Chargement...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-6 lg:px-0">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Constats d'audit</h1>

        <Link
          to={`/missions/${id}/findings/new`}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau constat
        </Link>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl divide-y dark:divide-slate-700">
        {findings.length === 0 ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            Aucun constat.
          </div>
        ) : (
          findings.map(f => {
            const status = findingStatusConfig[f.status] ?? { label: f.status, color: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200' };

            return (
              <div key={f.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div>
                  <p className="font-medium text-indigo-600 dark:text-indigo-400">{f.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {f.description.slice(0, 100)}
                  </p>

                  <div className="flex gap-2 mt-2">
                    {f.riskLevel && (
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${f.riskLevel.color}15`,
                          color: f.riskLevel.color
                        }}
                      >
                        {f.riskLevel.name}
                      </span>
                    )}

                    <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <Link to={`/findings/${f.id}`}>
                  <ChevronRight />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}