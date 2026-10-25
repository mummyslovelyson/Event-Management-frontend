import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, CalendarDays, Wallet, CheckCircle2, XCircle,
  ArrowRight, TrendingUp, TrendingDown, RefreshCw,
  QrCode, AlertCircle, ArrowUpRight, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminDashboard, approveEvent, rejectEvent,
} from '@/api/admin';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const fmtDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const fmtFullDate = () =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();

/* ── Minimalist SaaS Tooltip ── */
function ChartTip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#121620] border border-white/10 px-3 py-2 shadow-xl backdrop-blur-md">
      <p className="text-[11px] font-medium text-neutral-400 mb-1">{fmtDay(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-3 text-xs py-0.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.stroke || p.color || p.fill }} />
          <span className="text-neutral-300">{p.name}</span>
          <span className="ml-auto font-semibold text-white tabular-nums">
            {formatter && p.dataKey === 'revenue' ? formatter(p.value) : p.value?.toLocaleString?.() ?? p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Linear / Stripe Style Card Surface ── */
function CardShell({ className = '', children }) {
  return (
    <div className={`rounded-xl bg-[#121620] border border-white/[0.08] shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ── Metric Card ── */
function MetricCard({ title, value, delta, subtext, to }) {
  const hasDelta = typeof delta === 'number' && !isNaN(delta);
  const isPositive = (delta ?? 0) >= 0;

  const content = (
    <CardShell className="p-5 flex flex-col justify-between hover:border-white/20 transition-colors group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{title}</span>
        {to && (
          <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight tabular-nums">
          {value}
        </p>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {hasDelta ? (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{delta.toFixed(1)}%
            </span>
          ) : null}
          {subtext && (
            <span className="text-xs text-neutral-400">{subtext}</span>
          )}
        </div>
      </div>
    </CardShell>
  );

  return to ? <Link to={to} className="block">{content}</Link> : content;
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
      toast.success('Event approved and published live');
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

  if (loading) return <LoadingSpinner label="Loading dashboard..." className="py-24" />;

  if (!data) {
    return (
      <CardShell className="p-10 text-center">
        <p className="text-sm text-neutral-400">Couldn't load dashboard data.</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 px-4 py-2 rounded-lg bg-white text-black text-xs font-medium hover:bg-neutral-200 transition"
        >
          Retry Connection
        </button>
      </CardShell>
    );
  }

  const { overview, revenueSeries, growthSeries, pendingEvents, recentEvents, recentUsers, activity } = data;
  const o = overview || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').split(' ')[0] || 'Admin';

  const totalPendingActions = (o.pendingEvents ?? 0) + (o.pendingOrganizers ?? 0) + (o.pendingWithdrawals ?? 0);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <span className="text-xs font-medium text-neutral-400">
            {fmtFullDate()}
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Platform metrics, revenue streams, and operational queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/check-in"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Gate Scanner</span>
          </Link>

          <button
            onClick={() => fetchDashboard(false)}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/20 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Metric Cards Row (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <MetricCard
          title="Gross Platform Revenue"
          value={format(o.totalRevenue ?? 0)}
          delta={typeof o.revenueTrend === 'number' ? o.revenueTrend : null}
          subtext={`Past 7d: ${format(o.last7Revenue ?? 0)}`}
          to="/admin/payments"
        />

        {/* Tickets Sold */}
        <MetricCard
          title="Tickets Issued"
          value={(o.ticketsSold ?? 0).toLocaleString()}
          subtext={`${(o.ticketsSoldToday ?? 0).toLocaleString()} issued today`}
          to="/admin/events"
        />

        {/* Platform Users */}
        <MetricCard
          title="Total Users"
          value={(o.totalUsers ?? 0).toLocaleString()}
          subtext={`${(o.totalOrganizers ?? 0).toLocaleString()} organizers · ${Math.max(0, (o.totalUsers ?? 0) - (o.totalOrganizers ?? 0)).toLocaleString()} attendees`}
          to="/admin/users"
        />

        {/* Moderation Queue */}
        <MetricCard
          title="Pending Actions"
          value={totalPendingActions.toLocaleString()}
          subtext={`${o.pendingEvents ?? 0} events · ${o.pendingWithdrawals ?? 0} payouts · ${o.pendingOrganizers ?? 0} KYCs`}
          to="/admin/events"
        />
      </div>

      {/* ── Charts Row: Revenue (8 cols) + Signups (4 cols) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Revenue & Orders Chart */}
        <CardShell className="xl:col-span-8 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue & Orders</h2>
              <p className="text-xs text-neutral-400 mt-0.5">30-day volume and order frequency</p>
            </div>

            <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>Revenue</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white/50" />
                    <span>Orders</span>
                  </span>
            </div>
          </div>

          <div className="mt-4 h-64 sm:h-72">
            {revenueSeries?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="adminOrderGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtDay}
                    minTickGap={28}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={shortFmt}
                    width={52}
                  />
                  <Tooltip content={<ChartTip formatter={shortFmt} />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#FFFFFF"
                    strokeWidth={1.8}
                    fill="url(#adminRevGrad)"
                    name="Gross Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#818CF8"
                    strokeWidth={1.5}
                    fill="url(#adminOrderGrad)"
                    name="Orders Count"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-neutral-500">
                No revenue recorded in this window.
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-neutral-400">
            <span>Total Completed Orders: <strong className="text-white font-medium">{(o.totalOrders ?? 0).toLocaleString()}</strong></span>
            <Link to="/admin/reports" className="text-neutral-300 hover:text-white transition">
              View Detailed Analytics &rarr;
            </Link>
          </div>
        </CardShell>

        {/* User Signups Growth */}
        <CardShell className="xl:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-semibold text-white">New Signups</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Past 14 days onboarding velocity</p>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">14 Days</span>
            </div>

            <div className="mt-4 h-60">
              {growthSeries?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthSeries} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtDay}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Bar
                      dataKey="attendees"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      name="Attendees"
                      maxBarSize={16}
                    />
                    <Bar
                      dataKey="organizers"
                      fill="#818CF8"
                      radius={[4, 4, 0, 0]}
                      name="Organizers"
                      maxBarSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-neutral-500">
                  No signups in the last 14 days.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Attendees</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Organizers</span>
            </div>
            <Link to="/admin/users" className="text-neutral-300 hover:text-white transition">
              Manage Users &rarr;
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── Pending Event Approvals Table ── */}
      {pendingEvents?.length > 0 && (
        <CardShell className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                Pending Moderation Queue ({pendingEvents.length})
              </h2>
            </div>
            <Link
              to="/admin/events"
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              All Events &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] font-semibold text-neutral-400 border-b border-white/[0.06] bg-white/[0.01]">
                  <th className="px-5 py-3 font-medium">Event Title</th>
                  <th className="hidden md:table-cell px-5 py-3 font-medium">Organizer</th>
                  <th className="hidden sm:table-cell px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pendingEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/admin/events/${ev.id}`}
                        className="font-medium text-white hover:underline transition"
                      >
                        {ev.title}
                      </Link>
                      {ev.category && (
                        <span className="ml-2 text-[10px] text-neutral-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                          {ev.category}
                        </span>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-5 py-3.5 text-neutral-300">
                      {ev.organizer_name || '—'}
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5 text-neutral-400">
                      {ev.start_date ? fmtDay(ev.start_date) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(ev.id)}
                          disabled={actionLoading === `approve-${ev.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(ev.id)}
                          disabled={actionLoading === `reject-${ev.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition disabled:opacity-50"
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

      {/* ── Lower Grid: Activity Feed (6 cols) + Recent Signups (6 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* System Activity */}
        <CardShell className="overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Platform Activity</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Chronological audit stream</p>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">Live</span>
            </div>

            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {(activity || []).length > 0 ? (
                activity.slice(0, 8).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-200">
                        {a.type === 'event' ? (
                          <>Event created: <strong className="text-white font-medium">“{a.label}”</strong></>
                        ) : (
                          <>{a.label}</>
                        )}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {a.organizer || a.role || 'System'} · {new Date(a.time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-neutral-500">No recent activity logged.</div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-white/[0.06] bg-white/[0.01]">
            <Link
              to="/admin/audit-logs"
              className="text-xs text-neutral-400 hover:text-white font-medium flex items-center justify-between transition"
            >
              <span>View Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>

        {/* Recent Registrations */}
        <CardShell className="overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Recent Users</h2>
                <p className="text-xs text-neutral-400 mt-0.5">New attendees and organizers</p>
              </div>
              <Link to="/admin/users" className="text-xs text-neutral-400 hover:text-white transition">
                All Users &rarr;
              </Link>
            </div>

            <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
              {(recentUsers || []).length > 0 ? (
                recentUsers.slice(0, 6).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] text-neutral-300 text-[10px] font-semibold flex items-center justify-center shrink-0">
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-neutral-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize ${
                      u.role === 'organizer'
                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        : 'bg-white/[0.05] text-neutral-400'
                    }`}>
                      {u.role || 'Attendee'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-neutral-500">No users registered yet.</div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-white/[0.06] bg-white/[0.01]">
            <Link
              to="/admin/users"
              className="text-xs text-neutral-400 hover:text-white font-medium flex items-center justify-between transition"
            >
              <span>User Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
