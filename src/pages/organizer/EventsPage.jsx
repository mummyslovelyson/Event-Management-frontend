import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, LayoutGrid, List, Edit2, Eye, Send, EyeOff, Trash2,
  CalendarDays, MapPin, Ticket as TicketIcon, DollarSign, MoreVertical,
  Clock, AlertTriangle, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents, deleteEvent, publishEvent, unpublishEvent, getCategories } from '@/api/events';
import { useCurrency } from '@/context/CurrencyContext';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const statusVariant = (s) => {
  const map = {
    draft: 'neutral', pending: 'pending', published: 'success',
    changes_requested: 'warning',
    rejected: 'error', cancelled: 'error', suspended: 'warning', completed: 'info',
    active: 'success', upcoming: 'pending', past: 'neutral',
  };
  return map[(s || '').toLowerCase()] || 'neutral';
};

const TABS = ['All', 'Draft', 'Pending', 'Changes Requested', 'Published', 'Rejected', 'Cancelled', 'Completed'];

export default function EventsPage() {
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('All');
  const [view, setView] = useState('table'); // table | grid
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      if (tab !== 'All') params.status = tab.toLowerCase().replace(/ /g, '_');
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await getOrganizerEvents(params);
      const payload = res.data;
      setEvents(Array.isArray(payload) ? payload : payload.events || payload.data || []);
      setTotalPages(payload.totalPages || payload.pages || Math.ceil((payload.total || 0) / 9) || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [tab, search, category, page]);

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => { setPage(1); }, [tab, search, category]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEvent(deleteTarget.id);
      toast.success('Event deleted');
      setDeleteTarget(null);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  const togglePublish = async (e) => {
    try {
      if (e.status === 'published') {
        await unpublishEvent(e.id);
        toast.success('Event unpublished and returned to draft');
      } else if (e.status === 'pending') {
        toast('This event is already submitted and awaiting admin review.', { icon: '⏳' });
        return;
      } else {
        await publishEvent(e.id);
        toast.success(e.status === 'changes_requested' ? 'Event resubmitted for admin review!' : 'Event submitted for admin review!');
      }
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update event');
    }
  };

  return (
    <div className="space-y-5" onClick={() => setMenuOpenId(null)}>
      <PageHeader
        icon={CalendarDays}
        accent="gold"
        title="My Events"
        subtitle="Create, edit, and manage all your events."
        actions={
          <Link
            to="/organizer/events/create"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Event
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id || c} value={c.id || c.name || c}>{c.name || c}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#171A1D] border border-[#494F55]/40">
          <button
            onClick={() => setView('table')}
            className={`p-2 rounded-md transition-colors ${view === 'table' ? 'bg-white/10 text-white' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-white/10 text-white' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#262B2F]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? 'text-white' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner label="Loading events..." className="py-20" />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events found"
          description="Try adjusting your filters or create a new event."
          className="py-16"
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onEdit={() => navigate(`/organizer/events/${e.id}/edit`)}
              onManageTickets={() => navigate(`/organizer/tickets?event=${e.id}`)}
              onView={() => navigate(`/events/${e.id}`)}
              onTogglePublish={() => togglePublish(e)}
              onDelete={() => setDeleteTarget(e)}
              onViewFeedback={(target) => setFeedbackTarget(target)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                <th className="px-5 py-3 font-medium">Event</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Venue</th>
                <th className="px-5 py-3 font-medium text-center">Tickets</th>
                <th className="px-5 py-3 font-medium text-right">Revenue</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262B2F]/70">
              {events.map((e) => {
                const sold = e.ticketsSold || 0;
                const cap = e.totalCapacity || e.capacity || 0;
                return (
                  <tr key={e.id} className="hover:bg-[#1D2124] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={e.banner_image || e.thumbnail || `https://picsum.photos/seed/${e.id}/80/80`} alt="" className="w-11 h-11 rounded-lg object-cover bg-[#242B32]" />
                        <span className="font-medium text-[#EFEFF1] max-w-[180px] truncate">{e.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#949599]">{e.category?.name || e.category || '—'}</td>
                    <td className="px-5 py-3 text-[#949599]">{e.startDate ? new Date(e.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td className="px-5 py-3 text-[#949599] max-w-[140px] truncate">{e.venue || e.city || '—'}</td>
                    <td className="px-5 py-3 text-center text-[#949599]">{sold}/{cap}</td>
                    <td className="px-5 py-3 text-right font-medium text-[#EFEFF1]">{format(e.revenue)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={statusVariant(e.status)} size="sm">
                          {e.status === 'changes_requested' ? 'Changes Requested' : e.status}
                        </Badge>
                        {(e.status === 'changes_requested' || (e.status === 'rejected' && e.rejection_reason)) && (
                          <button
                            type="button"
                            onClick={(ev) => { ev.stopPropagation(); setFeedbackTarget(e); }}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2 transition"
                          >
                            <MessageSquare className="w-3 h-3" /> View Feedback
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={() => navigate(`/organizer/events/${e.id}/edit`)} className="p-2.5 rounded-md text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition" title="Edit Event"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => navigate(`/organizer/tickets?event=${e.id}`)} className="p-2.5 rounded-md text-[#949599] hover:text-amber-400 hover:bg-amber-400/10 transition" title="Manage & Upload Tickets"><TicketIcon className="w-4 h-4" /></button>
                        <button onClick={() => navigate(`/events/${e.id}`)} className="p-2.5 rounded-md text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition" title="View Public Page"><Eye className="w-4 h-4" /></button>
                        {e.status === 'published' ? (
                          <button onClick={() => togglePublish(e)} className="p-2.5 rounded-md text-[#949599] hover:text-white hover:bg-[#494F55]/30 transition" title="Unpublish (Return to Draft)">
                            <EyeOff className="w-4 h-4" />
                          </button>
                        ) : e.status === 'pending' ? (
                          <button onClick={() => togglePublish(e)} className="p-2.5 rounded-md text-blue-400 hover:bg-blue-500/10 transition" title="Awaiting Admin Review">
                            <Clock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => togglePublish(e)} className={`p-2.5 rounded-md transition ${e.status === 'changes_requested' ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title={e.status === 'changes_requested' ? 'Resubmit for Review' : 'Submit for Review'}>
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(e)} className="p-2.5 rounded-md text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && events.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Event"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-3 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition">{deleting ? 'Deleting...' : 'Delete'}</button>
          </>
        }
      >
        <p className="text-sm text-[#949599] leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-[#EFEFF1]">{deleteTarget?.title}</span>? This action cannot be undone, and all associated ticket types and orders will be affected.
        </p>
      </Modal>

      {/* Admin Feedback Modal */}
      <Modal
        open={!!feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        title={feedbackTarget?.status === 'changes_requested' ? 'Admin Requested Changes' : 'Event Moderation Feedback'}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => {
                const targetId = feedbackTarget?.id;
                setFeedbackTarget(null);
                navigate(`/organizer/events/${targetId}/edit`);
              }}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-black hover:bg-[#CBD5E1] transition cursor-pointer"
            >
              Edit &amp; Fix Event
            </button>
            <button
              onClick={() => setFeedbackTarget(null)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition cursor-pointer"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#EFEFF1]">
            Moderation feedback for <span className="font-semibold text-white">{feedbackTarget?.title}</span>:
          </p>
          <div className="p-3.5 rounded-xl bg-[#1C232B] border border-amber-500/30 text-amber-200 text-sm leading-relaxed whitespace-pre-wrap">
            {feedbackTarget?.rejection_reason || 'No specific notes were left by the moderation team. Please ensure event details and banner meet platform requirements before resubmitting.'}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function EventCard({ event, onEdit, onManageTickets, onView, onTogglePublish, onDelete, onViewFeedback }) {
  const [menu, setMenu] = useState(false);
  const sold = event.ticketsSold || 0;
  const cap = event.totalCapacity || event.capacity || 0;
  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
  const publishActionLabel =
    event.status === 'published' ? 'Unpublish' :
    event.status === 'pending' ? 'Awaiting Review' :
    event.status === 'changes_requested' ? 'Resubmit for Review' : 'Submit for Review';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden hover:border-[#3A4045] hover:shadow-lg hover:shadow-black/20 transition-all group"
    >
      <div className="relative h-36 bg-[#242B32]">
        <img src={event.banner_image || `https://picsum.photos/seed/${event.id}/400/200`} alt="" className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <Badge variant={statusVariant(event.status)} size="sm">
            {event.status === 'changes_requested' ? 'Changes Requested' : event.status}
          </Badge>
          {(event.status === 'changes_requested' || (event.status === 'rejected' && event.rejection_reason)) && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewFeedback?.(event); }}
              className="p-1 rounded-md bg-amber-500/90 text-black hover:bg-amber-400 transition"
              title="View Admin Feedback"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} className="p-2.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition"><MoreVertical className="w-4 h-4" /></button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 mt-1 w-48 rounded-lg bg-[#171A1D] border border-[#494F55]/40 shadow-xl py-1 z-10">
                  <button onClick={() => { setMenu(false); onEdit(); }} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/20"><Edit2 className="w-4 h-4" /> Edit Event</button>
                  <button onClick={() => { setMenu(false); onManageTickets?.(); }} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-[#949599] hover:text-amber-400 hover:bg-[#494F55]/20"><TicketIcon className="w-4 h-4 text-amber-400" /> Manage Tickets</button>
                  <button onClick={() => { setMenu(false); onView(); }} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/20"><Eye className="w-4 h-4" /> View Public Page</button>
                  {(event.status === 'changes_requested' || (event.status === 'rejected' && event.rejection_reason)) && (
                    <button onClick={() => { setMenu(false); onViewFeedback?.(event); }} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-amber-400 hover:bg-[#494F55]/20"><MessageSquare className="w-4 h-4" /> View Feedback</button>
                  )}
                  <button onClick={() => { setMenu(false); onTogglePublish(); }} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/20">
                    {event.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />} {publishActionLabel}
                  </button>
                  <button onClick={() => { setMenu(false); onDelete(); }} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-[#949599] hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /> Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[#EFEFF1] truncate">{event.title}</h3>
        <div className="mt-2 space-y-1.5 text-xs text-[#949599]">
          <p className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {event.startDate ? new Date(event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {event.venue || event.city || '—'}</p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#494F55]/30 overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-medium text-[#949599] tabular-nums">{sold}/{cap}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-white font-medium"><DollarSign className="w-3.5 h-3.5" /> {format(event.revenue)}</span>
          <span className="flex items-center gap-1 text-xs text-[#949599]"><TicketIcon className="w-3.5 h-3.5" /> {event.category?.name || event.category || '—'}</span>
        </div>
      </div>
    </motion.div>
  );
}
