import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, UserCheck, CalendarDays, Ticket as TicketIcon, Wallet, ShoppingCart,
  CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown,
  FileBarChart, CircleDollarSign, ShieldAlert, RefreshCw, Activity as ActivityIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminDashboard, approveEvent, rejectEvent,
} from '@/api/admin';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const fmtDay = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const fmtFullDate = () =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const EVENT_STATUS = {
  draft: { label: 'Draft', cls: 'bg-[#494F55]/20 text-[#9AA1A6]' },
  pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-400' },
  published: { label: 'Published', cls: 'bg-emerald-500/15 text-emerald-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/15 text-red-400' },
  completed: { label: 'Completed', cls: 'bg-white/10 text-white' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-400' },
};

const ROLE_LABEL = { attendee: 'Attendee', organizer: 'Organizer', admin: 'Admin' };
const ROLE_CLS = {
  attendee: 'text-white',
  organizer: 'text-white',
  admin: 'text-white',
};

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();

function ChartTip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#0C1115] border border-[#494F55]/60 px-3 py-2 shadow-2xl shadow-black/50">
      <p className="text-[11px] text-[#949599] mb-1.5">{fmtDay(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.stroke || p.color }} />
          <span className="text-[#9AA1A6]">{p.name}</span>
          <span className="ml-auto pl-4 font-semibold text-[#EFEFF1] tabular-nums">
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DeltaPill({ value, suffix }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-[#949599]">No prior data</span>;
  }
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
      up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
    }`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{value.toFixed(1)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

function CardShell({ className = '', children }) {
  return (
    <div className={`rounded-xl bg-[#171A1D] border border-[#262B2F] ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, hint, action }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-1">
      <div>
        <h2 className="text-sm font-semibold text-[#EFEFF1]">{title}</h2>
        {hint && <p className="text-xs text-[#949599] mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyInline({ text }) {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-[#949599]">{text}</div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <CardShell className="p-5 h-full flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-[#949599] truncate">{label}</p>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent.bg} ${accent.text}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-auto">
          <p className="text-2xl font-bold text-[#EFEFF1] tabular-nums tracking-tight break-words leading-tight">{value}</p>
          {sub}
        </div>
      </CardShell>
    </motion.div>
  );
}

function SnapshotTile({ icon: Icon, label, value, tone = 'text-[#949599]' }) {
  return (
    <div className="rounded-lg bg-[#1C232B]/60 border border-[#494F55]/20 p-3">
      <Icon className={`w-4 h-4 ${tone}`} />
      <p className="mt-2 text-lg font-bold text-[#EFEFF1] tabular-nums break-words leading-tight">{value}</p>
      <p className="text-[11px] text-[#949599] break-words leading-tight">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { format } = useCurrency();
  const shortFmt = (v) => format(v, { compact: true });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await getAdminDashboard();
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleApprove = async (id) => {
    setActionLoading(`approve-${id}`);
    try {
      await approveEvent(id);
      toast.success('Event approved');
      fetchDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve event');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(`reject-${id}`);
    try {
      await rejectEvent(id, { reason: 'Did not meet platform guidelines' });
      toast.success('Event rejected');
      fetchDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject event');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading platform overview..." className="py-20" />;
  if (!data) {
    return (
      <CardShell className="p-10 text-center">
        <p className="text-sm text-[#949599]">Couldn't load the dashboard.</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition"
        >
          Try again
        </button>
      </CardShell>
    );
  }

  const { overview, revenueSeries, growthSeries, pendingEvents, recentEvents, recentUsers, activity } = data;
  const o = overview || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').split(' ')[0];
  const attentionCount = (o.pendingEvents ?? 0) + (o.pendingOrganizers ?? 0) + (o.pendingWithdrawals ?? 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-white">{fmtFullDate()}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#EFEFF1]">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
            <p className="mt-1 text-sm text-[#949599]">Revenue, orders, and signups at a glance.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border ${
              attentionCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {attentionCount > 0 ? `${attentionCount} item${attentionCount > 1 ? 's' : ''} need attention` : 'All clear'}
            </span>
            <button
              onClick={() => fetchDashboard(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-sm font-medium text-[#EFEFF1] hover:border-white/40 transition"
              title="Refresh dashboard"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition"
            >
              <FileBarChart className="w-4 h-4" /> Full reports
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Gross Revenue"
          value={format(o.totalRevenue)}
          accent={{ bg: 'bg-white/10', text: 'text-white' }}
          sub={
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <DeltaPill value={o.revenueTrend} />
              <span className="text-[11px] text-[#949599]">vs prev 7 days</span>
            </div>
          }
        />
        <KpiCard
          icon={TicketIcon}
          label="Tickets Sold"
          value={(o.ticketsSold ?? 0).toLocaleString()}
          accent={{ bg: 'bg-white/10', text: 'text-white' }}
          sub={
            <p className="mt-1.5 text-[11px] text-[#949599]">
              <span className="text-white font-semibold">{(o.ticketsSoldToday ?? 0).toLocaleString()}</span> sold today
            </p>
          }
        />
        <KpiCard
          icon={Users}
          label="Total Users"
          value={(o.totalUsers ?? 0).toLocaleString()}
          accent={{ bg: 'bg-white/10', text: 'text-white' }}
          sub={
            <p className="mt-1.5 text-[11px] text-[#949599]">
              <span className="text-white font-semibold">{(o.totalOrganizers ?? 0).toLocaleString()}</span> organizers
            </p>
          }
        />
        <KpiCard
          icon={CalendarDays}
          label="Total Events"
          value={(o.totalEvents ?? 0).toLocaleString()}
          accent={{ bg: 'bg-white/10', text: 'text-white' }}
          sub={
            <p className="mt-1.5 text-[11px] text-[#949599]">
              <span className="text-amber-400 font-semibold">{(o.pendingEvents ?? 0).toLocaleString()}</span> pending approval
            </p>
          }
        />
      </div>

      {/* ── Revenue chart + needs attention ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2 overflow-hidden">
          <div className="p-5 pb-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#949599]">
                  <CircleDollarSign className="w-3.5 h-3.5" /> Revenue overview
                </p>
                <p className="mt-2 text-3xl sm:text-4xl font-bold text-[#EFEFF1] tabular-nums tracking-tight">
                  {format(o.totalRevenue)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <DeltaPill value={o.revenueTrend} />
                  <span className="text-xs text-[#949599]">vs previous 7 days</span>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-[#949599]">Orders</p>
                  <p className="mt-1 text-lg font-semibold text-[#EFEFF1] tabular-nums">{(o.totalOrders ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#949599]">7-day revenue</p>
                  <p className="mt-1 text-lg font-semibold text-white tabular-nums break-words">{format(o.last7Revenue)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-3 pt-2">
            {revenueSeries?.length ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={revenueSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EFEFF1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#EFEFF1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.18} vertical={false} />
                  <XAxis dataKey="date" stroke="#494F55" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtDay} minTickGap={28} />
                  <YAxis stroke="#494F55" fontSize={10} tickLine={false} axisLine={false} tickFormatter={shortFmt} width={42} />
                  <Tooltip content={<ChartTip formatter={shortFmt} />} cursor={{ stroke: '#494F55', strokeOpacity: 0.4 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#EFEFF1" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyInline text="No completed orders yet — revenue will appear here." />
            )}
          </div>
        </CardShell>

        {/* Needs attention */}
        <CardShell className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#EFEFF1]">Needs your attention</h2>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-[#949599] mt-0.5">Work waiting on you.</p>
          <div className="mt-4 space-y-3">
            <AttentionRow
              icon={CalendarDays}
              count={o.pendingEvents ?? 0}
              label="Events awaiting approval"
              to="/admin/events"
            />
            <AttentionRow
              icon={UserCheck}
              count={o.pendingOrganizers ?? 0}
              label="Organizer applications"
              to="/admin/organizer-approvals"
            />
            <AttentionRow
              icon={Wallet}
              count={o.pendingWithdrawals ?? 0}
              label="Withdrawal requests"
              to="/admin/payments"
            />
          </div>
          <div className="mt-5 pt-4 border-t border-[#494F55]/30">
            <Link to="/admin/audit-logs" className="flex items-center justify-between text-xs text-[#949599] hover:text-[#EFEFF1] transition">
              View audit logs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── User growth + platform snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2">
          <SectionHeader
            title="User growth"
            hint="New signups · last 14 days"
            action={
              <div className="flex items-center gap-3 pr-5 text-xs">
                <span className="flex items-center gap-1.5 text-[#949599]"><span className="w-2 h-2 rounded-full bg-white" /> Attendees</span>
                <span className="flex items-center gap-1.5 text-[#949599]"><span className="w-2 h-2 rounded-full bg-[#60A5FA]" /> Organizers</span>
              </div>
            }
          />
          <div className="px-3 pt-2 pb-3">
            {growthSeries?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={growthSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.18} vertical={false} />
                  <XAxis dataKey="date" stroke="#494F55" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtDay} minTickGap={24} />
                  <YAxis stroke="#494F55" fontSize={10} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: '#494F55', strokeOpacity: 0.4 }} />
                  <Line type="monotone" dataKey="attendees" stroke="#EFEFF1" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#EFEFF1' }} name="Attendees" />
                  <Line type="monotone" dataKey="organizers" stroke="#60A5FA" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#60A5FA' }} name="Organizers" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyInline text="No signups in the last two weeks." />
            )}
          </div>
        </CardShell>

        {/* Platform snapshot */}
        <CardShell className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#EFEFF1]">Platform snapshot</h2>
            <Link to="/admin/payments" className="text-xs font-medium text-white hover:underline flex items-center gap-1">
              Payments <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-[#949599] mt-0.5">Orders and payouts at a glance.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SnapshotTile icon={ShoppingCart} label="Total Orders" value={(o.totalOrders ?? 0).toLocaleString()} tone="text-white" />
            <SnapshotTile icon={CircleDollarSign} label="7-day Revenue" value={shortFmt(o.last7Revenue)} tone="text-white" />
            <SnapshotTile icon={Wallet} label="Withdrawals Pending" value={(o.pendingWithdrawals ?? 0).toLocaleString()} tone="text-amber-400" />
            <SnapshotTile icon={UserCheck} label="Organizer Apps" value={(o.pendingOrganizers ?? 0).toLocaleString()} tone="text-white" />
          </div>
          <div className="mt-5 pt-4 border-t border-[#494F55]/30">
            <Link to="/admin/reports" className="flex items-center justify-between text-xs text-[#949599] hover:text-[#EFEFF1] transition">
              View platform reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── Latest events + newest members ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardShell className="lg:col-span-2 overflow-hidden">
          <SectionHeader
            title="Latest events"
            hint="The newest events on the platform"
            action={
              <Link to="/admin/events" className="pr-5 text-xs font-medium text-white hover:underline flex items-center gap-1">
                All events <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          {recentEvents?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[#494F55]/15">
                  {recentEvents.map((e) => {
                    const st = EVENT_STATUS[e.status] || EVENT_STATUS.draft;
                    return (
                      <tr key={e.id} className="hover:bg-[#1C232B]/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-[#EFEFF1] break-words">{e.title}</p>
                          <p className="text-xs text-[#949599] mt-0.5 break-words">{e.organizer_name || '—'}</p>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-5 py-3 hidden sm:table-cell text-xs text-[#949599]">
                          {e.start_date ? fmtDay(e.start_date) : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to={`/admin/events`} className="text-xs text-[#949599] hover:text-white transition">View</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyInline text="No events have been created yet." />
          )}
        </CardShell>

        <CardShell className="overflow-hidden">
          <SectionHeader title="Newest members" />
          {recentUsers?.length ? (
            <div className="px-2 pb-3">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1C232B]/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#242B32] border border-[#494F55]/40 text-[#9AA1A6] text-xs font-bold flex items-center justify-center shrink-0">
                    {initials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#EFEFF1] break-words">{u.name}</p>
                    <p className="text-[11px] text-[#949599] break-words">{u.email}</p>
                  </div>
                  <span className={`text-[11px] font-medium capitalize ${ROLE_CLS[u.role] || ROLE_CLS.attendee}`}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyInline text="No members yet." />
          )}
        </CardShell>
      </div>

      {/* ── Pending approvals quick action ── */}
      {pendingEvents?.length > 0 && (
        <CardShell className="overflow-hidden">
          <SectionHeader
            title="Pending event approvals"
            hint="Quick approve or reject"
            action={
              <Link to="/admin/events" className="pr-5 text-xs font-medium text-white hover:underline flex items-center gap-1">
                All events <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#949599] border-b border-[#494F55]/20">
                  <th className="px-5 py-2.5 font-medium">Event</th>
                  <th className="px-5 py-2.5 font-medium">Organizer</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#494F55]/15">
                {pendingEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-[#1C232B]/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {e.thumbnail ? (
                          <img src={e.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-[#1C232B] border border-[#494F55]/30 text-[#949599] flex items-center justify-center">
                            <CalendarDays className="w-4 h-4" />
                          </div>
                        )}
                        <span className="font-medium text-[#EFEFF1] break-words">{e.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#949599]">{e.organizer_name || '—'}</td>
                    <td className="px-5 py-3 text-xs text-[#949599]">{e.start_date ? fmtDay(e.start_date) : '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(e.id)}
                          disabled={actionLoading === `approve-${e.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(e.id)}
                          disabled={actionLoading === `reject-${e.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardShell>
      )}

      {/* ── Recent activity ── */}
      <CardShell className="overflow-hidden">
        <SectionHeader
          title="Recent activity"
          hint="Across the whole platform"
          action={
            <div className="pr-5 flex items-center gap-1.5 text-xs text-[#949599]">
              <ActivityIcon className="w-3.5 h-3.5" /> Live feed
            </div>
          }
        />
        {activity?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 px-5 py-4">
            {activity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[#1C232B] border border-[#494F55]/30 text-[#949599] flex items-center justify-center">
                  {a.type === 'event' ? <CalendarDays className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#EFEFF1]">
                    {a.type === 'event' ? (
                      <>New event <span className="font-medium">“{a.label}”</span></>
                    ) : (
                      <>{a.label.replace(' joined as ', ' joined as ')}</>
                    )}
                  </p>
                  <p className="text-[11px] text-[#949599] mt-0.5">
                    {a.organizer || a.role || 'System'} · {new Date(a.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyInline text="No activity yet." />
        )}
      </CardShell>
    </div>
  );
}

function AttentionRow({ icon: Icon, count, label, to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-lg bg-[#1C232B]/60 border border-[#494F55]/20 hover:border-[#494F55]/50 transition group"
    >
      <Icon className="w-4 h-4 text-[#494F55] shrink-0 group-hover:text-[#9AA1A6] transition" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#EFEFF1] truncate">{label}</p>
      </div>
      <span className={`text-sm font-bold tabular-nums ${count > 0 ? 'text-amber-400' : 'text-[#494F55]'}`}>
        {count}
      </span>
      <ArrowRight className="w-3.5 h-3.5 text-[#494F55] group-hover:text-[#9AA1A6] transition" />
    </Link>
  );
}
