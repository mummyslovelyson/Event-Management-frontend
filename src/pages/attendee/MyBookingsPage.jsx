import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CalendarCheck, Search, ChevronDown, Ticket as TicketIcon, Calendar, MapPin,
  XCircle, RotateCcw, FileDown, Receipt, Clock, AlertTriangle, ShieldCheck, ExternalLink,
} from 'lucide-react';
import {
  getOrders, cancelOrder, refundOrder, getOrderInvoice,
} from '@/api/orders';
import Modal from '@/components/common/Modal';
import ReceiptModal from '@/components/common/ReceiptModal';
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

const BUYER_REFUND_CIRCUMSTANCES = [
  {
    id: '5_BUYER_CIRCUMSTANCES_UNRESPONSIVE_ORGANIZER',
    clauseNumber: 5,
    title: 'Buyer Circumstances (Personal Emergency / Unable to Attend)',
    badge: '1-Day Review SLA',
    description: 'Under Clause 5, the Event Organizer has 1 day to respond. If unresponsive, TRIBESANDCLIQS is authorized to issue the refund.',
  },
  {
    id: '4_TRANSACTION_ERROR_DUPLICATE',
    clauseNumber: 4,
    title: 'Transaction Error / Duplicate Charge',
    badge: 'Clause 4',
    description: 'Under Clause 4, accidental duplicate payments or transaction errors are eligible for refund.',
  },
  {
    id: '2_EVENT_CANCELLED',
    clauseNumber: 2,
    title: 'Event Cancelled or Substantially Rescheduled',
    badge: 'Clause 2',
    description: 'Under Clause 2, refunds are permitted if the Event Organizer has cancelled or changed the event.',
  },
  {
    id: '10_EVENT_SUSPECTED_FRAUDULENT',
    clauseNumber: 10,
    title: 'Event Misrepresentation / Consumer Protection Concern',
    badge: 'Clause 10',
    description: 'Under Clause 10, TRIBESANDCLIQS investigates events reported as fraudulent or non-compliant.',
  },
];

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
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundCircumstance, setRefundCircumstance] = useState('5_BUYER_CIRCUMSTANCES_UNRESPONSIVE_ORGANIZER');
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
      const res = await refundOrder(refundTarget.id, {
        reason: refundReason.trim() || undefined,
        circumstance: refundCircumstance,
        policyCircumstance: refundCircumstance,
      });
      toast.success(res.data?.message || 'Refund request submitted (1-day organizer review).');
      setOrders((prev) =>
        prev.map((o) =>
          o.id === refundTarget.id
            ? { ...o, refund_request_status: 'pending', refund_status_detail: 'pending' }
            : o,
        ),
      );
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
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value
                  ? 'bg-white text-[#1C232B]'
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
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
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
            const event = order.event || {
              title: order.event_title || order.eventName,
              startDate: order.start_date || order.eventDate,
              startTime: order.start_time,
              venue: order.venue_name,
              image: order.banner_image,
            };
            const eventDate = event.startDate || order.eventDate || order.start_date;
            const status = (order.status || '').toLowerCase();
            const payStatus = (order.paymentStatus || order.payment_status || 'pending').toLowerCase();
            const isCancelled = status === 'cancelled';
            const isRefunded = payStatus === 'refunded' || status === 'refunded' || order.refund_request_status === 'approved' || order.refund_status_detail === 'completed';
            const isPendingRefund = (order.refund_request_status === 'pending' || order.refund_status_detail === 'pending') && !isRefunded;
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
                className={`rounded-xl bg-[#171A1D] border ${isCancelled ? 'border-red-500/20' : isPendingRefund ? 'border-amber-500/30' : 'border-[#262B2F]'} overflow-hidden transition-colors`}
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
                        {isPendingRefund && (
                          <Badge variant="warning" size="sm">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Refund Pending (24h SLA)
                          </Badge>
                        )}
                        {isRefunded && (
                          <Badge variant="info" size="sm">
                            <ShieldCheck className="w-3 h-3 inline mr-1" />
                            Refunded
                          </Badge>
                        )}
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
                        <span className="text-lg font-bold text-white">
                          {format(order.totalAmount || order.total || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-[#494F55]">
                        Booked on {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>

                    {/* Pending Refund Banner */}
                    {isPendingRefund && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-200">
                            Refund Request Pending Organizer Review (Policy Clause 5)
                          </p>
                          <p className="text-amber-300/85 mt-0.5 leading-relaxed">
                            Under TRIBESANDCLIQS Policy, the Organizer has 1 day (24 hours) to respond. If unresponsive, TRIBESANDCLIQS will intervene to execute the refund.
                          </p>
                          {order.organizer_deadline && (
                            <p className="mt-1 font-mono text-[11px] text-amber-400">
                              Organizer response deadline: {new Date(order.organizer_deadline).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to="/attendee/tickets"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 transition"
                      >
                        <TicketIcon className="w-3.5 h-3.5" /> View Tickets
                      </Link>
                      <button
                        onClick={() => setReceiptOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white hover:text-[#1C232B] transition shadow-sm"
                      >
                        <Receipt className="w-3.5 h-3.5" /> View &amp; Print Receipt
                      </button>
                      <button
                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 transition"
                      >
                        Details
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === order.id ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleExport(order)}
                        disabled={exporting === order.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 disabled:opacity-50 transition"
                      >
                        <FileDown className="w-3.5 h-3.5" /> {exporting === order.id ? 'Exporting...' : 'PDF'}
                      </button>
                      {isUpcoming && !isPendingRefund && !isRefunded && (
                        <button
                          onClick={() => setCancelTarget(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel Booking
                        </button>
                      )}
                      {!isCancelled && !isRefunded && !isPendingRefund && (payStatus === 'paid' || payStatus === 'completed') && (
                        <button
                          onClick={() => {
                            setRefundTarget(order);
                            setRefundCircumstance('5_BUYER_CIRCUMSTANCES_UNRESPONSIVE_ORGANIZER');
                            setRefundReason('');
                          }}
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
                          <span className="text-base font-bold text-white">
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
            <button onClick={() => { setCancelTarget(null); setCancelReason(''); }} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">
              Keep Booking
            </button>
            <button onClick={handleCancel} disabled={cancelling} className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition">
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
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Refund modal */}
      <Modal
        open={!!refundTarget}
        onClose={() => { setRefundTarget(null); setRefundReason(''); }}
        title="Request Refund • TRIBESANDCLIQS Policy"
        footer={
          <>
            <button onClick={() => { setRefundTarget(null); setRefundReason(''); }} className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">
              Cancel
            </button>
            <button
              onClick={handleRefund}
              disabled={refunding || !refundReason.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-[#1C232B] text-sm font-semibold hover:bg-amber-400 disabled:opacity-50 transition shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              {refunding ? 'Submitting Request...' : 'Submit Refund Request'}
            </button>
          </>
        }
      >
        {refundTarget && (
          <div className="space-y-4">
            {/* Context Header */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Policy Request</span>
                <span className="text-[11px] font-mono text-[#949599]">
                  Order #{refundTarget.orderId || refundTarget.id}
                </span>
              </div>
              <p className="text-sm text-white font-medium mt-1">
                {refundTarget.event?.title || refundTarget.eventName || refundTarget.event_title}
              </p>
              <p className="text-xs text-[#949599] mt-0.5">
                Total Paid: {format(refundTarget.totalAmount || refundTarget.total || 0)}
              </p>
            </div>

            {/* Statutory Ground Selector */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">
                Applicable Policy Circumstance (Statutory Ground)
              </label>
              <div className="space-y-2">
                {BUYER_REFUND_CIRCUMSTANCES.map((circ) => {
                  const selected = refundCircumstance === circ.id;
                  return (
                    <label
                      key={circ.id}
                      onClick={() => setRefundCircumstance(circ.id)}
                      className={`block p-3 rounded-lg border text-left cursor-pointer transition ${
                        selected
                          ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40'
                          : 'bg-[#1C232B] border-[#494F55]/30 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="refund_circ"
                            checked={selected}
                            onChange={() => setRefundCircumstance(circ.id)}
                            className="text-amber-500 focus:ring-0"
                          />
                          <span className={`text-xs font-semibold ${selected ? 'text-amber-300' : 'text-[#EFEFF1]'}`}>
                            Clause {circ.clauseNumber}: {circ.title}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#949599] border border-white/10 shrink-0">
                          {circ.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#949599] mt-1 pl-5 leading-relaxed">
                        {circ.description}
                      </p>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* SLA Callout */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-200 leading-relaxed">
                <span className="font-semibold text-blue-300">Clause 5 Statutory SLA Guarantee:</span>
                {" "}Upon submission, this request is immediately transmitted to the Event Organizer. If the Organizer does not respond within <strong>1 calendar day (24 hours)</strong>, TRIBESANDCLIQS is legally authorized to review and execute your refund directly.
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-1.5">
                Detailed Explanation <span className="text-amber-400">*</span>
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                placeholder="Explain the circumstances surrounding this refund request..."
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-amber-500/60 transition resize-none"
              />
              <p className="text-[11px] text-[#949599] mt-1">
                Please provide clear details to facilitate review by the Organizer and TRIBESANDCLIQS.
              </p>
            </div>

            {/* Policy Reference Footer Link */}
            <div className="pt-2 border-t border-[#262B2F] flex items-center justify-between text-xs text-[#949599]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Protected by TRIBESANDCLIQS Limited
              </span>
              <Link
                to="/refund-policy"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
              >
                Read full policy <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* Official Receipt & Print Modal */}
      <ReceiptModal
        open={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
        order={receiptOrder}
      />
    </motion.div>
  );
}
