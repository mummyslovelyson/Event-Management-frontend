import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Download, TrendingUp, Wallet, RotateCcw,
  CheckCircle2, XCircle, ArrowRight, Building2, Search,
  Filter, Eye, AlertCircle, Phone, Mail, Calendar, User,
  FileText, Check, ShieldAlert, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getPayments, getPayment, refundPayment,
  getWithdrawals, approveWithdrawal, rejectWithdrawal,
} from '@/api/admin';
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

  // Master fetch on tab/filter change
  useEffect(() => {
    if (tab === 'transactions') fetchTransactions();
    else if (tab === 'withdrawals') fetchWithdrawals();
    else if (tab === 'refunds') fetchRefunds();
  }, [tab, page, statusFilter, methodFilter, search, fetchTransactions, fetchWithdrawals, fetchRefunds]);

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

  // Execute Refund
  const handleProcessRefund = async () => {
    if (!refundTarget) return;
    setActionLoading(true);
    try {
      await refundPayment(refundTarget.id, { reason: refundReason });
      toast.success('Order successfully refunded');
      setRefundTarget(null);
      setRefundReason('');
      if (tab === 'transactions') fetchTransactions();
      else fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setActionLoading(false);
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#262B2F] text-sm font-medium text-[#EFEFF1] hover:bg-[#2A2F33] transition"
          >
            <Download className="w-4 h-4" /> Export CSV
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
        <div className="flex items-center justify-between gap-4 border-b border-[#262B2F] pb-1 overflow-x-auto">
          <div className="flex items-center gap-1 whitespace-nowrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-white text-[#1C232B] shadow-sm'
                    : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#1E2328]'
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#949599]" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={
                tab === 'withdrawals'
                  ? 'Search organizer, account number, or payout reference...'
                  : 'Search order ref, buyer name, email, or event...'
              }
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder-[#646A72] focus:outline-none focus:border-white/40"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] focus:outline-none focus:border-white/40"
            >
              <option value="all">All Statuses</option>
              {tab === 'withdrawals' ? (
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
                className="px-3 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] focus:outline-none focus:border-white/40"
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
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden shadow-xl">
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-[#8C939D] border-b border-[#262B2F] bg-[#14171A]">
                      <th className="px-4 py-3.5">Reference</th>
                      <th className="px-4 py-3.5">Buyer</th>
                      <th className="px-4 py-3.5">Event</th>
                      <th className="px-4 py-3.5 text-right">Amount</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Method</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#1C2126] transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-white font-medium">
                          {tx.reference}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-[#EFEFF1]">{tx.userName || 'Guest'}</p>
                          <p className="text-xs text-[#949599]">{tx.userEmail}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[#EFEFF1] max-w-[180px] truncate">
                          {tx.eventTitle || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-white whitespace-nowrap">
                          {format(tx.amount)}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599] capitalize">
                          {tx.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Card'}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={txStatusVariant(tx.status)} size="sm" dot>
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599]">
                          {fmtDate(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleInspectOrder(tx.id)}
                              className="p-1.5 rounded-lg bg-white/5 text-[#949599] hover:text-white hover:bg-white/10 transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {tx.status === 'completed' && (
                              <button
                                onClick={() => { setRefundTarget(tx); setRefundReason(''); }}
                                className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition"
                              >
                                Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
                <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-[#8C939D] border-b border-[#262B2F] bg-[#14171A]">
                      <th className="px-4 py-3.5">Organizer</th>
                      <th className="px-4 py-3.5 text-right">Amount</th>
                      <th className="px-4 py-3.5">Payout Destination</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Reference</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Requested Date</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/60">
                    {withdrawals.map((wd) => (
                      <tr key={wd.id} className="hover:bg-[#1C2126] transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-white">{wd.organizerName}</p>
                          <p className="text-xs text-[#949599]">{wd.organizerEmail}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-white text-base whitespace-nowrap">
                          {format(wd.amount)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-[#EFEFF1]">
                            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-semibold">{wd.bankName}</span>
                          </div>
                          <p className="text-xs text-[#949599] mt-0.5">
                            {wd.accountNumber} ({wd.accountName})
                          </p>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 font-mono text-xs text-[#949599]">
                          {wd.reference || `WD-${wd.id}`}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599]">
                          {fmtDate(wd.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={txStatusVariant(wd.status)} size="sm" dot>
                            {wd.status}
                          </Badge>
                          {wd.status === 'rejected' && wd.rejectionReason && (
                            <p className="text-[11px] text-red-400 mt-1 max-w-xs truncate" title={wd.rejectionReason}>
                              Reason: {wd.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {wd.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setApproveTarget(wd);
                                  setPayoutRef(wd.reference || '');
                                  setPayoutNotes('');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectTarget(wd);
                                  setRejectReason('');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#949599]">
                              {wd.processedAt ? `Processed ${fmtDate(wd.processedAt)}` : 'Closed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
                <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )
        ) : (
          /* ─── REFUNDS TAB ─── */
          refunds.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No refunded transactions"
              description="Refunded customer orders will show up here in the ledger."
              className="py-16"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-[#8C939D] border-b border-[#262B2F] bg-[#14171A]">
                      <th className="px-4 py-3.5">Order Ref</th>
                      <th className="px-4 py-3.5">Customer</th>
                      <th className="px-4 py-3.5">Event</th>
                      <th className="px-4 py-3.5 text-right">Refunded Amount</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Payment Method</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/60">
                    {refunds.map((rf) => (
                      <tr key={rf.id} className="hover:bg-[#1C2126] transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-white">
                          {rf.reference}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-[#EFEFF1]">{rf.userName}</p>
                          <p className="text-xs text-[#949599]">{rf.userEmail}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[#EFEFF1] max-w-[180px] truncate">
                          {rf.eventTitle}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-amber-300 whitespace-nowrap">
                          {format(rf.amount)}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599] capitalize">
                          {rf.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Card'}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="warning" size="sm" dot>
                            Refunded
                          </Badge>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599]">
                          {fmtDate(rf.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleInspectOrder(rf.id)}
                            className="p-1.5 rounded-lg bg-white/5 text-[#949599] hover:text-white hover:bg-white/10 transition"
                            title="Inspect Order"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
                <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
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
        title="Transaction &amp; Order Breakdown"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#14181C] border border-[#262B2F] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#949599]">Order Reference</span>
                <p className="font-mono text-sm font-bold text-white">{selectedOrder.payment_reference || `#${selectedOrder.id}`}</p>
              </div>
              <Badge variant={txStatusVariant(selectedOrder.payment_status)} size="sm" dot>
                {selectedOrder.payment_status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#181D22] border border-[#262B2F]">
                <span className="text-[#949599] block">Event</span>
                <p className="font-semibold text-white mt-0.5">{selectedOrder.event_title}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#181D22] border border-[#262B2F]">
                <span className="text-[#949599] block">Buyer</span>
                <p className="font-semibold text-white mt-0.5">{selectedOrder.buyer_name}</p>
                <p className="text-[11px] text-[#949599]">{selectedOrder.buyer_email}</p>
              </div>
            </div>

            {/* Ticket Items */}
            <div>
              <span className="text-xs font-semibold text-[#949599] uppercase tracking-wider block mb-2">
                Purchased Tickets ({selectedOrder.items?.length || 0})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#14181C] border border-[#262B2F] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{item.ticket_name || 'Ticket'}</p>
                      <span className="text-[#949599]">Qty: {item.quantity} × {format(item.unit_price)}</span>
                    </div>
                    <span className="font-mono font-bold text-white">
                      {format(Number(item.quantity) * Number(item.unit_price))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="p-3.5 rounded-xl bg-[#181D22] border border-[#262B2F] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#949599]">
                <span>Total Amount Paid</span>
                <span className="font-bold text-white text-sm">{format(selectedOrder.total_amount)}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Coupon Discount</span>
                  <span>-{format(selectedOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[#949599] pt-1 border-t border-[#262B2F]">
                <span>Payment Method</span>
                <span className="capitalize text-white">{selectedOrder.payment_method || 'Card'}</span>
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
          <>
            <button
              onClick={() => setApproveTarget(null)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveWithdrawal}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-[#0E1216] text-sm font-bold hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Confirm & Disburse'}
            </button>
          </>
        }
      >
        {approveTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[#EFEFF1]">
              Confirm payout of{' '}
              <span className="font-bold text-white text-base">
                {format(approveTarget.amount)}
              </span>{' '}
              to <span className="font-semibold text-white">{approveTarget.organizerName}</span>.
            </p>

            <div className="p-3.5 rounded-xl bg-[#14181C] border border-[#262B2F] space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#949599]">Bank / Network:</span>
                <span className="font-semibold text-white">{approveTarget.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#949599]">Account Number:</span>
                <span className="font-mono text-white">{approveTarget.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#949599]">Account Name:</span>
                <span className="text-white">{approveTarget.accountName}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#949599] block mb-1">
                Bank Transfer / Mobile Money Reference
              </label>
              <input
                type="text"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                placeholder="e.g. TRX-982173 or Paystack Transfer ID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#949599] block mb-1">
                Disbursement Notes (Optional)
              </label>
              <textarea
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="Internal audit notes..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40 resize-none"
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
          <>
            <button
              onClick={() => setRejectTarget(null)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectWithdrawal}
              disabled={actionLoading || !rejectReason.trim()}
              className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-50"
            >
              {actionLoading ? 'Rejecting...' : 'Reject Request'}
            </button>
          </>
        }
      >
        {rejectTarget && (
          <div className="space-y-3">
            <p className="text-sm text-[#EFEFF1]">
              Reject payout request of{' '}
              <span className="font-bold text-white">{format(rejectTarget.amount)}</span> from{' '}
              <span className="font-semibold text-white">{rejectTarget.organizerName}</span>?
            </p>
            <p className="text-xs text-[#949599]">
              The funds will be restored to the organizer's available wallet balance. Please specify why so they can resolve the issue:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Account name does not match Mobile Money registration..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40 resize-none"
            />
          </div>
        )}
      </Modal>

      {/* ─── MODAL 4: PROCESS REFUND ─── */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="Process Customer Refund"
        footer={
          <>
            <button
              onClick={() => setRefundTarget(null)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessRefund}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-white text-[#12161A] text-sm font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50"
            >
              {actionLoading ? 'Refunding...' : 'Confirm Refund'}
            </button>
          </>
        }
      >
        {refundTarget && (
          <div className="space-y-3">
            <p className="text-sm text-[#EFEFF1]">
              Issue full refund of{' '}
              <span className="font-bold text-white text-base">
                {format(refundTarget.amount)}
              </span>{' '}
              for order <span className="font-mono text-white">{refundTarget.reference}</span>?
            </p>
            <div className="p-3 rounded-xl bg-[#14181C] border border-[#262B2F] text-xs space-y-1">
              <p className="text-[#949599]">Customer: <span className="text-white font-semibold">{refundTarget.userName}</span> ({refundTarget.userEmail})</p>
              <p className="text-[#949599]">Event: <span className="text-white font-semibold">{refundTarget.eventTitle}</span></p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#949599] block mb-1">
                Reason for Refund
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Event date rescheduled / customer cancellation request..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
