import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Type,
  AlignLeft,
  Shield,
  Layers,
  GitBranch,
  TrendingDown,
  Loader2,
} from 'lucide-react';

interface RiskLevel {
  id: string;
  name: string;
  color: string;
}

interface FindingFormProps {
  missionId: string;
  onSuccess?: () => void;
}

const inputCls =
  'w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 hover:border-slate-300 outline-none';

const labelCls = 'block text-sm font-semibold text-slate-900 mb-2';

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
        throw new Error(data.error || 'Erreur lors de la creation du constat');
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
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 pb-16">
      <button
        type="button"
        onClick={() => navigate(`/missions/${missionId}`)}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour a la mission
      </button>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-100 px-8 py-7 border-b border-amber-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-md">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Nouveau constat</h1>
              <p className="text-sm text-slate-500 mt-1">
                Documentez un ecart, une non-conformite ou un risque identifie lors de la mission.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Section 1: Identification */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-5">Identification</h2>
            <div className="space-y-5">
              <div>
                <label className={labelCls}>
                  <Type className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Intitule court et precis du constat"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">Ex. : Absence de validation des factures fournisseurs</p>
              </div>

              <div>
                <label className={labelCls}>
                  <Shield className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Niveau de risque
                </label>
                <select
                  value={riskLevelId}
                  onChange={(e) => setRiskLevelId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Selectionner un niveau --</option>
                  {riskLevels.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Criticite du constat selon la grille de risques</p>
              </div>

              <div>
                <label className={labelCls}>
                  <Layers className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Processus concerne
                </label>
                <input
                  type="text"
                  placeholder="Ex. : Achats, Comptabilite, RH..."
                  value={process}
                  onChange={(e) => setProcess(e.target.value)}
                  className={inputCls}
                />
                <p className="text-xs text-slate-400 mt-1">Domaine ou fonction audite(e)</p>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100" />

          {/* Section 2: Analyse */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-5">Analyse</h2>
            <div className="space-y-5">
              <div>
                <label className={labelCls}>
                  <AlignLeft className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Decrivez precisement le constat observe, les faits constates et les references aux normes ou procedures applicables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputCls} resize-y`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>
                    <GitBranch className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                    Cause racine
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Quelle est l'origine profonde de ce constat ?"
                    value={cause}
                    onChange={(e) => setCause(e.target.value)}
                    className={`${inputCls} resize-y`}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    <TrendingDown className="inline w-3.5 h-3.5 mr-1 text-slate-400" />
                    Impact
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Quelles sont les consequences potentielles ?"
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                    className={`${inputCls} resize-y`}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Footer actions */}
          <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Les champs marques <span className="text-red-500">*</span> sont obligatoires
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creation en cours...' : 'Creer le constat'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}