import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, ArrowDownToLine, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  AlertCircle, Building2, Smartphone, Eye, EyeOff,
  Search, Filter, Download, RotateCcw, Printer,
  User, Mail, Phone, Calendar, ShoppingBag, Landmark,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  getWalletBalance, getWithdrawals, requestWithdrawal, getWalletEarnings,
} from '@/api/organizer';
import { getOrders, refundOrder } from '@/api/orders';
import { useCurrency } from '@/context/CurrencyContext';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import ReceiptModal from '@/components/common/ReceiptModal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const TABS = [
  { key: 'payments', label: 'Customer Payments' },
  { key: 'payouts', label: 'Payouts & Withdrawals' },
  { key: 'analytics', label: 'Revenue Analytics' },
];

const PAYOUT_METHODS = [
  { key: 'momo', label: 'Mobile Money', icon: Smartphone },
  { key: 'bank', label: 'Bank Transfer', icon: Building2 },
];

const GHANA_BANKS = [
  'GCB Bank', 'Ecobank Ghana', 'Stanbic Bank', 'Absa Bank Ghana',
  'Fidelity Bank Ghana', 'Zenith Bank Ghana', 'CalBank',
  'Access Bank Ghana', 'Standard Chartered', 'Societe Generale Ghana',
];

const MOMO_NETWORKS = [
  'MTN Mobile Money', 'Telecel Cash (Vodafone)', 'AT Money (AirtelTigo)',
];

const statusVariant = (s) => ({
  completed: 'success', success: 'success', paid: 'success', approved: 'success',
  pending: 'pending', processing: 'pending',
  failed: 'error', rejected: 'error', cancelled: 'neutral',
  refunded: 'warning',
}[s?.toLowerCase()] || 'neutral');

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

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

export default function OrganizerPaymentsPage() {
  const { format, currency } = useCurrency();
  const [activeTab, setActiveTab] = useState('payments');

  // Balance & Payout stats
  const [balance, setBalance] = useState({ available: 0, pending: 0, paid: 0, totalEarned: 0 });
  const [hideBalance, setHideBalance] = useState(false);

  // Payments / Orders state
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');

  // Earnings Analytics state
  const [earnings, setEarnings] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);

  // Modals & Action states
  const [detailOrder, setDetailOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);

  const [withdrawModal, setWithdrawModal] = useState(false);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    payoutType: 'momo',
    bankName: 'MTN Mobile Money',
    accountNumber: '',
    accountName: '',
    saveAsDefault: true,
  });

  // Fetch Wallet Balance & Saved Payout settings
  const fetchBalance = useCallback(async () => {
    try {
      const res = await getWalletBalance();
      const bal = res.data?.balance;
      if (bal) {
        setBalance({
          available: Number(bal.available || 0),
          pending: Number(bal.pending || 0),
          paid: Number(bal.paid || 0),
          totalEarned: Number(bal.totalEarned || 0),
        });
      }
      const savedAcc = res.data?.savedPayoutAccount;
      if (savedAcc && (savedAcc.bank_name || savedAcc.account_number || savedAcc.mobile_money)) {
        const isMomo = savedAcc.payout_method === 'mobile_money' || (savedAcc.bank_name && savedAcc.bank_name.toLowerCase().includes('money'));
        setPayoutForm((prev) => ({
          ...prev,
          payoutType: isMomo ? 'momo' : 'bank',
          bankName: savedAcc.bank_name || (isMomo ? 'MTN Mobile Money' : 'GCB Bank'),
          accountNumber: savedAcc.account_number || savedAcc.mobile_money || '',
          accountName: savedAcc.account_name || '',
        }));
      }
    } catch (err) {
      console.error('[OrganizerPaymentsPage] Balance fetch error:', err);
    }
  }, []);

  // Fetch Incoming Customer Payments (Ticket Sales)
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const params = {
        page: paymentPage,
        limit: 15,
      };
      if (paymentStatus && paymentStatus !== 'all') params.status = paymentStatus;
      if (paymentMethod && paymentMethod !== 'all') params.method = paymentMethod;
      if (paymentSearch.trim()) params.search = paymentSearch.trim();

      const res = await getOrders(params);
      const data = res.data || {};
      setPayments(data.orders || (Array.isArray(data) ? data : []));
      setPaymentTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentPage, paymentStatus, paymentMethod, paymentSearch]);

  // Fetch Outgoing Withdrawals
  const fetchWithdrawals = useCallback(async () => {
    setWithdrawalsLoading(true);
    try {
      const res = await getWithdrawals();
      const rows = res.data?.withdrawals || (Array.isArray(res.data) ? res.data : []);
      setWithdrawals(rows);
    } catch (err) {
      toast.error('Failed to load payouts');
    } finally {
      setWithdrawalsLoading(false);
    }
  }, []);

  // Fetch Monthly Earnings
  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const res = await getWalletEarnings({ period: 'monthly' });
      const en = res.data?.earnings || (Array.isArray(res.data) ? res.data : []);
      setEarnings(en);
    } catch (err) {
      console.error('[OrganizerPaymentsPage] Earnings fetch error:', err);
    } finally {
      setEarningsLoading(false);
    }
  }, []);

  // Initial and reactive load
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'payouts') {
      fetchWithdrawals();
    } else if (activeTab === 'analytics') {
      fetchEarnings();
    }
  }, [activeTab, fetchPayments, fetchWithdrawals, fetchEarnings]);

  // Submit Payout / Withdrawal Request
  const handleRequestPayout = async (e) => {
    e?.preventDefault();
    const amt = Number(payoutForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid payout amount');
    if (amt > balance.available) return toast.error(`Amount exceeds available balance (${format(balance.available)})`);
    if (!payoutForm.bankName || !payoutForm.accountNumber || !payoutForm.accountName) {
      return toast.error('Please fill in all destination account details');
    }

    setSubmittingPayout(true);
    try {
      await requestWithdrawal({
        amount: amt,
        bankName: payoutForm.bankName,
        accountNumber: payoutForm.accountNumber,
        accountName: payoutForm.accountName,
        saveAsDefault: payoutForm.saveAsDefault,
      });
      toast.success('Payout request submitted successfully');
      setWithdrawModal(false);
      setPayoutForm((prev) => ({ ...prev, amount: '' }));
      fetchBalance();
      if (activeTab === 'payouts') fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request payout');
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Issue Customer Refund
  const handleRefundOrder = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      await refundOrder(refundTarget.id, { reason: refundReason.trim() });
      toast.success('Refund processed successfully');
      setRefundTarget(null);
      setRefundReason('');
      setDetailOrder(null);
      fetchPayments();
      fetchBalance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setRefunding(false);
    }
  };

  const maskBalance = (val) => (hideBalance ? `${currency === 'USD' ? '$' : '₵'} ••••••` : format(val));

  // Filtered withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (payoutStatusFilter === 'all') return true;
    return w.status?.toLowerCase() === payoutStatusFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        accent="emerald"
        title="Payment &amp; Payout Management"
        subtitle="Manage attendee ticket payments, review orders, authorize refunds, and request account withdrawals."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (activeTab === 'payments') exportCSV(payments, `customer-payments-${Date.now()}.csv`);
                else if (activeTab === 'payouts') exportCSV(withdrawals, `payouts-${Date.now()}.csv`);
                else exportCSV(earnings, `earnings-${Date.now()}.csv`);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#262B2F] text-xs font-semibold text-[#EFEFF1] hover:bg-[#2A2F33] transition"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setWithdrawModal(true)}
              disabled={balance.available <= 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50 shadow-sm"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Request Payout
            </button>
          </div>
        }
      />

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Available for Payout */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1C232B] via-[#20272F] to-[#171A1D] border border-emerald-500/30 p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Available for Payout
            </span>
            <button
              onClick={() => setHideBalance((v) => !v)}
              className="text-[#949599] hover:text-white transition"
              title={hideBalance ? 'Show balance' : 'Hide balance'}
            >
              {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white tracking-tight tabular-nums">
              {maskBalance(balance.available)}
            </p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[11px] text-[#949599]">Disbursement ready</span>
              <button
                onClick={() => setWithdrawModal(true)}
                disabled={balance.available <= 0}
                className="text-xs font-semibold text-emerald-400 hover:underline disabled:opacity-50"
              >
                Withdraw &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <StatCard
          icon={Clock}
          label="Pending Review"
          value={maskBalance(balance.pending)}
          sub="Withdrawals awaiting disbursement"
        />

        {/* Disbursed Payouts */}
        <StatCard
          icon={CheckCircle2}
          label="Total Disbursed"
          value={maskBalance(balance.paid)}
          sub="Successfully transferred to your account"
        />

        {/* Lifetime Gross Sales */}
        <StatCard
          icon={TrendingUp}
          label="Lifetime Gross Sales"
          value={maskBalance(balance.totalEarned)}
          accent
          sub="Gross ticket sales across all events"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-[#262B2F] pb-1 overflow-x-auto">
          <div className="flex items-center gap-1 whitespace-nowrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === t.key
                    ? 'bg-white text-[#1C232B] shadow-sm'
                    : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#1E2328]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Filters Bar (for Customer Payments) */}
        {activeTab === 'payments' && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#949599]" />
              <input
                type="text"
                value={paymentSearch}
                onChange={(e) => { setPaymentSearch(e.target.value); setPaymentPage(1); }}
                placeholder="Search by customer name, email, order reference, or event title..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder-[#646A72] focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={paymentStatus}
                onChange={(e) => { setPaymentStatus(e.target.value); setPaymentPage(1); }}
                className="px-3 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] focus:outline-none focus:border-white/40"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); setPaymentPage(1); }}
                className="px-3 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] focus:outline-none focus:border-white/40"
              >
                <option value="all">All Methods</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
          </div>
        )}

        {/* Dynamic Filters Bar (for Payouts) */}
        {activeTab === 'payouts' && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={payoutStatusFilter}
                onChange={(e) => setPayoutStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] focus:outline-none focus:border-white/40"
              >
                <option value="all">All Payout Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved / Disbursed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button
              onClick={() => setWithdrawModal(true)}
              disabled={balance.available <= 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition disabled:opacity-40"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> New Withdrawal
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Views */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden shadow-xl">
        {activeTab === 'payments' ? (
          /* ─── TAB 1: CUSTOMER PAYMENTS ─── */
          paymentsLoading ? (
            <LoadingSpinner label="Loading customer payments..." className="py-20" />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments found"
              description="Customer ticket purchases and transactions will appear here."
              className="py-16"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-[#8C939D] border-b border-[#262B2F] bg-[#14171A]">
                      <th className="px-4 py-3.5">Reference</th>
                      <th className="px-4 py-3.5">Attendee</th>
                      <th className="px-4 py-3.5">Event</th>
                      <th className="px-4 py-3.5">Tickets</th>
                      <th className="px-4 py-3.5 text-right">Amount</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Method</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="hidden md:table-cell px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/60">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#1C2126] transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-white font-medium">
                          {p.reference}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-white">{p.customerName || p.user?.name || 'Attendee'}</p>
                          <p className="text-xs text-[#949599]">{p.customerEmail || p.user?.email || '—'}</p>
                        </td>
                        <td className="px-4 py-3.5 text-[#EFEFF1] max-w-[160px] truncate">
                          {p.eventTitle || p.event?.title || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#949599] max-w-[150px] truncate">
                          {p.ticketType || `${p.quantity || 1} Ticket(s)`}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-white whitespace-nowrap">
                          {format(p.amount)}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599] capitalize">
                          {p.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Card'}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={statusVariant(p.status)} size="sm" dot>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599] whitespace-nowrap">
                          {fmtDate(p.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setDetailOrder(p)}
                              className="p-1.5 rounded-lg bg-white/5 text-[#949599] hover:text-white hover:bg-white/10 transition"
                              title="Inspect Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReceiptOrder(p)}
                              className="p-1.5 rounded-lg bg-white/5 text-[#949599] hover:text-white hover:bg-white/10 transition"
                              title="Print Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {p.status === 'completed' && (
                              <button
                                onClick={() => {
                                  setRefundTarget(p);
                                  setRefundReason('');
                                }}
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
                <span className="text-xs text-[#949599]">Page {paymentPage} of {paymentTotalPages}</span>
                <Pagination currentPage={paymentPage} totalPages={paymentTotalPages} onPageChange={setPaymentPage} />
              </div>
            </>
          )
        ) : activeTab === 'payouts' ? (
          /* ─── TAB 2: PAYOUTS & WITHDRAWALS ─── */
          withdrawalsLoading ? (
            <LoadingSpinner label="Loading payout history..." className="py-20" />
          ) : filteredWithdrawals.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title="No withdrawals recorded"
              description="Your requested payouts and disbursements will be listed here."
              className="py-16"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-[#8C939D] border-b border-[#262B2F] bg-[#14171A]">
                    <th className="px-4 py-3.5">Reference</th>
                    <th className="px-4 py-3.5 text-right">Requested Amount</th>
                    <th className="px-4 py-3.5">Destination</th>
                    <th className="hidden md:table-cell px-4 py-3.5">Requested Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Admin Note / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/60">
                  {filteredWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-[#1C2126] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-white">
                        {w.reference || `WD-${w.id}`}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-white text-base whitespace-nowrap">
                        {format(w.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{w.bankName || w.bank || 'Mobile Money'}</span>
                        </div>
                        <p className="text-xs text-[#949599] mt-0.5">
                          {w.accountNumber} ({w.accountName})
                        </p>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3.5 text-xs text-[#949599]">
                        {fmtDate(w.requestedAt || w.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant(w.status)} size="sm" dot>
                          {w.status || 'pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {w.status === 'rejected' && w.rejectionReason ? (
                          <span className="text-red-400 font-medium">{w.rejectionReason}</span>
                        ) : w.notes ? (
                          <span className="text-emerald-400">{w.notes}</span>
                        ) : (
                          <span className="text-[#646A72]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ─── TAB 3: REVENUE ANALYTICS ─── */
          earningsLoading ? (
            <LoadingSpinner label="Loading earnings analytics..." className="py-20" />
          ) : earnings.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No earnings recorded yet"
              description="Monthly revenue trends will generate as ticket sales are recorded."
              className="py-16"
            />
          ) : (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Monthly Ticket Revenue Trend</h3>
                <p className="text-xs text-[#949599]">Gross earnings aggregated across your published events</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={earnings} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262B2F" strokeOpacity={0.6} />
                    <XAxis dataKey="period" stroke="#646A72" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#646A72" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => format(v, { compact: true })} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="p-3 rounded-xl bg-[#14181C] border border-[#262B2F] shadow-xl text-xs space-y-1">
                              <p className="text-[#949599] font-medium">{label}</p>
                              <p className="font-bold text-emerald-400 text-sm">{format(payload[0].value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="amount" name="Earnings" stroke="#10B981" strokeWidth={2.5} fill="url(#earnGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        )}
      </div>

      {/* ─── MODAL 1: INSPECT ORDER DETAILS ─── */}
      <Modal
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={`Order Details: ${detailOrder?.reference || detailOrder?.id}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetailOrder(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#949599] hover:text-white transition"
              >
                Close
              </button>
              {detailOrder?.status === 'completed' && (
                <button
                  onClick={() => {
                    setRefundTarget(detailOrder);
                    setRefundReason('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/25 transition"
                >
                  Issue Refund
                </button>
              )}
            </div>
            <button
              onClick={() => {
                const o = detailOrder;
                setDetailOrder(null);
                setReceiptOrder(o);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition shadow-md"
            >
              <Printer className="w-4 h-4" /> View &amp; Print Receipt
            </button>
          </div>
        }
      >
        {detailOrder && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#14181C] border border-[#262B2F] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#949599]">Payment Reference</span>
                <p className="font-mono text-sm font-bold text-white">{detailOrder.reference}</p>
              </div>
              <Badge variant={statusVariant(detailOrder.status)} size="sm" dot>
                {detailOrder.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#181D22] border border-[#262B2F]">
                <span className="text-[#949599] block font-medium">Attendee Information</span>
                <p className="font-semibold text-white mt-1">{detailOrder.customerName || detailOrder.user?.name}</p>
                <p className="text-[#949599] mt-0.5">{detailOrder.customerEmail || detailOrder.user?.email}</p>
                {detailOrder.customerPhone && (
                  <p className="text-[#949599] mt-0.5">{detailOrder.customerPhone}</p>
                )}
              </div>
              <div className="p-3.5 rounded-xl bg-[#181D22] border border-[#262B2F]">
                <span className="text-[#949599] block font-medium">Event &amp; Payment Method</span>
                <p className="font-semibold text-white mt-1">{detailOrder.eventTitle || detailOrder.event?.title}</p>
                <p className="text-xs text-[#949599] mt-0.5 capitalize">
                  {detailOrder.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Card'} &middot; {fmtDate(detailOrder.createdAt)}
                </p>
              </div>
            </div>

            {/* Financial summary */}
            <div className="p-4 rounded-xl bg-[#181D22] border border-[#262B2F] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#949599]">
                <span>Tickets Summary:</span>
                <span className="font-semibold text-white">{detailOrder.ticketType || 'Ticket Pass'}</span>
              </div>
              {Number(detailOrder.discountAmount) > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Coupon Discount:</span>
                  <span>-{format(detailOrder.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-white font-bold text-sm pt-2 border-t border-[#262B2F]">
                <span>Total Paid:</span>
                <span>{format(detailOrder.amount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 2: REQUEST PAYOUT / WITHDRAWAL ─── */}
      <Modal
        open={withdrawModal}
        onClose={() => setWithdrawModal(false)}
        title="Request Payout / Withdrawal"
        footer={
          <>
            <button
              onClick={() => setWithdrawModal(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestPayout}
              disabled={submittingPayout || Number(payoutForm.amount) <= 0 || Number(payoutForm.amount) > balance.available}
              className="px-5 py-2.5 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50"
            >
              {submittingPayout ? 'Submitting...' : 'Submit Request'}
            </button>
          </>
        }
      >
        <form onSubmit={handleRequestPayout} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#14181C] border border-[#262B2F] flex items-center justify-between text-xs">
            <span className="text-[#949599]">Available for Payout:</span>
            <span className="font-bold text-emerald-400 text-sm">{format(balance.available)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#949599] mb-1">
              Withdrawal Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              max={balance.available}
              value={payoutForm.amount}
              onChange={(e) => setPayoutForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-white text-base font-bold focus:outline-none focus:border-white/40"
              required
            />
          </div>

          {/* Payout Destination Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[#949599] mb-2">
              Payout Destination Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYOUT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = payoutForm.payoutType === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPayoutForm((f) => ({
                      ...f,
                      payoutType: m.key,
                      bankName: m.key === 'momo' ? 'MTN Mobile Money' : 'GCB Bank',
                    }))}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition ${
                      active
                        ? 'bg-white text-[#1C232B] border-white'
                        : 'bg-[#14181C] text-[#949599] border-[#262B2F] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {payoutForm.payoutType === 'momo' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#949599] mb-1">Mobile Money Network</label>
                <select
                  value={payoutForm.bankName}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, bankName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40"
                >
                  {MOMO_NETWORKS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#949599] mb-1">Mobile Money Phone Number</label>
                <input
                  type="tel"
                  value={payoutForm.accountNumber}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="e.g. 0244123456"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#949599] mb-1">Bank Name</label>
                <select
                  value={payoutForm.bankName}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, bankName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40"
                >
                  {GHANA_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#949599] mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={payoutForm.accountNumber}
                  onChange={(e) => setPayoutForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="e.g. 10111222333"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1">Account Holder / Subscriber Full Name</label>
            <input
              type="text"
              value={payoutForm.accountName}
              onChange={(e) => setPayoutForm((f) => ({ ...f, accountName: e.target.value }))}
              placeholder="e.g. Kwame Mensah"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="saveDefault"
              checked={payoutForm.saveAsDefault}
              onChange={(e) => setPayoutForm((f) => ({ ...f, saveAsDefault: e.target.checked }))}
              className="rounded border-[#494F55] bg-[#1C232B] text-white focus:ring-0 cursor-pointer"
            />
            <label htmlFor="saveDefault" className="text-xs text-[#949599] cursor-pointer select-none">
              Save as my default payout account
            </label>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 3: ISSUE REFUND ─── */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="Issue Customer Refund"
        footer={
          <>
            <button
              onClick={() => setRefundTarget(null)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRefundOrder}
              disabled={refunding}
              className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-50"
            >
              {refunding ? 'Refunding...' : 'Confirm Refund'}
            </button>
          </>
        }
      >
        {refundTarget && (
          <div className="space-y-3">
            <p className="text-sm text-[#EFEFF1]">
              Refund order <span className="font-mono text-white">#{refundTarget.reference || refundTarget.id}</span> for{' '}
              <span className="font-bold text-white">{format(refundTarget.amount)}</span> to{' '}
              <span className="font-semibold text-white">{refundTarget.customerName || refundTarget.user?.name}</span>?
            </p>
            <p className="text-xs text-[#949599]">
              This will cancel the customer's tickets and release the capacity back to your event inventory.
            </p>
            <div>
              <label className="text-xs font-semibold text-[#949599] block mb-1">
                Reason for Refund (Optional)
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Customer emergency / cancellation request..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-white focus:outline-none focus:border-white/40 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 4: OFFICIAL RECEIPT ─── */}
      <ReceiptModal
        open={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
        order={receiptOrder}
      />
    </div>
  );
}
