import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function UserDetail() {
  const { id } = useParams();

  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [allDepartments, setAllDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL;

  const fetchDepartments = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/users/${id}/departments?active=true`);

      if (!res.ok) throw new Error('Erreur chargement départements');

      const data = await res.json();
      setDepartments(data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDepartments = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/settings/departments`);

      if (!res.ok) throw new Error('Erreur chargement départements');

      const data = await res.json();
      setAllDepartments(data);

    } catch (err) {
      console.error(err);
    }
  };

const fetchUser = async () => {
  try {
    const res = await apiFetch(`${API_BASE}/users/${id}`);

    if (!res.ok) throw new Error();

    const data = await res.json();
    setUser(data);

  } catch (err) {
    console.error(err);
  }
};
  
  useEffect(() => {
    if (id) {
      fetchDepartments();
      fetchAllDepartments();
    }
  }, [id]);

  const setPrimary = async (departmentId: number) => {
    try {
      await apiFetch(`${API_BASE}/users/${id}/departments/${departmentId}/primary`, {
        method: 'PATCH'
      });
      fetchDepartments();
    } catch (err) {
      console.error(err);
    }
  };

  const removeDepartment = async (departmentId: number) => {
    if (!confirm('Supprimer ce département ?')) return;

    try {
      await apiFetch(`${API_BASE}/users/${id}/departments/${departmentId}`, {
        method: 'DELETE'
      });
      fetchDepartments();
    } catch (err) {
      console.error(err);
    }
  };

  const addDepartment = async () => {
    if (!selectedDept) return;

    try {
      await apiFetch(`${API_BASE}/users/${id}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: selectedDept,
          isPrimary
        })
      });

      setSelectedDept('');
      setIsPrimary(false);
      fetchDepartments();

    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 Filtrer les départements déjà assignés
  const availableDepartments = allDepartments.filter(
    (d) => !departments.some((ud) => ud.department.id === d.id)
  );

  return (
    <div className="p-6 space-y-6">

      <div>
        <div className="flex items-center gap-4">
        <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-500 hover:underline"
        >
            ← Retour
        </button>

        <div>
            <h1 className="text-2xl font-bold">
            {user ? `${user.firstName} ${user.lastName}` : 'Chargement...'}
            </h1>

            {user && (
            <p className="text-slate-500 text-sm">
                {user.email}
            </p>
            )}
        </div>

        </div>
      </div>

      {/* ✅ AJOUT DEPARTEMENT */}
      <div className="p-4 border rounded-lg space-y-3">
        <h3 className="font-semibold">Ajouter un département</h3>

        <div className="flex gap-2 items-center">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Sélectionner</option>
            {availableDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
            />
            Primary
          </label>

          <button
            onClick={addDepartment}
            className="bg-indigo-600 text-white px-3 py-1 rounded"
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* LISTE */}
      <div>
        <h2 className="text-lg font-semibold mb-2">
          Departments
        </h2>

        {loading && <p>Chargement...</p>}

        {!loading && departments.length === 0 && (
          <p className="text-slate-500">Aucun département</p>
        )}

        {!loading && departments.map((item) => (
          <div
            key={item.department.id}
            className="flex items-center justify-between p-3 border rounded-lg mb-2"
          >
            <div>
              <span className="font-medium">
                {item.department.name}
              </span>

              {item.isPrimary && (
                <span className="ml-2 text-yellow-500">⭐</span>
              )}
            </div>

            <div className="flex gap-2">
              {!item.isPrimary && (
                <button
                  onClick={() => setPrimary(item.department.id)}
                  className="text-sm px-2 py-1 bg-indigo-600 text-white rounded"
                >
                  Primary
                </button>
              )}

              <button
                onClick={() => removeDepartment(item.department.id)}
                className="text-sm px-2 py-1 bg-red-600 text-white rounded"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}