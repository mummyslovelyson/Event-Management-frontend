import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy, Plus, Send, ArrowLeft, Clock, CheckCircle2,
  AlertCircle, MessageSquare, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createSupportTicket, getMySupportTickets, getMySupportTicket,
  replyToSupportTicket, closeMySupportTicket,
} from '@/api/support';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const categories = [
  { value: 'general', label: 'General' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'account', label: 'Account' },
  { value: 'event', label: 'Event Related' },
  { value: 'other', label: 'Other' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const statusVariant = (s) => ({ open: 'pending', in_progress: 'info', resolved: 'success', closed: 'neutral' }[s] || 'neutral');
const priorityVariant = (p) => ({ urgent: 'error', high: 'warning', medium: 'info', low: 'neutral' }[p] || 'neutral');

export default function SupportPage() {
  const [tab, setTab] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', category: 'general', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  // Detail view
  const [detail, setDetail] = useState(null);
  const [replies, setReplies] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMySupportTickets({ status: tab === 'all' ? undefined : tab, page, limit: 10 });
      const d = res.data;
      setTickets(d.tickets || []);
      setTotalPages(d.pagination?.totalPages || 1);
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [replies]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    setSubmitting(true);
    try {
      await createSupportTicket(form);
      toast.success('Ticket created');
      setShowCreate(false);
      setForm({ subject: '', message: '', category: 'general', priority: 'medium' });
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (ticket) => {
    setDetail(ticket);
    setReplies([]);
    setDetailLoading(true);
    try {
      const res = await getMySupportTicket(ticket.id);
      setDetail(res.data.ticket);
      setReplies(res.data.replies || []);
    } catch {
      toast.error('Failed to load ticket details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await replyToSupportTicket(detail.id, { message: replyText.trim() });
      setReplies((prev) => [...prev, {
        id: Date.now(),
        message: replyText.trim(),
        is_staff: 0,
        user_name: 'You',
        user_role: 'user',
        created_at: new Date().toISOString(),
      }]);
      setReplyText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    try {
      await closeMySupportTicket(detail.id);
      setDetail((prev) => ({ ...prev, status: 'closed' }));
      toast.success('Ticket closed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close ticket');
    }
  };

  // Detail view
  if (detail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setDetail(null)} className="p-2.5 rounded-lg text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[#EFEFF1] truncate">{detail.subject}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-[#949599]">
              <span>Ticket #{detail.id}</span>
              <span>·</span>
              <Badge variant={statusVariant(detail.status)} size="sm" dot>{detail.status?.replace('_', ' ')}</Badge>
              <span>·</span>
              <Badge variant={priorityVariant(detail.priority)} size="sm">{detail.priority}</Badge>
            </div>
          </div>
        </div>

        {detailLoading ? (
          <LoadingSpinner label="Loading ticket..." className="py-12" />
        ) : (
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
            {/* Original message */}
            <div className="p-5 border-b border-[#262B2F]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#242B32] flex items-center justify-center text-xs font-medium text-[#EFEFF1]">
                  {(detail.user_name || 'You')[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#EFEFF1]">You</p>
                  <p className="text-xs text-[#6B7278]">{fmtDateTime(detail.created_at)}</p>
                </div>
              </div>
              <p className="text-sm text-[#EFEFF1] leading-relaxed mt-3 whitespace-pre-wrap">{detail.message}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="neutral" size="sm">{categories.find((c) => c.value === detail.category)?.label || detail.category}</Badge>
              </div>
            </div>

            {/* Conversation thread */}
            <div ref={threadRef} className="max-h-[400px] overflow-y-auto">
              {replies.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#6B7278]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#494F55]" />
                  No replies yet. Our team will get back to you soon.
                </div>
              ) : (
                replies.map((r) => (
                  <div key={r.id} className={`px-5 py-4 border-b border-[#262B2F]/50 ${r.is_staff ? 'bg-[#1C232B]/50' : ''}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${r.is_staff ? 'bg-white/10 text-white' : 'bg-[#242B32] text-[#949599]'}`}>
                        {(r.user_name || '?')[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[#EFEFF1]">{r.user_name || 'User'}</span>
                      {r.is_staff ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white">Staff</span>
                      ) : null}
                      <span className="text-xs text-[#6B7278]">{fmtDateTime(r.created_at)}</span>
                    </div>
                    <p className="text-sm text-[#949599] leading-relaxed whitespace-pre-wrap pl-9">{r.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply box */}
            {detail.status !== 'closed' ? (
              <form onSubmit={handleReply} className="p-4 border-t border-[#262B2F] flex gap-3">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 px-4 py-3 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-[#262B2F] text-center text-sm text-[#6B7278]">
                This ticket is closed.
              </div>
            )}

            {/* Actions */}
            {detail.status !== 'closed' && (
              <div className="px-5 pb-4">
                <button onClick={handleClose} className="text-xs text-[#6B7278] hover:text-red-400 transition">
                  Mark as resolved
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support"
        subtitle="Get help with your account, tickets, or events"
        icon={LifeBuoy}
        count={tickets.length}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading tickets..." className="py-16" />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets yet"
            description="Need help? Create a support ticket and our team will assist you."
            className="py-16"
          />
        ) : (
          <div className="divide-y divide-[#262B2F]/70">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openDetail(t)}
                className="w-full text-left px-5 py-4 hover:bg-[#1D2124] transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#242B32] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#6B7278]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-[#EFEFF1] truncate">{t.subject}</h3>
                    <Badge variant={statusVariant(t.status)} size="sm" dot>{t.status?.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#6B7278]">
                    <span>#{t.id}</span>
                    <span>·</span>
                    <Badge variant={priorityVariant(t.priority)} size="sm">{t.priority}</Badge>
                    <span>·</span>
                    <span>{fmtDate(t.created_at)}</span>
                    {t.reply_count > 0 && (
                      <>
                        <span>·</span>
                        <span>{t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Support Ticket">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#949599] mb-1.5">Subject</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief description of your issue"
              className="w-full px-4 py-3 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#949599] mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition"
              >
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#949599] mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition"
              >
                {priorities.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#949599] mb-1.5">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your issue in detail..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none transition"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition"
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
