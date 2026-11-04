import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy, Plus, Send, ArrowLeft, Clock, CheckCircle2,
  AlertCircle, MessageSquare, X, Search, Calendar, ShoppingBag,
  Sparkles, HelpCircle, ChevronRight, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createSupportTicket, getMySupportTickets, getMySupportTicket,
  replyToSupportTicket, closeMySupportTicket,
} from '@/api/support';
import { getOrders } from '@/api/orders';
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
  { value: 'general', label: 'General Inquiry' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'ticketing', label: 'Ticketing & Passes' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'account', label: 'Account & Login' },
  { value: 'event', label: 'Event Operations' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'other', label: 'Other' },
];

const priorities = [
  { value: 'low', label: 'Low (General question)' },
  { value: 'medium', label: 'Medium (Standard request)' },
  { value: 'high', label: 'High (Upcoming event issue)' },
  { value: 'urgent', label: 'Urgent (Event today / payment glitch)' },
];

const FAQ_SUGGESTIONS = [
  {
    keywords: ['refund', 'money back', 'cancel', 'return', 'reversed'],
    title: 'How do ticket refunds work?',
    answer: 'Refund eligibility depends on the organizer\'s policy for each event. If eligible, refund requests can be reviewed up to 24–48 hours before the event starts. Approved refunds reflect back into your account in 3–5 business days.',
  },
  {
    keywords: ['pass', 'qr', 'download', 'lost ticket', 'email ticket', 'barcode', 'access pass'],
    title: 'Where can I find my ticket QR code pass?',
    answer: 'All your tickets and passes are permanently saved in your account! Navigate to your "Tickets & Passes" tab in the dashboard to view QR codes or download PDF passes anytime.',
  },
  {
    keywords: ['transfer', 'resell', 'resale', 'sell ticket', 'give to friend'],
    title: 'Can I resell or transfer my ticket?',
    answer: 'Yes! Go to your Tickets tab, select the ticket you wish to transfer, and choose "Transfer Pass" to send it to a friend\'s email or list it securely on the official Resale Marketplace.',
  },
  {
    keywords: ['pay', 'payment', 'charge', 'debit', 'paystack', 'failed transaction', 'card'],
    title: 'Payment deducted but ticket not showing?',
    answer: 'Banks can occasionally delay payment callbacks by 1–2 minutes. Check your email inbox for payment confirmation. If your pass has not arrived after 5 minutes, link your Order Reference below and submit.',
  },
  {
    keywords: ['organizer', 'payout', 'event approval', 'sales revenue', 'moderation'],
    title: 'Organizer payouts & moderation timelines',
    answer: 'New event submissions undergo safety & compliance review within 1–2 business hours. Ticket sales revenue is reconciled and released directly to your verified bank account after event completion.',
  },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const statusVariant = (s) => ({ open: 'pending', in_progress: 'info', resolved: 'success', closed: 'neutral' }[s] || 'neutral');
const priorityVariant = (p) => ({ urgent: 'error', high: 'warning', medium: 'info', low: 'neutral' }[p] || 'neutral');

export default function SupportPage() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
    orderId: '',
  });
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // FAQ matching
  const [matchedFaq, setMatchedFaq] = useState(null);

  // Detail view state
  const [detail, setDetail] = useState(null);
  const [replies, setReplies] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: tab === 'all' ? undefined : tab,
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();

      const res = await getMySupportTickets(params);
      const d = res.data;
      setTickets(d.tickets || []);
      setTotalPages(d.pagination?.totalPages || 1);
    } catch {
      toast.error('Failed to load your support tickets');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [replies]);

  // Load user orders for linking in modal
  useEffect(() => {
    if (showCreate) {
      setLoadingOrders(true);
      getOrders({ limit: 12 })
        .then((res) => {
          const list = res.data?.orders || res.data?.data || res.data || [];
          setUserOrders(Array.isArray(list) ? list : []);
        })
        .catch(() => setUserOrders([]))
        .finally(() => setLoadingOrders(false));
    }
  }, [showCreate]);

  // Dynamic FAQ match check
  useEffect(() => {
    const text = `${form.subject} ${form.message}`.toLowerCase();
    if (!text.trim() || text.length < 4) {
      setMatchedFaq(null);
      return;
    }
    const match = FAQ_SUGGESTIONS.find((faq) =>
      faq.keywords.some((kw) => text.includes(kw))
    );
    setMatchedFaq(match || null);
  }, [form.subject, form.message]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Please enter both subject and details of your request');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        subject: form.subject.trim(),
        message: form.message.trim(),
        category: form.category,
        priority: form.priority,
        orderId: form.orderId ? Number(form.orderId) : undefined,
      };
      await createSupportTicket(payload);
      toast.success('Ticket submitted! An email confirmation has been dispatched.');
      setShowCreate(false);
      setForm({ subject: '', message: '', category: 'general', priority: 'medium', orderId: '' });
      setMatchedFaq(null);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit support ticket');
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
      toast.error('Failed to load conversation history');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !detail) return;
    setSending(true);
    try {
      await replyToSupportTicket(detail.id, { message: replyText.trim() });
      setReplies((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: replyText.trim(),
          is_staff: false,
          user_name: 'You',
          user_role: 'user',
          created_at: new Date().toISOString(),
        },
      ]);
      setReplyText('');
      toast.success('Reply submitted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!detail) return;
    try {
      await closeMySupportTicket(detail.id);
      setDetail((prev) => ({ ...prev, status: 'resolved' }));
      toast.success('Ticket marked as resolved');
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close ticket');
    }
  };

  // Detail View
  if (detail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDetail(null)}
              className="p-2.5 rounded-xl text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#EFEFF1] truncate">{detail.subject}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#949599]">
                <span className="font-mono text-white font-semibold">
                  {detail.reference || `#${String(detail.id).padStart(6, '0')}`}
                </span>
                <span>·</span>
                <Badge variant={statusVariant(detail.status)} size="sm" dot>
                  {detail.status?.replace('_', ' ')}
                </Badge>
                <span>·</span>
                <Badge variant={priorityVariant(detail.priority)} size="sm">
                  {detail.priority}
                </Badge>
              </div>
            </div>
          </div>

          {detail.status !== 'closed' && detail.status !== 'resolved' && (
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition"
            >
              <Check className="w-3.5 h-3.5" /> Mark Resolved
            </button>
          )}
        </div>

        {detailLoading ? (
          <LoadingSpinner label="Loading conversation thread..." className="py-16" />
        ) : (
          <div className="rounded-2xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
            {/* Original message */}
            <div className="p-5 border-b border-[#262B2F] bg-white/[0.01]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#242B32] flex items-center justify-center text-xs font-bold text-[#EFEFF1]">
                    {(detail.user_name || 'You')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#EFEFF1]">You (Inquiry Author)</p>
                    <p className="text-[11px] text-[#6B7278]">{fmtDateTime(detail.created_at)}</p>
                  </div>
                </div>

                <Badge variant="neutral" size="sm">
                  {categories.find((c) => c.value === detail.category)?.label || detail.category}
                </Badge>
              </div>

              <p className="text-sm text-[#EFEFF1] leading-relaxed whitespace-pre-wrap">{detail.message}</p>

              {/* Linked entity tags */}
              {(detail.linked_event_title || detail.linked_order_reference) && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#262B2F]/60 text-xs">
                  <span className="text-[11px] font-semibold text-[#949599] uppercase tracking-wider">Linked:</span>
                  {detail.linked_event_title && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs">
                      <Calendar className="w-3.5 h-3.5" /> {detail.linked_event_title}
                    </span>
                  )}
                  {detail.linked_order_reference && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-mono">
                      <ShoppingBag className="w-3.5 h-3.5" /> Order: {detail.linked_order_reference}
                      {detail.linked_order_amount && ` (₦${Number(detail.linked_order_amount).toLocaleString()})`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Conversation thread */}
            <div ref={threadRef} className="max-h-[420px] overflow-y-auto p-4 space-y-3">
              {replies.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#6B7278]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#494F55]" />
                  No staff replies yet. Our support team is investigating and will get back to you shortly.
                </div>
              ) : (
                replies.map((r) => {
                  const isStaff = Boolean(r.is_staff || r.user_role === 'admin' || r.user_role === 'system_admin');
                  return (
                    <div
                      key={r.id}
                      className={`flex gap-3 ${isStaff ? 'bg-[#1C232B]/80 border border-white/10' : 'bg-[#171A1D] border border-[#262B2F]'} p-4 rounded-xl`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isStaff ? 'bg-white text-black' : 'bg-[#242B32] text-[#949599]'
                        }`}
                      >
                        {isStaff ? 'ST' : (r.user_name || 'U')[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-[#EFEFF1]">
                            {isStaff ? 'Customer Support Staff' : (r.user_name || 'You')}
                          </span>
                          {isStaff && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/20 text-white">
                              STAFF
                            </span>
                          )}
                          <span className="text-[10px] text-[#6B7278]">{fmtDateTime(r.created_at)}</span>
                        </div>
                        <p className="text-xs text-[#EFEFF1] leading-relaxed whitespace-pre-wrap">{r.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Box */}
            {detail.status !== 'closed' ? (
              <form onSubmit={handleReply} className="p-4 border-t border-[#262B2F] flex gap-3">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to support..."
                  className="flex-1 px-4 py-3 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition shrink-0"
                >
                  {sending ? <LoadingSpinner size="sm" /> : <><Send className="w-4 h-4" /> Send Reply</>}
                </button>
              </form>
            ) : (
              <div className="p-4 border-t border-[#262B2F] text-center text-sm text-[#6B7278] flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                This ticket has been marked as resolved and closed.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Tickets List View
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support"
        subtitle="Submit inquiries, link order transactions, and receive real-time email updates from support."
        icon={LifeBuoy}
        count={tickets.length}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Support Ticket
          </button>
        }
      />

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#171A1D] border border-[#262B2F] rounded-xl overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-white text-black shadow-sm' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7278]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your tickets..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#6B7278] focus:outline-none focus:border-white/30 transition"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="rounded-2xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading tickets..." className="py-16" />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title={search ? 'No matching tickets' : 'No tickets in this view'}
            description={
              search
                ? 'Try a different keyword or reference code.'
                : 'Need assistance with a pass, payment, or event? Open a ticket anytime.'
            }
            className="py-16"
          />
        ) : (
          <div className="divide-y divide-[#262B2F]/70">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => openDetail(t)}
                className="w-full text-left px-5 py-4 hover:bg-[#1D2124] transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#242B32] flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-5 h-5 text-[#949599]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#EFEFF1] truncate">{t.subject}</h3>
                      <Badge variant={statusVariant(t.status)} size="sm" dot>
                        {t.status?.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#6B7278]">
                      <span className="font-mono text-[#EFEFF1] font-medium">
                        {t.reference || `#${String(t.id).padStart(6, '0')}`}
                      </span>
                      <span>·</span>
                      <Badge variant={priorityVariant(t.priority)} size="sm">
                        {t.priority}
                      </Badge>
                      <span>·</span>
                      <span>{fmtDate(t.created_at)}</span>
                      {t.reply_count > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-white font-medium">
                            {t.reply_count} {t.reply_count === 1 ? 'reply' : 'replies'}
                          </span>
                        </>
                      )}
                      {t.linked_event_title && (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <Calendar className="w-3 h-3" /> {t.linked_event_title}
                        </span>
                      )}
                      {t.linked_order_reference && (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-mono">
                          <ShoppingBag className="w-3 h-3" /> {t.linked_order_reference}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center text-xs text-[#949599]">
                  <ChevronRight className="w-4 h-4" />
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

      {/* Create Ticket Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Support Ticket" size="lg">
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#949599] mb-1.5">Subject</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief summary of your question or issue (e.g. Pass not received, Refund inquiry)..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
              maxLength={200}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#949599] mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-xs text-[#EFEFF1] focus:outline-none focus:border-white/50 transition"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#171A1D] text-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#949599] mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-xs text-[#EFEFF1] focus:outline-none focus:border-white/50 transition"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[#171A1D] text-white">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Order Linking */}
          {userOrders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#949599] mb-1.5">
                Link Recent Order Pass (Optional)
              </label>
              <select
                value={form.orderId}
                onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-xs text-[#EFEFF1] focus:outline-none focus:border-white/50 transition font-mono"
              >
                <option value="" className="bg-[#171A1D] text-neutral-400">
                  -- None / Not related to a specific order --
                </option>
                {userOrders.map((ord) => (
                  <option key={ord.id} value={ord.id} className="bg-[#171A1D] text-white">
                    {ord.payment_reference || `Order #${ord.id}`} — {ord.event_title || 'Event Pass'} (₦{Number(ord.total_amount || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Instant FAQ Suggestion Banner */}
          {matchedFaq && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Answer Suggestion: {matchedFaq.title}</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">{matchedFaq.answer}</p>
              <p className="text-[10px] text-amber-400/80">Still have questions? Feel free to submit your ticket below.</p>
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#949599] mb-1.5">Message / Details</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your issue or inquiry in detail..."
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none transition"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#949599] hover:text-[#EFEFF1] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
