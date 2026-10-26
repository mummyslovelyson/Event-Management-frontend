import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ExternalLink, Pencil, CheckCircle2, AlertCircle,
  XCircle, Ban, Star, ShieldCheck, User, Calendar, MapPin,
  Clock, DollarSign, Ticket, Loader2, RefreshCw, Plus, Edit2,
  Trash2, Image as ImageIcon, Upload, FileText, Eye, Check, Users,
  Tag, Compass, Phone, Mail, Globe, Layers, Percent
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  getAdminEvent, approveEvent, requestEventChanges, rejectEvent,
  toggleEventFeatured, suspendEvent, unsuspendEvent
} from '@/api/admin';
import {
  createTicketType, updateTicketType, deleteTicketType, getUploadedTickets
} from '@/api/tickets';
import { uploadImage } from '@/api/events';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import TicketFilesUploader from '@/components/organizer/TicketFilesUploader';
import { useCurrency } from '@/context/CurrencyContext';
import { getMediaUrl } from '@/utils/media';

const inputCls = 'w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition';

const TICKET_PRESETS = [
  { name: 'Regular', section: 'general', desc: 'Standard general admission pass with event entry' },
  { name: 'VIP', section: 'vip', desc: 'VIP access with priority entrance and designated lounge area' },
  { name: 'VVIP', section: 'vvip', desc: 'Exclusive ultra-premium pass with backstage access & table service' },
  { name: 'Early Bird', section: 'general', desc: 'Limited discounted admission for early birds' },
  { name: 'Student', section: 'general', desc: 'Discounted admission for students with valid student ID' },
  { name: 'Table / Booth', section: 'table', desc: 'Reserved table seating for groups including complimentary refreshments' },
  { name: 'Backstage Pass', section: 'backstage', desc: 'All-access backstage pass to meet artists and organizers' },
];

export default function AdminEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { format } = useCurrency();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Moderation action modals
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Ticket Management Modal State (Admin direct control)
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketEditTarget, setTicketEditTarget] = useState(null);
  const [ticketDeleteTarget, setTicketDeleteTarget] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketUploadedFiles, setTicketUploadedFiles] = useState([]);
  const [ticketArtworkImage, setTicketArtworkImage] = useState('');
  const [uploadingArtwork, setUploadingArtwork] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getAdminEvent(id);
      setEventData(res.data);
    } catch (err) {
      console.warn('Could not load admin event summary:', err);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  /* ── Moderation Handlers ── */
  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await approveEvent(id);
      toast.success('Event approved and published!');
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestChanges = async () => {
    if (!changesReason.trim()) return toast.error('Please specify the required adjustments');
    setActionLoading('changes');
    try {
      await requestEventChanges(id, { reason: changesReason.trim() });
      toast.success('Changes requested. Organizer has been notified.');
      setChangesOpen(false);
      setChangesReason('');
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request changes');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await rejectEvent(id, { reason: rejectReason.trim() || 'Did not meet platform guidelines' });
      toast.success('Event rejected');
      setRejectOpen(false);
      setRejectReason('');
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeature = async () => {
    if (!eventData) return;
    setActionLoading('feature');
    try {
      const nextFeatured = !eventData.is_featured;
      await toggleEventFeatured(id, nextFeatured);
      setEventData((prev) => ({ ...prev, is_featured: nextFeatured }));
      toast.success(nextFeatured ? 'Event marked as featured' : 'Removed from featured');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle featured status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSuspend = async () => {
    if (!eventData) return;
    const isSuspended = eventData.status === 'suspended';
    setActionLoading('suspend');
    try {
      if (isSuspended) {
        await unsuspendEvent(id);
        toast.success('Event unsuspended and restored');
      } else {
        await suspendEvent(id);
        toast.success('Event suspended from public view');
      }
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update suspension status');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Ticket Management Handlers (Admin) ── */
  const handleTicketArtworkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingArtwork(true);
    try {
      const res = await uploadImage(file);
      const uploadedUrl = res.data?.url || res.data?.file_url;
      setTicketArtworkImage(uploadedUrl);
      setValue('image', uploadedUrl);
      toast.success('Ticket tier artwork uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload ticket image');
    } finally {
      setUploadingArtwork(false);
    }
  };

  const openAddTicket = () => {
    setTicketEditTarget(null);
    setTicketUploadedFiles([]);
    setTicketArtworkImage('');
    reset({
      name: '',
      price: '',
      quantity: '',
      description: '',
      image: '',
      saleStartDate: '',
      saleEndDate: '',
      section_type: 'general',
    });
    setTicketModalOpen(true);
  };

  const openEditTicket = async (t) => {
    setTicketEditTarget(t);
    const existingUt = (t.uploadedTickets || t.uploaded_tickets || []).map((it) => ({
      file_url: it.file_url || it.url,
      file_name: it.file_name || it.name || 'Ticket Pass',
      id: it.id,
      is_assigned: it.is_assigned,
    }));
    setTicketUploadedFiles(existingUt);
    setTicketArtworkImage(t.image || '');

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
    setTicketModalOpen(true);

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
          setTicketUploadedFiles(mapped);
          setValue('quantity', mapped.length);
        }
      } catch (err) {
        console.warn('Could not load inventory for ticket type:', err);
      }
    }
  };

  const onSubmitTicket = async (data) => {
    setTicketSubmitting(true);
    try {
      const payload = {
        ...data,
        price: (data.price === '' || data.price === null || data.price === undefined) ? 0 : Number(data.price),
        quantity: ticketUploadedFiles.length > 0 ? ticketUploadedFiles.length : Number(data.quantity || 0),
        image: ticketArtworkImage || data.image || null,
        uploadedTickets: ticketUploadedFiles,
      };
      if (ticketEditTarget) {
        await updateTicketType(id, ticketEditTarget.id, payload);
        toast.success('Ticket tier updated successfully');
      } else {
        await createTicketType(id, payload);
        toast.success('Ticket tier created successfully');
      }
      setTicketModalOpen(false);
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save ticket tier');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketDeleteTarget) return;
    setDeletingTicket(true);
    try {
      await deleteTicketType(id, ticketDeleteTarget.id);
      toast.success('Ticket tier deleted');
      setTicketDeleteTarget(null);
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket tier');
    } finally {
      setDeletingTicket(false);
    }
  };

  const statusLabel = (st) => {
    switch (st) {
      case 'published': return 'Published & Live';
      case 'pending': return 'Pending Approval';
      case 'changes_requested': return 'Changes Requested';
      case 'rejected': return 'Rejected';
      case 'suspended': return 'Suspended';
      case 'draft': return 'Draft';
      default: return st || 'Draft';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <p className="text-xs text-neutral-400">Loading admin event review...</p>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-12 text-center max-w-lg mx-auto my-12 space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Event Not Found</h3>
        <p className="text-xs text-neutral-400">
          The requested event could not be found or has been permanently deleted.
        </p>
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Admin Events
        </Link>
      </div>
    );
  }

  const ev = eventData;
  const ticketTypes = ev.ticket_types || ev.ticketTypes || [];
  const galleryImages = Array.isArray(ev.images) ? ev.images : [];
  const tags = Array.isArray(ev.tags) ? ev.tags : [];

  // Metrics
  const totalCapacity = Number(ev.capacity || ev.totalCapacity || 0);
  const totalTicketsSold = ticketTypes.reduce((acc, t) => acc + Number(t.quantity_sold || t.sold || 0), 0);
  const totalGrossRevenue = ticketTypes.reduce((acc, t) => {
    const s = Number(t.quantity_sold || t.sold || 0);
    const p = Number(t.price || 0);
    return acc + (s * p);
  }, 0);
  const capacityPct = totalCapacity > 0 ? Math.min(100, Math.round((totalTicketsSold / totalCapacity) * 100)) : 0;

  const startDateFmt = ev.startDate || ev.start_date
    ? new Date(ev.startDate || ev.start_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Date TBA';
  const endDateFmt = ev.endDate || ev.end_date
    ? new Date(ev.endDate || ev.end_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="space-y-6 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
      {/* ── Sticky Top Bar: Admin Moderation Header ── */}
      <div className="sticky top-0 z-40 bg-[#121620]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-3 shadow-xl transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Navigation and Event State */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/admin/events"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white border border-white/[0.08] transition shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-neutral-300" />
              <span>Events List</span>
            </Link>

            <div className="h-4 w-px bg-white/[0.08] hidden sm:block shrink-0" />

            <div className="min-w-0 flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-400 shrink-0">#{id}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-neutral-200">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  ev.status === 'published' ? 'bg-emerald-400' :
                  ev.status === 'suspended' ? 'bg-rose-400' :
                  ev.status === 'rejected' ? 'bg-rose-400' :
                  ev.status === 'changes_requested' ? 'bg-amber-400' : 'bg-amber-400'
                }`} />
                {statusLabel(ev.status)}
              </span>

              {ev.is_featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/20 shrink-0">
                  <Star className="w-3 h-3 fill-white text-white" /> Featured
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center flex-wrap gap-2 shrink-0 justify-end">
            {/* Feature Toggle */}
            <button
              onClick={handleToggleFeature}
              disabled={actionLoading === 'feature'}
              className={`p-2 rounded-lg border text-xs font-medium transition ${
                ev.is_featured
                  ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                  : 'bg-white/[0.04] border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.08]'
              }`}
              title={ev.is_featured ? 'Remove from featured' : 'Feature on homepage'}
            >
              <Star className="w-3.5 h-3.5" fill={ev.is_featured ? 'currentColor' : 'none'} />
            </button>

            {/* Edit Event Details in Admin */}
            <Link
              to={`/admin/events/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white border border-white/[0.08] transition"
            >
              <Pencil className="w-3.5 h-3.5 text-neutral-300" />
              <span>Edit Details</span>
            </Link>

            {/* Moderation decisions */}
            {(ev.status === 'pending' || ev.status === 'changes_requested') && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading === 'approve'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  {actionLoading === 'approve' ? 'Approving...' : 'Approve & Publish'}
                </button>

                <button
                  onClick={() => { setChangesReason(ev.rejection_reason || ''); setChangesOpen(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/20 text-xs font-semibold transition"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-300" /> Request Changes
                </button>

                <button
                  onClick={() => { setRejectReason(''); setRejectOpen(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}

            {ev.status === 'published' && (
              <button
                onClick={handleToggleSuspend}
                disabled={actionLoading === 'suspend'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition"
              >
                <Ban className="w-3.5 h-3.5" /> Suspend Event
              </button>
            )}

            {ev.status === 'suspended' && (
              <button
                onClick={handleToggleSuspend}
                disabled={actionLoading === 'suspend'}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Unsuspend
              </button>
            )}

            {/* External link to public page in separate tab */}
            <a
              href={`/events/${id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white border border-white/[0.08] transition"
              title="Open public page in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-300" /> Public Site
            </a>
          </div>
        </div>

        {/* Changes requested notice banner if active */}
        {ev.rejection_reason && (ev.status === 'changes_requested' || ev.status === 'rejected') && (
          <div className="max-w-7xl mx-auto mt-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-neutral-300 flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Current Moderator Notice to Organizer: </span>
              {ev.rejection_reason}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Hero Overview Card */}
        <div className="relative rounded-2xl overflow-hidden bg-[#121620] border border-white/[0.08] shadow-2xl">
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-neutral-900">
            <img
              src={getMediaUrl(ev.banner_image || ev.bannerImage || ev.image || '/assets/images/Logo.jpeg')}
              alt={ev.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = '/assets/images/Logo.jpeg'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121620] via-[#121620]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121620]/80 via-transparent to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {ev.category && (
                  <Badge variant="neutral" size="sm" className="font-semibold uppercase tracking-wider">
                    {ev.category}
                  </Badge>
                )}
                <Badge variant={ev.status === 'published' ? 'success' : 'pending'} size="sm">
                  {statusLabel(ev.status)}
                </Badge>
                {ev.is_featured && (
                  <Badge variant="gold" size="sm">Featured</Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {ev.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  {startDateFmt} {endDateFmt && `→ ${endDateFmt}`}
                </span>
                {(ev.startTime || ev.start_time) && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    {ev.startTime || ev.start_time}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-neutral-400" />
                  {ev.venue || ev.location || 'Location TBD'}{ev.city ? `, ${ev.city}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Executive 2-Column Inspection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Inspection Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Description Card */}
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-400" />
                Event Description &amp; Details
              </h2>
              <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                {ev.description || 'No description provided for this event.'}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-neutral-400 font-medium">Tags:</span>
                  {tags.map((t, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 rounded-full text-xs bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications Matrix */}
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-neutral-400" />
                Event Logistics &amp; Specifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Venue / Location</span>
                  <p className="text-white font-medium">{ev.venue || 'TBA'}</p>
                  <p className="text-neutral-400">{ev.address || ''} {ev.city ? `• ${ev.city}` : ''} {ev.country ? `• ${ev.country}` : ''}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Capacity &amp; Audience</span>
                  <p className="text-white font-medium">Total Capacity: {ev.capacity || 'Unlimited'}</p>
                  <p className="text-neutral-400">Age: {ev.age_restriction || ev.ageRestriction || 'All ages'} • Dress Code: {ev.dress_code || ev.dressCode || 'Casual'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Schedule &amp; Dates</span>
                  <p className="text-white font-medium">Starts: {startDateFmt} at {ev.startTime || ev.start_time || 'TBA'}</p>
                  <p className="text-neutral-400">Ends: {endDateFmt || startDateFmt} at {ev.endTime || ev.end_time || 'TBA'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold text-[10px]">Social &amp; Website</span>
                  <p className="text-white font-medium truncate">{ev.website || 'No website link provided'}</p>
                  <p className="text-neutral-400">Refund Policy: Standard 7-Day Refund Protected</p>
                </div>
              </div>
            </div>

            {/* Media Gallery */}
            {galleryImages.length > 0 && (
              <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-6 space-y-4">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-neutral-400" />
                  Media Gallery ({galleryImages.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galleryImages.map((imgUrl, idx) => (
                    <a
                      key={idx}
                      href={getMediaUrl(imgUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-video rounded-xl overflow-hidden bg-white/[0.02] border border-white/10 hover:border-white/30 transition"
                    >
                      <img
                        src={getMediaUrl(imgUrl)}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Admin Ticket Management & Inventory Section ── */}
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-white" />
                    Admin Ticket Management &amp; Inventory ({ticketTypes.length})
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Configure ticket tiers, unit prices, total capacities, and barcode pass files
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/organizer/tickets?event=${id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white border border-white/[0.08] transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full Ticket Suite
                  </Link>
                  <button
                    onClick={openAddTicket}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Ticket Tier
                  </button>
                </div>
              </div>

              {ticketTypes.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-neutral-400">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No Ticket Tiers Configured</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    This event does not have any active ticket tiers yet. Click &quot;Add Ticket Tier&quot; above to create one.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ticketTypes.map((t, idx) => {
                    const total = Number(t.quantity || t.totalQuantity || 0);
                    const sold = Number(t.quantity_sold || t.sold || 0);
                    const remaining = Math.max(0, total - sold);
                    const revenue = Number(t.price || 0) * sold;
                    const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
                    const uploadedList = t.uploadedTickets || t.uploaded_tickets || [];
                    const tierImg = getMediaUrl(t.image || t.ticket_image || uploadedList[0]?.file_url);

                    return (
                      <div
                        key={t.id || idx}
                        className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-white/[0.12] transition space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            {/* Tier Thumbnail / Artwork */}
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.08] shrink-0 flex items-center justify-center relative">
                              {tierImg ? (
                                <img
                                  src={tierImg}
                                  alt={t.name}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(tierImg, '_blank')}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement?.querySelector('.adm-tier-fallback');
                                    if (fallback) fallback.classList.remove('hidden');
                                  }}
                                />
                              ) : (
                                <Ticket className="w-6 h-6 text-neutral-400" />
                              )}
                              <div className="adm-tier-fallback hidden w-full h-full flex items-center justify-center bg-white/[0.04]">
                                <Ticket className="w-6 h-6 text-neutral-400" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{t.name}</h4>
                                {t.section_type && t.section_type !== 'general' && (
                                  <Badge variant="neutral" size="sm" className="uppercase text-[10px]">
                                    {t.section_type}
                                  </Badge>
                                )}
                              </div>
                              {t.description && (
                                <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">{t.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                                <span>Sold: <strong className="text-white">{sold}</strong> / {total}</span>
                                <span>Remaining: <strong className="text-emerald-400">{remaining}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">Price</span>
                              <span className="text-sm font-bold text-white">
                                {Number(t.price) > 0 ? format(t.price) : 'Free'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">Revenue</span>
                              <span className="text-sm font-bold text-emerald-400">{format(revenue)}</span>
                            </div>

                            <div className="flex items-center gap-1 pl-2 border-l border-white/[0.08]">
                              <button
                                onClick={() => openEditTicket(t)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                                title="Edit Ticket Tier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setTicketDeleteTarget(t)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete Ticket Tier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inventory Progress Bar */}
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>

                        {/* Uploaded passes strip */}
                        {uploadedList.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 overflow-x-auto text-[11px] text-neutral-400">
                            <span className="shrink-0 font-medium text-neutral-500">Passes ({uploadedList.length}):</span>
                            {uploadedList.slice(0, 6).map((ut, pIdx) => {
                              const passUrl = getMediaUrl(ut.file_url || ut.url);
                              const isPdf = (ut.file_name || '').toLowerCase().endsWith('.pdf');
                              return (
                                <a
                                  key={pIdx}
                                  href={passUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/[0.02] flex items-center justify-center hover:border-white/30 transition"
                                  title={ut.file_name || `Pass #${pIdx + 1}`}
                                >
                                  {!isPdf && passUrl ? (
                                    <img src={passUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[8px] font-bold text-red-400">PDF</span>
                                  )}
                                </a>
                              );
                            })}
                            {uploadedList.length > 6 && (
                              <span className="text-[10px] text-neutral-500">+{uploadedList.length - 6} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Organizer & Moderation Info (1 col) */}
          <div className="space-y-6">
            {/* Organizer Dossier Card */}
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 space-y-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Organizer Dossier
              </h3>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0 text-sm font-bold text-white">
                  {ev.organizer_avatar ? (
                    <img src={getMediaUrl(ev.organizer_avatar)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (ev.organization_name || ev.organizer_name || 'OR').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    <span>{ev.organization_name || ev.organizer_name || 'Individual Organizer'}</span>
                    {ev.organizer_is_verified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Organizer" />
                    )}
                  </h4>
                  <p className="text-xs text-neutral-400 truncate">
                    Organizer ID: #{ev.organizer_id || '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs">
                {ev.organizer_email && (
                  <div className="flex items-center gap-2 text-neutral-300 truncate">
                    <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{ev.organizer_email}</span>
                  </div>
                )}
                {ev.organizer_phone && (
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{ev.organizer_phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-neutral-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Status: {ev.organizer_is_verified ? 'Verified Organizer' : 'Unverified Account'}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/admin/organizers?search=${encodeURIComponent(ev.organizer_name || ev.organization_name || '')}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white border border-white/[0.08] transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-300" /> Review Organizer Profile
                </Link>
              </div>
            </div>

            {/* Event Sales & Performance Snapshot */}
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 space-y-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-3.5 h-3.5" />
                Performance Snapshot
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Total Tickets Sold</span>
                  <span className="font-bold text-white">{totalTicketsSold}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Gross Ticket Revenue</span>
                  <span className="font-bold text-emerald-400">{format(totalGrossRevenue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Capacity Utilization</span>
                  <span className="font-bold text-white">{capacityPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${capacityPct}%` }} />
                </div>
              </div>
            </div>

            {/* Moderation History & Audit Meta */}
            <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 space-y-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Audit &amp; Moderation Meta
              </h3>

              <div className="space-y-2 text-xs text-neutral-400">
                <div className="flex items-center justify-between">
                  <span>Created:</span>
                  <span className="text-neutral-300 font-mono">
                    {ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-GB') : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Updated:</span>
                  <span className="text-neutral-300 font-mono">
                    {ev.updated_at ? new Date(ev.updated_at).toLocaleDateString('en-GB') : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Approval Status:</span>
                  <Badge variant={ev.approval_status === 'approved' ? 'success' : 'pending'} size="sm">
                    {ev.approval_status || 'pending'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Request Changes Modal ── */}
      <Modal
        isOpen={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request Changes to Event"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setChangesOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={actionLoading === 'changes' || !changesReason.trim()}
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'changes' ? 'Sending...' : 'Send Feedback to Organizer'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-400">
            Let the organizer know what adjustments are required (e.g. ticket price clarity, event poster quality, or date confirmation) before this event can be approved.
          </p>
          <textarea
            rows={4}
            value={changesReason}
            onChange={(e) => setChangesReason(e.target.value)}
            placeholder="e.g. Please provide a higher-resolution banner image and verify the VIP ticket tier pricing."
            className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition resize-none"
          />
        </div>
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Event Submission"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRejectOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading === 'reject'}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-400">
            Provide a clear rationale for declining this event submission. The organizer will receive an email and in-app notification.
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (e.g. Inappropriate content, violating terms of service)..."
            className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition resize-none"
          />
        </div>
      </Modal>

      {/* ── Admin Add/Edit Ticket Modal ── */}
      <Modal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        title={ticketEditTarget ? 'Edit Ticket Tier (Admin)' : 'Add Ticket Tier (Admin)'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTicketModalOpen(false)}
              className="px-4 py-2.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmitTicket)}
              disabled={ticketSubmitting}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-black bg-white hover:bg-neutral-200 disabled:opacity-50 transition cursor-pointer"
            >
              {ticketSubmitting ? 'Saving...' : ticketEditTarget ? 'Update Tier' : 'Create Tier'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onSubmitTicket)} className="space-y-4">
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
              placeholder="e.g. Regular, VIP, VVIP, Early Bird"
              className={inputCls}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>}
          </div>

          {/* Ticket Tier Cover Artwork / Image */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                <span>Ticket Tier Artwork / Cover Image</span>
              </label>
              <span className="text-[10px] text-neutral-500">Optional</span>
            </div>
            <div className="flex items-center gap-3">
              {ticketArtworkImage ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/20 bg-white/[0.04] shrink-0">
                  <img src={getMediaUrl(ticketArtworkImage)} alt="Ticket Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setTicketArtworkImage(''); setValue('image', ''); }}
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
                  <span>{uploadingArtwork ? 'Uploading...' : ticketArtworkImage ? 'Replace Artwork' : 'Upload Tier Artwork'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingArtwork}
                    onChange={handleTicketArtworkUpload}
                  />
                </label>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Displayed on attendee passes and checkout (PNG, JPG, WebP)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">
                Unit Price (GHS) *
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
                Enter 0 for Free admission
              </p>
              {errors.price && <p className="mt-1 text-xs text-rose-400">{errors.price.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Quantity *</label>
                {ticketUploadedFiles.length > 0 && (
                  <span className="text-[10px] font-medium text-white bg-white/10 px-2 py-0.5 rounded">Locked to files</span>
                )}
              </div>
              <input
                type="number"
                min="1"
                {...register('quantity', {
                  required: ticketUploadedFiles.length > 0 ? false : 'Quantity is required',
                  min: { value: 1, message: 'Quantity must be at least 1' },
                })}
                placeholder="100"
                readOnly={ticketUploadedFiles.length > 0}
                className={`${inputCls} ${ticketUploadedFiles.length > 0 ? 'bg-white/[0.05] text-white font-semibold border-white/20' : ''}`}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                {ticketUploadedFiles.length > 0
                  ? `Auto-synced to ${ticketUploadedFiles.length} uploaded barcode passes`
                  : 'Total capacity available for this tier'}
              </p>
              {errors.quantity && <p className="mt-1 text-xs text-rose-400">{errors.quantity.message}</p>}
            </div>
          </div>

          {/* Pre-generated Barcode Passes Uploader */}
          <div className="pt-2 border-t border-white/[0.08]">
            <TicketFilesUploader
              files={ticketUploadedFiles}
              onChange={(files) => {
                setTicketUploadedFiles(files);
                if (files && files.length > 0) {
                  setValue('quantity', files.length, { shouldValidate: true });
                }
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Description &amp; Perks</label>
            <textarea {...register('description')} rows={2} placeholder="What perks or access are included..." className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Sale Start Date</label>
              <input type="date" {...register('saleStartDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Sale End Date</label>
              <input type="date" {...register('saleEndDate')} className={inputCls} />
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Admin Delete Ticket Modal ── */}
      <Modal
        isOpen={!!ticketDeleteTarget}
        onClose={() => setTicketDeleteTarget(null)}
        title="Delete Ticket Tier (Admin)"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setTicketDeleteTarget(null)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteTicket}
              disabled={deletingTicket}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 transition cursor-pointer"
            >
              {deletingTicket ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        }
      >
        <p className="text-xs text-neutral-300">
          Delete ticket tier <strong className="text-white">{ticketDeleteTarget?.name}</strong>? Any tickets already purchased under this tier will remain in buyer records.
        </p>
      </Modal>
    </div>
  );
}
