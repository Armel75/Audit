import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Settings as SettingsIcon,
  LogOut,
  ShieldAlert,
  Database,
  Calendar,
  Archive,
  BarChart3,
  Building2,
  Workflow,
  Sun,
  Moon,
  CheckCircle,
  Lock,
  AlertTriangle,
  Clock,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ChangePasswordModal from './ChangePasswordModal';
import NotificationDropdown from './notifications/NotificationDropdown';

type NavItem = {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  requiredPermissions?: string[];
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userPermissions = user?.permissions || [];
  const hasAnyPermission = (requiredPermissions?: string[]) => {
    if (!requiredPermissions?.length) {
      return true;
    }

    return requiredPermissions.some((permission) => userPermissions.includes(permission));
  };

  const navItems: NavItem[] = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/dashboard-dg', icon: LayoutDashboard, label: 'Tableau de bord stratégique', requiredPermissions: ['dashboard_dg:read'] },
    { path: '/plans', icon: Calendar, label: "Plans d'audit annuels", requiredPermissions: ['audit_plan:read'] },
    { path: '/missions', icon: Briefcase, label: 'Missions', requiredPermissions: ['audit_mission:read', 'audit_mission:read_all'] },
    { path: '/missions-dashboard', icon: BarChart3, label: 'Tableau de bord missions', requiredPermissions: ['audit_mission:read', 'audit_mission:read_all'] },
    { path: '/pilotage-audit', icon: BarChart3, label: 'Pilotage audit', requiredPermissions: ['audit_plan:read', 'referential:access', 'admin:access'] },
    { path: '/missions/archive', icon: Archive, label: 'Archives missions', requiredPermissions: ['audit_mission:read', 'audit_mission:read_all'] },
    { path: '/approvals', icon: CheckCircle, label: 'Approbations', requiredPermissions: ['approval:read'] },
    { path: '/hierarchy-comments', icon: CheckCircle, label: 'Commentaires hiérarchiques', requiredPermissions: ['comment:read'] },
    { path: '/referential', icon: Database, label: 'Referentiel', requiredPermissions: ['referential:access'] },
    { path: '/auditable-entities', icon: Building2, label: 'Entités auditables' },
    { path: '/processus-metier', icon: Workflow, label: 'Processus métier' },
    { path: '/risques', icon: AlertTriangle, label: 'Risques' },
    { path: '/controles', icon: CheckCircle, label: 'Contrôles' },
    { path: '/type-audit', icon: Tag, label: "Type d'audit" },
    { path: '/settings', icon: SettingsIcon, label: 'Parametres', requiredPermissions: ['settings:read'] },
    { path: '/admin', icon: ShieldAlert, label: 'Administration', requiredPermissions: ['admin:access'] },
  ];

  const visibleNavItems = navItems.filter((item) => hasAnyPermission(item.requiredPermissions));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col">
      {/* ── Barre supérieure : identité + actions ── */}
      <header className="sticky top-0 z-40 bg-slate-950 text-slate-300 border-b border-slate-800/60 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              SISAR
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {user && (
              <div className="hidden md:block text-right mr-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate max-w-[160px]">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[160px]">
                  {user.role || 'Utilisateur'}
                </p>
              </div>
            )}

            <NotificationDropdown />

            <button
              onClick={toggleTheme}
              title="Changer de thème"
              className="inline-flex items-center gap-1.5 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              <span className="hidden sm:inline text-sm font-medium">
                {resolvedTheme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </span>
            </button>

            <button
              onClick={() => setShowChangePassword(true)}
              title="Mot de passe"
              className="inline-flex items-center gap-1.5 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <Lock className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Mot de passe</span>
            </button>

            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="inline-flex items-center gap-1.5 p-2 text-red-400 hover:bg-red-800/40 hover:text-white rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* ── Navigation horizontale : tous les liens affichés, passage à la ligne si besoin ── */}
        <nav className="flex flex-wrap items-center gap-x-1.5 gap-y-1 px-3 pb-2.5 pt-1 border-t border-slate-800/60">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {(hasAnyPermission(['finding:read']) || hasAnyPermission(['recommendation:read'])) && (
            <span className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" aria-hidden="true" />
          )}

          {hasAnyPermission(['finding:read']) && (
            <NavLink
              to="/findings/critical"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Constats critiques
            </NavLink>
          )}

          {hasAnyPermission(['recommendation:read']) && (
            <NavLink
              to="/recommendations/overdue"
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              Recommandations en retard
            </NavLink>
          )}
        </nav>
      </header>

      {/* ── Contenu principal ── */}
{/* Contenu principal : pleine largeur (les pages de lecture conservent leur propre max-w) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="w-full">
          <Outlet />
        </div>
      </main>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}
