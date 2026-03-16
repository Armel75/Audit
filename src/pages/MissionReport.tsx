import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Download, Printer, ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Reco {
  id: string;
  title: string;
  description: string;
  status: string;
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

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    fetch(`/api/missions/${id}/report`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
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
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Printer className="-ml-1 mr-2 h-4 w-4 text-slate-500" />
            Imprimer
          </button>
          <button 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="-ml-1 mr-2 h-4 w-4" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden print:shadow-none print:border-none">
        {/* Cover Page / Header */}
        <div className="p-8 sm:p-12 border-b border-slate-200 bg-slate-50 print:bg-white">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">
              Rapport d'Audit
            </h2>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {report.title}
            </h1>
            <p className="mt-4 text-lg text-slate-500">
              {report.description}
            </p>
          </div>
          
          <dl className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">Chef de mission</dt>
              <dd className="mt-1 text-sm text-slate-900">{report.leader.firstName} {report.leader.lastName}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">Plan d'audit</dt>
              <dd className="mt-1 text-sm text-slate-900">{report.plan ? `${report.plan.title} (${report.plan.year})` : 'N/A'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">Période</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {report.startDate ? new Date(report.startDate).toLocaleDateString() : 'N/A'} - {report.endDate ? new Date(report.endDate).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">Statut</dt>
              <dd className="mt-1 text-sm text-slate-900">{report.status}</dd>
            </div>
          </dl>
        </div>

        {/* Findings & Recommendations */}
        <div className="p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 border-b border-slate-200 pb-4">
            Constats et Recommandations
          </h2>

          {report.findings.length === 0 ? (
            <p className="text-slate-500 italic">Aucun constat enregistré pour cette mission.</p>
          ) : (
            <div className="space-y-12">
              {report.findings.map((finding, index) => {
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
                            const rStatus = recoStatusConfig[reco.status] || recoStatusConfig.PENDING;
                            
                            return (
                              <div key={reco.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="text-sm font-medium text-slate-900">
                                    {index + 1}.{rIndex + 1} {reco.title}
                                  </h5>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${rStatus.color} ml-2 flex-shrink-0`}>
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
}
