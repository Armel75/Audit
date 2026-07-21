import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function BusinessProcessForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    auditableEntityId: '',
    ownerDepartmentId: ''
  });

  const [entities, setEntities] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const API_BASE = import.meta.env.VITE_API_URL;

  // 🔗 Load dropdown data (comme dans MissionDetails)
  useEffect(() => {
    apiFetch(`${API_BASE}/referential/auditable-entities`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setEntities(data); })
      .catch(console.error);

    apiFetch(`${API_BASE}/settings/departments`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDepartments(data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!id) return;

    apiFetch(`${API_BASE}/business-processes/${id}`)
      .then(res => res.json())
      .then(data => {
        setForm({
          code: data.code || '',
          name: data.name || '',
          description: data.description || '',
          auditableEntityId: data.auditableEntityId || '',
          ownerDepartmentId: data.ownerDepartmentId || ''
        });
      })
      .catch(console.error);
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const url = isEdit
        ? `${API_BASE}/business-processes/${id}`
        : `${API_BASE}/business-processes`;

      const method = isEdit ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          auditableEntityId: form.auditableEntityId || null,
          ownerDepartmentId: form.ownerDepartmentId || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      navigate('/business-processes');

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">

      <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        {isEdit ? 'Modifier Business Process' : 'Nouveau Business Process'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* CODE */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Code *</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="mt-1 w-full border border-slate-300 rounded-md p-2"
            required
          />
        </div>

        {/* NAME */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Nom *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full border border-slate-300 rounded-md p-2"
            required
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full border border-slate-300 rounded-md p-2"
          />
        </div>

        {/* ENTITY */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Entité auditable
          </label>
          <select
            value={form.auditableEntityId}
            onChange={(e) => setForm({ ...form, auditableEntityId: e.target.value })}
            className="mt-1 w-full border border-slate-300 rounded-md p-2"
          >
            <option value="">-- Aucun --</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        {/* DEPARTMENT */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Département
          </label>
          <select
            value={form.ownerDepartmentId}
            onChange={(e) => setForm({ ...form, ownerDepartmentId: e.target.value })}
            className="mt-1 w-full border border-slate-300 rounded-md p-2"
          >
            <option value="">-- Aucun --</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/business-processes')}
            className="px-4 py-2 border border-slate-300 rounded-md"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md"
          >
            {loading
              ? (isEdit ? 'Modification...' : 'Création...')
              : (isEdit ? 'Mettre à jour' : 'Créer')}
          </button>
        </div>

      </form>
    </div>
  );
}