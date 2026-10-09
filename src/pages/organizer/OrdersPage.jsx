import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, ShoppingBag, DollarSign, Clock, RotateCcw,
  ChevronDown, ChevronUp, CreditCard, Check, Printer, Receipt as ReceiptIcon,
  ShieldAlert, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrders, refundOrder } from '@/api/orders';
import { getDashboard, getOrganizerRefundRequests, respondToRefundRequest } from '@/api/organizer';
import { useCurrency } from '@/context/CurrencyContext';
import { REFUND_POLICY_CIRCUMSTANCES } from '@/constants/refundPolicy';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import ReceiptModal from '@/components/common/ReceiptModal';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';

const statusVariant = (s) => {
  const map = { completed: 'success', paid: 'success', pending: 'pending', failed: 'error', refunded: 'warning', cancelled: 'neutral' };
  return map[(s || '').toLowerCase()] || 'neutral';
};

const STATUS_TABS = ['All', 'Completed', 'Pending', 'Refund Requests', 'Refunded'];

export default function OrdersPage() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [selected, setSelected] = useState(new Set());

  // Direct order refund modal
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Refund request decline modal
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Authorize direct refund from order detail (Clause 1)
  const handleRefundOrder = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await refundOrder(refundTarget.id, {
        reason: refundReason.trim() || 'Organizer authorized refund',
        circumstance: '1_ORGANIZER_AUTHORIZED',
      });
      toast.success('Refund authorized & processed per Clause 1');
      setRefundTarget(null);
      setRefundReason('');
      setDetailOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setRefunding(false);
    }
  };

  // Authorize a buyer's pending refund request (Clause 1)
  const handleAuthorizeRequest = async (reqItem) => {
    setActionLoading(true);
    try {
      await respondToRefundRequest(reqItem.id, { action: 'authorize' });
      toast.success('Refund authorized and processed per Clause 1');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to authorize refund');
    } finally {
      setActionLoading(false);
    }
  };

  // Decline a buyer's pending refund request
  const handleDeclineRequest = async () => {
    if (!declineTarget || !declineReason.trim()) return;
    setActionLoading(true);
    try {
      await respondToRefundRequest(declineTarget.id, {
        action: 'decline',
        responseReason: declineReason.trim(),
      });
      toast.success('Refund request declined. Buyer has been notified.');
      setDeclineTarget(null);
      setDeclineReason('');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline refund request');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (statusTab === 'Refund Requests') {
        const res = await getOrganizerRefundRequests({ status: 'all' });
        const list = res.data?.refundRequests || [];
        setRefundRequests(
          search
            ? list.filter(
                (r) =>
                  r.orderReference?.toLowerCase().includes(search.toLowerCase()) ||
                  r.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
                  r.eventTitle?.toLowerCase().includes(search.toLowerCase()),
              )
            : list,
        );
        setTotalPages(1);
      } else {
        const params = { page, limit: 10 };
        if (statusTab !== 'All') params.status = statusTab.toLowerCase();
        if (search) params.search = search;
        const res = await getOrders(params);
        const payload = res.data;
        setOrders(Array.isArray(payload) ? payload : payload.orders || payload.data || []);
        setTotalPages(payload.totalPages || payload.pages || Math.ceil((payload.total || 0) / 10) || 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, statusTab, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [statusTab, search]);

  useEffect(() => {
    getDashboard().then((res) => setSummary(res.data?.metrics || {})).catch(() => {});
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  };

  const exportCSV = (rows) => {
    const list = rows || orders;
    if (!list.length) { toast.error('No orders to export'); return; }
    const headers = ['Order ID', 'Customer', 'Email', 'Event', 'Ticket Type', 'Qty', 'Amount', 'Payment Method', 'Status', 'Date'];
    const lines = list.map((o) => [
      o.reference || o.id, o.customerName || o.user?.name || '', o.customerEmail || o.user?.email || '',
      o.eventTitle || o.event?.title || '', o.ticketType || o.ticket?.type || '', o.quantity || o.ticketCount || 0,
      o.amount || o.total || '', o.paymentMethod || '', o.status || '',
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
    ]);
    const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders &amp; Ticket Sales"
        description="Monitor ticket orders, review attendee refund requests, and authorize policy reversals."
        actions={
          <button
            onClick={() => exportCSV()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C232B] border border-[#262B2F] text-xs font-semibold text-white hover:bg-[#252E38] transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        }
      />

      {/* Top metrics summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={summary.ordersCount || summary.totalOrders || 0} icon={ShoppingBag} />
        <StatCard title="Gross Sales" value={format(summary.totalRevenue || summary.grossSales || 0)} icon={DollarSign} />
        <StatCard title="Refunds Processed" value={summary.refundsCount || 0} icon={RotateCcw} />
        <StatCard title="Pending Requests" value={refundRequests.filter((r) => r.status === 'pending').length} icon={Clock} />
      </div>

      {/* Policy Notice Card */}
      <div className="p-4 rounded-2xl bg-[#14181C] border border-amber-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">TRIBESANDCLIQS 1-Day (24h) Response SLA</p>
            <p className="text-[#949599]">Organizers have 24 hours to review buyer refund requests. If unaddressed, TRIBESANDCLIQS may issue refunds under Clause 5.</p>
          </div>
        </div>
        <button
          onClick={() => setStatusTab('Refund Requests')}
          className="px-3.5 py-1.5 rounded-lg bg-[#1C232B] border border-[#262B2F] text-amber-300 font-semibold hover:bg-white/5 transition whitespace-nowrap"
        >
          View Requests
        </button>
      </div>

      {/* Tabs and search bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setStatusTab(t)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                statusTab === t
                  ? 'bg-white text-[#0E1216]'
                  : 'bg-[#14181C] text-[#949599] hover:text-white border border-[#262B2F]'
              }`}
            >
              {t}
              {t === 'Refund Requests' && refundRequests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-bold">
                  {refundRequests.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#949599] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders or buyer..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#14181C] border border-[#262B2F] text-xs text-white focus:outline-none focus:border-white/40"
          />
        </div>
      </div>

      {/* Content views */}
      {loading ? (
        <LoadingSpinner size="lg" className="py-20" label="Loading orders..." />
      ) : statusTab === 'Refund Requests' ? (
        /* ─── REFUND REQUESTS REVIEW VIEW ─── */
        refundRequests.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No refund requests"
            description="You have no pending or processed customer refund requests for your events."
            className="py-16"
          />
        ) : (
          <div className="rounded-2xl border border-[#262B2F] bg-[#14181C] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#262B2F] bg-[#101418] text-[#949599] font-semibold text-left">
                    <th className="px-4 py-3.5">Order Ref</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Event</th>
                    <th className="px-4 py-3.5 text-right">Amount</th>
                    <th className="px-4 py-3.5">Reason</th>
                    <th className="px-4 py-3.5">1-Day SLA Status</th>
                    <th className="px-4 py-3.5 text-right">Organizer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/60">
                  {refundRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#181D22] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-white font-medium">
                        {req.orderReference || `#${req.orderId}`}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-white">{req.buyerName}</p>
                        <p className="text-[11px] text-[#949599]">{req.buyerEmail}</p>
                      </td>
                      <td className="px-4 py-3.5 text-white max-w-[150px] truncate">
                        {req.eventTitle}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-amber-300">
                        {format(req.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-[#949599] max-w-[200px] truncate" title={req.reason}>
                        {req.reason || 'Not specified'}
                      </td>
                      <td className="px-4 py-3.5">
                        {req.status === 'pending' ? (
                          req.isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold">
                              <AlertTriangle className="w-3 h-3" /> SLA Expired (&gt;24h)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[11px] font-bold">
                              <Clock className="w-3 h-3" /> {req.hoursRemaining}h left
                            </span>
                          )
                        ) : (
                          <Badge variant={req.status === 'processed' ? 'warning' : 'neutral'} size="sm">
                            {req.status === 'processed' ? 'Refunded' : req.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAuthorizeRequest(req)}
                              disabled={actionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold hover:bg-emerald-500/30 transition"
                              title="Authorize Refund (Clause 1)"
                            >
                              Authorize
                            </button>
                            <button
                              onClick={() => {
                                setDeclineTarget(req);
                                setDeclineReason('');
                              }}
                              disabled={actionLoading}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold hover:bg-rose-500/30 transition"
                              title="Decline Request"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#949599]">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders found"
          description="Ticket orders matching your criteria will appear here."
          className="py-16"
        />
      ) : (
        /* ─── ORDERS TABLE VIEW ─── */
        <div className="rounded-2xl border border-[#262B2F] bg-[#14181C] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#262B2F] bg-[#101418] text-[#949599] font-semibold text-left">
                  <th className="px-4 py-3.5 w-10">
                    <input type="checkbox" checked={selected.size === orders.length} onChange={toggleAll} className="w-4 h-4 rounded accent-white cursor-pointer" />
                  </th>
                  <th className="px-4 py-3.5">Order Ref</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Event</th>
                  <th className="px-4 py-3.5">Ticket</th>
                  <th className="px-4 py-3.5 text-center">Qty</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5">Payment</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B2F]/60">
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setDetailOrder(o)}
                    className="hover:bg-[#181D22] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        className="w-4 h-4 rounded accent-white cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-white font-medium">
                      #{o.reference || String(o.id ?? '').slice(-6)}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-white">{o.customerName || o.user?.name || '—'}</p>
                      <p className="text-[11px] text-[#949599]">{o.customerEmail || o.user?.email || ''}</p>
                    </td>
                    <td className="px-4 py-3.5 text-white max-w-[150px] truncate">
                      {o.eventTitle || o.event?.title || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-[#949599]">
                      {o.ticketType || o.ticket?.type || 'Standard'}
                    </td>
                    <td className="px-4 py-3.5 text-center text-[#949599]">
                      {o.quantity || o.ticketCount || 1}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-white">
                      {format(o.amount || o.total)}
                    </td>
                    <td className="px-4 py-3.5 text-[#949599] capitalize">
                      {o.paymentMethod || 'card'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={statusVariant(o.status)} size="sm">
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-[#949599]">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[#262B2F] flex items-center justify-between text-xs text-[#949599]">
            <span>Showing page {page} of {totalPages}</span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ORDER DETAIL ─── */}
      <Modal
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={`Order Details #${detailOrder?.reference || detailOrder?.id}`}
        footer={
          detailOrder ? (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setDetailOrder(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#949599] hover:text-white transition"
              >
                Close
              </button>
              {detailOrder.status === 'completed' && (
                <button
                  onClick={() => {
                    setRefundTarget(detailOrder);
                    setRefundReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition"
                >
                  Authorize Refund (Clause 1)
                </button>
              )}
            </div>
          ) : null
        }
      >
        {detailOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#181D22] border border-[#262B2F] flex items-center justify-between">
              <div>
                <span className="text-[#949599] block">Total Amount</span>
                <span className="text-base font-bold text-white">{format(detailOrder.amount || detailOrder.total)}</span>
              </div>
              <Badge variant={statusVariant(detailOrder.status)} size="sm">
                {detailOrder.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#181D22] border border-[#262B2F]">
                <span className="text-[#949599] block">Customer</span>
                <p className="font-semibold text-white mt-0.5">{detailOrder.customerName || detailOrder.user?.name}</p>
                <p className="text-[#949599] text-[11px]">{detailOrder.customerEmail || detailOrder.user?.email}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#181D22] border border-[#262B2F]">
                <span className="text-[#949599] block">Event</span>
                <p className="font-semibold text-white mt-0.5">{detailOrder.eventTitle || detailOrder.event?.title}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 2: ORGANIZER AUTHORIZE REFUND (CLAUSE 1) ─── */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="Authorize Customer Refund"
        footer={
          <>
            <button
              onClick={() => setRefundTarget(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRefundOrder}
              disabled={refunding}
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition disabled:opacity-50"
            >
              {refunding ? 'Processing Reversal...' : 'Authorize Reversal (Clause 1)'}
            </button>
          </>
        }
      >
        {refundTarget && (
          <div className="space-y-4 text-xs">
            <p className="text-[#EFEFF1]">
              Issue full refund of{' '}
              <span className="font-bold text-white">{format(refundTarget.amount || refundTarget.total)}</span> to{' '}
              <span className="font-semibold text-white">{refundTarget.customerName || refundTarget.user?.name}</span>?
            </p>

            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                TRIBESANDCLIQS Policy Clause 1
              </span>
              <p className="text-[#EFEFF1] text-[11px]">
                "Event Organizer has authorized refunds." Funds will be returned to the buyer's original payment method via Paystack.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#949599] block mb-1">
                Reason / Organizer Authorization Notes
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason or notes regarding this refund authorization..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-[#14181C] border border-[#262B2F] text-xs text-white focus:outline-none focus:border-white/40 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 3: DECLINE REFUND REQUEST ─── */}
      <Modal
        open={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        title="Decline Refund Request"
        footer={
          <>
            <button
              onClick={() => setDeclineTarget(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeclineRequest}
              disabled={actionLoading || !declineReason.trim()}
              className="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition disabled:opacity-50"
            >
              {actionLoading ? 'Declining...' : 'Decline Request'}
            </button>
          </>
        }
      >
        {declineTarget && (
          <div className="space-y-4 text-xs">
            <p className="text-[#EFEFF1]">
              Decline refund request for order <span className="font-mono text-white">#{declineTarget.orderReference}</span> ({format(declineTarget.amount)})?
            </p>
            <div>
              <label className="text-xs font-semibold text-[#949599] block mb-1">
                Explanation for Decline (Required)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Explain why this request is declined per your event terms..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-[#14181C] border border-[#262B2F] text-xs text-white focus:outline-none focus:border-white/40 resize-none"
              />
              <p className="text-[11px] text-[#949599] mt-1">
                This explanation will be shared with the attendee and logged for platform compliance.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Official Receipt Modal */}
      <ReceiptModal open={!!receiptOrder} onClose={() => setReceiptOrder(null)} order={receiptOrder} />
    </div>
  );
}
