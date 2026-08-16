import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, Download, TrendingUp, Wallet, RotateCcw,
  CheckCircle2, XCircle, ArrowRight, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPayments, refundPayment } from '@/api/admin';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'refunds', label: 'Refunds' },
];

const ghc = (n) => `₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const txStatusVariant = (s) => ({
  completed: 'success', success: 'success', paid: 'success',
  pending: 'pending', failed: 'error', cancelled: 'neutral', refunded: 'warning', processing: 'info',
}[s] || 'neutral');

const exportCSV = (rows, filename) => {
  if (!rows.length) return toast.error('Nothing to export');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported');
};

export default function PaymentManagementPage() {
  const [tab, setTab] = useState('transactions');
  const [data, setData] = useState({ transactions: [], withdrawals: [], refunds: [] });
  const [summary, setSummary] = useState({ totalTransactions: 0, platformRevenue: 0, pendingWithdrawals: 0, refunds: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, wdRes, rfRes] = await Promise.all([
        getPayments({ type: 'transaction', page, limit: 10 }).catch(() => ({ data: [] })),
        getPayments({ type: 'withdrawal' }).catch(() => ({ data: [] })),
        getPayments({ type: 'refund' }).catch(() => ({ data: [] })),
      ]);
      const tx = txRes.data;
      const txList = Array.isArray(tx) ? tx : tx.transactions || tx.data || [];
      setData({
        transactions: txList,
        withdrawals: Array.isArray(wdRes.data) ? wdRes.data : wdRes.data?.withdrawals || wdRes.data?.data || [],
        refunds: Array.isArray(rfRes.data) ? rfRes.data : rfRes.data?.refunds || rfRes.data?.data || [],
      });
      setSummary(tx.summary || txRes.data?.summary || summary);
      setTotalPages(tx.totalPages || tx.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleWithdrawal = async (id, action) => {
    setActionLoading(`${action}-${id}`);
    try {
      await getPayments({ type: 'withdrawal', id, action });
      toast.success(`Withdrawal ${action}ed`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setActionLoading(`refund-${refundTarget.id}`);
    try {
      await refundPayment(refundTarget.id, { reason: refundReason });
      toast.success('Refund processed');
      setRefundTarget(null);
      setRefundReason('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Refund failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        accent="emerald"
        title="Payments"
        subtitle="Sales, payouts, and refunds in one place."
        actions={
          <button
            onClick={() => exportCSV(data[tab] || [], `${tab}.csv`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#262B2F] text-sm font-medium text-[#EDF0F1] hover:bg-[#2A2F33] transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Total Transactions" value={(summary.totalTransactions ?? 0).toLocaleString()} />
        <StatCard label="Platform Revenue" value={ghc(summary.platformRevenue)} accent />
        <StatCard icon={Wallet} label="Pending Withdrawals" value={ghc(summary.pendingWithdrawals)} />
        <StatCard icon={RotateCcw} label="Refunds" value={ghc(summary.refunds)} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-[#D4AF37] text-[#1E252B]' : 'text-[#7D8387] hover:text-[#F2F4F5] hover:bg-[#242B32]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading payments..." className="py-16" />
        ) : tab === 'transactions' ? (
          data.transactions.length === 0 ? (
            <EmptyState icon={CreditCard} title="No transactions yet" description="Sales will show up here." className="py-16" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                      <th className="px-4 py-3.5 font-medium">Order ID</th>
                      <th className="px-4 py-3.5 font-medium">User</th>
                      <th className="px-4 py-3.5 font-medium">Event</th>
                      <th className="px-4 py-3.5 font-medium text-right">Amount</th>
                      <th className="px-4 py-3.5 font-medium">Method</th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="px-4 py-3.5 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/70">
                    {data.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#1D2124] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[#F2F4F5]">#{tx.reference || tx.id?.slice(-6)}</td>
                        <td className="px-5 py-3 text-[#F2F4F5]">{tx.user?.name || tx.userName || '—'}</td>
                        <td className="px-5 py-3 text-[#7D8387] max-w-[160px] truncate">{tx.event?.title || tx.eventTitle || '—'}</td>
                        <td className="px-5 py-3 text-right font-medium text-[#F2F4F5]">{ghc(tx.amount)}</td>
                        <td className="px-5 py-3 text-[#7D8387]">{tx.method || tx.paymentMethod || '—'}</td>
                        <td className="px-5 py-3"><Badge variant={txStatusVariant(tx.status)} size="sm" dot>{tx.status}</Badge></td>
                        <td className="px-5 py-3 text-xs text-[#7D8387]">{fmtDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
                <span className="text-xs text-[#7D8387]">Page {page} of {totalPages}</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )
        ) : tab === 'withdrawals' ? (
          data.withdrawals.length === 0 ? (
            <EmptyState icon={Wallet} title="No withdrawals" description="Organizer payout requests will show up here." className="py-16" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                    <th className="px-4 py-3.5 font-medium">Organizer</th>
                    <th className="px-4 py-3.5 font-medium text-right">Amount</th>
                    <th className="px-4 py-3.5 font-medium">Bank</th>
                    <th className="px-4 py-3.5 font-medium">Date</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/70">
                  {data.withdrawals.map((wd) => (
                    <tr key={wd.id} className="hover:bg-[#1D2124] transition-colors">
                      <td className="px-5 py-3 text-[#F2F4F5]">{wd.organizerName || wd.organizer || '—'}</td>
                      <td className="px-5 py-3 text-right font-medium text-[#F2F4F5]">{ghc(wd.amount)}</td>
                      <td className="px-5 py-3 text-[#7D8387]"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{wd.bank || wd.bankName || '—'}</span></td>
                      <td className="px-5 py-3 text-xs text-[#7D8387]">{fmtDate(wd.createdAt || wd.requestedAt)}</td>
                      <td className="px-5 py-3"><Badge variant={txStatusVariant(wd.status)} size="sm" dot>{wd.status || 'pending'}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {wd.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleWithdrawal(wd.id, 'approve')}
                                disabled={actionLoading === `approve-${wd.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleWithdrawal(wd.id, 'reject')}
                                disabled={actionLoading === `reject-${wd.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
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
          )
        ) : (
          data.refunds.length === 0 ? (
            <EmptyState icon={RotateCcw} title="No refunds" description="Refund requests will show up here." className="py-16" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                    <th className="px-4 py-3.5 font-medium">Order</th>
                    <th className="px-4 py-3.5 font-medium">User</th>
                    <th className="px-4 py-3.5 font-medium">Event</th>
                    <th className="px-4 py-3.5 font-medium text-right">Amount</th>
                    <th className="px-4 py-3.5 font-medium">Reason</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/70">
                  {data.refunds.map((rf) => (
                    <tr key={rf.id} className="hover:bg-[#1D2124] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#F2F4F5]">#{rf.reference || rf.orderId || rf.id?.slice(-6)}</td>
                      <td className="px-5 py-3 text-[#F2F4F5]">{rf.user?.name || rf.userName || '—'}</td>
                      <td className="px-5 py-3 text-[#7D8387] max-w-[140px] truncate">{rf.event?.title || rf.eventTitle || '—'}</td>
                      <td className="px-5 py-3 text-right font-medium text-[#F2F4F5]">{ghc(rf.amount)}</td>
                      <td className="px-5 py-3 text-[#7D8387] max-w-[160px] truncate">{rf.reason || '—'}</td>
                      <td className="px-5 py-3"><Badge variant={txStatusVariant(rf.status)} size="sm" dot>{rf.status || 'pending'}</Badge></td>
                      <td className="px-5 py-3 text-right">
                        {rf.status === 'pending' && (
                          <button
                            onClick={() => { setRefundTarget(rf); setRefundReason(''); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-semibold hover:bg-[#D4AF37]/25 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Process
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Refund Modal */}
      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="Process Refund"
        footer={
          <>
            <button onClick={() => setRefundTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#7D8387] hover:text-[#F2F4F5] transition">Cancel</button>
            <button
              onClick={handleRefund}
              disabled={actionLoading === `refund-${refundTarget?.id}`}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Process Refund'}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#F2F4F5]">Refund <span className="font-semibold">{ghc(refundTarget?.amount)}</span> to {refundTarget?.user?.name || refundTarget?.userName}?</p>
        <textarea
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          placeholder="Reason for refund..."
          className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 resize-none"
          rows={3}
        />
      </Modal>
    </div>
  );
}
