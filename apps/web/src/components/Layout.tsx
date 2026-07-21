import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  User,
  Database,
  Calendar,
  Archive,
  Sun,
  Moon,
  CheckCircle,
  Lock,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ChangePasswordModal from './ChangePasswordModal';

type NavItem = {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  requiredPermissions?: string[];
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    { path: '/missions/archive', icon: Archive, label: 'Archives missions', requiredPermissions: ['audit_mission:read', 'audit_mission:read_all'] },
    { path: '/approvals', icon: CheckCircle, label: 'Approbations', requiredPermissions: ['approval:read'] },
    { path: '/hierarchy-comments', icon: CheckCircle, label: 'Commentaires hiérarchiques', requiredPermissions: ['comment:read'] },
    { path: '/referential', icon: Database, label: 'Referentiel', requiredPermissions: ['referential:access'] },
    { path: '/settings', icon: SettingsIcon, label: 'Parametres', requiredPermissions: ['settings:read'] },
    { path: '/admin', icon: ShieldAlert, label: 'Administration', requiredPermissions: ['admin:access'] },
  ];

  const visibleNavItems = navItems.filter((item) => hasAnyPermission(item.requiredPermissions));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-slate-950 text-slate-300 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`flex items-center border-b border-slate-800/60 ${
          isCollapsed ? 'h-12 justify-center px-2' : 'h-16 px-4'
        }`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>

          {!isCollapsed && (
            <div className="flex items-center gap-3 ml-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                SISAR
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center' : 'gap-3'
                } px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {!isCollapsed && item.label}
            </NavLink>
          ))}

          {!isCollapsed && visibleNavItems.length > 0 && (
            <div className="pt-4 pb-2 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Raccourcis</p>
            </div>
          )}

          {hasAnyPermission(['finding:read']) && (
            <NavLink
              to="/findings/critical"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center' : 'gap-3'
                } px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              <AlertTriangle className="w-5 h-5" />
              {!isCollapsed && 'Constats critiques'}
            </NavLink>
          )}

          {hasAnyPermission(['recommendation:read']) && (
            <NavLink
              to="/recommendations/overdue"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? 'justify-center' : 'gap-3'
                } px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`
              }
            >
              <Clock className="w-5 h-5" />
              {!isCollapsed && 'Recommandations en retard'}
            </NavLink>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800/60">
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user?.role || 'Utilisateur'}
                </p>
              </div>
            </div>
          )}

          <div className="mb-3">
            <button
              onClick={() => setShowChangePassword(true)}
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'gap-3'
              } px-3 py-2.5 w-full rounded-lg font-medium transition-colors
              text-slate-400 hover:bg-slate-900 hover:text-slate-200`}
            >
              <Lock className="w-5 h-5" />
              {!isCollapsed && 'Mot de passe'}
            </button>
          </div>

          <div className="mb-3">
            <button
              onClick={toggleTheme}
              className={`flex items-center ${
                isCollapsed ? 'justify-center' : 'gap-3'
              } px-3 py-2.5 w-full rounded-lg font-medium transition-colors
              bg-slate-800 text-slate-200 hover:bg-slate-700`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              {!isCollapsed && 'Theme'}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'gap-3'
            } px-3 py-2.5 w-full rounded-lg font-medium transition-colors
            bg-red-700 text-white hover:bg-red-800`}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && 'Deconnexion'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:hidden z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              SISAR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -mr-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}
