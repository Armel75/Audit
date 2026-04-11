import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  Shield,
  Siren,
  Target,
  TrendingUp,
  User2,
  Users,
  XCircle,
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

/* ─── Design helpers (same system as Dashboard.tsx) ─── */

type Tone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red' | 'violet' | 'indigo' | 'rose';

const toneMap: Record<Tone, { soft: string; text: string; border: string; dot: string }> = {
  slate:   { soft: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   dot: 'bg-slate-500' },
  blue:    { soft: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  amber:   { soft: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  red:     { soft: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500' },
  violet:  { soft: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500' },
  indigo:  { soft: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500' },
  rose:    { soft: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
};

function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(' '); }

function SectionCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-900 sm:text-base">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function KpiCard({ label, value, hint, tone, icon: Icon }: { label: string; value: string; hint: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }) {
  const t = toneMap[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', t.soft, t.border)}>
          <Icon className={cn('h-5 w-5', t.text)} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-semibold tracking-tight text-slate-950">{value}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function MetricRow({ label, value, hint, tone = 'slate' }: { label: string; value: string; hint?: string; tone?: Tone }) {
  const t = toneMap[tone];
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-600">{label}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', t.soft, t.text)}>{value}</span>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function ProgressBar({ value, tone = 'blue', showLabel = true }: { value: number; tone?: Tone; showLabel?: boolean }) {
  const barColor: Record<Tone, string> = {
    slate: 'bg-slate-500', blue: 'bg-blue-600', amber: 'bg-amber-500', emerald: 'bg-emerald-600',
    red: 'bg-red-600', violet: 'bg-violet-600', indigo: 'bg-indigo-600', rose: 'bg-rose-600',
  };
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', barColor[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {showLabel && <span className="w-10 text-right text-xs font-medium text-slate-600">{value}%</span>}
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const statusLabels: Record<string, string> = {
  IN_PROGRESS: 'En cours', REVIEW: 'Revue', COMPLETED: 'Terminée', PLANNED: 'Planifiée',
};

const missionStatusColors: Record<string, string> = {
  PLANNED: '#cbd5e1', IN_PROGRESS: '#2563eb', REVIEW: '#7c3aed', COMPLETED: '#059669',
};

/* ─── Component ─── */

export default function DashboardDG() {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/dashboard/dg`)
      .then(res => { if (!res.ok) throw new Error('Erreur lors du chargement'); return res.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
          <p className="text-sm text-red-700">{error || 'Erreur inconnue'}</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const healthScore: number = data.healthScore ?? 0;
  const healthTone: Tone = healthScore >= 70 ? 'emerald' : healthScore >= 45 ? 'amber' : 'red';
  const healthLabel = healthScore >= 70 ? 'Situation saine' : healthScore >= 45 ? 'Sous surveillance' : 'Risque élevé';

  // Alerts stratégiques
  const alerts: Array<{ id: string; title: string; detail: string; severity: 'critical' | 'high' | 'medium' }> = [];
  if ((data.criticalFindingsCount ?? 0) > 0) alerts.push({ id: 's1', title: `${data.criticalFindingsCount ?? 0} constat(s) critique(s) confirmé(s)`, detail: 'Nécessitent une attention immédiate de la direction.', severity: 'critical' });
  if ((data.recosOverdueCount ?? 0) > 0) alerts.push({ id: 's2', title: `${data.recosOverdueCount ?? 0} recommandation(s) en retard (${data.recosOverdueAvgDays ?? 0}j en moyenne)`, detail: 'Cibles dépassées — risque de non-conformité.', severity: 'critical' });
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">

        {/* ── Header executive ── */}
        <header className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                  Direction Générale
                </span>
                {data.planExecution && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                    Plan {data.planExecution.year}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Tableau de bord stratégique</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Vision consolidée pour la direction : santé du dispositif d'audit, maîtrise des risques,
                  avancement du plan et indicateurs de gouvernance.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <User2 className="h-3.5 w-3.5" />
                  {user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Direction Générale'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Health score */}
            <div className="flex flex-col items-center gap-3 lg:min-w-[280px]">
              <div className={cn('rounded-2xl border p-6 text-center w-full', toneMap[healthTone].soft, toneMap[healthTone].border)}>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Score de santé global</p>
                <p className={cn('mt-2 text-5xl font-bold tracking-tight', toneMap[healthTone].text)}>{healthScore}</p>
                <p className="mt-1 text-xs text-slate-500">/ 100</p>
                <div className="mt-3"><ProgressBar value={healthScore} tone={healthTone} /></div>
                <p className={cn('mt-3 text-sm font-semibold', toneMap[healthTone].text)}>{healthLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ── KPIs stratégiques ── */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard label="Exécution du plan" value={`${data.planExecution?.progress ?? 0}%`} hint={`${data.planExecution?.completedMissions ?? 0}/${data.planExecution?.totalMissions ?? 0} missions terminées`} tone="blue" icon={Briefcase} />
          <KpiCard label="Couverture univers" value={`${data.coverageRate ?? 0}%`} hint={`${data.coveredEntitiesCount ?? 0}/${data.totalAuditableEntities ?? 0} entités auditées`} tone="indigo" icon={Target} />
          <KpiCard label="Constats critiques" value={String(data.criticalFindingsCount ?? 0)} hint="confirmés et ouverts" tone="red" icon={AlertTriangle} />
          <KpiCard label="Taux d'implémentation" value={`${data.avgImplementation ?? 0}%`} hint="remédiation globale" tone="emerald" icon={Gauge} />
          <KpiCard label="Recos en retard" value={String(data.recosOverdueCount ?? 0)} hint={`${data.recosOverdueAvgDays ?? 0}j de retard moyen`} tone="amber" icon={Clock3} />
          <KpiCard label="Approbations bloquées" value={String(data.approvalsPending ?? 0).padStart(2, '0')} hint="workflows en attente" tone="violet" icon={Bell} />
        </section>

        {/* ── Santé détaillée + Alertes ── */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_1fr]">
          <SectionCard title="Facteurs de santé" subtitle="Décomposition pondérée du score de santé global du dispositif d'audit.">
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
                    <div key={f.label} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700">{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', toneMap[factorTone].soft, toneMap[factorTone].text)}>{f.score}%</span>
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

          <SectionCard title="Alertes stratégiques" subtitle="Points critiques nécessitant l'attention de la direction." className={alerts.some(a => a.severity === 'critical') ? 'border-red-200' : ''}>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
                  <p className="text-sm text-slate-500 italic">Aucune alerte stratégique active.</p>
                </div>
              ) : alerts.map(alert => {
                const sev = { critical: 'border-red-200 bg-red-50 text-red-700', high: 'border-amber-200 bg-amber-50 text-amber-700', medium: 'border-blue-200 bg-blue-50 text-blue-700' } as const;
                return (
                  <div key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', sev[alert.severity])}>
                        <Siren className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', sev[alert.severity])}>
                            {alert.severity === 'critical' ? 'Critique' : alert.severity === 'high' ? 'Élevée' : 'Surveillance'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{alert.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </section>

        {/* ── Plan d'audit + Missions actives ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard title="Exécution du plan d'audit" subtitle="Avancement du plan annuel, missions en cours et respect des échéances." className="xl:col-span-5">
            {data.planExecution ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Plan {data.planExecution.year}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{data.planExecution.completedMissions}/{data.planExecution.totalMissions}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{data.planExecution.progress}% exécuté</span>
                  </div>
                  <div className="mt-4"><ProgressBar value={data.planExecution.progress} tone="blue" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricRow label="Missions en cours" value={`${data.planExecution.missionsInProgress}`} hint="exécution active" tone="blue" />
                  <MetricRow label="Missions en retard" value={`${data.planExecution.missionsLate}`} hint="échéance dépassée" tone={data.planExecution.missionsLate > 0 ? 'red' : 'emerald'} />
                  <MetricRow label="Délai clôture constats" value={`${data.avgFindingCloseDays ?? 0}j`} hint="moyenne création → clôture" tone="amber" />
                  <MetricRow label="Délai clôture recos" value={`${data.avgRecoCloseDays ?? 0}j`} hint="moyenne création → clôture" tone="blue" />
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400 italic">Aucun plan d'audit approuvé.</p>
            )}
          </SectionCard>

          <SectionCard title="Missions actives" subtitle="Missions en cours d'exécution avec leur avancement." className="xl:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.7fr_0.6fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                <span>Mission</span><span>Chef de mission</span><span>Échéance</span><span>Avancement</span><span>Statut</span>
              </div>
              <div className="divide-y divide-slate-100">
                {(data.activeMissions || []).length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400 italic">Aucune mission en cours.</p>
                ) : (data.activeMissions || []).map((m: any) => (
                  <div key={m.id} className="grid grid-cols-[1.4fr_0.8fr_0.6fr_0.7fr_0.6fr] items-center gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-6 text-slate-900 truncate">{m.title}</p>
                      <p className="text-xs text-slate-500">#{m.id}</p>
                    </div>
                    <div className="text-sm text-slate-700">{m.leader || '—'}</div>
                    <div className={cn('text-sm font-medium', m.endDate && new Date(m.endDate) < now ? 'text-red-600' : 'text-slate-900')}>
                      {formatDate(m.endDate)}
                    </div>
                    <div><ProgressBar value={m.progress} tone={m.progress >= 70 ? 'emerald' : m.progress >= 40 ? 'blue' : 'amber'} /></div>
                    <div>
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium',
                        m.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200',
                      )}>
                        {statusLabels[m.status] || m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </section>

        {/* ── Risques & contrôle interne + Gouvernance ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard title="Risques & contrôle interne" subtitle="Couverture des risques, conformité des procédures et maturité du dispositif." className="xl:col-span-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50">
                      <Shield className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Conformité</p>
                      <p className="text-2xl font-semibold tracking-tight text-slate-950">{data.procedureConformityRate ?? 0}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{data.proceduresOk ?? 0} OK sur {data.proceduresTotal ?? 0} testées</p>
                  <div className="mt-2"><ProgressBar value={data.procedureConformityRate ?? 0} tone={(data.procedureConformityRate ?? 0) >= 80 ? 'emerald' : (data.procedureConformityRate ?? 0) >= 50 ? 'amber' : 'red'} /></div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
                      <Target className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Couverture</p>
                      <p className="text-2xl font-semibold tracking-tight text-slate-950">{data.coverageRate ?? 0}%</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{data.coveredEntitiesCount ?? 0} / {data.totalAuditableEntities ?? 0} entités</p>
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
                <MetricRow label="Recos ouvertes critiques" value={`${data.criticalRecommendationsOpen ?? 0}`} hint="non clôturées" tone="red" />
                <MetricRow label="Recos clôturées critiques" value={`${data.criticalRecommendationsClosed ?? 0}`} hint="résolues" tone="emerald" />
                <MetricRow label="Implémentation globale" value={`${data.avgImplementation ?? 0}%`} hint="toutes recommandations" tone={(data.avgImplementation ?? 0) >= 70 ? 'emerald' : 'amber'} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricRow label="Approbations en attente" value={`${data.approvalsPending ?? 0}`} hint="flux bloquants" tone="amber" />
                <MetricRow label="Approbations traitées" value={`${(data.approvalsApproved ?? 0) + (data.approvalsRejected ?? 0)}`} hint={`${data.approvalsApproved ?? 0} approuvées · ${data.approvalsRejected ?? 0} rejetées`} tone="emerald" />
              </div>

              {(data.topRiskDepartments || []).length > 0 && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Top départements exposés</h4>
                    <Users className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topRiskDepartments.map((d: any) => ({ name: d.department, value: d.count }))} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={120} />
                        <Tooltip />
                        <Bar dataKey="value" name="Recos critiques" radius={[0, 8, 8, 0]} fill="#dc2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </section>

        {/* ── Tendance 12 mois ── */}
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
                  <Line type="monotone" dataKey="recosOpen" name="Recos ouvertes" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400 italic">Données de tendance indisponibles.</p>
          )}
        </SectionCard>

      </div>
    </div>
  );
}