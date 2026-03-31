import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type DGDashboardData = {
  criticalFindingsCount: number;
  criticalRecommendationsOpen: number;
  criticalRecommendationsClosed: number;
  resolutionRate: number;

  topRiskDepartments: {
    department: string;
    count: number;
  }[];

  // ✅ AJOUT ICI
  trend: {
    month: string;
    findings: number;
    recosOpen: number;
  }[];
};

export default function DashboardDG() {
  const [data, setData] = useState<DGDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/dashboard/dg`);

        if (!res.ok) throw new Error('Erreur API');

        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔥 état global DG
  const getGlobalStatus = () => {
    if (!data) return 'neutral';

    if (data.criticalFindingsCount > 0) return 'danger';
    if (data.criticalRecommendationsOpen > 5) return 'warning';
    if (data.resolutionRate >= 80) return 'good';

    return 'neutral';
  };

  const status = getGlobalStatus();

  const statusColor = {
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-orange-100 text-orange-700',
    good: 'bg-green-100 text-green-700',
    neutral: 'bg-gray-100 text-gray-700',
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error || !data) return <div className="p-6 text-red-500">Erreur chargement</div>;

  return (
    <div className="p-6 space-y-6">

      {/* 🔥 HEADER DG */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Direction Générale</h1>

        <div className={`px-4 py-2 rounded-xl font-semibold ${statusColor[status]}`}>
          {status === 'danger' && '🚨 Risque élevé'}
          {status === 'warning' && '⚠️ Sous surveillance'}
          {status === 'good' && '✅ Situation saine'}
          {status === 'neutral' && 'ℹ️ Stable'}
        </div>
      </div>

      {/* 🔥 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Findings critiques</p>
          <p className="text-3xl font-bold text-red-600">
            {data.criticalFindingsCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-orange-400">
          <p className="text-sm text-gray-500">Recos ouvertes</p>
          <p className="text-3xl font-bold text-orange-500">
            {data.criticalRecommendationsOpen}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Recos fermées</p>
          <p className="text-3xl font-bold text-green-600">
            {data.criticalRecommendationsClosed}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Taux résolution</p>
          <p className="text-3xl font-bold">
            {data.resolutionRate}%
          </p>
        </div>

      </div>

      {/* 🔥 PRIORITÉ DG */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold mb-3">Priorité actuelle</h2>

        {data.criticalFindingsCount > 0 ? (
          <p className="text-red-600 font-semibold">
            🚨 Des findings critiques nécessitent une attention immédiate
          </p>
        ) : data.criticalRecommendationsOpen > 0 ? (
          <p className="text-orange-500 font-semibold">
            ⚠️ Des recommandations critiques sont encore ouvertes
          </p>
        ) : (
          <p className="text-green-600 font-semibold">
            ✅ Aucun risque critique actif
          </p>
        )}
      </div>

      {/* 🔥 TOP DEPARTEMENTS */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold mb-4">Top départements à risque</h2>

        <div className="space-y-3">
          {data.topRiskDepartments.map((dept, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span>{dept.department}</span>
                <span className="font-bold">{dept.count}</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(dept.count * 10, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    <div className="bg-white rounded-2xl shadow p-4">
    <h2 className="font-semibold mb-4">Évolution des risques (12 mois)</h2>

    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.trend}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />

        <Line
            type="monotone"
            dataKey="findings"
            stroke="#ef4444"
            strokeWidth={2}
            name="Findings critiques"
        />

        <Line
            type="monotone"
            dataKey="recosOpen"
            stroke="#f97316"
            strokeWidth={2}
            name="Recos ouvertes"
        />
        </LineChart>
    </ResponsiveContainer>
    </div>

    </div>
  );
}