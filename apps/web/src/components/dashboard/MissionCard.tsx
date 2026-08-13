import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarRange, User2, AlertTriangle, Eye, FileDown, Loader2, MessageCircle, FileText } from 'lucide-react';
import { cn, formatDate } from './tokens';
import { StatusBadge } from './StatusBadge';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function MissionCard({ mission, now }: { mission: any; now: Date }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const canComment = user?.permissions?.includes('comment:read');

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/missions/${mission.id}?tab=hierarchy-comments`);
  };

  const handleExportInfo = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/missions/${mission.id}/export-info`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `infos-mission-${mission.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenProtocol = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/missions/${mission.id}/protocol`);
  };

  const isOverdue = mission.endDate && new Date(mission.endDate) < now;
  const daysLeft = mission.endDate
    ? Math.ceil((new Date(mission.endDate).getTime() - now.getTime()) / 86400000)
    : null;

  return (
    <Link
      to={`/missions/${mission.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300"
    >
      {/* Badges row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!mission.programValidated && (
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
              Programme non validé
            </span>
          )}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Retard
            </span>
          )}
        </div>
        <StatusBadge value={mission.status} />
      </div>

      {/* Title */}
      <p className="mt-3 text-sm font-semibold leading-5 text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
        {mission.title}
      </p>

      {/* Separator */}
      <div className="mt-4 mb-4 border-t border-slate-100 dark:border-slate-700" />

      {/* Pilot line */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-2">
        <User2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="truncate font-medium">{mission.leader || 'Non assigné'}</span>
      </div>

      {/* Dates line — Start | End */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
          <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <span className="truncate">{formatDate(mission.startDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
          <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <span className={cn('truncate', isOverdue && 'font-semibold text-red-600')}>
            {formatDate(mission.endDate)}
          </span>
        </div>
      </div>

      {/* Days indicator */}
      {daysLeft !== null && (
        <div className="mt-3 flex items-center gap-2">
          {isOverdue ? (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
              {Math.abs(daysLeft)} jour(s) de retard
            </span>
          ) : daysLeft <= 7 ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              Échéance dans {daysLeft} jour(s)
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {daysLeft} jour(s) restants
            </span>
          )}
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isOverdue ? 'bg-red-500' : mission.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'
          )}
          style={{
            width: `${mission.status === 'COMPLETED' ? 100 : mission.status === 'IN_PROGRESS' ? 60 : mission.status === 'REVIEW' ? 80 : 20}%`,
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors group-hover:border-blue-300 group-hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:border-blue-700 dark:group-hover:bg-blue-900/50">
          <Eye className="h-3.5 w-3.5" />
          Voir informations mission
        </span>
        {canComment && (
          <button
            onClick={handleComment}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:border-violet-700 dark:hover:bg-violet-900/50 cursor-pointer"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Commenter la mission
          </button>
        )}
        <button
          onClick={handleExportInfo}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/50 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          {isExporting ? 'Téléchargement...' : 'Exporter informations mission'}
        </button>
        {mission.status !== 'CANCELLED' && (
          <button
            onClick={handleOpenProtocol}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:border-amber-700 dark:hover:bg-amber-900/50 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            Protocole de mission d'audit
          </button>
        )}
      </div>
    </Link>
  );
}
