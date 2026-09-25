
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';


import { apiFetch } from '../lib/api';
// Téléchargement premium (fetch + blob, authentifié)
const handleDownload = async (docId: number, fileName: string) => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL;
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
    alert('Erreur lors du téléchargement');
  }
};
const API_BASE = import.meta.env.VITE_API_URL;
import { useAuth } from '../context/AuthContext';
import { hierarchyCommentTypeMeta, HierarchyCommentType } from '../types/HierarchyComment';
import { HierarchyCommentForm, HierarchyCommentFormValues } from '../components/hierarchy-comments/HierarchyCommentForm';
import SearchSelect from '../components/SearchSelect';
import { CheckCircle } from 'lucide-react';
// Utilitaire pour charger les missions accessibles (API paginée)
async function fetchMissions(): Promise<{ label: string; value: string }[]> {
  const API_BASE = import.meta.env.VITE_API_URL;
  const res = await apiFetch(`${API_BASE}/missions?page=1&limit=100`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map((m: any) => ({ label: m.title, value: String(m.id) }));
}


type HierarchyCommentOverview = {
  id: number;
  missionId: number;
  missionTitle: string;
  type: string;
  typeLabel: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  documents?: Array<{
    id: number;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
  }>;
};

export default function HierarchyCommentsOverview() {
  const { user } = useAuth();
  const [comments, setComments] = useState<HierarchyCommentOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [missions, setMissions] = useState<{ label: string; value: string }[]>([]);
  const [selectedMission, setSelectedMission] = useState<string>('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const commentTypes: HierarchyCommentType[] = [
    'DIRECTOR_CONCLUSION',
    'MANAGER_OBSERVATION',
    'INTERNAL_DISCUSSION',
  ];
  const [selectedType, setSelectedType] = useState<HierarchyCommentType>('DIRECTOR_CONCLUSION');
  // Charger les missions accessibles à l'ouverture du modal
  useEffect(() => {
    if (showModal) {
      fetchMissions().then(setMissions);
    }
  }, [showModal]);
  // Soumission du formulaire premium
  const handleAddComment = async (values: HierarchyCommentFormValues) => {
    if (!selectedMission) {
      setFormError('Veuillez sélectionner une mission.');
      return;
    }
    if (!selectedType) {
      setFormError('Veuillez sélectionner un type de commentaire.');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL;
      const formData = new FormData();
      formData.append('contextType', 'MISSION');
      formData.append('contextId', selectedMission);
      formData.append('type', selectedType);
      formData.append('title', values.title);
      formData.append('content', values.content);
      if (values.attachments) {
        values.attachments.forEach((file) => formData.append('attachments', file));
      }
      const res = await apiFetch(`${API_BASE}/hierarchy-comments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Erreur lors de l\'ajout du commentaire');
      setShowModal(false);
      setSelectedMission('');
      setFormError(null);
      // Optionnel : rafraîchir la liste
      window.location.reload();
    } catch (e: any) {
      setFormError(e.message || 'Erreur inconnue');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`${API_BASE}/hierarchy-comments/overview`);
        if (!res.ok) {
          let msg = 'Erreur lors du chargement';
          try {
            const text = await res.text();
            msg = text;
          } catch {}
          throw new Error(msg);
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error('Réponse inattendue du serveur : ' + text.slice(0, 120));
        }
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, []);

  const canCreate = user?.permissions?.includes('comment:create');

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Commentaires hiérarchiques de mes missions</h1>
        {canCreate && (
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
            onClick={() => setShowModal(true)}
            type="button"
          >
            Ajouter un commentaire hiérarchique
          </button>
        )}
      </div>
            {/* Modal premium (étape suivante) */}
            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-8 min-w-[340px] max-w-lg w-full max-h-[90vh] overflow-y-auto relative animate-fadein">
                  <button
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xl font-bold"
                    onClick={() => setShowModal(false)}
                    aria-label="Fermer"
                    type="button"
                  >
                    ×
                  </button>
                  <div className="text-lg font-semibold mb-4">Ajouter un commentaire hiérarchique</div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-200 mb-2">
                      Mission (cliquer pour choisir une mission) <span className="text-red-600">*</span>
                    </label>
                    <SearchSelect
                      options={missions}
                      value={selectedMission}
                      onChange={setSelectedMission}
                      placeholder="Rechercher une mission..."
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-900 dark:text-slate-200 mb-2">Type de commentaire</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 hover:border-slate-300"
                      value={selectedType}
                      onChange={e => setSelectedType(e.target.value as HierarchyCommentType)}
                      required
                    >
                      {commentTypes.map(type => (
                        <option key={type} value={type}>{hierarchyCommentTypeMeta[type].label}</option>
                      ))}
                    </select>
                  </div>
                  <HierarchyCommentForm
                    type={selectedType}
                    loading={formLoading}
                    error={formError}
                    onSubmit={handleAddComment}
                  />
                </div>
              </div>
            )}
      {loading && <div>Chargement…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && comments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tout est a jour !</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Aucun commentaire hiérarchique pour vos missions.</p>
        </div>
      )}
      {!loading && !error && comments.length > 0 && (
        <div className="overflow-x-auto rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="min-w-full text-sm align-middle">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                <th className="p-3 font-semibold text-left border-b border-slate-200 dark:border-slate-700">Mission</th>
                <th className="p-3 font-semibold text-left border-b border-slate-200 dark:border-slate-700">Type</th>
                <th className="p-3 font-semibold text-left border-b border-slate-200 dark:border-slate-700">Titre</th>
                <th className="p-3 font-semibold text-left border-b border-slate-200 dark:border-slate-700">Description</th>
                <th className="p-3 font-semibold text-left border-b border-slate-200 dark:border-slate-700">Auteur</th>
                <th className="p-3 font-semibold text-left border-b border-slate-200 dark:border-slate-700">Date</th>
                <th className="p-3 font-semibold text-left border-b border-slate-200 dark:border-slate-700">Pièces jointes</th>
                <th className="p-3 font-semibold text-center border-b border-slate-200 dark:border-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c, idx) => (
                <tr
                  key={c.id}
                  className={[
                    "border-b border-slate-100 dark:border-slate-800 transition-all duration-200",
                    "hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:shadow-md",
                    "group animate-fadein",
                    idx % 2 === 1 ? "bg-slate-50 dark:bg-slate-950/40" : "bg-white dark:bg-slate-900"
                  ].join(' ')}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <td className="p-3 font-medium text-emerald-700 max-w-[220px] truncate">
                    <Link to={`/missions/${c.missionId}`} className="underline hover:text-emerald-900" title={c.missionTitle}>{c.missionTitle}</Link>
                  </td>
                  <td className="p-3 flex items-center gap-2 min-w-[160px]">
                    {/* Icône premium dans l'étape suivante */}
                    {hierarchyCommentTypeMeta[c.type as keyof typeof hierarchyCommentTypeMeta]?.label ?? c.type}
                  </td>
                  <td className="p-3 max-w-[180px] truncate" title={c.title}>{c.title}</td>
                  <td className="p-3 max-w-[320px] whitespace-pre-line">
                    <span
                      className="block max-h-[3.6em] overflow-hidden text-ellipsis"
                      style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}
                      title={c.content}
                    >
                      {c.content}
                    </span>
                  </td>
                  <td className="p-3 max-w-[140px] truncate" title={c.authorName}>{c.authorName}</td>
                  <td className="p-3 min-w-[100px]">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 max-w-[160px]">
                    {c.documents && c.documents.length > 0 ? (
                      <ul className="space-y-1">
                        {c.documents.map(doc => (
                          <li key={doc.id} className="flex items-center gap-2">
                            <button
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors"
                              onClick={() => handleDownload(doc.id, doc.originalName)}
                              title={`Télécharger ${doc.originalName}`}
                              type="button"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                              {doc.originalName.length > 18 ? doc.originalName.slice(0, 15) + '…' : doc.originalName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 min-w-[110px] text-center">
                    <Link
                      to={`/missions/${c.missionId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                      title="Voir la mission"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0 5-9 9-9 9s-9-4-9-9a9 9 0 0118 0z" /></svg>
                      Voir la mission
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fadein { animation: fadein 0.5s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}
