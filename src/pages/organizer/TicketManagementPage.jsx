import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Ticket as TicketIcon, Calendar, DollarSign, TrendingUp,
} from 'lucide-react';
import { getOrganizerEvents } from '@/api/events';
import {
  getTicketTypes, createTicketType, updateTicketType, deleteTicketType,
} from '@/api/tickets';
import Modal from '@/components/common/Modal';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const ghc = (n) => `₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition';

const saleStatus = (t) => {
  if (!t.saleEndDate) return 'neutral';
  const now = new Date();
  const end = new Date(t.saleEndDate);
  const start = new Date(t.saleStartDate);
  if (now > end) return { v: 'error', label: 'Ended' };
  if (now < start) return { v: 'pending', label: 'Upcoming' };
  return { v: 'success', label: 'On Sale' };
};

export default function TicketManagementPage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrganizerEvents({ limit: 100 });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload.events || payload.data || [];
      setEvents(list);
      if (list.length && !selectedEvent) setSelectedEvent(list[0].id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  const fetchTickets = useCallback(async () => {
    if (!selectedEvent) return;
    setLoadingTickets(true);
    try {
      const res = await getTicketTypes(selectedEvent);
      const payload = res.data;
      setTickets(Array.isArray(payload) ? payload : payload.tickets || payload.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load ticket types');
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [selectedEvent]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openAdd = () => {
    setEditTarget(null);
    reset({ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '' });
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditTarget(t);
    reset({
      name: t.name || '', price: t.price || '', quantity: t.quantity || t.totalQuantity || '',
      description: t.description || '',
      saleStartDate: t.saleStartDate ? t.saleStartDate.slice(0, 10) : '',
      saleEndDate: t.saleEndDate ? t.saleEndDate.slice(0, 10) : '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = { ...data, price: Number(data.price), quantity: Number(data.quantity) };
      if (editTarget) {
        await updateTicketType(selectedEvent, editTarget.id, payload);
        toast.success('Ticket type updated');
      } else {
        await createTicketType(selectedEvent, payload);
        toast.success('Ticket type added');
      }
      setModalOpen(false);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save ticket type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTicketType(selectedEvent, deleteTarget.id);
      toast.success('Ticket type deleted');
      setDeleteTarget(null);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket type');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading..." className="py-20" />;

  const totalSold = tickets.reduce((s, t) => s + (t.sold || t.soldCount || 0), 0);
  const totalAvail = tickets.reduce((s, t) => s + Math.max(0, (t.quantity || t.totalQuantity || 0) - (t.sold || t.soldCount || 0)), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={TicketIcon}
        accent="gold"
        title="Ticket Management"
        subtitle="Manage ticket types, pricing, and availability."
        actions={
          <button onClick={openAdd} disabled={!selectedEvent} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Add Ticket Type
          </button>
        }
      />

      {/* Event selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-[#8A9196]">Select Event</label>
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="flex-1 max-w-md px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] focus:outline-none focus:border-[#D4AF37]/60 transition cursor-pointer">
          <option value="">Choose an event...</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={TicketIcon} title="No events yet" description="Create an event first to manage tickets." className="py-16" />
      ) : !selectedEvent ? (
        <EmptyState icon={TicketIcon} title="Select an event" description="Choose an event above to view its ticket types." className="py-16" />
      ) : loadingTickets ? (
        <LoadingSpinner label="Loading ticket types..." className="py-16" />
      ) : tickets.length === 0 ? (
        <EmptyState icon={TicketIcon} title="No ticket types" description="Add ticket types like VIP, General, or Early Bird." action={openAdd} actionLabel="Add Ticket Type" className="py-16" />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
              <div className="flex items-center gap-2 text-xs text-[#8A9196] uppercase tracking-wider"><TicketIcon className="w-4 h-4" /> Ticket Types</div>
              <p className="mt-2 text-xl font-bold text-[#EDF0F1]">{tickets.length}</p>
            </div>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
              <div className="flex items-center gap-2 text-xs text-[#8A9196] uppercase tracking-wider"><TrendingUp className="w-4 h-4" /> Sold</div>
              <p className="mt-2 text-xl font-bold text-emerald-400">{totalSold}</p>
            </div>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
              <div className="flex items-center gap-2 text-xs text-[#8A9196] uppercase tracking-wider"><TicketIcon className="w-4 h-4" /> Available</div>
              <p className="mt-2 text-xl font-bold text-[#EDF0F1]">{totalAvail}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-[#D4AF37]/15 to-[#171A1D] border border-[#D4AF37]/30 p-4">
              <div className="flex items-center gap-2 text-xs text-[#D4AF37] uppercase tracking-wider"><DollarSign className="w-4 h-4" /> Price Range</div>
              <p className="mt-2 text-xl font-bold text-[#EDF0F1]">{ghc(Math.min(...tickets.map((t) => Number(t.price) || 0)))} - {ghc(Math.max(...tickets.map((t) => Number(t.price) || 0)))}</p>
            </div>
          </div>

          {/* Ticket types list */}
          <div className="space-y-3">
            <AnimatePresence>
              {tickets.map((t, idx) => {
                const total = t.quantity || t.totalQuantity || 0;
                const sold = t.sold || t.soldCount || 0;
                const avail = Math.max(0, total - sold);
                const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                const ss = saleStatus(t);
                return (
                  <motion.div
                    key={t.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 hover:border-[#494F55]/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-[#EDF0F1]">{t.name}</h3>
                          <Badge variant={ss.v} size="sm">{ss.label}</Badge>
                        </div>
                        {t.description && <p className="mt-1 text-sm text-[#8A9196] line-clamp-1">{t.description}</p>}
                        <div className="mt-2 flex items-center gap-4 text-xs text-[#8A9196]">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t.saleStartDate ? new Date(t.saleStartDate).toLocaleDateString('en-GB') : '—'} → {t.saleEndDate ? new Date(t.saleEndDate).toLocaleDateString('en-GB') : '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-[#8A9196] uppercase tracking-wider">Price</p>
                          <p className="text-lg font-bold text-[#D4AF37]">{ghc(t.price)}</p>
                        </div>
                        <div className="min-w-[140px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#8A9196]">{sold} sold</span>
                            <span className="text-[#8A9196]">{avail} left</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#494F55]/30 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#D4AF37] to-[#c4a030] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-[10px] text-[#494F55] text-center">of {total} total</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(t)} className="p-2 rounded-md text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 transition" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteTarget(t)} className="p-2 rounded-md text-[#8A9196] hover:text-red-400 hover:bg-red-500/10 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Ticket Type' : 'Add Ticket Type'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1E252B] bg-[#D4AF37] hover:bg-[#c4a030] disabled:opacity-60 transition">{submitting ? 'Saving...' : editTarget ? 'Update' : 'Add Ticket'}</button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Name</label>
            <input {...register('name', { required: 'Name is required' })} placeholder="VIP, General..." className={inputCls} />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Price (GHS)</label>
              <input type="number" step="0.01" {...register('price', { required: 'Price is required', min: 0 })} placeholder="100" className={inputCls} />
              {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Quantity</label>
              <input type="number" {...register('quantity', { required: 'Quantity is required', min: 1 })} placeholder="50" className={inputCls} />
              {errors.quantity && <p className="mt-1 text-xs text-red-400">{errors.quantity.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Description</label>
            <textarea {...register('description')} rows={3} placeholder="What's included..." className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Sale Start Date</label>
              <input type="date" {...register('saleStartDate', { required: 'Required' })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Sale End Date</label>
              <input type="date" {...register('saleEndDate', { required: 'Required' })} className={inputCls} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Ticket Type"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition">{deleting ? 'Deleting...' : 'Delete'}</button>
          </>
        }
      >
        <p className="text-sm text-[#8A9196]">Delete <span className="font-semibold text-[#EDF0F1]">{deleteTarget?.name}</span>? Any tickets already sold under this type will remain valid.</p>
      </Modal>
    </div>
  );
}
