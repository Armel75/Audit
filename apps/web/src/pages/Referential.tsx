import { useState, useEffect } from 'react';
import {
  Building2,
  GitMerge,
  ShieldCheck,
  AlertTriangle,
  Link as LinkIcon,
  Plus,
  Pencil,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type TabType = 'entities' | 'processes' | 'controls' | 'risks' | 'risk-controls';

export default function Referential() {
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const tabPermissions: Record<TabType, string> = {
    entities: 'auditable_entity:read',
    processes: 'business_process:read',
    risks: 'risk:read',
    controls: 'control:read',
    'risk-controls': 'risk_control:read',
  };
  const hasPerm = (tab: TabType) => userPermissions.includes(tabPermissions[tab]);
  const [activeTab, setActiveTab] = useState<TabType>('entities');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Reference data for dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [controls, setControls] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchData();
    fetchReferenceData();
  }, [activeTab]);

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [depsRes, usersRes, entRes, procRes, ctrlRes, riskRes] = await Promise.all([
        apiFetch(`${API_BASE}/settings/departments`),
        apiFetch(`${API_BASE}/users`),
        apiFetch(`${API_BASE}/referential/auditable-entities`),
        apiFetch(`${API_BASE}/referential/business-processes`),
        apiFetch(`${API_BASE}/referential/controls`),
        apiFetch(`${API_BASE}/referential/risks`)
      ]);

      const [
        departmentsData,
        usersData,
        entitiesData,
        processesData,
        controlsData,
        risksData
      ] = await Promise.all([
        depsRes.json(),
        usersRes.json(),
        entRes.json(),
        procRes.json(),
        ctrlRes.json(),
        riskRes.json()
      ]);

      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setEntities(Array.isArray(entitiesData) ? entitiesData : []);
      setProcesses(Array.isArray(processesData) ? processesData : []);
      setControls(Array.isArray(controlsData) ? controlsData : []);
      setRisks(Array.isArray(risksData) ? risksData : []);
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  };


  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'entities':
          endpoint = `${API_BASE}/referential/auditable-entities`;
          break;
        case 'processes':
          endpoint = `${API_BASE}/referential/business-processes`;
          break;
        case 'controls':
          endpoint = `${API_BASE}/referential/controls`;
          break;
        case 'risks':
          endpoint = `${API_BASE}/referential/risks`;
          break;
        case 'risk-controls':
          endpoint = `${API_BASE}/referential/risk-controls`;
          break;
      }

      const res = await apiFetch(endpoint);
      const json = await res.json();

      setData(Array.isArray(json) ? json : []);
    } catch (err: any) {
      showMessage(err.message || 'Erreur lors du chargement des données', true);
    } finally {
      setLoading(false);
    }
  };


  const handleEdit = (record: any) => {
    setCurrentRecord(record);
    setFormData({ ...record });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentRecord(null);
    setFormData({ isActive: true });
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'entities': endpoint = `${API_BASE}/referential/auditable-entities/${id}`; break;
        case 'processes': endpoint = `${API_BASE}/referential/business-processes/${id}`; break;
        case 'controls': endpoint = `${API_BASE}/referential/controls/${id}`; break;
        case 'risks': endpoint = `${API_BASE}/referential/risks/${id}`; break;
        case 'risk-controls': endpoint = `${API_BASE}/referential/risk-controls/${id}`; break;
      }
      await apiFetch(endpoint, { method: 'DELETE' });
      showMessage('Élément supprimé avec succès');
      fetchData();
      fetchReferenceData();
    } catch (err: any) {
      showMessage(err.message || 'Erreur lors de la suppression', true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'entities': endpoint = `${API_BASE}/referential/auditable-entities`; break;
        case 'processes': endpoint = `${API_BASE}/referential/business-processes`; break;
        case 'controls': endpoint = `${API_BASE}/referential/controls`; break;
        case 'risks': endpoint = `${API_BASE}/referential/risks`; break;
        case 'risk-controls': endpoint = `${API_BASE}/referential/risk-controls`; break;
      }

      const method = currentRecord ? 'PUT' : 'POST';
      const url = currentRecord ? `${endpoint}/${currentRecord.id}` : endpoint;

      // Clean up payload based on tab
      //const payload = { ...formData };
      const payload = {
        ...formData,

        inherentImpact:
          formData.inherentImpact === '' ? null : Number(formData.inherentImpact),

        inherentLikelihood:
          formData.inherentLikelihood === '' ? null : Number(formData.inherentLikelihood),

        businessProcessId:
          formData.businessProcessId === '' ? null : Number(formData.businessProcessId),

        auditableEntityId:
          formData.auditableEntityId === '' ? null : Number(formData.auditableEntityId),

        ownerDepartmentId:
          formData.ownerDepartmentId === '' ? null : Number(formData.ownerDepartmentId),
      };

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('PAYLOAD SENT:', payload);
      showMessage(currentRecord ? 'Élément mis à jour' : 'Élément créé');
      setIsEditing(false);
      fetchData();
      fetchReferenceData();
    } catch (err: any) {
      showMessage(err.message || 'Erreur lors de l\'enregistrement', true);
    }
  };

  const renderForm = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-900">
            {currentRecord ? 'Modifier' : 'Créer'} un élément
          </h3>
          <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Common Fields for most tabs */}
          {activeTab !== 'risk-controls' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code || ''}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Auditable Entity Specific */}
          {activeTab === 'entities' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type d'entité *</label>
                  <select
                    required
                    value={formData.entityType || ''}
                    onChange={e => setFormData({ ...formData, entityType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="FILIALE">Filiale</option>
                    <option value="DIRECTION">Direction</option>
                    <option value="AGENCE">Agence</option>
                    <option value="PROJET">Projet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Criticité</label>
                  <select
                    value={formData.criticality || ''}
                    onChange={e => setFormData({ ...formData, criticality: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="HAUTE">Haute</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="BASSE">Basse</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Entité Parente</label>
                  <select
                    value={formData.parentId || ''}
                    onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucune</option>
                    {entities.filter(e => e.id !== formData.id).map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Département Propriétaire</label>
                  <select
                    value={formData.ownerDepartmentId || ''}
                    onChange={e => setFormData({ ...formData, ownerDepartmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Manager</label>
                  <select
                    value={formData.managerUserId || ''}
                    onChange={e => setFormData({ ...formData, managerUserId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Business Process Specific */}
          {activeTab === 'processes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entité Auditable</label>
                <select
                  value={formData.auditableEntityId || ''}
                  onChange={e => setFormData({ ...formData, auditableEntityId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Aucune</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Département Propriétaire</label>
                <select
                  value={formData.ownerDepartmentId || ''}
                  onChange={e => setFormData({ ...formData, ownerDepartmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Aucun</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Control Specific */}
          {activeTab === 'controls' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type de contrôle</label>
                  <select
                    value={formData.controlType || ''}
                    onChange={e => setFormData({ ...formData, controlType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="PREVENTIF">Préventif</option>
                    <option value="DETECTIF">Détectif</option>
                    <option value="DIRECTIF">Directif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fréquence</label>
                  <select
                    value={formData.frequency || ''}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="QUOTIDIEN">Quotidien</option>
                    <option value="HEBDOMADAIRE">Hebdomadaire</option>
                    <option value="MENSUEL">Mensuel</option>
                    <option value="ANNUEL">Annuel</option>
                    <option value="CONTINU">Continu</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Processus Métier</label>
                  <select
                    value={formData.businessProcessId || ''}
                    onChange={e => setFormData({ ...formData, businessProcessId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun</option>
                    {processes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Département Propriétaire</label>
                  <select
                    value={formData.ownerDepartmentId || ''}
                    onChange={e => setFormData({ ...formData, ownerDepartmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isKey || false}
                    onChange={e => setFormData({ ...formData, isKey: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Contrôle Clé</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAutomated || false}
                    onChange={e => setFormData({ ...formData, isAutomated: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Automatisé</span>
                </label>
              </div>
            </>
          )}

          {/* Risk Specific */}
          {activeTab === 'risks' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={formData.category || ''}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="OPERATIONNEL">Opérationnel</option>
                    <option value="FINANCIER">Financier</option>
                    <option value="CONFORMITE">Conformité</option>
                    <option value="STRATEGIQUE">Stratégique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Impact Inhérent (1-5)</label>
                  <input
                    type="number"
                    min="1" max="5"
                    value={formData.inherentImpact || ''}
                    onChange={e => setFormData({ ...formData, inherentImpact: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Probabilité Inhérente (1-5)</label>
                  <input
                    type="number"
                    min="1" max="5"
                    value={formData.inherentLikelihood || ''}
                    onChange={e => setFormData({ ...formData, inherentLikelihood: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Processus Métier</label>
                  <select
                    value={formData.businessProcessId || ''}
                    onChange={e => setFormData({ ...formData, businessProcessId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun</option>
                    {processes.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Entité Auditable</label>
                  <select
                    value={formData.auditableEntityId || ''}
                    onChange={e => setFormData({ ...formData, auditableEntityId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucune</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Département Propriétaire</label>
                  <select
                    value={formData.ownerDepartmentId || ''}
                    onChange={e => setFormData({ ...formData, ownerDepartmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* RiskControl Specific */}
          {activeTab === 'risk-controls' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Risque *</label>
                <select
                  required
                  value={formData.riskId || ''}
                  onChange={e => setFormData({ ...formData, riskId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Sélectionner...</option>
                  {risks.map(r => (
                    <option key={r.id} value={r.id}>[{r.code}] {r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contrôle *</label>
                <select
                  required
                  value={formData.controlId || ''}
                  onChange={e => setFormData({ ...formData, controlId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Sélectionner...</option>
                  {controls.map(c => (
                    <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Efficacité de conception</label>
                <select
                  value={formData.designEffectiveness || ''}
                  onChange={e => setFormData({ ...formData, designEffectiveness: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Sélectionner...</option>
                  <option value="EFFICACE">Efficace</option>
                  <option value="PARTIELLEMENT_EFFICACE">Partiellement Efficace</option>
                  <option value="INEFFICACE">Inefficace</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Efficacité opérationnelle</label>
                <select
                  value={formData.operatingEffectiveness || ''}
                  onChange={e => setFormData({ ...formData, operatingEffectiveness: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Sélectionner...</option>
                  <option value="EFFICACE">Efficace</option>
                  <option value="PARTIELLEMENT_EFFICACE">Partiellement Efficace</option>
                  <option value="INEFFICACE">Inefficace</option>
                </select>
              </div>
            </div>
          )}

          {/* Description for most tabs */}
          {activeTab !== 'risk-controls' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* IsActive for most tabs */}
          {activeTab !== 'risk-controls' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive !== false}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700">Actif</label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {currentRecord ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const renderTable = () => {
    if (loading) return <div className="text-center py-8 text-slate-500">Chargement...</div>;
    if (data.length === 0) return <div className="text-center py-8 text-slate-500">Aucune donnée trouvée.</div>;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-medium border-b border-slate-200">
              <tr>
                {activeTab !== 'risk-controls' && <th className="px-6 py-4">Code</th>}
                {activeTab !== 'risk-controls' && <th className="px-6 py-4">Nom</th>}

                {activeTab === 'entities' && <th className="px-6 py-4">Type</th>}
                {activeTab === 'processes' && <th className="px-6 py-4">Entité</th>}
                {activeTab === 'controls' && <th className="px-6 py-4">Type</th>}
                {activeTab === 'risks' && <th className="px-6 py-4">Catégorie</th>}

                {activeTab === 'risk-controls' && <th className="px-6 py-4">Risque</th>}
                {activeTab === 'risk-controls' && <th className="px-6 py-4">Contrôle</th>}
                {activeTab === 'risk-controls' && <th className="px-6 py-4">Efficacité</th>}

                {activeTab !== 'risk-controls' && <th className="px-6 py-4">Statut</th>}
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  {activeTab !== 'risk-controls' && <td className="px-6 py-4 font-medium text-slate-900">{item.code}</td>}
                  {activeTab !== 'risk-controls' && <td className="px-6 py-4">{item.name}</td>}

                  {activeTab === 'entities' && <td className="px-6 py-4">{item.entityType}</td>}
                  {activeTab === 'processes' && <td className="px-6 py-4">{item.auditableEntity?.name || '-'}</td>}
                  {activeTab === 'controls' && <td className="px-6 py-4">{item.controlType || '-'}</td>}
                  {activeTab === 'risks' && <td className="px-6 py-4">{item.category || '-'}</td>}

                  {activeTab === 'risk-controls' && <td className="px-6 py-4 font-medium">[{item.risk?.code}] {item.risk?.name}</td>}
                  {activeTab === 'risk-controls' && <td className="px-6 py-4 font-medium">[{item.control?.code}] {item.control?.name}</td>}
                  {activeTab === 'risk-controls' && (
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <div>Conception: {item.designEffectiveness || '-'}</div>
                        <div>Opérationnelle: {item.operatingEffectiveness || '-'}</div>
                      </div>
                    </td>
                  )}

                  {activeTab !== 'risk-controls' && (
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                        {item.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Référentiel Métier</h1>
          <p className="text-slate-500 mt-1">Gérez l'univers d'audit, les processus, risques et contrôles.</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200">
        {hasPerm('entities') && (
        <button
          onClick={() => { setActiveTab('entities'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'entities' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          <Building2 className="w-4 h-4" />
          Entités Auditables
        </button>
        )}
        {hasPerm('processes') && (
        <button
          onClick={() => { setActiveTab('processes'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'processes' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          <GitMerge className="w-4 h-4" />
          Processus Métiers
        </button>
        )}
        {hasPerm('risks') && (
        <button
          onClick={() => { setActiveTab('risks'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'risks' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Risques
        </button>
        )}
        {hasPerm('controls') && (
        <button
          onClick={() => { setActiveTab('controls'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'controls' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Contrôles
        </button>
        )}
        {hasPerm('risk-controls') && (
        <button
          onClick={() => { setActiveTab('risk-controls'); setIsEditing(false); }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'risk-controls' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          <LinkIcon className="w-4 h-4" />
          Matrice Risques-Contrôles
        </button>
        )}
      </div>

      {hasPerm(activeTab) && (isEditing ? renderForm() : renderTable())}
    </div>
  );
}
