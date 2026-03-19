import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function Missions() {
  const navigate = useNavigate();

  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMissions();
  }, []);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/missions');
      const data = await res.json();

      if (Array.isArray(data)) {
        setMissions(data);
      } else {
        setMissions([]);
      }
    } catch (err) {
      setError('Erreur lors du chargement des missions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette mission ?')) return;

    try {
      const res = await apiFetch(`/api/v1/missions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error();
      }

      setMissions(prev => prev.filter(m => m.id !== id));
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const filteredMissions = missions.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Missions</h1>

        <button
          onClick={() => navigate('/missions/new')}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
        >
          <Plus size={18} />
          Nouvelle mission
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-4 flex items-center gap-2">
        <Search size={18} />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-full max-w-sm"
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <div>Chargement...</div>
      ) : filteredMissions.length === 0 ? (
        <div className="text-slate-500">Aucune mission</div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-3">Titre</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Chef</th>
                <th className="p-3">Dates</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMissions.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 font-medium">{m.title}</td>

                  <td className="p-3">
                    {m.plan ? `${m.plan.year}` : '-'}
                  </td>

                  <td className="p-3">
                    {m.leader
                      ? `${m.leader.firstName} ${m.leader.lastName}`
                      : '-'}
                  </td>

                  <td className="p-3">
                    {m.startDate
                      ? new Date(m.startDate).toLocaleDateString()
                      : '-'}{' '}
                    →{' '}
                    {m.endDate
                      ? new Date(m.endDate).toLocaleDateString()
                      : '-'}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">

                      <button
                        onClick={() => navigate(`/missions/${m.id}/edit`)}
                        className="p-2 hover:bg-slate-100 rounded"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded"
                      >
                        <Trash2 size={16} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}