import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, Clock, FileText, Target, List } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Procedure {
  id: number;
  sequenceNo: number;
  title: string;
  procedureType: string | null;
  description: string | null;
  expectedEvidence: string | null;
  status: string;
  dueDate: string | null;
  performedBy: { firstName: string; lastName: string } | null;
  actualResult: string | null;
  conclusion: string | null;
}

interface Program {
  id: number;
  title: string;
  objective: string | null;
  scopeDescription: string | null;
  methodology: string | null;
  auditCriteria: string | null;
  samplingApproach: string | null;
  status: string;
  mission: { id: number; title: string; status: string };
  preparedBy: { firstName: string; lastName: string } | null;
  reviewedBy: { firstName: string; lastName: string } | null;
  approvedBy: { firstName: string; lastName: string } | null;
  procedures: Procedure[];
}

export default function AuditProgramDetails() {
  const { id } = useParams<{ id: string }>();
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
    //setIsProcedureModalOpen(true);
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
      
      //setIsProcedureModalOpen(false);
      fetchProgram();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingProc(false);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div>
        <Link to={`/missions/${program.mission.id}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la mission ({program.mission.title})
        </Link>
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{program.title}</h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-slate-500">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                {program.status}
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
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-500" />
              Détails du programme
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Objectif</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 whitespace-pre-wrap">
                  {program.objective || <span className="italic text-slate-400">Non renseigné</span>}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Périmètre (Scope)</h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 whitespace-pre-wrap">
                  {program.scopeDescription || <span className="italic text-slate-400">Non renseigné</span>}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Méthodologie</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 whitespace-pre-wrap">
                    {program.methodology || <span className="italic text-slate-400">Non renseignée</span>}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Critères d'audit</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100 whitespace-pre-wrap">
                    {program.auditCriteria || <span className="italic text-slate-400">Non renseignés</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 sm:flex sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium leading-6 text-slate-900 flex items-center">
                <List className="w-5 h-5 mr-2 text-indigo-500" />
                Procédures d'audit ({program.procedures.length})
              </h3>
              <button
                // onClick={openNewProcedureModal}
                onClick={() => navigate(`/programs/${program.id}/procedures/new`)}
                className="mt-3 sm:mt-0 inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Nouvelle procédure
              </button>
            </div>

            <ul className="divide-y divide-slate-200">
              {program.procedures.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">
                  Aucune procédure d'audit définie.
                </li>
              ) : (
                program.procedures.map(proc => (
                  <li key={proc.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mr-3">
                            {proc.sequenceNo}
                          </span>
                          <h4 className="text-base font-medium text-slate-900">{proc.title}</h4>
                          <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {proc.status}
                          </span>
                        </div>
                        
                        <div className="ml-9 space-y-3">
                          {proc.description && (
                            <p className="text-sm text-slate-600">{proc.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {proc.procedureType && (
                              <div>
                                <span className="font-medium text-slate-700">Type: </span>
                                <span className="text-slate-600">{proc.procedureType}</span>
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
                                <span className="font-medium text-slate-700">Échéance: </span>
                                <span className="text-slate-600">{new Date(proc.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {proc.performedBy && (
                              <div>
                                <span className="font-medium text-slate-700">Exécuté par: </span>
                                <span className="text-slate-600">{proc.performedBy.firstName} {proc.performedBy.lastName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button onClick={() => openEditProcedureModal(proc)} className="text-slate-400 hover:text-indigo-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProcedure(proc.id)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-900 mb-4 uppercase tracking-wider">Informations</h3>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Mission</dt>
                <dd className="font-medium text-slate-900">
                  <Link to={`/missions/${program.mission.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {program.mission.title}
                  </Link>
                </dd>
              </div>
              {program.reviewedBy && (
                <div>
                  <dt className="text-slate-500">Revu par</dt>
                  <dd className="font-medium text-slate-900">{program.reviewedBy.firstName} {program.reviewedBy.lastName}</dd>
                </div>
              )}
              {program.approvedBy && (
                <div>
                  <dt className="text-slate-500">Approuvé par</dt>
                  <dd className="font-medium text-slate-900">{program.approvedBy.firstName} {program.approvedBy.lastName}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

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
