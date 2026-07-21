import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  CalendarRange,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Eye,
  FileCheck2,
  FolderOpen,
  GitBranch,
  Gauge,
  LayoutGrid,
  Loader2,
  Shield,
  Siren,
  Target,
  TrendingUp,
  User2,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  KpiCard, MetricRow, ProgressBar, StatusBadge, SectionCard, AlertCard, MissionCard, PeriodFilter,
  cn, formatDate, timeAgo, toneMap, missionStatusColors, missionStatusLabels,
} from '../components/dashboard';
import type { PeriodFilterValue } from '../components/dashboard';
import type { Tone } from '../components/dashboard';

/* ─── Helpers ─── */

function computeHealthScore(kpis: any, planExecution: any, performance: any): { score: number; label: string; factors: Array<{ label: string; score: number; weight: number }> } {
  const factors = [
    { label: "Exécution du plan", score: planExecution?.progress ?? 0, weight: 25 },
    { label: "Implémentation recommandations", score: kpis?.avgImplementation ?? 0, weight: 20 },
    { label: "Couverture univers", score: performance?.coverageRate ?? 0, weight: 15 },
    { label: "Conformité procédures", score: performance?.procedureConformityRate ?? 0, weight: 10 },
    { label: "Respect échéances", score: performance?.missionsOnTimeRate ?? 100, weight: 15 },
    { label: "Constats sous contrôle", score: kpis?.findingsCriticalOpen && kpis?.findingsOpen ? Math.round((1 - kpis.findingsCriticalOpen / Math.max(kpis.findingsOpen, 1)) * 100) : 100, weight: 15 },
  ];
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score = Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);
  const label = score >= 70 ? "Situation saine" : score >= 45 ? "Sous surveillance" : "Risque élevé";
  return { score, label, factors };
}

function getHealthTone(score: number): Tone {
  return score >= 70 ? "emerald" : score >= 45 ? "amber" : "red";
}

const detailTabOptions = ["approbations", "tickets", "activite", "documents"] as const;
type DetailTab = typeof detailTabOptions[number];

export default function Dashboard() {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>("approbations");
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [period, setPeriod] = useState<PeriodFilterValue>({ year: now.getFullYear(), month: null });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('year', String(period.year));
    if (period.month !== null) params.set('month', String(period.month + 1));
    apiFetch(`${API_BASE}/dashboard/main?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement du tableau de bord');
        return res.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [period]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <p className="text-sm text-red-700 dark:text-red-300">{error || 'Erreur inconnue'}</p>
        </div>
      </div>
    );
  }

  const {
    kpis, planExecution, missionStatusData, topMissions, findingsSummary,
    findingsByRisk, topFindings, recommendationSummary, recommendationsByDepartment,
    topRecommendations, approvalsSummary, recentApprovals, tickets, recentTickets,
    documents, riskControl, recentActivity, unreadNotifications, performance,
  } = data;

  const missionPieData = (missionStatusData || []).map((m: any) => ({
    name: missionStatusLabels[m.status] || m.status,
    value: m.count,
    color: missionStatusColors[m.status] || '#94a3b8',
  }));

  // Alerts dynamiques
  const alerts: Array<{ id: string; title: string; detail: string; severity: 'critical' | 'high' | 'medium'; action?: React.ReactNode }> = [];
  if (kpis.recosOverdue > 0) alerts.push({ id: 'a1', title: `${kpis.recosOverdue} recommandation(s) en retard`, detail: 'Cibles dépassées nécessitant une action immédiate.', severity: 'critical', action: <Link to="/recommendations/overdue" className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les recommandations</Link> });
  if (kpis.findingsCriticalOpen > 0) alerts.push({ id: 'a2', title: `${kpis.findingsCriticalOpen} constat(s) critique(s) ouvert(s)`, detail: 'Constats à risque élevé non clôturés.', severity: 'critical', action: <Link to="/findings/critical" className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les constats</Link> });
  if (kpis.approvalsPending > 0) alerts.push({ id: 'a3', title: `${kpis.approvalsPending} approbation(s) en attente`, detail: 'Éléments bloquants dans les workflows de gouvernance.', severity: 'high' });
  if (riskControl?.risksWithoutControls > 0) alerts.push({ id: 'a4', title: `${riskControl.risksWithoutControls} risque(s) sans contrôle`, detail: 'Lacunes de couverture dans le dispositif de contrôle.', severity: 'critical' });
  if (planExecution?.missionsWithoutValidatedProgram > 0) alerts.push({ id: 'a5', title: `${planExecution.missionsWithoutValidatedProgram} mission(s) sans programme validé`, detail: 'Démarrage opérationnel sans cadre approuvé.', severity: 'medium' });
  if (unreadNotifications > 0) alerts.push({ id: 'a6', title: `${unreadNotifications} notification(s) non lue(s)`, detail: 'Dont possiblement des demandes d’approbation et échéances.', severity: 'medium' });


  const health = computeHealthScore(kpis, planExecution, performance);
  const healthTone = getHealthTone(health.score);

  function HealthGaugeRing() {
    const c = 2 * Math.PI * 54;
    const offset = c - (health.score / 100) * c;
    const sc = healthTone === "emerald" ? "#059669" : healthTone === "amber" ? "#d97706" : "#dc2626";
    return (
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-sm">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle cx="70" cy="70" r="54" fill="none" stroke={sc} strokeWidth="10" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 70 70)" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight" style={{ color: sc }}>{health.score}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">/100</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">
        {/* ═══ LEVEL 1 ═══ */}
        <section>
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/30 shadow-sm">
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    Audit command center
                  </span>
                  {planExecution && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                      Plan {planExecution.year}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Tableau de bord audit</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Vision synthétique du dispositif d'audit : exécution du plan, maîtrise des risques, remédiation et gouvernance.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300">
                    <User2 className="h-3.5 w-3.5" />
                    {user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Responsable audit"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300">
                    <Bell className="h-3.5 w-3.5" />
                    {unreadNotifications} notification(s) non lue(s)
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                {user?.permissions?.includes('audit_mission:create') && (
                  <Link
                    to="/missions/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md active:scale-[0.97]"
                  >
                    <Briefcase className="w-4 h-4" />
                    Nouvelle mission
                  </Link>
                )}
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>
          </header>

        {/* ═══ MISSIONS EN COURS ═══ */}
        <SectionCard
          title="Missions en cours"
          subtitle={`${topMissions?.length ?? 0} mission(s) active(s) — cliquer pour voir les détails`}
            action={<Link to="/missions" className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all"><Eye className="h-4 w-4" />Voir toutes les missions</Link>}
          className="mb-6"
        >
          {(topMissions || []).length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">Aucune mission active pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(topMissions || []).slice(0, 5).map((mission: any) => (
                <MissionCard key={mission.id} mission={mission} now={now} />
              ))}
            </div>
          )}
        </SectionCard>

        {/* ═══ INDICATEURS CLÉS ═══ */}

        {/* Health Score + Vital KPIs */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
            healthTone === "emerald" ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-800 dark:border-emerald-800" :
            healthTone === "amber" ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-800 dark:border-amber-800" :
            "border-red-200 bg-gradient-to-br from-red-50 to-white dark:from-red-950/40 dark:to-slate-800 dark:border-red-800"
          }`}>
            <div className="flex flex-col items-center text-center">
              <HealthGaugeRing />
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Score de santé global</p>
              <p className={`mt-1 text-sm font-semibold ${
                healthTone === "emerald" ? "text-emerald-700" : healthTone === "amber" ? "text-amber-700" : "text-red-700"
              }`}>{health.label}</p>
              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                {health.factors.slice(0, 4).map(f => (
                  <div key={f.label} className="text-center">
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{f.label}</p>
                    <p className={`text-sm font-bold ${f.score >= 70 ? "text-emerald-600" : f.score >= 45 ? "text-amber-600" : "text-red-600"}`}>{f.score}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label="Exécution du plan" value={planExecution ? `${planExecution.progress}%` : "—"} hint={planExecution ? `${planExecution.completedMissions}/${planExecution.totalMissions} missions` : "Aucun plan actif"} tone="blue" icon={Target}
              action={<Link to="/plans" className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"><Eye className="h-3.5 w-3.5" />Consulter les plans</Link>}
            />
            <KpiCard label="Constats critiques" value={String(kpis.findingsCriticalOpen)} hint={`sur ${kpis.findingsOpen} constats ouverts`} tone={kpis.findingsCriticalOpen > 0 ? "red" : "emerald"} icon={AlertTriangle}
              action={<Link to="/findings/critical" className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les constats</Link>}
            />
            <KpiCard label="Recommandations en retard" value={String(kpis.recosOverdue)} hint={`sur ${kpis.recosOpen} recommandations`} tone={kpis.recosOverdue > 0 ? "amber" : "emerald"} icon={Clock3}
              action={<Link to="/recommendations/overdue" className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les recommandations</Link>}
            />
            <KpiCard label="Taux remédiation recommandations" value={`${kpis.avgImplementation}%`} hint="remédiation globale" tone={kpis.avgImplementation >= 70 ? "emerald" : "amber"} icon={Gauge}
              action={user?.permissions?.some((p: string) => ['dashboard_dg:read', 'admin:access'].includes(p)) ? <Link to="/dashboard-dg" className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"><Eye className="h-3.5 w-3.5" />Vue décisionnelle</Link> : undefined}
            />
          </div>
        </div>
        </section>

        {/* ═══ LEVEL 2 ═══ */}


        {/* ── Bloc A: Plan d'audit ── */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.35fr_0.9fr]">
          <SectionCard
            title="Pilotage du plan d'audit"
            subtitle="Avancement du plan annuel et répartition des missions par statut."
            action={<Link to="/missions" className="hidden rounded-xl border-2 border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all sm:inline-flex items-center gap-1.5"><Eye className="h-4 w-4" />Voir toutes les missions</Link>}
          >
            <div className="space-y-4">
              {planExecution && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Progression plan {planExecution.year}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                        {planExecution.completedMissions}/{planExecution.totalMissions}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                      {planExecution.progress}% exécuté
                    </span>
                  </div>
                  <div className="mt-4"><ProgressBar value={planExecution.progress} tone="blue" /></div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricRow label="Programmes approuvés" value={`${planExecution.programsApproved}`} hint="cadre validé" tone="emerald" />
                    <MetricRow label="Programmes en attente" value={`${planExecution.programsPending}`} hint="soumis ou en révision" tone="amber" />
                    <MetricRow label="Missions sans programme" value={`${planExecution.missionsWithoutValidatedProgram}`} hint="alerte de gouvernance" tone="violet" />
                  </div>
                </div>
              )}

              {missionPieData.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Répartition des missions par statut</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{kpis.missionsTotal} missions</span>
                  </div>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={missionPieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {missionPieData.map((entry: any) => (<Cell key={entry.name} fill={entry.color} />))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {missionPieData.map((item: any) => (
                      <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-slate-600 dark:text-slate-300">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Alertes */}
          <SectionCard title="Alertes prioritaires" subtitle="Points critiques nécessitant une décision ou une remédiation immédiate." className={alerts.some(a => a.severity === 'critical') ? 'border-red-200 dark:border-red-800' : ''}>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 dark:text-emerald-500 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune alerte active.</p>
                </div>
              ) : alerts.map(alert => (
                <AlertCard key={alert.id} title={alert.title} detail={alert.detail} severity={alert.severity} action={alert.action} />
              ))}
            </div>
          </SectionCard>
        </section>



        {/* Performance & couverture */}
        {performance && (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <SectionCard
              title="Performance & couverture"
              subtitle="Indicateurs clés de performance : couverture de l'univers, délais de clôture, conformité et charge."
              className="xl:col-span-5"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40">
                        <Target className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Couverture univers</p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{performance.coverageRate}%</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{performance.coveredEntitiesCount} / {performance.totalAuditableEntities} entités auditées</p>
                    <div className="mt-2"><ProgressBar value={performance.coverageRate} tone="emerald" /></div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40">
                        <Shield className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Conformité procédures</p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{performance.procedureConformityRate}%</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{performance.proceduresOk} OK sur {performance.proceduresTotal} testées</p>
                    <div className="mt-2"><ProgressBar value={performance.procedureConformityRate} tone={performance.procedureConformityRate >= 80 ? 'emerald' : performance.procedureConformityRate >= 50 ? 'amber' : 'red'} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MetricRow label="Délai moyen clôture constats" value={`${performance.avgFindingCloseDays} j`} hint="de la création à la clôture" tone="amber" />
                  <MetricRow label="Délai moyen clôture recos" value={`${performance.avgRecoCloseDays} j`} hint="de la création à la clôture" tone="blue" />
                  <MetricRow label="Respect des échéances" value={`${performance.missionsOnTimeRate}%`} hint={`${performance.missionsLate} mission(s) en retard`} tone={performance.missionsOnTimeRate >= 80 ? 'emerald' : 'red'} />
                  <MetricRow label="Missions terminées" value={`${performance.completedMissionsCount}`} hint="clôturées sur la période" tone="emerald" />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Tendances & charge"
              subtitle="Évolution mensuelle des constats et répartition de la charge par auditeur."
              className="xl:col-span-7"
            >
              <div className="grid grid-cols-1 gap-5">
                {(performance.findingsTrend || []).length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Constats créés vs clôturés (6 mois)</h4>
                      <TrendingUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performance.findingsTrend}>
                          <CartesianGrid vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="created" name="Créés" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="closed" name="Clôturés" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {(performance.auditorWorkload || []).length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Charge par auditeur (missions actives)</h4>
                      <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performance.auditorWorkload} layout="vertical" margin={{ left: 10, right: 10 }}>
                          <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={120} />
                          <Tooltip />
                          <Bar dataKey="missions" name="Missions" radius={[0, 8, 8, 0]} fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </section>
        )}

        {/* Findings + Recommendations */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard title="Constats" subtitle="Vue consolidée des constats ouverts, critiques, récents et en attente de validation." className="xl:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Constats ouverts" value={`${findingsSummary?.open ?? 0}`} hint="backlog actif" tone="amber" />
              <MetricRow label="Constats critiques" value={`${findingsSummary?.critical ?? 0}`} hint="traitement prioritaire" tone="red" />
              <MetricRow label="En attente de validation" value={`${findingsSummary?.pendingValidation ?? 0}`} hint="workflow de revue" tone="violet" />
              <MetricRow label="Constats récents (7j)" value={`${findingsSummary?.recent ?? 0}`} hint="activité récente" tone="blue" />
            </div>

            {(findingsByRisk || []).length > 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Constats par niveau de risque</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{findingsSummary?.open ?? 0} constats</span>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={findingsByRisk}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {(topFindings || []).map((finding: any) => (
                <div key={finding.id} className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {finding.riskLevel && <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">{finding.riskLevel}</span>}
                    <StatusBadge value={finding.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">{finding.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>#{finding.id}</span>
                    {finding.mission && <><span>•</span><span>{finding.mission}</span></>}
                    <span>•</span>
                    <span>{Math.ceil((Date.now() - new Date(finding.createdAt).getTime()) / 86400000)} j</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recommandations / remédiation" subtitle="Suivi des recommandations ouvertes, échues, prioritaires et par département." className="xl:col-span-7">
            <div className="grid grid-cols-1 gap-5">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricRow label="Recommandations ouvertes" value={`${recommendationSummary?.open ?? 0}`} hint="hors clôturées" tone="blue" />
                  <MetricRow label="Recommandations échues" value={`${recommendationSummary?.overdue ?? 0}`} hint="cibles dépassées" tone="red" />
                  <MetricRow label="Progression moyenne" value={`${recommendationSummary?.averageProgress ?? 0}%`} hint="suivi d’implémentation" tone="emerald" />
                  <MetricRow label="Prochaines échéances (7j)" value={`${recommendationSummary?.dueNext7Days ?? 0}`} hint="à surveiller" tone="amber" />
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600">
                  <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    <span>Recommandation</span>
                    <span>Responsable</span>
                    <span>Département</span>
                    <span>Statut</span>
                    <span>Suivi</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {(topRecommendations || []).length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">Aucune recommandation ouverte.</p>
                    ) : (topRecommendations || []).map((reco: any) => (
                      <div key={reco.id} className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr]">
                        <div className="min-w-0">
                          {reco.linkedTicket && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 mr-2">
                              {reco.linkedTicket}
                            </span>
                          )}
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 dark:text-white">{reco.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>#{reco.id}</span>
                            <span>•</span>
                            <span>Cible {formatDate(reco.targetDate)}</span>
                          </div>
                        </div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">{reco.assignee || '—'}</div>
                        <div className="text-sm text-slate-700 dark:text-slate-300">{reco.department || '—'}</div>
                        <div><StatusBadge value={reco.status} /></div>
                        <div>
                          <ProgressBar
                            value={reco.progress ?? 0}
                            tone={reco.targetDate && new Date(reco.targetDate) < now && reco.status !== 'CLOSED' ? 'red' : (reco.progress ?? 0) >= 70 ? 'emerald' : 'blue'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {(recommendationsByDepartment || []).length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Recommandations par département</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">charges de remédiation</span>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recommendationsByDepartment} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={80} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </section>

        {/* ═══════ LEVEL 3 — DETAIL TABS ═══════ */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/30 shadow-sm">
          <div className="px-5 pt-4 sm:px-6">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-0">
              {detailTabOptions.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-5 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    activeTab === tab
                      ? "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950 rounded-t-lg border border-blue-200 dark:border-blue-800 border-b-white dark:border-b-slate-800 -mb-px z-10 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm active:scale-[0.97]"
                  }`}
                >
                  {tab === "approbations" && "Approbations"}
                  {tab === "tickets" && "Tickets GLPI"}
                  {tab === "activite" && "Activité récente"}
                  {tab === "documents" && "Documents & Preuves"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {activeTab === "approbations" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <MetricRow label="En attente" value={`${approvalsSummary?.pending ?? 0}`} hint="flux bloquants" tone="amber" />
                  <MetricRow label="Approuvées" value={`${approvalsSummary?.approved ?? 0}`} hint="validées" tone="emerald" />
                  <MetricRow label="Rejetées" value={`${approvalsSummary?.rejected ?? 0}`} hint="révision requise" tone="red" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(recentApprovals || []).length === 0 ? (
                    <p className="col-span-full text-center text-sm text-slate-400 dark:text-slate-500 italic py-8">Aucune approbation récente.</p>
                  ) : (recentApprovals || []).slice(0, 4).map((item: any) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={item.decision} />
                        <span className="rounded-full border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">Niveau {item.level}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">{item.item}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>par {item.requestedBy || "—"}</span>
                        <span>•</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "tickets" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <MetricRow label="Ouverts" value={`${tickets?.open ?? 0}`} hint="à traiter" tone="blue" />
                  <MetricRow label="Bloqués" value={`${tickets?.blocked ?? 0}`} hint="dépendances" tone="red" />
                  <MetricRow label="Résolus" value={`${tickets?.resolved ?? 0}`} hint="synchronisés" tone="emerald" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(recentTickets || []).length === 0 ? (
                    <p className="col-span-full text-center text-sm text-slate-400 dark:text-slate-500 italic py-8">Aucun ticket lié.</p>
                  ) : (recentTickets || []).slice(0, 4).map((ticket: any) => (
                    <div key={ticket.id} className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{ticket.ticketNumber || `#${ticket.id}`}</p>
                        {ticket.status && <StatusBadge value={ticket.status} />}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{ticket.title || "—"}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{ticket.assignee || "Non assigné"}</span>
                        <span>{timeAgo(ticket.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "activite" && (
              <div className="space-y-3">
                {(recentActivity || []).length === 0 ? (
                  <p className="text-center text-sm text-slate-400 dark:text-slate-500 italic py-8">Aucune activité récente.</p>
                ) : (recentActivity || []).map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
                      <span className="h-2 w-2 rounded-full bg-slate-500 dark:bg-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">{activity.actor}</span> {activity.action}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {activity.entity && <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 font-medium text-slate-600 dark:text-slate-300">{activity.entity}</span>}
                        <span>•</span>
                        <span>{timeAgo(activity.time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <MetricRow label="Documents" value={`${documents?.totalDocuments ?? 0}`} hint="toutes catégories" tone="slate" />
                  <MetricRow label="Preuves collectées" value={`${documents?.totalEvidence ?? 0}`} hint="mission, constat, reco" tone="blue" />
                  <MetricRow label="Éléments sensibles" value={`${documents?.sensitiveEvidence ?? 0}`} hint="chaîne de conservation" tone="red" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Link
                    to="/missions"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-950/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40">
                        <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Ouvrir les missions</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Planification, exécution et équipes.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500" />
                  </Link>
                  <Link
                    to="/approvals"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 dark:hover:border-amber-600 hover:bg-amber-50/30 dark:hover:bg-amber-950/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
                        <CheckSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Approbations</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{kpis.approvalsPending} élément(s) en attente.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-amber-500" />
                  </Link>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 cursor-default">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40">
                        <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Traçabilité</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tous les changements sont historisés.</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-500" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}