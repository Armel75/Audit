import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
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

      navigate(-1);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">

      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-indigo-600"
      >
        ← Retour
      </button>

      <h1 className="text-lg font-semibold mb-4">Nouvelle Evidence</h1>

      {error && <div className="bg-red-100 p-2 mb-3">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          placeholder="Titre *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Type de preuve *"
          value={evidenceType}
          onChange={(e) => setEvidenceType(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        <input
          placeholder="Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="date"
          value={collectionDate}
          onChange={(e) => setCollectionDate(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSensitive}
            onChange={(e) => setIsSensitive(e.target.checked)}
          />
          Donnée sensible
        </label>

        <div className="flex justify-end">
          <button
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