import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ScrollText, AlertTriangle, MessageCircle, UserCheck, Target, FileCheck2, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL;

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notificationType: string;
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

function getLink(notif: NotificationItem): string {
  if (notif.missionId) return `/missions/${notif.missionId}`;
  if (notif.findingId && notif.missionId) return `/missions/${notif.missionId}`;
  if (notif.recommendationId && notif.missionId) return `/missions/${notif.missionId}`;
  return '#';
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/notifications/recent`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silence
    } finally {
      setLoading(false);
    }
  };

  // Fetch au montage
  useEffect(() => {
    fetchRecent();
  }, []);

  // Rafraîchir toutes les 30s
  useEffect(() => {
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    await apiFetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await apiFetch(`${API_BASE}/notifications/mark-all-read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleClick = (notif: NotificationItem) => {
    if (!notif.readAt) handleMarkAsRead(notif.id);
    const link = getLink(notif);
    if (link !== '#') navigate(link);
    setOpen(false);
  };

  const unread = notifications.filter(n => !n.readAt);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchRecent(); }}
        className="relative flex items-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl shadow-sm transition"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unread.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
                >
                  Tout marquer lu
                </button>
              )}
              <button
                onClick={() => { navigate('/notifications'); setOpen(false); }}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
              >
                Voir tout
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                Aucune notification
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {notifications.map(notif => {
                  const Icon = getIcon(notif.notificationType);
                  const isUnread = !notif.readAt;
                  return (
                    <li key={notif.id}>
                      <button
                        onClick={() => handleClick(notif)}
                        className={`w-full text-left flex gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 ${isUnread ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''}`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUnread ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-slate-800 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                        {isUnread && (
                          <div className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 text-center">
            <button
              onClick={() => { navigate('/notifications'); setOpen(false); }}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
            >
              Voir toutes les notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
