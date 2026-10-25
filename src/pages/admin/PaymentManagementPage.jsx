import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Download, TrendingUp, Wallet, RotateCcw,
  CheckCircle2, XCircle, ArrowRight, Building2, Search,
  Filter, Eye, AlertCircle, Phone, Mail, Calendar, User,
  FileText, Check, DollarSign, Clock, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPayments, getPayment, refundPayment, getAdminRefundRequests, respondToRefundRequestAdmin, processUnresponsiveRefunds,
  getWithdrawals, approveWithdrawal, rejectWithdrawal,
} from '@/api/admin';
import { REFUND_POLICY_CIRCUMSTANCES, getPolicyClause } from '@/constants/refundPolicy';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const TABS = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'requests', label: 'Refund Requests' },
  { key: 'withdrawals', label: 'Withdrawal Requests' },
  { key: 'refunds', label: 'Refunds Ledger' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const txStatusVariant = (s) => ({
  completed: 'success', success: 'success', paid: 'success', approved: 'success',
  pending: 'pending', processing: 'pending',
  failed: 'error', rejected: 'error', cancelled: 'neutral',
  refunded: 'warning',
}[s?.toLowerCase()] || 'neutral');

const exportCSV = (rows, filename) => {
  if (!rows || !rows.length) return toast.error('Nothing to export');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported successfully');
};

export default function PaymentManagementPage() {
  const { format } = useCurrency();
  const [tab, setTab] = useState('transactions');

  // Data states
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    grossVolume: 0,
    platformRevenue: 0,
    pendingWithdrawals: 0,
    refunds: 0,
    refundsCount: 0,
  });

  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modals & Action states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [selectedCircumstance, setSelectedCircumstance] = useState('1_ORGANIZER_AUTHORIZED');
  const [adminNotes, setAdminNotes] = useState('');
  const [autoProcessing, setAutoProcessing] = useState(false);

  const [approveRequestTarget, setApproveRequestTarget] = useState(null);
  const [declineRequestTarget, setDeclineRequestTarget] = useState(null);
  const [declineRequestReason, setDeclineRequestReason] = useState('');

  const [approveTarget, setApproveTarget] = useState(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPayments({
        status: statusFilter,
        method: methodFilter,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      const data = res.data || {};
      setTransactions(data.payments || []);
      if (data.summary) setSummary(data.summary);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter, search]);

  // Fetch Withdrawals
  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWithdrawals({
        status: statusFilter,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      const data = res.data || {};
      setWithdrawals(data.withdrawals || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  // Fetch Refunds
  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPayments({
        status: 'refunded',
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      const data = res.data || {};
      setRefunds(data.payments || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // Fetch Refund Requests
  const fetchRefundRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminRefundRequests({
        status: statusFilter,
        search: search.trim() || undefined,
      });
      const list = res.data?.refundRequests || [];
      setRefundRequests(list);
      setTotalPages(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load refund requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  // Master fetch on tab/filter change
  useEffect(() => {
    if (tab === 'transactions') fetchTransactions();
    else if (tab === 'requests') fetchRefundRequests();
    else if (tab === 'withdrawals') fetchWithdrawals();
    else if (tab === 'refunds') fetchRefunds();
  }, [tab, page, statusFilter, methodFilter, search, fetchTransactions, fetchRefundRequests, fetchWithdrawals, fetchRefunds]);

  // Approve a pending buyer refund request
  const handleApproveRequest = async (target) => {
    if (!target) return;
    setActionLoading(true);
    try {
      await respondToRefundRequestAdmin(target.id, {
        action: 'approve',
        circumstance: target.policyCircumstance || '1_ORGANIZER_AUTHORIZED',
      });
      toast.success('Refund approved and processed successfully');
      setApproveRequestTarget(null);
      fetchRefundRequests();
      getPayments({ limit: 1 }).then((r) => {
        if (r.data?.summary) setSummary(r.data.summary);
      }).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve refund request');
    } finally {
      setActionLoading(false);
    }
  };

  // Decline a pending buyer refund request
  const handleDeclineRequest = async () => {
    if (!declineRequestTarget || !declineRequestReason.trim()) {
      return toast.error('Please enter an explanation for declining the request');
    }
    setActionLoading(true);
    try {
      await respondToRefundRequestAdmin(declineRequestTarget.id, {
        action: 'decline',
        responseReason: declineRequestReason.trim(),
      });
      toast.success('Refund request declined. Buyer has been notified.');
      setDeclineRequestTarget(null);
      setDeclineRequestReason('');
      fetchRefundRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline refund request');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset page when filters change
  const handleTabChange = (key) => {
    setTab(key);
    setPage(1);
    setSearch('');
    setStatusFilter('all');
    setMethodFilter('all');
  };

  // Inspect Order Details
  const handleInspectOrder = async (orderId) => {
    setOrderDetailsLoading(true);
    try {
      const res = await getPayment(orderId);
      setSelectedOrder(res.data?.payment || null);
    } catch (err) {
      toast.error('Failed to load order details');
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  // Execute Refund per TRIBESANDCLIQS Policy
  const handleProcessRefund = async () => {
    if (!refundTarget) return;
    setActionLoading(true);
    try {
      await refundPayment(refundTarget.id, {
        reason: refundReason.trim() || undefined,
        circumstance: selectedCircumstance,
        policyCircumstance: selectedCircumstance,
        adminNotes: adminNotes.trim() || undefined,
      });
      toast.success('Order successfully refunded per policy');
      setRefundTarget(null);
      setRefundReason('');
      setAdminNotes('');
      setSelectedCircumstance('1_ORGANIZER_AUTHORIZED');
      if (tab === 'transactions') fetchTransactions();
      else fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setActionLoading(false);
    }
  };

  // One-click batch sweep for unresponsive organizer SLA (> 1 day / 24 hours)
  const handleProcessUnresponsive = async () => {
    setAutoProcessing(true);
    try {
      const res = await processUnresponsiveRefunds();
      toast.success(res.data?.message || 'Overdue requests processed successfully');
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process overdue requests');
    } finally {
      setAutoProcessing(false);
    }
  };

  // Execute Approve Withdrawal
  const handleApproveWithdrawal = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await approveWithdrawal(approveTarget.id, {
        reference: payoutRef.trim() || undefined,
        notes: payoutNotes.trim() || undefined,
      });
      toast.success('Withdrawal approved and marked disbursed');
      setApproveTarget(null);
      setPayoutRef('');
      setPayoutNotes('');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve payout');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Reject Withdrawal
  const handleRejectWithdrawal = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      return toast.error('Please specify a rejection reason');
    }
    setActionLoading(true);
    try {
      await rejectWithdrawal(rejectTarget.id, { reason: rejectReason.trim() });
      toast.success('Withdrawal rejected');
      setRejectTarget(null);
      setRejectReason('');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject withdrawal');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        accent="emerald"
        title="Financials &amp; Settlements"
        subtitle="Track platform payments, authorize organizer payouts, process refunds, and monitor revenue."
        actions={
          <button
            onClick={() => {
              if (tab === 'transactions') exportCSV(transactions, `transactions-${Date.now()}.csv`);
              else if (tab === 'withdrawals') exportCSV(withdrawals, `withdrawals-${Date.now()}.csv`);
              else exportCSV(refunds, `refunds-${Date.now()}.csv`);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] text-xs font-medium text-neutral-300 border border-white/[0.08] hover:text-white hover:bg-white/[0.08] transition"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={CreditCard}
          label="Total Orders"
          value={(summary.totalTransactions ?? 0).toLocaleString()}
          sub={`Gross Vol: ${format(summary.grossVolume)}`}
        />
        <StatCard
          icon={TrendingUp}
          label="Est. Platform Revenue"
          value={format(summary.platformRevenue)}
          accent
          sub="Platform processing fee"
        />
        <StatCard
          icon={Wallet}
          label="Pending Payouts"
          value={format(summary.pendingWithdrawals)}
          sub="Awaiting review"
        />
        <StatCard
          icon={RotateCcw}
          label="Refunds Processed"
          value={format(summary.refunds)}
          sub={`${summary.refundsCount || 0} refunded orders`}
        />
      </div>

      {/* Tabs & Filters Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-1 overflow-x-auto">
          <div className="flex items-center gap-1 whitespace-nowrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={
                tab === 'requests'
                  ? 'Search buyer, order ref, event, or organizer...'
                  : tab === 'withdrawals'
                  ? 'Search organizer, account number, or payout reference...'
                  : 'Search order ref, buyer name, email, or event...'
              }
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-[#121620] border border-white/[0.08] text-xs text-neutral-300 focus:outline-none focus:border-white/30"
            >
              <option value="all">All Statuses</option>
              {tab === 'requests' ? (
                <>
                  <option value="pending">Pending Review</option>
                  <option value="processed">Approved / Processed</option>
                  <option value="rejected">Declined</option>
                </>
              ) : tab === 'withdrawals' ? (
                <>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved / Disbursed</option>
                  <option value="rejected">Rejected</option>
                </>
              ) : (
                <>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </>
              )}
            </select>

            {/* Payment Method filter (transactions tab only) */}
            {tab === 'transactions' && (
              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg bg-[#121620] border border-white/[0.08] text-xs text-neutral-300 focus:outline-none focus:border-white/30"
              >
                <option value="all">All Methods</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-xl bg-[#121620] border border-white/[0.08] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading financial records..." className="py-20" />
        ) : tab === 'transactions' ? (
          /* ─── TRANSACTIONS TAB ─── */
          transactions.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No transactions found"
              description="No orders match your active filter criteria."
              className="py-16"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Buyer</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="hidden md:table-cell px-4 py-3">Method</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="hidden md:table-cell px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-white font-medium">
                          {tx.reference}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{tx.userName || 'Guest'}</p>
                          <p className="text-[11px] text-neutral-400">{tx.userEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-neutral-300 max-w-[180px] truncate">
                          {tx.eventTitle || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white tabular-nums whitespace-nowrap">
                          {format(tx.amount)}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-[11px] text-neutral-400 capitalize">
                          {tx.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Card'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={txStatusVariant(tx.status)} size="sm">
                            {tx.status}
                          </Badge>
                          {tx.refundRequestStatus === 'pending' && (
                            <span className="block mt-1 text-[10px] font-medium text-amber-300 uppercase tracking-wider bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded w-max">
                              Refund Requested
                            </span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-[11px] text-neutral-400 tabular-nums">
                          {fmtDate(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleInspectOrder(tx.id)}
                              className="p-1.5 rounded-lg bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {tx.refundRequestStatus === 'pending' ? (
                              <button
                                onClick={() => {
                                  setApproveRequestTarget({
                                    id: tx.refundId || tx.id,
                                    orderId: tx.id,
                                    orderReference: tx.reference,
                                    amount: tx.amount,
                                    buyerName: tx.userName,
                                    buyerEmail: tx.userEmail,
                                    eventTitle: tx.eventTitle,
                                    organizerName: 'Organizer',
                                    reason: tx.refundReason || 'Buyer requested refund',
                                    policyCircumstance: tx.policyCircumstance || '1_ORGANIZER_AUTHORIZED',
                                  });
                                }}
                                className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Refund
                              </button>
                            ) : tx.status === 'completed' ? (
                              <button
                                onClick={() => { setRefundTarget(tx); setRefundReason(''); }}
                                className="px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium hover:bg-rose-500/20 transition"
                              >
                                Refund
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )
        ) : tab === 'requests' ? (
          /* ─── REFUND REQUESTS TAB ─── */
          refundRequests.length === 0 ? (
            <div className="space-y-4 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Clause 5 SLA Automation</p>
                    <p className="text-[11px] text-neutral-400">Auto-process pending requests where organizer response exceeded 1 day (24 hours).</p>
                  </div>
                </div>
                <button
                  onClick={handleProcessUnresponsive}
                  disabled={autoProcessing}
                  className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-40 shrink-0"
                >
                  {autoProcessing ? 'Processing SLA...' : 'Execute 1-Day SLA Sweep'}
                </button>
              </div>

              <EmptyState
                icon={RotateCcw}
                title="No refund requests found"
                description="When buyers submit refund requests, they will appear here for organizer and admin approval."
                className="py-16"
              />
            </div>
          ) : (
            <>
              {/* SLA Banner */}
              <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Buyer Refund Review &amp; Approval</p>
                    <p className="text-[11px] text-neutral-400">Review buyer requests. Both organizers and admins have authority to approve and proceed with reversals.</p>
                  </div>
                </div>
                <button
                  onClick={handleProcessUnresponsive}
                  disabled={autoProcessing}
                  className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-40 shrink-0"
                >
                  {autoProcessing ? 'Processing SLA...' : 'Execute 1-Day SLA Sweep'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-4 py-3">Order Ref</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Event &amp; Organizer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Reason &amp; Policy</th>
                      <th className="px-4 py-3">24h SLA Status</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {refundRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-white font-medium">
                          {r.orderReference}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{r.buyerName || 'Buyer'}</p>
                          <p className="text-[11px] text-neutral-400">{r.buyerEmail}</p>
                          {r.buyerPhone && <p className="text-[11px] text-neutral-500">{r.buyerPhone}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-neutral-300 font-medium max-w-[180px] truncate">{r.eventTitle}</p>
                          <p className="text-[11px] text-neutral-400 max-w-[180px] truncate">Org: {r.organizerName || 'Organizer'}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white tabular-nums whitespace-nowrap">
                          {format(r.amount)}
                        </td>
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="text-[11px] text-neutral-300 italic line-clamp-2">
                            "{r.reason || 'No explanation provided'}"
                          </p>
                          {r.policyTitle && (
                            <span className="inline-block mt-1 text-[10px] font-medium text-neutral-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                              {r.policyTitle}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.status === 'pending' ? (
                            r.isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                <Clock className="w-3 h-3" /> SLA Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-neutral-300">
                                <Clock className="w-3 h-3" /> {r.hoursRemaining != null ? `${r.hoursRemaining}h left` : 'Pending'}
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-neutral-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              r.status === 'processed'
                                ? 'success'
                                : r.status === 'rejected'
                                ? 'error'
                                : 'pending'
                            }
                            size="sm"
                          >
                            {r.status === 'processed'
                              ? 'Approved'
                              : r.status === 'rejected'
                              ? 'Declined'
                              : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleInspectOrder(r.orderId)}
                              className="p-1.5 rounded-lg bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition"
                              title="View Order Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {r.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => setApproveRequestTarget(r)}
                                  className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition flex items-center gap-1"
                                  title="Approve and proceed with refund"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => { setDeclineRequestTarget(r); setDeclineRequestReason(''); }}
                                  className="px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-medium hover:bg-rose-500/20 transition flex items-center gap-1"
                                  title="Decline request"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Decline
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : tab === 'withdrawals' ? (
          /* ─── WITHDRAWALS TAB ─── */
          withdrawals.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No withdrawal requests"
              description="Organizer payout requests will appear here for review."
              className="py-16"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-4 py-3">Organizer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Payout Destination</th>
                      <th className="hidden md:table-cell px-4 py-3">Reference</th>
                      <th className="hidden md:table-cell px-4 py-3">Requested Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {withdrawals.map((wd) => (
                      <tr key={wd.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{wd.organizerName}</p>
                          <p className="text-[11px] text-neutral-400">{wd.organizerEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-white tabular-nums whitespace-nowrap">
                          {format(wd.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                            <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>{wd.bankName}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {wd.accountNumber} ({wd.accountName})
                          </p>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 font-mono text-[11px] text-neutral-400">
                          {wd.reference || `WD-${wd.id}`}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-[11px] text-neutral-400 tabular-nums">
                          {fmtDate(wd.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={txStatusVariant(wd.status)} size="sm">
                            {wd.status}
                          </Badge>
                          {wd.status === 'rejected' && wd.rejectionReason && (
                            <p className="text-[11px] text-rose-400 mt-1 max-w-xs truncate" title={wd.rejectionReason}>
                              Reason: {wd.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {wd.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setApproveTarget(wd);
                                  setPayoutRef(wd.reference || '');
                                  setPayoutNotes('');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectTarget(wd);
                                  setRejectReason('');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-medium hover:bg-rose-500/20 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-500">
                              {wd.processedAt ? `Processed ${fmtDate(wd.processedAt)}` : 'Closed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )
        ) : (
          /* ─── REFUNDS TAB ─── */
          refunds.length === 0 ? (
            <div className="space-y-4 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Clause 5 SLA Automation</p>
                    <p className="text-[11px] text-neutral-400">Auto-process pending requests where organizer response exceeded 1 day (24 hours).</p>
                  </div>
                </div>
                <button
                  onClick={handleProcessUnresponsive}
                  disabled={autoProcessing}
                  className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-40 shrink-0"
                >
                  {autoProcessing ? 'Processing SLA...' : 'Execute 1-Day SLA Sweep'}
                </button>
              </div>

              <EmptyState
                icon={RotateCcw}
                title="No refunded transactions"
                description="Refunded customer orders will show up here in the ledger."
                className="py-16"
              />
            </div>
          ) : (
            <>
              {/* SLA Sweep Banner */}
              <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-neutral-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Platform Refund Policy SLA</p>
                    <p className="text-[11px] text-neutral-400">Overdue requests without organizer response (&gt; 1 day) are eligible for platform resolution under Clause 5.</p>
                  </div>
                </div>
                <button
                  onClick={handleProcessUnresponsive}
                  disabled={autoProcessing}
                  className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-40 shrink-0"
                >
                  {autoProcessing ? 'Processing SLA...' : 'Execute 1-Day SLA Sweep'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-4 py-3">Order Ref</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Policy Ground</th>
                      <th className="px-4 py-3 text-right">Refunded Amount</th>
                      <th className="hidden md:table-cell px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="hidden md:table-cell px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {refunds.map((rf) => {
                      const clause = rf.policyClause || getPolicyClause(rf.policyCircumstance || rf.clauseNumber);
                      return (
                        <tr key={rf.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-white">
                            {rf.reference}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{rf.userName}</p>
                            <p className="text-[11px] text-neutral-400">{rf.userEmail}</p>
                          </td>
                          <td className="px-4 py-3 text-neutral-300 max-w-[160px] truncate">
                            {rf.eventTitle}
                          </td>
                          <td className="px-4 py-3">
                            {clause ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 font-semibold text-xs text-neutral-200">
                                  Clause #{clause.clauseNumber}
                                </span>
                                <span className="text-[11px] text-neutral-400 truncate max-w-[150px]" title={clause.description}>
                                  {clause.shortTitle}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-neutral-400">General Refund</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-neutral-200 tabular-nums whitespace-nowrap">
                            {format(rf.amount)}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-[11px] text-neutral-400 capitalize">
                            {rf.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Card'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="warning" size="sm">
                              Refunded
                            </Badge>
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-[11px] text-neutral-400 tabular-nums">
                            {fmtDate(rf.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleInspectOrder(rf.id)}
                              className="p-1.5 rounded-lg bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition"
                              title="Inspect Order"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )
        )}
      </div>

      {/* ─── MODAL 1: ORDER DETAILS INSPECTOR ─── */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Transaction & Order Breakdown"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400">Order Reference</span>
                <p className="font-mono text-sm font-semibold text-white">{selectedOrder.payment_reference || `#${selectedOrder.id}`}</p>
              </div>
              <Badge variant={txStatusVariant(selectedOrder.payment_status)} size="sm" dot>
                {selectedOrder.payment_status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                <span className="text-neutral-400 block mb-1">Event</span>
                <p className="font-medium text-white truncate">{selectedOrder.event_title}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                <span className="text-neutral-400 block mb-1">Buyer</span>
                <p className="font-medium text-white truncate">{selectedOrder.buyer_name}</p>
                <p className="text-[11px] text-neutral-400 truncate">{selectedOrder.buyer_email}</p>
              </div>
            </div>

            {/* Ticket Items */}
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                Purchased Tickets ({selectedOrder.items?.length || 0})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-white">{item.ticket_name || 'Ticket'}</p>
                      <span className="text-neutral-400">Qty: {item.quantity} × {format(item.unit_price)}</span>
                    </div>
                    <span className="font-mono font-semibold text-white">
                      {format(Number(item.quantity) * Number(item.unit_price))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-300">
                <span>Total Amount Paid</span>
                <span className="font-semibold text-white text-sm">{format(selectedOrder.total_amount)}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Coupon Discount</span>
                  <span>-{format(selectedOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-neutral-400 pt-2 border-t border-white/[0.06]">
                <span>Payment Method</span>
                <span className="capitalize text-white font-medium">{selectedOrder.payment_method || 'Card'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 2: APPROVE WITHDRAWAL ─── */}
      <Modal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Authorize Organizer Payout"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={() => setApproveTarget(null)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveWithdrawal}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-semibold hover:bg-emerald-400 transition shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Confirm & Disburse'}
            </button>
          </div>
        }
      >
        {approveTarget && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-300">
              Confirm payout of{' '}
              <span className="font-semibold text-white text-sm">
                {format(approveTarget.amount)}
              </span>{' '}
              to <span className="font-semibold text-white">{approveTarget.organizerName}</span>.
            </p>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Bank / Network:</span>
                <span className="font-medium text-white">{approveTarget.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Account Number:</span>
                <span className="font-mono text-white">{approveTarget.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Account Name:</span>
                <span className="text-white">{approveTarget.accountName}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                Bank Transfer / Mobile Money Reference
              </label>
              <input
                type="text"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="Transaction reference or Transfer ID"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                Disbursement Notes (Optional)
              </label>
              <textarea
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Internal audit notes..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 resize-none transition"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 3: REJECT WITHDRAWAL ─── */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Withdrawal Request"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={() => setRejectTarget(null)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectWithdrawal}
              disabled={actionLoading || !rejectReason.trim()}
              className="px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-400 transition shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        }
      >
        {rejectTarget && (
          <div className="space-y-3.5">
            <p className="text-xs text-neutral-300">
              Reject payout request of{' '}
              <span className="font-semibold text-white">{format(rejectTarget.amount)}</span> from{' '}
              <span className="font-semibold text-white">{rejectTarget.organizerName}</span>?
            </p>
            <p className="text-xs text-neutral-400">
              The funds will be restored to the organizer's available wallet balance. Please specify why so they can resolve the issue:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejecting withdrawal request..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 resize-none transition"
            />
          </div>
        )}
      </Modal>

      {/* ─── MODAL 4: PROCESS REFUND ─── */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="Process Customer Refund (Policy Enforcement)"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={() => setRefundTarget(null)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessRefund}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-amber-400 text-neutral-950 text-xs font-semibold hover:bg-amber-300 transition shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Refunding...' : 'Confirm Policy Refund'}
            </button>
          </div>
        }
      >
        {refundTarget && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-300">
              Issue full refund of{' '}
              <span className="font-semibold text-white text-sm">
                {format(refundTarget.amount)}
              </span>{' '}
              for order <span className="font-mono text-white">{refundTarget.reference}</span>?
            </p>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs space-y-1">
              <p className="text-neutral-400">Customer: <span className="text-white font-medium">{refundTarget.userName}</span> ({refundTarget.userEmail})</p>
              <p className="text-neutral-400">Event: <span className="text-white font-medium">{refundTarget.eventTitle}</span></p>
            </div>

            {/* Policy Circumstance Selector */}
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                Statutory Policy Ground (1 of 10 TRIBESANDCLIQS Conditions)
              </label>
              <select
                value={selectedCircumstance}
                onChange={(e) => setSelectedCircumstance(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#121620] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/30 transition"
              >
                {REFUND_POLICY_CIRCUMSTANCES.map((c) => (
                  <option key={c.id} value={c.id}>
                    Clause {c.clauseNumber}: {c.shortTitle}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Clause Preview Card */}
            {(() => {
              const clause = getPolicyClause(selectedCircumstance);
              return clause ? (
                <div className="p-3.5 rounded-xl bg-amber-400/[0.05] border border-amber-400/20 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-400">
                      Clause #{clause.clauseNumber}: {clause.title}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-black/40 text-amber-300">
                      {clause.category}
                    </span>
                  </div>
                  <p className="text-neutral-300 italic">
                    "{clause.description}"
                  </p>
                </div>
              ) : null;
            })()}

            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                Reason / Customer Explanation
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for issuing refund (included in customer notice)..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 resize-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                Internal Admin & Compliance Notes (Optional)
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal audit reference, ticket ID, or investigation notes..."
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 5: APPROVE BUYER REFUND REQUEST ─── */}
      <Modal
        open={!!approveRequestTarget}
        onClose={() => setApproveRequestTarget(null)}
        title="Approve & Proceed Refund"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={() => setApproveRequestTarget(null)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition"
            >
              Cancel
            </button>
            <button
              onClick={() => handleApproveRequest(approveRequestTarget)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-semibold hover:bg-emerald-400 transition shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Processing Reversal...' : 'Confirm & Proceed Refund'}
            </button>
          </div>
        }
      >
        {approveRequestTarget && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-300">
              Approve refund request and execute payment reversal of{' '}
              <span className="font-semibold text-white text-sm">
                {format(approveRequestTarget.amount)}
              </span>{' '}
              for order <span className="font-mono text-white">{approveRequestTarget.orderReference}</span>?
            </p>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs space-y-1.5">
              <p className="text-neutral-400">Buyer: <span className="text-white font-medium">{approveRequestTarget.buyerName}</span> ({approveRequestTarget.buyerEmail})</p>
              <p className="text-neutral-400">Event: <span className="text-white font-medium">{approveRequestTarget.eventTitle}</span></p>
              <p className="text-neutral-400">Organizer: <span className="text-white font-medium">{approveRequestTarget.organizerName}</span></p>
              <p className="text-neutral-400">Reason cited: <span className="text-amber-300 italic">"{approveRequestTarget.reason || 'Buyer requested refund'}"</span></p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 text-xs text-emerald-300">
              <p className="font-semibold">Automated Actions on Confirmation:</p>
              <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-neutral-300">
                <li>Reversal executed via Paystack payment gateway.</li>
                <li>Customer tickets cancelled immediately.</li>
                <li>Both buyer and organizer notified with policy confirmation.</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 6: DECLINE BUYER REFUND REQUEST ─── */}
      <Modal
        open={!!declineRequestTarget}
        onClose={() => setDeclineRequestTarget(null)}
        title="Decline Refund Request"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={() => setDeclineRequestTarget(null)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDeclineRequest}
              disabled={actionLoading || !declineRequestReason.trim()}
              className="px-4 py-2 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-400 transition shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        }
      >
        {declineRequestTarget && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-300">
              Decline refund request for order <span className="font-mono text-white">{declineRequestTarget.orderReference}</span> ({format(declineRequestTarget.amount)}).
            </p>
            <div>
              <label className="text-xs font-medium text-neutral-400 block mb-1.5">
                Explanation / Reason for Decline (Sent to Buyer)
              </label>
              <textarea
                value={declineRequestReason}
                onChange={(e) => setDeclineRequestReason(e.target.value)}
                placeholder="State why this refund cannot be authorized..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 resize-none transition"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
