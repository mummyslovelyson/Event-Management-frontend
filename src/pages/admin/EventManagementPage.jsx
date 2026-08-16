import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, Search, Eye, CheckCircle2, XCircle, Ban, Trash2, Star, RotateCcw,
  Image as ImageIcon, Layers, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminEvents, approveEvent, rejectEvent, toggleEventFeatured,
  suspendEvent, unsuspendEvent, adminDeleteEvent,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'published', label: 'Published' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'completed', label: 'Completed' },
];

const ghc = (n) => `₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const statusVariant = (s) => ({
  pending: 'pending', published: 'success', approved: 'success',
  suspended: 'error', completed: 'neutral', rejected: 'error',
}[s] || 'neutral');

export default function EventManagementPage() {
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
      toast.success('Event approved');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
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
        title="Event Management"
        subtitle="Review, approve, and moderate every event."
        count={total}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-[#D4AF37] text-[#1E252B]' : 'text-[#7D8387] hover:text-[#F2F4F5] hover:bg-[#242B32]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] focus:outline-none focus:border-[#D4AF37]/60 transition"
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
            className="px-4 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
          />
        </div>

        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mt-3 pt-3 border-t border-[#494F55]/20"
          >
            <span className="text-sm text-[#D4AF37]">{selected.size} selected</span>
            <button
              onClick={bulkApprove}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve All
            </button>
            <button
              onClick={bulkReject}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject All
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-[#7D8387] hover:text-[#F2F4F5] ml-auto">Clear</button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading events..." className="py-16" />
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No events found" description="Try adjusting your filters." className="py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                  <th className="px-4 py-3.5 font-medium w-10">
                    <input type="checkbox" checked={selected.size === events.length && events.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[#3A4045] bg-[#111417] accent-[#D4AF37]" />
                  </th>
                  <th className="px-4 py-3.5 font-medium">Event</th>
                  <th className="px-4 py-3.5 font-medium">Organizer</th>
                  <th className="px-4 py-3.5 font-medium">Category</th>
                  <th className="px-4 py-3.5 font-medium">Date</th>
                  <th className="px-4 py-3.5 font-medium text-center">Tickets</th>
                  <th className="px-4 py-3.5 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B2F]/70">
                {events.map((ev) => (
                  <tr key={ev.id} className={`hover:bg-[#1D2124] transition-colors ${selected.has(ev.id) ? 'bg-[#D4AF37]/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(ev.id)} onChange={() => toggleSelect(ev.id)} className="w-4 h-4 rounded border-[#3A4045] bg-[#111417] accent-[#D4AF37]" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {ev.thumbnail || ev.image ? (
                          <img src={ev.thumbnail || ev.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <span className="font-medium text-[#F2F4F5] max-w-[180px] truncate">{ev.title}</span>
                        {ev.is_featured && <Badge variant="gold" size="sm" className="ml-2 shrink-0">Featured</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#7D8387] max-w-[140px] truncate">{ev.organizerName || ev.organizer || '—'}</td>
                    <td className="px-4 py-3"><Badge variant="neutral" size="sm">{ev.category || '—'}</Badge></td>
                    <td className="px-4 py-3 text-xs text-[#7D8387]">{fmtDate(ev.startDate || ev.date)}</td>
                    <td className="px-4 py-3 text-center text-[#7D8387]">{ev.ticketsSold ?? ev.tickets ?? 0}</td>
                    <td className="px-4 py-3 text-right font-medium text-[#F2F4F5]">{ghc(ev.revenue)}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(ev.status)} size="sm" dot>{ev.status || 'pending'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`/events/${ev.id}`} className="p-1.5 rounded-md text-[#7D8387] hover:text-[#F2F4F5] hover:bg-[#494F55]/30 transition" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleFeatured(ev)}
                          disabled={actionLoading === `feature-${ev.id}`}
                          className={`p-1.5 rounded-md transition disabled:opacity-50 ${ev.is_featured ? 'text-[#D4AF37] hover:bg-[#D4AF37]/15' : 'text-[#7D8387] hover:text-[#D4AF37] hover:bg-[#494F55]/30'}`}
                          title={ev.is_featured ? 'Remove from featured' : 'Feature on homepage'}
                        >
                          <Star className="w-4 h-4" fill={ev.is_featured ? 'currentColor' : 'none'} />
                        </button>
                        {ev.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(ev.id)}
                            disabled={actionLoading === `approve-${ev.id}`}
                            className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/15 transition disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {ev.status !== 'rejected' && (
                          <button
                            onClick={() => { setRejectTarget(ev); setRejectReason(''); }}
                            className="p-1.5 rounded-md text-red-400 hover:bg-red-500/15 transition"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {ev.status === 'published' && (
                          <button
                            onClick={() => handleSuspend(ev)}
                            disabled={actionLoading === `suspend-${ev.id}`}
                            className="p-1.5 rounded-md text-amber-400 hover:bg-amber-500/15 transition disabled:opacity-50"
                            title="Suspend"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        {ev.status === 'suspended' && (
                          <button
                            onClick={() => handleRestore(ev)}
                            disabled={actionLoading === `restore-${ev.id}`}
                            className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/15 transition disabled:opacity-50"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(ev)}
                          className="p-1.5 rounded-md text-red-400 hover:bg-red-500/15 transition"
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
            <span className="text-xs text-[#7D8387]">Page {page} of {totalPages}</span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Event"
        footer={
          <>
            <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#7D8387] hover:text-[#F2F4F5] transition">Cancel</button>
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
        <p className="text-sm text-[#F2F4F5]">You are rejecting <span className="font-semibold">{rejectTarget?.title}</span></p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection (sent to organizer)..."
          className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 resize-none"
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
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#7D8387] hover:text-[#F2F4F5] transition">Cancel</button>
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
            <p className="text-sm text-[#F2F4F5]">Permanently delete <span className="font-semibold">{deleteTarget?.title}</span>?</p>
            <p className="text-xs text-[#7D8387] mt-1">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
