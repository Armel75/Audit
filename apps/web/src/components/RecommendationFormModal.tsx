import { useEffect, useRef, useState } from 'react';
import { Paperclip, Upload, X } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface RecommendationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  findingId: number;
  onSuccess: () => void;
  recommendation?: any | null;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RecommendationFormModal({
  isOpen,
  onClose,
  findingId,
  onSuccess,
  recommendation = null
}: RecommendationFormModalProps) {
  const [title, setTitle] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [assigneeGlpiUserId, setAssigneeGlpiUserId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const [priorities, setPriorities] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [glpiUsers, setGlpiUsers] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!isOpen) return;

    apiFetch(`${API_BASE}/settings/priority-levels`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPriorities(data);
      })
      .catch(console.error);

    apiFetch(`${API_BASE}/settings/departments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(console.error);

    apiFetch(`${API_BASE}/users`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error);

    apiFetch(`${API_BASE}/glpi/users`)
      .then(async (res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setGlpiUsers(data);
      })
      .catch(console.error);
  }, [API_BASE, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setTitle(recommendation?.title || '');
    setActionPlan(recommendation?.actionPlan || '');
    setPriorityId(recommendation?.priorityId ? String(recommendation.priorityId) : '');
    setDepartmentId(recommendation?.departmentId ? String(recommendation.departmentId) : '');
    setAssigneeName(recommendation?.assigneeName || '');
    setAssigneeUserId(recommendation?.assigneeUserId ? String(recommendation.assigneeUserId) : '');
    setAssigneeGlpiUserId(recommendation?.assigneeGlpiUserId ? String(recommendation.assigneeGlpiUserId) : '');
    setTargetDate(
      recommendation?.targetDate
        ? new Date(recommendation.targetDate).toISOString().slice(0, 10)
        : ''
    );
    setFiles([]);
    setError(null);
    setIsDraggingFiles(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [isOpen, recommendation]);

  if (!isOpen) return null;

  const mergeFiles = (incomingFiles: File[]) => {
    if (!incomingFiles.length) return;

    setFiles((currentFiles) => {
      const nextFiles = [...currentFiles];

      for (const file of incomingFiles) {
        const exists = nextFiles.some(
          (currentFile) =>
            currentFile.name === file.name &&
            currentFile.size === file.size &&
            currentFile.lastModified === file.lastModified
        );

        if (!exists) {
          nextFiles.push(file);
        }
      }

      return nextFiles;
    });
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
  };

  const resetForm = () => {
    setTitle('');
    setActionPlan('');
    setPriorityId('');
    setDepartmentId('');
    setAssigneeName('');
    setAssigneeUserId('');
    setAssigneeGlpiUserId('');
    setTargetDate('');
    setFiles([]);
    setError(null);
    setIsDraggingFiles(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetDate) {
      setError('La date cible est obligatoire');
      return;
    }

    if (new Date(targetDate) < new Date()) {
      setError('La date doit etre dans le futur');
      return;
    }

    // ✅ Validation affectation (au moins un des 3)
    if (!assigneeUserId && !assigneeGlpiUserId && !assigneeName.trim()) {
      setError("Au moins un responsable doit être renseigné (interne, GLPI ou externe)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const isEditing = Boolean(recommendation?.id);
      const res = await apiFetch(
        isEditing ? `${API_BASE}/recommendations/${recommendation.id}` : `${API_BASE}/recommendations`,
        {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          actionPlan,
          priorityId: priorityId || undefined,
          departmentId: departmentId || undefined,
          assigneeName: assigneeName || undefined,
          assigneeUserId: assigneeUserId || undefined,
          assigneeGlpiUserId: assigneeGlpiUserId || undefined,
          targetDate: new Date(targetDate).toISOString(),
          findingId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      const savedRecommendation = isEditing ? recommendation : await res.json();

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('recommendationId', String(savedRecommendation.id));

        const uploadRes = await apiFetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => null);
          throw new Error(data?.error || 'Erreur lors de l\'upload des pieces jointes');
        }
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="fixed inset-0 bg-slate-900/50" onClick={onClose} />

        <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
          <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {recommendation ? 'Modifier la recommandation' : 'Nouvelle recommandation'}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Renseigne l&apos;essentiel, affecte un responsable et ajoute les pieces utiles.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="max-h-[85vh] overflow-y-auto px-6 py-6 sm:px-8">
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-700/40 p-5">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
                    Informations de la recommandation
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Les champs marques d&apos;un asterisque rouge sont obligatoires.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="recommendation-title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Titre <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="recommendation-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="recommendation-action-plan" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Plan d&apos;action <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="recommendation-action-plan"
                      required
                      rows={5}
                      value={actionPlan}
                      onChange={(e) => setActionPlan(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label htmlFor="recommendation-target-date" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Date cible <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="recommendation-target-date"
                        type="date"
                        required
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="recommendation-priority" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Priorite
                      </label>
                      <select
                        id="recommendation-priority"
                        value={priorityId}
                        onChange={(e) => setPriorityId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                      >
                        <option value="">Selectionner une priorite</option>
                        {priorities.map((priority) => (
                          <option key={priority.id} value={priority.id}>
                            {priority.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="recommendation-department" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Departement
                      </label>
                      <select
                        id="recommendation-department"
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                      >
                        <option value="">Selectionner un departement</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/40 p-5">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
                    Affectation
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Vous pouvez conserver les trois modes d&apos;assignation selon le contexte.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Responsable interne
                    </label>
                    <select
                      id="recommendation-assignee-user"
                      value={assigneeUserId}
                      onChange={(e) => setAssigneeUserId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    >
                      <option value="">Selectionner un utilisateur interne</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="recommendation-assignee-glpi" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Responsable de l&apos;action
                    </label>
                    <select
                      id="recommendation-assignee-glpi"
                      value={assigneeGlpiUserId}
                      onChange={(e) => setAssigneeGlpiUserId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    >
                      <option value="">Selectionner un utilisateur GLPI</option>
                      {glpiUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName || user.login || `GLPI User ${user.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="recommendation-assignee-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Responsable externe / texte libre
                    </label>
                    <input
                      id="recommendation-assignee-name"
                      type="text"
                      value={assigneeName}
                      onChange={(e) => setAssigneeName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/40 p-5">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-white">
                    Pieces jointes
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Vous pouvez ajouter plusieurs fichiers en une fois. L&apos;upload est fait apres la sauvegarde.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  id="recommendation-files"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => mergeFiles(Array.from(e.target.files || []))}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragLeave={() => setIsDraggingFiles(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(false);
                    mergeFiles(Array.from(e.dataTransfer.files || []));
                  }}
                  className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${
                    isDraggingFiles
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                      : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30'
                  }`}
                >
                  <Paperclip className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Ajouter un fichier</span>
                  <span className="mt-1 text-sm text-slate-600 dark:text-slate-300">ou glisser-déposer</span>
                  <span className="mt-1 text-xs text-slate-400 dark:text-slate-500">PDF, Word, Excel, JPG, PNG, GIF jusqu&apos;a 20MB</span>
                </button>

                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-3 rounded-md p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                          aria-label={`Retirer ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="mr-2 h-4 w-4" />
                {submitting ? 'Enregistrement...' : recommendation ? 'Enregistrer les modifications' : 'Creer la recommandation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
