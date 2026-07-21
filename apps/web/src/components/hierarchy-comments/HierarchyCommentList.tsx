
const API_BASE = import.meta.env.VITE_API_URL;
  // Téléchargement premium (fetch + blob)
  const handleDownload = async (docId: number, fileName: string) => {
    try {
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
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { HierarchyComment as BaseHierarchyComment, HierarchyCommentType } from '../../types/HierarchyComment';

// Étend le type pour supporter documents et attachments optionnels
type HierarchyComment = BaseHierarchyComment & {
  documents?: Array<{
    id: number;
    originalName: string;
    [key: string]: any;
  }>;
  attachments?: Array<{
    id: number;
    name: string;
    url: string;
  }>;
};

interface HierarchyCommentListProps {
  comments: HierarchyComment[];
  loading?: boolean;
  error?: string | null;
  type: HierarchyCommentType;
  refresh?: () => void;
}

/**
 * Liste premium des commentaires hiérarchiques pour un type donné.
 */
export const HierarchyCommentList: React.FC<HierarchyCommentListProps> = ({
  comments,
  loading,
  error,
  type,
  refresh,
}) => {
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const canEdit = (comment: HierarchyComment) => {
    if (!user) return false;
    return (
      user.id === String(comment.author.id) ||
      (user.permissions && user.permissions.includes('comment:update'))
    );
  };

  const startEdit = (comment: HierarchyComment) => {
    setEditingId(comment.id);
    setEditTitle(comment.title);
    setEditContent(comment.content);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditError(null);
  };

  const handleEdit = async (id: number) => {
    if (!editTitle.trim()) {
      setEditError('Le titre est requis.');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/hierarchy-comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (!res.ok) throw new Error('Erreur lors de la modification');
      if (refresh) await refresh();
      cancelEdit();
    } catch (e) {
      setEditError('Erreur lors de la modification');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500 py-8 text-center">Chargement…</div>;
  }
  if (error) {
    return <div className="text-red-600 py-8 text-center">Erreur : {error}</div>;
  }
  if (!comments.length) {
    return <div className="text-slate-400 py-8 text-center">Aucun commentaire pour ce type.</div>;
  }
  const canDelete = (comment: HierarchyComment) => {
    if (!user) return false;
    return (
      user.id === String(comment.author.id) ||
      (user.permissions && user.permissions.includes('comment:delete'))
    );
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Confirmer la suppression de ce commentaire ?')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/hierarchy-comments/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      if (refresh) await refresh();
    } catch (e) {
      alert('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ul className="space-y-4">
      {comments.map((comment) => (
        <li key={comment.id} className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {comment.author.firstName} {comment.author.lastName}
            </span>
            <span className="text-xs text-slate-400">{comment.author.role}</span>
            <span className="ml-auto text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
            {canEdit(comment) && (
              <button
                onClick={() => startEdit(comment)}
                disabled={editingId === comment.id || editLoading}
                className="ml-2 px-3 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors duration-150"
                title="Modifier ce commentaire"
              >
                Modifier
              </button>
            )}
            {canDelete(comment) && (
              <button
                onClick={() => handleDelete(comment.id)}
                disabled={deletingId === comment.id}
                className="ml-2 px-3 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold border border-red-200 shadow-sm hover:bg-red-100 transition-colors duration-150"
                title="Supprimer ce commentaire"
              >
                {deletingId === comment.id ? 'Suppression…' : 'Supprimer'}
              </button>
            )}
          </div>
          {editingId === comment.id ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleEdit(comment.id);
              }}
              className="space-y-2"
            >
              <input
                className="w-full px-3 py-2 border rounded text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Titre du commentaire"
                required
                maxLength={100}
                disabled={editLoading}
              />
              <textarea
                className="w-full px-3 py-2 border rounded text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="Contenu du commentaire"
                rows={3}
                maxLength={2000}
                disabled={editLoading}
              />
              {editError && <div className="text-red-600 text-sm">{editError}</div>}
              <div className="flex gap-2 mt-1">
                <button
                  type="submit"
                  className="px-4 py-1 rounded bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-700 transition-colors duration-150"
                  disabled={editLoading}
                >
                  {editLoading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  className="px-4 py-1 rounded bg-slate-100 text-slate-700 text-sm font-semibold border border-slate-200 shadow hover:bg-slate-200 transition-colors duration-150"
                  onClick={cancelEdit}
                  disabled={editLoading}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {comment.title}
              </div>
              <div className="text-slate-800 dark:text-slate-200 whitespace-pre-line mb-2">
                {comment.content}
              </div>
            </>
          )}
          {(comment.attachments && comment.attachments.length > 0) || (comment.documents && comment.documents.length > 0) ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {/* Support legacy (attachments) et premium (documents) */}
              {comment.attachments && comment.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 text-xs bg-emerald-50 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded hover:underline"
                  download
                >
                  {att.name}
                </a>
              ))}
              {comment.documents && comment.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2">
                  <span className="truncate max-w-xs" title={doc.originalName}>{doc.originalName}</span>
                  <button
                    type="button"
                    className="inline-flex items-center px-2 py-1 text-xs bg-emerald-600 text-white border border-emerald-700 rounded hover:bg-emerald-700 transition-colors duration-150 font-semibold"
                    title={`Télécharger ${doc.originalName}`}
                    onClick={() => handleDownload(doc.id, doc.originalName)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                    Télécharger
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
};
