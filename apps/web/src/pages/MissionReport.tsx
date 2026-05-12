import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Download, Printer, ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { getRecommendationStatusMeta, getMissionStatusMeta, RecommendationStatus } from '../utils/status';

interface Reco {
  id: string;
  title: string;
  description: string;
  status: RecommendationStatus;
  priority: { name: string; color: string } | null;
  department: { name: string } | null;
  assignee: { firstName: string; lastName: string } | null;
  dueDate: string | null;
}

interface Finding {
  id: string;
  title: string;
  description: string;
  process: string | null;
  cause: string | null;
  impact: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'ADDRESSED' | 'REJECTED';
  riskLevel: { name: string; color: string } | null;
  author: { firstName: string; lastName: string } | null;
  recos: Reco[];
}

interface MissionReport {
  id: string;
  title: string;
  description: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  leader: { firstName: string; lastName: string; email: string };
  plan: { title: string; year: number } | null;
  objective?: string | null;
  scopeDescription?: string | null;
  methodology?: string | null;
  members?: Array<{
    id: number;
    roleInMission: string;
    isLead: boolean;
    notes: string | null;
    user: { firstName: string; lastName: string; email: string };
  }>;
  scopes?: Array<{
    id: number;
    auditableEntity: { name: string; code: string; entityType: string };
    scopeRole: string | null;
    criticality: string | null;
    notes?: string | null;
  }>;
  programs?: Array<{
    id: number;
    title: string;
    status: string;
    programType?: string;
    objective?: string;
    scopeDescription?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
    _count?: { procedures: number };
  }>;
  documents?: Array<{
    id: number;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  approvals?: Array<{
    id: number;
    decision: string;
    comments: string | null;
    createdAt: string;
    approver: { firstName: string; lastName: string } | null;
  }>;
  statusHistory?: Array<{
    id: number;
    previousStatus: string | null;
    newStatus: string;
    reason: string | null;
    changedAt: string;
    changedBy: { firstName: string; lastName: string } | null;
  }>;
  findings: Finding[];
}

const findingStatusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  CONFIRMED: { label: 'Confirmé', color: 'bg-amber-100 text-amber-800' },
  ADDRESSED: { label: 'Traité', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
};

const recoStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'En attente', color: 'bg-slate-100 text-slate-800' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  IMPLEMENTED: { label: 'Mise en œuvre', color: 'bg-emerald-100 text-emerald-800' },
  VERIFIED: { label: 'Vérifiée', color: 'bg-purple-100 text-purple-800' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
};

export default function MissionReport() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<MissionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  const downloadFile = async (docId: number, fileName: string) => {
    const res = await apiFetch(`${API_BASE}/documents/download/${docId}`);

    if (!res.ok) throw new Error('Erreur téléchargement');

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'rapport.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const generateReport = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/missions/${id}/report/generate`, {
        method: 'POST'
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erreur génération rapport");
        return;
      }

      const blob = await res.blob(); // ✅ CORRECTION ICI

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-mission-${id}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("Erreur génération rapport");
    }
  };

  useEffect(() => {
    apiFetch(`${API_BASE}/missions/${id}/report`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement du rapport');
        return res.json();
      })
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement du rapport...</div>;
  }

  if (error || !report) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <h3 className="text-sm font-medium text-red-800">{error || 'Rapport introuvable'}</h3>
          </div>
        </div>
        <Link to={`/missions/${id}`} className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la mission
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Print / Navigation Header (Hidden when printing) */}
      <div className="print:hidden flex items-center justify-between">
        <Link to={`/missions/${id}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la mission
        </Link>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Printer className="-ml-1 mr-2 h-4 w-4 text-slate-500" />
            Imprimer
          </button>
          <button
            onClick={generateReport}
            className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Download className="-ml-1 mr-2 h-4 w-4" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white shadow-lg border border-slate-200 rounded-3xl overflow-hidden print:shadow-none print:border-none">
        {/* En-tête premium */}
        <div className="relative p-0 border-b border-slate-200 print:bg-white">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-400 py-10 px-8 sm:px-16 text-white rounded-b-3xl shadow-lg print:bg-white print:text-slate-900 print:shadow-none">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-4 mb-2">
                <ShieldAlert className="w-10 h-10 text-white/80" />
                <h2 className="text-2xl font-bold tracking-widest uppercase drop-shadow">Rapport d'Audit</h2>
              </div>
              <h1 className="mt-2 text-4xl font-extrabold drop-shadow-lg text-center">{report?.title}</h1>
              <p className="mt-4 text-lg max-w-2xl text-center text-white/90 font-medium">{report?.description}</p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Chef de mission</span>
                <span className="mt-1 text-base font-bold">{report?.leader?.firstName} {report?.leader?.lastName}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Plan d'audit</span>
                <span className="mt-1 text-base font-bold">{report?.plan ? `${report.plan.title} (${report.plan.year})` : 'N/A'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Période</span>
                <span className="mt-1 text-base font-bold">{report?.startDate ? new Date(report.startDate).toLocaleDateString('fr-FR') : 'N/A'} - {report?.endDate ? new Date(report.endDate).toLocaleDateString('fr-FR') : 'N/A'}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold uppercase text-white/70">Statut</span>
                <span className="mt-1 text-base font-bold px-3 py-1 rounded-2xl bg-white/20 text-white border border-white/30">{report ? getMissionStatusMeta(report.status as import("../utils/status").MissionStatus).label : ''}</span>
              </div>
            </div>
          </div>
          {/* Date de génération */}
          <div className="absolute top-4 right-8 text-xs text-white/60 print:text-slate-400 print:static print:mt-2">
            Généré le {new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>

        {/* Détails de la mission */}
        <div className="p-8 sm:p-12 border-b border-slate-100">
          {report?.scopeDescription && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900 mb-1">Périmètre</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{report.scopeDescription}</p>
            </div>
          )}
          {report?.methodology && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900 mb-1">Méthodologie</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{report.methodology}</p>
            </div>
          )}
        </div>

        {/* Membres de la mission */}
        {report?.members && (
          <div className="p-8 sm:p-12 border-b border-slate-100">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Membres de la mission</h3>
            {report.members.length === 0 ? (
              <p className="text-slate-500 italic">Aucun membre affecté.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.members.map(member => (
                  <li key={member.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{member.user.firstName} {member.user.lastName}</span>
                      {member.isLead && <span className="ml-2 px-2 py-0.5 rounded-2xl text-xs font-medium bg-indigo-100 text-indigo-700">Lead</span>}
                      <span className="ml-2 text-slate-500">({member.user.email})</span>
                      {member.roleInMission && <span className="ml-2 text-slate-500">• Rôle: {member.roleInMission}</span>}
                      {member.notes && <span className="ml-2 italic text-slate-400">Notes: {member.notes}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Périmètre de la mission */}
        {report?.scopes && (
          <div className="p-8 sm:p-12 border-b border-slate-100">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Périmètre de la mission</h3>
            {report.scopes.length === 0 ? (
              <p className="text-slate-500 italic">Aucune entité dans le périmètre.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.scopes.map(scope => (
                  <li key={scope.id} className="py-3">
                    <span className="font-medium">{scope.auditableEntity.name}</span> <span className="text-slate-400">({scope.auditableEntity.code})</span>
                    <span className="ml-2 text-slate-500">Type: {scope.auditableEntity.entityType}</span>
                    {scope.scopeRole && <span className="ml-2 text-slate-500">• Rôle: {scope.scopeRole}</span>}
                    {scope.criticality && <span className="ml-2 text-slate-500">• Criticité: {scope.criticality}</span>}
                    {scope.notes && <span className="ml-2 italic text-slate-400">"{scope.notes}"</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Programmes d'audit */}
        {report?.programs && (
          <div className="p-8 sm:p-12 border-b border-slate-100">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Programmes d'audit</h3>
            {report.programs.length === 0 ? (
              <p className="text-slate-500 italic">Aucun programme d'audit défini.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.programs.map(program => (
                  <li key={program.id} className="py-3">
                    <span className="font-medium">{program.title}</span>
                    <span className="ml-2 text-slate-500">Statut: {program.status}</span>
                    {program.programType && <span className="ml-2 text-slate-500">• Type: {program.programType}</span>}
                    {program.objective && <span className="ml-2 text-slate-500">• Objectif: {program.objective}</span>}
                    {program.scopeDescription && <span className="ml-2 text-slate-500">• Périmètre: {program.scopeDescription}</span>}
                    {program.plannedStartDate && <span className="ml-2 text-slate-500">• Début: {new Date(program.plannedStartDate).toLocaleDateString()}</span>}
                    {program.plannedEndDate && <span className="ml-2 text-slate-500">• Fin: {new Date(program.plannedEndDate).toLocaleDateString()}</span>}
                    {program._count && <span className="ml-2 text-slate-500">• {program._count.procedures} procédure(s)</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Documents */}
        {report?.documents && (
          <div className="p-8 sm:p-12 border-b border-slate-100">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Documents</h3>
            {report.documents.length === 0 ? (
              <p className="text-slate-500 italic">Aucun document attaché.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.documents.map(doc => (
                  <li key={doc.id} className="py-3 flex items-center justify-between">
                    <span>{doc.originalName}</span>
                    <span className="text-xs text-slate-400">{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Approbations */}
        {report?.approvals && (
          <div className="p-8 sm:p-12 border-b border-slate-100">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Approbations</h3>
            {report.approvals.length === 0 ? (
              <p className="text-slate-500 italic">Aucune approbation.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.approvals.map(approval => (
                  <li key={approval.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{approval.approver ? `${approval.approver.firstName} ${approval.approver.lastName}` : 'En attente de validation'}</span>
                      <span className="ml-2 text-slate-500">{new Date(approval.createdAt).toLocaleDateString()}</span>
                      <span className="ml-2 text-slate-500">{approval.decision}</span>
                      {approval.comments && <span className="ml-2 italic text-slate-400">"{approval.comments}"</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Historique des statuts */}
        {report?.statusHistory && (
          <div className="p-8 sm:p-12 border-b border-slate-100">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Historique des statuts</h3>
            {report.statusHistory.length === 0 ? (
              <p className="text-slate-500 italic">Aucun historique.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.statusHistory.map(history => (
                  <li key={history.id} className="py-3">
                    <span className="font-medium">{getMissionStatusMeta(history.newStatus as import("../utils/status").MissionStatus).label}</span>
                    <span className="ml-2 text-slate-500">{new Date(history.changedAt).toLocaleString('fr-FR')}</span>
                    {history.changedBy && <span className="ml-2 text-slate-500">par {history.changedBy.firstName} {history.changedBy.lastName}</span>}
                    {history.reason && <span className="ml-2 italic text-slate-400">"{history.reason}"</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Constats et recommandations */}
        <div className="p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">
            Constats et Recommandations
          </h2>
          {report?.findings && report.findings.length === 0 ? (
            <p className="text-slate-500 italic">Aucun constat enregistré pour cette mission.</p>
          ) : (
            <div className="space-y-12">
              {report?.findings && report.findings.map((finding, index) => {
                const fStatus = findingStatusConfig[finding.status] || findingStatusConfig.DRAFT;
                return (
                  <div key={finding.id} className="break-inside-avoid">
                    {/* Finding Header */}
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-semibold text-slate-900 flex items-center">
                        <span className="flex items-center justify-center bg-indigo-100 text-indigo-800 w-8 h-8 rounded-full text-sm mr-3">
                          {index + 1}
                        </span>
                        {finding.title}
                      </h3>
                      <div className="flex space-x-2 ml-4 flex-shrink-0">
                        {finding.riskLevel && (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                            style={{
                              backgroundColor: `${finding.riskLevel.color}15`,
                              color: finding.riskLevel.color,
                              borderColor: `${finding.riskLevel.color}30`
                            }}
                          >
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            {finding.riskLevel.name}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fStatus.color}`}>
                          {fStatus.label}
                        </span>
                      </div>
                    </div>
                    {/* Finding Details */}
                    <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 mb-6">
                      <div className="prose prose-sm max-w-none text-slate-700 mb-4">
                        <p className="whitespace-pre-wrap">{finding.description}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                        <div>
                          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Processus</span>
                          <span className="text-sm text-slate-900">{finding.process || '-'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Cause</span>
                          <span className="text-sm text-slate-900">{finding.cause || '-'}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Impact</span>
                          <span className="text-sm text-slate-900">{finding.impact || '-'}</span>
                        </div>
                      </div>
                    </div>
                    {/* Recommendations */}
                    <div className="ml-11">
                      <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                        Recommandations associées ({finding.recos.length})
                      </h4>
                      {finding.recos.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">Aucune recommandation pour ce constat.</p>
                      ) : (
                        <div className="space-y-4">
                          {finding.recos.map((reco, rIndex) => {
                            const rStatus = getRecommendationStatusMeta(reco.status);
                            return (
                              <div key={reco.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="text-sm font-medium text-slate-900">
                                    {index + 1}.{rIndex + 1} {reco.title}
                                  </h5>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rStatus.class} ml-2 flex-shrink-0`}>
                                    {rStatus.label}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">
                                  {reco.description}
                                </p>
                                <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-500">
                                  {reco.priority && (
                                    <span className="flex items-center">
                                      <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: reco.priority.color }}></span>
                                      Priorité: {reco.priority.name}
                                    </span>
                                  )}
                                  {reco.department && (
                                    <span className="flex items-center">
                                      Département: {reco.department.name}
                                    </span>
                                  )}
                                  {reco.assignee && (
                                    <span className="flex items-center">
                                      Responsable: {reco.assignee.firstName} {reco.assignee.lastName}
                                    </span>
                                  )}
                                  {reco.dueDate && (
                                    <span className="flex items-center">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Échéance: {new Date(reco.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
// Suppression du code dupliqué et des fragments orphelins après le return principal
}
