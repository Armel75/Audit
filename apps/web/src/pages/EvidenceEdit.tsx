import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate, useParams } from 'react-router-dom';

export default function EvidenceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [source, setSource] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [isSensitive, setIsSensitive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    const res = await apiFetch(`${API_BASE}/evidences`);
    const data = await res.json();

    const e = data.find((x: any) => x.id === Number(id));

    if (e) {
      setTitle(e.title || '');
      setDescription(e.description || '');
      setEvidenceType(e.evidenceType || '');
      setSource(e.source || '');
      setCollectionDate(
        e.collectionDate
          ? new Date(e.collectionDate).toISOString().split('T')[0]
          : ''
      );
      setIsSensitive(e.isSensitive || false);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await apiFetch(`${API_BASE}/evidences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          evidenceType,
          source,
          collectionDate: collectionDate || undefined,
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

  if (loading) return <div className="p-6">Chargement...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">

      <button onClick={() => navigate(-1)} className="mb-4 text-indigo-600">
        ← Retour
      </button>

      <h1 className="text-lg font-semibold mb-4">Modifier Evidence</h1>

      {error && <div className="bg-red-100 p-2 mb-3">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">

        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 rounded" />

        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border p-2 rounded" />

        <input value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="w-full border p-2 rounded" />

        <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full border p-2 rounded" />

        <input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} className="w-full border p-2 rounded" />

        <label className="flex gap-2">
          <input type="checkbox" checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} />
          Sensible
        </label>

        <div className="flex justify-end">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded">
            {submitting ? '...' : 'Mettre à jour'}
          </button>
        </div>

      </form>
    </div>
  );
}