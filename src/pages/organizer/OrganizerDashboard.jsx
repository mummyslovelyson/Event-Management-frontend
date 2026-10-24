import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  CalendarDays, Ticket as TicketIcon, ArrowRight,
  PlusCircle, Wallet, Calendar,
  TrendingUp, TrendingDown, RefreshCw, QrCode,
  ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getDashboard, getRevenue, getWalletBalance } from '@/api/organizer';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const fmtDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const fmtFullDate = () =>
  new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const orderStatusVariant = (s) => {
  const map = {
    completed: 'success', paid: 'success', success: 'success',
    pending: 'pending', failed: 'error', cancelled: 'neutral', refunded: 'warning',
  };
  return map[(s || '').toLowerCase()] || 'neutral';
};

const TIMEFRAMES = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '1y', label: '1 Year' },
];

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

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [data, setData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [wallet, setWallet] = useState({ available: 0, pending: 0, totalRevenue: 0 });
  const [revenueLoading, setRevenueLoading] = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dashRes, revRes, wallRes] = await Promise.all([
        getDashboard(),
        getRevenue({ range: timeframe }).catch(() => ({ data: { data: [] } })),
        getWalletBalance().catch(() => ({ data: { available: 0, pending: 0 } })),
      ]);
      setData(dashRes.data);

      const rev = revRes.data;
      const rawRev = Array.isArray(rev) ? rev : rev?.data || [];
      const formattedSeries = rawRev.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue || 0),
        orders: Number(r.orders || 0),
      }));
      setRevenueData(formattedSeries);

      if (wallRes.data) setWallet(wallRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [timeframe]);

  const handleTimeframeChange = async (newRange) => {
    setTimeframe(newRange);
    setRevenueLoading(true);
    try {
      const res = await getRevenue({ range: newRange });
      const rev = res.data;
      const rawRev = Array.isArray(rev) ? rev : rev?.data || [];
      const formattedSeries = rawRev.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue || 0),
        orders: Number(r.orders || 0),
      }));
      setRevenueData(formattedSeries);
    } catch (err) {
      console.error('[Dashboard] Failed to change revenue range:', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingSpinner label="Loading dashboard..." className="py-24" />;

  const metrics = data?.metrics || {};
  const recentOrders = data?.recentOrders || [];
  const upcomingEvents = data?.upcomingEvents || [];
  const topEvents = data?.topEvents || [];
  const checkInStats = data?.checkInStats || { total: 0, checkedIn: 0 };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').split(' ')[0] || 'Organizer';
  const orgName = data?.organization?.name || user?.name || 'Organizer Workspace';

  // Real Operational metrics computed from genuine database state
  const totalCheckIns = checkInStats.total || metrics.ticketsSold || 0;
  const checkedInCount = checkInStats.checkedIn || 0;
  const checkInPct = totalCheckIns > 0 ? Math.round((checkedInCount / totalCheckIns) * 100) : 0;

  const totalOrders = metrics.totalOrders || 0;
  const pendingOrders = metrics.pendingOrders || 0;
  const completedOrders = Math.max(0, totalOrders - pendingOrders);
  const orderCompletionPct = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 100;

  const totalEventsCount = metrics.totalEvents || 0;
  const activeEventsCount = metrics.activeEvents || 0;
  const activeEventsPct = totalEventsCount > 0 ? Math.round((activeEventsCount / totalEventsCount) * 100) : 0;

  const totalWalletFunds = (wallet.available || 0) + (wallet.pending || 0);
  const availableWalletPct = totalWalletFunds > 0 ? Math.round(((wallet.available || 0) / totalWalletFunds) * 100) : (wallet.available > 0 ? 100 : 0);

  const operationsStats = [
    {
      label: 'Attendee Check-In',
      value: `${checkedInCount.toLocaleString()} / ${totalCheckIns.toLocaleString()}`,
      detail: `${checkInPct}% verified`,
      progress: checkInPct,
    },
    {
      label: 'Order Completion',
      value: `${completedOrders.toLocaleString()} / ${totalOrders.toLocaleString()}`,
      detail: `${orderCompletionPct}% fulfilled`,
      progress: orderCompletionPct,
    },
    {
      label: 'Active Live Events',
      value: `${activeEventsCount.toLocaleString()} of ${totalEventsCount.toLocaleString()}`,
      detail: totalEventsCount > 0 ? `${activeEventsPct}% published` : 'No events',
      progress: activeEventsPct,
    },
    {
      label: 'Wallet Available',
      value: format(wallet.available ?? 0),
      detail: wallet.pending > 0 ? `${format(wallet.pending)} pending` : 'Ready for withdrawal',
      progress: availableWalletPct,
    },
  ];

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
            {orgName} · Sales performance, event schedule, and attendee check-ins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/organizer/events/create"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </Link>

          <Link
            to="/organizer/check-in"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-medium hover:bg-white/[0.08] transition"
          >
            <QrCode className="w-3.5 h-3.5 text-neutral-400" />
            <span>Gate Scanner</span>
          </Link>

          <button
            onClick={() => fetchAll(false)}
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
          title="Gross Revenue"
          value={format(metrics.totalRevenue ?? 0)}
          delta={typeof metrics.revenueTrend === 'number' ? metrics.revenueTrend : null}
          subtext={`${metrics.totalOrders ?? 0} completed orders`}
          to="/organizer/payments"
        />

        {/* Tickets Sold */}
        <MetricCard
          title="Tickets Sold"
          value={(metrics.ticketsSold ?? 0).toLocaleString()}
          delta={typeof metrics.ticketsSoldTrend === 'number' ? metrics.ticketsSoldTrend : null}
          subtext="Total attendee passes"
          to="/organizer/events"
        />

        {/* Active Events */}
        <MetricCard
          title="Active Events"
          value={(metrics.activeEvents ?? 0).toLocaleString()}
          delta={typeof metrics.activeEventsTrend === 'number' ? metrics.activeEventsTrend : null}
          subtext={`${metrics.totalEvents ?? 0} total events`}
          to="/organizer/events"
        />

        {/* Available Balance */}
        <MetricCard
          title="Available Payout"
          value={format(wallet.available ?? 0)}
          subtext={wallet.pending > 0 ? `${format(wallet.pending)} pending settlement` : 'Ready to withdraw'}
          to="/organizer/wallet"
        />
      </div>

      {/* ── Charts Row: Revenue (8 cols) + Operations (4 cols) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Revenue & Ticket Sales Area Chart */}
        <CardShell className="xl:col-span-8 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Revenue &amp; Ticket Sales</h2>
                {revenueLoading && (
                  <span className="text-[11px] text-neutral-400 font-mono">Updating...</span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Daily sales totals and customer order volume
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>Revenue</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>Orders</span>
                </span>
              </div>

              {/* Timeframe pill selector */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.key}
                    onClick={() => handleTimeframeChange(tf.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      timeframe === tf.key
                        ? 'bg-white text-black font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 h-64 sm:h-72">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orgRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="orgOrderGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => format(v, { compact: true })}
                  />
                  <Tooltip content={<ChartTip formatter={format} />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Gross Revenue"
                    stroke="#FFFFFF"
                    strokeWidth={1.8}
                    fill="url(#orgRevGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders Count"
                    stroke="#818CF8"
                    strokeWidth={1.5}
                    fill="url(#orgOrderGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No sales recorded"
                description="Ticket sales during this period will appear on this chart."
                className="py-12"
              />
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-neutral-400">
            <span>Total Completed Orders: <strong className="text-white font-medium">{(metrics.totalOrders ?? 0).toLocaleString()}</strong></span>
            <Link to="/organizer/analytics" className="text-neutral-300 hover:text-white transition">
              Full Analytics Report &rarr;
            </Link>
          </div>
        </CardShell>

        {/* Event Operations Fulfillment Card */}
        <CardShell className="xl:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-semibold text-white">Event Operations</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Fulfillment and check-in status</p>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">Live</span>
            </div>

            <div className="mt-4 space-y-4">
              {operationsStats.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium truncate">{item.label}</span>
                    <span className="font-semibold text-white tabular-nums">{item.value}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-neutral-200 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 tabular-nums shrink-0">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
            <span className="text-neutral-400">Available: <strong className="text-white">{format(wallet.available ?? 0)}</strong></span>
            <Link
              to="/organizer/wallet"
              className="text-neutral-300 hover:text-white font-medium flex items-center gap-1 transition"
            >
              <span>Manage Wallet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── Bottom Row: Recent Orders (7 cols) + Upcoming Events (5 cols) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Recent Orders Table */}
        <CardShell className="xl:col-span-7 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Customer Orders</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Attendee purchases and transactions</p>
            </div>
            <Link
              to="/organizer/payments"
              className="text-xs font-medium text-neutral-400 hover:text-white transition flex items-center gap-1"
            >
              <span>All Payments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-neutral-400 border-b border-white/[0.06] bg-white/[0.01]">
                    <th className="px-5 py-2.5 font-medium">Ref</th>
                    <th className="px-5 py-2.5 font-medium">Attendee</th>
                    <th className="hidden sm:table-cell px-5 py-2.5 font-medium">Event</th>
                    <th className="px-5 py-2.5 font-medium text-right">Amount</th>
                    <th className="px-5 py-2.5 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate('/organizer/payments')}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono text-[11px] text-neutral-400">
                        #{o.reference ? o.reference.slice(-6) : String(o.id ?? '').slice(-6)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-white truncate max-w-[130px]">
                          {o.customerName || o.user?.name || 'Customer'}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {o.ticketCount || o.quantity || 1} ticket(s)
                        </p>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3 text-neutral-400 truncate max-w-[140px]">
                        {o.eventTitle || o.event?.title || '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-white tabular-nums">
                        {format(o.amount || o.total)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge variant={orderStatusVariant(o.status)} size="sm">
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={TicketIcon}
              title="No orders yet"
              description="Orders will appear here once attendees purchase tickets."
              className="py-12"
            />
          )}
        </CardShell>

        {/* Upcoming Events & Capacity Tracker */}
        <CardShell className="xl:col-span-5 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-semibold text-white">Upcoming Events</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Venue capacity and schedules</p>
              </div>
              <Link
                to="/organizer/events"
                className="text-xs text-neutral-400 hover:text-white transition"
              >
                All Events &rarr;
              </Link>
            </div>

            <div className="mt-3.5 space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 4).map((e) => {
                  const sold = Number(e.ticketsSold || 0);
                  const cap = Number(e.totalCapacity || e.capacity || 0);
                  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;

                  return (
                    <div
                      key={e.id}
                      onClick={() => navigate(`/organizer/events/${e.id}/edit`)}
                      className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white hover:underline truncate">
                            {e.title}
                          </p>
                          <p className="text-[10px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-neutral-500" />
                            <span>
                              {e.startDate
                                ? new Date(e.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'TBD'}
                            </span>
                            <span>·</span>
                            <span className="truncate">{e.venue || e.city || 'TBD'}</span>
                          </p>
                        </div>
                        <Badge variant={e.status === 'published' ? 'success' : 'pending'} size="sm">
                          {e.status}
                        </Badge>
                      </div>

                      {/* Capacity progress */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>Capacity filled ({pct}%)</span>
                          <span className="font-medium text-neutral-200 tabular-nums">
                            {sold} / {cap > 0 ? cap : '—'}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming events"
                  description="Scheduled events and capacity tracking will appear here."
                  className="py-8"
                />
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-neutral-500 text-[11px]">
              {upcomingEvents.length} event(s) scheduled
            </span>
            <Link
              to="/organizer/events"
              className="text-neutral-300 hover:text-white font-medium flex items-center gap-1 transition"
            >
              <span>Manage Events</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
