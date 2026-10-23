import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import {
  CalendarDays, Ticket as TicketIcon, ArrowRight,
  PlusCircle, Wallet, Calendar,
  TrendingUp, TrendingDown, RefreshCw, QrCode,
  CheckCircle2, Clock, AlertCircle, ArrowUpRight,
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

const TIER_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981'];

/* ── Custom Sleek Tooltip matching Admin Theme ── */
function ChartTip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#141829]/95 border border-white/15 px-3.5 py-2.5 shadow-2xl shadow-black/80 backdrop-blur-md">
      <p className="text-[11px] font-semibold text-white/50 mb-1.5">{fmtDay(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center gap-2.5 text-xs py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.stroke || p.color || p.fill }} />
          <span className="text-white/70">{p.name}</span>
          <span className="ml-auto pl-4 font-bold text-white tabular-nums">
            {formatter && p.dataKey === 'revenue' ? formatter(p.value) : p.value?.toLocaleString?.() ?? p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Dynamic Real-Data SVG Sparkline (strictly driven by historical points) ── */
function DynamicSparkline({ data = [], color = '#f97316', id = 'sp1' }) {
  const cleanData = (Array.isArray(data) ? data : []).filter((v) => typeof v === 'number' && !isNaN(v));

  if (cleanData.length < 2) {
    return (
      <div className="w-24 sm:w-28 h-10 flex items-center justify-center">
        <div className="w-full h-0.5 bg-white/10 rounded-full" />
      </div>
    );
  }

  const max = Math.max(...cleanData, 1);
  const min = Math.min(...cleanData, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 38;

  const points = cleanData.map((val, idx) => {
    const x = (idx / (cleanData.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const d = `M ${points.join(' L ')}`;
  const area = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

  return (
    <svg className="w-24 sm:w-28 h-10 shrink-0 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Card Shell with rounded borders and elevated dark backdrop ── */
function CardShell({ className = '', children }) {
  return (
    <div className={`rounded-2xl bg-[#141829] border border-white/[0.07] shadow-xl shadow-black/25 ${className}`}>
      {children}
    </div>
  );
}

/* ── KPI Metric Card matching Admin Visual System ── */
function KpiCard({ title, value, delta, isPositive, dataPoints = [], color = '#f97316', id, subtext }) {
  const hasDelta = typeof delta === 'number' && !isNaN(delta);

  return (
    <CardShell className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/60">{title}</span>
        <span className="text-[10px] text-white/40 font-mono">This Month</span>
      </div>

      <div className="mt-3 sm:mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums truncate">
            {value}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {hasDelta ? (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                  isPositive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{delta}%
              </span>
            ) : null}
            {subtext && (
              <span className="text-[11px] text-white/40 truncate">{subtext}</span>
            )}
          </div>
        </div>

        <DynamicSparkline data={dataPoints} color={color} id={id} />
      </div>
    </CardShell>
  );
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
  const rawTicketTiers = data?.ticketTiers || [];
  const checkInStats = data?.checkInStats || { total: 0, checkedIn: 0 };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').split(' ')[0] || 'Organizer';
  const orgName = data?.organization?.name || user?.name || 'Organizer Workspace';

  // Extract authentic daily trend points for sparklines
  const revenuePoints = revenueData.map((d) => d.revenue);
  const orderPoints = revenueData.map((d) => d.orders);

  // Real Ticket Tier breakdown for Top Card 4
  const totalTierTickets = rawTicketTiers.reduce((acc, t) => acc + Number(t.count || 0), 0);
  const tierDonutData = rawTicketTiers.length > 0
    ? rawTicketTiers.map((tier, idx) => {
        const count = Number(tier.count || 0);
        const pct = totalTierTickets > 0 ? Math.round((count / totalTierTickets) * 100) : 0;
        return {
          name: tier.name || `Tier ${idx + 1}`,
          value: count,
          percentage: pct,
          color: TIER_COLORS[idx % TIER_COLORS.length],
        };
      })
    : [
        { name: 'Completed Orders', value: Math.max(0, (metrics.totalOrders ?? 0) - (metrics.pendingOrders ?? 0)), color: '#10b981' },
        { name: 'Pending Orders', value: metrics.pendingOrders ?? 0, color: '#f59e0b' },
        { name: 'Refunds', value: metrics.refunds ?? 0, color: '#ef4444' },
      ].filter((item) => item.value > 0);

  const tierTotal = totalTierTickets > 0
    ? totalTierTickets
    : tierDonutData.reduce((acc, c) => acc + c.value, 0);

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
      color: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Order Completion',
      value: `${completedOrders.toLocaleString()} / ${totalOrders.toLocaleString()}`,
      detail: `${orderCompletionPct}% fulfilled`,
      progress: orderCompletionPct,
      color: 'from-violet-500 to-purple-500',
    },
    {
      label: 'Active Live Events',
      value: `${activeEventsCount.toLocaleString()} of ${totalEventsCount.toLocaleString()}`,
      detail: totalEventsCount > 0 ? `${activeEventsPct}% published` : 'No events',
      progress: activeEventsPct,
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Wallet Available',
      value: format(wallet.available ?? 0),
      detail: wallet.pending > 0 ? `${format(wallet.pending)} pending` : 'Settled',
      progress: availableWalletPct,
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions ── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                {fmtFullDate()}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {greeting}, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">
              {orgName} · Performance overview, ticket sales, and event attendance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/organizer/events/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition active:scale-95 shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Event</span>
            </Link>

            <Link
              to="/organizer/check-in"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-purple-500/30 transition active:scale-95 border border-white/20"
            >
              <QrCode className="w-4 h-4" />
              <span>Gate Scanner</span>
            </Link>

            <button
              onClick={() => fetchAll(false)}
              className="p-2.5 rounded-xl bg-[#141829] border border-white/[0.08] text-white/70 hover:text-white hover:border-violet-500/40 transition cursor-pointer"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── TOP KPI ROW (4 Cards matching Admin Styling) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Gross Ticket Revenue */}
        <KpiCard
          title="Gross Revenue"
          value={format(metrics.totalRevenue ?? 0)}
          delta={typeof metrics.revenueTrend === 'number' ? metrics.revenueTrend : null}
          isPositive={(metrics.revenueTrend ?? 0) >= 0}
          dataPoints={revenuePoints}
          color="#f97316"
          id="org-rev"
          subtext={typeof metrics.revenueTrend === 'number' ? 'vs prior month' : `${metrics.totalOrders ?? 0} orders`}
        />

        {/* Card 2: Tickets Sold */}
        <KpiCard
          title="Tickets Sold"
          value={(metrics.ticketsSold ?? 0).toLocaleString()}
          delta={typeof metrics.ticketsSoldTrend === 'number' ? metrics.ticketsSoldTrend : null}
          isPositive={(metrics.ticketsSoldTrend ?? 0) >= 0}
          dataPoints={orderPoints}
          color="#ec4899"
          id="org-tickets"
          subtext={typeof metrics.ticketsSoldTrend === 'number' ? 'vs prior month' : 'Attendee passes'}
        />

        {/* Card 3: Active Live Events */}
        <KpiCard
          title="Active Events"
          value={(metrics.activeEvents ?? 0).toLocaleString()}
          delta={typeof metrics.activeEventsTrend === 'number' ? metrics.activeEventsTrend : null}
          isPositive={(metrics.activeEventsTrend ?? 0) >= 0}
          dataPoints={orderPoints}
          color="#06b6d4"
          id="org-events"
          subtext={`${metrics.totalEvents ?? 0} total events`}
        />

        {/* Card 4: Ticket Tiers / Order Status Donut Chart */}
        <CardShell className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white/60">
              {rawTicketTiers.length > 0 ? 'Ticket Tiers' : 'Order Status'}
            </span>
            <Link
              to="/organizer/events"
              className="text-[10px] text-violet-400 hover:text-violet-300 font-medium transition"
            >
              View Tiers
            </Link>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            {tierDonutData.length > 0 ? (
              <>
                {/* Center Donut */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {tierDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-white/50 leading-none">Total</span>
                    <span className="text-xs font-extrabold text-white leading-tight mt-0.5">
                      {tierTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Right Legend */}
                <div className="flex-1 space-y-1.5 text-[11px] min-w-0">
                  {tierDonutData.slice(0, 3).map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-1 text-white/70">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-white/50 font-semibold tabular-nums shrink-0">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-4 text-center w-full">
                <p className="text-xs text-white/40">No ticket sales recorded yet.</p>
                <Link
                  to="/organizer/events/create"
                  className="mt-1 text-[11px] text-violet-400 hover:underline font-medium inline-block"
                >
                  Create event tiers
                </Link>
              </div>
            )}
          </div>
        </CardShell>
      </div>

      {/* ── MIDDLE ROW: Operations + Revenue Over Time (Area Chart) + Top Events ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Card: Operational Fulfillment (3 cols) */}
        <CardShell className="xl:col-span-3 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Event Operations
                </h2>
              </div>
              <span className="text-[10px] text-white/40 font-mono">Live Status</span>
            </div>

            <div className="mt-4 space-y-4">
              {operationsStats.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 font-medium text-[11px] truncate">{item.label}</span>
                    <span className="font-extrabold text-white tabular-nums">{item.value}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#1b2038] overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/40 tabular-nums shrink-0">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <Link
              to="/organizer/wallet"
              className="text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition"
            >
              <span>Manage Wallet Payouts</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardShell>

        {/* Center Card: Revenue & Ticket Orders Dual Spline Area Chart (6 cols) */}
        <CardShell className="xl:col-span-6 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Revenue & Ticket Sales
                </h2>
                {revenueLoading && (
                  <span className="text-[10px] text-violet-400 animate-pulse font-mono">Updating...</span>
                )}
              </div>
              <p className="text-[11px] text-white/40 mt-0.5">
                Daily sales totals and customer order volume
              </p>
            </div>

            {/* Timeframe pill selector */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-[#1a1f35] border border-white/[0.06] text-xs">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => handleTimeframeChange(tf.key)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                    timeframe === tf.key
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dual Spline Chart */}
          <div className="mt-4 h-64 sm:h-72">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orgRevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="orgOrderAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
                    stroke="#c084fc"
                    strokeWidth={2.5}
                    fill="url(#orgRevAreaGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders Count"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#orgOrderAreaGrad)"
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

          <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-white/50">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c084fc]" />
                <span>Revenue</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#06b6d4]" />
                <span>Orders</span>
              </span>
            </div>
            <Link
              to="/organizer/analytics"
              className="text-violet-400 hover:text-violet-300 font-medium transition"
            >
              Full Analytics Report →
            </Link>
          </div>
        </CardShell>

        {/* Right Card: Top Performing Events (3 cols) */}
        <CardShell className="xl:col-span-3 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Top Events
              </h2>
              <Link
                to="/organizer/events"
                className="text-[10px] text-violet-400 hover:text-violet-300 transition"
              >
                All Events
              </Link>
            </div>

            <div className="mt-3 divide-y divide-white/[0.05]">
              {topEvents.length > 0 ? (
                topEvents.slice(0, 5).map((ev, idx) => {
                  const maxSold = Math.max(...topEvents.map((t) => Number(t.ticketsSold || 0)), 1);
                  const ticketsSold = Number(ev.ticketsSold || 0);
                  const pct = Math.min(100, Math.round((ticketsSold / maxSold) * 100));

                  return (
                    <div key={ev.id || idx} className="py-2.5 first:pt-1 last:pb-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white font-medium truncate max-w-[150px]">
                          {ev.name || ev.title || 'Untitled Event'}
                        </span>
                        <span className="text-white/60 font-semibold tabular-nums text-[11px]">
                          {ticketsSold.toLocaleString()} tickets
                        </span>
                      </div>
                      <div className="mt-1.5 w-full h-1 rounded-full bg-[#1b2038] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={TicketIcon}
                  title="No events yet"
                  description="Top selling events will be ranked here."
                  className="py-8"
                />
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-center">
            <Link
              to="/organizer/events/create"
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold inline-flex items-center gap-1 transition"
            >
              <span>Create New Event</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── BOTTOM ROW: Recent Orders (7 cols) + Upcoming Events & Capacity (5 cols) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Card: Recent Ticket Orders (7 cols) */}
        <CardShell className="xl:col-span-7 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Customer Orders
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                Real-time attendee purchases and booking transactions
              </p>
            </div>
            <Link
              to="/organizer/payments"
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition flex items-center gap-1"
            >
              <span>All Payments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-white/40 border-b border-white/[0.06] bg-white/[0.01]">
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
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3 font-mono text-[11px] text-violet-300">
                        #{o.reference ? o.reference.slice(-6) : String(o.id ?? '').slice(-6)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-white truncate max-w-[130px]">
                          {o.customerName || o.user?.name || 'Customer'}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {o.ticketCount || o.quantity || 1} ticket(s)
                        </p>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3 text-white/60 truncate max-w-[140px]">
                        {o.eventTitle || o.event?.title || '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-white tabular-nums">
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

        {/* Right Card: Upcoming Events & Capacity Tracker (5 cols) */}
        <CardShell className="xl:col-span-5 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Upcoming Event Schedule
                </h2>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Venue capacities and scheduled dates
                </p>
              </div>
              <Link
                to="/organizer/events"
                className="text-xs text-violet-400 hover:text-violet-300 font-medium transition"
              >
                Manage
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
                      className="p-3 rounded-xl bg-[#1a1f35]/60 border border-white/[0.05] hover:border-violet-500/30 transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-violet-300 transition truncate">
                            {e.title}
                          </p>
                          <p className="text-[10px] text-white/40 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-white/30" />
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
                        <div className="flex items-center justify-between text-[10px] text-white/50">
                          <span>Capacity filled ({pct}%)</span>
                          <span className="font-semibold text-white tabular-nums">
                            {sold} / {cap > 0 ? cap : '—'}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#141829] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
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
            <span className="text-white/40 text-[11px]">
              {upcomingEvents.length} event(s) scheduled
            </span>
            <Link
              to="/organizer/events"
              className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition"
            >
              <span>View All Events</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
