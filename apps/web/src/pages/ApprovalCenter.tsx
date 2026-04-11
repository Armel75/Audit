import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Target,
  AlertTriangle,
  Lightbulb,
  ClipboardList,
  User,
  Calendar,
  ChevronRight,
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; permission: string }> = {
  PROGRAM_APPROVAL:        { label: "Programme d'audit", color: 'bg-indigo-100 text-indigo-800 border-indigo-200',   icon: <ClipboardList className="w-4 h-4" />, permission: 'audit_program:approve' },
  MISSION_APPROVAL:        { label: "Mission d'audit",   color: 'bg-blue-100 text-blue-800 border-blue-200',          icon: <Target className="w-4 h-4" />, permission: 'audit_mission:update' },
  PLAN_APPROVAL:           { label: "Plan d'audit",      color: 'bg-violet-100 text-violet-800 border-violet-200',    icon: <FileText className="w-4 h-4" />, permission: 'audit_plan:approve' },
  FINDING_APPROVAL:        { label: 'Constat',            color: 'bg-amber-100 text-amber-800 border-amber-200',       icon: <AlertTriangle className="w-4 h-4" />, permission: 'finding:validate' },
  RECOMMENDATION_APPROVAL: { label: 'Recommandation',    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <Lightbulb className="w-4 h-4" />, permission: 'recommendation:validate' },
};

export default function ApprovalCenter() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [deciding, setDeciding]   = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL;
  const userPermissions = user?.permissions || [];

  const fetchApprovals = async () => {
    setLoading(true);
    const res  = await apiFetch(`${API_BASE}/approvals`);
    const data = await res.json();
    setApprovals(data.filter((a: any) => a.decision === 'PENDING'));
    setLoading(false);
  };

  useEffect(() => { fetchApprovals(); }, []);

  const handleDecision = async (id: number, decision: string) => {
    setDeciding(id);
    await apiFetch(`${API_BASE}/approvals/${id}/decide`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    setDeciding(null);
    fetchApprovals();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Centre d'approbation</h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? 'Chargement...' : `${approvals.length} demande(s) en attente`}
        </p>
      </div>

      {/* Empty state */}
      {!loading && approvals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800">Tout est a jour !</h3>
          <p className="text-sm text-slate-400 mt-1">Aucune demande d'approbation en attente.</p>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {approvals.map((a: any) => {
          const typeConf = TYPE_CONFIG[a.approvalType] ?? {
            label: a.approvalType,
            color: 'bg-slate-100 text-slate-700 border-slate-200',
            icon: <FileText className="w-4 h-4" />,
            permission: 'approval:decide',
          };
          const isDeciding = deciding === a.id;
          const canDecide = userPermissions.includes(typeConf.permission);

          return (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Top color stripe */}
              <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-violet-400" />

              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

                  {/* LEFT */}
                  <div className="flex-1 space-y-4">

                    {/* Type badge + date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${typeConf.color}`}>
                        {typeConf.icon}
                        {typeConf.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        Demande le {formatDate(a.createdAt)}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700">
                        En attente
                      </span>
                    </div>

                    {/* Context grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">

                      {a.auditProgram && (
                        <div className="flex items-start gap-2">
                          <ClipboardList className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Programme</p>
                            <Link
                              to={`/programs/${a.auditProgram.id}`}
                              className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1"
                            >
                              {a.auditProgram.title}
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                            <p className="text-xs text-slate-400 font-mono">{a.auditProgram.code}</p>
                          </div>
                        </div>
                      )}

                      {(a.auditProgram?.mission || (a.mission && !a.auditProgram)) && (
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Mission</p>
                            {(() => {
                              const m = a.auditProgram?.mission ?? a.mission;
                              return (
                                <Link
                                  to={`/missions/${m.id}`}
                                  className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                >
                                  {m.title}
                                  <ChevronRight className="w-3 h-3" />
                                </Link>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {a.plan && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Plan d'audit</p>
                            <p className="font-semibold text-slate-800">{a.plan.title ?? `Plan ${a.plan.year}`}</p>
                          </div>
                        </div>
                      )}

                      {a.finding && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Constat</p>
                            <p className="font-semibold text-slate-800">{a.finding.title}</p>
                            <p className="text-xs text-slate-400">{a.finding.status}</p>
                          </div>
                        </div>
                      )}

                      {a.recommendation && (
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Recommandation</p>
                            <p className="font-semibold text-slate-800">{a.recommendation.title}</p>
                            <p className="text-xs text-slate-400">{a.recommendation.status}</p>
                          </div>
                        </div>
                      )}

                      {a.requestedBy && (
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Demande par</p>
                            <p className="font-semibold text-slate-800">
                              {a.requestedBy.firstName} {a.requestedBy.lastName}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Niveau</p>
                          <p className="font-semibold text-slate-800">Niveau {a.level}</p>
                        </div>
                      </div>
                    </div>

                    {a.comments && (
                      <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 italic">
                        {a.comments}
                      </p>
                    )}
                  </div>

                  {/* RIGHT  actions */}
                  {canDecide && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(a.id, 'APPROVED')}
                      disabled={isDeciding}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isDeciding ? '...' : 'Valider'}
                    </button>
                    <button
                      onClick={() => handleDecision(a.id, 'REJECTED')}
                      disabled={isDeciding}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      {isDeciding ? '...' : 'Rejeter'}
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}