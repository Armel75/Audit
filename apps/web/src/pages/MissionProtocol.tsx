import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, FileText, Printer, ShieldAlert, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { getMissionStatusMeta } from '../utils/status';
import type { MissionStatus } from '../utils/status';

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
  leader?: { firstName: string; lastName: string } | null;
  plan?: { year: number; title: string | null } | null;
  auditType: { name: string } | null;
  members: Array<{
    id: number;
    roleInMission: string;
    isLead: boolean;
    user: { firstName: string; lastName: string; email: string };
  }>;
  scopes: Array<{
    id: number;
    auditableEntity: { name: string; code: string; entityType: string };
    scopeRole: string | null;
    criticality: string | null;
    notes?: string | null;
  }>;
  programs: Array<{
    id: number;
    title: string;
    status: string;
    programType?: string;
    objective?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    _count: { procedures: number };
    procedures?: Array<{ id: number; code?: string | null; title: string; sequenceNo: number }>;
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
  } | null;
}

export default function MissionProtocol() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
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
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500 animate-pulse">Chargement du protocole...</div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">{error || 'Mission introuvable'}</h3>
          </div>
        </div>
        <Link
          to={`/missions/${id}`}
          className="mt-6 inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retour à la mission
        </Link>
      </div>
    );
  }

  const statusMeta = getMissionStatusMeta(mission.status as MissionStatus);

  const generateProtocolPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await apiFetch(`${API_BASE}/missions/${id}/protocol`, {
        method: 'GET'
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erreur génération du protocole");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `protocole-mission-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléchargement du protocole");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 px-6 lg:px-0">
      {/* Print / Navigation Header */}
      <div className="print:hidden flex items-center justify-between">
        <Link
          to={`/missions/${id}`}
          className="inline-flex items-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retour à la mission
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={generateProtocolPdf}
            disabled={isExporting}
            className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 border border-indigo-300 dark:border-indigo-700 rounded-xl shadow-sm text-sm font-medium text-indigo-700 dark:text-indigo-200 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-60 disabled:cursor-wait transition-all duration-200"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {isExporting ? 'Préparation...' : 'Exporter PDF'}
          </button>
          <button
            onClick={() => window.print()}
            className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Protocol Content */}
      <div className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden print:shadow-none print:border-none">
        {/* En-tête */}
        <div className="relative p-0 border-b border-slate-200 dark:border-slate-700">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-400 py-10 px-8 sm:px-16 text-white rounded-b-3xl shadow-lg">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-4 mb-2">
                <ShieldAlert className="w-10 h-10 text-white/80" />
                <h2 className="text-2xl font-bold tracking-widest uppercase drop-shadow">Protocole de Mission d'Audit</h2>
              </div>
              <h1 className="mt-2 text-4xl font-extrabold drop-shadow-lg text-center">{mission.title}</h1>
              <p className="mt-4 text-lg max-w-2xl text-center text-white/90 font-medium">{mission.description}</p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Chef de mission</span>
                <span className="mt-1 text-base font-bold">
                  {mission.leader ? `${mission.leader.firstName} ${mission.leader.lastName}` : 'Non assigné'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Plan d'audit</span>
                <span className="mt-1 text-base font-bold">
                  {mission.plan ? `${mission.plan.title ?? ''} (${mission.plan.year})` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Période</span>
                <span className="mt-1 text-base font-bold">
                  {mission.startDate ? new Date(mission.startDate).toLocaleDateString('fr-FR') : 'N/A'}
                  {' - '}
                  {mission.endDate ? new Date(mission.endDate).toLocaleDateString('fr-FR') : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Statut</span>
                <span className="mt-1 text-base font-bold px-3 py-1 rounded-2xl bg-white/20 text-white border border-white/30">
                  {statusMeta.label}
                </span>
              </div>
            </div>
          </div>
          {/* Date de génération */}
          <div className="absolute top-4 right-8 text-xs text-white/60">
            Généré le {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>

        {/* 1. Objet / Objectifs de la mission */}
        {(mission.objective || mission.description) && (
          <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Objet & Objectifs de la mission
            </h3>
            {mission.description && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Description</p>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{mission.description}</p>
              </div>
            )}
            {mission.objective && (
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Objectif</p>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{mission.objective}</p>
              </div>
            )}
          </div>
        )}

        {/* 2. Périmètre de la mission */}
        <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-500" />
            Périmètre de la mission
          </h3>
          {mission.scopeDescription && (
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Description du périmètre</p>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{mission.scopeDescription}</p>
            </div>
          )}
          {mission.scopes && mission.scopes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Entités auditées</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {mission.scopes.map(scope => (
                  <div
                    key={scope.id}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {scope.auditableEntity.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {scope.auditableEntity.code} • {scope.auditableEntity.entityType}
                      </p>
                      {scope.scopeRole && (
                        <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          {scope.scopeRole}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!mission.scopes || mission.scopes.length === 0) && !mission.scopeDescription && (
            <p className="text-slate-500 dark:text-slate-400 italic">Aucun périmètre défini.</p>
          )}
        </div>

        {/* 3. Méthodologie d'audit */}
        {mission.methodology && (
          <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Méthodologie d'audit
            </h3>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{mission.methodology}</p>
          </div>
        )}

        {/* 4. Programme de travail */}
        {mission.programs && mission.programs.length > 0 && (
          <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Programme(s) de travail
            </h3>
            <div className="space-y-4">
              {mission.programs.map(program => (
                <div
                  key={program.id}
                  className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">{program.title}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {program.programType && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                            {program.programType}
                          </span>
                        )}
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {program._count?.procedures ?? 0} procédure(s)
                        </span>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          {program.status}
                        </span>
                      </div>
                      {program.procedures && program.procedures.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                            Procédures ({program.procedures.length})
                          </p>
                          <div className="space-y-1.5">
                            {program.procedures.slice(0, 10).map(proc => (
                              <div key={proc.id} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                <span>
                                  {proc.code && <span className="font-semibold text-emerald-700 dark:text-emerald-300">{proc.code}</span>}
                                  {proc.code && <span className="text-emerald-500"> — </span>}
                                  {proc.title}
                                </span>
                              </div>
                            ))}
                            {program.procedures.length > 10 && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                … et {program.procedures.length - 10} autre(s) procédure(s)
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {program.objective && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Objectif</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{program.objective}</p>
                        </div>
                      )}
                      {(program.plannedStartDate || program.plannedEndDate) && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                          Planning : {program.plannedStartDate ? new Date(program.plannedStartDate).toLocaleDateString('fr-FR') : 'N/A'}
                          {' → '}
                          {program.plannedEndDate ? new Date(program.plannedEndDate).toLocaleDateString('fr-FR') : 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Planning / Durée prévisionnelle */}
        <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Planning & Durée prévisionnelle
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Début</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {mission.startDate ? new Date(mission.startDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Non défini'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Fin</p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {mission.endDate ? new Date(mission.endDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Non défini'}
              </p>
            </div>
            {mission.startDate && mission.endDate && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Durée</p>
                <p className="mt-1 text-base font-semibold text-emerald-800 dark:text-emerald-200">
                  {Math.max(1, Math.ceil((new Date(mission.endDate).getTime() - new Date(mission.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} jour(s)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 6. Membres de la mission */}
        {mission.members && mission.members.length > 0 && (
          <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Membres de la mission
            </h3>
            <div className="space-y-3">
              {mission.members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {member.user.firstName[0]}{member.user.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {member.user.firstName} {member.user.lastName}
                        {member.isLead && (
                          <span className="ml-2 px-2 py-0.5 rounded-2xl text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                            Lead
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {member.user.email}
                        {member.roleInMission && <span> • {member.roleInMission}</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {mission.documents && mission.documents.length > 0 && (
          <div className="p-8 sm:p-12 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Documents
            </h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {mission.documents.map(doc => (
                <li key={doc.id} className="py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{doc.originalName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Approbations */}
        {mission.approvals && mission.approvals.length > 0 && (
          <div className="p-8 sm:p-12">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              Approbations
            </h3>
            <div className="space-y-3">
              {mission.approvals.map(approval => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {approval.approver.firstName} {approval.approver.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Décision : {approval.decision} • {new Date(approval.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    {approval.comments && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 italic">"{approval.comments}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
