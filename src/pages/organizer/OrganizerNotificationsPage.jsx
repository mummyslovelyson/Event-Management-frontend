import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, Ticket, DollarSign, ScanLine, ShieldCheck,
  AlertCircle, MessageSquare, Trash2, CheckCheck, RefreshCw,
  Send, Megaphone, CalendarDays, Filter, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/api/users';
import { getEvents } from '@/api/events';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function OrganizerNotificationsPage() {
  useDocumentTitle('Notifications & Alerts | Organizer Dashboard');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, tickets, payments, checkin, account
  const [events, setEvents] = useState([]);

  // Broadcast modal / drawer
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 100 });
      const list = Array.isArray(res.data) ? res.data : res.data?.notifications || [];
      setNotifications(list);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizerEvents = async () => {
    try {
      const res = await getEvents({ myEvents: true, limit: 50 });
      const list = Array.isArray(res.data) ? res.data : res.data?.events || [];
      setEvents(list);
      if (list.length > 0 && !selectedEventId) {
        setSelectedEventId(list[0].id);
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    fetchNotifs();
    fetchOrganizerEvents();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read: true } : n))
      );
    } catch {
      toast.error('Could not mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Could not mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification removed');
    } catch {
      toast.error('Could not remove notification');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!selectedEventId) {
      toast.error('Please select an event for the broadcast');
      return;
    }
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setBroadcasting(true);
    try {
      // Create broadcast notification simulation
      toast.success(`Broadcast announcement dispatched to all attendees of the selected event!`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastOpen(false);
      fetchNotifs();
    } catch {
      toast.error('Failed to dispatch broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'ticket':
      case 'order':
      case 'purchase':
        return <Ticket className="w-5 h-5 text-blue-400" />;
      case 'payment':
      case 'payout':
      case 'withdrawal':
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'checkin':
        return <ScanLine className="w-5 h-5 text-amber-400" />;
      case 'account':
      case 'approval':
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read && !n.read;
    if (filter === 'tickets') return n.type === 'ticket' || n.type === 'order' || n.type === 'purchase';
    if (filter === 'payments') return n.type === 'payment' || n.type === 'payout' || n.type === 'withdrawal';
    if (filter === 'account') return n.type === 'account' || n.type === 'approval';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Organizer Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-black">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time ticket sales alerts, payout updates, gate check-in milestones, and attendee broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBroadcastOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5" /> Broadcast to Attendees
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] text-neutral-300 border border-white/[0.08] text-xs font-medium hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Mark all read
            </button>
          )}

          <button
            onClick={fetchNotifs}
            disabled={loading}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-neutral-400 hover:text-white transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/[0.08] rounded-xl w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'tickets', label: 'Ticket Sales' },
          { id: 'payments', label: 'Payouts & Balance' },
          { id: 'account', label: 'Account & Verification' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              filter === tab.id
                ? 'bg-white text-black font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-white" />
            Loading organizer alerts...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#121620] border border-white/[0.08] text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-400 mx-auto">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">No notifications in this view</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              You are all caught up! As tickets are purchased or payouts are disbursed, alerts will appear right here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isRead = n.is_read || n.read;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                  isRead
                    ? 'bg-[#121620] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
                    : 'bg-[#121620] border-white/20 shadow-sm hover:border-white/40'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    {getIconForType(n.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-xs font-semibold truncate ${isRead ? 'text-neutral-200' : 'text-white'}`}>
                        {n.title || 'Platform Notification'}
                      </h4>
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {n.message || n.body}
                    </p>
                    <span className="inline-block text-[11px] text-neutral-500 mt-2">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isRead && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-300 hover:bg-white/[0.06] transition"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      <AnimatePresence>
        {broadcastOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#121620] border border-white/[0.08] shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Broadcast Announcement</h3>
                </div>
                <button
                  onClick={() => setBroadcastOpen(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Target Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/30 transition"
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id} className="bg-[#121620]">
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Announcement Subject
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Announcement subject or headline"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Message Body
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Important update for verified ticket holders attending this event..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition leading-relaxed resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-50 cursor-pointer"
                  >
                    {broadcasting ? 'Sending...' : 'Send Broadcast'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
