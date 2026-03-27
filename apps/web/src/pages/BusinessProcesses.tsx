import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

interface BusinessProcess {
  id: number;
  code: string;
  name: string;
  description?: string;
  auditableEntity?: { name: string } | null;
  ownerDepartment?: { name: string } | null;
}

export default function BusinessProcesses() {
  const [data, setData] = useState<BusinessProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL;

  const fetchData = () => {
    apiFetch(`${API_BASE}/business-processes`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur chargement');
        return res.json();
      })
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Confirmer la désactivation ?')) return;

    try {
      const res = await apiFetch(`${API_BASE}/business-processes/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Chargement...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Business Processes
        </h1>

        <Link
          to="/business-processes/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md"
        >
          + Nouveau
        </Link>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Code</th>
              <th className="px-4 py-3 text-left text-sm">Nom</th>
              <th className="px-4 py-3 text-left text-sm">Entité</th>
              <th className="px-4 py-3 text-left text-sm">Département</th>
              <th className="px-4 py-3 text-right text-sm">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-6 text-slate-500">
                  Aucun process
                </td>
              </tr>
            ) : (
              data.map(bp => (
                <tr key={bp.id}>
                  <td className="px-4 py-3">{bp.code}</td>
                  <td className="px-4 py-3">{bp.name}</td>
                  <td className="px-4 py-3">
                    {bp.auditableEntity?.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {bp.ownerDepartment?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      to={`/business-processes/${bp.id}`}
                      className="text-indigo-600"
                    >
                      Voir
                    </Link>

                    <button
                      onClick={() => handleDelete(bp.id)}
                      className="text-red-600"
                    >
                      Désactiver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}