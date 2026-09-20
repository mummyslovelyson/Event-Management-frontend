import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Ticket as TicketIcon, Calendar, DollarSign, TrendingUp,
} from 'lucide-react';
import { getOrganizerEvents } from '@/api/events';
import {
  getTicketTypes, createTicketType, updateTicketType, deleteTicketType, getUploadedTickets,
} from '@/api/tickets';
import TicketFilesUploader from '@/components/organizer/TicketFilesUploader';
import Modal from '@/components/common/Modal';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const inputCls = 'w-full px-4 py-3.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition';

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
  const { format } = useCurrency();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('event') || searchParams.get('eventId');

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(urlEventId || '');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedTickets, setUploadedTickets] = useState([]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrganizerEvents({ limit: 100 });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload.events || payload.data || [];
      setEvents(list);
      if (urlEventId && list.some((e) => String(e.id) === String(urlEventId))) {
        setSelectedEvent(urlEventId);
      } else if (list.length && !selectedEvent) {
        setSelectedEvent(list[0].id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [selectedEvent, urlEventId]);

  useEffect(() => {
    if (urlEventId && events.some((e) => String(e.id) === String(urlEventId))) {
      setSelectedEvent(urlEventId);
    }
  }, [urlEventId, events]);

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
    setUploadedTickets([]);
    reset({ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '' });
    setModalOpen(true);
  };

  const openEdit = async (t) => {
    setEditTarget(t);
    // 1. Immediately populate from ticket object if present
    const existingUt = (t.uploadedTickets || t.uploaded_tickets || []).map((it) => ({
      file_url: it.file_url || it.url,
      file_name: it.file_name || it.name || 'Ticket Pass',
      id: it.id,
      is_assigned: it.is_assigned,
    }));
    setUploadedTickets(existingUt);

    const sStart = t.saleStartDate || t.sale_start;
    const sEnd = t.saleEndDate || t.sale_end;
    const initialQty = existingUt.length > 0 ? existingUt.length : (t.quantity || t.totalQuantity || '');

    reset({
      name: t.name || '',
      price: t.price ?? '',
      quantity: initialQty,
      description: t.description || '',
      saleStartDate: sStart ? String(sStart).slice(0, 10) : '',
      saleEndDate: sEnd ? String(sEnd).slice(0, 10) : '',
    });
    setModalOpen(true);

    // 2. Fetch fresh inventory from backend API
    if (t.id) {
      try {
        const invRes = await getUploadedTickets(t.id);
        const list = invRes.data?.tickets || invRes.data?.uploadedTickets || [];
        if (Array.isArray(list) && list.length > 0) {
          const mapped = list.map((it) => ({
            file_url: it.file_url || it.url,
            file_name: it.file_name || it.name || 'Ticket Pass',
            id: it.id,
            is_assigned: it.is_assigned,
          }));
          setUploadedTickets(mapped);
          setValue('quantity', mapped.length);
        }
      } catch (err) {
        console.warn('Could not load inventory for ticket type:', err);
      }
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        price: (data.price === '' || data.price === null || data.price === undefined) ? 0 : Number(data.price),
        quantity: uploadedTickets.length > 0 ? uploadedTickets.length : Number(data.quantity || 0),
        uploadedTickets,
      };
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
          <button onClick={openAdd} disabled={!selectedEvent} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Add Ticket Type
          </button>
        }
      />

      {/* Event selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-[#949599]">Select Event</label>
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="flex-1 max-w-md px-4 py-3.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer">
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
        <EmptyState icon={TicketIcon} title="No ticket types" description="Add ticket types like VIP, General, or Early Bird using the button above." className="py-16" />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
              <div className="flex items-center gap-2 text-xs text-[#949599] uppercase tracking-wider"><TicketIcon className="w-4 h-4" /> Ticket Types</div>
              <p className="mt-2 text-xl font-bold text-[#EFEFF1]">{tickets.length}</p>
            </div>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
              <div className="flex items-center gap-2 text-xs text-[#949599] uppercase tracking-wider"><TrendingUp className="w-4 h-4" /> Sold</div>
              <p className="mt-2 text-xl font-bold text-emerald-400">{totalSold}</p>
            </div>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
              <div className="flex items-center gap-2 text-xs text-[#949599] uppercase tracking-wider"><TicketIcon className="w-4 h-4" /> Available</div>
              <p className="mt-2 text-xl font-bold text-[#EFEFF1]">{totalAvail}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-white/10 to-[#171A1D] border border-white/20 p-4">
              <div className="flex items-center gap-2 text-xs text-white uppercase tracking-wider"><DollarSign className="w-4 h-4" /> Price Range</div>
              <p className="mt-2 text-xl font-bold text-[#EFEFF1]">
                {tickets.some((t) => Number(t.price) > 0)
                  ? `${format(Math.min(...tickets.filter((t) => Number(t.price) > 0).map((t) => Number(t.price))))} - ${format(Math.max(...tickets.map((t) => Number(t.price) || 0)))}`
                  : 'On uploaded passes'}
              </p>
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
                const hasUploaded = (t.uploadedTickets && t.uploadedTickets.length > 0) || (t.uploaded_tickets && t.uploaded_tickets.length > 0);
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
                          <h3 className="text-base font-semibold text-[#EFEFF1]">{t.name}</h3>
                          <Badge variant={ss.v} size="sm">{ss.label}</Badge>
                        </div>
                        {t.description && <p className="mt-1 text-sm text-[#949599] line-clamp-1">{t.description}</p>}
                        <div className="mt-2 flex items-center gap-4 text-xs text-[#949599]">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t.saleStartDate ? new Date(t.saleStartDate).toLocaleDateString('en-GB') : '—'} → {t.saleEndDate ? new Date(t.saleEndDate).toLocaleDateString('en-GB') : '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-[#949599] uppercase tracking-wider">Price</p>
                          <p className="text-lg font-bold text-white">
                            {Number(t.price) > 0 ? (
                              format(t.price)
                            ) : hasUploaded ? (
                              <span className="text-amber-400 text-sm font-semibold">On pass</span>
                            ) : (
                              'Free'
                            )}
                          </p>
                        </div>
                        <div className="min-w-[140px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#949599]">{sold} sold</span>
                            <span className="text-[#949599]">{avail} left</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#494F55]/30 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-white to-[#c4a030] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-[10px] text-[#494F55] text-center">of {total} total</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(t)} className="p-2 rounded-md text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteTarget(t)} className="p-2 rounded-md text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
            <button onClick={() => setModalOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={submitting} className="px-4 py-3 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">{submitting ? 'Saving...' : editTarget ? 'Update' : 'Add Ticket'}</button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Name</label>
            <input {...register('name', { required: 'Name is required' })} placeholder="VIP, General..." className={inputCls} />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#949599] uppercase tracking-wider">Price / Amount</label>
                {uploadedTickets.length > 0 ? (
                  <span className="text-[10px] font-bold text-amber-400">On Pass</span>
                ) : (
                  <span className="text-[10px] text-[#949599]">Optional</span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                {...register('price', { min: 0 })}
                placeholder={uploadedTickets.length > 0 ? 'Amount is on pass' : '0.00'}
                className={`${inputCls} ${uploadedTickets.length > 0 ? 'bg-[#12161A] text-amber-300 placeholder:text-[#949599]/60 border-amber-400/20' : ''}`}
              />
              <p className="mt-1 text-[11px] text-[#949599]">
                {uploadedTickets.length > 0
                  ? 'The uploaded ticket contains the amount. No need to enter an amount.'
                  : 'Optional if amount is on uploaded pass'}
              </p>
              {errors.price && <p className="mt-1 text-xs text-red-400">{errors.price.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#949599] uppercase tracking-wider">Quantity</label>
                {uploadedTickets.length > 0 && (
                  <span className="text-[10px] font-bold text-amber-400">Locked to files</span>
                )}
              </div>
              <input
                type="number"
                {...register('quantity', {
                  required: uploadedTickets.length > 0 ? false : 'Quantity is required',
                  min: 1,
                })}
                placeholder="50"
                readOnly={uploadedTickets.length > 0}
                className={`${inputCls} ${uploadedTickets.length > 0 ? 'bg-[#12161A] text-amber-300 font-bold border-amber-400/30' : ''}`}
              />
              <p className="mt-1 text-[11px] text-[#949599]">
                {uploadedTickets.length > 0
                  ? `Auto-calculated from ${uploadedTickets.length} uploaded passes`
                  : 'Or upload pre-generated passes below'}
              </p>
              {errors.quantity && <p className="mt-1 text-xs text-red-400">{errors.quantity.message}</p>}
            </div>
          </div>

          {/* Ticket Files Uploader */}
          <div className="pt-2 border-t border-[#262B2F]">
            <TicketFilesUploader
              files={uploadedTickets}
              onChange={(files) => {
                setUploadedTickets(files);
                if (files && files.length > 0) {
                  setValue('quantity', files.length, { shouldValidate: true });
                }
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Description</label>
            <textarea {...register('description')} rows={3} placeholder="What's included..." className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Sale Start Date</label>
              <input type="date" {...register('saleStartDate', { required: 'Required' })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Sale End Date</label>
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
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-3 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition">{deleting ? 'Deleting...' : 'Delete'}</button>
          </>
        }
      >
        <p className="text-sm text-[#949599]">Delete <span className="font-semibold text-[#EFEFF1]">{deleteTarget?.name}</span>? Any tickets already sold under this type will remain valid.</p>
      </Modal>
    </div>
  );
}
