import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';
import ListExportButtons from '../components/ListExportButtons';

const API_BASE = import.meta.env.VITE_API_URL;

interface ControlItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  controlType?: string | null;
  frequency?: string | null;
  isKey?: boolean;
  isAutomated?: boolean;
  isActive: boolean;
  businessProcess?: { name: string } | null;
  ownerDepartment?: { name: string } | null;
}

export default function Controles() {
  const [controls, setControls] = useState<ControlItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch(`${API_BASE}/referential/controls/consult`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors du chargement');
        return res.json();
      })
      .then((data: ControlItem[]) => setControls(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return controls.filter((c) => {
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.controlType || '').toLowerCase().includes(q) ||
        (c.businessProcess?.name || '').toLowerCase().includes(q)
      );
    });
  }, [controls, search]);

  const flagBadge = (label: string, color: string) => (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* HEADER + RECHERCHE */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </span>
            Contrôles
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {controls.length} contrôle(s) — consultation seule
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ListExportButtons path="/export/controls" fileName="controles" />
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 transition">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (code, nom, type)..."
              className="w-64 outline-none text-sm bg-transparent text-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>
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
          <CheckCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">Impossible de charger les contrôles : {error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
          Aucun contrôle trouvé
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
                  <th className="px-6 py-4">Fréquence</th>
                  <th className="px-6 py-4">Processus</th>
                  <th className="px-6 py-4">Département</th>
                  <th className="px-6 py-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{c.code}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2 whitespace-normal break-words">
                        <span>{c.name}</span>
                        {c.isKey && flagBadge('Clé', 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300')}
                        {c.isAutomated && flagBadge('Auto', 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300')}
                      </div>
                      {c.description ? (
                        <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 line-clamp-1">{c.description}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {c.controlType ? (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {c.controlType}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{c.frequency || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{c.businessProcess?.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{c.ownerDepartment?.name || '-'}</td>
                    <td className="px-6 py-4">
                      {c.isActive ? (
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
