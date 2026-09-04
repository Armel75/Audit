export type Tone = 'slate' | 'blue' | 'amber' | 'emerald' | 'red' | 'violet' | 'indigo' | 'rose';

export const toneMap: Record<Tone, { soft: string; text: string; border: string; dot: string }> = {
  slate:   { soft: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   dot: 'bg-slate-500' },
  blue:    { soft: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  amber:   { soft: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  emerald: { soft: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  red:     { soft: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500' },
  violet:  { soft: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  dot: 'bg-violet-500' },
  indigo:  { soft: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500' },
  rose:    { soft: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export const missionStatusColors: Record<string, string> = {
  PLANNED: '#cbd5e1', IN_PROGRESS: '#2563eb', REVIEW: '#7c3aed',
  COMPLETED: '#059669', OVERDUE: '#dc2626', CANCELLED: '#94a3b8',
  READY: '#0ea5e9', UNDER_REVIEW: '#f59e0b',
};

export const missionStatusLabels: Record<string, string> = {
  PLANNED: 'Planifiées', IN_PROGRESS: 'En cours', REVIEW: 'Revue',
  COMPLETED: 'Terminées', OVERDUE: 'En retard', CANCELLED: 'Annulées',
  READY: 'Prêtes', UNDER_REVIEW: 'En revue',
  APPROVED: 'Approuvées', CLOSED: 'Clôturées',
};

export const statusLabelsMap: Record<string, string> = {
  PLANNED: 'Planifiée', IN_PROGRESS: 'En cours', REVIEW: 'Revue',
  COMPLETED: 'Terminée', OVERDUE: 'En retard', CANCELLED: 'Annulée',
  DRAFT: 'Brouillon', SUBMITTED: 'Soumis', CONFIRMED: 'Confirmé',
  VALIDATED: 'Validé', REJECTED: 'Rejeté', CLOSED: 'Clôturé',
  OPEN: 'Ouverte', IMPLEMENTED: 'Implémentée', PENDING: 'En attente',
  APPROVED: 'Approuvé', BLOCKED: 'Bloqué', RESOLVED: 'Résolu',
  READY: 'Prête', UNDER_REVIEW: 'En revue', CRITICAL_OPEN: 'Critique', PENDING_VALIDATION: 'À valider',
  PENDING_APPROVAL: 'En attente d’approbation',
};

export const statusBadgeStyles: Record<string, string> = {
  PLANNED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  REVIEW: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  READY: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  VALIDATED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  CRITICAL_OPEN: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  CLOSED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  PENDING_VALIDATION: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  REJECTED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  BLOCKED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  IMPLEMENTED: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
};
