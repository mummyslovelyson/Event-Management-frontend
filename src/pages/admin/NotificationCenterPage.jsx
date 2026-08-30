import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bell, Send, Mail, MessageSquare, Smartphone, Layout as LayoutIcon,
  Eye, Users, CheckCircle2, FileText, CheckCircle, ExternalLink, Inbox, Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sendNotification, getAdminNotifications, markAdminNotificationsRead } from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const targetOptions = [
  { key: 'all', label: 'All Users' },
  { key: 'attendees', label: 'Attendees' },
  { key: 'organizers', label: 'Organizers' },
  { key: 'specific', label: 'Specific User' },
];

const typeOptions = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: Smartphone },
  { key: 'push', label: 'Push', icon: Bell },
  { key: 'in-app', label: 'In-App', icon: LayoutIcon },
];

const templates = [
  { id: 1, name: 'Welcome Email', type: 'email', desc: 'Sent to new users on registration' },
  { id: 2, name: 'Event Reminder', type: 'push', desc: 'Sent 24h before event start' },
  { id: 3, name: 'Payment Confirmation', type: 'email', desc: 'Sent after successful payment' },
  { id: 4, name: 'Organizer Approval', type: 'email', desc: 'Sent when organizer is approved' },
];

export default function NotificationCenterPage() {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' | 'broadcast'
  const [showSend, setShowSend] = useState(false);
  const [history, setHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', target: 'all', type: 'email', userId: '' });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminNotifications({ page, limit: 15 });
      const d = res.data;
      const items = Array.isArray(d) ? d : d.notifications || d.data || [];
      setHistory(items);
      setUnreadCount(Number(d.unreadCount ?? items.filter((n) => !n.is_read).length));
      setTotalPages(d.pagination?.totalPages || d.totalPages || d.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleMarkAllRead = async () => {
    try {
      await markAdminNotificationsRead('all');
      setUnreadCount(0);
      setHistory((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message are required');
    setSending(true);
    try {
      await sendNotification(form);
      toast.success('Broadcast notification dispatched');
      setShowSend(false);
      setForm({ title: '', message: '', target: 'all', type: 'email', userId: '' });
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
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
        subtitle="Real-time live alerts on all app activity (registrations, orders, payouts, support) and platform broadcasts."
        actions={
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#262B2F] text-sm text-[#EFEFF1] hover:bg-[#32383E] transition font-medium"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Mark All Read
              </button>
            )}
            <button
              onClick={() => setShowSend(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition"
            >
              <Send className="w-4 h-4" /> Send Broadcast
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#262B2F] pb-3">
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
          <Radio className="w-4 h-4" /> Outbound Broadcasts & Templates
        </button>
      </div>

      {activeTab === 'inbox' ? (
        /* Live Activity Alerts Feed */
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#262B2F] flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#EFEFF1]">Live Activity Feed</h2>
            <span className="text-xs text-[#949599]">Auto-refreshes on platform events</span>
          </div>
          {loading ? (
            <LoadingSpinner label="Loading live alerts..." className="py-16" />
          ) : history.length === 0 ? (
            <EmptyState icon={Bell} title="No activity recorded yet" description="When users register, buy tickets, transfer passes, or open support tickets, real-time alerts will show up here." className="py-16" />
          ) : (
            <>
              <div className="divide-y divide-[#262B2F]/70">
                {history.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex items-start gap-4 transition hover:bg-[#1D2124] ${
                      !n.is_read ? 'bg-white/[0.03]' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      n.type === 'account' ? 'bg-blue-500/20 text-blue-300' :
                      n.type === 'payment' || n.type === 'withdrawal' ? 'bg-emerald-500/20 text-emerald-300' :
                      n.type === 'support' ? 'bg-amber-500/20 text-amber-300' :
                      n.type === 'ticket' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-white/10 text-white'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#EFEFF1]">{n.title}</p>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-[#6B7278] shrink-0">{fmtDate(n.created_at || n.createdAt)}</span>
                      </div>
                      <p className="text-sm text-[#949599] mt-1 leading-relaxed">{n.message}</p>
                      {n.link && (
                        <div className="mt-2">
                          <Link
                            to={n.link}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#262B2F] text-xs font-medium text-[#EFEFF1] hover:bg-[#32383E] transition"
                          >
                            Open section <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
                <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      ) : (
        /* History + Templates */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#262B2F]">
              <h2 className="text-base font-semibold text-[#EFEFF1]">Broadcast History</h2>
            </div>
            {loading ? (
              <LoadingSpinner label="Loading history..." className="py-16" />
            ) : history.length === 0 ? (
              <EmptyState icon={Bell} title="No broadcasts sent yet" description="Once you broadcast a notification, it will appear here." className="py-16" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                        <th className="px-5 py-3 font-medium">Title</th>
                        <th className="px-5 py-3 font-medium">Target</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium text-center">Sent</th>
                        <th className="px-5 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262B2F]/70">
                      {history.map((n) => (
                        <tr key={n.id} className="hover:bg-[#1D2124] transition-colors">
                          <td className="px-5 py-3 font-medium text-[#EFEFF1] max-w-[220px] truncate">{n.title}</td>
                          <td className="px-5 py-3"><Badge variant="info" size="sm">{n.target || n.audience || 'All'}</Badge></td>
                          <td className="px-5 py-3"><Badge variant="neutral" size="sm">{n.type || 'In-App'}</Badge></td>
                          <td className="px-5 py-3 text-center text-[#949599]">{(n.sentCount ?? n.recipients ?? 1).toLocaleString()}</td>
                          <td className="px-5 py-3 text-xs text-[#949599]">{fmtDate(n.created_at || n.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
                  <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>

          {/* Templates sidebar */}
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 h-fit">
            <h2 className="text-sm font-semibold text-[#EFEFF1] mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-white" /> Notification Templates</h2>
            <div className="grid grid-cols-1 gap-3">
              {templates.map((t) => {
                const TypeIcon = typeOptions.find((o) => o.key === t.type)?.icon || Mail;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-lg bg-[#1D2124] border border-[#262B2F] hover:border-white/40 transition">
                    <div className="w-9 h-9 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0"><TypeIcon className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#EFEFF1]">{t.name}</p>
                      <p className="text-xs text-[#949599] truncate">{t.desc}</p>
                    </div>
                    <Badge variant="neutral" size="sm">{t.type}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="Send Broadcast Notification"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowSend(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button onClick={handleSend} disabled={sending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50">
              {sending ? <LoadingSpinner size="sm" /> : <><Send className="w-4 h-4" /> Send</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Notification title" className="w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Notification message..." rows={4} className="w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none transition" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2">Target Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {targetOptions.map((t) => (
                <button key={t.key} onClick={() => setForm({ ...form, target: t.key })} className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${form.target === t.key ? 'bg-white/10 text-white border-white/20' : 'bg-[#1C232B]/50 text-[#949599] border-[#494F55]/30 hover:border-[#494F55]/60'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {form.target === 'specific' && (
              <input type="text" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="User ID or email" className="mt-2 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition" />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2">Delivery Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {typeOptions.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setForm({ ...form, type: key })} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${form.type === key ? 'bg-white/10 text-white border-white/20' : 'bg-[#1C232B]/50 text-[#949599] border-[#494F55]/30 hover:border-[#494F55]/60'}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Preview</p>
            <div className="rounded-lg bg-[#161D22] border border-[#494F55]/20 p-3">
              <p className="text-sm font-semibold text-[#EFEFF1]">{form.title || 'Notification title'}</p>
              <p className="text-sm text-[#949599] mt-1">{form.message || 'Notification message will appear here...'}</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

