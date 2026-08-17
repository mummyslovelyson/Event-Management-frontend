import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LifeBuoy, Clock, CheckCircle2, TrendingUp, Send, ArrowUp,
  XCircle, MessageSquare, User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSupportTickets, getSupportTicket, respondToSupportTicket, closeSupportTicket,
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
  { key: 'all', label: 'All' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const priorityVariant = (p) => ({ high: 'error', medium: 'warning', low: 'info' }[p] || 'neutral');
const statusVariant = (s) => ({ open: 'pending', in_progress: 'info', resolved: 'success', closed: 'neutral' }[s] || 'neutral');

export default function SupportPage() {
  const [tab, setTab] = useState('open');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolvedToday: 0, avgResponseTime: '0m' });
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSupportTickets({ status: tab, page, limit: 10 });
      const d = res.data;
      setTickets(Array.isArray(d) ? d : d.tickets || d.data || []);
      setTotalPages(d.totalPages || d.pages || 1);
      if (d.stats) setStats(d.stats);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { setPage(1); }, [tab]);

  const openDetail = async (ticket) => {
    setDetailLoading(true);
    setDetail(ticket);
    setReply('');
    try {
      const res = await getSupportTicket(ticket.id);
      setDetail(res.data);
    } catch {
      /* keep basic */
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !detail) return toast.error('Reply cannot be empty');
    setSending(true);
    try {
      await respondToSupportTicket(detail.id, { message: reply });
      toast.success('Reply sent');
      setReply('');
      const res = await getSupportTicket(detail.id);
      setDetail(res.data);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
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
      await respondToSupportTicket(detail.id, { message: '[ESCALATED] Ticket escalated to senior support', escalate: true });
      toast.success('Ticket escalated');
      const res = await getSupportTicket(detail.id);
      setDetail(res.data);
      fetchTickets();
    } catch {
      toast.error('Failed to escalate');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LifeBuoy}
        accent="rose"
        title="Support Center"
        subtitle="User questions and issues, all in one inbox."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={LifeBuoy} label="Open" value={stats.open} />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} />
        <StatCard icon={CheckCircle2} label="Resolved Today" value={stats.resolvedToday} accent />
        <StatCard icon={TrendingUp} label="Avg Response" value={stats.avgResponseTime || '0m'} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading tickets..." className="py-16" />
        ) : tickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No tickets in this view" description="Tickets from users will show up here." className="py-16" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                    <th className="px-5 py-3 font-medium">Ticket ID</th>
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Priority</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/70">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1D2124] transition-colors cursor-pointer" onClick={() => openDetail(t)}>
                      <td className="px-5 py-3 font-mono text-xs text-[#EFEFF1]">#{String(t.id ?? '').slice(-6) || t.reference}</td>
                      <td className="px-5 py-3 text-[#EFEFF1]">{t.user?.name || t.userName || '—'}</td>
                      <td className="px-5 py-3 text-[#EFEFF1] max-w-[200px] truncate">{t.subject}</td>
                      <td className="px-5 py-3"><Badge variant="neutral" size="sm">{t.category || '—'}</Badge></td>
                      <td className="px-5 py-3"><Badge variant={priorityVariant(t.priority)} size="sm">{t.priority || 'low'}</Badge></td>
                      <td className="px-5 py-3"><Badge variant={statusVariant(t.status)} size="sm" dot>{(t.status || 'open').replace('_', ' ')}</Badge></td>
                      <td className="px-5 py-3 text-xs text-[#949599]">{fmtDate(t.createdAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-xs font-medium text-white hover:underline">View</button>
                      </td>
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

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Ticket #${String(detail?.id ?? '').slice(-6) || detail?.reference || ''}`}
        size="xl"
        footer={
          detail && detail.status !== 'closed' && detail.status !== 'resolved' ? (
            <>
              <button onClick={handleEscalate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/25 transition">
                <ArrowUp className="w-4 h-4" /> Escalate
              </button>
              <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Close Ticket</button>
            </>
          ) : null
        }
      >
        {detailLoading ? (
          <LoadingSpinner label="Loading ticket..." className="py-10" />
        ) : detail ? (
          <div className="space-y-4">
            {/* User info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20">
              <div className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-bold">
                {(detail.user?.name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#EFEFF1]">{detail.user?.name || detail.userName}</p>
                <p className="text-xs text-[#949599]">{detail.user?.email || '—'}</p>
              </div>
              <Badge variant={priorityVariant(detail.priority)} size="sm">{detail.priority}</Badge>
              <Badge variant={statusVariant(detail.status)} size="sm" dot>{(detail.status || 'open').replace('_', ' ')}</Badge>
            </div>

            {/* Subject + message */}
            <div className="p-4 rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20">
              <h3 className="font-semibold text-[#EFEFF1]">{detail.subject}</h3>
              <p className="text-sm text-[#949599] mt-2 leading-relaxed">{detail.message || detail.description}</p>
              <p className="text-xs text-[#494F55] mt-2">{fmtDateTime(detail.createdAt)}</p>
            </div>

            {/* Thread */}
            {detail.responses && detail.responses.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Conversation</p>
                {detail.responses.map((r, i) => (
                  <div key={i} className={`flex gap-3 ${r.isAdmin ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${r.isAdmin ? 'bg-white/10 text-white' : 'bg-[#494F55]/30 text-[#9AA1A6]'}`}>
                      {r.isAdmin ? 'AD' : (r.author?.name || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] rounded-lg p-3 ${r.isAdmin ? 'bg-white/10 border border-white/20' : 'bg-[#1C232B]/50 border border-[#494F55]/20'}`}>
                      <p className="text-sm text-[#EFEFF1]">{r.message}</p>
                      <p className="text-xs text-[#494F55] mt-1">{fmtDateTime(r.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply */}
            {detail.status !== 'closed' && detail.status !== 'resolved' && (
              <div className="pt-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleReply}
                    disabled={sending || !reply.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50"
                  >
                    {sending ? <LoadingSpinner size="sm" /> : <><Send className="w-4 h-4" /> Send Reply</>}
                  </button>
                </div>
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
