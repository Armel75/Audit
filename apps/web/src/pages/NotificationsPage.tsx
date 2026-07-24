import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, ScrollText, AlertTriangle, MessageCircle,
  UserCheck, Target, FileCheck2, Loader2, ArrowLeft, ChevronLeft, ChevronRight, CheckSquare
} from 'lucide-react';
import { apiFetch } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notificationType: string;
  channel: string;
  status: string;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
  missionId: number | null;
  findingId: number | null;
  recommendationId: number | null;
}

const NOTIFICATION_ICONS: Record<string, typeof ScrollText> = {
  MISSION_AWAITING_ENRICHMENT: ScrollText,
  MISSION_AWAITING_REVIEW: FileCheck2,
  MISSION_READY: CheckCheck,
  MISSION_STARTED: Target,
  MISSION_CLOSED: CheckCheck,
  MISSION_CANCELLED: AlertTriangle,
  MEMBER_ASSIGNED: UserCheck,
  FINDING_CREATED: AlertTriangle,
  FINDING_STATUS_CHANGED: AlertTriangle,
  RECOMMENDATION_CREATED: MessageCircle,
  RECOMMENDATION_STATUS_CHANGED: MessageCircle,
  APPROVAL_REQUESTED: FileCheck2,
  APPROVAL_DECISION: CheckCheck,
  HIERARCHY_COMMENT_ADDED: MessageCircle,
};

function getIcon(type: string) {
  const Icon = NOTIFICATION_ICONS[type] || Bell;
  return Icon;
}

function getNotificationLabel(type: string): string {
  const labels: Record<string, string> = {
    MISSION_AWAITING_ENRICHMENT: 'Enrichissement requis',
    MISSION_AWAITING_REVIEW: 'Revue requise',
    MISSION_READY: 'Mission prête',
    MISSION_STARTED: 'Mission démarrée',
    MISSION_CLOSED: 'Mission clôturée',
    MISSION_CANCELLED: 'Mission annulée',
    MEMBER_ASSIGNED: 'Affectation',
    FINDING_CREATED: 'Constat créé',
    FINDING_STATUS_CHANGED: 'Constat mis à jour',
    RECOMMENDATION_CREATED: 'Recommandation créée',
    RECOMMENDATION_STATUS_CHANGED: 'Recommandation mise à jour',
    APPROVAL_REQUESTED: 'Approbation requise',
    APPROVAL_DECISION: 'Décision d\'approbation',
    HIERARCHY_COMMENT_ADDED: 'Commentaire hiérarchique',
  };
  return labels[type] || type;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/notifications?page=${page}&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch {
      // silence
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const handleMarkAsRead = async (id: number) => {
    await apiFetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    await apiFetch(`${API_BASE}/notifications/mark-all-read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
  };

  const handleClick = (notif: NotificationItem) => {
    if (!notif.readAt) handleMarkAsRead(notif.id);
    if (notif.missionId) navigate(`/missions/${notif.missionId}`);
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notifications</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {total} notification{total !== 1 ? 's' : ''} · {unreadCount} non lue{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition"
            >
              <CheckSquare className="w-4 h-4" />
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Liste */}
        {loading && notifications.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Aucune notification</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
            {notifications.map(notif => {
              const Icon = getIcon(notif.notificationType);
              const isUnread = !notif.readAt;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left flex gap-4 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 ${isUnread ? 'bg-emerald-50/40 dark:bg-emerald-950/15' : ''}`}
                >
                  <div className={`mt-0.5 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUnread ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isUnread ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {getNotificationLabel(notif.notificationType)}
                      </span>
                      {notif.missionId && (
                        <span className="text-xs text-slate-400">Mission #{notif.missionId}</span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                      {notif.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {isUnread && (
                    <div className="flex items-start pt-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
