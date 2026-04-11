import { useState, useEffect } from 'react';
import { Shield, Users, Building2, Key, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type TabType = 'tenants' | 'users' | 'roles' | 'security';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<TabType>('tenants');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Data
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [refreshTokens, setRefreshTokens] = useState<any[]>([]);
  const [resetTokens, setResetTokens] = useState<any[]>([]);

  // UI States
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [roleForm, setRoleForm] = useState<any>({ name: '' });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState<any>({});
  const [isEditingTenant, setIsEditingTenant] = useState(false);
  const [tenantForm, setTenantForm] = useState<any>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];
  const API_BASE = import.meta.env.VITE_API_URL;

  const tabPermissions: Record<TabType, string> = {
    tenants: 'tenant:read',
    users: 'user:read',
    roles: 'role:read',
    security: 'token:read',
  };
  const hasPerm = (tab: TabType) => userPermissions.includes(tabPermissions[tab]);

  const syncSelectedRole = (rolesData: any[], preferredRoleId?: number) => {
    const targetRoleId = preferredRoleId ?? selectedRole?.id;

    if (!targetRoleId) return;

    const updatedRole = rolesData.find((role) => role.id === targetRoleId);

    if (!updatedRole) {
      setSelectedRole(null);
      setRolePermissions([]);
      return;
    }

    setSelectedRole(updatedRole);
    setRolePermissions(updatedRole.permissions.map((rp: any) => rp.permissionId));
  };

  const readErrorMessage = async (res: Response, fallback: string) => {
    try {
      const data = await res.json();
      return data.error || data.message || fallback;
    } catch {
      try {
        const text = await res.text();
        return text || fallback;
      } catch {
        return fallback;
      }
    }
  };

  const fetchData = async (preferredRoleId?: number) => {
    try {
      const [tenantsRes, usersRes, rolesRes, permsRes, rTokensRes, pTokensRes] = await Promise.all([
        apiFetch(`${API_BASE}/admin/tenants`),
        apiFetch(`${API_BASE}/admin/users`),
        apiFetch(`${API_BASE}/admin/roles`),
        apiFetch(`${API_BASE}/admin/permissions`),
        apiFetch(`${API_BASE}/admin/tokens/refresh`),
        apiFetch(`${API_BASE}/admin/tokens/reset`)
      ]);

      const tenantsData = await tenantsRes.json();
      if (Array.isArray(tenantsData)) setTenants(tenantsData);
      const usersData = await usersRes.json();
      if (Array.isArray(usersData)) setUsers(usersData);
      const rolesData = await rolesRes.json();
      if (Array.isArray(rolesData)) {
        setRoles(rolesData);
        syncSelectedRole(rolesData, preferredRoleId);
      }
      const permsData = await permsRes.json();
      if (Array.isArray(permsData)) setPermissions(permsData);
      const rTokensData = await rTokensRes.json();
      if (Array.isArray(rTokensData)) setRefreshTokens(rTokensData);
      const pTokensData = await pTokensRes.json();
      if (Array.isArray(pTokensData)) setResetTokens(pTokensData);
    } catch (err: any) {
      setError("Erreur lors du chargement des données d'administration.");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showMessage = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 5000);
  };

  // --- TENANTS ---
  const handleTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = isEditingTenant ? 'PUT' : 'POST';
      const url = isEditingTenant ? `${API_BASE}/admin/tenants/${tenantForm.id}` : `${API_BASE}/admin/tenants`;
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantForm)
      });

      if (!res.ok) throw new Error(await res.text());
      
      showMessage(isEditingTenant ? 'Tenant mis à jour' : 'Tenant créé');
      setIsEditingTenant(false);
      setTenantForm({});
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const toggleTenantStatus = async (tenant: any) => {
    try {
      await apiFetch(`${API_BASE}/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tenant.isActive })
      });
      showMessage('Statut du tenant mis à jour');
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  // --- USERS ---
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = isEditingUser ? 'PUT' : 'POST';
      const url = isEditingUser ? `${API_BASE}/admin/users/${userForm.id}` : `${API_BASE}/admin/users`;
      
      const payload = { ...userForm };
      payload.tenantId = parseInt(payload.tenantId, 10);
      payload.roleId = parseInt(payload.roleId, 10);

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());
      
      showMessage(isEditingUser ? 'Utilisateur mis à jour' : 'Utilisateur créé');
      setIsEditingUser(false);
      setUserForm({});
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const approveUser = async (id: number) => {
    if (!confirm('Valider cet utilisateur ? Il pourra ensuite se connecter.')) return;

    try {
      const res = await apiFetch(`${API_BASE}/admin/users/${id}/approve`, {
        method: 'PATCH'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la validation');
      }

      showMessage(data.message || 'Utilisateur validé avec succès');
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const deactivateUser = async (id: number) => {
    if(!confirm('Désactiver cet utilisateur ?')) return;
    try {
      await apiFetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' });
      showMessage('Utilisateur désactivé');
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  // --- ROLES & PERMISSIONS ---
  const handleRoleSelect = (role: any) => {
    setSelectedRole(role);
    setRolePermissions(role.permissions.map((rp: any) => rp.permissionId));
  };

  const resetRoleForm = () => {
    setIsEditingRole(false);
    setRoleForm({ name: '' });
  };

  const startRoleCreate = () => {
    resetRoleForm();
  };

  const startRoleEdit = (role: any) => {
    setIsEditingRole(true);
    setRoleForm({
      id: role.id,
      name: role.name
    });
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = isEditingRole ? 'PUT' : 'POST';
      const url = isEditingRole
        ? `${API_BASE}/admin/roles/${roleForm.id}`
        : `${API_BASE}/admin/roles`;

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roleForm.name?.trim() })
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Erreur lors de l\'enregistrement du rôle'));
      }

      const savedRole = await res.json();

      showMessage(isEditingRole ? 'Rôle mis à jour' : 'Rôle créé');
      resetRoleForm();
      await fetchData(savedRole.id);
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleRoleDelete = async (role: any) => {
    if (!confirm(`Supprimer le rôle "${role.name}" ?`)) return;

    try {
      const res = await apiFetch(`${API_BASE}/admin/roles/${role.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, 'Erreur lors de la suppression du rôle'));
      }

      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
        setRolePermissions([]);
      }

      if (roleForm.id === role.id) {
        resetRoleForm();
      }

      showMessage('Rôle supprimé');
      await fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const togglePermission = (permId: number) => {
    setRolePermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      const res = await apiFetch(`${API_BASE}/admin/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: rolePermissions })
      });
      if (!res.ok) throw new Error('Erreur de synchronisation');
      showMessage('Permissions mises à jour avec succès');
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  // --- TOKENS ---
  const revokeRefreshToken = async (id: number) => {
    if(!confirm('Révoquer ce token déconnectera immédiatement l\'utilisateur. Continuer ?')) return;
    try {
      await apiFetch(`${API_BASE}/admin/tokens/refresh/${id}/revoke`, { method: 'POST' });
      showMessage('Refresh Token révoqué');
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const invalidateResetToken = async (id: number) => {
    if(!confirm('Invalider ce token de réinitialisation ?')) return;
    try {
      await apiFetch(`${API_BASE}/admin/tokens/reset/${id}/revoke`, { method: 'POST' });
      showMessage('Password Reset Token invalidé');
      fetchData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const normalizedRoleSearch = roleSearch.trim().toLowerCase();
  const roleUserCounts = users.reduce((acc: Record<number, number>, user: any) => {
    if (typeof user.roleId === 'number') {
      acc[user.roleId] = (acc[user.roleId] || 0) + 1;
    }

    return acc;
  }, {});
  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(normalizedRoleSearch)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Administration Globale
          </h1>
          <p className="text-slate-500 mt-1">Gérez les locataires, les accès et la sécurité de la plateforme.</p>
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
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'tenants', icon: Building2, label: 'Tenants', permission: 'tenant:read' },
          { id: 'users', icon: Users, label: 'Utilisateurs', permission: 'user:read' },
          { id: 'roles', icon: Shield, label: 'Rôles & Permissions', permission: 'role:read' },
          { id: 'security', icon: Key, label: 'Sécurité (Tokens)', permission: 'token:read' },
        ].filter((tab) => userPermissions.includes(tab.permission)).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* TENANTS TAB */}
        {activeTab === 'tenants' && hasPerm('tenants') && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Gestion des Locataires (Tenants)</h2>
              <button 
                onClick={() => { setIsEditingTenant(false); setTenantForm({ isActive: true }); }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                + Nouveau Tenant
              </button>
            </div>

            <form onSubmit={handleTenantSubmit} className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Nom du Tenant" required value={tenantForm.name || ''} onChange={e => setTenantForm({...tenantForm, name: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input type="text" placeholder="Code (ex: SOREPCO)" required value={tenantForm.code || ''} onChange={e => setTenantForm({...tenantForm, code: e.target.value})} className="px-3 py-2 border rounded-lg font-mono" />
              <label className="flex items-center gap-2 px-3 py-2">
                <input type="checkbox" checked={tenantForm.isActive ?? true} onChange={e => setTenantForm({...tenantForm, isActive: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm font-medium text-slate-700">Tenant Actif</span>
              </label>
              
              <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                  {isEditingTenant ? 'Mettre à jour' : 'Créer le tenant'}
                </button>
              </div>
            </form>

            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{t.code}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {t.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button onClick={() => { setIsEditingTenant(true); 
                        //setTenantForm(t);
                        setTenantForm({
                          id: t.id,
                          name: t.name,
                          code: t.code,
                          isActive: t.isActive
                        });
                        }} className="text-indigo-600 hover:underline">Éditer</button>
                      <button onClick={() => toggleTenantStatus(t)} className="text-slate-600 hover:underline">Basculer Statut</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && hasPerm('users') && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Gestion des Utilisateurs</h2>
              <button 
                onClick={() => { setIsEditingUser(false); setUserForm({ status: 'ACTIVE' }); }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                + Nouvel Utilisateur
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Prénom" required value={userForm.firstName || ''} onChange={e => setUserForm({...userForm, firstName: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input type="text" placeholder="Nom" required value={userForm.lastName || ''} onChange={e => setUserForm({...userForm, lastName: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input type="email" placeholder="Email" required value={userForm.email || ''} onChange={e => setUserForm({...userForm, email: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input type="text" placeholder="Matricule" required value={userForm.matricule || ''} onChange={e => setUserForm({...userForm, matricule: e.target.value})} className="px-3 py-2 border rounded-lg" />
              
              <select required value={userForm.tenantId || ''} onChange={e => setUserForm({...userForm, tenantId: e.target.value})} className="px-3 py-2 border rounded-lg bg-white">
                <option value="">Sélectionner un Tenant</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select required value={userForm.roleId || ''} onChange={e => setUserForm({...userForm, roleId: e.target.value})} className="px-3 py-2 border rounded-lg bg-white">
                <option value="">Sélectionner un Rôle</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>

              <select required value={userForm.status || ''} onChange={e => setUserForm({...userForm, status: e.target.value})} className="px-3 py-2 border rounded-lg bg-white">
                <option value="PENDING">En attente</option>
                <option value="ACTIVE">Actif</option>
                <option value="LOCKED">Verrouillé</option>
                <option value="INACTIVE">Inactif</option>
              </select>

              <input type="password" placeholder={isEditingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe"} required={!isEditingUser} onChange={e => setUserForm({...userForm, password: e.target.value})} className="px-3 py-2 border rounded-lg" />
              
              <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                  {isEditingUser ? 'Mettre à jour' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      {/* <td className="px-4 py-3 font-medium text-slate-900">{u.firstName} {u.lastName}</td> */}
                      <td
                        onClick={() => navigate(`/users/${u.id}`)}
                        className="px-4 py-3 font-medium text-indigo-600 cursor-pointer hover:underline"
                      >
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3 text-slate-600">{u.tenant?.name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.role?.name}</td>
                      <td className="px-4 py-3">
                        {/* <span className={`px-2 py-1 rounded-md text-xs font-medium ${u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {u.status}
                        </span> */}
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : u.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : u.status === 'LOCKED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Actif' : u.status === 'PENDING' ? 'En attente' : u.status === 'LOCKED' ? 'Verrouillé' : u.status === 'INACTIVE' ? 'Inactif' : u.status}
                        </span>
                      </td>
                      {/* <td className="px-4 py-3 text-right space-x-3">
                        <button onClick={() => { setIsEditingUser(true); setUserForm(u); }} className="text-indigo-600 hover:underline">Éditer</button>
                        <button onClick={() => deactivateUser(u.id)} className="text-red-600 hover:underline">Désactiver</button>
                      </td> */}
                      <td className="px-4 py-3 text-right space-x-3">
                        {u.status === 'PENDING' && (
                          <button
                            onClick={() => approveUser(u.id)}
                            className="text-emerald-600 hover:underline"
                          >
                            Valider
                          </button>
                        )}

                        <button
                          onClick={() => { setIsEditingUser(true); setUserForm(u); }}
                          className="text-indigo-600 hover:underline"
                        >
                          Modifier
                        </button>

                        <button
                          onClick={() => deactivateUser(u.id)}
                          className="text-red-600 hover:underline"
                        >
                          Désactiver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ROLES & PERMISSIONS TAB */}
        {activeTab === 'roles' && hasPerm('roles') && (
          <div className="min-h-[500px]">
            <div className="border-b border-slate-200 p-6 bg-slate-50/60">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Gestion des roles</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Creez, renommez et supprimez les roles sans modifier le panneau actuel des permissions.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {filteredRoles.length} role{filteredRoles.length > 1 ? 's' : ''} affiche{filteredRoles.length > 1 ? 's' : ''} sur {roles.length}
                  </p>
                </div>
                <button
                  onClick={startRoleCreate}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                >
                  + Nouveau role
                </button>
              </div>

              <form onSubmit={handleRoleSubmit} className="mt-6 bg-white p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Nom du role
                    </label>
                    <input
                      type="text"
                      required
                      value={roleForm.name || ''}
                      onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                      placeholder="Ex: Auditeur Senior"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex gap-3">
                    {isEditingRole && (
                      <button
                        type="button"
                        onClick={resetRoleForm}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                    >
                      {isEditingRole ? 'Mettre a jour' : 'Creer le role'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-4">
                <input
                  type="search"
                  value={roleSearch}
                  onChange={e => setRoleSearch(e.target.value)}
                  placeholder="Rechercher un role..."
                  className="w-full md:max-w-md px-3 py-2 border rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
              <div className="border-r border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Rôles existants</h3>
              <div className="space-y-2">
                {filteredRoles.length === 0 && (
                  <div className="bg-white border border-dashed border-slate-300 rounded-xl px-4 py-6 text-sm text-slate-500">
                    Aucun role ne correspond a cette recherche.
                  </div>
                )}
                {filteredRoles.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => handleRoleSelect(r)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-colors ${selectedRole?.id === r.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{r.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${selectedRole?.id === r.id ? 'bg-indigo-500/70 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {roleUserCounts[r.id] || 0} user{(roleUserCounts[r.id] || 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
              <div className="md:col-span-2 p-6">
                {selectedRole ? (
                  <>
                    <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900">Permissions pour : <span className="text-indigo-600">{selectedRole.name}</span></h3>
                        <button
                          type="button"
                          onClick={() => startRoleEdit(selectedRole)}
                          className="text-indigo-600 hover:underline text-sm"
                        >
                          Editer le role
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRoleDelete(selectedRole)}
                          disabled={selectedRole.name === 'SUPER_ADMIN'}
                          className={`text-sm hover:underline ${selectedRole.name === 'SUPER_ADMIN' ? 'text-slate-400 cursor-not-allowed' : 'text-red-600'}`}
                        >
                          Supprimer le role
                        </button>
                      </div>
                      <button onClick={saveRolePermissions} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                        Enregistrer les permissions
                      </button>
                    </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {permissions.map(p => (
                      <label key={p.id} className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={rolePermissions.includes(p.id)}
                          onChange={() => togglePermission(p.id)}
                          className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{p.code}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{p.description || 'Aucune description'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Shield className="w-12 h-12 mb-4 opacity-20" />
                  <p>Sélectionnez un rôle pour gérer ses permissions</p>
                </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TOKENS TAB */}
        {activeTab === 'security' && hasPerm('security') && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Sessions Actives (Refresh Tokens)</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">IP / Appareil</th>
                    <th className="px-4 py-3">Création</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refreshTokens.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.user?.firstName} {t.user?.lastName}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{t.ipAddress}<br/><span className="text-slate-400">{t.userAgent?.substring(0,30)}...</span></td>
                      <td className="px-4 py-3 text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {t.revokedAt ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">Révoqué</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">Actif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!t.revokedAt && (
                          <button onClick={() => revokeRefreshToken(t.id)} className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 px-3 py-1.5 rounded-lg">
                            Révoquer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 mb-6">Demandes de Réinitialisation (Reset Tokens)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Création</th>
                    <th className="px-4 py-3">Expiration</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resetTokens.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.user?.firstName} {t.user?.lastName}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(t.expiresAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {t.used ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">Utilisé</span>
                        ) : new Date(t.expiresAt) < new Date() ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium">Expiré</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">Valide</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!t.used && new Date(t.expiresAt) > new Date() && (
                          <button onClick={() => invalidateResetToken(t.id)} className="text-red-600 hover:text-red-800 font-medium text-xs bg-red-50 px-3 py-1.5 rounded-lg">
                            Invalider
                          </button>
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
    </div>
  );
}
