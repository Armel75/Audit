import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { ArrowLeft } from 'lucide-react';

export default function ProcedureFormPage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [procedureType, setProcedureType] = useState('');
  const [expectedEvidence, setExpectedEvidence] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sequenceNo, setSequenceNo] = useState<number | ''>(1);
  const [loading, setLoading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch(`${API_BASE}/programs/${programId}/procedures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          procedureType,
          expectedEvidence,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          sequenceNo: sequenceNo || undefined
        })
      });

      if (!res.ok) throw new Error();

      navigate(`/programs/${programId}`);
    } catch {
      alert('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-6">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour
        </button>

        <h1 className="text-2xl font-bold text-slate-900">
          Nouvelle procédure
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Définissez les étapes d’audit pour ce programme.
        </p>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6"
      >
        {/* Ligne 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              N° Ordre
            </label>
            <input
              type="number"
              value={sequenceNo}
              onChange={(e) => setSequenceNo(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-slate-700">
              Titre *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Ligne 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Type de procédure
            </label>
            <input
              value={procedureType}
              onChange={(e) => setProcedureType(e.target.value)}
              placeholder="Ex: Test de contrôle..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Preuve attendue
            </label>
            <input
              value={expectedEvidence}
              onChange={(e) => setExpectedEvidence(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Date d'échéance
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-md text-sm"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}