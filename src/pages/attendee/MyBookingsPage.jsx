import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CalendarCheck, Search, ChevronDown, Ticket as TicketIcon, Calendar, MapPin,
  XCircle, RotateCcw, FileDown, Receipt,
} from 'lucide-react';
import {
  getOrders, cancelOrder, refundOrder, getOrderInvoice,
} from '@/api/orders';
import Modal from '@/components/common/Modal';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useCurrency } from '@/context/CurrencyContext';

const TABS = [
  { value: 'all', label: 'All Bookings' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_BADGE = {
  paid: { variant: 'success', label: 'Paid' },
  completed: { variant: 'success', label: 'Paid' },
  pending: { variant: 'pending', label: 'Pending' },
  processing: { variant: 'pending', label: 'Processing' },
  failed: { variant: 'error', label: 'Failed' },
  refunded: { variant: 'info', label: 'Refunded' },
  partially_refunded: { variant: 'info', label: 'Partially Refunded' },
  cancelled: { variant: 'error', label: 'Cancelled' },
};

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function MyBookingsPage() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getOrders({ limit: 100 });
        const data = res.data?.orders ?? res.data ?? [];
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Failed to load bookings');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      const eventDate = o.event?.startDate || o.eventDate;
      const status = (o.status || '').toLowerCase();
      const matchesTab =
        tab === 'all' ? true
        : tab === 'upcoming' ? (eventDate ? new Date(eventDate) >= now : false) && status !== 'cancelled'
        : tab === 'completed' ? (eventDate ? new Date(eventDate) < now : status === 'completed') && status !== 'cancelled'
        : tab === 'cancelled' ? status === 'cancelled'
        : true;
      if (!matchesTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (o.orderId || o.id || '').toString().toLowerCase().includes(q) ||
        (o.event?.title || o.eventName || '').toLowerCase().includes(q) ||
        (o.event?.venue || '').toLowerCase().includes(q)
      );
    });
  }, [orders, tab, search]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelOrder(cancelTarget.id, { reason: cancelReason });
      toast.success('Booking cancelled successfully');
      setOrders((prev) => prev.map((o) => (o.id === cancelTarget.id ? { ...o, status: 'cancelled' } : o)));
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await refundOrder(refundTarget.id, { reason: refundReason });
      toast.success('Refund request submitted');
      setOrders((prev) => prev.map((o) => (o.id === refundTarget.id ? { ...o, status: 'refunded', paymentStatus: 'refunded' } : o)));
      setRefundTarget(null);
      setRefundReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request refund');
    } finally {
      setRefunding(false);
    }
  };

  const handleExport = async (order) => {
    setExporting(order.id);
    try {
      const res = await getOrderInvoice(order.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${(order.orderId || order.id).toString().slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error('Failed to download invoice');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading your bookings..." className="py-24" />;
  }

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemFade}>
        <h1 className="text-2xl font-bold text-[#EFEFF1]">My Bookings</h1>
        <p className="text-sm text-[#949599] mt-1">View and manage your event bookings and orders.</p>
      </motion.div>

      {/* Search + tabs */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-[#D4AF37] text-[#1C232B]'
                  : 'bg-[#171A1D] border border-[#262B2F] text-[#949599] hover:text-[#EFEFF1] hover:border-[#494F55]/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
          />
        </div>
      </motion.div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={search ? "No bookings match your search" : "No bookings yet"}
          description={search ? "Try a different search term." : "Book tickets for events to see your orders here."}
          action={() => (window.location.href = '/attendee/explore')}
          actionLabel="Browse Events"
        />
      ) : (
        <motion.div variants={containerStagger} className="space-y-4">
          {filtered.map((order) => {
            const event = order.event || {};
            const eventDate = event.startDate || order.eventDate;
            const status = (order.status || '').toLowerCase();
            const payStatus = (order.paymentStatus || 'pending').toLowerCase();
            const isCancelled = status === 'cancelled';
            const isUpcoming = eventDate && new Date(eventDate) >= new Date() && !isCancelled;
            const pb = PAYMENT_BADGE[payStatus] || { variant: 'pending', label: payStatus };
            const items = order.items || order.tickets || order.lineItems || [];
            const ticketCount = Array.isArray(items)
              ? items.reduce((sum, it) => sum + (it.quantity || 0), 0)
              : order.ticketCount || order.quantity || 0;

            return (
              <motion.div
                key={order.id}
                variants={itemFade}
                className={`rounded-xl bg-[#171A1D] border ${isCancelled ? 'border-red-500/20' : 'border-[#262B2F]'} overflow-hidden transition-colors`}
              >
                <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5">
                  {/* Event image */}
                  <div className="w-full sm:w-32 h-32 sm:h-auto rounded-lg overflow-hidden bg-[#242B32] shrink-0">
                    {event.image ? (
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CalendarCheck className="w-8 h-8 text-[#494F55]" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[#EFEFF1] truncate">{event.title || order.eventName || 'Event'}</h3>
                        <p className="text-xs text-[#494F55] mt-0.5 font-mono">
                          Order #{(order.orderId || order.id).toString().slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={pb.variant} size="sm">{pb.label}</Badge>
                        {isCancelled && <Badge variant="error" size="sm">Cancelled</Badge>}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-[#949599]">
                        <Calendar className="w-4 h-4 text-[#494F55] shrink-0" />
                        <span className="truncate">
                          {eventDate ? new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#949599]">
                        <MapPin className="w-4 h-4 text-[#494F55] shrink-0" />
                        <span className="truncate">{event.venue || 'Venue TBA'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#949599]">
                        <TicketIcon className="w-4 h-4 text-[#494F55] shrink-0" />
                        <span>{ticketCount} ticket{ticketCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#494F55]">Total Paid:</span>
                        <span className="text-lg font-bold text-[#D4AF37]">
                          {format(order.totalAmount || order.total || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-[#494F55]">
                        Booked on {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to="/attendee/tickets"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-[#D4AF37]/40 transition"
                      >
                        <TicketIcon className="w-3.5 h-3.5" /> View Tickets
                      </Link>
                      <button
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-[#D4AF37]/40 transition"
                      >
                        <Receipt className="w-3.5 h-3.5" /> Details
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleExport(order)}
                        disabled={exporting === order.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-[#D4AF37]/40 disabled:opacity-50 transition"
                      >
                        <FileDown className="w-3.5 h-3.5" /> {exporting === order.id ? 'Exporting...' : 'Export PDF'}
                      </button>
                      {isUpcoming && (
                        <button
                          onClick={() => setCancelTarget(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel Booking
                        </button>
                      )}
                      {!isUpcoming && !isCancelled && (
                        <button
                          onClick={() => setRefundTarget(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Request Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable details */}
                <AnimatePresence>
                  {expanded === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-[#262B2F]"
                    >
                      <div className="p-4 sm:p-5 bg-[#1C232B]/50">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-3">Order Details</p>
                        {Array.isArray(items) && items.length > 0 ? (
                          <div className="space-y-2">
                            {items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 border-b border-[#262B2F] last:border-0">
                                <div>
                                  <p className="text-sm font-medium text-[#EFEFF1]">{item.ticketType || item.name || item.type || 'Ticket'}</p>
                                  <p className="text-xs text-[#949599]">Qty: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-[#949599]">
                                    {format(item.price || 0)} each
                                  </p>
                                  <p className="text-sm font-semibold text-[#EFEFF1]">
                                    {format((item.price || 0) * (item.quantity || 0))}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#949599]">No detailed line items available for this order.</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-[#262B2F] flex items-center justify-between">
                          <span className="text-sm font-semibold text-[#EFEFF1]">Total</span>
                          <span className="text-base font-bold text-[#D4AF37]">
                            {format(order.totalAmount || order.total || 0)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Cancel modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        title="Cancel Booking"
        footer={
          <>
            <button onClick={() => { setCancelTarget(null); setCancelReason(''); }} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">
              Keep Booking
            </button>
            <button onClick={handleCancel} disabled={cancelling} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition">
              <XCircle className="w-4 h-4" />
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </>
        }
      >
        {cancelTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-sm text-red-400 font-medium">Are you sure you want to cancel this booking?</p>
              <p className="text-xs text-[#949599] mt-1">
                {cancelTarget.event?.title || cancelTarget.eventName} • This action cannot be undone.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Tell us why you're cancelling..."
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Refund modal */}
      <Modal
        open={!!refundTarget}
        onClose={() => { setRefundTarget(null); setRefundReason(''); }}
        title="Request Refund"
        footer={
          <>
            <button onClick={() => { setRefundTarget(null); setRefundReason(''); }} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">
              Cancel
            </button>
            <button onClick={handleRefund} disabled={refunding} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#1C232B] text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition">
              <RotateCcw className="w-4 h-4" />
              {refunding ? 'Submitting...' : 'Submit Request'}
            </button>
          </>
        }
      >
        {refundTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <p className="text-sm text-amber-400 font-medium">Refund Request</p>
              <p className="text-xs text-[#949599] mt-1">
                {refundTarget.event?.title || refundTarget.eventName} • We'll review your request and process the refund if eligible.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">Reason for refund</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                placeholder="Explain why you're requesting a refund..."
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
