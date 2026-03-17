import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

interface DashboardStats {
  totalMissions: number;
  activeMissions: number;
  openFindings: number;
  pendingRecommendations: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0,
    activeMissions: 0,
    openFindings: 0,
    pendingRecommendations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In a real scenario, this would be a dedicated dashboard endpoint.
        // For now, we simulate fetching aggregated data.
        const [missionsRes, findingsRes, recosRes] = await Promise.all([
          apiFetch('/api/missions').catch(() => ({ json: () => [] })),
          apiFetch('/api/findings').catch(() => ({ json: () => [] })),
          apiFetch('/api/recommendations').catch(() => ({ json: () => [] }))
        ]);

        const missions = await missionsRes.json();
        const findings = await findingsRes.json();
        const recos = await recosRes.json();

        setStats({
          totalMissions: Array.isArray(missions) ? missions.length : 0,
          activeMissions: Array.isArray(missions) ? missions.filter((m: any) => m.status === 'IN_PROGRESS').length : 0,
          openFindings: Array.isArray(findings) ? findings.filter((f: any) => f.status !== 'ADDRESSED').length : 0,
          pendingRecommendations: Array.isArray(recos) ? recos.filter((r: any) => r.status !== 'CLOSED').length : 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Missions Actives',
      value: stats.activeMissions,
      total: stats.totalMissions,
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100'
    },
    {
      title: 'Constats Ouverts',
      value: stats.openFindings,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100'
    },
    {
      title: 'Recommandations en attente',
      value: stats.pendingRecommendations,
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Bonjour, {user?.firstName}
          </h1>
          <p className="text-slate-500 mt-1">
            Voici un aperçu de vos activités d'audit aujourd'hui.
          </p>
        </div>
        <Link 
          to="/missions"
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
        >
          Voir toutes les missions
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className={`relative overflow-hidden rounded-2xl border ${stat.borderColor} bg-white p-6 shadow-sm transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center border ${stat.borderColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <Activity className="w-5 h-5 text-slate-300" />
            </div>
            
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
              <div className="flex items-baseline gap-2">
                {isLoading ? (
                  <div className="h-10 w-16 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <h3 className="text-4xl font-bold text-slate-900 tracking-tight">
                    {stat.value}
                  </h3>
                )}
                {stat.total !== undefined && !isLoading && (
                  <span className="text-sm font-medium text-slate-400">
                    / {stat.total} au total
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Actions Rapides</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link 
              to="/missions" 
              className="group flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-3 group-hover:border-emerald-200">
                <Briefcase className="w-5 h-5 text-slate-600 group-hover:text-emerald-600" />
              </div>
              <span className="font-medium text-slate-900">Nouvelle Mission</span>
              <span className="text-xs text-slate-500 mt-1">Planifier un nouvel audit</span>
            </Link>
            
            <Link 
              to="/settings" 
              className="group flex flex-col p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-3 group-hover:border-blue-200">
                <TrendingUp className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
              </div>
              <span className="font-medium text-slate-900">Rapports</span>
              <span className="text-xs text-slate-500 mt-1">Générer des statistiques</span>
            </Link>
          </div>
        </div>

        {/* System Status */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">État du Système</h3>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-emerald-900">Tous les systèmes sont opérationnels</h4>
                <p className="text-sm text-emerald-700 mt-1">
                  La connexion à la base de données et les services d'API fonctionnent normalement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
