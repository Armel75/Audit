import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, AlertCircle } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'VALIDATED' | 'CLOSED';
  leader: { firstName: string; lastName: string; email: string };
  _count: { findings: number; documents: number };
}

const statusConfig = {
  PLANNED: { label: 'Planifiée', color: 'bg-slate-100 text-slate-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  IN_REVIEW: { label: 'En revue', color: 'bg-purple-100 text-purple-800' },
  VALIDATED: { label: 'Validée', color: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
};

export default function Missions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch('/api/missions', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement des missions');
        return res.json();
      })
      .then(data => {
        setMissions(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="mt-2 text-sm text-slate-700">
            Liste des missions d'audit du plan annuel en cours.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Nouvelle Mission
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 leading-5 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
            placeholder="Rechercher une mission..."
          />
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
          <Filter className="-ml-1 mr-2 h-5 w-5 text-slate-400" />
          Filtres
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Titre</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Chef de mission</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Constats</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Statut</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  Chargement des missions...
                </td>
              </tr>
            ) : missions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                  Aucune mission trouvée.
                </td>
              </tr>
            ) : (
              missions.map((mission) => {
                const conf = statusConfig[mission.status] || statusConfig.PLANNED;
                return (
                  <tr key={mission.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                      {mission.title}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {mission.leader.firstName} {mission.leader.lastName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                      {mission._count.findings} constat(s)
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${conf.color}`}>
                        {conf.label}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <Link to={`/missions/${mission.id}`} className="text-emerald-600 hover:text-emerald-900">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
