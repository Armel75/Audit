import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RiskLevel {
  id: string;
  name: string;
  color: string;
}

interface FindingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  onSuccess: () => void;
}

export default function FindingFormModal({ isOpen, onClose, missionId, onSuccess }: FindingFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [process, setProcess] = useState('');
  const [cause, setCause] = useState('');
  const [impact, setImpact] = useState('');
  const [riskLevelId, setRiskLevelId] = useState('');
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch risk levels
      const token = localStorage.getItem('accessToken');
      fetch('/api/settings/risk-levels', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRiskLevels(data);
          }
        })
        .catch(err => console.error('Failed to fetch risk levels', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/findings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

      // Reset form
      setTitle('');
      setDescription('');
      setProcess('');
      setCause('');
      setImpact('');
      setRiskLevelId('');
      
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
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-slate-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-medium leading-6 text-slate-900">Nouveau Constat</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">Titre *</label>
                <input
                  type="text"
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description *</label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="riskLevelId" className="block text-sm font-medium text-slate-700">Niveau de risque</label>
                  <select
                    id="riskLevelId"
                    value={riskLevelId}
                    onChange={(e) => setRiskLevelId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Sélectionner un niveau</option>
                    {riskLevels.map(level => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="process" className="block text-sm font-medium text-slate-700">Processus concerné</label>
                  <input
                    type="text"
                    id="process"
                    value={process}
                    onChange={(e) => setProcess(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cause" className="block text-sm font-medium text-slate-700">Cause racine</label>
                  <textarea
                    id="cause"
                    rows={2}
                    value={cause}
                    onChange={(e) => setCause(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="impact" className="block text-sm font-medium text-slate-700">Impact / Conséquence</label>
                  <textarea
                    id="impact"
                    rows={2}
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {submitting ? 'Création...' : 'Créer le constat'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
