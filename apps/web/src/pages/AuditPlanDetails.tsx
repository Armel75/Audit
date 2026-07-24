import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, FileText, CheckCircle, XCircle, Clock, History, Plus, Save, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface AuditPlan {
  id: number;
  year: number;
  title: string | null;
  description: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'VALIDATED' | 'REJECTED';
  versionNumber: number;
  createdAt: string;
  versions: AuditPlanVersion[];
  statusHistory: AuditPlanStatusHistory[];
  approvedBy?: { firstName: string; lastName: string } | null;
  missions: any[];
}

interface AuditPlanVersion {
  id: number;
  versionNumber: number;
  label: string | null;
  changeSummary: string | null;
  snapshotNote: string | null;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
}

interface AuditPlanStatusHistory {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
  changedAt: string;
  changedBy: { firstName: string; lastName: string };
}

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600', icon: FileText },
  PENDING_APPROVAL: { label: 'En attente DG', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800', icon: Clock },
  VALIDATED: { label: 'Validé', color: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800', icon: XCircle },
};

export default function AuditPlanDetails() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<AuditPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'history'>('details');
  
  // Modals state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<AuditPlanVersion | null>(null);
  
  // Forms state
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [versionForm, setVersionForm] = useState({ label: '', changeSummary: '', snapshotNote: '' });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingHistory, setEditingHistory] = useState<AuditPlanStatusHistory | null>(null);
  const [historyForm, setHistoryForm] = useState({ reason: '' });
  const API_BASE = import.meta.env.VITE_API_URL;
  const { user } = useAuth();
  const canUpdate = user?.permissions?.includes('audit_plan:update');

  useEffect(() => {
    fetchPlanDetails();
  }, [id]);

  const fetchPlanDetails = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/plans/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPlan(data);
      }
    } catch (error) {
      console.error('Failed to fetch plan details', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`${API_BASE}/plans/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusForm),
      });
      
      if (response.ok) {
        setIsStatusModalOpen(false);
        fetchPlanDetails();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const handleCreateOrUpdateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingVersion ? `${API_BASE}/plans/versions/${editingVersion.id}` : `${API_BASE}/plans/${id}/versions`;
      const method = editingVersion ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionForm),
      });
      
      if (response.ok) {
        setIsVersionModalOpen(false);
        fetchPlanDetails();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la sauvegarde de la version');
      }
    } catch (error) {
      console.error('Failed to save version', error);
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette version ?')) return;
    try {
      const response = await apiFetch(`${API_BASE}/plans/versions/${versionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchPlanDetails();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la suppression de la version');
      }
    } catch (error) {
      console.error('Failed to delete version', error);
    }
  };

  const handleCreateOrUpdateHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHistory) return;
    try {
      const response = await apiFetch(`${API_BASE}/plans/history/${editingHistory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyForm),
      });
      
      if (response.ok) {
        setIsHistoryModalOpen(false);
        fetchPlanDetails();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la sauvegarde de l\'historique');
      }
    } catch (error) {
      console.error('Failed to save history', error);
    }
  };

  const handleDeleteHistory = async (historyId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet historique ?')) return;
    try {
      const response = await apiFetch(`${API_BASE}/plans/history/${historyId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchPlanDetails();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la suppression de l\'historique');
      }
    } catch (error) {
      console.error('Failed to delete history', error);
    }
  };

  const handleReopenPlan = async () => {
    if (!window.confirm('⚠️ Êtes-vous sûr de vouloir rouvrir ce plan validé ?\n\nIl repassera en statut "Brouillon" et pourra être modifié à nouveau.')) return;
    try {
      const response = await apiFetch(`${API_BASE}/plans/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DRAFT', reason: 'Réouverture du plan validé' }),
      });
      if (response.ok) {
        fetchPlanDetails();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la réouverture du plan');
      }
    } catch (error) {
      console.error('Failed to reopen plan', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>;
  }

  if (!plan) {
    return <div className="p-8 text-center text-red-500">Plan d'audit introuvable</div>;
  }

  const currentStatus = statusConfig[plan.status] || statusConfig.DRAFT;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-6 lg:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/plans" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md active:scale-[0.97] transition-all duration-150">
            <ArrowLeft className="w-4 h-4" />
            Retour aux plans
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Plan d'Audit {plan.year}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${currentStatus.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {currentStatus.label}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                v{plan.versionNumber}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.title || 'Sans titre'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setStatusForm({ status: plan.status, reason: '' });
              setIsStatusModalOpen(true);
            }}
            disabled={plan.status === 'VALIDATED'}
            title={plan.status === 'VALIDATED' ? 'Impossible de changer le statut d\'un plan validé' : undefined}
            className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
              plan.status === 'VALIDATED'
                ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
          >
            Changer le statut
          </button>

          {plan.status === 'VALIDATED' && canUpdate && (
            <button
              onClick={handleReopenPlan}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 shadow-sm hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Rouvrir le plan
            </button>
          )}
          <button
            onClick={() => {
              setEditingVersion(null);
              setVersionForm({ label: '', changeSummary: '', snapshotNote: '' });
              setIsVersionModalOpen(true);
            }}
            disabled={plan.status === 'VALIDATED'}
            title={plan.status === 'VALIDATED' ? 'Impossible de créer une version sur un plan validé' : undefined}
            className={`inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors ${
              plan.status === 'VALIDATED'
                ? 'bg-emerald-400 dark:bg-emerald-800 cursor-not-allowed opacity-60'
                : 'border-transparent bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Save className="-ml-1 mr-2 h-4 w-4" />
            Créer une version
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`${
              activeTab === 'details'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <FileText className="w-4 h-4" />
            Détails
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`${
              activeTab === 'versions'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <History className="w-4 h-4" />
            Versions ({plan.versions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Clock className="w-4 h-4" />
            Historique des statuts ({plan.statusHistory.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {activeTab === 'details' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Description</h3>
              <p className="mt-1 text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
                {plan.description || 'Aucune description fournie.'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Missions rattachées</h3>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{plan.missions.length}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Date de création</h3>
                <p className="mt-1 text-sm text-slate-900 dark:text-white">{new Date(plan.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {plan.versions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400">Aucune version enregistrée.</div>
            ) : (
              plan.versions.map((version) => (
                <div key={version.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm">
                        v{version.versionNumber}
                      </span>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                        {version.label || `Version ${version.versionNumber}`}
                      </h4>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(version.createdAt).toLocaleString('fr-FR')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingVersion(version);
                            setVersionForm({
                              label: version.label || '',
                              changeSummary: version.changeSummary || '',
                              snapshotNote: version.snapshotNote || ''
                            });
                            setIsVersionModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          Modifier
                        </button>
                        <button 
                          onClick={() => handleDeleteVersion(version.id)}
                          className="inline-flex items-center gap-1 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{version.changeSummary}</p>
                  {version.snapshotNote && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-3 rounded-md border border-slate-100 dark:border-slate-600">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Note:</span> {version.snapshotNote}
                    </p>
                  )}
                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    Créé par {version.createdBy.firstName} {version.createdBy.lastName}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {plan.statusHistory.map((history, historyIdx) => {
                  const statusInfo = statusConfig[history.newStatus as keyof typeof statusConfig] || statusConfig.DRAFT;
                  const Icon = statusInfo.icon;
                  
                  return (
                    <li key={history.id}>
                      <div className="relative pb-8">
                        {historyIdx !== plan.statusHistory.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${statusInfo.color}`}>
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                Statut passé à <span className="font-medium text-slate-900 dark:text-white">{statusInfo.label}</span>
                                {' '}par <span className="font-medium text-slate-900 dark:text-white">{history.changedBy.firstName} {history.changedBy.lastName}</span>
                              </p>
                              {history.reason && (
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 italic">"{history.reason}"</p>
                              )}
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-slate-500 dark:text-slate-400 flex flex-col items-end gap-2">
                              {new Date(history.changedAt).toLocaleString('fr-FR')}
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingHistory(history);
                                    setHistoryForm({ reason: history.reason || '' });
                                    setIsHistoryModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Modifier
                                </button>
                                <button 
                                  onClick={() => handleDeleteHistory(history.id)}
                                  className="inline-flex items-center gap-1 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsStatusModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-white mb-4">Changer le statut du plan</h3>
              <form onSubmit={handleStatusChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nouveau statut</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({...statusForm, status: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white py-2 pl-3 pr-10 text-base focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="DRAFT" className="dark:bg-slate-700 dark:text-white">Brouillon</option>
                    <option value="PENDING_APPROVAL" className="dark:bg-slate-700 dark:text-white">En attente DG</option>
                    <option value="VALIDATED" className="dark:bg-slate-700 dark:text-white">Validé</option>
                    <option value="REJECTED" className="dark:bg-slate-700 dark:text-white">Rejeté</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Raison / Commentaire</label>
                  <textarea
                    rows={3}
                    value={statusForm.reason}
                    onChange={(e) => setStatusForm({...statusForm, reason: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2"
                    placeholder="Ex: Validé suite au comité de direction..."
                    required
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-emerald-700 sm:col-start-2 sm:text-sm"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStatusModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 sm:col-start-1 sm:mt-0 sm:text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Version Modal */}
      {isVersionModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsVersionModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-white mb-4">
                {editingVersion ? "Modifier la version" : "Créer une nouvelle version"}
              </h3>
              {!editingVersion && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Ceci va créer la version v{(plan?.versionNumber ?? 0) + 1} du plan d'audit.
                </p>
              )}
              <form onSubmit={handleCreateOrUpdateVersion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Libellé de la version</label>
                  <input
                    type="text"
                    value={versionForm.label}
                    onChange={(e) => setVersionForm({...versionForm, label: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    placeholder="Ex: Version finale après révision DG"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Résumé des modifications</label>
                  <textarea
                    rows={2}
                    value={versionForm.changeSummary}
                    onChange={(e) => setVersionForm({...versionForm, changeSummary: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                    placeholder="Ex: Ajout de 2 missions sur la cybersécurité"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes (Optionnel)</label>
                  <textarea
                    rows={3}
                    value={versionForm.snapshotNote}
                    onChange={(e) => setVersionForm({...versionForm, snapshotNote: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-emerald-700 sm:col-start-2 sm:text-sm"
                  >
                    {editingVersion ? "Enregistrer" : "Créer la version"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVersionModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 sm:col-start-1 sm:mt-0 sm:text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Edit History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsHistoryModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-white mb-4">Modifier l'historique</h3>
              <form onSubmit={handleCreateOrUpdateHistory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Raison / Commentaire</label>
                  <textarea
                    rows={3}
                    value={historyForm.reason}
                    onChange={(e) => setHistoryForm({...historyForm, reason: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2"
                    placeholder="Ex: Validé suite au comité de direction..."
                    required
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-emerald-700 sm:col-start-2 sm:text-sm"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 sm:col-start-1 sm:mt-0 sm:text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
