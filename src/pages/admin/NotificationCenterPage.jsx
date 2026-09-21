import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Send, Mail, Smartphone, Layers, Radio, Trash2, Check, CheckCircle,
  ExternalLink, Inbox, Search, RefreshCw, Filter, CreditCard, UserCheck,
  CalendarDays, LifeBuoy, FileText, ChevronRight, AlertCircle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  sendNotification,
  getAdminNotifications,
  markAdminNotificationsRead,
  deleteAdminNotification,
  clearReadAdminNotifications,
  getAdminAnnouncements,
  getNotificationTemplates,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

const targetOptions = [
  { key: 'all', label: 'All Users' },
  { key: 'attendees', label: 'Attendees' },
  { key: 'organizers', label: 'Organizers' },
  { key: 'admins', label: 'Administrators' },
  { key: 'specific', label: 'Specific User' },
];

const channelOptions = [
  { key: 'in-app', label: 'In-App Alert', icon: Bell },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS Notice', icon: Smartphone },
  { key: 'push', label: 'Push Notification', icon: Radio },
];

const categoryFilters = [
  { key: 'all', label: 'All Activity' },
  { key: 'payments', label: 'Orders & Payments' },
  { key: 'organizers', label: 'Organizers & KYC' },
  { key: 'events', label: 'Events & Tickets' },
  { key: 'support', label: 'Support Tickets' },
  { key: 'system', label: 'System & Platform' },
];

const getAlertMeta = (type) => {
  if (['payment', 'withdrawal', 'refund'].includes(type)) {
    return {
      Icon: CreditCard,
      label: type === 'withdrawal' ? 'Payout' : type === 'refund' ? 'Refund' : 'Payment',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      pillClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
  }
  if (type === 'account') {
    return {
      Icon: UserCheck,
      label: 'Account / KYC',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      pillClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
  }
  if (['ticket', 'price_change', 'update'].includes(type)) {
    return {
      Icon: CalendarDays,
      label: 'Ticket / Event',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      pillClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
  }
  if (type === 'support') {
    return {
      Icon: LifeBuoy,
      label: 'Support',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      pillClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
  }
  return {
    Icon: Bell,
    label: type === 'announcement' ? 'Broadcast' : 'System',
    badgeClass: 'bg-white/10 text-white border-white/20',
    pillClass: 'bg-white/5 text-[#EFEFF1] border-white/15',
  };
};

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'broadcast'

  // Live alerts state
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, payments: 0, organizers: 0, events: 0, support: 0, system: 0 });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsTotalPages, setAlertsTotalPages] = useState(1);

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [broadcastsPage, setBroadcastsPage] = useState(1);
  const [broadcastsTotalPages, setBroadcastsTotalPages] = useState(1);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Send Broadcast modal state
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    target: 'all',
    channel: 'in-app',
    userId: '',
  });

  /* ------------------------------------------------------------------ */
  /* Fetch Live Alerts                                                  */
  /* ------------------------------------------------------------------ */
  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const res = await getAdminNotifications({
        page: alertsPage,
        limit: 15,
        category: categoryFilter,
        unreadOnly: unreadOnly ? 'true' : 'false',
        search: searchQuery,
      });
      const d = res.data || {};
      const items = Array.isArray(d.notifications) ? d.notifications : Array.isArray(d) ? d : [];
      setAlerts(items);
      setUnreadCount(Number(d.unreadCount ?? items.filter((n) => !n.is_read).length));
      if (d.counts) setCounts(d.counts);
      setAlertsTotalPages(d.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setAlertsLoading(false);
    }
  }, [alertsPage, categoryFilter, unreadOnly, searchQuery]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /* ------------------------------------------------------------------ */
  /* Fetch Broadcast History & Templates                                */
  /* ------------------------------------------------------------------ */
  const fetchBroadcasts = useCallback(async () => {
    setBroadcastsLoading(true);
    try {
      const res = await getAdminAnnouncements({ page: broadcastsPage, limit: 12 });
      const d = res.data || {};
      setBroadcasts(d.announcements || []);
      setBroadcastsTotalPages(d.pagination?.totalPages || 1);
    } catch {
      // ignore
    } finally {
      setBroadcastsLoading(false);
    }
  }, [broadcastsPage]);

  const fetchTemplatesData = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await getNotificationTemplates();
      setTemplates(res.data?.templates || []);
    } catch {
      // ignore
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'broadcast') {
      fetchBroadcasts();
      fetchTemplatesData();
    }
  }, [activeTab, fetchBroadcasts, fetchTemplatesData]);

  /* ------------------------------------------------------------------ */
  /* Action Handlers                                                    */
  /* ------------------------------------------------------------------ */
  const handleMarkAllRead = async () => {
    try {
      await markAdminNotificationsRead('all');
      setUnreadCount(0);
      setAlerts((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All alerts marked as read');
    } catch {
      toast.error('Failed to mark notifications read');
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markAdminNotificationsRead(id);
      setAlerts((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success('Alert marked as read');
    } catch {
      toast.error('Failed to mark notification read');
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await deleteAdminNotification(id);
      const target = alerts.find((n) => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setAlerts((prev) => prev.filter((n) => n.id !== id));
      toast.success('Alert dismissed');
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadAdminNotifications();
      setAlerts((prev) => prev.filter((n) => !n.is_read));
      toast.success('Read alerts cleared');
    } catch {
      toast.error('Failed to clear read alerts');
    }
  };

  const handleUseTemplate = (t) => {
    setForm({
      title: t.subject || t.name,
      message: t.body || '',
      target: 'all',
      channel: t.type || 'in-app',
      userId: '',
    });
    setShowSend(true);
  };

  const handleSendBroadcast = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      return toast.error('Title and message are required');
    }
    setSending(true);
    try {
      const res = await sendNotification(form);
      toast.success(res.data?.message || 'Broadcast sent successfully');
      setShowSend(false);
      setForm({ title: '', message: '', target: 'all', channel: 'in-app', userId: '' });
      fetchBroadcasts();
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        accent="amber"
        title="Notification Center"
        subtitle="Live administrative activity feed, system alerts, and multi-channel user broadcasts."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (activeTab === 'inbox') fetchAlerts();
                else fetchBroadcasts();
              }}
              title="Refresh"
              className="p-2 rounded-lg bg-[#262B2F] text-[#949599] hover:text-[#EFEFF1] hover:bg-[#32383E] transition"
            >
              <RefreshCw className={`w-4 h-4 ${alertsLoading || broadcastsLoading ? 'animate-spin' : ''}`} />
            </button>

            {activeTab === 'inbox' && unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#262B2F] text-sm text-[#EFEFF1] hover:bg-[#32383E] transition font-medium"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Mark All Read
              </button>
            )}

            {activeTab === 'inbox' && alerts.some((a) => a.is_read) && (
              <button
                onClick={handleClearRead}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#262B2F] text-sm text-[#949599] hover:text-red-400 hover:bg-[#32383E] transition font-medium"
              >
                <Trash2 className="w-4 h-4" /> Clear Read
              </button>
            )}

            <button
              onClick={() => setShowSend(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition shadow-sm"
            >
              <Send className="w-4 h-4" /> Dispatch Broadcast
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#262B2F] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'inbox'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#1D2124]'
            }`}
          >
            <Inbox className="w-4 h-4" /> Live Platform Alerts
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'broadcast'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#1D2124]'
            }`}
          >
            <Radio className="w-4 h-4" /> Broadcast History &amp; Templates
          </button>
        </div>

        {activeTab === 'inbox' && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[#949599] cursor-pointer hover:text-[#EFEFF1] transition">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => {
                  setUnreadOnly(e.target.checked);
                  setAlertsPage(1);
                }}
                className="w-4 h-4 rounded bg-[#1C232B] border-[#262B2F] text-white focus:ring-0"
              />
              <span>Unread only</span>
            </label>
          </div>
        )}
      </div>

      {activeTab === 'inbox' ? (
        /* ============================================================== */
        /* Live Alerts Tab                                                */
        /* ============================================================== */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#171A1D] border border-[#262B2F]">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categoryFilters.map((cat) => {
                const isActive = categoryFilter === cat.key;
                const countVal = cat.key === 'all' ? unreadCount : counts[cat.key] || 0;
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setCategoryFilter(cat.key);
                      setAlertsPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-[#1C232B] font-semibold'
                        : 'bg-[#1C232B] text-[#949599] hover:text-[#EFEFF1] border border-[#262B2F]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {countVal > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-[#1C232B] text-white' : 'bg-white/10 text-white'
                        }`}
                      >
                        {countVal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7278]" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAlertsPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#14171A] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#6B7278] focus:outline-none focus:border-[#494F55] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7278] hover:text-[#EFEFF1]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Alerts List Container */}
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#262B2F] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#EFEFF1] flex items-center gap-2">
                <span>Alerts Feed</span>
                <span className="text-xs text-[#6B7278] font-normal">
                  ({counts.all} total records in database)
                </span>
              </h2>
              <span className="text-xs text-[#949599]">Auto-refreshes on live transactions</span>
            </div>

            {alertsLoading ? (
              <LoadingSpinner label="Loading live alerts..." className="py-20" />
            ) : alerts.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="No activity alerts found"
                description={
                  searchQuery || categoryFilter !== 'all' || unreadOnly
                    ? 'No alerts match your active filter criteria. Try clearing search or filters.'
                    : 'When users buy tickets, register, submit organizer KYC, or open support inquiries, real-time alerts will appear here.'
                }
                className="py-16"
              />
            ) : (
              <>
                <div className="divide-y divide-[#262B2F]/60">
                  {alerts.map((n) => {
                    const { Icon: TypeIcon, label: typeLabel, badgeClass, pillClass } = getAlertMeta(n.type);
                    return (
                      <div
                        key={n.id}
                        className={`p-4 transition flex items-start gap-4 hover:bg-[#1D2124] ${
                          !n.is_read ? 'bg-white/[0.04]' : 'opacity-90'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badgeClass}`}
                        >
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${pillClass}`}>
                                {typeLabel}
                              </span>
                              <p className="text-sm font-semibold text-[#EFEFF1] truncate">{n.title}</p>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Unread" />
                              )}
                            </div>
                            <span
                              className="text-xs text-[#6B7278] shrink-0 font-medium cursor-default"
                              title={fmtDate(n.created_at || n.createdAt)}
                            >
                              {formatTimeAgo(n.created_at || n.createdAt)}
                            </span>
                          </div>

                          <p className="text-sm text-[#949599] mt-1.5 leading-relaxed break-words">{n.message}</p>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
                            {n.link ? (
                              <Link
                                to={n.link}
                                onClick={() => {
                                  if (!n.is_read) handleMarkOneRead(n.id);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white hover:underline transition"
                              >
                                Review details <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            ) : (
                              <span className="text-[11px] text-[#6B7278]">Platform Notice</span>
                            )}

                            <div className="flex items-center gap-2">
                              {!n.is_read && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkOneRead(n.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-[#949599] hover:text-emerald-300 hover:bg-emerald-500/10 transition"
                                >
                                  <Check className="w-3.5 h-3.5" /> Mark read
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAlert(n.id)}
                                title="Dismiss notification"
                                className="p-1 rounded text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-5 py-3.5 border-t border-[#262B2F] flex items-center justify-between">
                  <span className="text-xs text-[#949599]">
                    Page {alertsPage} of {alertsTotalPages}
                  </span>
                  <Pagination
                    currentPage={alertsPage}
                    totalPages={alertsTotalPages}
                    onPageChange={setAlertsPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* Broadcast History & Templates Tab                              */
        /* ============================================================== */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#262B2F] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#EFEFF1]">Broadcast History</h2>
                <p className="text-xs text-[#949599] mt-0.5">
                  Platform-wide announcements dispatched from the admin console.
                </p>
              </div>
              <button
                onClick={() => setShowSend(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#1C232B] text-xs font-semibold hover:bg-[#CBD5E1] transition"
              >
                <Send className="w-3 h-3" /> New Announcement
              </button>
            </div>

            {broadcastsLoading ? (
              <LoadingSpinner label="Loading broadcast records..." className="py-20" />
            ) : broadcasts.length === 0 ? (
              <EmptyState
                icon={Radio}
                title="No broadcasts dispatched yet"
                description="Use the button above to broadcast platform announcements, emergency notices, or event reminders."
                className="py-16"
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                        <th className="px-5 py-3 font-medium">Subject / Message</th>
                        <th className="px-5 py-3 font-medium">Target</th>
                        <th className="px-5 py-3 font-medium">Channel</th>
                        <th className="px-5 py-3 font-medium text-center">Recipients</th>
                        <th className="px-5 py-3 font-medium">Dispatched</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262B2F]/70">
                      {broadcasts.map((b) => (
                        <tr key={b.id} className="hover:bg-[#1D2124] transition-colors">
                          <td className="px-5 py-3.5 max-w-[280px]">
                            <p className="font-semibold text-[#EFEFF1] truncate">{b.title}</p>
                            <p className="text-xs text-[#949599] line-clamp-1 mt-0.5">{b.message}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant="info" size="sm" className="capitalize">
                              {b.target_role || 'All'}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs text-[#EFEFF1] capitalize">
                              <Radio className="w-3 h-3 text-[#949599]" />
                              {b.channel || 'In-App'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-xs font-medium text-[#EFEFF1]">
                            {(Number(b.sent_count) || 0).toLocaleString()} users
                          </td>
                          <td className="px-5 py-3.5 text-xs text-[#949599]">
                            {fmtDate(b.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-3.5 border-t border-[#262B2F] flex items-center justify-between">
                  <span className="text-xs text-[#949599]">
                    Page {broadcastsPage} of {broadcastsTotalPages}
                  </span>
                  <Pagination
                    currentPage={broadcastsPage}
                    totalPages={broadcastsTotalPages}
                    onPageChange={setBroadcastsPage}
                  />
                </div>
              </>
            )}
          </div>

          {/* Live Notification Templates */}
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 h-fit space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#EFEFF1] flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" /> Pre-built Templates
              </h2>
              <span className="text-[11px] text-[#6B7278]">Click to use</span>
            </div>

            {templatesLoading ? (
              <LoadingSpinner size="sm" label="Loading templates..." className="py-6" />
            ) : templates.length === 0 ? (
              <p className="text-xs text-[#6B7278] py-4">No notification templates configured.</p>
            ) : (
              <div className="space-y-2.5">
                {templates.map((t) => {
                  const ChannelIcon = channelOptions.find((o) => o.key === t.type)?.icon || Mail;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleUseTemplate(t)}
                      className="group p-3 rounded-lg bg-[#1D2124] border border-[#262B2F] hover:border-white/40 cursor-pointer transition flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-[#1C232B] transition">
                        <ChannelIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[#EFEFF1] truncate">{t.name}</p>
                          <span className="text-[10px] text-[#6B7278] uppercase">{t.type}</span>
                        </div>
                        <p className="text-[11px] text-[#949599] line-clamp-1 mt-0.5">{t.subject}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="Dispatch Broadcast Announcement"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowSend(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSendBroadcast}
              disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50 shadow-sm"
            >
              {sending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Broadcast
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">
              Subject / Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Schedule Update for Ghana Music Festival"
              className="w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder-[#6B7278] focus:outline-none focus:border-white/50 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">
              Message Content
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Type your announcement or alert message..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder-[#6B7278] focus:outline-none focus:border-white/50 resize-none transition leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2">
              Target Audience
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {targetOptions.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm({ ...form, target: t.key })}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    form.target === t.key
                      ? 'bg-white text-[#1C232B] font-semibold border-white'
                      : 'bg-[#1C232B] text-[#949599] border-[#262B2F] hover:border-[#494F55]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {form.target === 'specific' && (
              <input
                type="text"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                placeholder="Enter User ID or User Email..."
                className="mt-2.5 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#6B7278] focus:outline-none focus:border-white/50 transition"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2">
              Delivery Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {channelOptions.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, channel: key })}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                    form.channel === key
                      ? 'bg-white text-[#1C232B] font-semibold border-white'
                      : 'bg-[#1C232B] text-[#949599] border-[#262B2F] hover:border-[#494F55]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="rounded-lg bg-[#14171A] border border-[#262B2F] p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#949599] mb-2">
              Preview (How users will see this)
            </p>
            <div className="p-3 rounded-lg bg-[#1C232B] border border-[#262B2F]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#EFEFF1]">
                  {form.title || 'Untitled Notification'}
                </p>
                <span className="text-[10px] text-[#6B7278]">Just now</span>
              </div>
              <p className="text-xs text-[#949599] mt-1 leading-relaxed">
                {form.message || 'Notification body will appear here once typed...'}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
