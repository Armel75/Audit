import { useState, useEffect } from 'react';
import { Edit2, Trash2, Settings as SettingsIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

// Types
interface Department { id: number; name: string; code: string; }
interface UserDepartment { user: { id: number; firstName: string; lastName: string; email: string; }; department: { id: number; name: string; code: string; }; isPrimary: boolean; startDate: string | null; endDate: string | null; }
interface AuditType { id: number; name: string; isActive: boolean; }
interface RiskLevel { id: number; name: string; color: string | null; level: number; }
interface PriorityLevel { id: number; name: string; level: number; }

type TabType = 'departments' | 'userDepartments' | 'auditTypes' | 'riskLevels' | 'priorityLevels';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('departments');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [userDepartments, setUserDepartments] = useState<UserDepartment[]>([]);
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
  const [priorityLevels, setPriorityLevels] = useState<PriorityLevel[]>([]);
  const [users, setUsers] = useState<any[]>([]); // For UserDepartment form

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<any>(null); // can be number or object for composite keys
  const [formData, setFormData] = useState<any>({});
  const API_BASE = import.meta.env.VITE_API_URL;

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 5000);
  };

  const fetchData = async () => {
    try {
      const [deptRes, udRes, auditRes, riskRes, priorityRes, usersRes] = await Promise.all([
        apiFetch(`${API_BASE}/settings/departments`),
        apiFetch(`${API_BASE}/settings/user-departments`),
        apiFetch(`${API_BASE}/settings/audit-types`),
        apiFetch(`${API_BASE}/settings/risk-levels`),
        apiFetch(`${API_BASE}/settings/priority-levels`),
        apiFetch(`${API_BASE}/admin/users`) // To populate dropdowns
      ]);

      if (!deptRes.ok) throw new Error('Erreur lors du chargement des départements');
      if (!udRes.ok) throw new Error('Erreur lors du chargement des affectations');
      if (!auditRes.ok) throw new Error('Erreur lors du chargement des types d\'audit');
      if (!riskRes.ok) throw new Error('Erreur lors du chargement des niveaux de risque');
      if (!priorityRes.ok) throw new Error('Erreur lors du chargement des niveaux de priorité');

      setDepartments(await deptRes.json());
      setUserDepartments(await udRes.json());
      setAuditTypes(await auditRes.json());
      setRiskLevels(await riskRes.json());
      setPriorityLevels(await priorityRes.json());

      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch (err: any) {
      showMessage(err.message || 'Error loading settings', true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (item: any, isComposite = false) => {
    setIsEditing(true);
    if (isComposite) {
      setCurrentId({ userId: item.user.id, departmentId: item.department.id });
      setFormData({
        userId: item.user.id,
        departmentId: item.department.id,
        isPrimary: item.isPrimary,
        startDate: item.startDate ? item.startDate.split('T')[0] : '',
        endDate: item.endDate ? item.endDate.split('T')[0] : ''
      });
    } else {
      setCurrentId(item.id);
      setFormData({ ...item });
    }
  };

  const handleDelete = async (id: any, endpoint: string, isComposite = false) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    try {
      const url = isComposite
        ? `${API_BASE}/settings/${endpoint}/${id.userId}/${id.departmentId}`
        : `${API_BASE}/settings/${endpoint}/${id}`;

      const res = await apiFetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      showMessage('Élément supprimé avec succès');
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleToggleActive = async (item: any, endpoint: string) => {
    const action = item.isActive ? 'désactiver' : 'réactiver';

    if (!confirm(`Êtes-vous sûr de vouloir ${action} cet élément ?`)) return;

    try {
      const res = await apiFetch(`${API_BASE}/settings/${endpoint}/${item.id}`, {
        method: 'DELETE' // on garde DELETE → soft delete backend
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de l\'action');
      }

      showMessage(
        item.isActive
          ? 'Type d\'audit désactivé avec succès'
          : 'Type d\'audit réactivé avec succès'
      );

      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };


  const handleSubmit = async (e: React.FormEvent, endpoint: string, isComposite = false) => {
    e.preventDefault();
    try {
      const method = isEditing ? 'PUT' : 'POST';
      let url = `${API_BASE}/settings/${endpoint}`;

      if (isEditing) {
        url = isComposite
          ? `${API_BASE}/settings/${endpoint}/${currentId.userId}/${currentId.departmentId}`
          : `${API_BASE}/settings/${endpoint}/${currentId}`;
      }

      const payload = { ...formData };
      if (payload.level) payload.level = parseInt(payload.level, 10);

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      showMessage(isEditing ? 'Mise à jour réussie' : 'Création réussie');
      setFormData({});
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const renderForm = (endpoint: string, fields: { name: string, label: string, type: string, options?: any[] }[], isComposite = false) => (
    <form onSubmit={(e) => handleSubmit(e, endpoint, isComposite)} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {isEditing ? 'Modifier' : 'Ajouter'} un élément
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map(f => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={formData[f.name] || ''}
                onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                required={!isEditing || !isComposite} // disable changing IDs on edit for composite
                disabled={isEditing && isComposite && (f.name === 'userId' || f.name === 'departmentId')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Sélectionner</option>
                {f.options?.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            ) : f.type === 'checkbox' ? (
              <div className="flex items-center h-full pt-6">
                <input
                  type="checkbox"
                  checked={formData[f.name] || false}
                  onChange={(e) => setFormData({ ...formData, [f.name]: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-slate-700">{f.label}</span>
              </div>
            ) : (
              <input
                type={f.type}
                value={formData[f.name] || ''}
                onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                required={f.type !== 'date' && f.type !== 'color'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        {isEditing && (
          <button
            type="button"
            onClick={() => { setIsEditing(false); setFormData({}); setCurrentId(null); }}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          {isEditing ? 'Mettre à jour' : 'Ajouter'}
        </button>
      </div>
    </form>
  );

  const renderTable = (data: any[], endpoint: string, columns: { key: string, label: string, render?: (item: any) => React.ReactNode }[], isComposite = false) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              {columns.map(c => (
                <th key={c.key} className="px-6 py-3 uppercase tracking-wider">
                  {c.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, idx) => {
              const id = isComposite ? { userId: item.user.id, departmentId: item.department.id } : item.id;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  {columns.map(c => (
                    <td key={c.key} className="px-6 py-4 whitespace-nowrap text-slate-900">
                      {c.render ? c.render(item) : item[c.key]}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium space-x-3">
                    <button onClick={() => handleEdit(item, isComposite)} className="text-indigo-600 hover:text-indigo-900">
                      <Edit2 className="w-4 h-4 inline" />
                    </button>
                    {endpoint === 'audit-types' ? (
                      <button
                        onClick={() => handleToggleActive(item, endpoint)}
                        className={item.isActive
                          ? "text-red-600 hover:text-red-900"
                          : "text-emerald-600 hover:text-emerald-900"}
                        title={item.isActive ? "Désactiver" : "Réactiver"}
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDelete(id, endpoint, isComposite)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-slate-500">
                  Aucune donnée disponible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-indigo-600" />
            Paramétrage
          </h1>
          <p className="text-slate-500 mt-1">Gérez les référentiels de votre organisation.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'departments', label: 'Départements' },
          { id: 'userDepartments', label: 'Affectations (Users ↔ Depts)' },
          { id: 'auditTypes', label: 'Types d\'Audit' },
          { id: 'riskLevels', label: 'Niveaux de Risque' },
          { id: 'priorityLevels', label: 'Niveaux de Priorité' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType);
              setIsEditing(false);
              setFormData({});
              setCurrentId(null);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        {activeTab === 'departments' && (
          <>
            {renderForm('departments', [
              { name: 'name', label: 'Nom du département', type: 'text' },
              { name: 'code', label: 'Code', type: 'text' }
            ])}
            {renderTable(departments, 'departments', [
              { key: 'name', label: 'Nom' },
              { key: 'code', label: 'Code', render: (item) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{item.code}</span> }
            ])}
          </>
        )}

        {activeTab === 'userDepartments' && (
          <>
            {renderForm('user-departments', [
              { name: 'userId', label: 'Utilisateur', type: 'select', options: users.map(u => ({ id: u.id, label: `${u.firstName} ${u.lastName} (${u.email})` })) },
              { name: 'departmentId', label: 'Département', type: 'select', options: departments.map(d => ({ id: d.id, label: d.name })) },
              { name: 'isPrimary', label: 'Département principal', type: 'checkbox' },
              { name: 'startDate', label: 'Date de début', type: 'date' },
              { name: 'endDate', label: 'Date de fin', type: 'date' }
            ], true)}
            {renderTable(userDepartments, 'user-departments', [
              { key: 'user', label: 'Utilisateur', render: (item) => `${item.user.firstName} ${item.user.lastName}` },
              { key: 'department', label: 'Département', render: (item) => item.department.name },
              { key: 'isPrimary', label: 'Principal', render: (item) => item.isPrimary ? <span className="text-emerald-600 font-medium">Oui</span> : <span className="text-slate-400">Non</span> },
              { key: 'startDate', label: 'Début', render: (item) => item.startDate ? new Date(item.startDate).toLocaleDateString() : '-' },
              { key: 'endDate', label: 'Fin', render: (item) => item.endDate ? new Date(item.endDate).toLocaleDateString() : '-' }
            ], true)}
          </>
        )}

        {activeTab === 'auditTypes' && (
          <>
            {renderForm('audit-types', [
              { name: 'name', label: 'Type d\'audit', type: 'text' }
            ])}

            {renderTable(auditTypes, 'audit-types', [
              { key: 'name', label: 'Nom' },

              // ✅ NOUVELLE COLONNE STATUT
              {
                key: 'isActive',
                label: 'Statut',
                render: (item) => item.isActive
                  ? <span className="text-emerald-600 font-medium">Actif</span>
                  : <span className="text-red-500 font-medium">Inactif</span>
              }
            ])}
          </>
        )}

        {activeTab === 'riskLevels' && (
          <>
            {renderForm('risk-levels', [
              { name: 'name', label: 'Niveau de risque', type: 'text' },
              { name: 'level', label: 'Valeur (Tri)', type: 'number' },
              { name: 'color', label: 'Couleur (Hex)', type: 'color' }
            ])}
            {renderTable(riskLevels, 'risk-levels', [
              { key: 'name', label: 'Nom' },
              { key: 'level', label: 'Valeur' },
              {
                key: 'color', label: 'Couleur', render: (item) => (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: item.color || '#ccc' }}></div>
                    <span className="font-mono text-xs">{item.color || 'N/A'}</span>
                  </div>
                )
              }
            ])}
          </>
        )}

        {activeTab === 'priorityLevels' && (
          <>
            {renderForm('priority-levels', [
              { name: 'name', label: 'Niveau de priorité', type: 'text' },
              { name: 'level', label: 'Valeur (Tri)', type: 'number' }
            ])}
            {renderTable(priorityLevels, 'priority-levels', [
              { key: 'name', label: 'Nom' },
              { key: 'level', label: 'Valeur' }
            ])}
          </>
        )}
      </div>
    </div>
  );
}

