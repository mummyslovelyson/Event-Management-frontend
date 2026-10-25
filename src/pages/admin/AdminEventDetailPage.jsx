import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ExternalLink, Pencil, CheckCircle2, AlertCircle,
  XCircle, Ban, Star, ShieldCheck, User, Calendar, MapPin,
  Clock, DollarSign, Ticket, Loader2, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminEvent, approveEvent, requestEventChanges, rejectEvent,
  toggleEventFeatured, suspendEvent, unsuspendEvent
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import EventDetailPage from '@/pages/public/EventDetailPage';

export default function AdminEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Modals for moderation actions
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesReason, setChangesReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchSummary = useCallback(async () => {
    try {
      const res = await getAdminEvent(id);
      setEventData(res.data);
    } catch (err) {
      console.warn('Could not load admin summary for event:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

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

  const statusVariant = (st) => {
    switch (st) {
      case 'published': return 'success';
      case 'pending': return 'warning';
      case 'changes_requested': return 'warning';
      case 'rejected': return 'error';
      case 'suspended': return 'error';
      default: return 'neutral';
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

  const ev = eventData || {};

  return (
    <div className="space-y-4 -mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
      {/* ── Sticky Admin Moderation Top Bar ── */}
      <div className="sticky top-0 z-40 bg-[#121620]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-6 lg:px-8 py-3 shadow-xl transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Back & Breadcrumb info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/admin/events"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white border border-white/[0.08] transition shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-neutral-300" /> Back to Events
            </Link>

            <div className="h-4 w-px bg-white/[0.08] hidden sm:block shrink-0" />

            <div className="min-w-0 flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-400 shrink-0">#{id}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-neutral-300">
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

            {/* Organizer Quick Badge */}
            {(ev.organizer_name || ev.organization_name) && (
              <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-white/[0.08]">
                <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {(ev.organizer_name || ev.organization_name || 'OR').slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-neutral-300 truncate max-w-[140px] font-medium">
                  {ev.organization_name || ev.organizer_name}
                </span>
                <Link
                  to={`/admin/organizers?search=${encodeURIComponent(ev.organizer_name || ev.organization_name || '')}`}
                  className="text-[11px] text-neutral-400 hover:text-white transition underline-offset-4 hover:underline shrink-0"
                >
                  Review Org
                </Link>
              </div>
            )}
          </div>

          {/* Right: Moderation Actions */}
          <div className="flex items-center flex-wrap gap-2 shrink-0 justify-end">
            {/* Feature toggle */}
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

            {/* Edit Event & Pricing */}
            <Link
              to={`/admin/events/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white border border-white/[0.08] transition"
            >
              <Pencil className="w-3.5 h-3.5 text-neutral-300" />
              <span>Edit Details &amp; Pricing</span>
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

            {/* External link to public page */}
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
              <span className="font-semibold text-white">Moderator note to organizer: </span>
              {ev.rejection_reason}
            </div>
          </div>
        )}
      </div>

      {/* ── Rich Public Event Page (Embedded in Admin Layout) ── */}
      <div className="rounded-xl overflow-hidden shadow-2xl">
        <EventDetailPage />
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={actionLoading === 'changes' || !changesReason.trim()}
              className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition disabled:opacity-50"
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
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading === 'reject'}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition disabled:opacity-50"
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
    </div>
  );
}
