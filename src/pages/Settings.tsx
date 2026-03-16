import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Settings as SettingsIcon, AlertCircle } from 'lucide-react';

// Types
interface Department { id: string; name: string; code: string; }
interface AuditType { id: string; name: string; }
interface RiskLevel { id: string; name: string; color: string | null; level: number; }
interface PriorityLevel { id: string; name: string; level: number; }

type TabType = 'departments' | 'auditTypes' | 'riskLevels' | 'priorityLevels';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('departments');
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditTypes, setAuditTypes] = useState<AuditType[]>([]);
  const [riskLevels, setRiskLevels] = useState<RiskLevel[]>([]);
  const [priorityLevels, setPriorityLevels] = useState<PriorityLevel[]>([]);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  const fetchToken = () => localStorage.getItem('accessToken');

  const fetchData = async () => {
    try {
      const token = fetchToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [deptRes, auditRes, riskRes, priorityRes] = await Promise.all([
        fetch('/api/settings/departments', { headers }),
        fetch('/api/settings/audit-types', { headers }),
        fetch('/api/settings/risk-levels', { headers }),
        fetch('/api/settings/priority-levels', { headers })
      ]);

      if (!deptRes.ok) throw new Error('Failed to fetch settings data');

      setDepartments(await deptRes.json());
      setAuditTypes(await auditRes.json());
      setRiskLevels(await riskRes.json());
      setPriorityLevels(await priorityRes.json());
    } catch (err: any) {
      setError(err.message || 'Error loading settings');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (item: any) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({ ...item });
  };

  const handleDelete = async (id: string, endpoint: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    try {
      const token = fetchToken();
      const res = await fetch(`/api/settings/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent, endpoint: string) => {
    e.preventDefault();
    try {
      const token = fetchToken();
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/settings/${endpoint}/${currentId}` : `/api/settings/${endpoint}`;
      
      // Convert level to number if it exists
      const payload = { ...formData };
      if (payload.level) payload.level = parseInt(payload.level, 10);

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setFormData({});
      setIsEditing(false);
      setCurrentId(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderForm = (endpoint: string, fields: {name: string, label: string, type: string}[]) => (
    <form onSubmit={(e) => handleSubmit(e, endpoint)} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6">
      <h3 className="text-lg font-medium text-slate-900 mb-4">
        {isEditing ? 'Modifier' : 'Ajouter'} un élément
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map(f => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
            <input
              type={f.type}
              value={formData[f.name] || ''}
              onChange={(e) => setFormData({...formData, [f.name]: e.target.value})}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end space-x-3">
        {isEditing && (
          <button
            type="button"
            onClick={() => { setIsEditing(false); setFormData({}); setCurrentId(null); }}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          {isEditing ? 'Mettre à jour' : 'Ajouter'}
        </button>
      </div>
    </form>
  );

  const renderTable = (data: any[], endpoint: string, columns: {key: string, label: string}[]) => (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map(c => (
              <th key={c.key} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                {c.label}
              </th>
            ))}
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {data.map((item) => (
            <tr key={item.id}>
              {columns.map(c => (
                <td key={c.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {c.key === 'color' && item[c.key] ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: item[c.key] }}></div>
                      {item[c.key]}
                    </div>
                  ) : item[c.key]}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id, endpoint)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-6 py-4 text-center text-sm text-slate-500">
                Aucune donnée disponible.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center mb-8">
        <SettingsIcon className="w-8 h-8 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-slate-900">Paramétrage</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'departments', label: 'Départements' },
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
                setError(null);
              }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'departments' && (
          <>
            {renderForm('departments', [
              { name: 'name', label: 'Nom du département', type: 'text' },
              { name: 'code', label: 'Code', type: 'text' }
            ])}
            {renderTable(departments, 'departments', [
              { key: 'name', label: 'Nom' },
              { key: 'code', label: 'Code' }
            ])}
          </>
        )}

        {activeTab === 'auditTypes' && (
          <>
            {renderForm('audit-types', [
              { name: 'name', label: 'Type d\'audit', type: 'text' }
            ])}
            {renderTable(auditTypes, 'audit-types', [
              { key: 'name', label: 'Nom' }
            ])}
          </>
        )}

        {activeTab === 'riskLevels' && (
          <>
            {renderForm('risk-levels', [
              { name: 'name', label: 'Niveau de risque', type: 'text' },
              { name: 'level', label: 'Valeur (Tri)', type: 'number' },
              { name: 'color', label: 'Couleur (Hex)', type: 'text' }
            ])}
            {renderTable(riskLevels, 'risk-levels', [
              { key: 'name', label: 'Nom' },
              { key: 'level', label: 'Valeur' },
              { key: 'color', label: 'Couleur' }
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
