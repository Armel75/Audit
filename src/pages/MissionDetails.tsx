import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Plus, FileText, ChevronRight, Paperclip, Upload } from 'lucide-react';
import FindingFormModal from '../components/FindingFormModal';

interface Finding {
  id: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'CONFIRMED' | 'ADDRESSED' | 'REJECTED';
  riskLevel: { name: string; color: string } | null;
  _count: { recos: number };
  createdAt: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  status: string;
  leader: { firstName: string; lastName: string };
  findings: Finding[];
  documents: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

const findingStatusConfig = {
  DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
  CONFIRMED: { label: 'Confirmé', color: 'bg-amber-100 text-amber-800' },
  ADDRESSED: { label: 'Traité', color: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
};

export default function MissionDetails() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMission = () => {
    const token = localStorage.getItem('accessToken');
    fetch(`/api/missions/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
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
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('missionId', id!);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
              Chef de mission : {mission.leader.firstName} {mission.leader.lastName}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
              Statut : {mission.status}
            </span>
            <Link 
              to={`/missions/${id}/report`}
              className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FileText className="-ml-1 mr-2 h-4 w-4 text-slate-500" />
              Voir le rapport
            </Link>
          </div>
        </div>
        <div className="mt-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-900 mb-2">Description</h3>
          <p className="text-sm text-slate-600">{mission.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                  onClick={() => setIsModalOpen(true)}
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
        </div>
      </div>

      {id && (
        <FindingFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          missionId={id} 
          onSuccess={() => {
            fetchMission();
          }} 
        />
      )}
    </div>
  );
}
