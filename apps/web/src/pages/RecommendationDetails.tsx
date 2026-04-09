import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, MessageSquare, Paperclip, User, Calendar, ShieldAlert, CheckCircle, XCircle, Upload, Plus, Target, Briefcase, Play, CheckSquare, FileText, Clock } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { getRecommendationStatusMeta, RecommendationStatus } from '../utils/status';

interface FollowUp {
  id: number;
  date: string;
  implementedPercent: number;
  comments: string;
  author: { firstName: string; lastName: string };
}

interface Recommendation {
  id: number;
  title: string;
  actionPlan: string;
  status: RecommendationStatus;
  targetDate: string | null;
  implementedPercent: number;
  priority: { name: string; color: string } | null;
  department: { name: string } | null;
  assigneeName: string | null;
  assigneeUser?: { firstName: string; lastName: string } | null;
  assigneeGlpiUser?: { fullName: string | null; email: string | null } | null;
  finding: {
    id: number;
    title: string;
    description: string;
    process: string | null;
    impact: string | null;
    missionId: number;
    mission: { id: number; title: string };
  };
  author: { firstName: string; lastName: string } | null;
  validator: { firstName: string; lastName: string } | null;
  comments: Array<{
    id: number;
    content: string;
    createdAt: string;
    author: { firstName: string; lastName: string };
  }>;
  statusHistory: Array<{
    id: number;
    previousStatus: string | null;
    newStatus: string;
    reason: string | null;
    changedAt: string;
    changedBy: { firstName: string; lastName: string } | null;
  }>;
  documents: Array<{
    id: number;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  evidences: Array<{
    id: number;
    title: string;
    description: string | null;
    evidenceType: string;
    source: string | null;
  }>;
  ticketLinks: Array<{
    id: number;
    ticket: {
      id: number;
      title: string;
      status: string;
      ticketNumber: string | null;
    };
    linkType: string;
  }>;

    approvals: Array<{
    id: number;
    decision: string;
    comments: string | null;
    createdAt: string;
    approver: { firstName: string; lastName: string };
  }>;

  followUps: FollowUp[];
  createdAt: string;
  updatedAt: string;
}

// const recoStatusConfig = {
//   PENDING: { label: 'En attente', color: 'bg-slate-100 text-slate-800' },
//   IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
//   IMPLEMENTED: { label: 'Mise en œuvre', color: 'bg-emerald-100 text-emerald-800' },
//   VERIFIED: { label: 'Vérifiée', color: 'bg-purple-100 text-purple-800' },
//   CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
// };

const recoStatusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  OPEN: { label: 'Ouverte', color: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-indigo-100 text-indigo-800' },
  IMPLEMENTED: { label: 'Implémentée', color: 'bg-purple-100 text-purple-800' },
  VALIDATED: { label: 'Validée', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejetée', color: 'bg-red-100 text-red-800' },
  CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
};


export default function RecommendationDetails() {
  const { id } = useParams<{ id: string }>();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRecommendationResponsibles = (recommendation: any): string[] => {
    if (!recommendation) return [];
    
    const values: string[] = [];
    const pushValue = (value: any) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach(pushValue);
        return;
      }
      if (typeof value === 'object') {
        if (value.firstName && value.lastName) {
          values.push(`${value.firstName} ${value.lastName}`.trim());
          return;
        }
        if (value.fullName || value.email) {
          values.push((value.fullName || value.email || '').trim());
          return;
        }
        if (value.name) {
          values.push(String(value.name).trim());
          return;
        }
      }
      if (typeof value === 'string' && value.trim()) {
        values.push(...value.split(/[;,]+/).map((item) => item.trim()).filter(Boolean));
      }
    };

    pushValue(recommendation.assignees ?? recommendation.assigneeUsers ?? recommendation.assigneeUser);
    pushValue(recommendation.assigneeGlpiUsers ?? recommendation.assigneeGlpiUser);
    pushValue(recommendation.assigneeNames ?? recommendation.assigneeName);

    return Array.from(new Set(values.filter(Boolean)));
  };

  // Follow-up form state
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpPercent, setFollowUpPercent] = useState<number>(0);
  const [followUpComments, setFollowUpComments] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketDropdownOpen, setTicketDropdownOpen] = useState(false);
  const ticketComboRef = useRef<HTMLDivElement>(null);
  const [linkType, setLinkType] = useState('IMPLEMENTATION');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<any[]>([]);
  const API_BASE = import.meta.env.VITE_API_URL;

  const fetchRecommendation = () => {
    apiFetch(`${API_BASE}/recommendations/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement de la recommandation');
        return res.json();
      })
      .then(data => {
        setRecommendation(data);
        setFollowUpPercent(data.implementedPercent || 0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecommendation();
    
    apiFetch(`${API_BASE}/glpi/tickets`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvailableTickets(data);
      })
      .catch(console.error);
  }, [id]);

  // Fermer le combobox ticket au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ticketComboRef.current && !ticketComboRef.current.contains(e.target as Node)) {
        setTicketDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await apiFetch(`${API_BASE}/recommendations/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });

      if (!res.ok) throw new Error('Erreur lors de l\'ajout du commentaire');
      
      setNewComment('');
      fetchRecommendation();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (newStatus: RecommendationStatus) => {
    if (!confirm(`Voulez-vous vraiment passer cette recommandation au statut ${newStatus} ?`)) return;

    const reason = window.prompt('Motif du changement de statut :', '');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Le motif du changement de statut est obligatoire.');
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/recommendations/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, reason: reason.trim() })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erreur lors de la mise à jour du statut');
      }
      fetchRecommendation();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recommendationId', id!);

    try {
      const res = await apiFetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Erreur lors de l\'upload du document');
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRecommendation();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId: number, fileName: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/documents/download/${docId}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erreur téléchargement');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFollowUp(true);

    try {
      const res = await apiFetch(`${API_BASE}/recommendations/${id}/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          progressPercent: followUpPercent,
          comment: followUpComments,
        })
      });

      if (!res.ok) throw new Error('Erreur lors de l\'ajout du suivi');
      
      setIsFollowUpModalOpen(false);
      setFollowUpComments('');
      fetchRecommendation();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleLinkTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId) return;
    setSubmittingTicket(true);

    try {
      const res = await apiFetch(`${API_BASE}/glpi/tickets/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: Number(id),
          ticketId: Number(ticketId),
          linkType
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la liaison du ticket');
      }

      setIsTicketModalOpen(false);
      setTicketId('');
      fetchRecommendation();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleUnlinkTicket = async (linkId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir délier ce ticket ?')) return;

    try {
      const res = await apiFetch(`${API_BASE}/recommendations/${id}/tickets/${linkId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression de la liaison');
      }

      fetchRecommendation();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement des détails de la recommandation...</div>;
  }

  if (error || !recommendation) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <h3 className="text-sm font-medium text-red-800">{error || 'Recommandation introuvable'}</h3>
          </div>
        </div>
        <Link to="/missions" className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux missions
        </Link>
      </div>
    );
  }

  const conf = getRecommendationStatusMeta(recommendation.status);
  const missionId = recommendation.finding.mission?.id ?? recommendation.finding.missionId;
  const missionTitle = recommendation.finding.mission?.title ?? `Mission ${missionId}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Link
          to={`/missions/${missionId}`}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour aux details de la mission</span>
        </Link>
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{recommendation.title}</h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-slate-500">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                Auteur : {recommendation.author ? `${recommendation.author.firstName} ${recommendation.author.lastName}` : 'Inconnu'}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Créé le {new Date(recommendation.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
            <div className="flex space-x-2">
              {recommendation.priority && (
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                  style={{ 
                    backgroundColor: `${recommendation.priority.color}15`, 
                    color: recommendation.priority.color,
                    borderColor: `${recommendation.priority.color}30`
                  }}
                >
                  <ShieldAlert className="w-4 h-4 mr-1" />
                  Priorité {recommendation.priority.name}
                </span>
              )}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${conf.class}`}>
                {conf.label}
              </span>
            </div>
            
            {/* Action buttons based on status */}
            <div className="flex space-x-2 mt-2">
              {recommendation.status === 'DRAFT' && (
                <button onClick={() => handleStatusChange('OPEN')} className="text-xs inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                  <Play className="w-3 h-3 mr-1" /> Ouvrir
                </button>
              )}
              {recommendation.status === 'OPEN' && (
                <button onClick={() => handleStatusChange('IN_PROGRESS')} className="text-xs inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
                  <Play className="w-3 h-3 mr-1" /> Démarrer
                </button>
              )}
              {recommendation.status === 'IN_PROGRESS' && (
                <button onClick={() => handleStatusChange('IMPLEMENTED')} className="text-xs inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">
                  <CheckSquare className="w-3 h-3 mr-1" /> Marquer comme mis en œuvre
                </button>
              )}
              {recommendation.status === 'IMPLEMENTED' && (
                (() => {
                  const hasApproved = recommendation.approvals?.some(a => a.decision === 'APPROVED');
                  const hasPending = recommendation.approvals?.some(a => a.decision === 'PENDING');
                  if (hasApproved) {
                    return (
                      <button onClick={() => handleStatusChange('VALIDATED')} className="text-xs inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">
                        <CheckCircle className="w-3 h-3 mr-1" /> Valider
                      </button>
                    );
                  }
                  if (hasPending) {
                    return (
                      <span className="text-xs inline-flex items-center px-2 py-1 bg-amber-50 text-amber-600 rounded border border-amber-200">
                        <Clock className="w-3 h-3 mr-1" /> Validation en attente d'approbation
                      </span>
                    );
                  }
                  return (
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiFetch(`${API_BASE}/approvals`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              approvalType: 'RECOMMENDATION_APPROVAL',
                              recommendationId: recommendation.id
                            })
                          });
                          if (!res.ok) {
                            const data = await res.json();
                            throw new Error(data.error || 'Erreur');
                          }
                          fetchRecommendation();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="text-xs inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Demander validation
                    </button>
                  );
                })()
              )}
              {recommendation.status === 'VALIDATED' && (
                <button onClick={() => handleStatusChange('CLOSED')} className="text-xs inline-flex items-center px-2 py-1 bg-slate-800 text-white rounded hover:bg-slate-700">
                  <XCircle className="w-3 h-3 mr-1" /> Clôturer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Constat lie</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{recommendation.finding.title}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {recommendation.finding.description}
            </p>
          </div>
          <Link
            to={`/findings/${recommendation.finding.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <span>Voir le constat</span>
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mission</p>
            <p className="mt-1 text-sm text-slate-700">{missionTitle}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Processus</p>
            <p className="mt-1 text-sm text-slate-700">
              {recommendation.finding.process || <span className="italic text-slate-400">Non renseigne</span>}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Impact</p>
            <p className="mt-1 text-sm text-slate-700">
              {recommendation.finding.impact || <span className="italic text-slate-400">Non renseigne</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Plan d'action</h3>
            <div className="prose prose-sm max-w-none text-slate-600">
              <p className="whitespace-pre-wrap">{recommendation.actionPlan}</p>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Responsable</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                  {(() => {
                    const responsables = getRecommendationResponsibles(recommendation);
                    return responsables.length > 0 ? responsables.join(' • ') : <span className="text-slate-400 italic">Non assigné</span>;
                  })()}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Département</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                  {recommendation.department?.name || <span className="text-slate-400 italic">Non renseigné</span>}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Date cible</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                  {recommendation.targetDate ? new Date(recommendation.targetDate).toLocaleDateString() : <span className="text-slate-400 italic">Non renseignée</span>}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Avancement</h4>
                <div className="bg-slate-50 p-3 rounded-md border border-slate-100 flex items-center">
                  <div className="flex-1 mr-4">
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${recommendation.implementedPercent}%` }}></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{recommendation.implementedPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Evidences */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-slate-400" />
                Preuves ({recommendation.evidences?.length || 0})
              </h3>
              <button className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1 rounded">
                + Ajouter une preuve
              </button>
            </div>
            {recommendation.evidences && recommendation.evidences.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {recommendation.evidences.map(evidence => (
                  <li key={evidence.id} className="py-3 flex items-start">
                    <div className="flex-shrink-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-slate-900">{evidence.title}</p>
                      <p className="text-xs text-slate-500">{evidence.evidenceType} - {evidence.source}</p>
                      {evidence.description && <p className="text-sm text-slate-600 mt-1">{evidence.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Aucune preuve associée.</p>
            )}
          </div>

          {/* Tickets Section */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-indigo-500" />
                  Tickets GLPI ({recommendation.ticketLinks?.length || 0})
                </h3>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => { setIsTicketModalOpen(true); setTicketId(''); setTicketSearch(''); setTicketDropdownOpen(false); }}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  Lier un ticket
                </button>
              </div>
            </div>

            <ul className="divide-y divide-slate-200">
              {!recommendation.ticketLinks || recommendation.ticketLinks.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">
                  Aucun ticket GLPI lié à cette recommandation.
                </li>
              ) : (
                recommendation.ticketLinks.map((link) => (
                  <li key={link.id} className="hover:bg-slate-50 transition-colors">
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-900">
                          {link.ticket.ticketNumber ? `#${link.ticket.ticketNumber} - ` : ''}{link.ticket.title}
                        </span>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                            {link.ticket.status}
                          </span>
                          <span className="text-xs text-slate-500">Lien: {link.linkType}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleUnlinkTicket(link.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Approvals */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-slate-400" />
                Approbations ({recommendation.approvals?.length || 0})
              </h3>
              {!recommendation.approvals?.some(a => a.decision === 'PENDING' || a.decision === 'APPROVED') && (
                <button
                  className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1 rounded"
                  onClick={async () => {
                    try {
                      const res = await apiFetch(`${API_BASE}/approvals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          approvalType: 'RECOMMENDATION_APPROVAL',
                          recommendationId: recommendation.id
                        })
                      });
                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || 'Erreur');
                      }
                      fetchRecommendation();
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                >
                  + Demander une approbation
                </button>
              )}
            </div>
            {recommendation.approvals && recommendation.approvals.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {recommendation.approvals.map(approval => (
                  <li key={approval.id} className="py-3 flex items-start">
                    <div className="flex-shrink-0">
                      {approval.decision === 'APPROVED' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : approval.decision === 'REJECTED' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {approval.approver
                          ? `${approval.approver.firstName} ${approval.approver.lastName}`
                          : 'Approbateur non assigné'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(approval.createdAt).toLocaleDateString('fr-FR')} —{' '}
                        {approval.decision === 'PENDING' ? 'En attente'
                          : approval.decision === 'APPROVED' ? 'Approuvé'
                          : approval.decision === 'REJECTED' ? 'Rejeté'
                          : approval.decision}
                      </p>
                      {approval.comments && <p className="text-sm text-slate-600 mt-1">{approval.comments}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Aucune approbation.</p>
            )}
          </div>

          {/* Follow-ups Section */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-indigo-500" />
                  Suivis ({recommendation.followUps?.length || 0})
                </h3>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  Nouveau Suivi
                </button>
              </div>
            </div>

            <ul className="divide-y divide-slate-200">
              {!recommendation.followUps || recommendation.followUps.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">
                  Aucun suivi pour cette recommandation.
                </li>
              ) : (
                recommendation.followUps.map((followUp) => (
                  <li key={followUp.id} className="hover:bg-slate-50 transition-colors">
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-900">
                          {followUp.author ? `${followUp.author.firstName} ${followUp.author.lastName}` : 'Auteur inconnu'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(followUp.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center mb-3">
                        <span className="text-xs font-medium text-slate-500 mr-2">Avancement:</span>
                        <div className="w-32 bg-slate-200 rounded-full h-2 mr-2">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${followUp.implementedPercent}%` }}></div>
                        </div>
                        <span className="text-xs font-medium text-slate-700">{followUp.implementedPercent}%</span>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{followUp.comments}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Comments Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" />
              Commentaires ({recommendation.comments.length})
            </h3>
            
            <div className="space-y-4 mb-6">
              {recommendation.comments.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Aucun commentaire pour le moment.</p>
              ) : (
                recommendation.comments.map(comment => (
                  <div key={comment.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-slate-900">
                        {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Auteur inconnu'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="mt-4">
              <label htmlFor="comment" className="sr-only">Ajouter un commentaire</label>
              <textarea
                id="comment"
                rows={3}
                className="block w-full rounded-md border border-slate-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Ajouter un commentaire..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Publier
                </button>
              </div>
            </form>
          </div>

          {/* Status History */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-indigo-500" />
              Historique des statuts
            </h3>
            
            <div className="space-y-4">
              {recommendation.statusHistory && recommendation.statusHistory.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {recommendation.statusHistory.map(history => (
                    <li key={history.id} className="py-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-900">
                          {history.previousStatus
                            ? `${recoStatusConfig[history.previousStatus as keyof typeof recoStatusConfig]?.label ?? history.previousStatus} → `
                            : ''}
                          {recoStatusConfig[history.newStatus as keyof typeof recoStatusConfig]?.label ?? history.newStatus}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(history.changedAt).toLocaleString()}
                        </span>
                      </div>
                      {history.changedBy && (
                        <p className="text-xs text-slate-500 mt-1">
                          Par {history.changedBy.firstName} {history.changedBy.lastName}
                        </p>
                      )}
                      {history.reason && (
                        <p className="text-sm text-slate-600 mt-2 italic">"{history.reason}"</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">Aucun historique disponible.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attachments */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <Paperclip className="w-5 h-5 mr-2 text-indigo-500" />
              Pièces jointes ({recommendation.documents.length})
            </h3>
            
            {recommendation.documents.length === 0 ? (
              <p className="text-sm text-slate-500 italic mb-4">Aucun document attaché.</p>
            ) : (
              <ul className="divide-y divide-slate-100 mb-4">
                {recommendation.documents.map(doc => (
                  <li key={doc.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <Paperclip className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                      <button
                        onClick={() => handleDownload(doc.id, doc.originalName)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900 truncate"
                      >
                        {doc.originalName}
                      </button>
                    </div>
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                      {(doc.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
            
            <div>
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {uploading ? (
                  'Upload en cours...'
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter un document
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-900 mb-4 uppercase tracking-wider">Méta-données</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Dernière mise à jour</dt>
                <dd className="font-medium text-slate-900">{new Date(recommendation.updatedAt).toLocaleString()}</dd>
              </div>
              {recommendation.validator && (
                <div>
                  <dt className="text-slate-500">Validé par</dt>
                  <dd className="font-medium text-slate-900">{recommendation.validator.firstName} {recommendation.validator.lastName}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Follow-up Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsFollowUpModalOpen(false)} />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-medium leading-6 text-slate-900">Nouveau Suivi</h3>
                  <button onClick={() => setIsFollowUpModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleAddFollowUp} className="space-y-4">
                  <div>
                    <label htmlFor="percent" className="block text-sm font-medium text-slate-700">
                      Pourcentage d'avancement ({followUpPercent}%)
                    </label>
                    <input
                      type="range"
                      id="percent"
                      min="0"
                      max="100"
                      step="5"
                      value={followUpPercent}
                      onChange={(e) => setFollowUpPercent(parseInt(e.target.value))}
                      className="mt-2 block w-full"
                    />
                  </div>

                  <div>
                    <label htmlFor="followUpComments" className="block text-sm font-medium text-slate-700">Commentaires</label>
                    <textarea
                      id="followUpComments"
                      required
                      rows={4}
                      value={followUpComments}
                      onChange={(e) => setFollowUpComments(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      placeholder="Décrivez les actions réalisées..."
                    />
                  </div>

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={submittingFollowUp}
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {submittingFollowUp ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFollowUpModalOpen(false)}
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
        </div>
      )}

      {/* Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsTicketModalOpen(false)} />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-medium leading-6 text-slate-900">Lier un ticket GLPI</h3>
                  <button onClick={() => setIsTicketModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleLinkTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ticket</label>
                    <div ref={ticketComboRef} className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher un ticket..."
                        value={ticketSearch}
                        onChange={e => { setTicketSearch(e.target.value); setTicketDropdownOpen(true); setTicketId(''); }}
                        onFocus={() => setTicketDropdownOpen(true)}
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      />
                      {ticketDropdownOpen && (
                        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg text-sm">
                          {availableTickets
                            .filter(t => {
                              const q = ticketSearch.toLowerCase();
                              return (
                                t.title?.toLowerCase().includes(q) ||
                                String(t.ticketNumber ?? '').includes(q) ||
                                t.description?.toLowerCase().includes(q) ||
                                t.status?.toLowerCase().includes(q)
                              );
                            })
                            .map(ticket => (
                              <li
                                key={ticket.id}
                                onMouseDown={() => {
                                  setTicketId(String(ticket.id));
                                  setTicketSearch(`${ticket.ticketNumber ? `#${ticket.ticketNumber} — ` : ''}${ticket.title}`);
                                  setTicketDropdownOpen(false);
                                }}
                                className={`cursor-pointer px-3 py-2 hover:bg-indigo-50 ${String(ticket.id) === ticketId ? 'bg-indigo-50' : ''}`}
                              >
                                <div className="flex items-center gap-2">
                                  {ticket.ticketNumber && (
                                    <span className="shrink-0 font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                                      #{ticket.ticketNumber}
                                    </span>
                                  )}
                                  <span className={`font-medium truncate ${String(ticket.id) === ticketId ? 'text-indigo-700' : 'text-slate-800'}`}>
                                    {ticket.title}
                                  </span>
                                </div>
                                {ticket.description && (
                                  <p className="mt-0.5 ml-0 text-xs text-slate-400 truncate">{ticket.description}</p>
                                )}
                              </li>
                            ))}
                          {availableTickets.filter(t => {
                            const q = ticketSearch.toLowerCase();
                            return t.title?.toLowerCase().includes(q) || String(t.ticketNumber ?? '').includes(q) || t.description?.toLowerCase().includes(q) || t.status?.toLowerCase().includes(q);
                          }).length === 0 && (
                            <li className="px-3 py-2 text-slate-400 italic">Aucun ticket trouvé</li>
                          )}
                        </ul>
                      )}
                    </div>
                    {/* Champ caché pour la validation du formulaire */}
                    <input type="hidden" required value={ticketId} />
                  </div>

                  <div>
                    <label htmlFor="linkType" className="block text-sm font-medium text-slate-700">Type de lien</label>
                    <select
                      id="linkType"
                      required
                      value={linkType}
                      onChange={(e) => setLinkType(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="IMPLEMENTATION">Mise en œuvre</option>
                      <option value="VERIFICATION">Vérification</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={submittingTicket || !ticketId}
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {submittingTicket ? 'Liaison...' : 'Lier'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsTicketModalOpen(false); setTicketId(''); setTicketSearch(''); }}
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
