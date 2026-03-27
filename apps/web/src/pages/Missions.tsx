import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function Missions() {
  const navigate = useNavigate();

  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // PAGINATION
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchMissions();
  }, [page]);

  const fetchMissions = async () => {
    try {
      setLoading(true);

      const res = await apiFetch(`${API_BASE}/missions?page=${page}&limit=${limit}`);
      const data = await res.json();

      // 🔥 FIX CRITIQUE : gérer les 2 cas
      if (Array.isArray(data)) {
        // backend actuel (sans pagination)
        setMissions(data);
        setTotalPages(1);
      } else if (Array.isArray(data.data)) {
        // backend paginé (quand tu le corrigeras)
        setMissions(data.data);
        setTotalPages(data.totalPages || 1);
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
      const res = await apiFetch(`${API_BASE}/missions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error();

      fetchMissions();
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

      {/* TABLE */}
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
                <tr
                  key={m.id}
                  className="border-t cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/missions/${m.id}`)}
                >
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
                      : '-'} →{' '}
                    {m.endDate
                      ? new Date(m.endDate).toLocaleDateString()
                      : '-'}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/missions/${m.id}`);
                        }}
                        className="px-3 py-1 text-sm border rounded hover:bg-slate-100"
                      >
                        Voir détails
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/missions/${m.id}/edit`);
                        }}
                        className="px-3 py-1 text-sm border rounded hover:bg-slate-100"
                      >
                        Modifier mission
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                        className="px-3 py-1 text-sm border rounded text-red-600 hover:bg-red-100"
                      >
                        Supprimer mission
                      </button>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="flex justify-between items-center p-4 border-t">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Précédent
            </button>

            <span className="text-sm">
              Page {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Suivant
            </button>
          </div>

        </div>
      )}
    </div>
  );
}