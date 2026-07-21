import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, Clock, FileText, Target, List, User, Flag, Paperclip, Play, Square, AlertTriangle, RotateCcw } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const programStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'En attente de validation',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  VALIDATED: 'Validé',
  CANCELLED: 'Annulé',
  CLOSED: 'Clôturé',
};

const procedureStatusLabels: Record<string, string> = {
  PLANNED: 'Planifiée',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  COMPLETED: 'Terminée',
};

const procedureStatusConfig: Record<string, { bg: string; text: string; border: string }> = {
  PLANNED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  BLOCKED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const procedureStatusIcon: Record<string, typeof Clock> = {
  PLANNED: Clock,
  IN_PROGRESS: Play,
  BLOCKED: AlertTriangle,
  COMPLETED: CheckCircle,
};

// Transitions autorisées par statut actuel
const procedureTransitions: Record<string, { status: string; label: string; icon: typeof Play; tone: string }[]> = {
  PLANNED: [
    { status: 'IN_PROGRESS', label: 'Démarrer', icon: Play, tone: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  ],
  IN_PROGRESS: [
    { status: 'COMPLETED', label: 'Terminer', icon: CheckCircle, tone: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
    { status: 'BLOCKED', label: 'Bloquer', icon: AlertTriangle, tone: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200' },
  ],
  BLOCKED: [
    { status: 'IN_PROGRESS', label: 'Reprendre', icon: Play, tone: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200' },
  ],
  COMPLETED: [
    { status: 'IN_PROGRESS', label: 'Reprendre (rework)', icon: RotateCcw, tone: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200' },
  ],
};

interface Procedure {
  id: number;
  sequenceNo: number;
  code: string | null;
  title: string;
  procedureType: string | null;
  description: string | null;
  expectedEvidence: string | null;
  status: string;
  dueDate: string | null;
  performedBy: { firstName: string; lastName: string } | null;
  assignedTo: { id: number; firstName: string; lastName: string } | null;
  priority: { id: number; name: string; level: number } | null;
  actualResult: string | null;
  conclusion: string | null;
  documents: { id: number; originalName: string; sizeBytes: number; mimeType: string }[];
}

interface Approval {
  id: number;
  decision: string;
}

interface Program {
  id: number;
  code: string;
  title: string;
  programType: string;
  objective: string | null;
  scopeDescription: string | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  progressPercent: number;
  isLocked: boolean;
  status: string;
  mission: { id: number; title: string; status: string };
  preparedBy: { firstName: string; lastName: string } | null;
  procedures: Procedure[];
  approvals?: Approval[];
  criteria?: { id: number; name: string; description: string | null; source: string | null }[];
  versions?: { id: number; versionNumber: number; label: string | null; createdAt: string }[];
}

export default function AuditProgramDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canApproveProgram = user?.permissions?.includes('audit_program:approve') ?? false;
  const canExecuteProcedure = user?.permissions?.includes('audit_procedure:execute') ?? false;
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Procedure form state
  // const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [procTitle, setProcTitle] = useState('');
  const [procType, setProcType] = useState('');
  const [procDesc, setProcDesc] = useState('');
  const [procEvidence, setProcEvidence] = useState('');
  const [procDueDate, setProcDueDate] = useState('');
  const [procSequence, setProcSequence] = useState<number | ''>('');
  const [submittingProc, setSubmittingProc] = useState(false);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL;
  // const hasPendingApproval =
  //   program?.approvals?.some(a => a.decision === 'PENDING');

  const pendingApproval =
    program?.approvals?.find(a => a.decision === 'PENDING');
  
  const hasPendingApproval = !!pendingApproval;

  const [approving, setApproving] = useState(false);
  const [isEditProgramModalOpen, setIsEditProgramModalOpen] = useState(false);
  const [isEditProcedureModalOpen, setIsEditProcedureModalOpen] = useState(false);
  const [editProgramForm, setEditProgramForm] = useState({ title: '', programType: '', objective: '', scopeDescription: '', plannedStartDate: '', plannedEndDate: '' });

  const fetchProgram = () => {
    apiFetch(`${API_BASE}/programs/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement du programme');
        return res.json();
      })
      .then(data => {
        setProgram(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProgram();
  }, [id]);

  // const openNewProcedureModal = () => {
  //   setEditingProcedure(null);
  //   setProcTitle('');
  //   setProcType('');
  //   setProcDesc('');
  //   setProcEvidence('');
  //   setProcDueDate('');
  //   setProcSequence(program?.procedures.length ? program.procedures.length + 1 : 1);
  //   setIsProcedureModalOpen(true);
  // };

  const openEditProcedureModal = (proc: Procedure) => {
    setEditingProcedure(proc);
    setProcTitle(proc.title);
    setProcType(proc.procedureType || '');
    setProcDesc(proc.description || '');
    setProcEvidence(proc.expectedEvidence || '');
    setProcDueDate(proc.dueDate ? new Date(proc.dueDate).toISOString().split('T')[0] : '');
    setProcSequence(proc.sequenceNo);
    setIsEditProcedureModalOpen(true);
  };

  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProc(true);

    try {
      const url = editingProcedure 
        ? `${API_BASE}/programs/procedures/${editingProcedure.id}`
        : `${API_BASE}/programs/${id}/procedures`;
      
      const method = editingProcedure ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: procTitle,
          procedureType: procType || undefined,
          description: procDesc || undefined,
          expectedEvidence: procEvidence || undefined,
          dueDate: procDueDate ? new Date(procDueDate).toISOString() : undefined,
          sequenceNo: procSequence ? Number(procSequence) : undefined
        })
      });

      if (!res.ok) throw new Error('Erreur lors de l\'enregistrement de la procédure');

      setIsEditProcedureModalOpen(false);
      fetchProgram();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingProc(false);
    }
  };

  const handleProcedureStatusChange = async (procId: number, newStatus: string) => {
    const labelMap: Record<string, string> = {
      IN_PROGRESS: 'démarrer',
      COMPLETED: 'terminer',
      BLOCKED: 'bloquer',
    };
    const action = labelMap[newStatus] || 'modifier le statut de';
    if (!confirm(`Voulez-vous vraiment ${action} cette procédure ?`)) return;

    try {
      const res = await apiFetch(`${API_BASE}/programs/procedures/${procId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erreur lors du changement de statut');
        return;
      }
      fetchProgram();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProcedure = async (procId: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette procédure ?')) return;

    try {
      const res = await apiFetch(`${API_BASE}/programs/procedures/${procId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');
      fetchProgram();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement du programme...</div>;
  if (error || !program) return <div className="p-8 text-red-500">{error || 'Programme introuvable'}</div>;

  const requestApproval = async () => {
    try {
      await apiFetch(`${API_BASE}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalType: 'PROGRAM_APPROVAL',
          level: 1,
          auditProgramId: program?.id
        })
      });

      fetchProgram();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // const approveProgram = async () => {
  //   if (!pendingApproval) return;

  //   try {
  //     const res = await apiFetch(`${API_BASE}/approvals/${pendingApproval.id}/decide`, {
  //       method: 'PUT',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         decision: 'APPROVED'
  //       })
  //     });

  //     if (!res.ok) throw new Error("Erreur validation");
      
  //     fetchProgram();
  //   } catch (err: any) {
  //     alert(err.message);
  //   }
  // };

    const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch(`${API_BASE}/programs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProgramForm),
      });
      if (response.ok) {
        setIsEditProgramModalOpen(false);
        fetchProgram();
      } else {
        const err = await response.json();
        alert(err.error || 'Erreur lors de la modification du programme');
      }
    } catch (error) {
      console.error('Failed to update program', error);
    }
  };

    const handleDownloadDocument = async (docId: number, fileName: string) => {
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

    const approveProgram = async () => {
      if (!pendingApproval) return;

      const confirmAction = window.confirm(
        "Voulez-vous vraiment approuver ce programme d'audit ?"
      );

      if (!confirmAction) return;

      setApproving(true); // ✅ ICI

      try {
        const res = await apiFetch(`${API_BASE}/approvals/${pendingApproval.id}/decide`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: 'APPROVED'
          })
        });

        if (!res.ok) throw new Error("Erreur validation");

        fetchProgram();
      } catch (err: any) {
        setApproving(false); // ✅ ICI
      }
    };


  const canEdit = !['APPROVED'].includes(program.status) && ['PLANNED', 'READY'].includes(program.mission?.status ?? '');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-6 lg:px-0">
      <div>
        <Link
          to={`/missions/${program.mission.id}`}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour aux details de la mission</span>
        </Link>
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{program.title}</h1>
            <div className="flex gap-2 mt-4 sm:mt-0">

              {/* MODIFIER LE PROGRAMME */}
              <button
                onClick={() => {
                  setEditProgramForm({
                    title: program.title,
                    programType: program.programType,
                    objective: program.objective ?? '',
                    scopeDescription: program.scopeDescription ?? '',
                    plannedStartDate: program.plannedStartDate ? program.plannedStartDate.slice(0, 10) : '',
                    plannedEndDate: program.plannedEndDate ? program.plannedEndDate.slice(0, 10) : '',
                  });
                  setIsEditProgramModalOpen(true);
                }}
                disabled={!canEdit}
                title={!canEdit ? 'Modification impossible : programme approuvé ou mission en cours' : undefined}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Edit className="w-4 h-4" />
                Modifier le programme
              </button>

              {/* DEMANDER VALIDATION */}
                            {program.status === 'DRAFT' && !hasPendingApproval && (
                <button
                  onClick={requestApproval}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-all duration-200"
                >
                  Demander validation
                </button>
              )}

              {/* EN ATTENTE */}
              {hasPendingApproval && (
                <span className="px-4 py-2 text-sm text-yellow-700 bg-yellow-100 rounded-md">
                  En attente de validation
                </span>
              )}

              {/* APPROUVER */}
              {/* {hasPendingApproval && (
                <button
                  onClick={approveProgram}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Approuver
                </button>
              )} */}
              {hasPendingApproval && program.status !== 'APPROVED' && canApproveProgram && (
                <button
                  onClick={approveProgram}
                  disabled={approving}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approving ? 'Validation...' : 'Approuver'}
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {programStatusLabels[program.status] ?? program.status}
              </span>
              {program.preparedBy && (
                <span>Préparé par : {program.preparedBy.firstName} {program.preparedBy.lastName}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-500" />
              Détails du programme
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {program.programType}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{program.code}</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Objectif</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-3 rounded-md border border-slate-100 dark:border-slate-600 whitespace-pre-wrap">
                  {program.objective || <span className="italic text-slate-400 dark:text-slate-500">Non renseigné</span>}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Périmètre (Scope)</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-3 rounded-md border border-slate-100 dark:border-slate-600 whitespace-pre-wrap">
                  {program.scopeDescription || <span className="italic text-slate-400 dark:text-slate-500">Non renseigné</span>}
                </p>
              </div>
              {(program.plannedStartDate || program.plannedEndDate) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Début planifié</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {program.plannedStartDate ? new Date(program.plannedStartDate).toLocaleDateString() : <span className="italic text-slate-400 dark:text-slate-500">Non défini</span>}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Fin planifiée</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {program.plannedEndDate ? new Date(program.plannedEndDate).toLocaleDateString() : <span className="italic text-slate-400 dark:text-slate-500">Non définie</span>}
                    </p>
                  </div>
                </div>
              )}
              {program.criteria && program.criteria.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Critères d'audit</h4>
                  <ul className="space-y-2">
                    {program.criteria.map(c => (
                      <li key={c.id} className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                        <span className="font-medium">{c.name}</span>
                        {c.source && <span className="ml-2 text-xs text-slate-400">({c.source})</span>}
                        {c.description && <p className="mt-1 text-slate-500">{c.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 sm:flex sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium leading-6 text-slate-900 dark:text-white flex items-center">
                <List className="w-5 h-5 mr-2 text-indigo-500" />
                Procédures d'audit ({program.procedures.length})
              </h3>
              <button
                // onClick={openNewProcedureModal}
                onClick={() => navigate(`/programs/${program.id}/procedures/new`)}
                disabled={!canEdit}
                title={!canEdit ? 'Modification impossible : programme approuvé ou mission en cours' : undefined}
                className="mt-3 sm:mt-0 inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Nouvelle procédure
              </button>
            </div>

            <ul className="divide-y divide-slate-200">
              {program.procedures.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucune procédure d'audit définie.
                </li>
              ) : (
                program.procedures.map(proc => (
                  <li key={proc.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mr-3">
                            {proc.sequenceNo}
                          </span>
                          <h4 className="text-base font-medium text-slate-900 dark:text-white">{proc.title}</h4>
                          {(() => {
                            const cfg = procedureStatusConfig[proc.status] || procedureStatusConfig.PLANNED;
                            const StatusIcon = procedureStatusIcon[proc.status] || Clock;
                            return (
                              <span className={`ml-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                <StatusIcon className="w-3 h-3" />
                                {procedureStatusLabels[proc.status] || proc.status}
                              </span>
                            );
                          })()}
                        </div>
                        
                        <div className="ml-9 space-y-3">
                          {proc.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">{proc.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {proc.procedureType && (
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">Type: </span>
                                <span className="text-slate-600 dark:text-slate-400">{proc.procedureType}</span>
                              </div>
                            )}
                            {proc.expectedEvidence && (
                              <div>
                                <span className="font-medium text-slate-700">Preuve attendue: </span>
                                <span className="text-slate-600">{proc.expectedEvidence}</span>
                              </div>
                            )}
                            {proc.dueDate && (
                              <div>
                                <span className="font-medium text-slate-700 dark:text-slate-300">Échéance: </span>
                                <span className="text-slate-600 dark:text-slate-400">{new Date(proc.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {proc.performedBy && (
                              <div>
                                <span className="font-medium text-slate-700">Exécuté par: </span>
                                <span className="text-slate-600">{proc.performedBy.firstName} {proc.performedBy.lastName}</span>
                              </div>
                            )}
                            {proc.assignedTo && (
                              <div className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-medium text-slate-700">Assigné à: </span>
                                <span className="text-slate-600">{proc.assignedTo.firstName} {proc.assignedTo.lastName}</span>
                              </div>
                            )}
                            {proc.priority && (
                              <div className="flex items-center gap-1">
                                <Flag className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-medium text-slate-700">Priorité: </span>
                                <span className="text-slate-600">{proc.priority.name}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100">
                              <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                                <Paperclip className="w-3.5 h-3.5" />
                                Pièces jointes ({proc.documents?.length || 0})
                              </p>
                              {proc.documents && proc.documents.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {proc.documents.map(doc => (
                                    <button
                                      key={doc.id}
                                      onClick={() => handleDownloadDocument(doc.id, doc.originalName)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors"
                                      title={`Télécharger ${doc.originalName}`}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      {doc.originalName}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Aucune pièce jointe</p>
                              )}
                            </div>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        {/* Boutons de transition de statut */}
                        {canExecuteProcedure && !['COMPLETED', 'CLOSED'].includes(program.status) && (
                          <div className="flex flex-wrap gap-1.5">
                            {(procedureTransitions[proc.status] || []).map(t => {
                              const TIcon = t.icon;
                              return (
                                <button
                                  key={t.status}
                                  onClick={() => handleProcedureStatusChange(proc.id, t.status)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors ${t.tone}`}
                                >
                                  <TIcon className="w-3.5 h-3.5" />
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {/* Boutons modifier / supprimer (structure) */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditProcedureModal(proc)}
                            disabled={!canEdit}
                            title={!canEdit ? 'Modification impossible : programme approuvé ou mission en cours' : undefined}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteProcedure(proc.id)}
                            disabled={!canEdit}
                            title={!canEdit ? 'Modification impossible : programme approuvé ou mission en cours' : undefined}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Informations</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Mission</dt>
                <dd className="font-medium text-slate-900 dark:text-white">
                  <Link to={`/missions/${program.mission.id}`} className="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400">
                    {program.mission.title}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Code</dt>
                <dd className="font-mono text-slate-800 dark:text-slate-200">{program.code}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Type</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{program.programType}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Avancée</dt>
                <dd className="font-medium text-slate-900 dark:text-white">{program.progressPercent}%</dd>
              </div>
              {program.isLocked && (
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Statut verrou</dt>
                  <dd className="text-amber-600 dark:text-amber-400 font-medium">Verrouillé</dd>
                </div>
              )}
              {program.preparedBy && (
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Préparé par</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">{program.preparedBy.firstName} {program.preparedBy.lastName}</dd>
                </div>
              )}
              {program.versions && program.versions.length > 0 && (
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">Version actuelle</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">v{program.versions[0].versionNumber}{program.versions[0].label ? ` — ${program.versions[0].label}` : ''}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Modal : Modifier le programme d'audit */}
      {isEditProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsEditProgramModalOpen(false)} />
          <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 px-8 py-6 border-b border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full">
                  <Edit className="w-6 h-6 text-white" />
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
                      <option value="FINANCIAL">💰 Financier</option>
                      <option value="OPERATIONAL">⚙️ Opérationnel</option>
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

      {isEditProcedureModalOpen && editingProcedure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={() => setIsEditProcedureModalOpen(false)} />
          <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/30 px-8 py-6 border-b border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full">
                  <Edit className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Modifier la procédure</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{editingProcedure.title}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProcedure} className="px-8 py-6">
              <div className="space-y-5">

                {/* N° ordre + Titre */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">N° Ordre</label>
                    <input
                      type="number"
                      min={1}
                      value={procSequence}
                      onChange={(e) => setProcSequence(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Titre <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={procTitle}
                      onChange={(e) => setProcTitle(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={procDesc}
                    onChange={(e) => setProcDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 outline-none resize-y"
                  />
                </div>

                {/* Type + Preuve */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Type de procédure</label>
                    <select
                      value={procType}
                      onChange={(e) => setProcType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 outline-none"
                    >
                      <option value="">-- Sélectionner --</option>
                      <option value="INTERVIEW">Entretien</option>
                      <option value="OBSERVATION">Observation</option>
                      <option value="INSPECTION">Inspection documentaire</option>
                      <option value="REPERFORMANCE">Re-exécution</option>
                      <option value="ANALYTICAL">Procédure analytique</option>
                      <option value="CONFIRMATION">Confirmation externe</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Preuve attendue</label>
                    <input
                      type="text"
                      value={procEvidence}
                      onChange={(e) => setProcEvidence(e.target.value)}
                      placeholder="ex. Rapport signé, relevé bancaire..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Échéance */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Date d'échéance</label>
                  <input
                    type="date"
                    value={procDueDate}
                    onChange={(e) => setProcDueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 hover:border-slate-300 dark:hover:border-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 dark:border-slate-600 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditProcedureModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingProc}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50"
                >
                  {submittingProc ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* {isProcedureModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setIsProcedureModalOpen(false)}>
              <div className="absolute inset-0 bg-slate-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-slate-900 mb-5">
                  {editingProcedure ? 'Modifier la procédure' : 'Nouvelle procédure'}
                </h3>
                <form onSubmit={handleSaveProcedure} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-slate-700">N° Ordre</label>
                      <input
                        type="number"
                        value={procSequence}
                        onChange={(e) => setProcSequence(e.target.value ? Number(e.target.value) : '')}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-slate-700">Titre *</label>
                      <input
                        type="text"
                        required
                        value={procTitle}
                        onChange={(e) => setProcTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      rows={3}
                      value={procDesc}
                      onChange={(e) => setProcDesc(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Type de procédure</label>
                      <input
                        type="text"
                        value={procType}
                        onChange={(e) => setProcType(e.target.value)}
                        placeholder="Ex: Test de contrôle, Revue analytique..."
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Preuve attendue</label>
                      <input
                        type="text"
                        value={procEvidence}
                        onChange={(e) => setProcEvidence(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Date d'échéance</label>
                    <input
                      type="date"
                      value={procDueDate}
                      onChange={(e) => setProcDueDate(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={submittingProc}
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {submittingProc ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsProcedureModalOpen(false)}
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
