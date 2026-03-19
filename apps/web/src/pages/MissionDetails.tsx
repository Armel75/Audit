import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Plus, FileText, ChevronRight, Paperclip, Upload, Users, Target, Clock, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import FindingFormModal from '../components/FindingFormModal';
import { apiFetch } from '../lib/api';

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
    status: string;
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
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  IN_REVIEW: { label: 'En revue', color: 'bg-purple-100 text-purple-800' },
  VALIDATED: { label: 'Validée', color: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
};

export default function MissionDetails() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'members' | 'scopes' | 'programs' | 'history'>('details');
  
  // Modals state
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
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

  const fetchMission = () => {
    apiFetch(`/api/v1/missions/${id}`)
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

  useEffect(() => {
    fetchMission();
    
    // Fetch users for members modal
    apiFetch('/api/v1/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);
      
    // Fetch entities for scope modal
    apiFetch('/api/v1/referential/entities')
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
      const res = await apiFetch('/api/v1/documents/upload', {
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

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`/api/v1/missions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusForm),
      });
      
      if (response.ok) {
        setIsStatusModalOpen(false);
        fetchMission();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      console.error('Failed to change status', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`/api/v1/missions/${id}/members`, {
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
      const response = await apiFetch(`/api/v1/missions/members/${memberId}`, {
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
      const response = await apiFetch(`/api/v1/missions/${id}/scopes`, {
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
      const response = await apiFetch(`/api/v1/programs`, {
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

  const handleRemoveScope = async (scopeId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer cette entité du périmètre ?')) return;
    try {
      const response = await apiFetch(`/api/v1/missions/scopes/${scopeId}`, {
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
      const response = await apiFetch(`/api/v1/missions/history/${editingHistory.id}`, {
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
      const response = await apiFetch(`/api/v1/missions/history/${historyId}`, {
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
    return <div className="p-8 text-center text-slate-500">Chargement des détails de la mission...</div>;
  }

  if (error || !mission) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <h3 className="text-sm font-medium text-red-800">{error || 'Mission introuvable'}</h3>
          </div>
        </div>
        <Link to="/missions" className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux missions
        </Link>
      </div>
    );
  }

  const statusConf = missionStatusConfig[mission.status] || missionStatusConfig.PLANNED;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Link to="/missions" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux missions
        </Link>
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{mission.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Plan {mission.plan.year} {mission.auditType ? `• Type: ${mission.auditType.name}` : ''} • Chef de mission : {mission.leader.firstName} {mission.leader.lastName}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={() => {
                setStatusForm({ status: mission.status, reason: '' });
                setIsStatusModalOpen(true);
              }}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80 ${statusConf.color}`}
            >
              Statut : {statusConf.label}
            </button>
            <Link 
              to={`/missions/${id}/report`}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FileText className="-ml-1 mr-2 h-4 w-4 text-slate-500" />
              Voir le rapport
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`${
              activeTab === 'details'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Détails & Constats
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Users className="w-4 h-4 mr-2" />
            Membres ({mission.members.length})
          </button>
          <button
            onClick={() => setActiveTab('scopes')}
            className={`${
              activeTab === 'scopes'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Target className="w-4 h-4 mr-2" />
            Périmètre ({mission.scopes.length})
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`${
              activeTab === 'programs'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Programmes ({mission.programs?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Historique
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">Description</h3>
                <p className="text-sm text-slate-600">{mission.description}</p>
              </div>
              {mission.objective && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-1">Objectif</h3>
                  <p className="text-sm text-slate-600">{mission.objective}</p>
                </div>
              )}
              {mission.scopeDescription && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-1">Description du périmètre</h3>
                  <p className="text-sm text-slate-600">{mission.scopeDescription}</p>
                </div>
              )}
              {mission.methodology && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900 mb-1">Méthodologie</h3>
                  <p className="text-sm text-slate-600">{mission.methodology}</p>
                </div>
              )}
            </div>

            {/* Findings Section */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                    Constats d'audit
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Liste des constats relevés lors de cette mission.
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <button
                    type="button"
                    onClick={() => setIsFindingModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <Plus className="-ml-1 mr-2 h-4 w-4" />
                    Nouveau Constat
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-slate-200">
                {mission.findings.length === 0 ? (
                  <li className="px-6 py-8 text-center text-sm text-slate-500">
                    Aucun constat n'a encore été enregistré pour cette mission.
                  </li>
                ) : (
                  mission.findings.map((finding) => {
                    const statusConf = findingStatusConfig[finding.status] || findingStatusConfig.DRAFT;
                    return (
                      <li key={finding.id} className="hover:bg-slate-50 transition-colors">
                        <div className="px-6 py-4 flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {finding.title}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex space-x-2">
                                {finding.riskLevel && (
                                  <span 
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                                    style={{ 
                                      backgroundColor: `${finding.riskLevel.color}15`, 
                                      color: finding.riskLevel.color,
                                      borderColor: `${finding.riskLevel.color}30`
                                    }}
                                  >
                                    Risque {finding.riskLevel.name}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                                  {statusConf.label}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-slate-500 truncate">
                                  {finding.description.substring(0, 100)}
                                  {finding.description.length > 100 ? '...' : ''}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0 sm:ml-6">
                                <p>
                                  {finding._count.recos} recommandation(s)
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-5 flex-shrink-0">
                            <Link to={`/findings/${finding.id}`} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
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
          <div className="space-y-6">
            {/* Attachments */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
                <Paperclip className="w-5 h-5 mr-2 text-indigo-500" />
                Documents ({mission.documents?.length || 0})
              </h3>
              
              {!mission.documents || mission.documents.length === 0 ? (
                <p className="text-sm text-slate-500 italic mb-4">Aucun document attaché.</p>
              ) : (
                <ul className="divide-y divide-slate-100 mb-4">
                  {mission.documents.map(doc => (
                    <li key={doc.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center min-w-0">
                        <Paperclip className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                        <a href={`/api/v1/documents/download/${doc.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 truncate">
                          {doc.originalName}
                        </a>
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

            {/* Approvals */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-indigo-500" />
                  Approbations ({mission.approvals?.length || 0})
                </h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                  + Demander
                </button>
              </div>
              
              {!mission.approvals || mission.approvals.length === 0 ? (
                <p className="text-sm text-slate-500 italic mb-4">Aucune approbation.</p>
              ) : (
                <ul className="divide-y divide-slate-100 mb-4">
                  {mission.approvals.map(approval => (
                    <li key={approval.id} className="py-3 flex items-start">
                      <div className="flex-shrink-0">
                        {approval.status === 'APPROVED' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : approval.status === 'REJECTED' ? (
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
                          {new Date(approval.createdAt).toLocaleDateString()} - {approval.status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-slate-900">Membres de la mission</h3>
              <p className="mt-1 text-sm text-slate-500">Gérez l'équipe affectée à cette mission d'audit.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsMemberModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Ajouter un membre
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-200">
            {mission.members.length === 0 ? (
              <li className="px-6 py-8 text-center text-sm text-slate-500">Aucun membre affecté.</li>
            ) : (
              mission.members.map(member => (
                <li key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {member.user.firstName} {member.user.lastName}
                      {member.isLead && <span className="ml-2 px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-800">Lead</span>}
                    </p>
                    <p className="text-sm text-slate-500">{member.user.email} • Rôle: {member.roleInMission}</p>
                    {member.notes && <p className="text-xs text-slate-400 mt-1">Note: {member.notes}</p>}
                  </div>
                  <button 
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {activeTab === 'scopes' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-slate-900">Périmètre de la mission</h3>
              <p className="mt-1 text-sm text-slate-500">Entités auditables concernées par cette mission.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsScopeModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Ajouter au périmètre
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-200">
            {mission.scopes.length === 0 ? (
              <li className="px-6 py-8 text-center text-sm text-slate-500">Aucune entité dans le périmètre.</li>
            ) : (
              mission.scopes.map(scope => (
                <li key={scope.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {scope.auditableEntity.name} <span className="text-slate-500">({scope.auditableEntity.code})</span>
                    </p>
                    <p className="text-sm text-slate-500">Type: {scope.auditableEntity.entityType} {scope.scopeRole ? `• Rôle: ${scope.scopeRole}` : ''}</p>
                    {scope.notes && <p className="text-xs text-slate-400 mt-1">Note: {scope.notes}</p>}
                  </div>
                  <button 
                    onClick={() => handleRemoveScope(scope.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {activeTab === 'programs' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium leading-6 text-slate-900">Programmes d'audit</h3>
              <p className="mt-1 text-sm text-slate-500">Gérez les programmes et procédures d'audit pour cette mission.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setIsProgramModalOpen(true)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Nouveau programme
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-200">
            {!mission.programs || mission.programs.length === 0 ? (
              <li className="px-6 py-8 text-center text-sm text-slate-500">Aucun programme d'audit défini.</li>
            ) : (
              mission.programs.map(program => (
                <li key={program.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <Link to={`/programs/${program.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                      {program.title}
                    </Link>
                    <div className="flex items-center mt-1 space-x-4 text-sm text-slate-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {program.status}
                      </span>
                      <span>{program._count.procedures} procédure(s)</span>
                    </div>
                  </div>
                  <Link to={`/programs/${program.id}`} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <h3 className="text-lg font-medium leading-6 text-slate-900">Historique des statuts</h3>
          </div>
          <div className="p-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {mission.statusHistory.map((history, historyIdx) => (
                  <li key={history.id}>
                    <div className="relative pb-8">
                      {historyIdx !== mission.statusHistory.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
                            <Clock className="h-4 w-4 text-indigo-600" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-slate-500">
                              Statut changé à <span className="font-medium text-slate-900">{missionStatusConfig[history.newStatus]?.label || history.newStatus}</span>
                              {history.changedBy && ` par ${history.changedBy.firstName} ${history.changedBy.lastName}`}
                            </p>
                            {history.reason && (
                              <p className="mt-1 text-sm text-slate-600 italic">"{history.reason}"</p>
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-slate-500 flex flex-col items-end gap-2">
                            {new Date(history.changedAt).toLocaleString('fr-FR')}
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingHistory(history);
                                  setHistoryForm({ reason: history.reason || '' });
                                  setIsHistoryModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-blue-600"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteHistory(history.id)}
                                className="text-slate-400 hover:text-red-600"
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

      {/* Modals */}
      {isFindingModalOpen && (
        <FindingFormModal 
          isOpen={isFindingModalOpen} 
          onClose={() => setIsFindingModalOpen(false)} 
          missionId={id} 
          onSuccess={() => {
            fetchMission();
            setIsFindingModalOpen(false);
          }} 
        />
      )}

      {/* Status Modal */}
      {isStatusModalOpen && (
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
      )}

      {/* Member Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsMemberModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Ajouter un membre</h3>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Utilisateur *</label>
                  <select
                    value={memberForm.userId}
                    onChange={(e) => setMemberForm({...memberForm, userId: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    required
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Rôle dans la mission *</label>
                  <input
                    type="text"
                    value={memberForm.roleInMission}
                    onChange={(e) => setMemberForm({...memberForm, roleInMission: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    placeholder="Ex: Auditeur IT, Expert métier..."
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="isLead"
                    type="checkbox"
                    checked={memberForm.isLead}
                    onChange={(e) => setMemberForm({...memberForm, isLead: e.target.checked})}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isLead" className="ml-2 block text-sm text-slate-900">
                    Est un lead (co-responsable)
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    rows={2}
                    value={memberForm.notes}
                    onChange={(e) => setMemberForm({...memberForm, notes: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm"
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
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsScopeModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Ajouter au périmètre</h3>
              <form onSubmit={handleAddScope} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Entité auditable *</label>
                  <select
                    value={scopeForm.auditableEntityId}
                    onChange={(e) => setScopeForm({...scopeForm, auditableEntityId: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    required
                  >
                    <option value="">Sélectionner une entité</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Rôle dans le périmètre</label>
                  <input
                    type="text"
                    value={scopeForm.scopeRole}
                    onChange={(e) => setScopeForm({...scopeForm, scopeRole: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    placeholder="Ex: Entité principale, Entité support..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    rows={2}
                    value={scopeForm.notes}
                    onChange={(e) => setScopeForm({...scopeForm, notes: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm"
                  >
                    Ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScopeModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm"
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
            <div className="relative transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Modifier l'historique</h3>
              <form onSubmit={handleUpdateHistory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Raison / Commentaire</label>
                  <textarea
                    rows={3}
                    value={historyForm.reason}
                    onChange={(e) => setHistoryForm({...historyForm, reason: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    required
                  />
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm"
                  >
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm"
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
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-slate-500 bg-opacity-75 transition-opacity" onClick={() => setIsProgramModalOpen(false)} />
            <div className="relative transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-slate-900 mb-4">Nouveau programme d'audit</h3>
              <form onSubmit={handleCreateProgram} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Titre *</label>
                  <input
                    type="text"
                    required
                    value={programForm.title}
                    onChange={(e) => setProgramForm({...programForm, title: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Objectif</label>
                  <textarea
                    rows={2}
                    value={programForm.objective}
                    onChange={(e) => setProgramForm({...programForm, objective: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Périmètre (Scope)</label>
                  <textarea
                    rows={2}
                    value={programForm.scopeDescription}
                    onChange={(e) => setProgramForm({...programForm, scopeDescription: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Méthodologie</label>
                    <textarea
                      rows={2}
                      value={programForm.methodology}
                      onChange={(e) => setProgramForm({...programForm, methodology: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Critères d'audit</label>
                    <textarea
                      rows={2}
                      value={programForm.auditCriteria}
                      onChange={(e) => setProgramForm({...programForm, auditCriteria: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="submit"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:col-start-2 sm:text-sm"
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProgramModalOpen(false)}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:col-start-1 sm:mt-0 sm:text-sm"
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
