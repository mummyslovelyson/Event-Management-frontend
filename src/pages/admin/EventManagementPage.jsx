import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, Search, Eye, CheckCircle2, XCircle, Ban, Trash2, Star, RotateCcw,
  Image as ImageIcon, Layers, DollarSign, MessageSquare, AlertCircle, Plus, Pencil, Ticket,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminEvents, approveEvent, rejectEvent, toggleEventFeatured,
  suspendEvent, unsuspendEvent, adminDeleteEvent, requestEventChanges,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending Review' },
  { key: 'changes_requested', label: 'Changes Requested' },
  { key: 'published', label: 'Published' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'completed', label: 'Completed' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const statusVariant = (s) => ({
  pending: 'pending', published: 'success', approved: 'success',
  suspended: 'error', completed: 'neutral', rejected: 'error',
  changes_requested: 'warning',
}[s] || 'neutral');

export default function EventManagementPage() {
  const { format } = useCurrency();
  const [tab, setTab] = useState('all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [organizerFilter, setOrganizerFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [changesTarget, setChangesTarget] = useState(null);
  const [changesReason, setChangesReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, status: tab, sort: 'newest' };
      if (search) params.search = search;
      if (category) params.category = category;
      if (organizerFilter) params.organizer = organizerFilter;
      const res = await getAdminEvents(params);
      const d = res.data;
      setEvents(Array.isArray(d) ? d : d.events || d.data || []);
      setTotalPages(d.totalPages || d.pages || 1);
      setTotal(d.total || d.count || (Array.isArray(d) ? d.length : 0));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, category, organizerFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [tab, search, category, organizerFilter]);

  const handleApprove = async (id) => {
    setActionLoading(`approve-${id}`);
    try {
      await approveEvent(id);
      toast.success('Event approved and published');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async () => {
    if (!changesTarget) return;
    if (!changesReason.trim()) {
      toast.error('Please specify what changes are needed');
      return;
    }
    setActionLoading(`changes-${changesTarget.id}`);
    try {
      await requestEventChanges(changesTarget.id, { reason: changesReason.trim() });
      toast.success('Changes requested from organizer');
      setChangesTarget(null);
      setChangesReason('');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request changes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(`reject-${rejectTarget.id}`);
    try {
      await rejectEvent(rejectTarget.id, { reason: rejectReason || 'Violates platform guidelines' });
      toast.success('Event rejected');
      setRejectTarget(null);
      setRejectReason('');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = async (ev) => {
    const next = !ev.is_featured;
    setActionLoading(`feature-${ev.id}`);
    try {
      await toggleEventFeatured(ev.id, next);
      toast.success(next ? 'Event featured on homepage' : 'Event removed from featured');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update featured status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (ev) => {
    setActionLoading(`suspend-${ev.id}`);
    try {
      await suspendEvent(ev.id);
      toast.success('Event suspended — no longer visible or bookable');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to suspend');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (ev) => {
    setActionLoading(`restore-${ev.id}`);
    try {
      await unsuspendEvent(ev.id);
      toast.success('Event restored and live again');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(`delete-${deleteTarget.id}`);
    try {
      await adminDeleteEvent(deleteTarget.id);
      toast.success('Event deleted');
      setDeleteTarget(null);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === events.length ? new Set() : new Set(events.map((e) => e.id))));
  };

  const bulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map((id) => approveEvent(id)));
      toast.success(`${selected.size} events approved`);
      setSelected(new Set());
      fetchEvents();
    } catch {
      toast.error('Bulk approve failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkReject = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map((id) => rejectEvent(id, { reason: 'Bulk rejection' })));
      toast.success(`${selected.size} events rejected`);
      setSelected(new Set());
      fetchEvents();
    } catch {
      toast.error('Bulk reject failed');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        accent="gold"
        title="Event Management &amp; Moderation"
        subtitle="Review event submissions, feature top shows, moderate listings, and monitor sales capacity."
        count={total}
        actions={
          <Link
            to="/admin/events/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#111417] hover:bg-[#CBD5E1] text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-white text-black'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#121620] border border-white/[0.08] text-xs text-neutral-300 focus:outline-none focus:border-white/30 transition"
          >
            <option value="">All Categories</option>
            <option value="music">Music</option>
            <option value="sports">Sports</option>
            <option value="tech">Tech</option>
            <option value="business">Business</option>
            <option value="arts">Arts</option>
          </select>
          <input
            type="text"
            value={organizerFilter}
            onChange={(e) => setOrganizerFilter(e.target.value)}
            placeholder="Organizer..."
            className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
          />
        </div>

        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]"
          >
            <span className="text-xs text-neutral-400 font-mono">{selected.size} selected</span>
            <button
              onClick={bulkApprove}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-40 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
            </button>
            <button
              onClick={bulkReject}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium hover:bg-rose-500/20 transition disabled:opacity-40 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject All
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-neutral-400 hover:text-white ml-auto cursor-pointer">Clear</button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#121620] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading events..." className="py-16" />
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No events found" description="Try adjusting your filters." className="py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="hidden md:table-cell px-4 py-3 font-medium w-10">
                    <input type="checkbox" checked={selected.size === events.length && events.length > 0} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-white" />
                  </th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium">Organizer</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium">Category</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium">Date</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium text-center">Tickets</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {events.map((ev) => (
                  <tr key={ev.id} className={`hover:bg-white/[0.02] transition-colors ${selected.has(ev.id) ? 'bg-white/[0.04]' : ''}`}>
                    <td className="hidden md:table-cell px-4 py-3">
                      <input type="checkbox" checked={selected.has(ev.id)} onChange={() => toggleSelect(ev.id)} className="w-4 h-4 rounded border-[#3A4045] bg-[#111417] accent-[#EFEFF1]" />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/events/${ev.id}`} className="flex items-center gap-3 group">
                        {ev.thumbnail || ev.image ? (
                          <img src={ev.thumbnail || ev.image} alt="" className="w-10 h-10 rounded-lg object-cover group-hover:opacity-80 transition" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center group-hover:bg-white/20 transition">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <span className="font-medium text-[#EFEFF1] max-w-[180px] truncate group-hover:text-white transition underline-offset-2 group-hover:underline">{ev.title}</span>
                        {ev.is_featured && <Badge variant="gold" size="sm" className="ml-2 shrink-0">Featured</Badge>}
                      </Link>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-[#949599] max-w-[140px] truncate">{ev.organizerName || ev.organizer || '—'}</td>
                    <td className="hidden md:table-cell px-4 py-3"><Badge variant="neutral" size="sm">{ev.category || '—'}</Badge></td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-[#949599]">{fmtDate(ev.startDate || ev.date)}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-center text-[#949599]">{ev.ticketsSold ?? ev.tickets ?? 0}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-right font-medium text-[#EFEFF1]">{format(ev.revenue)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 items-start">
                        <Badge variant={statusVariant(ev.status)} size="sm" dot>
                          {ev.status === 'changes_requested' ? 'Changes Requested' : (ev.status || 'pending')}
                        </Badge>
                        {ev.rejection_reason && (ev.status === 'changes_requested' || ev.status === 'rejected') && (
                          <span className="text-[11px] text-amber-400/90 max-w-[170px] truncate" title={ev.rejection_reason}>
                            {ev.rejection_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/events/${ev.id}`} className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-[#242B32] transition" title="View Event in Admin">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link to={`/organizer/tickets?event=${ev.id}`} className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-[#242B32] transition" title="Manage Event Tickets & Passes">
                          <Ticket className="w-4 h-4" />
                        </Link>
                        <Link to={`/admin/events/${ev.id}/edit`} className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-[#242B32] transition" title="Edit Event Details">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleFeatured(ev)}
                          disabled={actionLoading === `feature-${ev.id}`}
                          className={`p-2 rounded-lg transition disabled:opacity-50 ${ev.is_featured ? 'text-white hover:bg-white/10' : 'text-[#949599] hover:text-white hover:bg-[#242B32]'}`}
                          title={ev.is_featured ? 'Remove from featured' : 'Feature on homepage'}
                        >
                          <Star className="w-4 h-4" fill={ev.is_featured ? 'currentColor' : 'none'} />
                        </button>
                        {(ev.status === 'pending' || ev.status === 'changes_requested') && (
                          <button
                            onClick={() => handleApprove(ev.id)}
                            disabled={actionLoading === `approve-${ev.id}`}
                            className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                            title="Approve & Publish"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {(ev.status === 'pending' || ev.status === 'changes_requested') && (
                          <button
                            onClick={() => { setChangesTarget(ev); setChangesReason(ev.rejection_reason || ''); }}
                            className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-[#242B32] transition"
                            title="Request Changes"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        {ev.status !== 'rejected' && (
                          <button
                            onClick={() => { setRejectTarget(ev); setRejectReason(''); }}
                            className="p-2 rounded-lg text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {ev.status === 'published' && (
                          <button
                            onClick={() => handleSuspend(ev)}
                            disabled={actionLoading === `suspend-${ev.id}`}
                            className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-[#242B32] transition disabled:opacity-50"
                            title="Suspend"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {ev.status === 'suspended' && (
                          <button
                            onClick={() => handleRestore(ev)}
                            disabled={actionLoading === `restore-${ev.id}`}
                            className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(ev)}
                          className="p-2 rounded-lg text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && events.length > 0 && (
          <div className="px-5 py-4 border-t border-[#494F55]/20 flex items-center justify-between">
            <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Request Changes Modal */}
      <Modal
        open={!!changesTarget}
        onClose={() => setChangesTarget(null)}
        title="Request Changes from Organizer"
        footer={
          <>
            <button onClick={() => setChangesTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleRequestChanges}
              disabled={actionLoading === `changes-${changesTarget?.id}`}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
            >
              Send Request
            </button>
          </>
        }
      >
        <p className="text-sm text-[#EFEFF1]">Request changes for <span className="font-semibold">{changesTarget?.title}</span></p>
        <p className="text-xs text-[#949599] mt-1">Specify what the organizer needs to modify before this event can be approved and published.</p>
        <textarea
          value={changesReason}
          onChange={(e) => setChangesReason(e.target.value)}
          placeholder="Describe the required updates or modifications needed before approval..."
          className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none"
          rows={4}
        />
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Event"
        footer={
          <>
            <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleReject}
              disabled={actionLoading === `reject-${rejectTarget?.id}`}
              className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              Reject Event
            </button>
          </>
        }
      >
        <p className="text-sm text-[#EFEFF1]">You are rejecting <span className="font-semibold">{rejectTarget?.title}</span></p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection (sent to organizer)..."
          className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none"
          rows={4}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Event"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === `delete-${deleteTarget?.id}`}
              className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              Delete
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[#EFEFF1]">Permanently delete <span className="font-semibold">{deleteTarget?.title}</span>?</p>
            <p className="text-xs text-[#949599] mt-1">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
