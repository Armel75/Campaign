import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellDot, Loader2, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data?.count ?? 0);
    } catch {
      // Silencieux
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { page: 1, limit: 10 } });
      setNotifications(res.data?.data ?? []);
      fetchUnreadCount();
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      fetchUnreadCount();
    } catch {
      // Silencieux
    }
  }, [fetchUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silencieux
    }
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  }, [markAsRead, navigate]);

  // Fermer le dropdown au clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Polling: vérifier les non-lues toutes les 30 secondes
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Charger les notifications à l'ouverture
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <BellDot className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute left-full bottom-full ml-2 mb-2 w-96 rounded-xl border bg-card shadow-xl z-50">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 h-7"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer comme lu
              </Button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                    !notif.isRead && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full mt-1.5 shrink-0',
                        notif.isRead ? 'bg-transparent' : 'bg-primary'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground/60">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                        {notif.link && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
