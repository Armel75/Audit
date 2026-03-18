import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, MessageSquare, Paperclip, User, Calendar, ShieldAlert, CheckCircle, XCircle, Upload, Plus, Target, Briefcase, FileText, Clock } from 'lucide-react';
import RecommendationFormModal from '../components/RecommendationFormModal';
import { apiFetch } from '../lib/api';

interface Recommendation {
  id: number;
  title: string;
  actionPlan: string;
  status: string;
  targetDate: string | null;
  priority: { name: string; color: string } | null;
  department: { name: string } | null;
  assigneeName: string | null;
}

interface Finding {
  id: number;
  title: string;
  description: string;
  process: string | null;
  cause: string | null;
  impact: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'ADDRESSED' | 'REJECTED';
  riskLevel: { name: string; color: string } | null;
  mission: { id: number; title: string; status: string };
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
  approvals: Array<{
    id: number;
    status: string;
    comments: string | null;
    createdAt: string;
    approver: { firstName: string; lastName: string };
  }>;
  recos: Recommendation[];
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
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
  CLOSED: { label: 'Clôturée', color: 'bg-slate-800 text-white' },
};

export default function FindingDetails() {
  const { id } = useParams<{ id: string }>();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isRecoModalOpen, setIsRecoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFinding = () => {
    apiFetch(`/api/findings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement du constat');
        return res.json();
      })
      .then(data => {
        setFinding(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFinding();
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await apiFetch(`/api/findings/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });

      if (!res.ok) throw new Error('Erreur lors de l\'ajout du commentaire');
      
      setNewComment('');
      fetchFinding();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Voulez-vous vraiment passer ce constat au statut ${newStatus} ?`)) return;

    try {
      const res = await apiFetch(`/api/findings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Erreur lors de la mise à jour du statut');
      fetchFinding();
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
    formData.append('findingId', id!);

    try {
      const res = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Erreur lors de l\'upload du document');
      
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchFinding();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement des détails du constat...</div>;
  }

  if (error || !finding) {
    return (
      <div className="p-8">
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <h3 className="text-sm font-medium text-red-800">{error || 'Constat introuvable'}</h3>
          </div>
        </div>
        <Link to="/missions" className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux missions
        </Link>
      </div>
    );
  }

  const conf = statusConfig[finding.status] || statusConfig.DRAFT;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Link to={`/missions/${finding.mission.id}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la mission ({finding.mission.title})
        </Link>
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{finding.title}</h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-slate-500">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                Auteur : {finding.author ? `${finding.author.firstName} ${finding.author.lastName}` : 'Inconnu'}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Créé le {new Date(finding.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
            <div className="flex space-x-2">
              {finding.riskLevel && (
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                  style={{ 
                    backgroundColor: `${finding.riskLevel.color}15`, 
                    color: finding.riskLevel.color,
                    borderColor: `${finding.riskLevel.color}30`
                  }}
                >
                  <ShieldAlert className="w-4 h-4 mr-1" />
                  Risque {finding.riskLevel.name}
                </span>
              )}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${conf.color}`}>
                {conf.label}
              </span>
            </div>
            
            {/* Action buttons based on status */}
            <div className="flex space-x-2 mt-2">
              {finding.status === 'DRAFT' && (
                <>
                  <button onClick={() => handleStatusChange('CONFIRMED')} className="text-xs inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200">
                    <CheckCircle className="w-3 h-3 mr-1" /> Confirmer
                  </button>
                  <button onClick={() => handleStatusChange('REJECTED')} className="text-xs inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                    <XCircle className="w-3 h-3 mr-1" /> Rejeter
                  </button>
                </>
              )}
              {finding.status === 'CONFIRMED' && (
                <button onClick={() => handleStatusChange('ADDRESSED')} className="text-xs inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">
                  <CheckCircle className="w-3 h-3 mr-1" /> Marquer comme traité
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Description du constat</h3>
            <div className="prose prose-sm max-w-none text-slate-600">
              <p className="whitespace-pre-wrap">{finding.description}</p>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Processus concerné</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 min-h-[60px]">
                  {finding.process || <span className="text-slate-400 italic">Non renseigné</span>}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Cause racine</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 min-h-[60px]">
                  {finding.cause || <span className="text-slate-400 italic">Non renseignée</span>}
                </p>
              </div>
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Impact / Conséquence</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 min-h-[60px]">
                  {finding.impact || <span className="text-slate-400 italic">Non renseigné</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Evidences */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-slate-400" />
                Preuves ({finding.evidences?.length || 0})
              </h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                + Ajouter une preuve
              </button>
            </div>
            {finding.evidences && finding.evidences.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {finding.evidences.map(evidence => (
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

          {/* Approvals */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-slate-400" />
                Approbations ({finding.approvals?.length || 0})
              </h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                + Demander une approbation
              </button>
            </div>
            {finding.approvals && finding.approvals.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {finding.approvals.map(approval => (
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
                      {approval.comments && <p className="text-sm text-slate-600 mt-1">{approval.comments}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Aucune approbation.</p>
            )}
          </div>

          {/* Recommendations Section */}
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-indigo-500" />
                  Recommandations ({finding.recos?.length || 0})
                </h3>
              </div>
              <div className="mt-4 sm:mt-0">
                <button
                  type="button"
                  onClick={() => setIsRecoModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Plus className="-ml-1 mr-2 h-4 w-4" />
                  Nouvelle Recommandation
                </button>
              </div>
            </div>

            <ul className="divide-y divide-slate-200">
              {!finding.recos || finding.recos.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">
                  Aucune recommandation pour ce constat.
                </li>
              ) : (
                finding.recos.map((reco) => {
                  const statusConf = recoStatusConfig[reco.status] || recoStatusConfig.PENDING;
                  return (
                    <li key={reco.id} className="hover:bg-slate-50 transition-colors">
                      <div className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <Link to={`/recommendations/${reco.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                            {reco.title}
                          </Link>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                            {statusConf.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{reco.actionPlan}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {reco.priority && (
                            <span className="flex items-center">
                              <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: reco.priority.color || '#cbd5e1' }}></span>
                              {reco.priority.name}
                            </span>
                          )}
                          {reco.department && (
                            <span className="flex items-center">
                              <Briefcase className="w-3 h-3 mr-1" />
                              {reco.department.name}
                            </span>
                          )}
                          {reco.assigneeName && (
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {reco.assigneeName}
                            </span>
                          )}
                          {reco.targetDate && (
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Échéance: {new Date(reco.targetDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Comments Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-indigo-500" />
              Commentaires ({finding.comments.length})
            </h3>
            
            <div className="space-y-4 mb-6">
              {finding.comments.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Aucun commentaire pour le moment.</p>
              ) : (
                finding.comments.map(comment => (
                  <div key={comment.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-slate-900">
                        {comment.author.firstName} {comment.author.lastName}
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
              {finding.statusHistory && finding.statusHistory.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {finding.statusHistory.map(history => (
                    <li key={history.id} className="py-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-900">
                          {history.previousStatus ? `${history.previousStatus} → ` : ''}{history.newStatus}
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
              Pièces jointes ({finding.documents.length})
            </h3>
            
            {finding.documents.length === 0 ? (
              <p className="text-sm text-slate-500 italic mb-4">Aucun document attaché.</p>
            ) : (
              <ul className="divide-y divide-slate-100 mb-4">
                {finding.documents.map(doc => (
                  <li key={doc.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <Paperclip className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                      <a href={`/api/documents/download/${doc.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 truncate">
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

          {/* Metadata */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-900 mb-4 uppercase tracking-wider">Méta-données</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Dernière mise à jour</dt>
                <dd className="font-medium text-slate-900">{new Date(finding.updatedAt).toLocaleString()}</dd>
              </div>
              {finding.validator && (
                <div>
                  <dt className="text-slate-500">Validé par</dt>
                  <dd className="font-medium text-slate-900">{finding.validator.firstName} {finding.validator.lastName}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {id && (
        <RecommendationFormModal 
          isOpen={isRecoModalOpen} 
          onClose={() => setIsRecoModalOpen(false)} 
          findingId={Number(id)} 
          onSuccess={() => {
            fetchFinding();
          }} 
        />
      )}
    </div>
  );
}
