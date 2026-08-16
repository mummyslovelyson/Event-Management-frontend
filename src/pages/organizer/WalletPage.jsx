import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, ArrowDownToLine, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight,
  CreditCard, Building2, Landmark, CheckCircle2, Clock, XCircle, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getWalletBalance, getTransactions, getWithdrawals, requestWithdrawal, getWalletEarnings,
} from '@/api/organizer';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition';

const ghc = (n) => `₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

const COLORS = { gold: '#D4AF37', muted: '#8A9196', dim: '#494F55', green: '#34d399', red: '#f87171' };

const fmtAxis = (v) => (v >= 1000 ? `₵${(v / 1000).toFixed(1)}k` : `₵${v}`);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#171A1D] border border-[#494F55]/50 px-3 py-2 shadow-xl">
      {label != null && <p className="text-xs text-[#8A9196] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color || p.stroke || p.fill }}>
          {p.name}: {ghc(p.value)}
        </p>
      ))}
    </div>
  );
};

const withdrawalStatus = (s) => {
  const map = { approved: 'success', completed: 'success', pending: 'pending', processing: 'pending', rejected: 'error', failed: 'error' };
  return map[(s || '').toLowerCase()] || 'pending';
};

export default function WalletPage() {
  const [balance, setBalance] = useState({ available: 0, pending: 0, totalEarned: 0 });
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  const [wForm, setWForm] = useState({ amount: '', bankName: '', accountNumber: '', accountName: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, txRes, wdRes, earnRes] = await Promise.allSettled([
        getWalletBalance(),
        getTransactions({ limit: 50 }),
        getWithdrawals({ limit: 20 }),
        getWalletEarnings({ period: 'monthly' }),
      ]);
      const u = (r, k) => (r.status === 'fulfilled' ? (r.value?.data?.[k] ?? r.value?.data ?? null) : null);

      const bal = u(balRes, 'balance');
      if (bal && typeof bal === 'object') {
        setBalance({
          available: bal.available ?? bal.availableBalance ?? 0,
          pending: bal.pending ?? bal.pendingBalance ?? 0,
          totalEarned: bal.totalEarned ?? bal.lifetimeEarnings ?? 0,
        });
      }
      const tx = u(txRes, 'transactions');
      if (tx) setTransactions(Array.isArray(tx) ? tx : tx.transactions || tx.data || []);
      const wd = u(wdRes, 'withdrawals');
      if (wd) setWithdrawals(Array.isArray(wd) ? wd : wd.withdrawals || wd.data || []);
      const en = u(earnRes, 'earnings');
      if (en) setEarnings(Array.isArray(en) ? en : en.earnings || en.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const submitWithdraw = async (e) => {
    e?.preventDefault();
    const amt = Number(wForm.amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    if (amt > balance.available) { toast.error('Amount exceeds available balance'); return; }
    if (!wForm.bankName || !wForm.accountNumber || !wForm.accountName) {
      toast.error('Fill all bank details'); return;
    }
    setSubmitting(true);
    try {
      await requestWithdrawal({
        amount: amt,
        bankName: wForm.bankName,
        accountNumber: wForm.accountNumber,
        accountName: wForm.accountName,
      });
      toast.success('Withdrawal request submitted');
      setWithdrawModal(false);
      setWForm({ amount: '', bankName: '', accountNumber: '', accountName: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  const maskBalance = (val) => (hideBalance ? '₵ ••••••' : ghc(val));

  const txTypeMeta = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'credit' || t === 'earning' || t === 'payout') return { v: 'success', icon: ArrowDownRight, color: 'text-emerald-400', sign: '+' };
    if (t === 'debit' || t === 'fee' || t === 'commission') return { v: 'error', icon: ArrowUpRight, color: 'text-red-400', sign: '-' };
    if (t === 'withdrawal' || t === 'withdraw') return { v: 'warning', icon: ArrowUpRight, color: 'text-amber-400', sign: '-' };
    return { v: 'neutral', icon: CreditCard, color: 'text-[#8A9196]', sign: '' };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Wallet}
        accent="emerald"
        title="Wallet"
        subtitle="Track earnings, balances, and withdrawals."
        actions={
          <button
            onClick={() => setWithdrawModal(true)}
            disabled={loading || balance.available <= 0}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition-colors shrink-0"
          >
            <ArrowDownToLine className="w-4 h-4" /> Withdraw Funds
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading wallet..." className="py-20" />
      ) : (
        <>
          {/* Balance card */}
          <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/30">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E252B] via-[#242B32] to-[#1D2124]" />
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-[#D4AF37]/5 blur-3xl" />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#8A9196]">
                    <Wallet className="w-4 h-4 text-[#D4AF37]" /> Available Balance
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-3xl sm:text-4xl font-bold text-[#EDF0F1] tabular-nums">{maskBalance(balance.available)}</p>
                    <button onClick={() => setHideBalance((v) => !v)} className="text-[#8A9196] hover:text-[#EDF0F1] transition">
                      {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30">
                  <span className="w-6 h-6 rounded bg-[#D4AF37] flex items-center justify-center">
                    <span className="text-[#1E252B] font-bold text-xs">T</span>
                  </span>
                  <span className="text-xs font-semibold text-[#D4AF37]">Tribes & Cliqs</span>
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between">
                <div className="text-xs text-[#494F55] font-mono">**** **** **** {new Date().getFullYear().toString().slice(-2)}</div>
                <div className="flex items-center gap-1.5 text-xs text-[#8A9196]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Account
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 pt-5 border-t border-[#262B2F]">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#8A9196] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Pending Balance
                  </p>
                  <p className="mt-1 text-lg font-semibold text-amber-400 tabular-nums">{maskBalance(balance.pending)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#8A9196] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Total Earned
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#D4AF37] tabular-nums">{maskBalance(balance.totalEarned)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings chart */}
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
            <h3 className="text-sm font-semibold text-[#EDF0F1] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" /> Monthly Earnings
            </h3>
            {earnings.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No earnings yet" description="Your monthly earnings will appear here." className="py-10" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={earnings} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.dim} strokeOpacity={0.3} />
                  <XAxis dataKey="month" stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="earnings" name="Earnings" stroke={COLORS.gold} strokeWidth={2} fill="url(#earnGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Transaction history */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#EDF0F1] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#D4AF37]" /> Transaction History
            </h2>
            {transactions.length === 0 ? (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
                <EmptyState icon={CreditCard} title="No transactions yet" description="Your transactions will appear here." className="py-12" />
              </div>
            ) : (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/70">
                    {transactions.map((t, i) => {
                      const meta = txTypeMeta(t.type);
                      const Icon = meta.icon;
                      return (
                        <tr key={t.id || i} className="hover:bg-[#1D2124] transition-colors">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-md bg-[#494F55]/30 flex items-center justify-center ${meta.color}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                              <span className="text-[#EDF0F1] font-medium capitalize">{t.type || 'Transaction'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#8A9196] max-w-[200px] truncate">{t.description || t.eventTitle || '—'}</td>
                          <td className={`px-4 py-3 text-right font-semibold tabular-nums ${meta.color}`}>
                            {meta.sign}{ghc(t.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={t.status === 'completed' || t.status === 'success' ? 'success' : t.status === 'pending' ? 'pending' : 'neutral'} size="sm">
                              {t.status || 'completed'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#8A9196] whitespace-nowrap">
                            {t.date || t.createdAt ? new Date(t.date || t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Withdrawal history */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#EDF0F1] flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#D4AF37]" /> Withdrawal History
            </h2>
            {withdrawals.length === 0 ? (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
                <EmptyState icon={Landmark} title="No withdrawals yet" description="Your withdrawal requests will appear here." className="py-12" />
              </div>
            ) : (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Bank</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/70">
                    {withdrawals.map((w, i) => (
                      <tr key={w.id || i} className="hover:bg-[#1D2124] transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#EDF0F1] tabular-nums">{ghc(w.amount)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-[#8A9196]">
                            <Building2 className="w-4 h-4 text-[#494F55]" />
                            {w.bankName || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={withdrawalStatus(w.status)} size="sm" dot>{w.status || 'pending'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#8A9196] whitespace-nowrap">
                          {w.requestedAt || w.createdAt ? new Date(w.requestedAt || w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#8A9196]">{w.reference || w.id?.slice(-8).toUpperCase() || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Withdraw Modal */}
      <Modal
        open={withdrawModal}
        onClose={() => setWithdrawModal(false)}
        title="Withdraw Funds"
        size="md"
        footer={
          <>
            <button onClick={() => setWithdrawModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitWithdraw} disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1E252B] bg-[#D4AF37] hover:bg-[#c4a030] disabled:opacity-60 transition">
              {submitting ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </>
        }
      >
        <form onSubmit={submitWithdraw} className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-[#D4AF37]/10 to-[#1D2124] border border-[#D4AF37]/30 p-4 flex items-center justify-between">
            <span className="text-sm text-[#8A9196]">Available</span>
            <span className="text-lg font-bold text-[#D4AF37]">{ghc(balance.available)}</span>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Amount (₵)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              max={balance.available}
              value={wForm.amount}
              onChange={(e) => setWForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="1000"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Bank Name</label>
            <input
              value={wForm.bankName}
              onChange={(e) => setWForm((f) => ({ ...f, bankName: e.target.value }))}
              placeholder="GCB Bank, MTN MoMo..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Account Number</label>
            <input
              value={wForm.accountNumber}
              onChange={(e) => setWForm((f) => ({ ...f, accountNumber: e.target.value }))}
              placeholder="0123456789"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Account Name</label>
            <input
              value={wForm.accountName}
              onChange={(e) => setWForm((f) => ({ ...f, accountName: e.target.value }))}
              placeholder="John Doe"
              className={inputCls}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
