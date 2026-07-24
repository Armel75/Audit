
import { useState, useEffect, useRef } from 'react';
import ComboBox from '../components/ComboBox';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Plus, FileText, ChevronRight, Paperclip, Upload, Users, Target, Clock, Edit2, Trash2, CheckCircle, XCircle, Ticket, ScrollText, MessageCircle } from 'lucide-react';
import HierarchyCommentTabs from '../components/hierarchy-comments/HierarchyCommentTabs';
import { apiFetch } from '../lib/api';
import RecommendationList from '../components/RecommendationList';
import RecommendationFormModal from '../components/RecommendationFormModal';
import MissionPreparationPanel from '../components/missions/MissionPreparationPanel';
import { useAuth } from '../context/AuthContext';
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
  memberType?: 'INTERNAL_USER' | 'GLPI_USER' | 'EXTERNAL_PARTICIPANT' | string;
  roleInMission: string;
  assignmentStatus: string;
  isLead: boolean;
  notes: string | null;
  assignedAt: string;
  user?: { id: number; firstName: string; lastName: string; email: string } | null;
  glpiUser?: { id: number; fullName?: string | null; email?: string | null; entityName?: string | null } | null;
  externalParticipant?: { id: number; fullName: string; email?: string | null; organization?: string | null; title?: string | null } | null;
}
interface MissionScope {
  id: number;
  scopeRole: string | null;
  status: string;
  criticality: string | null;
  createdAt: string;
  addedBy?: { id: number; firstName: string; lastName: string } | null;
  removedBy?: { id: number; firstName: string; lastName: string } | null;
  removedAt?: string | null;
  removalReason?: string | null;
  notes?: string | null;
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
  leader?: { id: number; firstName: string; lastName: string } | null;
  plan?: { year: number; title: string | null } | null;
  auditType: { name: string } | null;
  findings: Finding[];
  members: MissionMember[];
  scopes: MissionScope[];
  statusHistory: MissionStatusHistory[];
  programs: Array<{
    id: number;
    title: string;
    status: string;
    programType?: string;
    objective?: string;
    scopeDescription?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
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
  preparation?: {
    id: number;
    phase: string;
    intakeCompletedAt: string | null;
    enrichmentCompletedAt: string | null;
    reviewCompletedAt: string | null;
    readyAt: string | null;
    history: Array<{
      id: number;
      fromPhase: string | null;
      toPhase: string;
      reason: string | null;
      actionType: string | null;
      changedAt: string;
      changedBy: { id: number; firstName: string; lastName: string } | null;
    }>;
  } | null;
}

const findingStatusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  CONFIRMED: { label: 'Confirmé', color: 'bg-amber-100 text-amber-800' },
  ADDRESSED: { label: 'Traité', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
};

const programStatusConfig: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'En attente',
  APPROVED: 'Approuvé',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
  CLOSED: 'Clôturé',
};

const missionStatusConfig: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'Planifiée', color: 'bg-slate-100 text-slate-800' },
  READY: { label: 'Prête', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  UNDER_REVIEW: { label: 'En revue', color: 'bg-purple-100 text-purple-800' },
  APPROVED: { label: 'Approuvée', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: {
    label: 'Annulée',
    color: 'bg-red-100 text-red-800'
  },
  CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
};

const getCriticalityLabel = (criticality: string | null): string => {
  const labels: Record<string, string> = {
    'LOW': 'Faible',
    'MEDIUM': 'Moyenne',
    'HIGH': 'Élevée',
    'CRITICAL': 'Critique'
  };
  return criticality ? labels[criticality] || criticality : '';
};

// const missionTransitions: Record<string, { label: string; next: string }> = {
//   PLANNED: { label: 'Finaliser cadrage', next: 'READY' },
//   READY: { label: 'Lancer la mission', next: 'IN_PROGRESS' },
//   IN_PROGRESS: { label: 'Soumettre en revue', next: 'UNDER_REVIEW' },
//   UNDER_REVIEW: { label: 'Approuver mission', next: 'APPROVED' },
//   APPROVED: { label: 'Clôturer mission', next: 'CLOSED' },
// };

const missionTransitions: Record<
  string,
  { label: string; next: string }[]
> = {
  PLANNED: [
    { label: 'Finaliser cadrage', next: 'READY' },
    { label: 'Annuler la mission', next: 'CANCELLED' }
  ],

  READY: [
    { label: 'Lancer la mission', next: 'IN_PROGRESS' },
    { label: 'Revenir au cadrage', next: 'PLANNED' },
    { label: 'Annuler la mission', next: 'CANCELLED' }
  ],

  IN_PROGRESS: [
    { label: 'Soumettre en revue', next: 'UNDER_REVIEW' },
    { label: 'Revenir au cadrage', next: 'READY' },
    { label: 'Annuler la mission', next: 'CANCELLED' }
  ],

  UNDER_REVIEW: [
    { label: 'Approuver mission', next: 'APPROVED' },
    { label: 'Reprendre corrections', next: 'IN_PROGRESS' },
    { label: 'Annuler la mission', next: 'CANCELLED' }
  ],

  APPROVED: [
    { label: 'Clôturer mission', next: 'CLOSED' }
  ],

  CLOSED: [],
  CANCELLED: []
};

export default function MissionDetails() {
    // Pour la recherche d'entité auditable dans le formulaire
    const [entitySearchText, setEntitySearchText] = useState("");
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //const [activeTab, setActiveTab] = useState<'details' | 'members' | 'scopes' | 'programs' | 'history'>('details');
  const [activeTab, setActiveTab] = useState<
    'details' | 'members' | 'scopes' | 'programs' | 'history' | 'hierarchy-comments' | 'recommendations' | 'tickets'
  >((searchParams.get('tab') as any) || 'members');
  // Modals state
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  //const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [generatingOrder, setGeneratingOrder] = useState(false);
  // Forms state
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [memberForm, setMemberForm] = useState({
    memberType: 'INTERNAL_USER',
    userId: '',
    glpiUserId: '',
    externalParticipantId: '',
    externalFullName: '',
    externalEmail: '',
    externalPhone: '',
    externalOrganization: '',
    externalTitle: '',
    roleInMission: '',
    isLead: false,
    notes: ''
  });
  const [scopeForm, setScopeForm] = useState({ auditableEntityId: '', scopeRole: '', criticality: '', notes: '' });
  const [editingScope, setEditingScope] = useState<MissionScope | null>(null);
  const [historyForm, setHistoryForm] = useState({ reason: '' });
  const [programForm, setProgramForm] = useState({ code: '', title: '', programType: '', objective: '', scopeDescription: '', plannedStartDate: '', plannedEndDate: '' });
  const [editingHistory, setEditingHistory] = useState<MissionStatusHistory | null>(null);
  const [isEditProgramModalOpen, setIsEditProgramModalOpen] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null);
  const [editProgramForm, setEditProgramForm] = useState({ title: '', programType: '', objective: '', scopeDescription: '', plannedStartDate: '', plannedEndDate: '' });
  // Data for selects
  const [users, setUsers] = useState<any[]>([]);
  const [glpiUsers, setGlpiUsers] = useState<any[]>([]);
  const [externalParticipants, setExternalParticipants] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [missionTickets, setMissionTickets] = useState<any[]>([]);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [conclusionText, setConclusionText] = useState('');
  const [isConclusionSubmitted, setIsConclusionSubmitted] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  const fetchMission = () => {
    apiFetch(`${API_BASE}/missions/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement de la mission');
        return res.json();
      })
      .then(data => {
        setMission(data);
        setConclusionText(data.conclusion || '');
        setIsConclusionSubmitted(!!data.conclusion);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };
  const fetchRecommendations = async () => {
    if (!userPerms.includes('recommendation:read')) return;
    try {
      const res = await apiFetch(`${API_BASE}/recommendations/mission/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setRecommendations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMissionTickets = async () => {
    if (!userPerms.includes('glpi:read')) return;
    try {
      const res = await apiFetch(`${API_BASE}/missions/${id}/tickets`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setMissionTickets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const userPerms = (user?.permissions ?? []).map((p: string) => p.toLowerCase());
  const canAssignMembers = userPerms.includes('audit_mission:assign');

  useEffect(() => {
    fetchMission();
    fetchRecommendations();
    fetchMissionTickets();

    // 🔒 Chargement des listes d'enrichissement uniquement si nécessaire
    if (canAssignMembers) {
      apiFetch(`${API_BASE}/users`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setUsers(data);
        })
        .catch(() => {});

      apiFetch(`${API_BASE}/glpi/users`)
        .then(res => {
          if (!res.ok) return [];
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setGlpiUsers(data);
        })
        .catch(() => {});

      apiFetch(`${API_BASE}/missions/external-participants`)
        .then(res => {
          if (!res.ok) return [];
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) setExternalParticipants(data);
        })
        .catch(() => {});

      apiFetch(`${API_BASE}/referential/auditable-entities`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setEntities(data);
        })
        .catch(() => {});
    }
  }, [id, canAssignMembers]);

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
      const payload: any = {
        memberType: memberForm.memberType,
        roleInMission: memberForm.roleInMission,
        isLead: memberForm.isLead,
        notes: memberForm.notes
      };

      if (memberForm.memberType === 'INTERNAL_USER') {
        payload.userId = memberForm.userId;
      }

      if (memberForm.memberType === 'GLPI_USER') {
        payload.glpiUserId = memberForm.glpiUserId;
      }

      if (memberForm.memberType === 'EXTERNAL_PARTICIPANT') {
        if (memberForm.externalParticipantId) {
          payload.externalParticipantId = memberForm.externalParticipantId;
        } else {
          payload.externalParticipant = {
            fullName: memberForm.externalFullName,
            email: memberForm.externalEmail,
            phone: memberForm.externalPhone,
            organization: memberForm.externalOrganization,
            title: memberForm.externalTitle,
            notes: memberForm.notes,
          };
        }
      }

      const response = await apiFetch(`${API_BASE}/missions/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setIsMemberModalOpen(false);
        setMemberForm({
          memberType: 'INTERNAL_USER',
          userId: '',
          glpiUserId: '',
          externalParticipantId: '',
          externalFullName: '',
          externalEmail: '',
          externalPhone: '',
          externalOrganization: '',
          externalTitle: '',
          roleInMission: '',
          isLead: false,
          notes: ''
        });
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

  const getMemberDisplayName = (member: MissionMember) => {
    if (member.user) {
      return `${member.user.firstName} ${member.user.lastName}`;
    }
    if (member.glpiUser) {
      return member.glpiUser.fullName || member.glpiUser.email || 'Utilisateur GLPI';
    }
    if (member.externalParticipant) {
      return member.externalParticipant.fullName;
    }
    return 'Membre';
  };

  const getMemberDisplayEmail = (member: MissionMember) => {
    if (member.user?.email) return member.user.email;
    if (member.glpiUser?.email) return member.glpiUser.email;
    if (member.externalParticipant?.email) return member.externalParticipant.email;
    return null;
  };

  const handleAddScope = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingScope
        ? `${API_BASE}/missions/scopes/${editingScope.id}`
        : `${API_BASE}/missions/${id}/scopes`;
      const method = editingScope ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scopeForm),
      });
      if (response.ok) {
        setIsScopeModalOpen(false);
        setScopeForm({ auditableEntityId: '', scopeRole: '', criticality: '', notes: '' });
        setEditingScope(null);
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la sauvegarde du périmètre');
      }
    } catch (error) {
      console.error('Failed to save scope', error);
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
        setProgramForm({ code: '', title: '', programType: '', objective: '', scopeDescription: '', plannedStartDate: '', plannedEndDate: '' });
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la création du programme');
      }
    } catch (error) {
      console.error('Failed to create program', error);
    }
  };

  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgramId) return;
    try {
      const response = await apiFetch(`${API_BASE}/programs/${editingProgramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProgramForm),
      });
      if (response.ok) {
        setIsEditProgramModalOpen(false);
        setEditingProgramId(null);
        setEditProgramForm({ title: '', programType: '', objective: '', scopeDescription: '', plannedStartDate: '', plannedEndDate: '' });
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la modification du programme');
      }
    } catch (error) {
      console.error('Failed to update program', error);
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

  const handleOpenAddScopeModal = () => {
    setEditingScope(null);
    setScopeForm({
      auditableEntityId: '',
      scopeRole: '',
      criticality: '',
      notes: ''
    });
    setIsScopeModalOpen(true);
  };

  const handleEditScope = (scope: MissionScope) => {
    setEditingScope(scope);
    setScopeForm({
      auditableEntityId: scope.auditableEntity.id.toString(),
      scopeRole: scope.scopeRole || '',
      criticality: scope.criticality || '',
      notes: scope.notes || ''
    });
    setIsScopeModalOpen(true);
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

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm('Supprimer ce document ?')) return;

    try {
      const res = await apiFetch(`${API_BASE}/documents/${docId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erreur suppression');
        return;
      }

      fetchMission(); // refresh

    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveScope = async (scopeId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer cette entité du périmètre ?')) return;
    try {
      const response = await apiFetch(`${API_BASE}/missions/${id}/scopes/${scopeId}`, {
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
  //const currentAction = missionTransitions[mission.status];
  const currentActions = missionTransitions[mission.status] || [];
  // Permissions granulaires par action/étape
  const isSecretary = userPerms.includes('audit_mission:intake') && !userPerms.includes('audit_mission:enrich');
  const canLaunchMission = !isSecretary && (user?.permissions?.includes('audit_mission:launch') ?? false) && (
    userPerms.includes('audit_mission:enrich') ||
    mission.leader?.id === user?.id ||
    mission.members.some(m => m.user?.id === user?.id)
  );
  const canApproveMission = user?.permissions?.includes('audit_mission:approve') ?? false;
  const canSubmitReview = user?.permissions?.includes('audit_mission:submit_review') ?? false;
  const canRollbackMission = user?.permissions?.includes('audit_mission:rollback') ?? false;
  const canDeleteMission = user?.permissions?.includes('audit_mission:delete') ?? false;
  const canCancelMission = user?.permissions?.includes('audit_mission:cancel') ?? false;

  // Map action.next à la permission requise
  const actionPermissionMap: Record<string, boolean> = {
    'READY': canLaunchMission, // ou une permission dédiée pour finaliser cadrage
    'IN_PROGRESS': canLaunchMission,
    'UNDER_REVIEW': canSubmitReview,
    'APPROVED': canApproveMission,
    'CLOSED': canApproveMission, // ou une permission dédiée si besoin
    'PLANNED': canRollbackMission,
    'CANCELLED': canCancelMission || canDeleteMission,
  };

  // Affichage dynamique selon la permission requise pour chaque action
  const visibleActions = currentActions.filter(action => {
    const perm = actionPermissionMap[action.next];
    return perm === undefined ? false : perm;
  });
  const canCreateFinding = mission.status === 'IN_PROGRESS' && userPerms.includes('finding:create');
  const canViewReport = !isSecretary && ['UNDER_REVIEW', 'APPROVED', 'CLOSED'].includes(mission.status) && (
    userPerms.includes('audit_mission:enrich') ||
    mission.leader?.id === user?.id ||
    mission.members.some(m => m.user?.id === user?.id)
  );
  const prepPhase = mission.preparation?.phase;
  const canAssign = userPerms.includes('audit_mission:assign');
  const canEditCadrage = ['PLANNED', 'READY'].includes(mission.status) && canAssign;
  const canCreateRecommendation = mission.status === 'IN_PROGRESS' && userPerms.includes('recommendation:create');
  const canSeeOrderMission =
    userPerms.includes('audit_mission:enrich') ||
    mission.leader?.id === user?.id ||
    mission.members.some(m => m.user?.id === user?.id);
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
    
    if (nextStatus === 'CANCELLED') {
      return true;
    }

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
    }
  };


  const handleDownloadMissionOrder = async () => {
    try {
      setGeneratingOrder(true);

      console.log('🚀 Download mission order start', { id });

      const res = await apiFetch(`${API_BASE}/missions/${id}/order`);

      console.log('📡 Response status:', res.status);

      if (!res.ok) {
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch (e) {
          console.warn('⚠️ Failed to parse error JSON');
        }

        console.error('❌ API Error:', {
          status: res.status,
          error: errorData,
        });

        alert(errorData.error || "Erreur lors de la génération de l'ordre de mission");
        return;
      }

      const blob = await res.blob();

      console.log('📦 Blob size:', blob.size);

      if (!blob || blob.size === 0) {
        console.error('❌ Empty PDF received');
        //alert("Le fichier généré est vide");
        return;
      }

      const url = window.URL.createObjectURL(blob);

      console.log('🔗 Blob URL created:', url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `ordre-mission-${id}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      console.log('✅ Download triggered');

    } catch (err: any) {
      console.error('💥 Front error:', {
        message: err?.message,
        stack: err?.stack,
      });

      alert("Erreur lors de la génération de l'ordre de mission");
    } finally {
      setGeneratingOrder(false);
    }
  };

  const canRequestApproval =
  mission.status === 'UNDER_REVIEW' &&
  !mission.approvals?.some(a => a.decision === 'APPROVED');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 bg-slate-50 dark:bg-slate-900 px-6 lg:px-0 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8">
        <Link to="/missions" className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          <span>Retour aux missions</span>
        </Link>
        <div className="sm:flex sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tighter text-slate-900 dark:text-white">{mission.title}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-x-3">
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl">
                Plan {mission.plan?.year ?? '—'}
              </span>
              {mission.auditType ? (
                <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl">Type: {mission.auditType.name}</span>
              ) : null}
              <span className="inline-flex items-center text-slate-400 dark:text-slate-500">•</span>
              <span className="font-medium">Chef de mission :</span> {mission.leader ? `${mission.leader.firstName} ${mission.leader.lastName}` : 'Non assigné'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
              {mission.startDate && (
                <span className="flex items-center">
                  <span className="font-medium mr-2">Début :</span>
                  {new Date(mission.startDate).toLocaleDateString('fr-FR')}
                </span>
              )}
              {mission.endDate && (
                <span className="flex items-center">
                  <span className="font-medium mr-2">Fin :</span>
                  {new Date(mission.endDate).toLocaleDateString('fr-FR')}
                </span>
              )}
              {!mission.startDate && !mission.endDate && (
                <span className="text-slate-400 italic">Pas de dates définies</span>
              )}
            </div>
            {/* Infos complémentaires */}
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              {mission.description && (
                <p className="line-clamp-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Description :</span> {mission.description}
                </p>
              )}
              {mission.objective && (
                <p className="line-clamp-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Objectif :</span> {mission.objective}
                </p>
              )}
              {mission.scopeDescription && (
                <p className="line-clamp-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Périmètre :</span> {mission.scopeDescription}
                </p>
              )}
              {mission.methodology && (
                <p className="line-clamp-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Méthodologie :</span> {mission.methodology}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 sm:mt-0 flex items-center gap-x-3">
            {/* Badge statut (lecture seule) */}
            <span className={`inline-flex items-center px-4 py-1.5 rounded-3xl text-sm font-semibold shadow-sm ring-1 ring-offset-2 ring-slate-100 ${statusConf.color} transition-all duration-200`}>
              {statusConf.label}
            </span>
            {/* Action contextuelle */}
            {/* {currentAction && (
              <button
                onClick={() => {
                  setIsActionModalOpen(true);
                }}
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
            )} */}
            {visibleActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedAction(action);
                  setIsActionModalOpen(true);
                }}
                disabled={!isActionAllowed(action.next)}
                className={`inline-flex items-center px-6 py-3 rounded-3xl text-sm font-semibold text-white shadow-lg transition-all duration-200
                  ${
                    action.next === 'CANCELLED'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
            {/* Rapport */}
            {canViewReport && (
              <Link
                to={`/missions/${id}/report`}
                className="inline-flex items-center px-6 py-3 border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 rounded-3xl text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              >
                Voir le rapport
              </Link>
            )}
            {/* Ordre de Mission */}
            {canSeeOrderMission && (
            <button
              onClick={handleDownloadMissionOrder}
              disabled={generatingOrder}
              className="inline-flex items-center gap-2 px-6 py-3 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-600 rounded-3xl text-sm font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm hover:shadow transition-all duration-200 active:scale-[0.97] bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-60 disabled:cursor-wait"
              title="Télécharger l'ordre de mission en PDF"
            >
              <ScrollText className="h-4 w-4" />
              {generatingOrder ? 'Génération…' : 'Ordre de mission'}
            </button>
            )}
          </div>
        </div>
      </div>
      <div className="mb-8">
        <MissionPreparationPanel mission={mission as any} onUpdated={fetchMission} />
      </div>
      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-3xl shadow-sm px-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`${activeTab === 'members'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <Users className="w-4 h-4 mr-2" />
            Membres ({mission.members.length})
          </button>
          <button
            onClick={() => setActiveTab('scopes')}
            className={`${activeTab === 'scopes'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <Target className="w-4 h-4 mr-2" />
            Périmètre ({mission.scopes.length})
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`${activeTab === 'programs'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Programmes ({mission.programs?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`${activeTab === 'details'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Détails & Constats
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`${activeTab === 'recommendations'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            Recommandations ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`${activeTab === 'tickets'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <Ticket className="w-4 h-4 mr-2" />
            Tickets GLPI ({missionTickets.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${activeTab === 'history'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Historique
          </button>
          <button
            onClick={() => setActiveTab('hierarchy-comments')}
            className={`${activeTab === 'hierarchy-comments'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              } whitespace-nowrap py-5 px-1 border-b-2 font-semibold text-sm flex items-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500`}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Commentaires hiérarchiques
          </button>
        </nav>
      </div>
      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 space-y-8">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-x-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  Description
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{mission.description}</p>
              </div>
              {mission.objective && (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Objectif
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{mission.objective}</p>
                </div>
              )}
              {mission.scopeDescription && (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Description du périmètre
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{mission.scopeDescription}</p>
                </div>
              )}
              {mission.methodology && (
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-x-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Méthodologie
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{mission.methodology}</p>
                </div>
              )}
            </div>
            {/* Findings Section */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 sm:flex sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-white flex items-center">
                    <FileText className="w-6 h-6 mr-3 text-indigo-500" />
                    Constats d'audit
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
                      className="inline-flex items-center bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 px-6 py-3 rounded-3xl cursor-not-allowed font-semibold shadow-sm"
                    >
                      + Nouveau constat
                    </button>
                  )}
                </div>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {mission.findings.length === 0 ? (
                  <li className="px-8 py-12 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center">
                    <FileText className="w-8 h-8 mb-3 text-slate-300 dark:text-slate-600" />
                    Aucun constat n'a encore été enregistré pour cette mission.
                  </li>
                ) : (
                  mission.findings.map((finding) => {
                    const statusConf = findingStatusConfig[finding.status] || findingStatusConfig.DRAFT;
                    return (
                      <li key={finding.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200">
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
                                <p className="flex items-center text-sm text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                                  {finding.description.substring(0, 100)}
                                  {finding.description.length > 100 ? '...' : ''}
                                </p>
                              </div>
                              <div className="mt-3 flex items-center text-sm text-slate-500 dark:text-slate-400 sm:mt-0 sm:ml-6 font-medium">
                                <p>
                                  {finding._count.recos} recommandation(s)
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-6 flex-shrink-0">
                            <Link
                              to={`/findings/${finding.id}`}
                              className="px-4 py-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors rounded-2xl hover:bg-white dark:hover:bg-slate-700 shadow-sm inline-flex items-center gap-2"
                            >
                              <span>Voir détails</span>
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
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center">
                <Paperclip className="w-6 h-6 mr-3 text-indigo-500" />
                Documents ({mission.documents?.length || 0})
              </h3>
              {!mission.documents || mission.documents.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic mb-6 flex items-center gap-x-2">
                  <Paperclip className="w-4 h-4 dark:text-slate-500" />
                  Aucun document attaché.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700 mb-8">
                  {mission.documents.map(doc => (
                    <li key={doc.id} className="py-4 flex items-center justify-between group">
                    <div className="flex items-center min-w-0">
                      <Paperclip className="h-4 w-4 text-slate-400 dark:text-slate-500 mr-3" />
                      {/* <a
                        href={`${API_BASE}/documents/download/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-slate-700 hover:text-indigo-600 truncate"
                      >
                        {doc.originalName}
                      </a> */}
                      <button
                        onClick={() => handleDownload(doc.id, doc.originalName)}
                        className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
                      >
                        {doc.originalName}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {(doc.sizeBytes / 1024).toFixed(1)} KB
                      </span>

                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                  className="w-full inline-flex justify-center items-center px-6 py-4 border border-slate-200 dark:border-slate-600 shadow-sm text-sm font-semibold rounded-3xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-all duration-200 active:scale-[0.97]"
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
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3 text-indigo-500" />
                  Approbations ({mission.approvals?.length || 0})
                </h3>
                <button
                  onClick={handleRequestMissionApproval}
                  disabled={!canRequestApproval}
                  className={`text-sm font-semibold px-4 py-2 rounded-3xl transition-all duration-200
                  ${
                    canRequestApproval
                      ? 'text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                      : 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  + Demander
                </button>
              </div>
              {!mission.approvals || mission.approvals.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic mb-6">Aucune approbation.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700 mb-6">
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
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {approval.approver
                              ? `${approval.approver.firstName} ${approval.approver.lastName}`
                              : 'En attente de validation'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(approval.createdAt).toLocaleDateString()} — {approval.decision}
                          </p>
                        </div>
                      </div>
                      {/* 🔥 ACTION */}
                      {approval.decision === 'PENDING' && user?.permissions?.includes('audit_mission:approve') && (
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
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-white">Membres de la mission</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gérez l'équipe affectée à cette mission d'audit.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsMemberModalOpen(true)}
                disabled={!canEditCadrage}
                className={`inline-flex items-center px-6 py-3 rounded-3xl font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${canEditCadrage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-xl'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Ajouter un membre
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {mission.members.length === 0 ? (
              <li className="px-8 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Aucun membre affecté.</li>
            ) : (
              mission.members.map(member => (
                <li key={member.id} className="px-8 py-6 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-900 dark:text-white flex items-center">
                      {getMemberDisplayName(member)}
                      {member.isLead && <span className="ml-3 px-3 py-0.5 rounded-3xl text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">Lead</span>}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-px">
                      {getMemberDisplayEmail(member) ? `${getMemberDisplayEmail(member)} • ` : ''}
                      Rôle: {member.roleInMission}
                    </p>
                    {member.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">Notes: {member.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={!canEditCadrage}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Retirer de la mission
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {activeTab === 'scopes' && (
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-white">Périmètre de la mission</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Entités auditables concernées par cette mission.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleOpenAddScopeModal}
                disabled={!canEditCadrage}
                className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${canEditCadrage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-xl'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Ajouter au périmètre
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {mission.scopes.length === 0 ? (
              <li className="px-8 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Aucune entité dans le périmètre.</li>
            ) : (
              mission.scopes.map(scope => (
                <li key={scope.id} className="px-8 py-6 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {scope.auditableEntity.name} <span className="text-slate-400 dark:text-slate-500 font-normal">({scope.auditableEntity.code})</span>
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Type: {scope.auditableEntity.entityType}
                      {scope.scopeRole ? ` • Rôle: ${scope.scopeRole}` : ''}
                      {scope.criticality ? ` • Criticité: ${getCriticalityLabel(scope.criticality)}` : ''}
                    </p>
                    {scope.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic">
                        "{scope.notes}"
                      </p>
                    )}
                    {scope.addedBy && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Ajouté par {scope.addedBy.firstName} {scope.addedBy.lastName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditScope(scope)}
                      disabled={!canEditCadrage}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleRemoveScope(scope.id)}
                      disabled={!canEditCadrage}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Retirer du périmètre
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      {activeTab === 'programs' && (
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-white">Programmes d'audit</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gérez les programmes et procédures d'audit pour cette mission.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsProgramModalOpen(true)}
                disabled={!canEditCadrage}
                className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${canEditCadrage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-xl'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Nouveau programme
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {!mission.programs || mission.programs.length === 0 ? (
              <li className="px-8 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Aucun programme d'audit défini.</li>
            ) : (
              mission.programs.map(program => (
                <li
                  key={program.id}
                  className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200 group"
                >
                  {/* LEFT */}
                  <div>
                    <Link
                      to={`/programs/${program.id}`}
                      className="text-base font-semibold text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors"
                    >
                      {program.title}
                    </Link>
                    <div className="flex items-center mt-3 space-x-6 text-sm text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center px-4 py-1 rounded-3xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all group-hover:bg-slate-200 dark:group-hover:bg-slate-600">
                        {programStatusConfig[program.status] ?? program.status}
                      </span>
                      <span className="font-medium">{program._count.procedures} procédure(s)</span>
                    </div>
                  </div>
                  {/* RIGHT */}
                  <div className="flex items-center gap-x-4">
                                        {program.status === 'DRAFT' && (
                      <button
                        onClick={() => handleRequestProgramApproval(program.id)}
                        className="text-sm px-5 py-2.5 rounded-3xl font-medium shadow-sm transition-all duration-200 active:scale-95 bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Demander validation
                      </button>
                    )}
                    {canEditCadrage && (
                      <button
                        onClick={() => {
                          setEditingProgramId(program.id);
                          setEditProgramForm({
                            title: program.title ?? '',
                            programType: program.programType ?? '',
                            objective: program.objective ?? '',
                            scopeDescription: program.scopeDescription ?? '',
                            plannedStartDate: program.plannedStartDate ? program.plannedStartDate.slice(0, 10) : '',
                            plannedEndDate: program.plannedEndDate ? program.plannedEndDate.slice(0, 10) : '',
                          });
                          setIsEditProgramModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-3xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 font-medium transition-all duration-200 active:scale-95"
                      >
                        <Edit2 className="w-4 h-4" />
                        Modifier
                      </button>
                    )}
                    <Link
                      to={`/programs/${program.id}`}
                      className="px-4 py-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors rounded-2xl hover:bg-white shadow-sm inline-flex items-center gap-2"
                    >
                      <span>Voir détails</span>
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
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-white">Historique des statuts</h3>
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
                          <span className="h-8 w-8 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shadow-inner">
                            <Clock className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Statut changé à <span className="font-semibold text-slate-900 dark:text-white">{missionStatusConfig[history.newStatus]?.label || history.newStatus}</span>
                              {history.changedBy && ` par ${history.changedBy.firstName} ${history.changedBy.lastName}`}
                            </p>
                            {history.reason && (
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">"{
                                history.reason.replace(
                                  /Transition automatique vers (\w+)/,
                                  (_, s) => `Transition automatique vers ${missionStatusConfig[s]?.label ?? s}`
                                )
                              }"</p>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-slate-500 dark:text-slate-400 flex flex-col items-end gap-3">
                            {new Date(history.changedAt).toLocaleString('fr-FR')}
                            <div className="flex items-center gap-3">
                              {/* Boutons désactivés */}
                              <button disabled className="text-slate-200 cursor-not-allowed p-1">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button disabled className="text-slate-200 cursor-not-allowed p-1">
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
        {activeTab === 'hierarchy-comments' && (
          <HierarchyCommentTabs contextType="MISSION" contextId={mission.id} />
        )}
      {activeTab === 'recommendations' && (
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-3xl p-8 space-y-6 hover:shadow-xl transition-all duration-300">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
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
                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
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
          
          {/* Bloc Conclusion */}
          {userPerms.includes('audit_mission:update') && (
          <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-3xl border border-indigo-100 dark:border-indigo-900">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-indigo-500" />
              Conclusion de la mission
            </h4>
            <textarea
              value={conclusionText}
              onChange={(e) => setConclusionText(e.target.value)}
              rows={6}
              className={`w-full p-4 rounded-2xl border-2 focus:ring-2 focus:ring-indigo-200 resize-vertical shadow-sm transition-all duration-200 ${
                mission.status === 'IN_PROGRESS' && !isConclusionSubmitted
                  ? 'border-indigo-300 dark:border-indigo-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:outline-none'
                  : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 dark:text-slate-400 cursor-not-allowed'
              }`}
              placeholder="Saisissez la conclusion générale de la mission d'audit..."
              disabled={mission.status !== 'IN_PROGRESS' || isConclusionSubmitted}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={async () => {
                  if (!conclusionText.trim()) return alert('Conclusion requise');
                  try {
                    const res = await apiFetch(`${API_BASE}/missions/${id}/conclusion`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ conclusion: conclusionText })
                    });
                    if (res.ok) {
                      setIsConclusionSubmitted(true);
                      fetchMission();
                      alert('Conclusion soumise');
                    } else {
                      const err = await res.json();
                      alert(err.error);
                    }
                  } catch (err) {
                    alert('Erreur soumission');
                  }
                }}
                disabled={mission.status !== 'IN_PROGRESS' || isConclusionSubmitted || !conclusionText.trim()}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.97]"
              >
                Soumettre la conclusion
              </button>
              <button
                onClick={() => {
                  setIsConclusionSubmitted(false);
                }}
                disabled={!isConclusionSubmitted || mission.status !== 'IN_PROGRESS'}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all disabled:bg-slate-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.97]"
              >
                Modifier la conclusion
              </button>
            </div>
          </div>
          )}

        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-white">Tickets GLPI liés</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tickets rattachés via les recommandations de cette mission.
            </p>
          </div>

          {missionTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
              Aucun ticket GLPI lié à cette mission.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wide">
                <tr>
                  <th className="p-4 text-left">N° Ticket</th>
                  <th className="p-4 text-left">Titre</th>
                  <th className="p-4 text-left">Statut</th>
                  <th className="p-4 text-left">Priorité</th>
                  <th className="p-4 text-left">Demandeur</th>
                  <th className="p-4 text-left">Assigné à</th>
                  <th className="p-4 text-left">Constat</th>
                  <th className="p-4 text-left">Recommandation</th>
                </tr>
              </thead>
              <tbody>
                {missionTickets.map((link: any) => {
                  const t = link.ticket;
                  const statusColors: Record<string, string> = {
                    OPEN: 'bg-blue-100 text-blue-800',
                    PENDING: 'bg-amber-100 text-amber-800',
                    SOLVED: 'bg-emerald-100 text-emerald-800',
                    CLOSED: 'bg-slate-100 text-slate-800',
                    ASSIGNED: 'bg-indigo-100 text-indigo-800',
                    PLANNED: 'bg-purple-100 text-purple-800',
                  };
                  return (
                    <tr key={link.id} className="border-t dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="p-4 font-mono text-slate-700 dark:text-slate-300">
                        {t?.ticketNumber || t?.glpiId || '-'}
                      </td>
                      <td className="p-4 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                        {t?.title || '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[t?.status] || 'bg-slate-100 text-slate-700'}`}>
                          {t?.status || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">{t?.priority || '-'}</td>
                      <td className="p-4 text-slate-600">{t?.requesterGlpiUser?.fullName || '-'}</td>
                      <td className="p-4 text-slate-600">{t?.assigneeGlpiUser?.fullName || '-'}</td>
                      <td className="p-4 text-slate-600 max-w-[150px] truncate" title={link.recommendation?.finding?.title}>
                        {link.recommendation?.finding?.title || '-'}
                      </td>
                      <td className="p-4 text-slate-600 max-w-[150px] truncate" title={link.recommendation?.title}>
                        {link.recommendation?.title || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
      {isActionModalOpen && selectedAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
              {selectedAction?.label}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Cette action va changer le statut de la mission.
            </p>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Commentaire obligatoire..."
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-300 rounded-3xl p-4 text-sm mb-8 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all resize-y min-h-[120px]"
              required
            />
            <div className="flex justify-end gap-x-3">
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="px-6 py-3 border border-slate-200 dark:border-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 rounded-3xl font-medium transition-all duration-200"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!actionReason.trim()) {
                    alert('Le commentaire est obligatoire');
                    return;
                  }
                  await handleQuickStatusChange(selectedAction?.next);
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
            <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 px-8 py-6 border-b border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-600 text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Ajouter un membre</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Affectez rapidement un collaborateur avec son rôle et des notes utiles.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddMember} className="px-8 py-6 space-y-6">
                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Type de membre *</label>
                    <select
                      value={memberForm.memberType}
                      onChange={(e) =>
                        setMemberForm({
                          ...memberForm,
                          memberType: e.target.value,
                          userId: '',
                          glpiUserId: '',
                          externalParticipantId: '',
                          externalFullName: '',
                          externalEmail: '',
                          externalPhone: '',
                          externalOrganization: '',
                          externalTitle: ''
                        })
                      }
                      className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                      required
                    >
                      <option value="INTERNAL_USER">Utilisateur interne</option>
                      <option value="GLPI_USER">Utilisateur GLPI</option>
                      <option value="EXTERNAL_PARTICIPANT">Participant externe</option>
                    </select>
                  </div>

                  {memberForm.memberType === 'INTERNAL_USER' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Utilisateur *</label>
                      <select
                        value={memberForm.userId}
                        onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
                        className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                        required
                      >
                        <option value="">Sélectionner un utilisateur</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sélectionnez l'utilisateur interne à ajouter à la mission.</p>
                    </div>
                  )}

                  {memberForm.memberType === 'GLPI_USER' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Utilisateur GLPI *</label>
                      <select
                        value={memberForm.glpiUserId}
                        onChange={(e) => setMemberForm({ ...memberForm, glpiUserId: e.target.value })}
                        className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                        required
                      >
                        <option value="">Sélectionner un utilisateur GLPI</option>
                        {glpiUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.fullName || u.email || `GLPI#${u.id}`}</option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sélectionnez un utilisateur référencé depuis GLPI.</p>
                    </div>
                  )}

                  {memberForm.memberType === 'EXTERNAL_PARTICIPANT' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Participant externe existant</label>
                        <select
                          value={memberForm.externalParticipantId}
                          onChange={(e) => setMemberForm({ ...memberForm, externalParticipantId: e.target.value })}
                          className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="">Nouveau participant externe</option>
                          {externalParticipants.map(p => (
                            <option key={p.id} value={p.id}>{p.fullName}</option>
                          ))}
                        </select>
                      </div>

                      {!memberForm.externalParticipantId && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Nom complet *</label>
                            <input
                              type="text"
                              value={memberForm.externalFullName}
                              onChange={(e) => setMemberForm({ ...memberForm, externalFullName: e.target.value })}
                              className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Email</label>
                            <input
                              type="email"
                              value={memberForm.externalEmail}
                              onChange={(e) => setMemberForm({ ...memberForm, externalEmail: e.target.value })}
                              className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Téléphone</label>
                            <input
                              type="text"
                              value={memberForm.externalPhone}
                              onChange={(e) => setMemberForm({ ...memberForm, externalPhone: e.target.value })}
                              className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Organisation</label>
                            <input
                              type="text"
                              value={memberForm.externalOrganization}
                              onChange={(e) => setMemberForm({ ...memberForm, externalOrganization: e.target.value })}
                              className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Fonction</label>
                            <input
                              type="text"
                              value={memberForm.externalTitle}
                              onChange={(e) => setMemberForm({ ...memberForm, externalTitle: e.target.value })}
                              className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sélectionnez la source du membre à ajouter à la mission.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Rôle dans la mission *</label>
                    <input
                      type="text"
                      value={memberForm.roleInMission}
                      onChange={(e) => setMemberForm({ ...memberForm, roleInMission: e.target.value })}
                      className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Ex: Auditeur IT, Expert métier..."
                      required
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Exemple : Auditeur IT, Expert métier, Responsable qualité.</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-5 py-4">
                    <label className="flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <input
                        id="isLead"
                        type="checkbox"
                        checked={memberForm.isLead}
                        onChange={(e) => setMemberForm({ ...memberForm, isLead: e.target.checked })}
                        className="h-5 w-5 rounded-2xl border-slate-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 transition-all"
                      />
                      <span>Est un lead (co-responsable)</span>
                    </label>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Cochez si ce membre est responsable de la mission avec vous.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Notes</label>
                    <textarea
                      rows={4}
                      value={memberForm.notes}
                      onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                      className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-4 text-sm text-slate-900 dark:text-white shadow-sm transition-all duration-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 resize-y"
                      placeholder="Précisez des informations utiles : disponibilité, rôle précis, contraintes..."
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Cette note est visible uniquement dans le contexte de la mission.</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="inline-flex w-full justify-center rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 sm:w-auto"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all duration-200 active:scale-[0.97] sm:w-auto"
                  >
                    Ajouter
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
            <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/60 dark:to-emerald-900/30 px-8 py-6 border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{editingScope ? 'Modifier le périmètre' : 'Ajouter au périmètre'}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{editingScope ? 'Modifier les détails de cette entité dans le périmètre' : 'Définir une nouvelle entité dans le périmètre d\'audit'}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddScope} className="px-8 py-6">
                {/* Section principale */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Entité auditable */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Entité auditable <span className="text-red-500">*</span>
                      </label>
                      <ComboBox
                        options={entities.map(e => ({
                          label: `${e.name} (${e.code}) - ${e.entityType}`,
                          value: String(e.id)
                        }))}
                        value={scopeForm.auditableEntityId}
                        onChange={val => setScopeForm({ ...scopeForm, auditableEntityId: val })}
                        placeholder="Rechercher une entité..."
                        required
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Choisissez l'entité qui sera incluse dans le périmètre d'audit</p>
                    </div>

                    {/* Rôle dans le périmètre */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Rôle dans le périmètre
                      </label>
                      <input
                        type="text"
                        value={scopeForm.scopeRole}
                        onChange={(e) => setScopeForm({ ...scopeForm, scopeRole: e.target.value })}
                        placeholder="Ex: Entité principale, Support, Interface..."
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 hover:border-slate-300 dark:hover:border-slate-500"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Précisez le rôle de cette entité dans l'audit</p>
                    </div>

                    {/* Criticité */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Niveau de criticité
                      </label>
                      <select
                        value={scopeForm.criticality}
                        onChange={(e) => setScopeForm({ ...scopeForm, criticality: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 hover:border-slate-300 dark:hover:border-slate-500"
                      >
                        <option value="">Sélectionner un niveau</option>
                        <option value="LOW">🟢 Faible - Impact limité</option>
                        <option value="MEDIUM">🟡 Moyen - Impact modéré</option>
                        <option value="HIGH">🟠 Élevé - Impact significatif</option>
                        <option value="CRITICAL">🔴 Critique - Impact majeur</option>
                      </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Évaluez l'importance de cette entité</p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Notes
                    </label>
                    <textarea
                      rows={3}
                      value={scopeForm.notes}
                      onChange={(e) => setScopeForm({ ...scopeForm, notes: e.target.value })}
                      placeholder="Informations complémentaires sur cette entité dans le périmètre..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 hover:border-slate-300 dark:hover:border-slate-500 resize-y"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Ajoutez des notes spécifiques à cette entité dans le périmètre</p>
                  </div>

                  {/* Section informative */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex-shrink-0">
                        <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-1">À propos du périmètre</h4>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          Le périmètre définit les entités qui seront auditées. Chaque entité peut avoir un rôle spécifique
                          et un niveau de criticité qui influencera la planification et l'exécution de l'audit.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-slate-600 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsScopeModalOpen(false)}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingScope ? 'Modifier le périmètre' : 'Ajouter au périmètre'}
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
            <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 px-8 pt-8 pb-8 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <h3 className="text-xl font-semibold leading-6 text-slate-900 dark:text-white mb-6">Modifier l'historique</h3>
              <form onSubmit={handleUpdateHistory} className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Raison / Commentaire</label>
                  <textarea
                    rows={4}
                    value={historyForm.reason}
                    onChange={(e) => setHistoryForm({ ...historyForm, reason: e.target.value })}
                    className="mt-1 block w-full rounded-3xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 sm:text-sm p-4 transition-all"
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
                    className="mt-3 inline-flex w-full justify-center rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 sm:col-start-1 sm:mt-0 sm:text-sm transition-all duration-200"
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
            <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">

              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 px-8 py-6 border-b border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Nouveau programme d'audit</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Définir un programme structuré pour cette mission</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateProgram} className="px-8 py-6">
                <div className="space-y-6">

                  {/* Code + Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: PROG-2026-001"
                        value={programForm.code}
                        onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                      />
                      <p className="text-xs text-slate-500 mt-2">Identifiant unique du programme dans le tenant</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Type de programme <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={programForm.programType}
                        onChange={(e) => setProgramForm({ ...programForm, programType: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                      >
                        <option value="">Sélectionner un type</option>
                        <option value="COMPLIANCE">✅ Conformité</option>
                        <option value="ITGC">🖥️ Contrôles IT généraux (ITGC)</option>
                        <option value="IT_SECURITY">🛡️ IT & Sécurité</option>
                        <option value="FINANCIAL">💰 Financier</option>
                        <option value="OPERATIONAL">⚙️ Opérationnel</option>
                        <option value="LOGISTICS">🚚 Logistique & Terrain</option>
                        <option value="REPUTATION">📰 Réputation</option>
                        <option value="HR">👥 Ressources Humaines</option>
                        <option value="SUPPLY_CHAIN">📦 Stock & Supply Chain</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-2">Détermine la nature des procédures d'audit</p>
                    </div>
                  </div>

                  {/* Titre */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Titre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Programme d'audit des contrôles financiers 2026"
                      value={programForm.title}
                      onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Nom clair et descriptif du programme</p>
                  </div>

                  {/* Objectif */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Objectif
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Décrivez l'objectif principal de ce programme d'audit..."
                      value={programForm.objective}
                      onChange={(e) => setProgramForm({ ...programForm, objective: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 resize-y"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Ce que ce programme cherche à évaluer ou vérifier</p>
                  </div>

                  {/* Périmètre */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Périmètre (Scope)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Décrivez les entités, processus ou systèmes couverts par ce programme..."
                      value={programForm.scopeDescription}
                      onChange={(e) => setProgramForm({ ...programForm, scopeDescription: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 resize-y"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Définissez les limites et l'étendue de l'audit</p>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Date de début planifiée
                      </label>
                      <input
                        type="date"
                        value={programForm.plannedStartDate}
                        onChange={(e) => setProgramForm({ ...programForm, plannedStartDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Début prévu de l'exécution du programme</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Date de fin planifiée
                      </label>
                      <input
                        type="date"
                        value={programForm.plannedEndDate}
                        onChange={(e) => setProgramForm({ ...programForm, plannedEndDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Fin prévue de l'exécution du programme</p>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-1">À propos du programme d'audit</h4>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                          Un programme d'audit regroupe les procédures à exécuter pour cette mission.
                          Il sera versionné automatiquement à sa création et pourra être soumis à validation avant l'exécution.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-slate-600 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsProgramModalOpen(false)}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98]"
                  >
                    Créer le programme
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Modifier un programme d'audit */}
      {isEditProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsEditProgramModalOpen(false)} />
          <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 px-8 py-6 border-b border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full">
                  <Edit2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Modifier le programme d'audit</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Mettez à jour les informations du programme</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProgram} className="px-8 py-6">
              <div className="space-y-6">

                {/* Titre + Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Titre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editProgramForm.title}
                      onChange={(e) => setEditProgramForm({ ...editProgramForm, title: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Nom clair et descriptif du programme</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                      Type de programme <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={editProgramForm.programType}
                      onChange={(e) => setEditProgramForm({ ...editProgramForm, programType: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                    >
                      <option value="">Sélectionner un type</option>
                      <option value="COMPLIANCE">✅ Conformité</option>
                      <option value="ITGC">🖥️ Contrôles IT généraux (ITGC)</option>
                      <option value="IT_SECURITY">🛡️ IT & Sécurité</option>
                      <option value="FINANCIAL">💰 Financier</option>
                      <option value="OPERATIONAL">⚙️ Opérationnel</option>
                      <option value="LOGISTICS">🚚 Logistique & Terrain</option>
                      <option value="REPUTATION">📰 Réputation</option>
                      <option value="HR">👥 Ressources Humaines</option>
                      <option value="SUPPLY_CHAIN">📦 Stock & Supply Chain</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">Détermine la nature des procédures d'audit</p>
                  </div>
                </div>

                {/* Objectif */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Objectif</label>
                  <textarea
                    rows={3}
                    value={editProgramForm.objective}
                    onChange={(e) => setEditProgramForm({ ...editProgramForm, objective: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 resize-y"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Ce que ce programme cherche à évaluer ou vérifier</p>
                </div>

                {/* Périmètre */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Périmètre (Scope)</label>
                  <textarea
                    rows={3}
                    value={editProgramForm.scopeDescription}
                    onChange={(e) => setEditProgramForm({ ...editProgramForm, scopeDescription: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 resize-y"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Définissez les limites et l'étendue de l'audit</p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Date de début planifiée</label>
                    <input
                      type="date"
                      value={editProgramForm.plannedStartDate}
                      onChange={(e) => setEditProgramForm({ ...editProgramForm, plannedStartDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Date de fin planifiée</label>
                    <input
                      type="date"
                      value={editProgramForm.plannedEndDate}
                      onChange={(e) => setEditProgramForm({ ...editProgramForm, plannedEndDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-slate-600 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditProgramModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98]"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
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
