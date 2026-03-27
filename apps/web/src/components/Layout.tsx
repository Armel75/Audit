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
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sidebar collapse
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/plans', icon: Calendar, label: 'Plans d\'audit' },
    { path: '/missions', icon: Briefcase, label: 'Missions d\'audit' },
    { path: '/referential', icon: Database, label: 'Référentiel' },
    { path: '/settings', icon: SettingsIcon, label: 'Paramètres' },
    { path: '/admin', icon: ShieldAlert, label: 'Administration' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-slate-950 text-slate-300 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header dynamique */}
        <div className={`flex items-center border-b border-slate-800/60 ${
          isCollapsed ? 'h-12 justify-center px-2' : 'h-16 px-4'
        }`}>
          {/* Toggle */}
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

        {/* Navigation */}
        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
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
        </nav>

        {/* Footer */}
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

          {/* Logout rouge foncé */}
          <button
            onClick={handleLogout}
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'gap-3'
            } px-3 py-2.5 w-full rounded-lg font-medium transition-colors 
            bg-red-700 text-white hover:bg-red-800`}
          >
            <LogOut className="w-5 h-5" />
            {!isCollapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:hidden z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              SISAR
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}