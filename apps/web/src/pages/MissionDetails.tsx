import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Plus, FileText, ChevronRight, Paperclip, Upload, Users, Target, Clock, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';
import RecommendationList from '../components/RecommendationList';
import RecommendationFormModal from '../components/RecommendationFormModal';
interface Finding {
  id: number;
  title: string;
  description: string;
  status: 'DRAFT' | 'CONFIRMED' | 'ADDRESSED' | 'REJECTED';
  riskLevel: { name: string; color: string } | null;
  _count: { recos: number };
  createdAt: string;
}
interface MissionMember {
  id: number;
  roleInMission: string;
  assignmentStatus: string;
  isLead: boolean;
  notes: string | null;
  assignedAt: string;
  user: { id: number; firstName: string; lastName: string; email: string };
}
interface MissionScope {
  id: number;
  scopeRole: string | null;
  notes: string | null;
  createdAt: string;
  auditableEntity: { id: number; name: string; code: string; entityType: string };
}
interface MissionStatusHistory {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
  changedAt: string;
  changedBy: { id: number; firstName: string; lastName: string } | null;
}

interface Mission {
  id: number;
  title: string;
  description: string;
  objective: string | null;
  scopeDescription: string | null;
  methodology: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  leader: { firstName: string; lastName: string };
  plan: { year: number; title: string | null };
  auditType: { name: string } | null;
  findings: Finding[];
  members: MissionMember[];
  scopes: MissionScope[];
  statusHistory: MissionStatusHistory[];
  programs: Array<{
    id: number;
    title: string;
    status: string;
    _count: { procedures: number };
  }>;
  documents: Array<{
    id: number;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  approvals: Array<{
    id: number;
    decision: string;
    comments: string | null;
    createdAt: string;
    approver: { firstName: string; lastName: string };
  }>;
}

const findingStatusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  CONFIRMED: { label: 'Confirmé', color: 'bg-amber-100 text-amber-800' },
  ADDRESSED: { label: 'Traité', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
};

const missionStatusConfig: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'Planifiée', color: 'bg-slate-100 text-slate-800' },
  READY: { label: 'Prête', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  UNDER_REVIEW: { label: 'En revue', color: 'bg-purple-100 text-purple-800' },
  APPROVED: { label: 'Approuvée', color: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
};

const missionTransitions: Record<string, { label: string; next: string }> = {
  PLANNED: { label: 'Finaliser cadrage', next: 'READY' },
  READY: { label: 'Lancer la mission', next: 'IN_PROGRESS' },
  IN_PROGRESS: { label: 'Soumettre en revue', next: 'UNDER_REVIEW' },
  UNDER_REVIEW: { label: 'Approuver mission', next: 'APPROVED' },
  APPROVED: { label: 'Clôturer mission', next: 'CLOSED' },
};

export default function MissionDetails() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //const [activeTab, setActiveTab] = useState<'details' | 'members' | 'scopes' | 'programs' | 'history'>('details');
  const [activeTab, setActiveTab] = useState<
    'details' | 'members' | 'scopes' | 'programs' | 'history' | 'recommendations'
  >('details');
  // Modals state
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  //const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  // Forms state
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [memberForm, setMemberForm] = useState({ userId: '', roleInMission: '', isLead: false, notes: '' });
  const [scopeForm, setScopeForm] = useState({ auditableEntityId: '', scopeRole: '', notes: '' });
  const [historyForm, setHistoryForm] = useState({ reason: '' });
  const [programForm, setProgramForm] = useState({ title: '', objective: '', scopeDescription: '', methodology: '', auditCriteria: '', samplingApproach: '' });
  const [editingHistory, setEditingHistory] = useState<MissionStatusHistory | null>(null);
  // Data for selects
  const [users, setUsers] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  const fetchMission = () => {
    apiFetch(`${API_BASE}/missions/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement de la mission');
        return res.json();
      })
      .then(data => {
        setMission(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };
  const fetchRecommendations = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/recommendations/mission/${id}`);
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    fetchMission();
    fetchRecommendations();
    // Fetch users for members modal
    apiFetch(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
    // Fetch entities for scope modal
    apiFetch(`${API_BASE}/referential/auditable-entities`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEntities(data);
      })
      .catch(console.error);
  }, [id]);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('missionId', id!);
    try {
      const res = await apiFetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de l\'upload du document');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMission();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };
  // const handleStatusChange = async (e: React.FormEvent) => {
  // e.preventDefault();
  // try {
  // const response = await apiFetch(`${API_BASE}/missions/${id}/status`, {
  // method: 'PATCH',
  // headers: { 'Content-Type': 'application/json' },
  // body: JSON.stringify(statusForm),
  // });
  // if (response.ok) {
  // setIsStatusModalOpen(false);
  // fetchMission();
  // } else {
  // const err = await response.json();
  // alert(err.error || 'Erreur lors du changement de statut');
  // }
  // } catch (error) {
  // console.error('Failed to change status', error);
  // }
  // };
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`${API_BASE}/missions/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberForm),
      });
      if (response.ok) {
        setIsMemberModalOpen(false);
        setMemberForm({ userId: '', roleInMission: '', isLead: false, notes: '' });
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de l\'ajout du membre');
      }
    } catch (error) {
      console.error('Failed to add member', error);
    }
  };
  const handleRemoveMember = async (memberId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer ce membre ?')) return;
    try {
      const response = await apiFetch(`${API_BASE}/missions/members/${memberId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors du retrait du membre');
      }
    } catch (error) {
      console.error('Failed to remove member', error);
    }
  };
  const handleAddScope = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`${API_BASE}/missions/${id}/scopes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scopeForm),
      });
      if (response.ok) {
        setIsScopeModalOpen(false);
        setScopeForm({ auditableEntityId: '', scopeRole: '', notes: '' });
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de l\'ajout au périmètre');
      }
    } catch (error) {
      console.error('Failed to add scope', error);
    }
  };
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`${API_BASE}/programs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...programForm, missionId: id }),
      });
      if (response.ok) {
        setIsProgramModalOpen(false);
        setProgramForm({ title: '', objective: '', scopeDescription: '', methodology: '', auditCriteria: '', samplingApproach: '' });
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la création du programme');
      }
    } catch (error) {
      console.error('Failed to create program', error);
    }
  };

  const handleRequestProgramApproval = async (programId: number) => {
  try {
    const res = await apiFetch(`${API_BASE}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalType: 'PROGRAM_APPROVAL',
        level: 1,
        auditProgramId: programId
      })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Erreur lors de la demande d'approbation");
      return;
    }
    alert('Demande d’approbation envoyée');
    fetchMission(); // refresh UI
  } catch (err) {
    console.error(err);
  }
  };

  const handleRequestMissionApproval = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalType: 'MISSION_APPROVAL',
          level: 1,
          missionId: mission?.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erreur lors de la demande d'approbation mission");
        return;
      }

      alert('Demande d’approbation mission envoyée');
      fetchMission();

    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveScope = async (scopeId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer cette entité du périmètre ?')) return;
    try {
      const response = await apiFetch(`${API_BASE}/missions/scopes/${scopeId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors du retrait du périmètre');
      }
    } catch (error) {
      console.error('Failed to remove scope', error);
    }
  };

  const handleUpdateHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHistory) return;
    try {
      const response = await apiFetch(`${API_BASE}/missions/history/${editingHistory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyForm),
      });
      if (response.ok) {
        setIsHistoryModalOpen(false);
        fetchMission();
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
      const response = await apiFetch(`${API_BASE}/missions/history/${historyId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la suppression de l\'historique');
      }
    } catch (error) {
      console.error('Failed to delete history', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[400px]">Chargement des détails de la mission...</div>;
  }

  if (error || !mission) {
    return (
      <div className="p-8">
        <div className="rounded-3xl bg-red-50 p-8 border border-red-200 shadow-sm">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <h3 className="text-sm font-medium text-red-800">{error || 'Mission introuvable'}</h3>
          </div>
        </div>
        <Link to="/missions" className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux missions
        </Link>
      </div>
    );
  }

  const statusConf = missionStatusConfig[mission.status] || missionStatusConfig.PLANNED;
  const canStartMission =
    mission.scopes.length > 0 &&
    mission.members.length > 0 &&
    mission.programs?.some(p => p.status === 'APPROVED');
  const currentAction = missionTransitions[mission.status];
  const canCreateFinding = mission.status === 'IN_PROGRESS';
  const canViewReport = ['UNDER_REVIEW', 'APPROVED', 'CLOSED'].includes(mission.status);
  const canEditCadrage = ['PLANNED', 'READY'].includes(mission.status);
  const canCreateRecommendation = mission.status === 'IN_PROGRESS';
  const handleQuickStatusChange = async (nextStatus: string) => {
    try {
      const response = await apiFetch(`${API_BASE}/missions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          reason: `Transition automatique vers ${nextStatus}`
        })
      });
      if (response.ok) {
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isActionAllowed = (nextStatus: string) => {
    // 🔒 PHASE 2 — cadrage obligatoire
    if (nextStatus === 'READY') {
      return (
        mission.scopes.length > 0 &&
        mission.members.length > 0 &&
        mission.programs?.length > 0
      );
    }
    // 🔒 PHASE 3 — validation programme
    if (nextStatus === 'IN_PROGRESS') {
      return mission.programs?.some(p => p.status === 'APPROVED');
    }
    // 🔒 PHASE 4 — revue
    if (nextStatus === 'UNDER_REVIEW') {
      return mission.findings.length > 0;
    }

    // 🔒 PHASE 5 — clôture mission
    if (nextStatus === 'CLOSED') {
      return recommendations.every(
        (r: any) => ['VALIDATED', 'REJECTED'].includes(r.status)
      );
    }
    return true;
  };

  const handleApprove = async (approvalId: number) => {
    try {
      const res = await apiFetch(`${API_BASE}/approvals/${approvalId}/decide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'APPROVED'
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erreur approbation');
        return;
      }
      fetchMission();
    } catch (err) {
      console.error(err);
    }
  };

  const canRequestApproval =
  mission.status === 'UNDER_REVIEW' &&
  !mission.approvals?.some(a => a.decision === 'APPROVED');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 bg-slate-50 px-6 lg:px-0 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <Link to="/missions" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-6 transition-all duration-200 hover:-translate-x-px">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux missions
        </Link>
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tighter text-slate-900">{mission.title}</h1>
            <p className="mt-2 text-sm text-slate-500 flex items-center gap-x-3">
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-2xl">Plan {mission.plan.year}</span>
              {mission.auditType ? (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-2xl">Type: {mission.auditType.name}</span>
              ) : null}
              <span className="inline-flex items-center text-slate-400">•</span>
              <span className="font-medium">Chef de mission :</span> {mission.leader.firstName} {mission.leader.lastName}
            </p>
          </div>
          {/* <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={() => {
                setStatusForm({ status: mission.status, reason: '' });
                setIsStatusModalOpen(true);
              }}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80 ${statusConf.color}`}
            >
              Statut : {statusConf.label}
            </button>
            {canViewReport ? (
              <Link
                to={`/missions/${id}/report`}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md"
              >
                Voir le rapport
              </Link>
            ) : (
              <button
                disabled
                title="Disponible après lancement et revue"
                className="inline-flex items-center px-4 py-2 border border-slate-200 text-slate-400 rounded-md cursor-not-allowed"
              >
                Voir le rapport
              </button>
            )}
          </div> */}
          <div className="mt-6 sm:mt-0 flex items-center gap-x-3">
            {/* Badge statut (lecture seule) */}
            <span className={`inline-flex items-center px-4 py-1.5 rounded-3xl text-sm font-semibold shadow-sm ring-1 ring-offset-2 ring-slate-100 ${statusConf.color} transition-all duration-200`}>
              {statusConf.label}
            </span>
            {/* Action contextuelle */}
            {currentAction && (
              <button
                onClick={() => {
                  setIsActionModalOpen(true);
                }}
                // onClick={async () => {
                // try {
                // const res = await apiFetch(`${API_BASE}/missions/${id}/status`, {
                // method: 'PATCH',
                // headers: { 'Content-Type': 'application/json' },
                // body: JSON.stringify({
                // status: currentAction.next,
                // reason: `Transition via UI: ${currentAction.label}`
                // }),
                // });
                // if (!res.ok) {
                // const err = await res.json();
                // alert(err.error);
                // return;
                // }
                // fetchMission();
                // } catch (err) {
                // console.error(err);
                // }
                // }}
                // disabled={
                // mission.status === 'READY' && !canStartMission
                // }
                disabled={
                  !isActionAllowed(currentAction.next)
                }
                className={`inline-flex items-center px-6 py-3 rounded-3xl text-sm font-semibold text-white shadow-lg hover:shadow-xl active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
                  ${mission.status === 'READY' && !canStartMission
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                {currentAction.label}
              </button>
            )}
            {/* Rapport */}
            {canViewReport ? (
              <Link
                to={`/missions/${id}/report`}
                className="inline-flex items-center px-6 py-3 border border-slate-200 hover:border-slate-300 rounded-3xl text-sm font-semibold text-slate-700 shadow-sm hover:shadow transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              >
                Voir le rapport
              </Link>
            ) : (
              <button
                disabled
                title="Disponible après lancement et revue"
                className="inline-flex items-center px-6 py-3 border border-slate-200 text-slate-400 rounded-3xl cursor-not-allowed shadow-sm"
              >
                Voir le rapport
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-3xl shadow-sm px-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`${activeTab === 'details'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Détails & Constats
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`${activeTab === 'members'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <Users className="w-4 h-4 mr-2" />
            Membres ({mission.members.length})
          </button>
          <button
            onClick={() => setActiveTab('scopes')}
            className={`${activeTab === 'scopes'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <Target className="w-4 h-4 mr-2" />
            Périmètre ({mission.scopes.length})
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`${activeTab === 'programs'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Programmes ({mission.programs?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${activeTab === 'history'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Historique
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`${activeTab === 'recommendations'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            Recommandations ({recommendations.length})
          </button>
        </nav>
      </div>
      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 space-y-8">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-x-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  Description
                </h3>
                <p className="text-slate-600 leading-relaxed">{mission.description}</p>
              </div>
              {mission.objective && (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Objectif
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{mission.objective}</p>
                </div>
              )}
              {mission.scopeDescription && (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Description du périmètre
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{mission.scopeDescription}</p>
                </div>
              )}
              {mission.methodology && (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Méthodologie
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{mission.methodology}</p>
                </div>
              )}
            </div>
            {/* Findings Section */}
            <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="px-8 py-6 border-b border-slate-100 sm:flex sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold leading-6 text-slate-900 flex items-center">
                    <FileText className="w-6 h-6 mr-3 text-indigo-500" />
                    Constats d'audit
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Liste des constats relevés lors de cette mission.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  {/* <Link to={`/missions/${id}/findings/new`}
                  className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md">
                    + Nouveau constat
                  </Link> */}
                  {canCreateFinding ? (
                    <Link
                      to={`/missions/${id}/findings/new`}
                      className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-3xl font-semibold shadow-sm hover:shadow-xl active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                    >
                      + Nouveau constat
                    </Link>
                  ) : (
                    <button
                      disabled
                      title="La mission doit être en cours"
                      className="inline-flex items-center bg-slate-100 text-slate-400 px-6 py-3 rounded-3xl cursor-not-allowed font-semibold shadow-sm"
                    >
                      + Nouveau constat
                    </button>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {mission.findings.length === 0 ? (
                  <li className="px-8 py-12 text-center text-sm text-slate-500 flex flex-col items-center">
                    <FileText className="w-8 h-8 mb-3 text-slate-300" />
                    Aucun constat n'a encore été enregistré pour cette mission.
                  </li>
                ) : (
                  mission.findings.map((finding) => {
                    const statusConf = findingStatusConfig[finding.status] || findingStatusConfig.DRAFT;
                    return (
                      <li key={finding.id} className="group hover:bg-slate-50 transition-all duration-200">
                        <div className="px-8 py-6 flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-base font-semibold text-indigo-600 truncate group-hover:text-indigo-700 transition-colors">
                                {finding.title}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex items-center gap-x-2">
                                {finding.riskLevel && (
                                  <span
                                    className="inline-flex items-center px-3 py-px rounded-3xl text-xs font-semibold border transition-all duration-200 group-hover:scale-105"
                                    style={{
                                      backgroundColor: `${finding.riskLevel.color}15`,
                                      color: finding.riskLevel.color,
                                      borderColor: `${finding.riskLevel.color}30`
                                    }}
                                  >
                                    Risque {finding.riskLevel.name}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-3 py-px rounded-3xl text-xs font-semibold ${statusConf.color} transition-all duration-200 group-hover:scale-105`}>
                                  {statusConf.label}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-slate-500 truncate leading-relaxed">
                                  {finding.description.substring(0, 100)}
                                  {finding.description.length > 100 ? '...' : ''}
                                </p>
                              </div>
                              <div className="mt-3 flex items-center text-sm text-slate-500 sm:mt-0 sm:ml-6 font-medium">
                                <p>
                                  {finding._count.recos} recommandation(s)
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-6 flex-shrink-0">
                            <Link to={`/findings/${finding.id}`} className="p-3 text-slate-300 group-hover:text-indigo-500 transition-colors rounded-2xl hover:bg-white shadow-sm">
                              <ChevronRight className="w-5 h-5" />
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
          {/* Sidebar */}
          <div className="space-y-8">
            {/* Attachments */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <Paperclip className="w-6 h-6 mr-3 text-indigo-500" />
                Documents ({mission.documents?.length || 0})
              </h3>
              {!mission.documents || mission.documents.length === 0 ? (
                <p className="text-sm text-slate-400 italic mb-6 flex items-center gap-x-2">
                  <Paperclip className="w-4 h-4" />
                  Aucun document attaché.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 mb-8">
                  {mission.documents.map(doc => (
                    <li key={doc.id} className="py-4 flex items-center justify-between group">
                      <div className="flex items-center min-w-0">
                        <Paperclip className="h-4 w-4 text-slate-400 mr-3 flex-shrink-0 group-hover:text-indigo-400 transition-colors" />
                        <a href={`${API_BASE}/documents/download/${doc.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 hover:text-indigo-600 truncate transition-colors">
                          {doc.originalName}
                        </a>
                      </div>
                      <span className="text-xs text-slate-400 ml-4 flex-shrink-0 font-medium">
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
                  className="w-full inline-flex justify-center items-center px-6 py-4 border border-slate-200 shadow-sm text-sm font-semibold rounded-3xl text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-all duration-200 active:scale-[0.97]"
                >
                  {uploading ? (
                    'Upload en cours...'
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-3" />
                      Ajouter un document
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Approvals */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3 text-indigo-500" />
                  Approbations ({mission.approvals?.length || 0})
                </h3>
                <button
                  onClick={handleRequestMissionApproval}
                  disabled={!canRequestApproval}
                  className={`text-sm font-semibold px-4 py-2 rounded-3xl transition-all duration-200
                  ${
                    canRequestApproval
                      ? 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  + Demander
                </button>
              </div>
              {!mission.approvals || mission.approvals.length === 0 ? (
                <p className="text-sm text-slate-400 italic mb-6">Aucune approbation.</p>
              ) : (
                <ul className="divide-y divide-slate-100 mb-6">
                  {/* {mission.approvals.map(approval => (
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
                          {approval.approver.firstName} {approval.approver.lastName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(approval.createdAt).toLocaleDateString()} - {approval.decision}
                        </p>
                      </div>
                    </li>
                  ))} */}
                  {mission.approvals.map(approval => (
                    <li key={approval.id} className="py-5 flex items-start justify-between group">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {approval.decision === 'APPROVED' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : approval.decision === 'REJECTED' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-slate-900">
                            {approval.approver
                              ? `${approval.approver.firstName} ${approval.approver.lastName}`
                              : 'En attente de validation'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(approval.createdAt).toLocaleDateString()} — {approval.decision}
                          </p>
                        </div>
                      </div>
                      {/* 🔥 ACTION */}
                      {approval.decision === 'PENDING' && (
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="text-xs px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-medium shadow-sm hover:shadow transition-all duration-200 active:scale-95"
                        >
                          Approuver
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'members' && (
        <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold leading-6 text-slate-900">Membres de la mission</h3>
              <p className="mt-1 text-sm text-slate-500">Gérez l'équipe affectée à cette mission d'audit.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsMemberModalOpen(true)}
                disabled={!canEditCadrage}
                className={`inline-flex items-center px-6 py-3 rounded-3xl font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${canEditCadrage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-xl'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Ajouter un membre
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {mission.members.length === 0 ? (
              <li className="px-8 py-12 text-center text-sm text-slate-500">Aucun membre affecté.</li>
            ) : (
              mission.members.map(member => (
                <li key={member.id} className="px-8 py-6 flex items-center justify-between group hover:bg-slate-50 transition-all duration-200">
                  <div>
                    <p className="text-base font-semibold text-slate-900 flex items-center">
                      {member.user.firstName} {member.user.lastName}
                      {member.isLead && <span className="ml-3 px-3 py-0.5 rounded-3xl text-xs font-medium bg-indigo-100 text-indigo-700">Lead</span>}
                    </p>
                    <p className="text-sm text-slate-500 mt-px">{member.user.email} • Rôle: {member.roleInMission}</p>
                    {member.notes && <p className="text-xs text-slate-400 mt-3">Note: {member.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-500 hover:text-red-600 p-3 transition-colors rounded-2xl hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {activeTab === 'scopes' && (
        <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold leading-6 text-slate-900">Périmètre de la mission</h3>
              <p className="mt-1 text-sm text-slate-500">Entités auditables concernées par cette mission.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsScopeModalOpen(true)}
                disabled={!canEditCadrage}
                className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${canEditCadrage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-xl'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Ajouter au périmètre
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {mission.scopes.length === 0 ? (
              <li className="px-8 py-12 text-center text-sm text-slate-500">Aucune entité dans le périmètre.</li>
            ) : (
              mission.scopes.map(scope => (
                <li key={scope.id} className="px-8 py-6 flex items-center justify-between group hover:bg-slate-50 transition-all duration-200">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {scope.auditableEntity.name} <span className="text-slate-400 font-normal">({scope.auditableEntity.code})</span>
                    </p>
                    <p className="text-sm text-slate-500">Type: {scope.auditableEntity.entityType} {scope.scopeRole ? `• Rôle: ${scope.scopeRole}` : ''}</p>
                    {scope.notes && <p className="text-xs text-slate-400 mt-3">Note: {scope.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleRemoveScope(scope.id)}
                    className="text-red-500 hover:text-red-600 p-3 transition-colors rounded-2xl hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {activeTab === 'programs' && (
        <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold leading-6 text-slate-900">Programmes d'audit</h3>
              <p className="mt-1 text-sm text-slate-500">Gérez les programmes et procédures d'audit pour cette mission.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsProgramModalOpen(true)}
                disabled={!canEditCadrage}
                className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${canEditCadrage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-xl'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Nouveau programme
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {!mission.programs || mission.programs.length === 0 ? (
              <li className="px-8 py-12 text-center text-sm text-slate-500">Aucun programme d'audit défini.</li>
            ) : (
              mission.programs.map(program => (
                <li
                  key={program.id}
                  className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-all duration-200 group"
                >
                  {/* LEFT */}
                  <div>
                    <Link
                      to={`/programs/${program.id}`}
                      className="text-base font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {program.title}
                    </Link>
                    <div className="flex items-center mt-3 space-x-6 text-sm text-slate-500">
                      <span className="inline-flex items-center px-4 py-1 rounded-3xl text-xs font-medium bg-slate-100 text-slate-700 transition-all group-hover:bg-slate-200">
                        {program.status}
                      </span>
                      <span className="font-medium">{program._count.procedures} procédure(s)</span>
                    </div>
                  </div>
                  {/* RIGHT */}
                  <div className="flex items-center gap-x-4">
                    {program.status === 'DRAFT' && (
                      <button
                        onClick={() => handleRequestProgramApproval(program.id)}
                        className="text-sm px-5 py-2.5 bg-indigo-600 text-white rounded-3xl hover:bg-indigo-700 font-medium shadow-sm transition-all duration-200 active:scale-95"
                      >
                        Demander validation
                      </button>
                    )}
                    <Link
                      to={`/programs/${program.id}`}
                      className="p-3 text-slate-300 group-hover:text-indigo-500 transition-colors rounded-2xl hover:bg-white shadow-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {activeTab === 'history' && (
        <div className="bg-white shadow-sm border border-slate-100 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100">
            <h3 className="text-xl font-semibold leading-6 text-slate-900">Historique des statuts</h3>
          </div>
          <div className="p-8">
            <div className="flow-root">
              <ul className="-mb-8">
                {mission.statusHistory.map((history, historyIdx) => (
                  <li key={history.id}>
                    <div className="relative pb-8">
                      {historyIdx !== mission.statusHistory.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-4">
                        <div>
                          <span className="h-8 w-8 rounded-2xl bg-indigo-100 flex items-center justify-center ring-4 ring-white shadow-inner">
                            <Clock className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-slate-500">
                              Statut changé à <span className="font-semibold text-slate-900">{missionStatusConfig[history.newStatus]?.label || history.newStatus}</span>
                              {history.changedBy && ` par ${history.changedBy.firstName} ${history.changedBy.lastName}`}
                            </p>
                            {history.reason && (
                              <p className="mt-2 text-sm text-slate-600 italic">"{history.reason}"</p>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-slate-500 flex flex-col items-end gap-3">
                            {new Date(history.changedAt).toLocaleString('fr-FR')}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  setEditingHistory(history);
                                  setHistoryForm({ reason: history.reason || '' });
                                  setIsHistoryModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteHistory(history.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'recommendations' && (
        <div className="bg-white shadow-sm border border-slate-100 rounded-3xl p-8 space-y-6 hover:shadow-xl transition-all duration-300">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-slate-900">
              Recommandations
            </h3>
            {/* <button
              onClick={() => {
                if (!mission.findings.length) {
                  alert('Aucun constat disponible');
                  return;
                }
                // on prend le premier finding par défaut (simple et safe)
                setSelectedFindingId(mission.findings[0].id);
                setIsRecommendationModalOpen(true);
              }}
              className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle recommandation
            </button> */}
            <button
              onClick={() => {
                if (!canCreateRecommendation) return;
                if (!mission.findings.length) {
                  alert('Aucun constat disponible');
                  return;
                }
                setSelectedFindingId(mission.findings[0].id);
                setIsRecommendationModalOpen(true);
              }}
              disabled={!canCreateRecommendation}
              title={
                !canCreateRecommendation
                  ? 'La mission doit être en cours'
                  : !mission.findings.length
                    ? 'Aucun constat disponible'
                    : ''
              }
              className={`inline-flex items-center px-6 py-3 rounded-3xl font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${canCreateRecommendation
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-xl'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle recommandation
            </button>
          </div>
          {/* LIST */}
          <RecommendationList
            recommendations={recommendations}
            onRefresh={fetchRecommendations}
          />
        </div>
      )}
      {/* Modals */}
      {/* Status Modal */}
      {/* {isStatusModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsStatusModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Changer le statut de la mission</h3>
              <form onSubmit={handleStatusChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Nouveau statut</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({...statusForm, status: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    required
                  >
                    {Object.entries(missionStatusConfig).map(([key, conf]) => (
                      <option key={key} value={key}>{conf.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Raison / Commentaire</label>
                  <textarea
                    rows={3}
                    value={statusForm.reason}
                    onChange={(e) => setStatusForm({...statusForm, reason: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    placeholder="Obligatoire pour la traçabilité..."
                    required
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStatusModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )} */}
      {isActionModalOpen && currentAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-2 text-slate-900">
              {currentAction.label}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Cette action va changer le statut de la mission.
            </p>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Commentaire obligatoire..."
              className="w-full border border-slate-200 focus:border-indigo-300 rounded-3xl p-4 text-sm mb-8 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-y min-h-[120px]"
              required
            />
            <div className="flex justify-end gap-x-3">
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="px-6 py-3 border border-slate-200 hover:border-slate-300 rounded-3xl font-medium transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!actionReason.trim()) {
                    alert('Le commentaire est obligatoire');
                    return;
                  }
                  await handleQuickStatusChange(currentAction.next);
                  setActionReason('');
                  setIsActionModalOpen(false);
                }}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-semibold transition-all duration-200 active:scale-[0.97]"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsMemberModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-3xl bg-white px-8 pt-8 pb-8 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">Ajouter un membre</h3>
              <form onSubmit={handleAddMember} className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Utilisateur *</label>
                  <select
                    value={memberForm.userId}
                    onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                    required
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rôle dans la mission *</label>
                  <input
                    type="text"
                    value={memberForm.roleInMission}
                    onChange={(e) => setMemberForm({ ...memberForm, roleInMission: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                    placeholder="Ex: Auditeur IT, Expert métier..."
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="isLead"
                    type="checkbox"
                    checked={memberForm.isLead}
                    onChange={(e) => setMemberForm({ ...memberForm, isLead: e.target.checked })}
                    className="h-5 w-5 rounded-2xl border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                  />
                  <label htmlFor="isLead" className="ml-3 block text-sm text-slate-900">
                    Est un lead (co-responsable)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={memberForm.notes}
                    onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-4">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-3xl border border-transparent bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm transition-all duration-200 active:scale-[0.97]"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-3xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm transition-all duration-200"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Scope Modal */}
      {isScopeModalOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsScopeModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-3xl bg-white px-8 pt-8 pb-8 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">Ajouter au périmètre</h3>
              <form onSubmit={handleAddScope} className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Entité auditable *</label>
                  <select
                    value={scopeForm.auditableEntityId}
                    onChange={(e) => setScopeForm({ ...scopeForm, auditableEntityId: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                    required
                  >
                    <option value="">Sélectionner une entité</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rôle dans le périmètre</label>
                  <input
                    type="text"
                    value={scopeForm.scopeRole}
                    onChange={(e) => setScopeForm({ ...scopeForm, scopeRole: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                    placeholder="Ex: Entité principale, Entité support..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    rows={3}
                    value={scopeForm.notes}
                    onChange={(e) => setScopeForm({ ...scopeForm, notes: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-4">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-3xl border border-transparent bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm transition-all duration-200 active:scale-[0.97]"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScopeModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-3xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm transition-all duration-200"
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
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-3xl bg-white px-8 pt-8 pb-8 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">Modifier l'historique</h3>
              <form onSubmit={handleUpdateHistory} className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Raison / Commentaire</label>
                  <textarea
                    rows={4}
                    value={historyForm.reason}
                    onChange={(e) => setHistoryForm({ ...historyForm, reason: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                    required
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-4">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-3xl border border-transparent bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm transition-all duration-200 active:scale-[0.97]"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-3xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm transition-all duration-200"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Program Modal */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsProgramModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-3xl bg-white px-8 pt-8 pb-8 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <h3 className="text-xl font-semibold leading-6 text-slate-900 mb-6">Nouveau programme d'audit</h3>
              <form onSubmit={handleCreateProgram} className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Titre *</label>
                  <input
                    type="text"
                    required
                    value={programForm.title}
                    onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Objectif</label>
                  <textarea
                    rows={3}
                    value={programForm.objective}
                    onChange={(e) => setProgramForm({ ...programForm, objective: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Périmètre (Scope)</label>
                  <textarea
                    rows={3}
                    value={programForm.scopeDescription}
                    onChange={(e) => setProgramForm({ ...programForm, scopeDescription: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Méthodologie</label>
                    <textarea
                      rows={3}
                      value={programForm.methodology}
                      onChange={(e) => setProgramForm({ ...programForm, methodology: e.target.value })}
                      className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Critères d'audit</label>
                    <textarea
                      rows={3}
                      value={programForm.auditCriteria}
                      onChange={(e) => setProgramForm({ ...programForm, auditCriteria: e.target.value })}
                      className="mt-1 block w-full rounded-3xl border border-slate-200 shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-4">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-3xl border border-transparent bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm transition-all duration-200 active:scale-[0.97]"
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProgramModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-3xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm transition-all duration-200"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {isRecommendationModalOpen && selectedFindingId && (
        <RecommendationFormModal
          isOpen={isRecommendationModalOpen}
          onClose={() => setIsRecommendationModalOpen(false)}
          findingId={selectedFindingId}
          onSuccess={() => {
            fetchRecommendations(); // 🔥 refresh auto
          }}
        />
      )}
    </div>
  );
}