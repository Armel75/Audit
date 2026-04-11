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
  CheckSquare,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FolderOpen,
  GitBranch,
  Gauge,
  LayoutGrid,
  Loader2,
  Network,
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

type Tone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red' | 'violet' | 'indigo' | 'rose';

const missionStatusColors: Record<string, string> = {
  PLANNED: '#cbd5e1', IN_PROGRESS: '#2563eb', REVIEW: '#7c3aed',
  COMPLETED: '#059669', OVERDUE: '#dc2626', CANCELLED: '#94a3b8',
};

const missionStatusLabels: Record<string, string> = {
  PLANNED: 'Planifiées', IN_PROGRESS: 'En cours', REVIEW: 'Revue',
  COMPLETED: 'Terminées', OVERDUE: 'En retard', CANCELLED: 'Annulées',
};

const statusLabelsMap: Record<string, string> = {
  PLANNED: 'Planifiée', IN_PROGRESS: 'En cours', REVIEW: 'Revue',
  COMPLETED: 'Terminée', OVERDUE: 'En retard', CANCELLED: 'Annulée',
  DRAFT: 'Brouillon', SUBMITTED: 'Soumis', CONFIRMED: 'Confirmé',
  VALIDATED: 'Validé', REJECTED: 'Rejeté', CLOSED: 'Clôturé',
  OPEN: 'Ouverte', IMPLEMENTED: 'Implémentée', PENDING: 'En attente',
  APPROVED: 'Approuvé', BLOCKED: 'Bloqué', RESOLVED: 'Résolu',
  UNDER_REVIEW: 'En revue', CRITICAL_OPEN: 'Critique', PENDING_VALIDATION: 'À valider',
  PENDING_APPROVAL: 'En attente d’approbation',
};

const statusBadgeStyles: Record<string, string> = {
  PLANNED: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  REVIEW: 'bg-violet-50 text-violet-700 border-violet-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  VALIDATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CRITICAL_OPEN: 'bg-red-50 text-red-700 border-red-200',
  CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING_VALIDATION: 'bg-violet-50 text-violet-700 border-violet-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  BLOCKED: 'bg-red-50 text-red-700 border-red-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IMPLEMENTED: 'bg-purple-50 text-purple-700 border-purple-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
};

const toneMap: Record<
  Tone,
  { soft: string; text: string; border: string; dot: string }
> = {
  slate: { soft: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' },
  blue: { soft: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  amber: { soft: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  red: { soft: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  violet: { soft: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  indigo: { soft: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  rose: { soft: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function SectionCard({
  title, subtitle, action, children, className,
}: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-900 sm:text-base">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function KpiCard({ label, value, hint, tone, icon: Icon }: {
  label: string; value: string; hint: string; tone: Tone; icon: React.ComponentType<{ className?: string }>;
}) {
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

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', statusBadgeStyles[value] || 'bg-slate-100 text-slate-700 border-slate-200')}>
      {statusLabelsMap[value] || value}
    </span>
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
      {showLabel ? <span className="w-10 text-right text-xs font-medium text-slate-600">{value}%</span> : null}
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
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API_BASE}/dashboard/main`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement du tableau de bord');
        return res.json();
      })
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
  const alerts: Array<{ id: string; title: string; detail: string; severity: 'critical' | 'high' | 'medium' }> = [];
  if (kpis.recosOverdue > 0) alerts.push({ id: 'a1', title: `${kpis.recosOverdue} recommandation(s) en retard`, detail: 'Cibles dépassées nécessitant une action immédiate.', severity: 'critical' });
  if (kpis.findingsCriticalOpen > 0) alerts.push({ id: 'a2', title: `${kpis.findingsCriticalOpen} constat(s) critique(s) ouvert(s)`, detail: 'Constats à risque élevé non clôturés.', severity: 'critical' });
  if (kpis.approvalsPending > 0) alerts.push({ id: 'a3', title: `${kpis.approvalsPending} approbation(s) en attente`, detail: 'Éléments bloquants dans les workflows de gouvernance.', severity: 'high' });
  if (riskControl?.risksWithoutControls > 0) alerts.push({ id: 'a4', title: `${riskControl.risksWithoutControls} risque(s) sans contrôle`, detail: 'Lacunes de couverture dans le dispositif de contrôle.', severity: 'critical' });
  if (planExecution?.missionsWithoutValidatedProgram > 0) alerts.push({ id: 'a5', title: `${planExecution.missionsWithoutValidatedProgram} mission(s) sans programme validé`, detail: 'Démarrage opérationnel sans cadre approuvé.', severity: 'medium' });
  if (unreadNotifications > 0) alerts.push({ id: 'a6', title: `${unreadNotifications} notification(s) non lue(s)`, detail: 'Dont possiblement des demandes d’approbation et échéances.', severity: 'medium' });

  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">
        {/* Header */}
        <header className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                  Audit command center
                </span>
                {planExecution && (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                    Plan {planExecution.year}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Tableau de bord audit</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Pilotage consolidé du plan, des missions, des constats, de la remédiation, des risques,
                  des approbations et des intégrations opérationnelles.
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <User2 className="h-3.5 w-3.5" />
                  {user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Responsable audit'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <Bell className="h-3.5 w-3.5" />
                  {unreadNotifications} notification(s) non lue(s)
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[420px]">
              {planExecution && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Version active</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{planExecution.title || `Plan ${planExecution.year}`} · v{planExecution.versionNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Couverture</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{planExecution.completedMissions} / {planExecution.totalMissions} missions terminées</p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Link to="/missions" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Voir les missions
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <KpiCard label="Missions actives" value={String(kpis.missionsActive).padStart(2, '0')} hint={`sur ${kpis.missionsTotal} missions au total`} tone="blue" icon={Briefcase} />
          <KpiCard label="Plans approuvés" value={String(kpis.plansApproved).padStart(2, '0')} hint={`sur ${kpis.plansTotal} plans au total`} tone="indigo" icon={LayoutGrid} />
          <KpiCard label="Constats ouverts" value={String(kpis.findingsOpen)} hint={`dont ${kpis.findingsCriticalOpen} critique(s)`} tone="amber" icon={AlertTriangle} />
          <KpiCard label="Recommandations en retard" value={String(kpis.recosOverdue)} hint={`sur ${kpis.recosOpen} recommandations ouvertes`} tone="red" icon={Clock3} />
          <KpiCard label="Approbations en attente" value={String(kpis.approvalsPending).padStart(2, '0')} hint="programmes, constats, plans" tone="violet" icon={ClipboardCheck} />
          <KpiCard label="Taux d’implémentation" value={`${kpis.avgImplementation}%`} hint="remédiation globale" tone="emerald" icon={Gauge} />
        </section>

        {/* Missions + Alerts */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.35fr_0.9fr]">
          <SectionCard
            title="Pilotage du plan et des missions"
            subtitle="Exécution du plan, répartition des statuts, supervision des chefs de mission et maîtrise des délais."
            action={<Link to="/missions" className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex">Détail missions</Link>}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {planExecution && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Progression plan {planExecution.year}</p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                          {planExecution.completedMissions}/{planExecution.totalMissions}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
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
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Répartition des missions par statut</h4>
                      <span className="text-xs text-slate-500">{kpis.missionsTotal} missions</span>
                    </div>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={missionPieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                            {missionPieData.map((entry: any) => (<Cell key={entry.name} fill={entry.color} />))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {missionPieData.map((item: any) => (
                        <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-600">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top missions table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[1.35fr_0.75fr_0.85fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  <span>Mission</span>
                  <span>Chef de mission</span>
                  <span>Échéance</span>
                  <span>Statut</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(topMissions || []).length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400 italic">Aucune mission active.</p>
                  ) : (topMissions || []).map((mission: any) => (
                    <div key={mission.id} className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[1.35fr_0.75fr_0.85fr_0.7fr]">
                      <div className="min-w-0">
                        {!mission.programValidated && (
                          <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 mb-2">
                            Programme non validé
                          </span>
                        )}
                        <p className="text-sm font-semibold leading-6 text-slate-900">{mission.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>#{mission.id}</span>
                          {mission.plan && <><span>•</span><span>{mission.plan}</span></>}
                        </div>
                      </div>
                      <div className="text-sm text-slate-700">{mission.leader || '—'}</div>
                      <div><p className="text-sm font-medium text-slate-900">{formatDate(mission.endDate)}</p></div>
                      <div><StatusBadge value={mission.status} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Alerts */}
          <SectionCard title="Alertes prioritaires" subtitle="Points critiques nécessitant une décision ou une remédiation immédiate." className={alerts.some(a => a.severity === 'critical') ? 'border-red-200' : ''}>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-8">Aucune alerte active.</p>
              ) : alerts.map((alert) => {
                const severityStyles = {
                  critical: 'border-red-200 bg-red-50 text-red-700',
                  high: 'border-amber-200 bg-amber-50 text-amber-700',
                  medium: 'border-blue-200 bg-blue-50 text-blue-700',
                } as const;
                return (
                  <div key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', severityStyles[alert.severity])}>
                        <Siren className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', severityStyles[alert.severity])}>
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
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
                        <Target className="h-5 w-5 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Couverture univers</p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">{performance.coverageRate}%</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{performance.coveredEntitiesCount} / {performance.totalAuditableEntities} entités auditées</p>
                    <div className="mt-2"><ProgressBar value={performance.coverageRate} tone="emerald" /></div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50">
                        <Shield className="h-5 w-5 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Conformité procédures</p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">{performance.procedureConformityRate}%</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{performance.proceduresOk} OK sur {performance.proceduresTotal} testées</p>
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
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Constats créés vs clôturés (6 mois)</h4>
                      <TrendingUp className="h-4 w-4 text-slate-400" />
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
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Charge par auditeur (missions actives)</h4>
                      <Users className="h-4 w-4 text-slate-400" />
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
              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Constats par niveau de risque</h4>
                  <span className="text-xs text-slate-500">{findingsSummary?.open ?? 0} constats</span>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={findingsByRisk}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#334155" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {(topFindings || []).map((finding: any) => (
                <div key={finding.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {finding.riskLevel && <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-700 border-amber-200">{finding.riskLevel}</span>}
                    <StatusBadge value={finding.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">{finding.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
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

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    <span>Recommandation</span>
                    <span>Responsable</span>
                    <span>Département</span>
                    <span>Statut</span>
                    <span>Suivi</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(topRecommendations || []).length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-400 italic">Aucune recommandation ouverte.</p>
                    ) : (topRecommendations || []).map((reco: any) => (
                      <div key={reco.id} className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr]">
                        <div className="min-w-0">
                          {reco.linkedTicket && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 mr-2">
                              {reco.linkedTicket}
                            </span>
                          )}
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{reco.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>#{reco.id}</span>
                            <span>•</span>
                            <span>Cible {formatDate(reco.targetDate)}</span>
                          </div>
                        </div>
                        <div className="text-sm text-slate-700">{reco.assignee || '—'}</div>
                        <div className="text-sm text-slate-700">{reco.department || '—'}</div>
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
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Recommandations par département</h4>
                    <span className="text-xs text-slate-500">charges de remédiation</span>
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recommendationsByDepartment} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={80} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#0f172a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </section>

        {/* Risk/Controls + Approvals + Tickets */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard title="Risques et contrôles" subtitle="Vue synthétique des risques actifs, contrôles et liens RiskControl." className="xl:col-span-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Risques actifs" value={`${riskControl?.activeRisks ?? 0}`} hint="univers suivi" tone="amber" />
              <MetricRow label="Risques sans contrôles" value={`${riskControl?.risksWithoutControls ?? 0}`} hint="lacunes de couverture" tone="red" />
              <MetricRow label="Contrôles" value={`${riskControl?.totalControls ?? 0}`} hint="dispositif de contrôle" tone="blue" />
              <MetricRow label="Liens Risk-Control" value={`${riskControl?.totalRiskControlLinks ?? 0}`} hint="couverture des risques" tone="emerald" />
            </div>
          </SectionCard>

          <SectionCard title="Approbations / gouvernance" subtitle="Workflow de validation, niveaux d’approbation et décisions récentes." className="xl:col-span-4">
            <div className="mb-4 grid grid-cols-3 gap-3">
              <MetricRow label="En attente" value={`${approvalsSummary?.pending ?? 0}`} hint="flux bloquants" tone="amber" />
              <MetricRow label="Approuvées" value={`${approvalsSummary?.approved ?? 0}`} hint="validées" tone="emerald" />
              <MetricRow label="Rejetées" value={`${approvalsSummary?.rejected ?? 0}`} hint="révision requise" tone="red" />
            </div>
            <div className="space-y-3">
              {(recentApprovals || []).map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={item.decision} />
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      Niveau {item.level}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {item.type}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">{item.item}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div>
                      <p className="font-medium text-slate-600">Demandé par</p>
                      <p className="mt-1">{item.requestedBy || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-600">Approbateur</p>
                      <p className="mt-1">{item.approver || 'Non assigné'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span>Request</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={cn(item.level >= 1 && 'font-semibold text-slate-900')}>Level 1</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={cn(item.level >= 2 && 'font-semibold text-slate-900')}>Level 2</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>Final</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Tickets GLPI / intégration" subtitle="Suivi des tickets liés aux recommandations et synchronisations récentes." className="xl:col-span-4">
            <div className="mb-4 grid grid-cols-3 gap-3">
              <MetricRow label="Ouverts" value={`${tickets?.open ?? 0}`} hint="à traiter" tone="blue" />
              <MetricRow label="Bloqués" value={`${tickets?.blocked ?? 0}`} hint="dépendances" tone="red" />
              <MetricRow label="Résolus" value={`${tickets?.resolved ?? 0}`} hint="synchronisés" tone="emerald" />
            </div>
            <div className="space-y-3">
              {(recentTickets || []).map((ticket: any) => (
                <div key={ticket.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{ticket.ticketNumber || `#${ticket.id}`}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">{ticket.title || '—'}</p>
                    </div>
                    {ticket.status && <StatusBadge value={ticket.status} />}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div>
                      <p className="font-medium text-slate-600">Assigné à</p>
                      <p className="mt-1">{ticket.assignee || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-600">Reco liée</p>
                      <p className="mt-1">{ticket.recommendation || '—'}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Créé le</span>
                    <span className="font-medium text-slate-700">{timeAgo(ticket.createdAt)}</span>
                  </div>
                </div>
              ))}
              {(recentTickets || []).length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Aucun ticket lié.</p>}
            </div>
          </SectionCard>
        </section>

        {/* Documents + Activity */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard title="Documents / preuves" subtitle="Volume documentaire et preuves sensibles." className="xl:col-span-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Documents" value={`${documents?.totalDocuments ?? 0}`} hint="toutes catégories" tone="slate" />
              <MetricRow label="Preuves collectées" value={`${documents?.totalEvidence ?? 0}`} hint="mission, constat, reco" tone="blue" />
              <MetricRow label="Éléments sensibles" value={`${documents?.sensitiveEvidence ?? 0}`} hint="chaîne de conservation" tone="red" />
            </div>
          </SectionCard>

          <SectionCard title="Activité récente" subtitle="Audit logs, changements de statut, validations et notifications système." className="xl:col-span-8">
            <div className="space-y-3">
              {(recentActivity || []).length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-8">Aucune activité récente.</p>
              ) : (recentActivity || []).map((activity: any) => {
                const t = toneMap['slate'];
                return (
                  <div key={activity.id} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className={cn('mt-0.5 h-10 w-10 shrink-0 rounded-xl border', t.soft, t.border)}>
                      <div className="flex h-full w-full items-center justify-center">
                        <span className={cn('h-2.5 w-2.5 rounded-full', t.dot)} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-slate-700">
                        <span className="font-semibold text-slate-900">{activity.actor}</span> {activity.action}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {activity.entity && <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">{activity.entity}</span>}
                        <span>•</span>
                        <span>{timeAgo(activity.time)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Link to="/missions" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <div className="flex items-center justify-between">
              <Briefcase className="h-5 w-5 text-slate-700" />
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">Ouvrir les missions</p>
            <p className="mt-1 text-sm text-slate-500">Planification, exécution, équipes et scopes.</p>
          </Link>

          <Link to="/approvals" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <div className="flex items-center justify-between">
              <CheckSquare className="h-5 w-5 text-slate-700" />
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">Approbations</p>
            <p className="mt-1 text-sm text-slate-500">{kpis.approvalsPending} élément(s) en attente de validation.</p>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FolderOpen className="h-5 w-5 text-slate-700" />
            <p className="mt-4 text-sm font-semibold text-slate-900">Preuves sensibles</p>
            <p className="mt-1 text-sm text-slate-500">{documents?.sensitiveEvidence ?? 0} élément(s) avec exigences renforcées.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FileCheck2 className="h-5 w-5 text-slate-700" />
            <p className="mt-4 text-sm font-semibold text-slate-900">Traçabilité audit log</p>
            <p className="mt-1 text-sm text-slate-500">Tous les changements majeurs sont historisés et horodatés.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
