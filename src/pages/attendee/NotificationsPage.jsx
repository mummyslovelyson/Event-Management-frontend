import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bell, CheckCheck, Ticket as TicketIcon, CalendarClock, Tag, AlertCircle,
  Info, CheckCircle2, Trash2, Filter,
} from 'lucide-react';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification,
} from '@/api/users';
import Modal from '@/components/common/Modal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'ticket', label: 'Ticket Confirmations' },
  { value: 'reminder', label: 'Event Reminders' },
  { value: 'promotion', label: 'Promotions' },
];

const TYPE_CONFIG = {
  ticket: { icon: TicketIcon, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
  reminder: { icon: CalendarClock, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
  promotion: { icon: Tag, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
  alert: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-[#8A9196]', bg: 'bg-[#494F55]/30' },
  system: { icon: Bell, color: 'text-[#8A9196]', bg: 'bg-[#494F55]/30' },
  default: { icon: Bell, color: 'text-[#8A9196]', bg: 'bg-[#494F55]/30' },
};

function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getNotifications({ limit: 100 });
        const data = res.data?.notifications ?? res.data ?? [];
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Failed to load notifications');
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.read;
      return (n.type || '').toLowerCase() === filter;
    });
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (err) {
      // Revert silently
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    const prev = notifications;
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      setNotifications(prev);
      toast.error('Could not mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id) => {
    const prev = notifications;
    setNotifications((p) => p.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      setNotifications(prev);
      toast.error('Could not delete notification');
    }
  };

  const handleOpen = (n) => {
    if (!n.read) handleMarkRead(n.id);
    setSelected(n);
  };

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading notifications..." className="py-24" />;
  }

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#EDF0F1]">Notifications</h1>
          <p className="text-sm text-[#8A9196] mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`
              : 'You\'re all caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-[#EDF0F1] text-sm font-medium hover:border-[#D4AF37]/40 disabled:opacity-50 transition w-fit"
          >
            <CheckCheck className="w-4 h-4" />
            {markingAll ? 'Marking...' : 'Mark All Read'}
          </button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemFade} className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-[#494F55] mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-[#D4AF37] text-[#1E252B]'
                : 'bg-[#171A1D] border border-[#262B2F] text-[#8A9196] hover:text-[#EDF0F1] hover:border-[#494F55]/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={notifications.length === 0 ? "No notifications" : "No matching notifications"}
          description={notifications.length === 0 ? "You'll be notified about ticket confirmations, event reminders, and promotions here." : "Try a different filter."}
        />
      ) : (
        <motion.div variants={containerStagger} className="space-y-2">
          {filtered.map((n) => {
            const cfg = TYPE_CONFIG[(n.type || '').toLowerCase()] || TYPE_CONFIG.default;
            const Icon = cfg.icon;
            return (
              <motion.div
                key={n.id}
                variants={itemFade}
                className={`relative rounded-xl border p-4 transition-colors cursor-pointer group ${
                  n.read
                    ? 'bg-[#171A1D] border-[#262B2F] hover:border-[#494F55]/50'
                    : 'bg-[#171A1D] border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
                }`}
                onClick={() => handleOpen(n)}
              >
                <div className="flex gap-3 items-start">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#EDF0F1] truncate">{n.title}</h3>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0" />}
                    </div>
                    <p className="text-sm text-[#8A9196] line-clamp-1 mt-0.5">{n.message || n.body}</p>
                    <p className="text-xs text-[#494F55] mt-1">{timeAgo(n.createdAt || n.timestamp)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        className="w-8 h-8 rounded-lg text-[#8A9196] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 flex items-center justify-center transition"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                      className="w-8 h-8 rounded-lg text-[#8A9196] hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Notification"
        footer={
          <>
            {selected?.link && (
              <Link
                to={selected.link}
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] text-sm font-semibold hover:bg-[#D4AF37]/20 transition"
              >
                View Event
              </Link>
            )}
            <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition">
              Close
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-3">
            {(() => {
              const cfg = TYPE_CONFIG[(selected.type || '').toLowerCase()] || TYPE_CONFIG.default;
              const Icon = cfg.icon;
              return (
                <div className={`w-12 h-12 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              );
            })()}
            <h3 className="text-lg font-bold text-[#EDF0F1]">{selected.title}</h3>
            <p className="text-sm text-[#8A9196] leading-relaxed">{selected.message || selected.body}</p>
            <p className="text-xs text-[#494F55] pt-2 border-t border-[#262B2F]">
              {selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : ''}
            </p>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
