import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileSearch,
  Plus,
  Tag,
  Database,
  Calendar,
  ShieldAlert,
  AlignLeft,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

export default function Evidences() {
  const [searchParams] = useSearchParams();
  const findingId = searchParams.get('findingId');
  const navigate = useNavigate();

  const [evidences, setEvidences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchEvidences();
  }, [findingId]);

  const fetchEvidences = async () => {
    try {
      let url = `${API_BASE}/evidences`;
      if (findingId) {
        url += `?findingId=${findingId}`;
      }

      const res = await apiFetch(url);
      const data = await res.json();

      if (Array.isArray(data)) {
        setEvidences(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette preuve ?')) return;

    await apiFetch(`${API_BASE}/evidences/${id}`, {
      method: 'DELETE'
    });

    fetchEvidences();
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au constat
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-sm">
            <FileSearch className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Evidences</h1>
        </div>

        <button
          onClick={() => navigate(`/evidences/create?findingId=${findingId}`)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm font-medium">Chargement des evidences...</p>
        </div>
      ) : evidences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
          <FileSearch className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Aucune evidence</h3>
          <p className="text-sm text-slate-400 mt-1">Ajoutez un premier element probant pour ce constat.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {evidences.map(e => (
            <div
              key={e.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Color stripe */}
              <div className="h-1 w-full bg-gradient-to-r from-teal-400 to-cyan-400" />

              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                  {/* LEFT — infos */}
                  <div className="flex-1 space-y-4">

                    {/* Titre + badge sensible */}
                    <div className="flex items-start gap-3 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900 leading-snug">{e.title}</h2>
                      {e.isSensitive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 border border-red-200 text-red-700 shrink-0">
                          <ShieldAlert className="w-3 h-3" />
                          Sensible
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {e.description && (
                      <p className="text-sm text-slate-600 flex items-start gap-2">
                        <AlignLeft className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <span className="italic">{e.description}</span>
                      </p>
                    )}

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Tag className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="font-medium">{e.evidenceType || <span className="text-slate-400 italic">—</span>}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Database className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>{e.source || <span className="text-slate-400 italic">—</span>}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>
                          {e.collectionDate
                            ? new Date(e.collectionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                            : <span className="text-slate-400 italic">—</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — actions */}
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/evidences/edit/${e.id}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all duration-200"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl transition-all duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}