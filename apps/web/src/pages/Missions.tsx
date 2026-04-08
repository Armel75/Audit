import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { getMissionStatusMeta } from '../utils/status';
import { Mission } from '@/types/mission';

export default function Missions({ mode = 'active' }: { mode?: 'active' | 'archive' }) {
  const navigate = useNavigate();

  //const [missions, setMissions] = useState<any[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // PAGINATION
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchMissions();
  }, [page, mode]);

  useEffect(() => {
    setPage(1);
  }, [mode]);

  const fetchMissions = async () => {
    try {
      setLoading(true);

      //const res = await apiFetch(`${API_BASE}/missions?page=${page}&limit=${limit}`);
      const typeQuery = mode === 'archive' ? 'archive' : 'active';

      const res = await apiFetch(
        `${API_BASE}/missions?type=${typeQuery}&page=${page}&limit=${limit}`
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setMissions(data);
        setTotalPages(1);
      } else if (Array.isArray(data.data)) {
        setMissions(data.data);
        setTotalPages(data.totalPages || 1);
      } else {
        setMissions([]);
      }

    } catch (err) {
      setError('Erreur lors du chargement des missions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const mission = missions.find(m => m.id === Number(id));
    
    // Vérifier que seules les missions "PLANNED" peuvent être supprimées
    if (mission && mission.status !== 'PLANNED') {
      alert('Seules les missions "Planifiées" peuvent être supprimées');
      return;
    }

    if (!confirm('Supprimer cette mission ?')) return;

    try {
      const res = await apiFetch(`${API_BASE}/missions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error();

      fetchMissions();
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const filteredMissions = missions.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase())
  );

  // 3. render
  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-white">
            {mode === 'archive' ? 'Archives des missions' : 'Missions'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestion et suivi des missions d’audit
          </p>
        </div>

        <button
          onClick={() => navigate('/missions/new')}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          <Plus size={18} />
          Nouvelle mission
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-6">
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une mission..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-sm bg-transparent text-slate-800 dark:text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="text-slate-500 dark:text-slate-400 animate-pulse">Chargement...</div>
      ) : filteredMissions.length === 0 ? (
        <div className="text-slate-400 text-sm">Aucune mission</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">

          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wide">
              <tr>
                <th className="p-4">Titre</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Chef</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMissions.map((m) => {
                const statusMeta = getMissionStatusMeta(m.status) || {
                  label: m.status,
                  class: 'bg-gray-100 text-gray-800'
                };

                return (
                  <tr
                    key={m.id}
                    className="border-t hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer group"
                    onClick={() => navigate(`/missions/${m.id}`)}
                  >
                    <td className="p-4 font-medium text-slate-800 dark:text-white">
                      {m.title}
                    </td>

                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {m.plan ? `${m.plan.year}` : '-'}
                    </td>

                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {m.leader
                        ? `${m.leader.firstName} ${m.leader.lastName}`
                        : '-'}
                    </td>

                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {m.startDate
                        ? new Date(m.startDate).toLocaleDateString()
                        : '-'} →{' '}
                      {m.endDate
                        ? new Date(m.endDate).toLocaleDateString()
                        : '-'}
                    </td>

                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusMeta.class}`}>
                        {statusMeta.label}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition">

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/missions/${m.id}`);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-200"
                        >
                          Voir détails mission
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.status === 'PLANNED') {
                              navigate(`/missions/${m.id}/edit`);
                            }
                          }}
                          disabled={m.status !== 'PLANNED'}
                          title={m.status !== 'PLANNED' ? 'Seules les missions "Planifiées" peuvent être modifiées' : 'Modifier cette mission'}
                          className={`px-3 py-1.5 rounded-lg border transition text-slate-700 dark:text-slate-200 ${
                            m.status === 'PLANNED'
                              ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          Modifier mission
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.status === 'PLANNED') {
                              handleDelete(String(m.id));
                            }
                          }}
                          disabled={m.status !== 'PLANNED'}
                          title={m.status !== 'PLANNED' ? 'Seules les missions "Planifiées" peuvent être supprimées' : 'Supprimer cette mission'}
                          className={`px-3 py-1.5 rounded-lg border transition ${
                            m.status === 'PLANNED'
                              ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer'
                              : 'border-red-200 dark:border-red-800 text-red-400 dark:text-red-600 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          Supprimer mission
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex justify-between items-center p-5 border-t bg-slate-50 dark:bg-slate-900">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-200"
            >
              Précédent
            </button>

            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page <span className="font-medium text-slate-700 dark:text-white">{page}</span> / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-200"
            >
              Suivant
            </button>
          </div>

        </div>
      )}
    </div>
  );
}