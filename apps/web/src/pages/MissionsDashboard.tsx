import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, Award, Briefcase, CalendarClock, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardList, Eye, FileText, Loader2, Trophy, Users,
} from 'lucide-react';
import {
  KpiCard, ProgressBar, SectionCard, PeriodFilter, StatusBadge, cn,
} from '../components/dashboard';
import type { PeriodFilterValue } from '../components/dashboard';
import { apiFetch } from '../lib/api';
import DashboardExportButtons from '../components/dashboard/DashboardExportButtons';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#94a3b8', READY: '#0ea5e9', IN_PROGRESS: '#2563eb',
  UNDER_REVIEW: '#f59e0b', APPROVED: '#8b5cf6', CLOSED: '#059669',
  CANCELLED: '#64748b', REVIEW: '#7c3aed', COMPLETED: '#10b981', VALIDATED: '#34d399',
};

const CHART_COLORS = ['#2563eb', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6'];

export default function MissionsDashboard() {
  const now = new Date();
  const [period, setPeriod] = useState<PeriodFilterValue>({ year: now.getFullYear(), month: null });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();
  const canViewAll = !!user?.permissions?.includes('audit_mission:read_all');
  const [scope, setScope] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    setLoading(true);
    setError(null);
    setShowAll(false);
    const params = new URLSearchParams();
    params.set('year', String(period.year));
    if (period.month !== null) params.set('month', String(period.month + 1));
    params.set('scope', canViewAll ? scope : 'mine');
    apiFetch(`${API_BASE}/dashboard/missions?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors du chargement des données');
        return res.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [period, scope, canViewAll]);

  const pieData = useMemo(
    () => (data?.byStatus || []).map((s: any) => ({
      name: s.label,
      value: s.count,
      status: s.status,
      color: STATUS_COLORS[s.status] || '#94a3b8',
    })),
    [data]
  );

  const typeData = useMemo(
    () => (data?.byAuditType || []).map((t: any, i: number) => ({
      ...t,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [data]
  );

  const leaderData = useMemo(
    () => (data?.byLeader || []).slice(0, 8).map((l: any, i: number) => ({
      ...l,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [data]
  );

  const trendData = useMemo(() => data?.trend || [], [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm">Chargement du tableau de bord missions…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900 dark:bg-slate-800">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">Impossible de charger le tableau de bord</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error || 'Données indisponibles.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const s = data.summary;
  const prev = data.previousSummary || null;
  const delta = (cur: number, prevVal: number | null | undefined, goodWhenUp = true) =>
    prevVal === null || prevVal === undefined
      ? undefined
      : { value: cur - prevVal, good: goodWhenUp ? cur - prevVal > 0 : cur - prevVal < 0 };
  const ranking = data?.ranking || [];
  const topMissions = showAll ? ranking : ranking.slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">
        {/* ═══ LEVEL 1 — HEADER + KPIs ═══ */}
        <section>
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-[260px] flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Tableau de bord missions</h1>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Pilotage des missions d'audit : avancement, résolution des constats et clôture des recommandations.
                </p>
                {canViewAll ? (
                  <div className="mt-4 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-600 dark:bg-slate-700/60">
                    <button
                      onClick={() => setScope('all')}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                        scope === 'all'
                          ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      )}
                    >
                      Toutes les missions
                    </button>
                    <button
                      onClick={() => setScope('mine')}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                        scope === 'mine'
                          ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      )}
                    >
                      Mes missions
                    </button>
                  </div>
                ) : (
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Users className="h-3 w-3" />
                    Vue : mes missions
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-6">
                <HealthGauge score={data.healthScore ?? 0} />
                <div className="flex flex-col items-stretch gap-2">
                  <PeriodFilter value={period} onChange={setPeriod} />
                  <DashboardExportButtons target="missions" period={period} scope={scope} />
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Missions totales"
              value={String(s.totalMissions)}
              hint={`${s.planned} planifiées · ${s.cancelled} annulées`}
              tone="blue"
              icon={Briefcase}
              delta={delta(s.totalMissions, prev?.totalMissions)}
              action={<KpiDetailsLink to="/missions?tab=active" label="Voir les missions" tone="blue" />}
            />
            <KpiCard
              label="En cours"
              value={String(s.inProgress)}
              hint="En exécution ou en revue"
              tone="indigo"
              icon={CalendarClock}
              delta={delta(s.inProgress, prev?.inProgress)}
              action={<KpiDetailsLink to="/missions?tab=active" label="Voir en cours" tone="indigo" />}
            />
            <KpiCard
              label="Terminées"
              value={String(s.completed)}
              hint={`Taux de complétion ${s.completionRate}%`}
              tone="emerald"
              icon={CheckCircle2}
              delta={delta(s.completed, prev?.completed)}
              action={<KpiDetailsLink to="/missions?tab=archive" label="Voir les terminées" tone="emerald" />}
            />
            <KpiCard
              label="En retard"
              value={String(s.late)}
              hint="Échéance dépassée"
              tone="red"
              icon={AlertTriangle}
              delta={delta(s.late, prev?.late, false)}
              action={<KpiDetailsLink to="/missions?tab=active" label="Voir les retards" tone="red" />}
            />
            <KpiCard
              label="Constats résolus"
              value={`${s.findingsResolved}/${s.findingsCount}`}
              hint={`Taux de résolution ${s.findingsResolvedRate}%`}
              tone="amber"
              icon={FileText}
              delta={delta(s.findingsResolvedRate, prev?.findingsResolvedRate)}
            />
            <KpiCard
              label="Clôture reco."
              value={`${s.recoClosureRate}%`}
              hint={`${s.recosClosed}/${s.recosCount} recommandations`}
              tone="violet"
              icon={Award}
              delta={delta(s.recoClosureRate, prev?.recoClosureRate)}
            />
          </div>
        </section>

        {/* ═══ LEVEL 2 — RÉPARTITIONS ═══ */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
          <SectionCard title="Répartition par statut" subtitle="État d'avancement des missions">
            {pieData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 256 }}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                        {pieData.map((entry: any) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} mission(s)`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {pieData.map((e: any) => (
                    <span
                      key={e.status}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                      {e.name} · {e.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Par type d'audit" subtitle="Volume de missions par typologie">
            {typeData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 288 }}>
                  <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                    <Bar dataKey="count" name="Missions" radius={[0, 6, 6, 0]}>
                      {typeData.map((e: any, i: number) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Missions par responsable" subtitle="Charge par pilote de mission">
            {leaderData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 288 }}>
                  <BarChart data={leaderData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="leader" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                    <Bar dataKey="count" name="Missions" radius={[0, 6, 6, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </section>

        {/* ═══ LEVEL 3 — TENDANCE ═══ */}
        <section className="grid grid-cols-1 gap-6">
          <SectionCard title="Dynamique des missions" subtitle="Missions créées et clôturées — 12 derniers mois">
            {trendData.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 288 }}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gClosed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="created" name="Créées" stroke="#2563eb" strokeWidth={2} fill="url(#gCreated)" />
                    <Area type="monotone" dataKey="closed" name="Clôturées" stroke="#059669" strokeWidth={2} fill="url(#gClosed)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </section>

        {/* ═══ LEVEL 4 — CLASSEMENT 🏆 ═══ */}
        <section className="grid grid-cols-1 gap-6">
          <SectionCard
            title="Classement des missions"
            subtitle="Performance : taux de clôture des recommandations (60 %) + résolution des constats (40 %)"
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <Trophy className="h-3.5 w-3.5" />
                {showAll ? `${ranking.length} missions` : 'Top 10'}
              </span>
            }
          >
            {topMissions.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {topMissions.map((m: any, idx: number) => (
                  <Link
                    key={m.id}
                    to={`/missions/${m.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-700/40 dark:hover:border-slate-500"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                            idx === 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : idx === 1
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200'
                                : idx === 2
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          )}
                        >
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                            {m.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {m.leader && (
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {m.leader}
                              </span>
                            )}
                            {m.auditType && <span>{m.auditType}</span>}
                            <span>Score {m.score}/100</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge value={m.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <Metric label="Constats" value={`${m.findingsResolved}/${m.findingsCount}`} />
                      <Metric label="Recos" value={`${m.recosClosed}/${m.recosCount}`} />
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Clôture reco.</p>
                        <ProgressBar value={m.recoClosureRate} tone="emerald" size="sm" />
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">Score</p>
                        <ProgressBar value={m.score} tone="amber" size="sm" />
                      </div>
                    </div>

                    <div className="mt-2 border-t border-slate-100 pt-3 dark:border-slate-600">
                      <span className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${KPI_LINK_TONES.slate}`}>
                        <Eye className="h-3.5 w-3.5" />
                        Voir la mission
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {ranking.length > 10 && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:text-emerald-700 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Voir moins
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Voir plus
                      </>
                    )}
                  </button>
                </div>
              )}
              </>
            )}
          </SectionCard>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 text-slate-400 dark:border-slate-600 dark:text-slate-500">
      <ClipboardList className="h-8 w-8" />
      <p className="text-sm">Aucune donnée pour la période sélectionnée</p>
    </div>
  );
}

const KPI_LINK_TONES: Record<string, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900',
  red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900',
};

function KpiDetailsLink({ to, label, tone }: { to: string; label: string; tone: keyof typeof KPI_LINK_TONES }) {
  return (
    <Link
      to={to}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${KPI_LINK_TONES[tone]}`}
    >
      <Eye className="h-3.5 w-3.5" />
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function HealthGauge({ score }: { score: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c - (clamped / 100) * c;
  const color = clamped >= 80 ? '#059669' : clamped >= 60 ? '#2563eb' : clamped >= 40 ? '#f59e0b' : '#dc2626';
  const label = clamped >= 80 ? 'Excellent' : clamped >= 60 ? 'Bon' : clamped >= 40 ? 'Moyen' : 'Critique';
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{clamped}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
          Santé du portefeuille
        </p>
        <p className="text-lg font-semibold" style={{ color }}>{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Score / 100</p>
      </div>
    </div>
  );
}
