import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, LogOut, ShieldAlert, CalendarDays } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  
  const navItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { path: '/plans', label: 'Plans d\'audit', icon: CalendarDays },
    { path: '/missions', label: 'Missions d\'audit', icon: Briefcase },
    { path: '/settings', label: 'Paramétrage', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <ShieldAlert className="w-8 h-8 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">SISAR</h1>
            <p className="text-xs text-slate-400 font-medium">SOREPCO</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
              JD
            </div>
            <div>
              <p className="text-sm font-medium">Jean Dupont</p>
              <p className="text-xs text-slate-400">Chef Service Audit</p>
            </div>
          </div>
          <Link to="/login" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            {navItems.find(i => location.pathname.startsWith(i.path))?.label || ''}
          </h2>
          <div className="text-sm text-slate-500">
            SOREPCO - Espace Sécurisé
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
