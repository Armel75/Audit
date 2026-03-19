import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  FileCheck2,
  FileText,
  FolderOpen,
  GitBranch,
  Gauge,
  LayoutGrid,
  Network,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TriangleAlert,
  User2,
  Waypoints,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Tone =
  | 'slate'
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'red'
  | 'violet'
  | 'indigo'
  | 'rose';

type MissionStatus = 'PLANNED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'OVERDUE';
type FindingStatus = 'DRAFT' | 'UNDER_REVIEW' | 'VALIDATED' | 'CRITICAL_OPEN' | 'CLOSED';
type RecommendationStatus = 'OPEN' | 'IN_PROGRESS' | 'OVERDUE' | 'PENDING_VALIDATION' | 'CLOSED';
type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED';
type TicketStatus = 'OPEN' | 'BLOCKED' | 'RESOLVED';
type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
type Risk = 'Low' | 'Moderate' | 'High' | 'Critical';

type Kpi = {
  label: string;
  value: string;
  hint: string;
  delta?: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
};

type Mission = {
  id: string;
  title: string;
  plan: string;
  department: string;
  leader: string;
  due: string;
  status: MissionStatus;
  progress: number;
  priority: Priority;
  programValidated: boolean;
};

type Finding = {
  id: string;
  title: string;
  mission: string;
  process: string;
  owner: string;
  risk: Risk;
  status: FindingStatus;
  ageDays: number;
};

type Recommendation = {
  id: string;
  title: string;
  department: string;
  assignee: string;
  targetDate: string;
  progress: number;
  status: RecommendationStatus;
  priority: Priority;
  linkedTicket: string;
};

type ApprovalItem = {
  id: string;
  item: string;
  type: string;
  level: number;
  requestedBy: string;
  approver: string;
  date: string;
  decision: ApprovalDecision;
};

type TicketItem = {
  id: string;
  number: string;
  title: string;
  assignee: string;
  syncAt: string;
  status: TicketStatus;
  recommendation: string;
};

type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  time: string;
  tone: Tone;
};

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  severity: 'critical' | 'high' | 'medium';
};

const toneMap: Record<
  Tone,
  {
    soft: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  slate: {
    soft: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
  },
  blue: {
    soft: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  amber: {
    soft: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  emerald: {
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  red: {
    soft: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  violet: {
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
  indigo: {
    soft: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  rose: {
    soft: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

const kpis: Kpi[] = [
  {
    label: 'Missions actives',
    value: '12',
    hint: 'sur 18 missions du plan 2026',
    delta: '+2 ce mois',
    tone: 'blue',
    icon: Briefcase,
  },
  {
    label: 'Plans en exécution',
    value: '03',
    hint: '2 approuvés, 1 en révision',
    delta: 'v2026.4 active',
    tone: 'indigo',
    icon: LayoutGrid,
  },
  {
    label: 'Findings ouverts',
    value: '47',
    hint: 'dont 9 critiques',
    delta: '+5 cette semaine',
    tone: 'amber',
    icon: AlertTriangle,
  },
  {
    label: 'Recommandations en retard',
    value: '14',
    hint: 'sur 63 recommandations ouvertes',
    delta: '4 > 30 jours',
    tone: 'red',
    icon: Clock3,
  },
  {
    label: 'Approbations en attente',
    value: '08',
    hint: 'programmes, constats, plans',
    delta: '3 niveau 2',
    tone: 'violet',
    icon: ClipboardCheck,
  },
  {
    label: 'Taux moyen d’implémentation',
    value: '71%',
    hint: 'remédiation globale',
    delta: '+6 pts / trimestre',
    tone: 'emerald',
    icon: Gauge,
  },
];

const planExecution = {
  year: 2026,
  progress: 68,
  executedMissions: 18,
  totalMissions: 26,
  approvedPrograms: 14,
  pendingPrograms: 4,
  overdueProcedures: 11,
  missionsWithoutValidatedProgram: 3,
};

const missionStatusData = [
  { name: 'Planifiées', value: 5, color: '#cbd5e1' },
  { name: 'En cours', value: 7, color: '#2563eb' },
  { name: 'Revue', value: 3, color: '#7c3aed' },
  { name: 'Terminées', value: 8, color: '#059669' },
  { name: 'En retard', value: 3, color: '#dc2626' },
];

const findingsByRisk = [
  { name: 'Faible', value: 7 },
  { name: 'Modéré', value: 14 },
  { name: 'Élevé', value: 17 },
  { name: 'Critique', value: 9 },
];

const recommendationsByDepartment = [
  { name: 'Finance', value: 11 },
  { name: 'IT', value: 16 },
  { name: 'Achats', value: 8 },
  { name: 'RH', value: 6 },
  { name: 'Opérations', value: 13 },
];

const missions: Mission[] = [
  {
    id: 'MIS-2026-014',
    title: 'Audit cybersécurité des accès privilégiés',
    plan: 'Plan 2026',
    department: 'IT',
    leader: 'Nadine Ekani',
    due: '28 mars 2026',
    status: 'IN_PROGRESS',
    progress: 76,
    priority: 'Critical',
    programValidated: true,
  },
  {
    id: 'MIS-2026-009',
    title: 'Audit caisse et rapprochements bancaires',
    plan: 'Plan 2026',
    department: 'Finance',
    leader: 'Armel Ndzi',
    due: '24 mars 2026',
    status: 'OVERDUE',
    progress: 83,
    priority: 'High',
    programValidated: true,
  },
  {
    id: 'MIS-2026-017',
    title: 'Audit gestion fournisseurs stratégiques',
    plan: 'Plan 2026',
    department: 'Achats',
    leader: 'Ruth Meka',
    due: '02 avril 2026',
    status: 'REVIEW',
    progress: 91,
    priority: 'High',
    programValidated: true,
  },
  {
    id: 'MIS-2026-021',
    title: 'Audit continuité d’activité datacenter',
    plan: 'Plan 2026',
    department: 'IT',
    leader: 'Blaise Nono',
    due: '06 avril 2026',
    status: 'PLANNED',
    progress: 22,
    priority: 'Critical',
    programValidated: false,
  },
  {
    id: 'MIS-2026-018',
    title: 'Audit paie et habilitations RH',
    plan: 'Plan 2026',
    department: 'RH',
    leader: 'Amina Bell',
    due: '31 mars 2026',
    status: 'IN_PROGRESS',
    progress: 58,
    priority: 'Medium',
    programValidated: false,
  },
];

const findings: Finding[] = [
  {
    id: 'FND-447',
    title: 'Absence de revue périodique des comptes à privilèges',
    mission: 'Cybersécurité des accès privilégiés',
    process: 'Identity & Access Management',
    owner: 'IT Security',
    risk: 'Critical',
    status: 'CRITICAL_OPEN',
    ageDays: 18,
  },
  {
    id: 'FND-438',
    title: 'Rapprochements bancaires non validés à date',
    mission: 'Caisse et rapprochements bancaires',
    process: 'Trésorerie',
    owner: 'Finance',
    risk: 'High',
    status: 'VALIDATED',
    ageDays: 11,
  },
  {
    id: 'FND-431',
    title: 'Échantillonnage fournisseurs incomplet',
    mission: 'Gestion fournisseurs stratégiques',
    process: 'Procure-to-Pay',
    owner: 'Achats',
    risk: 'Moderate',
    status: 'UNDER_REVIEW',
    ageDays: 7,
  },
  {
    id: 'FND-425',
    title: 'Traçabilité insuffisante des changements d’accès RH',
    mission: 'Paie et habilitations RH',
    process: 'HR Access Control',
    owner: 'RH',
    risk: 'High',
    status: 'DRAFT',
    ageDays: 5,
  },
];

const recommendations: Recommendation[] = [
  {
    id: 'REC-903',
    title: 'Mettre en place une revue mensuelle des comptes à privilèges',
    department: 'IT',
    assignee: 'Kevin Mballa',
    targetDate: '22 mars 2026',
    progress: 45,
    status: 'OVERDUE',
    priority: 'Critical',
    linkedTicket: 'GLPI-18429',
  },
  {
    id: 'REC-894',
    title: 'Automatiser la validation des rapprochements avant clôture',
    department: 'Finance',
    assignee: 'Sarah Eyenga',
    targetDate: '30 mars 2026',
    progress: 72,
    status: 'IN_PROGRESS',
    priority: 'High',
    linkedTicket: 'GLPI-18371',
  },
  {
    id: 'REC-888',
    title: 'Formaliser un contrôle compensatoire sur les fournisseurs sensibles',
    department: 'Achats',
    assignee: 'Jules Tchoua',
    targetDate: '09 avril 2026',
    progress: 20,
    status: 'OPEN',
    priority: 'High',
    linkedTicket: 'GLPI-18109',
  },
  {
    id: 'REC-875',
    title: 'Valider la procédure de retrait des droits après mobilité interne',
    department: 'RH',
    assignee: 'Mireille Simo',
    targetDate: '25 mars 2026',
    progress: 100,
    status: 'PENDING_VALIDATION',
    priority: 'Medium',
    linkedTicket: 'GLPI-18022',
  },
];

const approvals: ApprovalItem[] = [
  {
    id: 'APR-220',
    item: 'Programme v2 — Audit cybersécurité des accès privilégiés',
    type: 'AuditProgram',
    level: 2,
    requestedBy: 'Nadine Ekani',
    approver: 'Directeur Audit',
    date: '18 mars 2026',
    decision: 'PENDING',
  },
  {
    id: 'APR-214',
    item: 'Finding FND-438 — Rapprochements bancaires',
    type: 'Finding',
    level: 1,
    requestedBy: 'Armel Ndzi',
    approver: 'Manager Finance',
    date: '17 mars 2026',
    decision: 'APPROVED',
  },
  {
    id: 'APR-208',
    item: 'Version 4 — Plan d’audit 2026',
    type: 'AuditPlan',
    level: 3,
    requestedBy: 'Head of Internal Audit',
    approver: 'Comité d’audit',
    date: '15 mars 2026',
    decision: 'REJECTED',
  },
  {
    id: 'APR-226',
    item: 'Recommandation REC-875 — Retrait des droits RH',
    type: 'Recommendation',
    level: 1,
    requestedBy: 'Mireille Simo',
    approver: 'Head of HR',
    date: '19 mars 2026',
    decision: 'PENDING',
  },
];

const tickets: TicketItem[] = [
  {
    id: 'TCK-1',
    number: 'GLPI-18429',
    title: 'Revue mensuelle des comptes à privilèges',
    assignee: 'Admin IAM',
    syncAt: 'Il y a 18 min',
    status: 'BLOCKED',
    recommendation: 'REC-903',
  },
  {
    id: 'TCK-2',
    number: 'GLPI-18371',
    title: 'Workflow de validation des rapprochements',
    assignee: 'Core Banking Team',
    syncAt: 'Il y a 42 min',
    status: 'OPEN',
    recommendation: 'REC-894',
  },
  {
    id: 'TCK-3',
    number: 'GLPI-18109',
    title: 'Contrôle compensatoire fournisseurs sensibles',
    assignee: 'Procurement Ops',
    syncAt: 'Il y a 1 h',
    status: 'OPEN',
    recommendation: 'REC-888',
  },
  {
    id: 'TCK-4',
    number: 'GLPI-18022',
    title: 'Retrait automatique des droits après mobilité',
    assignee: 'HRIS Support',
    syncAt: 'Il y a 3 h',
    status: 'RESOLVED',
    recommendation: 'REC-875',
  },
];

const activities: ActivityItem[] = [
  {
    id: 'LOG-9012',
    actor: 'Nadine Ekani',
    action: 'a soumis un programme pour approbation',
    entity: 'AuditProgram · MIS-2026-014',
    time: '09:14',
    tone: 'violet',
  },
  {
    id: 'LOG-9008',
    actor: 'Kevin Mballa',
    action: 'a mis à jour le suivi de remédiation à 45%',
    entity: 'Recommendation · REC-903',
    time: '08:46',
    tone: 'amber',
  },
  {
    id: 'LOG-9004',
    actor: 'Sarah Eyenga',
    action: 'a uploadé une preuve complémentaire',
    entity: 'Evidence · EVD-411',
    time: '08:21',
    tone: 'blue',
  },
  {
    id: 'LOG-8998',
    actor: 'Directeur Audit',
    action: 'a rejeté une version du plan',
    entity: 'AuditPlanVersion · v4',
    time: 'Hier, 18:12',
    tone: 'red',
  },
  {
    id: 'LOG-8991',
    actor: 'Système GLPI',
    action: 'a synchronisé 7 tickets liés aux recommandations',
    entity: 'RecommendationTicket',
    time: 'Hier, 16:47',
    tone: 'emerald',
  },
  {
    id: 'LOG-8986',
    actor: 'Mireille Simo',
    action: 'a demandé validation d’implémentation',
    entity: 'Recommendation · REC-875',
    time: 'Hier, 15:20',
    tone: 'indigo',
  },
];

const alerts: AlertItem[] = [
  {
    id: 'ALT-1',
    title: '14 recommandations en retard',
    detail: '4 dépassent la cible de plus de 30 jours et 3 sont liées à des findings critiques.',
    severity: 'critical',
  },
  {
    id: 'ALT-2',
    title: '11 procédures d’audit hors délai',
    detail: 'Les missions MIS-2026-009 et MIS-2026-018 concentrent 73% du retard.',
    severity: 'high',
  },
  {
    id: 'ALT-3',
    title: '9 findings critiques non traités',
    detail: '2 n’ont pas encore de recommandation validée associée.',
    severity: 'critical',
  },
  {
    id: 'ALT-4',
    title: '8 approbations en attente',
    detail: '3 dossiers sont bloqués au niveau 2 depuis plus de 5 jours.',
    severity: 'high',
  },
  {
    id: 'ALT-5',
    title: '6 risques sans contrôle',
    detail: 'Principalement sur Identity & Access Management et Procurement.',
    severity: 'critical',
  },
  {
    id: 'ALT-6',
    title: '3 missions sans programme validé',
    detail: 'Le démarrage opérationnel est engagé alors que le cadre n’est pas encore approuvé.',
    severity: 'medium',
  },
  {
    id: 'ALT-7',
    title: '12 notifications importantes non lues',
    detail: 'Dont 5 liées à des demandes d’approbation et 4 à des échéances de remédiation.',
    severity: 'medium',
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
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

function KpiCard({ item }: { item: Kpi }) {
  const tone = toneMap[item.tone];
  const Icon = item.icon;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl border', tone.soft, tone.border)}>
          <Icon className={cn('h-5 w-5', tone.text)} />
        </div>
        {item.delta ? (
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', tone.soft, tone.text)}>
            {item.delta}
          </span>
        ) : null}
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-semibold tracking-tight text-slate-950">{item.value}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{item.hint}</p>
      </div>
    </div>
  );
}

function StatusBadge({ value }: { value: MissionStatus | FindingStatus | RecommendationStatus | ApprovalDecision | TicketStatus }) {
  const styles: Record<string, string> = {
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
  };

  const labels: Record<string, string> = {
    PLANNED: 'Planifiée',
    IN_PROGRESS: 'En cours',
    REVIEW: 'Revue',
    COMPLETED: 'Terminée',
    OVERDUE: 'En retard',
    DRAFT: 'Draft',
    UNDER_REVIEW: 'En revue',
    VALIDATED: 'Validé',
    CRITICAL_OPEN: 'Critique',
    CLOSED: 'Clôturé',
    OPEN: 'Ouverte',
    PENDING_VALIDATION: 'À valider',
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
    BLOCKED: 'Bloqué',
    RESOLVED: 'Résolu',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', styles[value])}>
      {labels[value]}
    </span>
  );
}

function PriorityBadge({ value }: { value: Priority }) {
  const styles: Record<Priority, string> = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Critical: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', styles[value])}>
      {value}
    </span>
  );
}

function RiskBadge({ value }: { value: Risk }) {
  const styles: Record<Risk, string> = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Moderate: 'bg-blue-50 text-blue-700 border-blue-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Critical: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', styles[value])}>
      {value}
    </span>
  );
}

function ProgressBar({
  value,
  tone = 'blue',
  showLabel = true,
}: {
  value: number;
  tone?: Tone;
  showLabel?: boolean;
}) {
  const barColor: Record<Tone, string> = {
    slate: 'bg-slate-500',
    blue: 'bg-blue-600',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-600',
    red: 'bg-red-600',
    violet: 'bg-violet-600',
    indigo: 'bg-indigo-600',
    rose: 'bg-rose-600',
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full', barColor[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {showLabel ? <span className="w-10 text-right text-xs font-medium text-slate-600">{value}%</span> : null}
    </div>
  );
}

function MetricRow({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
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

  const unreadNotifications = 12;
  const documentStats = {
    totalDocuments: 286,
    totalEvidence: 174,
    sensitiveEvidence: 19,
    missingEvidence: 7,
    generatedDocs: 42,
    evidenceCoverage: 83,
  };

  const riskControlStats = {
    activeRisks: 28,
    risksWithoutControls: 6,
    keyControls: 19,
    controlCoverage: 79,
    weakLinks: 5,
    strongLinks: 21,
  };

  const findingsSummary = {
    open: 47,
    critical: 9,
    pendingValidation: 6,
    recent: 12,
  };

  const recommendationSummary = {
    open: 63,
    overdue: 14,
    averageProgress: 71,
    dueNext7Days: 9,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600">
                  Audit command center
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  Période · T1 2026
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    Tableau de bord audit
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Pilotage consolidé du plan, des missions, des constats, de la remédiation, des risques,
                    des approbations et des intégrations opérationnelles.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <User2 className="h-3.5 w-3.5" />
                  {user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Responsable audit'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <CalendarRange className="h-3.5 w-3.5" />
                  19 mars 2026
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  <Bell className="h-3.5 w-3.5" />
                  {unreadNotifications} notifications importantes non lues
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[420px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Version active</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Plan d’audit 2026 · v4</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Couverture</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">18 / 26 missions exécutées</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
                  Nouveau plan
                </button>
                <Link
                  to="/missions"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Voir les missions
                </Link>
                <button className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Exporter le reporting
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {['Tenant · Groupe CamerAudit', 'Entité · Corporate', 'Type · Tous audits', 'Vue · Exécutive'].map((item) => (
                  <button
                    key={item}
                    className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span className="truncate">{item}</span>
                    <ChevronRight className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((item) => (
            <KpiCard key={item.label} item={item} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.35fr_0.9fr]">
          <SectionCard
            title="Pilotage du plan et des missions"
            subtitle="Exécution du plan, répartition des statuts, supervision des chefs de mission et maîtrise des délais."
            action={
              <Link
                to="/missions"
                className="hidden rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex"
              >
                Détail missions
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Progression plan {planExecution.year}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                        {planExecution.executedMissions}/{planExecution.totalMissions}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {planExecution.progress}% exécuté
                    </span>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={planExecution.progress} tone="blue" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricRow
                      label="Programmes approuvés"
                      value={`${planExecution.approvedPrograms}`}
                      hint="cadre méthodologique validé"
                      tone="emerald"
                    />
                    <MetricRow
                      label="Programmes en attente"
                      value={`${planExecution.pendingPrograms}`}
                      hint="soumis ou en révision"
                      tone="amber"
                    />
                    <MetricRow
                      label="Procédures en retard"
                      value={`${planExecution.overdueProcedures}`}
                      hint="impacte l’avancement terrain"
                      tone="red"
                    />
                    <MetricRow
                      label="Missions sans programme validé"
                      value={`${planExecution.missionsWithoutValidatedProgram}`}
                      hint="alerte de gouvernance"
                      tone="violet"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">Répartition des missions par statut</h4>
                    <span className="text-xs text-slate-500">26 missions</span>
                  </div>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={missionStatusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                          {missionStatusData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {missionStatusData.map((item) => (
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
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[1.35fr_0.75fr_0.85fr_0.7fr_0.75fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  <span>Mission prioritaire</span>
                  <span>Chef de mission</span>
                  <span>Échéance</span>
                  <span>Statut</span>
                  <span>Avancement</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {missions.map((mission) => (
                    <div
                      key={mission.id}
                      className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[1.35fr_0.75fr_0.85fr_0.7fr_0.75fr]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge value={mission.priority} />
                          {!mission.programValidated ? (
                            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                              Programme non validé
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{mission.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{mission.id}</span>
                          <span>•</span>
                          <span>{mission.department}</span>
                          <span>•</span>
                          <span>{mission.plan}</span>
                        </div>
                      </div>

                      <div className="text-sm text-slate-700">{mission.leader}</div>

                      <div>
                        <p className="text-sm font-medium text-slate-900">{mission.due}</p>
                        <p className="mt-1 text-xs text-slate-500">échéance proche</p>
                      </div>

                      <div>
                        <StatusBadge value={mission.status} />
                      </div>

                      <div className="space-y-2">
                        <ProgressBar value={mission.progress} tone={mission.status === 'OVERDUE' ? 'red' : 'blue'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Alertes prioritaires"
            subtitle="Points critiques nécessitant une décision, une validation ou une remédiation immédiate."
            className="border-red-200"
          >
            <div className="space-y-3">
              {alerts.map((alert) => {
                const severityStyles = {
                  critical: 'border-red-200 bg-red-50 text-red-700',
                  high: 'border-amber-200 bg-amber-50 text-amber-700',
                  medium: 'border-blue-200 bg-blue-50 text-blue-700',
                } as const;

                return (
                  <div key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                          severityStyles[alert.severity]
                        )}
                      >
                        <Siren className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', severityStyles[alert.severity])}>
                            {alert.severity === 'critical'
                              ? 'Critique'
                              : alert.severity === 'high'
                              ? 'Élevée'
                              : 'Surveillance'}
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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard
            title="Findings / constats"
            subtitle="Vue consolidée des constats ouverts, critiques, récents et en attente de validation."
            className="xl:col-span-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Findings ouverts" value={`${findingsSummary.open}`} hint="backlog actif" tone="amber" />
              <MetricRow label="Findings critiques" value={`${findingsSummary.critical}`} hint="traitement prioritaire" tone="red" />
              <MetricRow
                label="En attente de validation"
                value={`${findingsSummary.pendingValidation}`}
                hint="workflow de revue"
                tone="violet"
              />
              <MetricRow label="Constats récents (7j)" value={`${findingsSummary.recent}`} hint="activité récente" tone="blue" />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Findings par niveau de risque</h4>
                <span className="text-xs text-slate-500">47 findings</span>
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

            <div className="mt-5 space-y-3">
              {findings.map((finding) => (
                <div key={finding.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge value={finding.risk} />
                    <StatusBadge value={finding.status} />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">{finding.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{finding.id}</span>
                    <span>•</span>
                    <span>{finding.mission}</span>
                    <span>•</span>
                    <span>{finding.process}</span>
                    <span>•</span>
                    <span>{finding.owner}</span>
                    <span>•</span>
                    <span>{finding.ageDays} j</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Recommandations / remédiation"
            subtitle="Suivi des recommandations ouvertes, échues, prioritaires et par département."
            className="xl:col-span-7"
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1fr]">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricRow
                    label="Recommandations ouvertes"
                    value={`${recommendationSummary.open}`}
                    hint="hors clôturées"
                    tone="blue"
                  />
                  <MetricRow
                    label="Recommandations échues"
                    value={`${recommendationSummary.overdue}`}
                    hint="cibles dépassées"
                    tone="red"
                  />
                  <MetricRow
                    label="Progression moyenne"
                    value={`${recommendationSummary.averageProgress}%`}
                    hint="suivi d’implémentation"
                    tone="emerald"
                  />
                  <MetricRow
                    label="Prochaines échéances (7j)"
                    value={`${recommendationSummary.dueNext7Days}`}
                    hint="à surveiller"
                    tone="amber"
                  />
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                    <span>Recommandation prioritaire</span>
                    <span>Responsable</span>
                    <span>Département</span>
                    <span>Statut</span>
                    <span>Suivi</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {recommendations.map((reco) => (
                      <div key={reco.id} className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr_0.7fr]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <PriorityBadge value={reco.priority} />
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              {reco.linkedTicket}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{reco.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{reco.id}</span>
                            <span>•</span>
                            <span>Cible {reco.targetDate}</span>
                          </div>
                        </div>

                        <div className="text-sm text-slate-700">{reco.assignee}</div>
                        <div className="text-sm text-slate-700">{reco.department}</div>
                        <div>
                          <StatusBadge value={reco.status} />
                        </div>
                        <div>
                          <ProgressBar
                            value={reco.progress}
                            tone={reco.status === 'OVERDUE' ? 'red' : reco.progress >= 70 ? 'emerald' : 'blue'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

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
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        width={80}
                      />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#0f172a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard
            title="Risques et contrôles"
            subtitle="Vue synthétique des risques actifs, contrôles clés et liens RiskControl."
            className="xl:col-span-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Risques actifs" value={`${riskControlStats.activeRisks}`} hint="univers suivi" tone="amber" />
              <MetricRow
                label="Risques sans contrôles"
                value={`${riskControlStats.risksWithoutControls}`}
                hint="lacunes de couverture"
                tone="red"
              />
              <MetricRow label="Contrôles clés" value={`${riskControlStats.keyControls}`} hint="topologie prioritaire" tone="blue" />
              <MetricRow
                label="Couverture des contrôles"
                value={`${riskControlStats.controlCoverage}%`}
                hint="risques couverts"
                tone="emerald"
              />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-900">Liens RiskControl</span>
                  </div>
                  <span className="text-xs text-slate-500">26 liens</span>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Liens robustes</span>
                      <span className="font-semibold text-slate-900">{riskControlStats.strongLinks}</span>
                    </div>
                    <ProgressBar value={81} tone="emerald" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Liens fragiles / à revoir</span>
                      <span className="font-semibold text-slate-900">{riskControlStats.weakLinks}</span>
                    </div>
                    <ProgressBar value={19} tone="red" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Risque sans contrôle — IAM</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Revues d’accès privilégiés, séparation des tâches et révocation post-mobilité restent insuffisamment couvertes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Contrôle clé — Clôture financière</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Contrôle automatisé de rapprochement avant clôture mensuelle, efficacité design validée, operating effectiveness en cours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Approbations / gouvernance"
            subtitle="Workflow de validation visible, niveaux d’approbation et décisions récentes."
            className="xl:col-span-4"
          >
            <div className="mb-4 grid grid-cols-3 gap-3">
              <MetricRow label="Pending" value="8" hint="flux bloquants" tone="amber" />
              <MetricRow label="Approved" value="21" hint="période en cours" tone="emerald" />
              <MetricRow label="Rejected" value="3" hint="révision requise" tone="red" />
            </div>

            <div className="space-y-3">
              {approvals.map((item) => (
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
                      <p className="mt-1">{item.requestedBy}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-600">Approver</p>
                      <p className="mt-1">{item.approver}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span>Request</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={cn(item.level >= 2 && 'font-semibold text-slate-900')}>Level 1</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={cn(item.level >= 3 && 'font-semibold text-slate-900')}>Level 2</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span>Final</span>
                  </div>

                  <p className="mt-3 text-xs text-slate-500">{item.date}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Tickets GLPI / intégration"
            subtitle="Suivi des tickets liés aux recommandations et synchronisations récentes."
            className="xl:col-span-4"
          >
            <div className="mb-4 grid grid-cols-3 gap-3">
              <MetricRow label="Open" value="9" hint="à traiter" tone="blue" />
              <MetricRow label="Blocked" value="3" hint="dépendances" tone="red" />
              <MetricRow label="Resolved" value="11" hint="synchronisés" tone="emerald" />
            </div>

            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{ticket.number}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">{ticket.title}</p>
                    </div>
                    <StatusBadge value={ticket.status} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div>
                      <p className="font-medium text-slate-600">Assigné à</p>
                      <p className="mt-1">{ticket.assignee}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-600">Reco liée</p>
                      <p className="mt-1">{ticket.recommendation}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Dernière synchro</span>
                    <span className="font-medium text-slate-700">{ticket.syncAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard
            title="Documents / preuves"
            subtitle="Volume documentaire, éléments sensibles et preuves manquantes ou attendues."
            className="xl:col-span-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Documents" value={`${documentStats.totalDocuments}`} hint="toutes catégories" tone="slate" />
              <MetricRow label="Preuves collectées" value={`${documentStats.totalEvidence}`} hint="mission, finding, reco" tone="blue" />
              <MetricRow
                label="Éléments sensibles"
                value={`${documentStats.sensitiveEvidence}`}
                hint="chaîne de conservation"
                tone="red"
              />
              <MetricRow
                label="Preuves manquantes"
                value={`${documentStats.missingEvidence}`}
                hint="attendues / non fournies"
                tone="amber"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Couverture documentaire</h4>
                <span className="text-xs font-medium text-slate-600">{documentStats.evidenceCoverage}%</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={documentStats.evidenceCoverage} tone="emerald" />
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                <p className="text-sm leading-6 text-amber-900">
                  3 procédures attendent encore des preuves de test, dont 2 sur la mission cybersécurité.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Activité récente"
            subtitle="Audit logs, changements de statut, validations, uploads et notifications système."
            className="xl:col-span-8"
          >
            <div className="space-y-3">
              {activities.map((activity) => {
                const tone = toneMap[activity.tone];
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className={cn('mt-0.5 h-10 w-10 shrink-0 rounded-xl border', tone.soft, tone.border)}>
                      <div className="flex h-full w-full items-center justify-center">
                        <span className={cn('h-2.5 w-2.5 rounded-full', tone.dot)} />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-slate-700">
                        <span className="font-semibold text-slate-900">{activity.actor}</span> {activity.action}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">{activity.entity}</span>
                        <span>•</span>
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Link
            to="/missions"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-center justify-between">
              <Briefcase className="h-5 w-5 text-slate-700" />
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">Ouvrir les missions</p>
            <p className="mt-1 text-sm text-slate-500">Planification, exécution, équipes et scopes.</p>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <CheckSquare className="h-5 w-5 text-slate-700" />
            <p className="mt-4 text-sm font-semibold text-slate-900">Approvals watchlist</p>
            <p className="mt-1 text-sm text-slate-500">8 éléments bloquants dans les workflows de gouvernance.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <FolderOpen className="h-5 w-5 text-slate-700" />
            <p className="mt-4 text-sm font-semibold text-slate-900">Preuves sensibles</p>
            <p className="mt-1 text-sm text-slate-500">19 éléments avec exigences renforcées de conservation.</p>
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