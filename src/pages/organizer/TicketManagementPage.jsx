import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, Ticket as TicketIcon, Calendar, DollarSign, TrendingUp,
  ShieldCheck, Check, X, User, AlertTriangle, RefreshCw, CheckCircle2, Clock,
  Image as ImageIcon, Upload, FileText, Eye,
} from 'lucide-react';
import { getOrganizerEvents, uploadImage } from '@/api/events';
import { getAdminEvents } from '@/api/admin';
import {
  getTicketTypes, createTicketType, updateTicketType, deleteTicketType, getUploadedTickets,
} from '@/api/tickets';
import {
  getOrganizerResaleListings, approveResaleListing, rejectResaleListing,
} from '@/api/resale';
import TicketFilesUploader from '@/components/organizer/TicketFilesUploader';
import Modal from '@/components/common/Modal';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';
import { useAuth } from '@/context/AuthContext';
import { getMediaUrl } from '@/utils/media';

const TICKET_PRESETS = [
  { name: 'Regular', section: 'general', desc: 'Standard general admission pass with event entry' },
  { name: 'VIP', section: 'vip', desc: 'VIP access with priority entrance and designated lounge area' },
  { name: 'VVIP', section: 'vvip', desc: 'Exclusive ultra-premium pass with backstage access & table service' },
  { name: 'Early Bird', section: 'general', desc: 'Limited discounted admission for early birds' },
  { name: 'Student', section: 'general', desc: 'Discounted admission for students with valid student ID' },
  { name: 'Table / Booth', section: 'table', desc: 'Reserved table seating for groups including complimentary refreshments' },
  { name: 'Backstage Pass', section: 'backstage', desc: 'All-access backstage pass to meet artists and organizers' },
];

const inputCls = 'w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { format } = useCurrency();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('event') || searchParams.get('eventId');

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(urlEventId || '');
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('tiers'); // 'tiers' | 'resale'
  const [resaleListings, setResaleListings] = useState([]);
  const [loadingResale, setLoadingResale] = useState(false);
  const [resaleActionId, setResaleActionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadedTickets, setUploadedTickets] = useState([]);
  const [ticketImage, setTicketImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const currentEvent = events.find((e) => String(e.id) === String(selectedEvent));
  const isApproved = currentEvent ? (currentEvent.approval_status === 'approved' || currentEvent.approvalStatus === 'approved') : false;
  const canManage = isApproved || isAdmin;

  const handleTicketImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      const uploadedUrl = res.data?.url || res.data?.file_url;
      setTicketImage(uploadedUrl);
      setValue('image', uploadedUrl);
      toast.success('Ticket artwork uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload ticket image');
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let list = [];
      if (isAdmin) {
        try {
          const aRes = await getAdminEvents({ limit: 100 });
          const aPayload = aRes.data;
          list = Array.isArray(aPayload) ? aPayload : aPayload.events || aPayload.data || [];
        } catch (e) {
          console.warn('Admin events fetch error:', e);
        }
      }
      if (!list.length) {
        const res = await getOrganizerEvents({ limit: 100 });
        const payload = res.data;
        list = Array.isArray(payload) ? payload : payload.events || payload.data || [];
      }
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
  }, [selectedEvent, urlEventId, isAdmin]);

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

  const fetchResaleListings = useCallback(async () => {
    setLoadingResale(true);
    try {
      const res = await getOrganizerResaleListings();
      const list = res.data?.listings || res.data?.data || res.data || [];
      setResaleListings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Could not load resale listings:', err);
      setResaleListings([]);
    } finally {
      setLoadingResale(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => {
    if (activeTab === 'resale') {
      fetchResaleListings();
    }
  }, [activeTab, fetchResaleListings]);

  const handleApproveResale = async (listingId) => {
    setResaleActionId(listingId);
    try {
      await approveResaleListing(listingId);
      toast.success('Resale listing approved! It is now active on the public marketplace.');
      setResaleListings((prev) =>
        prev.map((item) => (item.id === listingId ? { ...item, approval_status: 'approved' } : item))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve resale listing');
    } finally {
      setResaleActionId(null);
    }
  };

  const handleRejectResale = async (listingId) => {
    setResaleActionId(listingId);
    try {
      await rejectResaleListing(listingId, 'Price exceeds organizer guidelines or invalid ticket.');
      toast.success('Resale listing rejected.');
      setResaleListings((prev) =>
        prev.map((item) => (item.id === listingId ? { ...item, approval_status: 'rejected' } : item))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject resale listing');
    } finally {
      setResaleActionId(null);
    }
  };

  const openAdd = () => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }
    if (!canManage) {
      toast.error('This event must be approved by an administrator before tickets can be created.');
      return;
    }
    setEditTarget(null);
    setUploadedTickets([]);
    setTicketImage('');
    reset({ name: '', price: '', quantity: '', description: '', image: '', saleStartDate: '', saleEndDate: '', section_type: 'general' });
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
    setTicketImage(t.image || '');

    const sStart = t.saleStartDate || t.sale_start;
    const sEnd = t.saleEndDate || t.sale_end;
    const initialQty = existingUt.length > 0 ? existingUt.length : (t.quantity || t.totalQuantity || '');

    reset({
      name: t.name || '',
      price: t.price ?? '',
      quantity: initialQty,
      description: t.description || '',
      image: t.image || '',
      saleStartDate: sStart ? String(sStart).slice(0, 10) : '',
      saleEndDate: sEnd ? String(sEnd).slice(0, 10) : '',
      section_type: t.section_type || 'general',
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
    if (!canManage && !editTarget) {
      toast.error('This event must be approved by an administrator before tickets can be created.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        price: (data.price === '' || data.price === null || data.price === undefined) ? 0 : Number(data.price),
        quantity: uploadedTickets.length > 0 ? uploadedTickets.length : Number(data.quantity || 0),
        image: ticketImage || data.image || null,
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

  const totalSold = tickets.reduce((s, t) => s + (t.sold || t.soldCount || t.quantity_sold || 0), 0);
  const totalRemaining = tickets.reduce((s, t) => s + (t.remaining ?? Math.max(0, (t.quantity || t.totalQuantity || 0) - (t.sold || t.soldCount || t.quantity_sold || 0))), 0);
  const totalReserved = tickets.reduce((s, t) => s + (t.reserved || 0), 0);
  const totalCancelled = tickets.reduce((s, t) => s + (t.cancelled || 0), 0);
  const totalRefunded = tickets.reduce((s, t) => s + (t.refunded || 0), 0);
  const totalRevenue = tickets.reduce((s, t) => s + (t.revenue || ((t.sold || t.quantity_sold || 0) * (Number(t.price) || 0))), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={TicketIcon}
        accent="gold"
        title="Ticket Management"
        subtitle="Monitor sales, remaining capacity, reservations, cancellations, and ticket tier revenue."
        actions={
          activeTab === 'tiers' ? (
            <button
              onClick={openAdd}
              disabled={!selectedEvent || !isApproved}
              title={!selectedEvent ? 'Select an event' : (!isApproved ? 'Event must be approved by admin before creating tickets' : 'Add Ticket Type')}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Ticket Type
            </button>
          ) : (
            <button onClick={fetchResaleListings} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors shrink-0 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Resale List
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/[0.08] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'tiers'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <TicketIcon className="w-3.5 h-3.5" />
          Ticket Tiers &amp; Inventory
        </button>
        <button
          onClick={() => setActiveTab('resale')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition relative ${
            activeTab === 'resale'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Resale Moderation &amp; Approvals
          {resaleListings.filter((r) => r.approval_status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-black">
              {resaleListings.filter((r) => r.approval_status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'resale' ? (
        /* ─── RESALE APPROVALS TAB ─── */
        <div className="space-y-5">
          {/* Resale Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-4">
              <div className="text-xs text-neutral-400 font-medium">Total Listed</div>
              <p className="mt-1 text-2xl font-bold text-white">{resaleListings.length}</p>
            </div>
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-4">
              <div className="text-xs text-neutral-400 font-medium">Pending Approval</div>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {resaleListings.filter((r) => r.approval_status === 'pending').length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-4">
              <div className="text-xs text-neutral-400 font-medium">Approved &amp; Live</div>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {resaleListings.filter((r) => r.approval_status === 'approved' && r.status === 'active').length}
              </p>
            </div>
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-4">
              <div className="text-xs text-neutral-400 font-medium">Sold &amp; Transferred</div>
              <p className="mt-1 text-2xl font-bold text-blue-400">
                {resaleListings.filter((r) => r.status === 'sold').length}
              </p>
            </div>
          </div>

          {loadingResale ? (
            <LoadingSpinner label="Loading resale requests..." className="py-16" />
          ) : resaleListings.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No resale listings yet"
              description="When attendees list spare tickets for resale within the +25% cap, they will appear here for your review and approval."
              className="py-16"
            />
          ) : (
            <div className="space-y-3">
              {resaleListings.map((listing) => {
                const orig = Number(listing.original_price || listing.ticket_type_price || 0);
                const res = Number(listing.resale_price || listing.price || 0);
                const markup = orig > 0 ? Math.round(((res - orig) / orig) * 100) : 0;
                const isPending = listing.approval_status === 'pending';
                const isApproved = listing.approval_status === 'approved';
                const isRejected = listing.approval_status === 'rejected';

                return (
                  <motion.div
                    key={listing.id}
                    className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{listing.event_title || listing.eventTitle || 'Event'}</h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-white/[0.06] text-neutral-300">
                            {listing.ticket_type_name || listing.ticketTypeName || 'Pass'}
                          </span>
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                              Pending Review
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Approved &amp; Live
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Rejected
                            </span>
                          )}
                          {listing.status === 'sold' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Sold &amp; Transferred
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-neutral-400" /> Seller: <strong className="text-white">{listing.seller_name || listing.seller?.name || 'Attendee'}</strong>
                          </span>
                          <span>
                            Original Face: <strong className="text-white">{format(orig)}</strong>
                          </span>
                          <span>
                            Resale Price: <strong className="text-emerald-400 font-semibold">{format(res)}</strong>
                          </span>
                          <span className="text-[11px] text-amber-400">
                            {markup > 0 ? `+${markup}% Markup (within +25% cap)` : 'Face value'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApproveResale(listing.id)}
                              disabled={resaleActionId === listing.id}
                              className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectResale(listing.id)}
                              disabled={resaleActionId === listing.id}
                              className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        )}
                        {isApproved && listing.status === 'active' && (
                          <button
                            onClick={() => handleRejectResale(listing.id)}
                            disabled={resaleActionId === listing.id}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-neutral-300 text-xs font-medium hover:bg-rose-500/10 hover:text-rose-400 transition"
                          >
                            Revoke Approval
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── TIERS & INVENTORY TAB ─── */
        <>
          {/* Event selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">Select Event</label>
            <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="flex-1 max-w-md px-3.5 py-2.5 rounded-lg bg-[#121620] border border-white/[0.08] text-xs text-neutral-300 focus:outline-none focus:border-white/30 transition cursor-pointer">
              <option value="">Choose an event...</option>
              {events.map((e) => {
                const appStatus = e.approval_status || e.approvalStatus || 'pending';
                const statusBadge = appStatus === 'approved' ? '' : ` (${appStatus === 'changes_requested' ? 'Changes Requested' : (appStatus === 'rejected' ? 'Rejected' : 'Pending Approval')})`;
                return (
                  <option key={e.id} value={e.id}>
                    {e.title}{statusBadge}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Event Banner Image & Overview Card */}
          {currentEvent && (
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative w-full sm:w-28 h-20 rounded-xl overflow-hidden bg-white/[0.03] shrink-0 border border-white/[0.08]">
                <img
                  src={currentEvent.banner_image || currentEvent.thumbnail || '/assets/images/Logo.jpeg'}
                  alt={currentEvent.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/assets/images/Logo.jpeg'; }}
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {currentEvent.title}
                  </h3>
                  <Badge variant={currentEvent.approval_status === 'approved' ? 'success' : 'pending'} size="sm">
                    {currentEvent.approval_status === 'approved' ? 'Approved & Live' : (currentEvent.approval_status === 'changes_requested' ? 'Changes Requested' : 'Pending Approval')}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
                  <span> {currentEvent.venue || currentEvent.city || 'Location TBD'}</span>
                  <span> {currentEvent.startDate || currentEvent.start_date ? new Date(currentEvent.startDate || currentEvent.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBD'}</span>
                  <span> Capacity: {currentEvent.capacity || currentEvent.totalCapacity || 'Unlimited'}</span>
                </div>
              </div>
            </div>
          )}

          {events.length === 0 ? (
            <EmptyState icon={TicketIcon} title="No events yet" description="Create an event first to manage tickets." className="py-16" />
          ) : !selectedEvent ? (
            <EmptyState icon={TicketIcon} title="Select an event" description="Choose an event above to view its ticket types." className="py-16" />
          ) : !canManage ? (
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-8 text-center space-y-4 max-w-xl mx-auto my-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20 uppercase tracking-wider">
                  {currentEvent?.approval_status === 'changes_requested'
                    ? 'Changes Requested'
                    : (currentEvent?.approval_status === 'rejected' ? 'Rejected' : 'Awaiting Admin Approval')}
                </div>
                <h3 className="text-base font-bold text-white">
                  Tickets Disabled Until Event Is Approved
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                  {currentEvent?.approval_status === 'changes_requested'
                    ? `An administrator requested modifications before approving this event: "${currentEvent?.rejection_reason || currentEvent?.rejectionReason || 'Please review your event details.'}". Please update and resubmit for approval.`
                    : currentEvent?.approval_status === 'rejected'
                    ? `This event was rejected by platform moderation: "${currentEvent?.rejection_reason || currentEvent?.rejectionReason || 'Contact support for more details.'}".`
                    : 'This event is currently in the administrator review queue. All events must be approved by an administrator before tickets can be created, configured, and sold to attendees.'}
                </p>
              </div>
              {currentEvent?.approval_status === 'changes_requested' && (
                <div className="pt-2">
                  <Link
                    to={`/organizer/events/${currentEvent.id}/edit`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit &amp; Resubmit Event
                  </Link>
                </div>
              )}
            </div>
          ) : loadingTickets ? (
            <LoadingSpinner label="Loading ticket types..." className="py-16" />
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title="No tickets created for this event yet"
              description="Create ticket tiers (e.g. VIP, General Admission, Early Bird) with custom pricing and upload pre-generated barcode passes."
              action={openAdd}
              actionLabel="Create First Ticket Tier"
              className="py-16"
            />
          ) : (
            <>
              {/* Comprehensive 6-Metric Event Monitor */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">
                    <TrendingUp className="w-3.5 h-3.5" /> Tickets Sold
                  </div>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">{totalSold}</p>
                </div>
                <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                    <TicketIcon className="w-3.5 h-3.5" /> Remaining
                  </div>
                  <p className="mt-1 text-2xl font-bold text-white">{totalRemaining}</p>
                </div>
                <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 uppercase tracking-wider font-semibold">
                    <Clock className="w-3.5 h-3.5" /> Reserved
                  </div>
                  <p className="mt-1 text-2xl font-bold text-amber-300">{totalReserved}</p>
                </div>
                <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-400 uppercase tracking-wider font-semibold">
                    <X className="w-3.5 h-3.5" /> Cancelled
                  </div>
                  <p className="mt-1 text-2xl font-bold text-rose-300">{totalCancelled}</p>
                </div>
                <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-400 uppercase tracking-wider font-semibold">
                    <RefreshCw className="w-3.5 h-3.5" /> Refunded
                  </div>
                  <p className="mt-1 text-2xl font-bold text-blue-300">{totalRefunded}</p>
                </div>
                <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
                    <DollarSign className="w-3.5 h-3.5" /> Total Revenue
                  </div>
                  <p className="mt-1 text-xl font-bold text-white truncate">{format(totalRevenue)}</p>
                </div>
              </div>

              {/* Ticket types list */}
              <div className="space-y-3">
                <AnimatePresence>
                  {tickets.map((t, idx) => {
                    const total = Number(t.quantity || t.totalQuantity || 0);
                    const sold = Number(t.sold || t.soldCount || t.quantity_sold || 0);
                    const remaining = t.remaining !== undefined ? Number(t.remaining) : Math.max(0, total - sold);
                    const reserved = Number(t.reserved || 0);
                    const cancelled = Number(t.cancelled || 0);
                    const refunded = Number(t.refunded || 0);
                    const revenue = Number(t.revenue !== undefined ? t.revenue : (sold * (Number(t.price) || 0)));
                    const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                    const ss = saleStatus(t);
                    const uploadedList = t.uploadedTickets || t.uploaded_tickets || [];
                    const hasUploaded = uploadedList.length > 0;
                    const tierImg = getMediaUrl(t.image || t.ticket_image || uploadedList[0]?.file_url);

                    return (
                      <motion.div
                        key={t.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 hover:border-white/20 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            {/* Ticket Tier Pass Artwork or Thumbnail */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.08] shrink-0 flex items-center justify-center relative">
                              {tierImg ? (
                                <img
                                  src={tierImg}
                                  alt={t.name}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(tierImg, '_blank')}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement?.querySelector('.tier-fallback-badge');
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                              ) : currentEvent?.banner_image ? (
                                <img
                                  src={getMediaUrl(currentEvent.banner_image)}
                                  alt={t.name}
                                  className="w-full h-full object-cover opacity-80"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement?.querySelector('.tier-fallback-badge');
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                              ) : (
                                <TicketIcon className="w-6 h-6 text-neutral-400" />
                              )}
                              <div className="tier-fallback-badge hidden w-full h-full flex items-center justify-center bg-white/[0.04]">
                                <TicketIcon className="w-6 h-6 text-neutral-400" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <h3 className="text-base font-semibold text-white">{t.name}</h3>
                                <Badge variant={ss.v} size="sm">{ss.label}</Badge>
                                {t.section_type && t.section_type !== 'general' && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
                                    {t.section_type}
                                  </span>
                                )}
                              </div>
                              {t.description && <p className="mt-1 text-xs text-neutral-400 line-clamp-1">{t.description}</p>}
                              <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {t.saleStartDate ? new Date(t.saleStartDate).toLocaleDateString('en-GB') : '—'} → {t.saleEndDate ? new Date(t.saleEndDate).toLocaleDateString('en-GB') : '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Unit Price</p>
                              <p className="text-base font-bold text-white">
                                {Number(t.price) > 0 ? (
                                  format(t.price)
                                ) : (
                                  'Free'
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Tier Revenue</p>
                              <p className="text-base font-bold text-white">{format(revenue)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(t)} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.04] transition cursor-pointer" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteTarget(t)} className="p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>

                        {/* Uploaded Ticket Pass Images Gallery Strip */}
                        {hasUploaded && (
                          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto pb-1">
                            <span className="text-[11px] text-neutral-400 shrink-0 font-medium">Uploaded Passes ({uploadedList.length}):</span>
                            {uploadedList.slice(0, 8).map((ut, pIdx) => {
                              const url = getMediaUrl(ut.file_url || ut.url);
                              const isPdf = (ut.file_name || '').toLowerCase().endsWith('.pdf');
                              return (
                                <a
                                  key={pIdx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative group shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition block bg-white/[0.02]"
                                  title={ut.file_name || `Pass #${pIdx + 1}`}
                                >
                                  {!isPdf && url ? (
                                    <img
                                      src={url}
                                      alt=""
                                      className="w-full h-full object-cover group-hover:scale-110 transition"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.style.display = 'none';
                                        const pFallback = e.currentTarget.parentElement?.querySelector('.pass-fallback');
                                        if (pFallback) pFallback.classList.remove('hidden');
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-red-400 bg-red-500/10">
                                      PDF
                                    </div>
                                  )}
                                  <div className="pass-fallback hidden w-full h-full flex items-center justify-center text-[9px] font-bold text-neutral-400 bg-white/[0.04]">
                                    PASS
                                  </div>
                                </a>
                              );
                            })}
                            {uploadedList.length > 8 && (
                              <span className="text-[11px] text-neutral-400 shrink-0 font-medium pl-1">
                                +{(t.uploadedTickets || t.uploaded_tickets || []).length - 6} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Granular Tier Metrics Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4 pt-4 border-t border-white/[0.06] text-xs">
                          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <span className="text-neutral-400 text-[10px] uppercase font-semibold tracking-wider block">Total</span>
                            <span className="text-white font-bold text-sm">{total}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-emerald-500/20">
                            <span className="text-emerald-400 text-[10px] uppercase font-semibold tracking-wider block">Sold</span>
                            <span className="text-emerald-400 font-bold text-sm">{sold}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <span className="text-neutral-400 text-[10px] uppercase font-semibold tracking-wider block">Remaining</span>
                            <span className="text-white font-bold text-sm">{remaining}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <span className="text-amber-400 text-[10px] uppercase font-semibold tracking-wider block">Reserved</span>
                            <span className="text-amber-300 font-bold text-sm">{reserved}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <span className="text-rose-400 text-[10px] uppercase font-semibold tracking-wider block">Cancelled</span>
                            <span className="text-rose-300 font-bold text-sm">{cancelled}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                            <span className="text-blue-400 text-[10px] uppercase font-semibold tracking-wider block">Refunded</span>
                            <span className="text-blue-300 font-bold text-sm">{refunded}</span>
                          </div>
                        </div>

                        {/* Inventory Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] mb-1 text-neutral-400">
                            <span>{sold} of {total} Sold ({pct}%)</span>
                            <span>{remaining} Remaining</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Ticket Type' : 'Add Ticket Type'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition">Cancel</button>
            <button onClick={handleSubmit(onSubmit)} disabled={submitting} className="px-4 py-2.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 disabled:opacity-50 transition">{submitting ? 'Saving...' : editTarget ? 'Update' : 'Add Ticket'}</button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Ticket Tier Name *
              </label>
              <span className="text-[11px] text-neutral-500">Pick preset or enter custom</span>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              {TICKET_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setValue('name', preset.name, { shouldValidate: true });
                    setValue('section_type', preset.section);
                    if (!watch('description')) {
                      setValue('description', preset.desc);
                    }
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
                >
                  + {preset.name}
                </button>
              ))}
            </div>

            <input
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. VIP, Regular, Early Bird, VVIP"
              className={inputCls}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          {/* Ticket Tier Image / Artwork */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                <span>Ticket Tier Artwork / Cover Image</span>
              </label>
              <span className="text-[10px] text-neutral-500">Optional</span>
            </div>
            <div className="flex items-center gap-3">
              {ticketImage ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/20 bg-white/[0.04] shrink-0">
                  <img src={getMediaUrl(ticketImage)} alt="Ticket Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setTicketImage(''); setValue('image', ''); }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white hover:bg-rose-500 transition cursor-pointer"
                    title="Remove artwork"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center text-neutral-500 bg-white/[0.02] shrink-0">
                  <ImageIcon className="w-5 h-5 text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-white border border-white/[0.08] cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-neutral-300" />
                  <span>{uploadingImage ? 'Uploading...' : ticketImage ? 'Replace Artwork' : 'Upload Tier Artwork'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={handleTicketImageUpload}
                  />
                </label>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Used as tier badge on checkout and passes (PNG, JPG, WebP)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">
                Price (GHS) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-semibold">
                  ₵
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('price', {
                    required: 'Price is required',
                    min: { value: 0, message: 'Price cannot be negative' },
                  })}
                  placeholder="0.00"
                  className={`${inputCls} pl-8 font-medium`}
                />
              </div>
              <p className="mt-1 text-[11px] text-neutral-400">
                Unit price in GHS (Enter 0 for Free admission)
              </p>
              {errors.price && <p className="mt-1 text-xs text-rose-400">{errors.price.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Quantity *</label>
                {uploadedTickets.length > 0 && (
                  <span className="text-[10px] font-medium text-white bg-white/10 px-2 py-0.5 rounded">Locked to files</span>
                )}
              </div>
              <input
                type="number"
                min="1"
                {...register('quantity', {
                  required: uploadedTickets.length > 0 ? false : 'Quantity is required',
                  min: { value: 1, message: 'Quantity must be at least 1' },
                })}
                placeholder="50"
                readOnly={uploadedTickets.length > 0}
                className={`${inputCls} ${uploadedTickets.length > 0 ? 'bg-white/[0.05] text-white font-semibold border-white/20' : ''}`}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                {uploadedTickets.length > 0
                  ? `Auto-synced to ${uploadedTickets.length} uploaded passes`
                  : 'Total capacity available for this tier'}
              </p>
              {errors.quantity && <p className="mt-1 text-xs text-rose-400">{errors.quantity.message}</p>}
            </div>
          </div>

          {/* Ticket Files Uploader */}
          <div className="pt-2 border-t border-white/[0.08]">
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
            <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Description</label>
            <textarea {...register('description')} rows={3} placeholder="What's included..." className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Sale Start Date</label>
              <input type="date" {...register('saleStartDate', { required: 'Required' })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Sale End Date</label>
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
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition">{deleting ? 'Deleting...' : 'Delete'}</button>
          </>
        }
      >
        <p className="text-xs text-neutral-300">Delete <span className="font-semibold text-white">{deleteTarget?.name}</span>? Any tickets already sold under this type will remain valid.</p>
      </Modal>
    </div>
  );
}
