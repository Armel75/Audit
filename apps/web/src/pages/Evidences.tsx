import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';

export default function Evidences() {
  const { findingId } = useParams();
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
    <div className="p-6 max-w-5xl mx-auto">
      
      <div className="flex justify-between items-center mb-4">
        <button
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-indigo-600 hover:underline"
            >
            ← Retour
        </button>
        <h1 className="text-xl font-semibold">Evidences</h1>

        <button
          onClick={() => navigate(`/evidences/create?findingId=${findingId}`)}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          + Ajouter
        </button>
      </div>

      {loading ? (
        <div>Chargement...</div>
      ) : evidences.length === 0 ? (
        <div>Aucune preuve</div>
      ) : (
        <table className="w-full border">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Titre</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {evidences.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.title}</td>
                <td className="p-2">{e.evidenceType}</td>
                <td className="p-2">
                  {e.collectionDate
                    ? new Date(e.collectionDate).toLocaleDateString()
                    : '-'}
                </td>
                <td className="p-2 flex gap-2">
                  <button
                    onClick={() => navigate(`/evidences/edit/${e.id}`)}
                    className="text-indigo-600"
                    >
                    Editer
                    </button>

                    <button
                    onClick={() => handleDelete(e.id)}
                    className="text-red-600"
                    >
                    Supprimer
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}