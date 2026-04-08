import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import {
  ArrowLeft,
  ClipboardList,
  Hash,
  Type,
  AlignLeft,
  Tag,
  SearchCheck,
  Calendar,
  UserCheck,
  Flag,
  Paperclip,
  X,
  Upload,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface User {
  id: number;
  firstName: string;
  lastName: string;
}

interface PriorityLevel {
  id: number;
  name: string;
  level: number;
}

const PROCEDURE_TYPES = [
  { value: 'INTERVIEW',      label: 'Entretien' },
  { value: 'OBSERVATION',    label: 'Observation' },
  { value: 'INSPECTION',     label: 'Inspection documentaire' },
  { value: 'REPERFORMANCE',  label: 'Re-execution' },
  { value: 'ANALYTICAL',     label: 'Procedure analytique' },
  { value: 'CONFIRMATION',   label: 'Confirmation externe' },
  { value: 'OTHER',          label: 'Autre' },
];

const inputCls =
  'w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 hover:border-slate-300 outline-none';

const labelCls = 'block text-sm font-semibold text-slate-900 mb-2';

export default function ProcedureFormPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL;

  const [users, setUsers] = useState<User[]>([]);
  const [priorities, setPriorities] = useState<PriorityLevel[]>([]);

  const [sequenceNo, setSequenceNo] = useState<number | ''>(1);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [procedureType, setProcedureType] = useState('');
  const [expectedEvidence, setExpectedEvidence] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priorityId, setPriorityId] = useState('');

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_BASE}/users`).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/settings/priority-levels`).then(r => r.ok ? r.json() : []),
    ]).then(([usersData, priData]) => {
      setUsers(usersData);
      setPriorities([...(priData as PriorityLevel[])].sort((a, b) => a.level - b.level));
    });
  }, [API_BASE]);

  const removeFile = (idx: number) =>
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setPendingFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = Array.from(e.target.files); // capture avant tout reset
    e.target.value = ''; // reset l'input pour permettre de re-selectionner le meme fichier
    setPendingFiles(prev => [...prev, ...selected]);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/programs/${programId}/procedures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          code: code || undefined,
          description: description || undefined,
          procedureType: procedureType || undefined,
          expectedEvidence: expectedEvidence || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          sequenceNo: sequenceNo || undefined,
          assignedToId: assignedToId ? Number(assignedToId) : undefined,
          priorityId: priorityId ? Number(priorityId) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Erreur lors de la creation');
      }

      const created = await res.json();

      if (pendingFiles.length > 0 && created.id) {
        for (let i = 0; i < pendingFiles.length; i++) {
          setUploadProgress(`Envoi du fichier ${i + 1}/${pendingFiles.length}...`);
          const fd = new FormData();
          fd.append('file', pendingFiles[i]);
          fd.append('procedureId', String(created.id));
          await apiFetch(`${API_BASE}/documents/upload`, { method: 'POST', body: fd });
        }
      }

      navigate(`/programs/${programId}`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la creation de la procedure');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 pb-16">
      <button
        onClick={() => navigate(`/programs/${programId}`)}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au programme
      </button>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-8 py-7 border-b border-indigo-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-md">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Nouvelle procedure d'audit</h1>
              <p className="text-sm text-slate-500 mt-1">
                Definissez le point de controle, son responsable et les preuves attendues.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">

          {/* Section 1: Identification */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-5">Identification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              <div>
                <label className={labelCls}>
                  <Hash className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  N&deg; ordre
                </label>
                <input
                  type="number"
                  min={1}
                  value={sequenceNo}
                  onChange={e => setSequenceNo(e.target.value ? Number(e.target.value) : '')}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">Position dans le programme</p>
              </div>
              <div>
                <label className={labelCls}>
                  <Tag className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="ex. CTL-01"
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">Reference interne optionnelle</p>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  <Type className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Intitule de la procedure"
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">Nom court et precis du point de controle</p>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 2: Contenu */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-5">Contenu</h2>
            <div className="space-y-5">
              <div>
                <label className={labelCls}>
                  <AlignLeft className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Decrivez la procedure, son objectif et sa portee..."
                  className={`${inputCls} resize-y`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>
                    <Tag className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                    Type de procedure
                  </label>
                  <select
                    value={procedureType}
                    onChange={e => setProcedureType(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Selectionner --</option>
                    {PROCEDURE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Nature de la demarche d'audit</p>
                </div>
                <div>
                  <label className={labelCls}>
                    <SearchCheck className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                    Preuve attendue
                  </label>
                  <input
                    type="text"
                    value={expectedEvidence}
                    onChange={e => setExpectedEvidence(e.target.value)}
                    placeholder="ex. Rapport d'inventaire signe"
                    className={inputCls}
                  />
                  <p className="text-xs text-slate-400 mt-1">Document ou element a collecter</p>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 3: Planification */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-5">Planification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className={labelCls}>
                  <Calendar className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Date d'echeance
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  <UserCheck className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Assigne a
                </label>
                <select
                  value={assignedToId}
                  onChange={e => setAssignedToId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Non assigne --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Auditeur responsable</p>
              </div>
              <div>
                <label className={labelCls}>
                  <Flag className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Priorite
                </label>
                <select
                  value={priorityId}
                  onChange={e => setPriorityId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Aucune --</option>
                  {priorities.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 4: Pieces jointes */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-5">Pieces jointes</h2>
            {/* input en dehors du label pour eviter tout conflit d'evenements */}
            <input
              id="procedure-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            />
            <label
              htmlFor="procedure-file-input"
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`flex flex-col items-center cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              <Upload className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Glissez vos fichiers ici ou{' '}
                <span className="text-indigo-600 underline">cliquez pour parcourir</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, images - max 20 MB</p>
            </label>

            {pendingFiles.length > 0 && (
              <ul className="mt-4 space-y-2">
                {pendingFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <Paperclip className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(f.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-4 p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(`/programs/${programId}`)}
              className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-400"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress ?? 'Creation en cours...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Creer la procedure
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}