import React, { useRef, useState } from 'react';
import { HierarchyCommentType } from '../../types/HierarchyComment';

export interface HierarchyCommentFormValues {
  title: string;
  content: string;
  attachments?: File[];
}

interface HierarchyCommentFormProps {
  type: HierarchyCommentType;
  loading?: boolean;
  error?: string | null;
  onSubmit: (values: HierarchyCommentFormValues) => void;
}

/**
 * Formulaire premium pour ajouter/éditer un commentaire hiérarchique avec multi-pièces jointes.
 */
export const HierarchyCommentForm: React.FC<HierarchyCommentFormProps> = ({
  type,
  loading,
  error,
  onSubmit,
}) => {

  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title, content, attachments: selectedFiles });
    setSelectedFiles([]);
    setTitle('');
    setContent('');
    if (formRef.current) formRef.current.reset();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <label className="block font-semibold mb-1">
        Titre <span className="text-red-600">*</span>
        <input
          name="title"
          type="text"
          required
          minLength={2}
          maxLength={255}
          placeholder="Titre du commentaire (obligatoire)"
          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-400 mt-1"
          disabled={loading}
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </label>
      <label className="block font-semibold mb-1">
        Description <span className="text-red-600">*</span>
        <textarea
          name="content"
          required
          minLength={2}
          maxLength={2000}
          placeholder="Votre commentaire…"
          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-400 mt-1"
          rows={4}
          disabled={loading}
          value={content}
          onChange={e => setContent(e.target.value)}
        />
      </label>
      <label className={`inline-block cursor-pointer ${!title.trim() || title.length < 2 || !content.trim() || content.length < 2 ? 'opacity-60 pointer-events-none' : ''}`}>
        <span
          className="inline-flex items-center px-4 py-2 rounded bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors duration-150"
        >
          Joindre un ou plusieurs fichiers
        </span>
        <input
          type="file"
          name="attachments"
          multiple
          className="sr-only"
          disabled={loading || !title.trim() || title.length < 2 || !content.trim() || content.length < 2}
          onChange={handleFileChange}
        />
      </label>
      {selectedFiles.length > 0 && (
        <ul className="mt-2 space-y-1">
          {selectedFiles.map((file, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm bg-emerald-50 border border-emerald-100 rounded px-2 py-1">
              <span className="truncate max-w-xs" title={file.name}>{file.name}</span>
              <span className="text-xs text-slate-400">({(file.size/1024).toFixed(1)} Ko)</span>
              <button
                type="button"
                className="ml-2 px-3 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors duration-150"
                onClick={() => handleRemoveFile(idx)}
                title="Retirer ce fichier"
                disabled={loading}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Envoi…' : 'Publier'}
        </button>
      </div>
    </form>
  );
};
