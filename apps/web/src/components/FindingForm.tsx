import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface RiskLevel {
  id: string;
  name: string;
  color: string;
}

interface FindingFormProps {
  missionId: string;
  onSuccess?: () => void;
}

export default function FindingForm({ missionId, onSuccess }: FindingFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [process, setProcess] = useState('');
  const [cause, setCause] = useState('');
  const [impact, setImpact] = useState('');
  const [riskLevelId, setRiskLevelId] = useState('');
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    apiFetch(`${API_BASE}/settings/risk-levels`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRiskLevels(data);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch(`${API_BASE}/findings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          process: process || undefined,
          cause: cause || undefined,
          impact: impact || undefined,
          riskLevelId: riskLevelId || undefined,
          missionId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création du constat');
      }

      setTitle('');
      setDescription('');
      setProcess('');
      setCause('');
      setImpact('');
      setRiskLevelId('');

      onSuccess?.();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
      <button
  type="button"
  onClick={() => navigate(`/missions/${missionId}`)}
  className="mb-4 text-sm text-indigo-600 hover:underline"
>
  ← Retour à la mission
</button>
      <h3 className="text-lg font-medium text-slate-900 mb-5">
        Nouveau constat
      </h3>

      {error && (
        <div className="mb-4 bg-red-50 p-3 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <input
          placeholder="Titre *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        <textarea
          placeholder="Description *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <select
            value={riskLevelId}
            onChange={(e) => setRiskLevelId(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Niveau de risque</option>
            {riskLevels.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {/* <input
            placeholder="Processus"
            value={process}
            onChange={(e) => setProcess(e.target.value)}
            className="border p-2 rounded"
          /> */}
          <select className="border p-2 rounded">
            <option>Achat</option>
            <option>Finance</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <textarea
            placeholder="Cause racine"
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            className="border p-2 rounded"
          />

          <textarea
            placeholder="Impact"
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            className="border p-2 rounded"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            {submitting ? 'Création...' : 'Créer'}
          </button>
        </div>

      </form>
    </div>
  );
}