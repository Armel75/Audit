import { useState } from 'react';
import { CheckCircle2, ChevronRight, Clock3, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { getMissionStatusMeta } from '../../utils/status';

type MissionPreparationHistory = {
  id: number;
  fromPhase: string | null;
  toPhase: string;
  reason: string | null;
  actionType: string | null;
  changedAt: string;
  changedBy: { id: number; firstName: string; lastName: string } | null;
};

type MissionPreparation = {
  phase?: 'INTAKE' | 'ENRICHMENT' | 'REVIEW' | string;
  intakeCompletedAt?: string | null;
  enrichmentCompletedAt?: string | null;
  reviewCompletedAt?: string | null;
  readyAt?: string | null;
  history?: MissionPreparationHistory[];
} | null | undefined;

type MissionLike = {
  id: number;
  status: string;
  title?: string;
  description?: string;
  objective?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  scopeDescription?: string | null;
  methodology?: string | null;
  plan?: { id?: number; year: number; title: string | null } | null;
  auditType?: { name: string } | null;
  leader?: { id?: number; firstName: string; lastName: string } | null;
  members?: Array<{ id: number; assignmentStatus?: string; roleInMission?: string }> | null;
  scopes?: Array<{ id: number; status?: string }> | null;
  programs?: Array<{ id: number; status: string }> | null;
  preparation?: MissionPreparation;
};

interface MissionPreparationPanelProps {
  mission: MissionLike;
  onUpdated: () => void;
}

const phaseMeta: Record<string, { label: string; color: string; accent: string }> = {
  INTAKE: {
    label: 'Saisie',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    accent: 'bg-slate-900',
  },
  ENRICHMENT: {
    label: 'Enrichissement information',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    accent: 'bg-blue-600',
  },
  REVIEW: {
    label: 'Revue information',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    accent: 'bg-violet-600',
  },
};

function fieldTone(ok: boolean) {
  return ok
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
    : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400';
}

export default function MissionPreparationPanel({ mission, onUpdated }: MissionPreparationPanelProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [loadingAction, setLoadingAction] = useState<'phase' | 'finalize' | null>(null);

  // 🔒 Permissions RBAC
  const userPermissions = (user?.permissions ?? []).map((p: string) => p.toLowerCase());
  const canIntake = userPermissions.includes('audit_mission:intake');
  const canTransmit = userPermissions.includes('audit_mission:transmit_preparation');
  const canEnrich = userPermissions.includes('audit_mission:enrich');
  const canReview = userPermissions.includes('audit_mission:review_preparation');
  const canFinalize = userPermissions.includes('audit_mission:finalize_preparation');
  const canTransition = canIntake || canEnrich || canReview;

  const preparation = mission.preparation;
  const currentPhase = preparation?.phase || 'INTAKE';
  const phaseIndex = ['INTAKE', 'ENRICHMENT', 'REVIEW'].indexOf(currentPhase);
  const locked = mission.status !== 'PLANNED';

  const intakeOk = !!mission.title?.trim() && !!mission.description?.trim() && !!mission.objective?.trim() && !!mission.startDate && !!mission.endDate;
  const enrichmentOk = !!mission.scopeDescription?.trim() && !!mission.methodology?.trim() && !!mission.plan?.id && !!mission.auditType && !!mission.leader?.id;
  const readyGateOk = !!mission.plan?.id
    && !!mission.leader?.id
    && !!mission.auditType
    && !!mission.scopeDescription?.trim()
    && !!mission.methodology?.trim();

  const phaseCards = [
    { key: 'INTAKE', title: '1. Saisie', done: intakeOk, detail: 'Titre, description, objectif, dates' },
    { key: 'ENRICHMENT', title: '2. Enrichissement information', done: enrichmentOk, detail: 'Périmètre, plan, type, méthodologie, chef de mission' },
    { key: 'REVIEW', title: '3. Revue information', done: readyGateOk, detail: 'Validation finale avant publication' },
  ];

  const patchPhase = async (nextPhase: 'INTAKE' | 'ENRICHMENT' | 'REVIEW') => {
    if (loadingAction) return;
    if (nextPhase === 'ENRICHMENT' && !confirm('Transmettre cette mission au chef du service audit ?')) return;
    setLoadingAction('phase');
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/missions/${mission.id}/preparation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: nextPhase, reason: reason || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Erreur lors de la transmission');
        return;
      }

      setReason('');
      onUpdated();
    } catch (error) {
      alert('Erreur réseau lors de la transmission');
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const finalize = async () => {
    if (loadingAction) return;
    if (!confirm('Publier cette mission ? Le Chef de mission pourra alors démarrer l\'exécution.')) return;
    setLoadingAction('finalize');
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/missions/${mission.id}/preparation/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la publication de la mission');
      }

      setReason('');
      onUpdated();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Erreur lors de la publication de la mission');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            Préparation de mission
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
            {phaseMeta[currentPhase]?.label || currentPhase}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Le workflow principal reste <span className="font-medium">Planifiée → Prête</span>. Cette carte pilote uniquement la préparation interne{locked ? ' et est désormais verrouillée.' : '.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${phaseMeta[currentPhase]?.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            Phase {phaseIndex + 1}/3
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
            Mission {getMissionStatusMeta(mission.status).label}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {phaseCards.map((phase, index) => (
          <div
            key={phase.key}
            className={`rounded-2xl border p-4 transition-all ${
              currentPhase === phase.key
                ? 'border-blue-300 bg-blue-50/60 shadow-sm dark:border-blue-700 dark:bg-blue-950/20'
                : phase.done
                  ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{phase.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{phase.detail}</p>
              </div>
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                phase.done ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' :
                currentPhase === phase.key ? 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                'border-slate-200 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
              }`}>
                {index + 1}
              </span>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div className={`h-full rounded-full ${phase.done ? 'bg-emerald-500' : currentPhase === phase.key ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-500'}`} style={{ width: phase.done || currentPhase === phase.key ? '100%' : '28%' }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Vérifications
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <span className={`inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-medium ${fieldTone(intakeOk)}`}>
              <span>Saisie complète</span>
              {intakeOk ? 'Oui' : 'À compléter'}
            </span>
            <span className={`inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-medium ${fieldTone(enrichmentOk)}`}>
              <span>Enrichissement information complet</span>
              {enrichmentOk ? 'Oui' : 'À compléter'}
            </span>
            <span className={`inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-medium ${fieldTone(readyGateOk)}`}>
              <span>Prêt pour lancement</span>
              {readyGateOk ? 'Oui' : 'Bloqué'}
            </span>
            <span className="inline-flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span>Propriétaire métier</span>
              {mission.leader ? `${mission.leader.firstName} ${mission.leader.lastName}` : 'Non assigné'}
            </span>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Commentaire de transition
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Pourquoi cette transition ?"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-950"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Actions de phase</div>
            {preparation?.readyAt && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Publiée
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {!locked && currentPhase === 'INTAKE' && canTransmit && (
              <button
                type="button"
                onClick={() => patchPhase('ENRICHMENT')}
                disabled={!intakeOk || loadingAction !== null}
                title="Valider la saisie et envoyer la mission au service audit pour enrichissement"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950"
              >
                {loadingAction === 'phase' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Transmettre au service audit
              </button>
            )}

            {!locked && currentPhase === 'ENRICHMENT' && (
              <>
                {canEnrich && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Soumettre cette mission en phase de revue ? Les membres, le périmètre et les programmes pourront alors être définis.')) {
                        patchPhase('REVIEW');
                      }
                    }}
                    disabled={!enrichmentOk || loadingAction !== null}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950"
                  >
                    {loadingAction === 'phase' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    Passer à la revue
                  </button>
                )}
                {canEnrich && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Réouvrir la saisie de base pour permettre à la secrétaire de modifier les informations initiales ?')) {
                        patchPhase('INTAKE');
                      }
                    }}
                    disabled={loadingAction !== null}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Revenir à la saisie de base
                  </button>
                )}
              </>
            )}

            {!locked && currentPhase === 'REVIEW' && (
              <>
                {canFinalize && (
                  <button
                    type="button"
                    onClick={finalize}
                    disabled={!readyGateOk || loadingAction !== null}
                    title={!readyGateOk ? 'Complétez le cadrage (scope, méthodologie, plan, type, chef) avant de publier' : ''}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingAction === 'finalize' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Publier la mission
                  </button>
                )}
                {canReview && (
                  <button
                    type="button"
                    onClick={() => patchPhase('ENRICHMENT')}
                    disabled={loadingAction !== null}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Revenir à l’enrichissement information
                  </button>
                )}
              </>
            )}

            {!locked && !canTransition && !canFinalize && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                Vous n'avez pas les permissions nécessaires pour modifier la préparation.
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Clock3 className="h-4 w-4 text-slate-400" />
              Historique récent
            </div>
            <div className="mt-3 space-y-3">
              {(preparation?.history || []).slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {(entry.fromPhase === 'INTAKE' ? 'Saisie' : entry.fromPhase === 'ENRICHMENT' ? 'Enrichissement information' : entry.fromPhase === 'REVIEW' ? 'Revue information' : entry.fromPhase || '—')} → {(entry.toPhase === 'INTAKE' ? 'Saisie' : entry.toPhase === 'ENRICHMENT' ? 'Enrichissement information' : entry.toPhase === 'REVIEW' ? 'Revue information' : entry.toPhase)}
                    </span>
                    <span>{new Date(entry.changedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="mt-1">
                    {entry.changedBy ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}` : 'Système'}
                    {entry.reason ? ` • ${entry.reason}` : ''}
                  </p>
                </div>
              ))}
              {(preparation?.history || []).length === 0 && (
                <p className="text-xs italic text-slate-400 dark:text-slate-500">Aucune transition enregistrée.</p>
              )}

              {locked && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  Mission verrouillée. La préparation n’est plus modifiable.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
