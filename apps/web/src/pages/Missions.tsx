import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, SlidersHorizontal } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { getMissionStatusMeta } from '../utils/status';
import { Mission } from '@/types/mission';
import { useAuth } from '../context/AuthContext';
import { MissionFilterPanel } from '../components/filters/MissionFilterPanel';
import type { QueryPayload } from '../components/filters/types';

export default function Missions({ mode = 'active' }: { mode?: 'active' | 'archive' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = user?.permissions?.includes('audit_mission:create') ?? false;
  const canUpdate = user?.permissions?.includes('audit_mission:update') ?? false;
  const canDelete = user?.permissions?.includes('audit_mission:delete') ?? false;
  const canFilter = user?.permissions?.includes('audit_mission:filter') ?? false;

  //const [missions, setMissions] = useState<any[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');

  // FILTER PANEL
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedPayload, setAppliedPayload] = useState<QueryPayload | null>(null);
  const [filteredMissionsData, setFilteredMissionsData] = useState<Mission[] | null>(null);

  // PAGINATION
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchMissions();
  }, [page, mode, selectedLeaderId]);

  useEffect(() => {
    setPage(1);
  }, [mode, selectedLeaderId]);

  useEffect(() => {
    if (!canFilter) return;
    apiFetch(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setLeaders(data); })
      .catch(console.error);
  }, [canFilter]);

  const fetchMissions = async () => {
    try {
      setLoading(true);

      //const res = await apiFetch(`${API_BASE}/missions?page=${page}&limit=${limit}`);
      const typeQuery = mode === 'archive' ? 'archive' : 'active';

      let url = `${API_BASE}/missions?type=${typeQuery}&page=${page}&limit=${limit}`;
      if (selectedLeaderId) {
        url += `&leaderId=${selectedLeaderId}`;
      }

      const res = await apiFetch(url);

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

  const displayMissions = filteredMissionsData ?? missions;

  const filteredMissions = displayMissions.filter(m =>
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

        {canCreate && (
          <button
            onClick={() => navigate('/missions/new')}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            <Plus size={18} />
            Nouvelle mission
          </button>
        )}
      </div>

      {/* SEARCH + FILTER */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une mission..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full outline-none text-sm bg-transparent text-slate-800 dark:text-white placeholder:text-slate-400"
          />
        </div>

        {canFilter && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-sm">
            <Filter size={18} className="text-slate-400" />
            <select
              value={selectedLeaderId}
              onChange={(e) => setSelectedLeaderId(e.target.value)}
              className="outline-none text-sm bg-transparent text-slate-800 dark:text-white min-w-[180px]"
            >
              <option value="">Tous les pilotes</option>
              {leaders.map(l => (
                <option key={l.id} value={l.id}>
                  {l.firstName} {l.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtres avancés + Export */}
        {canFilter && (
        <button
          onClick={() => setFilterOpen(true)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-sm border transition ${
            appliedPayload
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <SlidersHorizontal size={18} />
          <span className="text-sm font-medium">
            {appliedPayload ? `Filtres (${appliedPayload.filters.length})` : 'Filtres & Export'}
          </span>
        </button>
        )}
      </div>

      {/* Bandeau filtre actif */}
      {canFilter && appliedPayload && filteredMissionsData && (
        <div className="mb-4 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
          <SlidersHorizontal size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-emerald-700 dark:text-emerald-300">
            {appliedPayload.filters.length} filtre(s) appliqué(s) — {filteredMissionsData.length} résultat(s)
          </span>
          <button
            onClick={() => {
              setAppliedPayload(null);
              setFilteredMissionsData(null);
            }}
            className="ml-auto text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Effacer les filtres
          </button>
        </div>
      )}

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

                        {canUpdate && (
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
                        )}

                        {canDelete && (
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
                        )}

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PAGINATION (masquée quand filtre actif) */}
          {!filteredMissionsData && (
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
          )}

        </div>
      )}

      {/* FILTER PANEL */}
      <MissionFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={(payload, data) => {
          setAppliedPayload(payload);
          setFilteredMissionsData(data as Mission[]);
          setFilterOpen(false);
        }}
        onReset={() => {
          setAppliedPayload(null);
          setFilteredMissionsData(null);
        }}
        currentData={filteredMissions}
        appliedPayload={appliedPayload}
        mode={mode}
      />
    </div>
  );
}