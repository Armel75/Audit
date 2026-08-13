import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, SlidersHorizontal, FileText, MessageCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { getMissionStatusMeta } from '../utils/status';
import { Mission } from '@/types/mission';
import { useAuth } from '../context/AuthContext';
import { MissionFilterPanel } from '../components/filters/MissionFilterPanel';
import type { QueryPayload } from '../components/filters/types';

export default function Missions({ mode = 'active' }: { mode?: 'active' | 'archive' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userPermissions = (user?.permissions ?? []).map((p: string) => p.toLowerCase());
  const canCreate = userPermissions.includes('audit_mission:create');
  const canUpdate = userPermissions.includes('audit_mission:update');
  const canDelete = userPermissions.includes('audit_mission:delete');
  const canFilter = userPermissions.includes('audit_mission:filter');
  const canIntake = userPermissions.includes('audit_mission:intake');
  const canTransmit = userPermissions.includes('audit_mission:transmit_preparation');
  const canEnrich = userPermissions.includes('audit_mission:enrich');
  const canFinalize = userPermissions.includes('audit_mission:finalize_preparation');

  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [tabMode, setTabMode] = useState<'preparation' | 'active' | 'archive'>('active');
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  // 🔄 Synchroniser l'onglet : ?tab= (liens du dashboard) > prop mode (sidebar) > défaut
  useEffect(() => {
    if (urlTab === 'preparation' || urlTab === 'active' || urlTab === 'archive') {
      setTabMode(urlTab);
    } else if (mode === 'archive') {
      setTabMode('archive');
    } else if (canIntake) {
      setTabMode('preparation');
    } else {
      setTabMode('active');
    }
  }, [mode, urlTab, canIntake]);

  // FILTER PANEL
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedPayload, setAppliedPayload] = useState<QueryPayload | null>(null);
  const [filteredMissionsData, setFilteredMissionsData] = useState<Mission[] | null>(null);

  // PAGINATION
  const [page, setPage] = useState(1);
  const [transmittingId, setTransmittingId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchMissions();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [page, tabMode, selectedLeaderId]);

  useEffect(() => {
    setPage(1);
  }, [tabMode, selectedLeaderId]);

  useEffect(() => {
    if (!canFilter) return;
    apiFetch(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setLeaders(data); })
      .catch(console.error);
  }, [canFilter]);

  const enrichmentComplete = (m: Mission) => {
    return !!m.scopeDescription?.trim() && !!m.methodology?.trim() && !!m.plan?.id && !!m.auditType && !!m.leader?.id;
  };

  const fetchMissions = async () => {
    // Annuler toute requête précédente encore en vol
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);

      const typeQuery = tabMode === 'archive' ? 'archive' : tabMode === 'preparation' ? 'preparation' : 'active';

      let url = `${API_BASE}/missions?type=${typeQuery}&page=${page}&limit=${limit}`;
      if (selectedLeaderId) {
        url += `&leaderId=${selectedLeaderId}`;
      }

      const res = await apiFetch(url, { signal: controller.signal });

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

    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Requête annulée, ne rien faire
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

  // Compter les missions en préparation (toutes, pas uniquement celles filtrées)
  const preparationCount = missions.filter(m =>
    m.status === 'PLANNED' && (!m.preparation || ['INTAKE', 'ENRICHMENT', 'REVIEW'].includes(m.preparation?.phase))
  ).length;

  // Filtrer par phase de préparation
  const tabFilteredMissions = displayMissions.filter(m => {
    if (tabMode === 'preparation') {
      return m.status === 'PLANNED' && (m.preparation?.phase === 'INTAKE' || m.preparation?.phase === 'ENRICHMENT' || m.preparation?.phase === 'REVIEW' || !m.preparation);
    }
    if (tabMode === 'active') {
      // Exclure les missions en préparation (PLANNED)
      if (m.status === 'PLANNED') {
        return false;
      }
      return m.status !== 'CLOSED';
    }
    return true; // archive: tout
  });

  const filteredMissions = tabFilteredMissions.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase())
  );

  // 3. render
  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-white">Missions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gestion et suivi des missions d’audit
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 self-start mt-1">
            <button
              onClick={() => { setTabMode('preparation'); setPage(1); }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                tabMode === 'preparation'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Missions en cours de saisie ou d'enrichissement"
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="flex items-center gap-1.5">
                  📝 <span>En préparation</span>
                  {preparationCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold leading-none text-white bg-emerald-500 rounded-full">
                      {preparationCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-normal opacity-70">Saisie ou enrichissement en attente</span>
              </span>
            </button>
            <button
              onClick={() => { setTabMode('active'); setPage(1); }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                tabMode === 'active'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Missions lancées et en cours d'exécution"
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="flex items-center gap-1.5">🚀 <span>En cours</span></span>
                <span className="text-[10px] font-normal opacity-70">Missions actuellement en exécution</span>
              </span>
            </button>
            <button
              onClick={() => { setTabMode('archive'); setPage(1); }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                tabMode === 'archive'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Missions clôturées et archivées"
            >
              <span className="flex flex-col items-center leading-tight">
                <span className="flex items-center gap-1.5">📦 <span>Clôturées</span></span>
                <span className="text-[10px] font-normal opacity-70">Missions terminées et archivées</span>
              </span>
            </button>
          </div>
        </div>

        {canCreate && canIntake && (
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
              className="outline-none text-sm bg-transparent text-slate-800 dark:text-white dark:bg-slate-800 min-w-[180px]"
            >
              <option value="" className="dark:bg-slate-800 dark:text-white">Tous les pilotes</option>
              {leaders.map(l => (
                <option key={l.id} value={l.id} className="dark:bg-slate-800 dark:text-white">
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

          <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wide">
              <tr>
                <th className="p-4">Titre</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Chef</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right min-w-[280px]">Actions</th>
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
                    onClick={() => navigate(tabMode === 'preparation' ? `/missions/${m.id}/edit` : `/missions/${m.id}`)}
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
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusMeta.class}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-right min-w-[280px]">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition flex-wrap">

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/missions/${m.id}`);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-200"
                        >
                          Voir détails mission
                        </button>

                        {m.status !== 'CANCELLED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/missions/${m.id}/protocol`);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition text-emerald-700 dark:text-emerald-300"
                          title="Consulter le protocole de mission"
                        >
                          <FileText className="w-3.5 h-3.5 inline-block align-middle" />
                          <span className="ml-1">Protocole</span>
                        </button>
                        )}

                        {m.status !== 'CLOSED' && m.status !== 'CANCELLED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/missions/${m.id}?tab=hierarchy-comments`);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition text-amber-700 dark:text-amber-300"
                          title="Commenter la mission"
                        >
                          <MessageCircle className="w-3.5 h-3.5 inline-block align-middle" />
                          <span className="ml-1">Commenter la mission</span>
                        </button>
                        )}

                        {((canUpdate || canEnrich) || (canIntake && m.status === 'PLANNED')) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (m.status === 'PLANNED') {
                              navigate(`/missions/${m.id}/edit`);
                            } else if (canEnrich) {
                              // 🩹 Correction d'urgence : enrichisseur peut éditer le cadrage même après PLANNED
                              navigate(`/missions/${m.id}/edit`);
                            }
                          }}
                          disabled={
                            m.status !== 'PLANNED' && !canEnrich
                            || (canIntake && !canEnrich && m.preparation?.phase !== 'INTAKE' && m.status === 'PLANNED')
                          }
                          title={
                            m.status !== 'PLANNED' && canEnrich ? 'Corriger le cadrage (mission déjà lancée)' :
                            m.status !== 'PLANNED' ? 'Seules les missions planifiées sont modifiables' :
                            canIntake && !canEnrich && m.preparation?.phase !== 'INTAKE' ? 'Mission déjà transmise' :
                            'Compléter les informations'
                          }
                          className={`px-3 py-1.5 rounded-lg border transition text-slate-700 dark:text-slate-200 ${
                            m.status === 'PLANNED' || canEnrich
                              ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {m.status !== 'PLANNED' && canEnrich ? '⚠️ Corriger le cadrage' :
                           m.preparation?.phase && ['INTAKE', 'ENRICHMENT'].includes(m.preparation.phase) ? 'Compléter les informations' : 'Modifier mission'}
                        </button>
                        )}

                        {tabMode === 'preparation' && m.preparation?.phase === 'INTAKE' && canTransmit && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm('Transmettre cette mission au service audit ?')) return;
                            setTransmittingId(m.id);
                            try {
                              const res = await apiFetch(`${API_BASE}/missions/${m.id}/preparation`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phase: 'ENRICHMENT', reason: 'Saisie initiale terminée' }),
                              });
                              const data = res.ok ? null : await res.json().catch(() => null);
                              if (res.ok) {
                                fetchMissions();
                              } else {
                                alert(data?.error || 'Erreur lors de la transmission');
                              }
                            } catch (err) {
                              alert('Erreur réseau lors de la transmission');
                              console.error(err);
                            } finally {
                              setTransmittingId(null);
                            }
                          }}
                          disabled={transmittingId === m.id}
                          className={`px-3 py-1.5 rounded-lg border transition text-sm font-semibold ${transmittingId === m.id
                            ? 'border-indigo-100 dark:border-indigo-900 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-400 dark:text-indigo-500 cursor-wait'
                            : 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {transmittingId === m.id ? 'Transmission...' : 'Transmettre au service audit'}
                        </button>
                        )}

                        {tabMode === 'preparation' && m.preparation?.phase === 'ENRICHMENT' && canEnrich && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm('Soumettre cette mission en phase de revue pour finaliser le cadrage ?')) return;
                            setTransmittingId(m.id);
                            try {
                              const res = await apiFetch(`${API_BASE}/missions/${m.id}/preparation`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phase: 'REVIEW', reason: 'Enrichissement terminé' }),
                              });
                              const data = res.ok ? null : await res.json().catch(() => null);
                              if (res.ok) {
                                fetchMissions();
                              } else {
                                alert(data?.error || 'Erreur');
                              }
                            } catch (err) {
                              alert('Erreur réseau');
                              console.error(err);
                            } finally {
                              setTransmittingId(null);
                            }
                          }}
                          disabled={transmittingId === m.id || !enrichmentComplete(m)}
                          title={!enrichmentComplete(m) ? 'Complétez d\'abord le cadrage (scope, méthodologie, plan, type, chef de mission)' : ''}
                          className={`px-3 py-1.5 rounded-lg border transition text-sm font-semibold ${transmittingId === m.id || !enrichmentComplete(m)
                            ? 'border-violet-100 dark:border-violet-900 bg-violet-100 dark:bg-violet-900/20 text-violet-400 dark:text-violet-500 cursor-not-allowed'
                            : 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-950 text-violet-700 dark:text-violet-300'
                          }`}
                        >
                          {transmittingId === m.id ? 'Envoi...' : 'Passer à la revue'}
                        </button>
                        )}

                        {tabMode === 'preparation' && m.status === 'PLANNED' && m.preparation?.phase === 'REVIEW' && canFinalize && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm('Publier cette mission ? Le Chef de mission pourra alors démarrer l\'exécution.')) return;
                            setTransmittingId(m.id);
                            try {
                              const res = await apiFetch(`${API_BASE}/missions/${m.id}/preparation/finalize`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reason: '' }),
                              });
                              const data = res.ok ? null : await res.json().catch(() => null);
                              if (res.ok) {
                                fetchMissions();
                              } else {
                                alert(data?.error || 'Erreur');
                              }
                            } catch (err) {
                              alert('Erreur réseau');
                              console.error(err);
                            } finally {
                              setTransmittingId(null);
                            }
                          }}
                          disabled={transmittingId === m.id}
                          className={`px-3 py-1.5 rounded-lg border transition text-sm font-semibold ${transmittingId === m.id
                            ? 'border-emerald-100 dark:border-emerald-900 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-400 dark:text-emerald-500 cursor-wait'
                            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {transmittingId === m.id ? 'Publication...' : 'Publier la mission'}
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
          </div>

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