import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, LayoutGrid, List, Edit2, Eye, Send, EyeOff, Trash2,
  CalendarDays, MapPin, Ticket as TicketIcon, DollarSign, MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents, deleteEvent, publishEvent, unpublishEvent, getCategories } from '@/api/events';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const ghc = (n) => `₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

const statusVariant = (s) => {
  const map = {
    draft: 'neutral', pending: 'pending', published: 'success',
    rejected: 'error', cancelled: 'error', suspended: 'warning', completed: 'info',
    active: 'success', upcoming: 'pending', past: 'neutral',
  };
  return map[(s || '').toLowerCase()] || 'neutral';
};

const TABS = ['All', 'Draft', 'Pending', 'Published', 'Rejected', 'Cancelled', 'Completed'];

export default function EventsPage() {
  const navigate = useNavigate();
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
  const [deleting, setDeleting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      if (tab !== 'All') params.status = tab.toLowerCase();
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
        toast.success('Event unpublished');
      } else {
        // Publishing submits the event for admin review — it goes live only
        // after an admin approves it.
        await publishEvent(e.id);
        toast.success(e.status === 'pending'
          ? 'Event resubmitted for review'
          : 'Event submitted for review. It will go live once approved.');
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
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition-colors shrink-0"
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
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] focus:outline-none focus:border-[#D4AF37]/60 transition cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id || c} value={c.id || c.name || c}>{c.name || c}</option>
          ))}
        </select>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#171A1D] border border-[#494F55]/40">
          <button
            onClick={() => setView('table')}
            className={`p-2 rounded-md transition-colors ${view === 'table' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-[#8A9196] hover:text-[#EDF0F1]'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-[#8A9196] hover:text-[#EDF0F1]'}`}
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
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${tab === t ? 'text-[#D4AF37]' : 'text-[#8A9196] hover:text-[#EDF0F1]'}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#D4AF37]" />}
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
          action={() => navigate('/organizer/events/create')}
          actionLabel="Create Event"
          className="py-16"
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} onEdit={() => navigate(`/organizer/events/${e.id}/edit`)} onView={() => navigate(`/organizer/events/${e.id}`)} onTogglePublish={() => togglePublish(e)} onDelete={() => setDeleteTarget(e)} />
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
                        <span className="font-medium text-[#EDF0F1] max-w-[180px] truncate">{e.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#8A9196]">{e.category?.name || e.category || '—'}</td>
                    <td className="px-5 py-3 text-[#8A9196]">{e.startDate ? new Date(e.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td className="px-5 py-3 text-[#8A9196] max-w-[140px] truncate">{e.venue || e.city || '—'}</td>
                    <td className="px-5 py-3 text-center text-[#8A9196]">{sold}/{cap}</td>
                    <td className="px-5 py-3 text-right font-medium text-[#EDF0F1]">{ghc(e.revenue)}</td>
                    <td className="px-5 py-3"><Badge variant={statusVariant(e.status)} size="sm">{e.status}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={() => navigate(`/organizer/events/${e.id}/edit`)} className="p-1.5 rounded-md text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 transition" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => navigate(`/organizer/events/${e.id}`)} className="p-1.5 rounded-md text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 transition" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => togglePublish(e)} className="p-1.5 rounded-md text-[#8A9196] hover:text-[#D4AF37] hover:bg-[#494F55]/30 transition" title={e.status === 'published' ? 'Unpublish' : 'Submit for Review'}>
                          {e.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setDeleteTarget(e)} className="p-1.5 rounded-md text-[#8A9196] hover:text-red-400 hover:bg-red-500/10 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition">{deleting ? 'Deleting...' : 'Delete'}</button>
          </>
        }
      >
        <p className="text-sm text-[#8A9196] leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-[#EDF0F1]">{deleteTarget?.title}</span>? This action cannot be undone, and all associated ticket types and orders will be affected.
        </p>
      </Modal>
    </div>
  );
}

function EventCard({ event, onEdit, onView, onTogglePublish, onDelete }) {
  const [menu, setMenu] = useState(false);
  const sold = event.ticketsSold || 0;
  const cap = event.totalCapacity || event.capacity || 0;
  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
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
        <div className="absolute top-3 left-3"><Badge variant={statusVariant(event.status)} size="sm">{event.status}</Badge></div>
        <div className="absolute top-3 right-3">
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} className="p-1.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition"><MoreVertical className="w-4 h-4" /></button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 mt-1 w-40 rounded-lg bg-[#171A1D] border border-[#494F55]/40 shadow-xl py-1 z-10">
                  <button onClick={() => { setMenu(false); onEdit(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/20"><Edit2 className="w-4 h-4" /> Edit</button>
                  <button onClick={() => { setMenu(false); onView(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/20"><Eye className="w-4 h-4" /> View</button>
                  <button onClick={() => { setMenu(false); onTogglePublish(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/20"><Send className="w-4 h-4" /> {event.status === 'published' ? 'Unpublish' : 'Submit for Review'}</button>
                  <button onClick={() => { setMenu(false); onDelete(); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#8A9196] hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /> Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[#EDF0F1] truncate">{event.title}</h3>
        <div className="mt-2 space-y-1.5 text-xs text-[#8A9196]">
          <p className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {event.startDate ? new Date(event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {event.venue || event.city || '—'}</p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[#494F55]/30 overflow-hidden">
            <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-medium text-[#8A9196] tabular-nums">{sold}/{cap}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-[#D4AF37] font-medium"><DollarSign className="w-3.5 h-3.5" /> {ghc(event.revenue)}</span>
          <span className="flex items-center gap-1 text-xs text-[#8A9196]"><TicketIcon className="w-3.5 h-3.5" /> {event.category?.name || event.category || '—'}</span>
        </div>
      </div>
    </motion.div>
  );
}
