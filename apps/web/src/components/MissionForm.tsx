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

  // 🔥 NOUVEAU : erreurs par champ
  const [fieldErrors, setFieldErrors] = useState<any>({});

  // 🔥 validation temps réel
  const validateField = (name: string, value: any) => {
    let error = '';

    if (name === 'title' && !value) error = 'Le titre est obligatoire';
    if (name === 'description' && !value) error = 'La description est obligatoire';
    if (name === 'planId' && !value) error = 'Le plan est obligatoire';
    if (name === 'leaderId' && !value) error = 'Le chef de mission est obligatoire';
    if (name === 'dates') {
      if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
          setFieldErrors((prev: any) => ({
            ...prev,
            startDate: "La date de début doit être avant la date de fin",
            endDate: "La date de fin doit être après la date de début"
          }));
          return;
        }
      }

      if ((startDate && !endDate) || (!startDate && endDate)) {
        setFieldErrors((prev: any) => ({
          ...prev,
          startDate: "Les deux dates doivent être renseignées",
          endDate: "Les deux dates doivent être renseignées"
        }));
        return;
      }

      // reset erreurs si OK
      setFieldErrors((prev: any) => ({
        ...prev,
        startDate: "",
        endDate: ""
      }));
    }
    setFieldErrors((prev: any) => ({
      ...prev,
      [name]: error
    }));
  };

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

    if (!mission) {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
    }

    apiFetch(`${API_BASE}/plans?status=VALIDATED`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPlans(data.filter(p => p.status === "VALIDATED"));
        }
      });

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

  // 🔥 correction deprecated ici
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // 🔥 validation finale avant submit
    validateField('title', title);
    validateField('description', description);
    validateField('planId', planId);
    validateField('leaderId', leaderId);

    if (!title || !description || !planId || !leaderId) {
      setSubmitting(false);
      return;
    }

    validateField('dates', null);

    if (
      fieldErrors.startDate ||
      fieldErrors.endDate
    ) {
      setSubmitting(false);
      return;
    }

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
    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
      <h1 className="text-xl font-semibold mb-2">
        {mission ? 'Modifier la Mission' : 'Nouvelle Mission'}
      </h1>

      <p className="text-sm text-gray-500 mb-4">
        Les champs marqués <span className="text-red-500">*</span> sont obligatoires
      </p>

      {error && (
        <div className="mb-4 bg-red-50 p-4 rounded text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        <div>
          <label>Titre <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              validateField('title', e.target.value);
            }}
            className="w-full border px-3 py-2 rounded"
          />
          {fieldErrors.title && <p className="text-red-500 text-sm">{fieldErrors.title}</p>}
        </div>

        <div>
          <label>Description <span className="text-red-500">*</span></label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              validateField('description', e.target.value);
            }}
            className="w-full border px-3 py-2 rounded"
          />
          {fieldErrors.description && <p className="text-red-500 text-sm">{fieldErrors.description}</p>}
        </div>

        <div>
          <label>Objectif</label>
          <textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="w-full border px-3 py-2 rounded" />
        </div>

        <div>
          <label>Plan <span className="text-red-500">*</span></label>
          <select
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              validateField('planId', e.target.value);
            }}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Sélectionner un plan</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.year} - {p.title} (Validé)</option>
            ))}
          </select>
          {fieldErrors.planId && <p className="text-red-500 text-sm">{fieldErrors.planId}</p>}
        </div>

        <div>
          <label>Type audit</label>
          <select value={auditTypeId} onChange={(e) => setAuditTypeId(e.target.value)} className="w-full border px-3 py-2 rounded">
            <option value="">Type audit</option>
            {auditTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Chef mission <span className="text-red-500">*</span></label>
          <select
            value={leaderId}
            onChange={(e) => {
              setLeaderId(e.target.value);
              validateField('leaderId', e.target.value);
            }}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="">Sélectionner un responsable</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
          {fieldErrors.leaderId && <p className="text-red-500 text-sm">{fieldErrors.leaderId}</p>}
        </div>

        {/* <div className="flex gap-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              validateField('dates', e.target.value);
            }}
            className="border px-3 py-2 rounded w-full"
          />

          {fieldErrors.startDate && (
            <p className="text-red-500 text-sm">{fieldErrors.startDate}</p>
          )}
                    
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              validateField('dates', e.target.value);
            }}
            className="border px-3 py-2 rounded w-full"
          />

          {fieldErrors.endDate && (
            <p className="text-red-500 text-sm">{fieldErrors.endDate}</p>
          )}
        </div> */}
        <div className="flex gap-4">

          <div className="w-full">
            <label>Date début  <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                validateField('dates', e.target.value);
              }}
              className="border px-3 py-2 rounded w-full"
            />
            {fieldErrors.startDate && (
              <p className="text-red-500 text-sm">{fieldErrors.startDate}</p>
            )}
          </div>

          <div className="w-full">
            <label>Date fin  <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                validateField('dates', e.target.value);
              }}
              className="border px-3 py-2 rounded w-full"
            />
            {fieldErrors.endDate && (
              <p className="text-red-500 text-sm">{fieldErrors.endDate}</p>
            )}
          </div>

        </div>

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