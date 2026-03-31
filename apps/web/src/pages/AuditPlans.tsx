import { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronRight, FileText, CheckCircle, XCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Link } from 'react-router-dom';

interface AuditPlan {
  id: number;
  year: number;
  title: string | null;
  description: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'VALIDATED' | 'REJECTED';
  versionNumber: number;
  _count: { missions: number; versions: number };
  createdAt: string;
}

const statusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800 border-slate-200 dark:border-slate-700', icon: FileText },
  PENDING_APPROVAL: { label: 'En attente DG', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  VALIDATED: { label: 'Validé', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle },
};

export default function AuditPlans() {
  const [plans, setPlans] = useState<AuditPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AuditPlan | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL;
  const [formData, setFormData] = useState({
    year: new Date().getFullYear() + 1,
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/plans`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Failed to fetch plans', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      year: new Date().getFullYear() + 1,
      title: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: AuditPlan) => {
    setEditingPlan(plan);
    setFormData({
      year: plan.year,
      title: plan.title || '',
      description: plan.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) return;
    try {
      const response = await apiFetch(`${API_BASE}/plans/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchPlans();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPlan ? `${API_BASE}/plans/${editingPlan.id}` :  `${API_BASE}/plans`;
      const method = editingPlan ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        setIsModalOpen(false);
        fetchPlans();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Failed to save plan', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Plans d'Audit Annuels</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gérez la planification stratégique des audits par année.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Nouveau Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-300 rounded-xl">
              <Calendar className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Aucun plan d'audit</h3>
              <p className="mt-1 text-sm text-slate-500">Commencez par créer un plan pour la prochaine année.</p>
            </div>
          )}
          
          {plans.map((plan) => {
            const status = statusConfig[plan.status] || statusConfig.DRAFT;
            const StatusIcon = status.icon;
            
            return (
              <div key={plan.id} className="bg-white dark:bg-slate-800 overflow-hidden shadow-sm rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-slate-400" />
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{plan.year}</h3>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">v{plan.versionNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                      <button onClick={() => handleOpenEdit(plan)} className="text-slate-400 hover:text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(plan.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {plan.title || `Plan d'audit annuel ${plan.year}`}
                  </p>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                    {plan.description || "Aucune description fournie."}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center">
                      <BriefcaseIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                      {plan._count?.missions || 0} mission(s)
                    </div>
                    <div className="flex items-center">
                      <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                      {plan._count?.versions || 0} version(s)
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                  <div className="text-sm">
                    <Link to={`/plans/${plan.id}`} className="font-medium text-emerald-600 hover:text-emerald-500 flex items-center justify-between">
                      Ouvrir le plan
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple Modal for Creation/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-slate-100">
                    {editingPlan ? "Modifier le Plan d'Audit" : "Créer un Plan d'Audit"}
                  </h3>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="mt-5 sm:mt-6 space-y-4">
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-slate-700">Année cible *</label>
                  <input
                    type="number"
                    id="year"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700">Titre</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Plan Stratégique 2026"
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                  >
                    {editingPlan ? "Enregistrer" : "Créer le plan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white dark:bg-slate-800 px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
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

// Helper icon component
function BriefcaseIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
