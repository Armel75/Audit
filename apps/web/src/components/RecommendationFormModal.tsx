import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface RecommendationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  findingId: number;
  onSuccess: () => void;
}

export default function RecommendationFormModal({
  isOpen,
  onClose,
  findingId,
  onSuccess
}: RecommendationFormModalProps) {
  const [title, setTitle] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const [priorities, setPriorities] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (isOpen) {
      apiFetch(`${API_BASE}/settings/priority-levels`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setPriorities(data); })
        .catch(console.error);

      apiFetch(`${API_BASE}/settings/departments`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setDepartments(data); })
        .catch(console.error);

      apiFetch(`${API_BASE}/users`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setUsers(data); })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ validation simple
    if (!targetDate) {
      setError('La date cible est obligatoire');
      return;
    }

    if (new Date(targetDate) < new Date()) {
      setError('La date doit être dans le futur');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch(`${API_BASE}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          actionPlan,
          priorityId: priorityId || undefined,
          departmentId: departmentId || undefined,

          // 🔥 IMPORTANT : compatibilité + évolution
          assigneeName: assigneeName || undefined,
          assigneeUserId: assigneeUserId || undefined,

          targetDate: new Date(targetDate).toISOString(),
          findingId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      // reset
      setTitle('');
      setActionPlan('');
      setPriorityId('');
      setDepartmentId('');
      setAssigneeName('');
      setAssigneeUserId('');
      setTargetDate('');

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
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="fixed inset-0 bg-slate-500 opacity-75" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-medium">Nouvelle Recommandation</h3>
            <button onClick={onClose}>
              <X />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 p-3 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="text"
              placeholder="Titre"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border p-2 rounded"
            />

            <textarea
              placeholder="Plan d'action"
              required
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              className="w-full border p-2 rounded"
            />

            {/* PRIORITY */}
            <select value={priorityId} onChange={(e) => setPriorityId(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Priorité</option>
              {priorities.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* DEPARTMENT */}
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Département</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* 🔥 USER ASSIGNMENT */}
            <select value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Responsable interne</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>

            {/* fallback */}
            <input
              type="text"
              placeholder="Responsable externe (nom libre)"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              className="w-full border p-2 rounded"
            />

            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full border p-2 rounded"
            />

            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded w-full"
            >
              {submitting ? 'Création...' : 'Créer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}