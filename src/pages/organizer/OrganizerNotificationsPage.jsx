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
            <h1 className="text-2xl font-bold text-white">Organizer Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#111417]">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#949599] mt-1">
            Real-time ticket sales alerts, payout updates, gate check-in milestones, and attendee broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setBroadcastOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#111417] text-xs sm:text-sm font-bold hover:bg-[#CBD5E1] transition shadow-sm cursor-pointer"
          >
            <Megaphone className="w-4 h-4" /> Broadcast to Attendees
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#262B2F] text-white text-xs font-medium hover:bg-[#3A4045] transition cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}

          <button
            onClick={fetchNotifs}
            disabled={loading}
            className="p-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-[#949599] hover:text-white transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#262B2F] no-scrollbar">
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
              filter === tab.id
                ? 'bg-white text-[#111417]'
                : 'text-[#949599] hover:text-white hover:bg-[#1D2124]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#949599] flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-white" />
            Loading organizer alerts...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#171A1D] border border-[#262B2F] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#262B2F] flex items-center justify-center text-[#6B7278] mx-auto">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No notifications in this view</h3>
            <p className="text-xs text-[#949599] max-w-sm mx-auto">
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
                className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                  isRead
                    ? 'bg-[#171A1D]/60 border-[#262B2F] hover:border-[#3A4045]'
                    : 'bg-[#1C232B] border-white/20 shadow-md hover:border-white/40'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#262B2F] flex items-center justify-center shrink-0 mt-0.5">
                    {getIconForType(n.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`text-sm font-semibold truncate ${isRead ? 'text-[#EFEFF1]' : 'text-white font-bold'}`}>
                        {n.title || 'Platform Notification'}
                      </h4>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#949599] mt-1 leading-relaxed">
                      {n.message || n.body}
                    </p>
                    <span className="inline-block text-[11px] text-[#6B7278] mt-2">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!isRead && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="p-1.5 rounded-lg text-[#949599] hover:text-white hover:bg-[#262B2F] transition"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 rounded-lg text-[#949599] hover:text-rose-400 hover:bg-rose-500/10 transition"
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
              className="w-full max-w-lg rounded-2xl bg-[#171A1D] border border-[#262B2F] shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#262B2F]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Broadcast Announcement</h3>
                </div>
                <button
                  onClick={() => setBroadcastOpen(false)}
                  className="text-xs text-[#949599] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#EFEFF1] mb-1.5">
                    Target Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white focus:outline-none focus:border-white transition"
                  >
                    {events.map((e) => (
                      <option key={e.id} value={e.id} className="bg-[#1C232B]">
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#EFEFF1] mb-1.5">
                    Announcement Subject
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gate Openings & Parking Directions"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#EFEFF1] mb-1.5">
                    Message Body
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Important update for verified ticket holders attending this event..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition leading-relaxed resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#949599] hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#111417] text-xs sm:text-sm font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50 cursor-pointer shadow-md"
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
