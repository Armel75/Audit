import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import DashboardExportButtons from '../components/dashboard/DashboardExportButtons';
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Layers,
  Loader2,
  Siren,
  ShieldCheck,
  Target,
  User2,
  Workflow,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  KpiCard,
  ProgressBar,
  SectionCard,
  PeriodFilter,
  cn,
  toneMap,
} from '../components/dashboard';
import type { Tone, PeriodFilterValue } from '../components/dashboard';

const BAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0ea5e9', '#db2777', '#4f46e5', '#64748b', '#f59e0b'];

function coverageTone(rate: number): Tone {
  return rate >= 70 ? 'emerald' : rate >= 40 ? 'amber' : 'red';
}

const STATUS_FR: Record<string, string> = {
  PLANNED: 'Planifiée', READY: 'Prête', IN_PROGRESS: 'En cours', UNDER_REVIEW: 'En revue',
  REVIEW: 'Revue', APPROVED: 'Approuvée', CLOSED: 'Clôturé', COMPLETED: 'Terminée',
  CANCELLED: 'Annulée', VALIDATED: 'Validé', DRAFT: 'Brouillon', SUBMITTED: 'Soumis',
  CONFIRMED: 'Confirmé', REJECTED: 'Rejeté', OPEN: 'Ouverte', IMPLEMENTED: 'Implémentée',
  PENDING: 'En attente', BLOCKED: 'Bloqué', RESOLVED: 'Résolu', PENDING_VALIDATION: 'À valider',
  PENDING_APPROVAL: 'En attente d’approbation',
};

export default function PilotageAudit() {
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
    apiFetch(`${API_BASE}/dashboard/pilotage?${params.toString()}`)
      .then(res => { if (!res.ok) throw new Error('Erreur lors du chargement'); return res.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [period]);

  const coverageItems = useMemo(() => {
    const c = data?.coverage;
    if (!c) return [];
    return [
      { key: 'entities', label: 'Entités auditées', tone: 'indigo' as Tone, ...c.entities },
      { key: 'processes', label: 'Processus métiers', tone: 'violet' as Tone, ...c.processes },
      { key: 'controls', label: 'Contrôles testés', tone: 'blue' as Tone, ...c.controls },
      { key: 'risks', label: 'Risques couverts', tone: 'emerald' as Tone, ...c.risks },
    ];
  }, [data]);

  const gapAlerts = useMemo(() => {
    const g = data?.gaps;
    if (!g) return [];
    const list: Array<{ id: string; icon: React.ReactNode; title: string; detail: string; severity: 'critical' | 'high' | 'medium' }> = [];
    if ((g.processesWithoutControls ?? 0) > 0) list.push({ id: 'g1', icon: <Workflow className="h-4 w-4" />, title: `${g.processesWithoutControls} processus métier(s) sans dispositif de contrôle`, detail: 'Processus actifs sans contrôle rattaché — risque de défaillance non maîtrisé.', severity: 'high' });
    if ((g.untestedControls ?? 0) > 0) list.push({ id: 'g2', icon: <ClipboardList className="h-4 w-4" />, title: `${g.untestedControls} contrôle(s) jamais testé(s)`, detail: 'Contrôles sans procédure d’audit réalisée (aucun résultat renseigné).', severity: 'critical' });
    if ((g.highCriticalityUncoveredEntities?.length ?? 0) > 0) list.push({ id: 'g3', icon: <Building2 className="h-4 w-4" />, title: `${g.highCriticalityUncoveredEntities.length} entité(s) à forte criticalité non couverte(s)`, detail: g.highCriticalityUncoveredEntities.map((e: any) => e.name).join(' · '), severity: 'critical' });
    if ((g.highRiskUncoveredRisks?.length ?? 0) > 0) list.push({ id: 'g4', icon: <Siren className="h-4 w-4" />, title: `${g.highRiskUncoveredRisks.length} risque(s) élevé(s) non couvert(s) par le plan`, detail: g.highRiskUncoveredRisks.map((r: any) => r.name).join(' · '), severity: 'high' });
    return list;
  }, [data]);

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

  const k = data.kpis || {};
  const c = data.coverage || {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">

        {/* ═══ NIVEAU 1 — EN-TÊTE + FILTRE ═══ */}
        <section>
          <header className="mb-6 rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/30 shadow-sm">
            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
                    Pilotage du référentiel
                  </span>
                  {k.validatedPlanYear && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      Plan validé {k.validatedPlanYear}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Pilotage du référentiel & couverture d'audit</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Vue stratégique de l'univers d'audit : types, entités auditées, processus métiers, contrôles et risques.
                    Mesure de la couverture par plan et détection des zones à risque non couvertes.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300">
                    <User2 className="h-3.5 w-3.5" />
                    {user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Utilisateur'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 font-medium text-slate-700 dark:text-slate-300">
                    <CalendarRange className="h-3.5 w-3.5" />
                    {now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                <PeriodFilter value={period} onChange={setPeriod} />
                <DashboardExportButtons target="pilotage" period={period} />
              </div>
            </div>
          </header>

          {/* KPIs référentiel */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label="Types d'audit" value={String(k.auditTypes ?? 0)} hint="actifs dans le référentiel" tone="indigo" icon={Layers} />
            <KpiCard label="Entités auditées" value={String(k.auditedEntities ?? 0)} hint="actives dans l'univers d'audit" tone="blue" icon={Building2} />
            <KpiCard label="Processus métiers" value={String(k.businessProcesses ?? 0)} hint="actifs dans le référentiel" tone="violet" icon={Workflow} />
            <KpiCard label="Contrôles" value={String(k.controls ?? 0)} hint="référentiel de contrôle interne" tone="emerald" icon={ShieldCheck} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label="Risques" value={String(k.risks ?? 0)} hint="risques actifs identifiés" tone="amber" icon={Gauge} />
            <KpiCard label="Risques sans contrôle" value={String(k.risksWithoutControls ?? 0)} hint="maîtrise du contrôle interne" tone={k.risksWithoutControls > 0 ? 'red' : 'emerald'} icon={Siren} />
            <KpiCard label="Missions actives" value={String(k.activeMissions ?? 0)} hint="en cours ou en revue" tone="blue" icon={ClipboardList} />
            <KpiCard label="Couverture entités" value={`${c.entities?.rate ?? 0}%`} hint={k.validatedPlanYear ? `plan ${k.validatedPlanYear}` : 'aucun plan validé'} tone={coverageTone(c.entities?.rate ?? 0)} icon={Target} />
          </div>
        </section>

        {/* ═══ NIVEAU 2 — COUVERTURE + TROUS ═══ */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.2fr_1fr]">
          <SectionCard title="Matrice de couverture" subtitle="Part de l'univers d'audit couverte par le plan validé et les scopes de mission / programme.">
            <div className="space-y-5">
              {coverageItems.map((item) => (
                <div key={item.key} className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', toneMap[item.tone as Tone].soft, toneMap[item.tone as Tone].text)}>
                      {item.rate}%
                    </span>
                  </div>
                  <ProgressBar value={item.rate} tone={item.tone as Tone} size="md" showLabel={false} />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.covered}/{item.total} couvert(s)</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Détection des trous" subtitle="Zones de l'univers d'audit à risque non couvertes et à prioriser dans le plan.">
            {gapAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Aucun trou détecté</p>
                <p className="text-xs text-slate-500">Le référentiel est bien couvert.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gapAlerts.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      'rounded-xl border p-4 flex items-start gap-3',
                      a.severity === 'critical'
                        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                        : a.severity === 'high'
                          ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
                    )}
                  >
                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      a.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/60' : a.severity === 'high' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/60' : 'bg-slate-100 text-slate-600')}>
                      {a.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{a.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        {/* ═══ NIVEAU 3 — RÉPARTITIONS ═══ */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <SectionCard title="Constats par type d'audit" subtitle="Répartition des constats par typologie d'audit (plan courant).">
            {data.byAuditType?.length ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
                  <BarChart data={data.byAuditType} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="findings" name="Constats" radius={[0, 8, 8, 0]}>
                      {data.byAuditType.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucun constat rattaché à un type d'audit" />
            )}
          </SectionCard>

          <SectionCard title="Constats par processus métier" subtitle="Top des processus les plus exposés (plan courant).">
            {data.byProcess?.length ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
                  <BarChart data={data.byProcess} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="findings" name="Constats" radius={[0, 8, 8, 0]}>
                      {data.byProcess.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[(i + 1) % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Aucune donnée disponible" />
            )}
          </SectionCard>
        </section>

        {/* ═══ NIVEAU 4 — TOP ENTITÉS + STATUTS ═══ */}
        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_1fr]">
          <SectionCard title="Entités auditées par nombre de constats" subtitle="Top des entités les plus exposées dans le plan courant.">
            {data.byEntity?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3 font-semibold">Entité</th>
                      <th className="py-2 pr-3 font-semibold">Criticalité</th>
                      <th className="py-2 text-right font-semibold">Constats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byEntity.map((e: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white">{e.name}</td>
                        <td className="py-2.5 pr-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            e.criticality === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            : e.criticality === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                            {e.criticality || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">{e.findings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyChart label="Aucune entité avec constat" />
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Répartition par statut — Constats">
              <StatusRows items={data.statusBreakdown?.findings} empty="Aucun constat" />
            </SectionCard>
            <SectionCard title="Répartition par statut — Recommandations">
              <StatusRows items={data.statusBreakdown?.recommendations} empty="Aucune recommandation" />
            </SectionCard>
            <SectionCard title="Répartition par type — Contrôles">
              <StatusRows items={data.statusBreakdown?.controlsByType} empty="Aucun contrôle" labelKey="type" />
            </SectionCard>
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">{label}</div>
  );
}

function StatusRows({ items, empty, labelKey = 'status' }: { items?: Array<{ status: string; count: number }>; empty: string; labelKey?: string }) {
  if (!items?.length) {
    return <div className="py-6 text-center text-sm text-slate-400">{empty}</div>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((s: any, i: number) => {
        const key = (s as any)[labelKey] ?? s.status;
        const label = statusFRLabel(key, labelKey === 'type');
        return (
          <div key={`${key}-${i}`} className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
              <span className="w-8 text-right text-sm font-semibold text-slate-900 dark:text-white">{s.count}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function statusFRLabel(key: string, isType: boolean): string {
  if (isType) return key || 'Autre';
  return STATUS_FR[key] || key;
}
