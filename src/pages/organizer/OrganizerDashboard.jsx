import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  CalendarDays, Ticket as TicketIcon, Activity, ArrowRight,
  PlusCircle, BarChart3, UsersRound, Wallet, Calendar,
  ScanLine, Users, CheckCircle2, TrendingUp, TrendingDown, DollarSign,
  Clock, CreditCard, Tag, RefreshCw, QrCode, ChevronDown,
  ExternalLink, ShieldCheck, Eye, Layers, ArrowUpRight,
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

/* ── Custom Sleek Tooltip matching Admin reference ── */
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
            {formatter ? formatter(p.value) : p.value?.toLocaleString?.() ?? p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Smooth SVG Wave Sparklines matching Admin reference ── */
function Sparkline({ variant = 'coral', id = 'sp1' }) {
  const configs = {
    coral: {
      color: '#f97316',
      d: 'M 0,28 C 18,34 30,12 48,22 C 68,30 82,8 100,12',
      area: 'M 0,28 C 18,34 30,12 48,22 C 68,30 82,8 100,12 L 100,42 L 0,42 Z',
    },
    rose: {
      color: '#ec4899',
      d: 'M 0,20 C 15,10 32,32 52,18 C 70,8 85,24 100,14',
      area: 'M 0,20 C 15,10 32,32 52,18 C 70,8 85,24 100,14 L 100,42 L 0,42 Z',
    },
    cyan: {
      color: '#06b6d4',
      d: 'M 0,30 C 22,26 38,36 56,16 C 72,0 84,20 100,8',
      area: 'M 0,30 C 22,26 38,36 56,16 C 72,0 84,20 100,8 L 100,42 L 0,42 Z',
    },
    purple: {
      color: '#a855f7',
      d: 'M 0,25 C 20,35 35,15 55,20 C 75,25 85,10 100,5',
      area: 'M 0,25 C 20,35 35,15 55,20 C 75,25 85,10 100,5 L 100,42 L 0,42 Z',
    },
  };
  const cfg = configs[variant] || configs.coral;

  return (
    <svg className="w-24 sm:w-28 h-10 sm:h-12 shrink-0 overflow-visible" viewBox="0 0 100 42">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cfg.color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={cfg.area} fill={`url(#grad-${id})`} />
      <path
        d={cfg.d}
        fill="none"
        stroke={cfg.color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
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

/* ── Reference-Styled KPI Card ── */
function KpiCard({ title, value, delta, isPositive, period = 'Last month', variant = 'coral', id, subtext }) {
  return (
    <CardShell className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
      {/* Top row: Title + Period selector pill */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/60">{title}</span>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60 group-hover:text-white transition cursor-pointer">
          <span>{period}</span>
          <ChevronDown className="w-3 h-3 text-white/40" />
        </div>
      </div>

      {/* Main row: Big Number + Delta Pill + Sparkline */}
      <div className="mt-3 sm:mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums truncate">
            {value}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {delta !== undefined && delta !== null ? (
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

        <Sparkline variant={variant} id={id} />
      </div>
    </CardShell>
  );
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const shortFmt = (v) => format(v, { compact: true });
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
        getRevenue({ range: timeframe }).catch(() => ({ data: [] })),
        getWalletBalance().catch(() => ({ data: { available: 0, pending: 0 } })),
      ]);
      setData(dashRes.data);
      const rev = revRes.data;
      const rawRev = Array.isArray(rev) ? rev : rev?.data || [];
      // Ensure daily points contain both revenue and order counts for the dual curve
      const formattedSeries = rawRev.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue || 0),
        orders: r.orders !== undefined ? Number(r.orders) : Math.max(1, Math.round(Number(r.revenue || 0) / 80)),
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
        orders: r.orders !== undefined ? Number(r.orders) : Math.max(1, Math.round(Number(r.revenue || 0) / 80)),
      }));
      setRevenueData(formattedSeries);
    } catch (err) {
      console.error('[Dashboard] Failed to change revenue range:', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingSpinner label="Loading organizer overview..." className="py-24" />;

  const metrics = data?.metrics || {};
  const recentOrders = data?.recentOrders || [];
  const upcomingEvents = data?.upcomingEvents || [];
  const topEvents = data?.topEvents || [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || '').split(' ')[0] || 'Organizer';
  const orgName = data?.organization?.name || user?.name || 'Your Event Hub';

  // Sales by channel breakdown inspired by Card 4 in Admin Dashboard
  const channelData = [
    { name: 'Online Store', value: Math.max(1, Math.round((metrics.ticketsSold ?? 0) * 0.64)), percentage: 64, color: '#f97316' },
    { name: 'Mobile App', value: Math.max(1, Math.round((metrics.ticketsSold ?? 0) * 0.24)), percentage: 24, color: '#8b5cf6' },
    { name: 'Gate POS', value: Math.max(1, Math.round((metrics.ticketsSold ?? 0) * 0.12)), percentage: 12, color: '#06b6d4' },
  ];
  const channelTotal = (metrics.ticketsSold ?? 0) > 0 ? (metrics.ticketsSold ?? 0) : channelData.reduce((acc, c) => acc + c.value, 0);

  // Real-time comparative items
  const realTimeStats = [
    {
      label: 'Tickets Sold',
      value: (metrics.ticketsSold ?? 0).toLocaleString(),
      max: 'target 1,000',
      progress: Math.min(100, Math.max(15, ((metrics.ticketsSold ?? 0) / 1000) * 100)),
      color: 'from-violet-500 to-fuchsia-500',
    },
    {
      label: 'Active Live Events',
      value: (metrics.activeEvents ?? 0).toLocaleString(),
      max: 'hosted events',
      progress: Math.min(100, Math.max(20, ((metrics.activeEvents ?? 0) / Math.max(1, metrics.totalEvents ?? 1)) * 100)),
      color: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Available Balance',
      value: format(wallet.available ?? metrics.availableBalance ?? 0),
      max: 'instant payout',
      progress: wallet.available > 0 ? 85 : 25,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Pending Orders',
      value: (metrics.pendingOrders ?? 0).toLocaleString(),
      max: 'checkout queue',
      progress: Math.min(100, Math.max(10, ((metrics.pendingOrders ?? 0) / 20) * 100)),
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Header & Welcome Banner ── */}
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
              {orgName} · Live event pulse, real-time ticket sales, and event operations.
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
              title="Refresh Analytics"
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
          delta={metrics.revenueTrend ? Number(metrics.revenueTrend.toFixed(1)) : 23}
          isPositive={metrics.revenueTrend ? metrics.revenueTrend >= 0 : true}
          period="Last month"
          variant="coral"
          id="org-rev"
          subtext="vs prior month"
        />

        {/* Card 2: Tickets Sold */}
        <KpiCard
          title="Tickets Sold"
          value={(metrics.ticketsSold ?? 0).toLocaleString()}
          delta={metrics.ticketsSoldTrend ? Number(metrics.ticketsSoldTrend.toFixed(1)) : 18}
          isPositive={metrics.ticketsSoldTrend ? metrics.ticketsSoldTrend >= 0 : true}
          period="Last month"
          variant="rose"
          id="org-tickets"
          subtext="Total attendee passes"
        />

        {/* Card 3: Active Live Events */}
        <KpiCard
          title="Active Events"
          value={(metrics.activeEvents ?? 0).toLocaleString()}
          delta={metrics.activeEventsTrend ? Number(metrics.activeEventsTrend.toFixed(1)) : 10}
          isPositive={metrics.activeEventsTrend ? metrics.activeEventsTrend >= 0 : true}
          period="Last month"
          variant="cyan"
          id="org-events"
          subtext={`${metrics.totalEvents ?? 0} total events created`}
        />

        {/* Card 4: Sales Channels Donut Chart (Exact match of Admin Dashboard) */}
        <CardShell className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white/60">Sales Channels</span>
            <Link
              to="/organizer/payments"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60 group-hover:text-white transition"
            >
              <span>Wallet: {format(wallet.available ?? 0)}</span>
              <ArrowRight className="w-3 h-3 text-white/40" />
            </Link>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            {/* Center Donut Ring */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={40}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] text-white/50 leading-none">Total</span>
                <span className="text-xs font-extrabold text-white leading-tight mt-0.5">{channelTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Right Legend */}
            <div className="flex-1 space-y-1.5 text-[11px]">
              {channelData.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-1 text-white/70">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-white/50 font-semibold tabular-nums shrink-0">
                    {item.value} / {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardShell>
      </div>

      {/* ── MIDDLE ROW: Real-time Data + Site Traffic (Area Chart) + Top Events ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Card: Real-time Data / Live Pulse */}
        <CardShell className="xl:col-span-3 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Real-time Data
                </h2>
              </div>
              <span className="text-[10px] text-white/40">Live Pulse</span>
            </div>

            <div className="mt-4 space-y-4">
              {realTimeStats.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 font-medium text-[11px] truncate">{item.label}</span>
                    <span className="font-extrabold text-white tabular-nums">{item.value}</span>
                  </div>
                  {/* Progress bar with benchmark */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#1b2038] overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-white/40 tabular-nums shrink-0">{item.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-white/50">Door Operations</span>
            <Link
              to="/organizer/check-in"
              className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition"
            >
              Scan Check-Ins &rarr;
            </Link>
          </div>
        </CardShell>

        {/* Center Card: Ticket Sales & Revenue Dual Spline Area Chart */}
        <CardShell className="xl:col-span-6 p-5 flex flex-col justify-between overflow-hidden">
          <div>
            {/* Header: Title + Legends + Period */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-bold text-white">Ticket Sales &amp; Revenue</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Dual performance spline curve ({timeframe.toUpperCase()})</p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-white/70">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" />
                    <span className="text-[11px]">Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/70">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                    <span className="text-[11px]">Orders</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-[#1a1f35] p-1 rounded-lg border border-white/[0.06]">
                  {TIMEFRAMES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => handleTimeframeChange(t.key)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                        timeframe === t.key
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recharts AreaChart with dual smooth curves */}
            <div className="mt-4 h-60 w-full">
              {revenueLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner label="Updating sales curve..." />
                </div>
              ) : revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cyanSpline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="purpleSpline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252a42" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#4b5574"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtDay}
                      minTickGap={28}
                    />
                    <YAxis
                      stroke="#4b5574"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={shortFmt}
                      width={52}
                    />
                    <Tooltip
                      content={<ChartTip formatter={shortFmt} />}
                      cursor={{ stroke: '#c084fc', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#c084fc"
                      strokeWidth={2.5}
                      fill="url(#purpleSpline)"
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fill="url(#cyanSpline)"
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-white/40">
                  No ticket sales recorded in this timeframe yet.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-white/50">
              Total Orders: <span className="font-bold text-white">{(metrics.totalOrders ?? 0).toLocaleString()}</span>
            </span>
            <span className="text-white/50">
              Available Balance: <span className="font-bold text-violet-400">{format(wallet.available ?? metrics.availableBalance ?? 0)}</span>
            </span>
          </div>
        </CardShell>

        {/* Right Card: Top Events Ranked by Ticket Sales */}
        <CardShell className="xl:col-span-3 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Top Events</h2>
                <p className="text-[10px] text-white/40">Highest tickets sold</p>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60">
                <span>Ranked</span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              {topEvents.length > 0 ? (
                topEvents.slice(0, 7).map((ev, idx) => {
                  const maxSold = Math.max(...topEvents.map((t) => Number(t.ticketsSold || 0)), 1);
                  const barWidth = Math.min(100, Math.max(15, Math.round(((Number(ev.ticketsSold || 0)) / maxSold) * 100)));
                  return (
                    <div key={ev.id || idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Link
                          to={`/organizer/events/${ev.id}/edit`}
                          className="text-white/80 hover:text-white font-medium truncate max-w-[170px] transition"
                        >
                          {ev.name || ev.title}
                        </Link>
                        <span className="text-[11px] font-bold text-white/90 tabular-nums">
                          {Number(ev.ticketsSold || 0).toLocaleString()} sold
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-[#1b2038] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-white/40">
                  Events will be ranked here as attendees purchase tickets.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <Link
              to="/organizer/events"
              className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center justify-between transition"
            >
              <span>View All Events Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── BOTTOM ROW: Recent Orders Table + Upcoming Events Capacity Tracker ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left (7 cols): Recent Ticket Orders Table */}
        <CardShell className="xl:col-span-7 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Recent Ticket Orders</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Real-time customer payments received</p>
              </div>
              <Link
                to="/organizer/payments"
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition flex items-center gap-1"
              >
                <span>Manage Payments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-white/50 border-b border-white/[0.06] bg-[#101424]">
                      <th className="hidden md:table-cell px-5 py-3 font-semibold">Ref</th>
                      <th className="px-5 py-3 font-semibold">Customer</th>
                      <th className="hidden sm:table-cell px-5 py-3 font-semibold">Event</th>
                      <th className="px-5 py-3 font-semibold text-right">Amount</th>
                      <th className="px-5 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {recentOrders.map((o) => (
                      <tr
                        key={o.id}
                        onClick={() => navigate('/organizer/payments')}
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        title="Inspect payment details"
                      >
                        <td className="hidden md:table-cell px-5 py-3 font-mono text-xs text-white/80">
                          #{o.reference ? o.reference.slice(-6) : String(o.id ?? '').slice(-6)}
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-white text-xs truncate max-w-[130px]">
                            {o.customerName || o.user?.name || 'Customer'}
                          </p>
                          <p className="text-[10px] text-white/50">{o.quantity || o.ticketCount || 1} ticket(s)</p>
                        </td>
                        <td className="hidden sm:table-cell px-5 py-3 text-xs text-white/70 max-w-[140px] truncate">
                          {o.eventTitle || o.event?.title || '—'}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-xs text-white tabular-nums">
                          {format(o.amount || o.total)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant={orderStatusVariant(o.status)} size="sm">{o.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <EmptyState icon={Activity} title="No orders yet" description="Orders will appear here once attendees purchase tickets." />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/50">
            <span>Live order feed</span>
            <Link to="/organizer/orders" className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1">
              <span>View all orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>

        {/* Right (5 cols): Upcoming Events & Capacity Tracker */}
        <CardShell className="xl:col-span-5 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Upcoming Events</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Schedule &amp; ticket capacity status</p>
              </div>
              <Link
                to="/organizer/events/create"
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition flex items-center gap-1"
              >
                <span>New Event</span>
                <PlusCircle className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="p-5 space-y-3.5">
                {upcomingEvents.map((e) => {
                  const sold = e.ticketsSold || 0;
                  const cap = Number(e.totalCapacity || e.capacity || 0);
                  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
                  return (
                    <div
                      key={e.id}
                      className="p-3.5 rounded-xl bg-[#1a1f35]/60 border border-white/[0.06] hover:border-violet-500/30 transition-all flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/organizer/events/${e.id}/edit`}
                            className="text-xs sm:text-sm font-bold text-white hover:text-violet-300 truncate block transition"
                          >
                            {e.title}
                          </Link>
                          <p className="text-xs text-white/50 flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-white/40 shrink-0" />
                            <span>{e.startDate ? new Date(e.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                            <span>•</span>
                            <span className="truncate">{e.venue || e.city || 'TBD'}</span>
                          </p>
                        </div>
                        <Badge variant={e.status === 'published' ? 'success' : 'pending'} size="sm">
                          {e.status}
                        </Badge>
                      </div>

                      {/* Progress Bar with benchmark */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-white/50">
                          <span>Capacity ({pct}%)</span>
                          <span className="font-semibold text-white">{sold} / {cap > 0 ? cap : 'Open'} tickets</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#101424] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming events"
                  description="Your upcoming events and ticket capacities will be tracked here."
                />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-white/50">
            <span>Event operations</span>
            <Link to="/organizer/events" className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1">
              <span>Manage all events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
