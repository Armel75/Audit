import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Loader2, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;

interface AuditableEntity {
  id: number;
  code: string;
  name: string;
  entityType: string;
  description?: string | null;
  criticality?: string | null;
  isActive: boolean;
  parent?: { name: string } | null;
  ownerDepartment?: { name: string } | null;
  managerUser?: { firstName: string; lastName: string } | null;
}

function criticalityTone(c?: string | null): string {
  const v = (c || '').toLowerCase();
  if (v.includes('critique') || v.includes('haute') || v.includes('élev')) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300';
  }
  if (v.includes('moyen')) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  }
  if (v.includes('bas') || v.includes('faible')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

export default function AuditableEntities() {
  const [entities, setEntities] = useState<AuditableEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    apiFetch(`${API_BASE}/referential/auditable-entities/consult`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors du chargement');
        return res.json();
      })
      .then((data: AuditableEntity[]) => setEntities(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(
    () => [...new Set(entities.map((e) => e.entityType).filter(Boolean))].sort(),
    [entities]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entities.filter((e) => {
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q);
      const matchType = !typeFilter || e.entityType === typeFilter;
      return matchSearch && matchType;
    });
  }, [entities, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* HEADER + RECHERCHE */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Building2 className="h-5 w-5" />
            </span>
            Entités auditables
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {entities.length} entité(s) — consultation seule
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, code, description)..."
              className="w-64 outline-none text-sm bg-transparent text-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none shadow-sm"
          >
            <option value="">Tous les types</option>
            {types.map((t) => (
              <option key={t} value={t} className="dark:bg-slate-800">
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ETATS */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Chargement...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-800">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">Impossible de charger les entités : {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
          Aucune entité auditable trouvée
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Nom</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Criticité</th>
                  <th className="px-6 py-4">Département</th>
                  <th className="px-6 py-4">Responsable</th>
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{e.code}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="whitespace-normal break-words">{e.name}</div>
                      {e.parent?.name && (
                        <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">↳ {e.parent.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {e.entityType || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {e.criticality ? (
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${criticalityTone(e.criticality)}`}>
                          {e.criticality}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{e.ownerDepartment?.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {e.managerUser ? `${e.managerUser.firstName} ${e.managerUser.lastName}` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {e.isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Inactif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
