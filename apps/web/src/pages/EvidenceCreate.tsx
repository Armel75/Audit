import { useState, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileSearch,
  Type,
  AlignLeft,
  Tag,
  Database,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Paperclip,
  X,
} from 'lucide-react';

const inputCls =
  'w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 hover:border-slate-300 outline-none';

const labelCls = 'block text-sm font-semibold text-slate-900 mb-2';

export default function EvidenceCreate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const findingId = params.get('findingId');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [source, setSource] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [isSensitive, setIsSensitive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Step 1: Create evidence with metadata
      const res = await apiFetch(`${API_BASE}/evidences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          evidenceType,
          source,
          collectionDate: collectionDate || undefined,
          findingId: findingId ? Number(findingId) : undefined,
          isSensitive
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }

      const evidence = await res.json();

      // Step 2: Upload file(s) if selected
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        for (const file of selectedFiles) {
          formData.append('files', file);
        }

        const uploadRes = await apiFetch(`${API_BASE}/evidences/${evidence.id}/upload`, {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          console.error('File upload error (evidence still created):', uploadErr);
          throw new Error(uploadErr.error || 'Erreur lors de l\'upload des fichiers');
        }
      }

      navigate(-1);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 pb-16">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-100 px-8 py-7 border-b border-teal-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-md">
              <FileSearch className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Nouvelle evidence</h1>
              <p className="text-sm text-slate-500 mt-1">
                Enregistrez un element probant collecte lors de la mission d'audit.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Section 1 : Identification */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-5">Identification</h2>
            <div className="space-y-5">

              <div>
                <label className={labelCls}>
                  <Type className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Intitule de l'evidence"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">Ex. : Rapport d'inventaire du 31/03/2026</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>
                    <Tag className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                    Type de preuve <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex. : Document, Photo, Temoignage..."
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className={inputCls}
                  />
                  <p className="text-xs text-slate-400 mt-1">Nature de l'element probant</p>
                </div>

                <div>
                  <label className={labelCls}>
                    <Database className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                    Source
                  </label>
                  <input
                    type="text"
                    placeholder="Ex. : Systeme comptable, DAF..."
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className={inputCls}
                  />
                  <p className="text-xs text-slate-400 mt-1">Origine de l'evidence</p>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 2 : Details */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-5">Details</h2>
            <div className="space-y-5">

              <div>
                <label className={labelCls}>
                  <AlignLeft className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Decrivez le contenu et la pertinence de cette evidence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputCls} resize-y`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>
                    <Calendar className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                    Date de collecte
                  </label>
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className={inputCls}
                  />
                  <p className="text-xs text-slate-400 mt-1">Quand l'evidence a-t-elle ete obtenue ?</p>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isSensitive}
                        onChange={(e) => setIsSensitive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-teal-500 transition-colors duration-200" />
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-slate-400" />
                        Donnee sensible
                      </p>
                      <p className="text-xs text-slate-400">Acces restreint aux auditeurs autorises</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 3 : Piece jointe */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-5">Piece jointe (optionnel)</h2>
            <div className="space-y-5">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setSelectedFiles((prev) => [...prev, ...files]);
                    }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-teal-400 hover:text-teal-600 transition-all"
                >
                  <Paperclip className="w-5 h-5" />
                  <span className="text-sm font-medium">Ajouter des pieces jointes</span>
                </button>
                <p className="text-xs text-slate-400 mt-2 text-center">PDF, Word, Excel, images (max 20 MB/fichier)</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-emerald-900 truncate">{file.name}</p>
                          <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Les champs marques <span className="text-red-500">*</span> sont obligatoires
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creation en cours...' : "Creer l'evidence"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}