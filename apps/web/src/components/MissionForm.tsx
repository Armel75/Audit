import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

interface MissionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  mission?: any;
}

export default function MissionForm({ onSuccess, onCancel, mission }: MissionFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [scopeDescription, setScopeDescription] = useState('');
  const [methodology, setMethodology] = useState('');
  const [planId, setPlanId] = useState('');
  const [auditTypeId, setAuditTypeId] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [plans, setPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditTypes, setAuditTypes] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditableEntities, setAuditableEntities] = useState<any[]>([]);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (mission) {
      setTitle(mission.title || '');
      setDescription(mission.description || '');
      setObjective(mission.objective || '');
      setScopeDescription(mission.scopeDescription || '');
      setMethodology(mission.methodology || '');
      setPlanId(mission.planId || '');
      setAuditTypeId(mission.auditTypeId || '');
      setLeaderId(mission.leaderId || (mission.leader ? mission.leader.id : ''));
      setStartDate(mission.startDate ? new Date(mission.startDate).toISOString().split('T')[0] : '');
      setEndDate(mission.endDate ? new Date(mission.endDate).toISOString().split('T')[0] : '');
    }

    apiFetch(`${API_BASE}/plans`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setPlans(data))
      .catch(err => console.error('Failed to fetch plans', err));

    apiFetch(`${API_BASE}/settings/audit-types`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setAuditTypes(data))
      .catch(err => console.error('Failed to fetch audit types', err));

    apiFetch(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setUsers(data))
      .catch(err => console.error('Failed to fetch users', err));

    apiFetch(`${API_BASE}/auditable-entities`)
      .then(res => res.json())
      .then(data => Array.isArray(data) && setAuditableEntities(data))
      .catch(err => console.error('Failed to fetch auditable entities', err));

  }, [mission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url = mission ? `${API_BASE}/missions/${mission.id}` : `${API_BASE}/missions`;
      const method = mission ? 'PUT' : 'POST';

      const payload: any = {
        title,
        description,
        objective,
        scopeDescription,
        methodology,
        planId: planId ? Number(planId) : null,
        auditTypeId: auditTypeId ? Number(auditTypeId) : null,
        leaderId: leaderId ? Number(leaderId) : null,
      };

      if (startDate) payload.startDate = new Date(startDate).toISOString();
      if (endDate) payload.endDate = new Date(endDate).toISOString();

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
    
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
      <h1 className="text-xl font-semibold mb-6">
        {mission ? 'Modifier la Mission' : 'Nouvelle Mission'}
      </h1>

      {error && (
        <div className="mb-4 bg-red-50 p-4 rounded text-red-700">
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
          className="w-full border px-3 py-2 rounded"
        />

        <textarea
          placeholder="Description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        <textarea
          placeholder="Objectif"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />

        <select value={planId} onChange={(e) => setPlanId(e.target.value)} required className="w-full border px-3 py-2 rounded">
          <option value="">Plan</option>
          {plans.map(p => (
            <option key={p.id} value={p.id}>{p.year} - {p.title}</option>
          ))}
        </select>

        <select value={auditTypeId} onChange={(e) => setAuditTypeId(e.target.value)} className="w-full border px-3 py-2 rounded">
          <option value="">Type audit</option>
          {auditTypes.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)} required className="w-full border px-3 py-2 rounded">
          <option value="">Chef mission</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>

        <div className="flex gap-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border px-3 py-2 rounded w-full" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border px-3 py-2 rounded w-full" />
        </div>

        {/* 🔥 AJOUT ICI */}
        {/* <select
          multiple
          value={selectedEntities.map(String)}
          onChange={(e) => {
            const values = Array.from(e.target.selectedOptions, o => Number(o.value));
            setSelectedEntities(values);
          }}
          className="w-full border px-3 py-2 rounded"
        >
          <option disabled>Entités auditables (scope)</option>
          {auditableEntities.map(e => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select> */}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="border px-4 py-2 rounded">
            Annuler
          </button>

          <button type="submit" disabled={submitting} className="bg-emerald-600 text-white px-4 py-2 rounded">
            {submitting ? '...' : 'Enregistrer'}
          </button>
        </div>

      </form>
    </div>
  );
}