import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
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
  KpiCard, MetricRow, ProgressBar, SectionCard, AlertCard, MissionCard, PeriodFilter,
  cn, formatDate, timeAgo, toneMap,
} from '../components/dashboard';
import type { Tone, PeriodFilterValue } from '../components/dashboard';

/* ─── Component ─── */

export default function DashboardDG() {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [period, setPeriod] = useState<PeriodFilterValue>({ year: now.getFullYear(), month: null });

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('year', String(period.year));
    if (period.month !== null) params.set('month', String(period.month + 1));
    apiFetch(`${API_BASE}/dashboard/dg?${params.toString()}`)
      .then(res => { if (!res.ok) throw new Error('Erreur lors du chargement'); return res.json(); })
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

  const healthScore: number = data.healthScore ?? 0;
  const healthTone: Tone = healthScore >= 70 ? 'emerald' : healthScore >= 45 ? 'amber' : 'red';
  const healthLabel = healthScore >= 70 ? 'Situation saine' : healthScore >= 45 ? 'Sous surveillance' : 'Risque élevé';

  // Alerts stratégiques
  const alerts: Array<{ id: string; title: string; detail: string; severity: 'critical' | 'high' | 'medium'; action?: React.ReactNode }> = [];
  if ((data.criticalFindingsCount ?? 0) > 0) alerts.push({ id: 's1', title: `${data.criticalFindingsCount ?? 0} constat(s) critique(s) confirmé(s)`, detail: 'Nécessitent une attention immédiate de la direction.', severity: 'critical', action: <Link to="/findings/critical" className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les constats</Link> });
  if ((data.recosOverdueCount ?? 0) > 0) alerts.push({ id: 's2', title: `${data.recosOverdueCount ?? 0} recommandation(s) en retard (${data.recosOverdueAvgDays ?? 0}j en moyenne)`, detail: 'Cibles dépassées — risque de non-conformité.', severity: 'critical', action: <Link to="/recommendations/overdue" className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les recommandations</Link> });
  if ((data.risksWithoutControls ?? 0) > 0) alerts.push({ id: 's3', title: `${data.risksWithoutControls ?? 0} risque(s) sans dispositif de contrôle`, detail: 'Lacunes de couverture dans le système de contrôle interne.', severity: 'critical' });
  if ((data.approvalsPending ?? 0) > 0) alerts.push({ id: 's4', title: `${data.approvalsPending ?? 0} approbation(s) en attente`, detail: 'Éléments bloquants dans les workflows de gouvernance.', severity: 'high' });
  if ((data.planExecution?.missionsLate ?? 0) > 0) alerts.push({ id: 's5', title: `${data.planExecution?.missionsLate ?? 0} mission(s) en dépassement d'échéance`, detail: "Retards dans l'exécution du plan d'audit annuel.", severity: 'high' });
  if ((data.procedureConformityRate ?? 0) < 70 && (data.proceduresTotal ?? 0) > 0) alerts.push({ id: 's6', title: `Taux de conformité procédures à ${data.procedureConformityRate ?? 0}%`, detail: 'Score de maturité du contrôle interne en dessous du seuil.', severity: 'medium' });

  // Health pie data
  const healthPieData = (data.healthFactors || []).map((f: any) => ({
    name: f.label,
    value: f.weight,
    score: f.score,
    color: f.status === 'good' ? '#059669' : f.status === 'warning' ? '#d97706' : '#dc2626',
  }));

  // ── Health gauge ring ──
  function HealthGaugeRing() {
    const c = 2 * Math.PI * 54;
    const offset = c - (healthScore / 100) * c;
    const sc = healthTone === 'emerald' ? '#059669' : healthTone === 'amber' ? '#d97706' : '#dc2626';
    return (
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-sm">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle cx="70" cy="70" r="54" fill="none" stroke={sc} strokeWidth="10" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 70 70)" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight" style={{ color: sc }}>{healthScore}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">/100</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">

        {/* ═══ LEVEL 1 — NORTH STAR + KPIs STRATÉGIQUES ═══ */}
        <section>
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/30 shadow-sm">
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    Direction Générale
                  </span>
                  {data.planExecution && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                      Plan {data.planExecution.year}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Tableau de bord stratégique</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Vision consolidée pour la direction : santé du dispositif d'audit, maîtrise des risques,
                    avancement du plan et indicateurs de gouvernance.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300">
                    <User2 className="h-3.5 w-3.5" />
                    {user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Direction Générale'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                {user?.permissions?.includes('audit_mission:create') && user?.permissions?.includes('audit_mission:intake') && (
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

          {/* Health Score + 4 KPIs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
            <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
              healthTone === 'emerald' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-800 dark:border-emerald-800' :
              healthTone === 'amber' ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-800 dark:border-amber-800' :
              'border-red-200 bg-gradient-to-br from-red-50 to-white dark:from-red-950/40 dark:to-slate-800 dark:border-red-800'
            }`}>
              <div className="flex flex-col items-center text-center">
                <HealthGaugeRing />
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Score de santé global</p>
                <p className={`mt-1 text-sm font-semibold ${
                  healthTone === 'emerald' ? 'text-emerald-700' : healthTone === 'amber' ? 'text-amber-700' : 'text-red-700'
                }`}>{healthLabel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KpiCard label="Exécution du plan" value={`${data.planExecution?.progress ?? 0}%`} hint={`${data.planExecution?.completedMissions ?? 0}/${data.planExecution?.totalMissions ?? 0} missions`} tone="blue" icon={Briefcase}
                action={<Link to="/plans" className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"><Eye className="h-3.5 w-3.5" />Consulter les plans</Link>}
              />
              <KpiCard label="Couverture entités auditées" value={`${data.coverageRate ?? 0}%`} hint={`${data.coveredEntitiesCount ?? 0}/${data.totalAuditableEntities ?? 0} entités`} tone="indigo" icon={Target}
                action={<Link to="/referential" className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les entités</Link>}
              />
              <KpiCard label="Constats critiques" value={String(data.criticalFindingsCount ?? 0)} hint="confirmés et ouverts" tone={data.criticalFindingsCount > 0 ? 'red' : 'emerald'} icon={AlertTriangle}
                action={<Link to="/findings/critical" className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"><Eye className="h-3.5 w-3.5" />Voir les constats</Link>}
              />
              <KpiCard label="Taux remédiation recommandations" value={`${data.avgImplementation ?? 0}%`} hint="remédiation globale" tone={data.avgImplementation >= 70 ? 'emerald' : 'amber'} icon={Gauge} />
            </div>
          </div>
        </section>

        {/* ═══ LEVEL 2 — SANTÉ + ALERTES ═══ */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_1fr]">
          <SectionCard title="Facteurs de santé" subtitle="Décomposition pondérée du score de santé global.">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.2fr]">
              {healthPieData.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={healthPieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                          {healthPieData.map((entry: any) => (<Cell key={entry.name} fill={entry.color} />))}
                        </Pie>
                        <Tooltip formatter={(val: any, name: any, props: any) => [`${props.payload.score}/100 (poids ${val})`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {(data.healthFactors || []).map((f: any) => {
                  const factorTone: Tone = f.status === 'good' ? 'emerald' : f.status === 'warning' ? 'amber' : 'red';
                  return (
                    <div key={f.label} className="rounded-xl border border-slate-200 dark:border-slate-600 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded-full px-3 py-1 text-sm font-bold', toneMap[factorTone].soft, toneMap[factorTone].text)}>{f.score}%</span>
                          <span className="text-[10px] text-slate-400">×{f.weight}</span>
                        </div>
                      </div>
                      <div className="mt-2"><ProgressBar value={f.score} tone={factorTone} showLabel={false} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Alertes stratégiques" subtitle="Points critiques nécessitant l'attention de la direction." className={alerts.some(a => a.severity === 'critical') ? 'border-red-200 dark:border-red-800' : ''}>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 dark:text-emerald-500 mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune alerte stratégique active.</p>
                </div>
              ) : alerts.map(alert => (
                <AlertCard key={alert.id} title={alert.title} detail={alert.detail} severity={alert.severity} action={alert.action} />
              ))}
            </div>
          </SectionCard>
        </section>

        {/* ═══ LEVEL 2 — PLAN + MISSIONS ═══ */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard title="Exécution du plan d'audit" subtitle="Avancement du plan annuel." className="xl:col-span-5"
            action={<Link to="/plans" className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-500 hover:shadow-sm transition-all dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 dark:hover:border-blue-500"><Briefcase className="h-4 w-4" />Voir tous les plans</Link>}>
            {data.planExecution ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Plan {data.planExecution.year}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.planExecution.completedMissions}/{data.planExecution.totalMissions}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">{data.planExecution.progress}% exécuté</span>
                  </div>
                  <div className="mt-4"><ProgressBar value={data.planExecution.progress} tone="blue" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricRow label="Missions en cours" value={`${data.planExecution.missionsInProgress}`} hint="exécution active" tone="blue" />
                  <MetricRow label="Missions en retard" value={`${data.planExecution.missionsLate}`} hint="échéance dépassée" tone={data.planExecution.missionsLate > 0 ? 'red' : 'emerald'} />
                  <MetricRow label="Délai clôture constats" value={`${data.avgFindingCloseDays ?? 0}j`} hint="moyenne création → clôture" tone="amber" />
                  <MetricRow label="Délai clôture recommandations" value={`${data.avgRecoCloseDays ?? 0}j`} hint="moyenne création → clôture" tone="blue" />
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">Aucun plan d'audit approuvé.</p>
            )}
          </SectionCard>

          <SectionCard title="Missions actives" subtitle="Missions en cours d'exécution." className="xl:col-span-7"
            action={<Link to="/missions" className="inline-flex items-center gap-1.5 rounded-xl border-2 border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-500 hover:shadow-sm transition-all dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 dark:hover:border-blue-500"><Eye className="h-4 w-4" />Voir toutes les missions</Link>}>
            {(data.activeMissions || []).length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <Briefcase className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">Aucune mission en cours.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(data.activeMissions || []).slice(0, 6).map((m: any) => (
                  <MissionCard key={m.id} mission={m} now={now} />
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        {/* ═══ LEVEL 2 — RISQUES + GOUVERNANCE ═══ */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard title="Risques & contrôle interne" subtitle="Couverture des risques, conformité des procédures et maturité du dispositif." className="xl:col-span-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40">
                      <Shield className="h-5 w-5 text-blue-700 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Conformité</p>
                      <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.procedureConformityRate ?? 0}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{data.proceduresOk ?? 0} OK sur {data.proceduresTotal ?? 0} testées</p>
                  <div className="mt-2"><ProgressBar value={data.procedureConformityRate ?? 0} tone={(data.procedureConformityRate ?? 0) >= 80 ? 'emerald' : (data.procedureConformityRate ?? 0) >= 50 ? 'amber' : 'red'} /></div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40">
                      <Target className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Couverture</p>
                      <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{data.coverageRate ?? 0}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{data.coveredEntitiesCount ?? 0} / {data.totalAuditableEntities ?? 0} entités</p>
                  <div className="mt-2"><ProgressBar value={data.coverageRate ?? 0} tone="emerald" /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricRow label="Risques actifs" value={`${data.risksActive ?? 0}`} hint="univers de risques suivi" tone="amber" />
                <MetricRow label="Risques sans contrôle" value={`${data.risksWithoutControls ?? 0}`} hint="lacunes de couverture" tone={(data.risksWithoutControls ?? 0) > 0 ? 'red' : 'emerald'} />
                <MetricRow label="Contrôles en place" value={`${data.totalControls ?? 0}`} hint="dispositif actif" tone="blue" />
                <MetricRow label="Taux résolution critiques" value={`${data.resolutionRate ?? 0}%`} hint={`${data.criticalRecommendationsClosed ?? 0} clôturées`} tone={(data.resolutionRate ?? 0) >= 70 ? 'emerald' : 'red'} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Remédiation & gouvernance" subtitle="État de la remédiation, top départements exposés et approbations." className="xl:col-span-7">
            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-3 gap-3">
                <MetricRow label="Recommandations ouvertes critiques" value={`${data.criticalRecommendationsOpen ?? 0}`} hint="non clôturées" tone="red" />
                <MetricRow label="Recommandations clôturées critiques" value={`${data.criticalRecommendationsClosed ?? 0}`} hint="résolues" tone="emerald" />
                <MetricRow label="Implémentation globale" value={`${data.avgImplementation ?? 0}%`} hint="toutes recommandations" tone={(data.avgImplementation ?? 0) >= 70 ? 'emerald' : 'amber'} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricRow label="Approbations en attente" value={`${data.approvalsPending ?? 0}`} hint="flux bloquants" tone="amber" />
                <MetricRow label="Approbations traitées" value={`${(data.approvalsApproved ?? 0) + (data.approvalsRejected ?? 0)}`} hint={`${data.approvalsApproved ?? 0} approuvées · ${data.approvalsRejected ?? 0} rejetées`} tone="emerald" />
              </div>

              {(data.topRiskDepartments || []).length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Top départements exposés</h4>
                    <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topRiskDepartments.map((d: any) => ({ name: d.department, value: d.count }))} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={120} />
                        <Tooltip />
                        <Bar dataKey="value" name="Recommandations critiques" radius={[0, 8, 8, 0]} fill="#dc2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </section>

        {/* ═══ LEVEL 3 — TENDANCE 12 MOIS ═══ */}
        <SectionCard title="Évolution des risques critiques (12 mois)" subtitle="Tendance mensuelle des constats critiques confirmés et recommandations ouvertes.">
          {(data.trend || []).length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="findings" name="Constats critiques" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="recosOpen" name="Recommandations ouvertes" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">Données de tendance indisponibles.</p>
          )}
        </SectionCard>

      </div>
    </div>
  );
}