import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy, Clock, CheckCircle2, TrendingUp, Send, ArrowUp,
  XCircle, MessageSquare, User as UserIcon, Search, Filter,
  RefreshCw, Mail, Phone, Calendar, ShoppingBag, Tag,
  FileText, Check, AlertTriangle, ShieldAlert, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSupportTickets, getSupportTicket, respondToSupportTicket,
  resolveSupportTicket, closeSupportTicket,
} from '@/api/admin';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All Tickets' },
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'ticketing', label: 'Ticketing & Passes' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'account', label: 'Account & Login' },
  { value: 'event', label: 'Event Operations' },
  { value: 'refund', label: 'Refund Request' },
  { value: 'other', label: 'Other' },
];

const priorityOptions = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const CANNED_RESPONSES = [
  {
    label: 'Under Investigation',
    text: 'Hello, thank you for contacting support. We are currently looking into this issue with our technical and operations team and will provide an update shortly.',
  },
  {
    label: 'Pass Re-sent',
    text: 'Hello! We have regenerated and re-sent your event pass and confirmation receipt to your registered email address. Please check your inbox and spam folder.',
  },
  {
    label: 'Refund Processed',
    text: 'Hello, your refund request has been approved and processed through our payment gateway. You should see the credit reflected in your account within 3–5 business days.',
  },
  {
    label: 'Need More Details',
    text: 'Hello, to help us assist you faster, could you please provide your payment transaction reference or the order ID associated with this purchase?',
  },
  {
    label: 'Issue Resolved',
    text: 'Hello, the issue you reported has been resolved. If you experience any further questions or need additional assistance, please reply directly to this ticket.',
  },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const priorityVariant = (p) => ({ urgent: 'error', high: 'warning', medium: 'info', low: 'neutral' }[p] || 'neutral');
const statusVariant = (s) => ({ open: 'pending', in_progress: 'info', resolved: 'success', closed: 'neutral' }[s] || 'neutral');

export default function SupportPage() {
  const [tab, setTab] = useState('open');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolvedToday: 0, avgResponseTime: '0m', total: 0 });

  // Detail Modal state
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [statusChange, setStatusChange] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);

  const threadEndRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        status: tab,
        page,
        limit: 12,
      };
      if (search.trim()) params.search = search.trim();
      if (category !== 'all') params.category = category;
      if (priority !== 'all') params.priority = priority;

      const res = await getSupportTickets(params);
      const d = res.data;
      setTickets(Array.isArray(d) ? d : d.tickets || d.data || []);
      setTotalPages(d.pagination?.totalPages || d.totalPages || 1);
      setTotalCount(d.pagination?.total || (Array.isArray(d) ? d.length : 0));
      if (d.stats) setStats(d.stats);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, category, priority]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, category, priority]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSearchInput('');
    setCategory('all');
    setPriority('all');
    setTab('open');
  };

  const normalizeDetail = (res, fallback) => {
    const t = res.data.ticket || res.data;
    const r = res.data.replies || [];
    return {
      ...t,
      user: t.user || fallback?.user,
      responses: r.map((rp) => ({
        ...rp,
        isAdmin: Boolean(rp.is_staff || rp.author_role === 'admin' || rp.author_role === 'system_admin' || rp.author_role === 'superadmin'),
        author: { name: rp.author_name || rp.user_name, email: rp.author_email || rp.user_email },
      })),
    };
  };

  const openDetail = async (ticket) => {
    setDetailLoading(true);
    setDetail({ ...ticket, responses: [] });
    setReply('');
    setStatusChange(ticket.status || 'open');
    setInternalNotes(ticket.internal_notes || '');
    try {
      const res = await getSupportTicket(ticket.id);
      const norm = normalizeDetail(res, ticket);
      setDetail(norm);
      setStatusChange(norm.status || 'open');
      setInternalNotes(norm.internal_notes || '');
    } catch {
      /* retain base details */
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (detail?.responses?.length && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detail?.responses]);

  const handleReply = async () => {
    if (!reply.trim() || !detail) return toast.error('Reply cannot be empty');
    setSending(true);
    try {
      await respondToSupportTicket(detail.id, {
        message: reply.trim(),
        status: statusChange !== detail.status ? statusChange : undefined,
      });
      toast.success('Reply dispatched to customer');
      setReply('');
      const res = await getSupportTicket(detail.id);
      setDetail(normalizeDetail(res, detail));
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!detail) return;
    setSavingNotes(true);
    try {
      await respondToSupportTicket(detail.id, {
        internal_notes: internalNotes,
      });
      toast.success('Internal notes updated');
      setDetail((prev) => ({ ...prev, internal_notes: internalNotes }));
    } catch (err) {
      toast.error('Failed to update internal notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChangeSubmit = async (newStatus) => {
    if (!detail || newStatus === detail.status) return;
    try {
      await respondToSupportTicket(detail.id, { status: newStatus });
      toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}`);
      setStatusChange(newStatus);
      const res = await getSupportTicket(detail.id);
      setDetail(normalizeDetail(res, detail));
      fetchTickets();
    } catch (err) {
      toast.error('Failed to update ticket status');
    }
  };

  const handleResolve = async () => {
    if (!detail) return;
    setResolving(true);
    try {
      await resolveSupportTicket(detail.id, {
        message: reply.trim() || 'This support request has been investigated and resolved by our helpdesk team.',
      });
      toast.success('Ticket marked as resolved and email sent to user');
      setReply('');
      const res = await getSupportTicket(detail.id);
      setDetail(normalizeDetail(res, detail));
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setResolving(false);
    }
  };

  const handleClose = async () => {
    if (!detail) return;
    try {
      await closeSupportTicket(detail.id);
      toast.success('Ticket closed');
      setDetail(null);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close');
    }
  };

  const handleEscalate = async () => {
    if (!detail) return;
    try {
      await respondToSupportTicket(detail.id, {
        message: '⚡ [ESCALATION] This ticket has been escalated to senior operations for priority resolution.',
        escalate: true,
      });
      toast.success('Ticket escalated to senior team');
      const res = await getSupportTicket(detail.id);
      setDetail(normalizeDetail(res, detail));
      fetchTickets();
    } catch {
      toast.error('Failed to escalate ticket');
    }
  };

  const applyCannedResponse = (text) => {
    setReply((prev) => (prev ? `${prev}\n\n${text}` : text));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LifeBuoy}
        accent="rose"
        title="Support Helpdesk"
        subtitle="Manage attendee & organizer inquiries, reply with email alerts, and track resolution metrics."
        actions={
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={LifeBuoy} label="Open Tickets" value={stats.open} />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} />
        <StatCard icon={CheckCircle2} label="Resolved Today" value={stats.resolvedToday} accent />
        <StatCard icon={TrendingUp} label="Avg Response Time" value={stats.avgResponseTime || '18m'} />
      </div>

      {/* Filters & Search Control Bar */}
      <div className="p-4 rounded-2xl bg-[#121620] border border-white/[0.08] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === t.key ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by ticket #, user name, email, or keywords..."
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
            />
            {searchInput && (
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition"
              >
                Search
              </button>
            )}
          </form>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.04] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">Filter:</span>
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-300 text-xs focus:outline-none focus:border-white/30"
            >
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value} className="bg-[#121620] text-white">
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-300 text-xs focus:outline-none focus:border-white/30"
            >
              {priorityOptions.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#121620] text-white">
                  {p.label}
                </option>
              ))}
            </select>

            {(search || category !== 'all' || priority !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05] text-[11px] transition"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-neutral-500">
            Showing <span className="text-white font-medium">{tickets.length}</span> of {totalCount} tickets
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-2xl bg-[#121620] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading tickets..." className="py-16" />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No tickets found"
            description={
              search || category !== 'all' || priority !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'No user tickets in this status tab.'
            }
            className="py-16"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-5 py-3.5 font-medium">Ticket ID</th>
                    <th className="px-5 py-3.5 font-medium">Customer</th>
                    <th className="px-5 py-3.5 font-medium">Subject & Context</th>
                    <th className="px-5 py-3.5 font-medium">Category</th>
                    <th className="px-5 py-3.5 font-medium">Priority</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 font-medium">Updated</th>
                    <th className="px-5 py-3.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => openDetail(t)}
                    >
                      {/* Ticket Ref */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-white font-semibold">
                          {t.reference || `#${String(t.id).padStart(6, '0')}`}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {(t.user?.name || t.userName || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[140px]">{t.user?.name || t.userName || 'Customer'}</p>
                            <p className="text-[10px] text-neutral-400 truncate max-w-[140px]">{t.user?.email || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Subject + Linked context */}
                      <td className="px-5 py-3.5 max-w-[260px]">
                        <p className="text-white font-medium truncate">{t.subject}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {t.reply_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
                              <MessageSquare className="w-2.5 h-2.5" /> {t.reply_count}
                            </span>
                          )}
                          {t.linked_event_title && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 truncate max-w-[140px]">
                              <Calendar className="w-2.5 h-2.5 shrink-0" /> {t.linked_event_title}
                            </span>
                          )}
                          {t.linked_order_reference && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-mono">
                              <ShoppingBag className="w-2.5 h-2.5 shrink-0" /> {t.linked_order_reference}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5">
                        <Badge variant="neutral" size="sm">
                          {t.category ? t.category.replace('_', ' ') : 'general'}
                        </Badge>
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-3.5">
                        <Badge variant={priorityVariant(t.priority)} size="sm">
                          {t.priority || 'medium'}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <Badge variant={statusVariant(t.status)} size="sm" dot>
                          {(t.status || 'open').replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Updated */}
                      <td className="px-5 py-3.5 text-xs text-neutral-400 whitespace-nowrap">
                        {fmtDate(t.updated_at || t.updatedAt || t.created_at || t.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button className="px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-xs font-semibold text-white transition">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white font-bold">
              {detail?.reference || `#${String(detail?.id || '').padStart(6, '0')}`}
            </span>
            {detail?.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldAlert className="w-3 h-3" /> URGENT
              </span>
            )}
          </div>
        }
        size="xl"
      >
        {detailLoading ? (
          <LoadingSpinner label="Loading ticket thread..." className="py-12" />
        ) : detail ? (
          <div className="space-y-4 text-xs">
            {/* Header Profile & Status Ribbon */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {(detail.user?.name || detail.userName || '?').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{detail.user?.name || detail.userName || 'Customer'}</p>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-0.5">
                    {detail.user?.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-neutral-500" /> {detail.user.email}
                      </span>
                    )}
                    {detail.user?.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-neutral-500" /> {detail.user.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Selector & Badges */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <Badge variant={priorityVariant(detail.priority)} size="sm">
                  {detail.priority || 'medium'}
                </Badge>

                <select
                  value={statusChange}
                  onChange={(e) => handleStatusChangeSubmit(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-white/30"
                >
                  <option value="open" className="bg-[#121620] text-amber-400">Status: Open</option>
                  <option value="in_progress" className="bg-[#121620] text-sky-400">Status: In Progress</option>
                  <option value="resolved" className="bg-[#121620] text-emerald-400">Status: Resolved</option>
                  <option value="closed" className="bg-[#121620] text-neutral-400">Status: Closed</option>
                </select>
              </div>
            </div>

            {/* Linked Context Cards (Event or Order) */}
            {(detail.linked_event_title || detail.linked_order_reference) && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.06]">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Linked Entity:</span>
                {detail.linked_event_title && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs">
                    <Calendar className="w-3 h-3" /> Event: {detail.linked_event_title}
                  </span>
                )}
                {detail.linked_order_reference && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-mono">
                    <ShoppingBag className="w-3 h-3" /> Order: {detail.linked_order_reference}
                    {detail.linked_order_amount && ` (₦${Number(detail.linked_order_amount).toLocaleString()})`}
                  </span>
                )}
              </div>
            )}

            {/* Original Inquiry Card */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">{detail.subject}</h3>
                <span className="text-[10px] text-neutral-500">{fmtDateTime(detail.created_at || detail.createdAt)}</span>
              </div>
              <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">{detail.message}</p>
            </div>

            {/* Internal Staff Notes */}
            <div className="p-3.5 rounded-xl bg-amber-500/[0.03] border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Internal Staff Notes (Not visible to customer)</span>
                </div>
                <button
                  onClick={handleSaveInternalNotes}
                  disabled={savingNotes}
                  className="px-2.5 py-1 rounded bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-[10px] font-semibold transition"
                >
                  {savingNotes ? 'Saving...' : 'Save Note'}
                </button>
              </div>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Log internal notes, customer call notes, or follow-up instructions..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-amber-500/20 text-xs text-amber-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400/50 resize-none"
              />
            </div>

            {/* Conversation Thread */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Conversation Thread ({detail.responses?.length || 0})
                </p>
                <span className="text-[10px] text-neutral-500">Replies automatically trigger user email alert</span>
              </div>

              <div className="space-y-3 max-h-[320px] overflow-y-auto p-1 pr-2">
                {!detail.responses || detail.responses.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-white/[0.01] border border-white/[0.04] text-neutral-400">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 text-neutral-600" />
                    No responses yet. Send the first reply below.
                  </div>
                ) : (
                  detail.responses.map((r, i) => (
                    <div key={i} className={`flex gap-3 ${r.isAdmin ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          r.isAdmin ? 'bg-white text-black' : 'bg-white/10 text-neutral-300'
                        }`}
                      >
                        {r.isAdmin ? 'AD' : (r.author?.name || 'U').slice(0, 2).toUpperCase()}
                      </div>
                      <div
                        className={`max-w-[80%] rounded-xl p-3 ${
                          r.isAdmin
                            ? 'bg-white/[0.08] border border-white/20 text-white'
                            : 'bg-white/[0.02] border border-white/[0.06] text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[11px] text-white">
                            {r.isAdmin ? (r.author?.name || 'Support Staff') : (r.author?.name || 'Customer')}
                          </span>
                          {r.isAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/20 text-white">
                              STAFF
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-400">
                            {fmtDateTime(r.created_at || r.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap">{r.message}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={threadEndRef} />
              </div>
            </div>

            {/* Quick Canned Responses */}
            {detail.status !== 'closed' && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">Quick Canned Templates:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CANNED_RESPONSES.map((cr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyCannedResponse(cr.text)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-neutral-300 hover:text-white border border-white/[0.06] text-[11px] transition"
                    >
                      {cr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Editor & Control Buttons */}
            {detail.status !== 'closed' ? (
              <div className="space-y-3 pt-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your official support response here (will be emailed to the customer)..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 resize-none transition"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleEscalate}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 text-xs font-semibold transition"
                    >
                      <ArrowUp className="w-3.5 h-3.5" /> Escalate
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.05] transition"
                    >
                      Close Ticket
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={resolving}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition disabled:opacity-50"
                    >
                      {resolving ? <LoadingSpinner size="sm" /> : <><CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved</>}
                    </button>

                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={sending || !reply.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-50"
                    >
                      {sending ? <LoadingSpinner size="sm" /> : <><Send className="w-3.5 h-3.5" /> Send Reply</>}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-neutral-400 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-500" />
                This ticket has been officially closed.
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="Ticket not found" className="py-10" />
        )}
      </Modal>
    </div>
  );
}
