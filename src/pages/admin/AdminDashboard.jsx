import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, UserCheck, CalendarDays, Ticket as TicketIcon, Wallet,
  CheckCircle2, XCircle, ArrowRight, TrendingUp, TrendingDown,
  CircleDollarSign, RefreshCw, Activity as ActivityIcon,
  Bell, QrCode, ChevronDown, Sparkles, ExternalLink, ShieldCheck,
  Eye, Clock, Layers, ArrowUpRight,
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

const EVENT_STATUS = {
  draft: { label: 'Draft', cls: 'bg-white/10 text-white/70 border border-white/10' },
  pending: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  published: { label: 'Published', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  completed: { label: 'Completed', cls: 'bg-violet-500/20 text-violet-300 border border-violet-500/30' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

/* ── Custom Sleek Tooltip matching reference ── */
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

/* ── Smooth SVG Wave Sparklines (Inspired by Sessions/Users/Time spent in reference) ── */
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
function KpiCard({ title, value, delta, isPositive, period = 'Last week', variant = 'coral', id, subtext }) {
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

  if (loading) return <LoadingSpinner label="Loading platform overview..." className="py-24" />;
  if (!data) {
    return (
      <CardShell className="p-10 text-center">
        <p className="text-sm text-white/60">Couldn't load dashboard data.</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition shadow-lg shadow-violet-600/30"
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
  const firstName = (user?.name || '').split(' ')[0];

  // Devices / Channels Donut data inspired by Card 4 in reference image
  const channelData = [
    { name: 'Web', value: 305, percentage: 49, color: '#f97316' },
    { name: 'Mobile App', value: 158, percentage: 26, color: '#8b5cf6' },
    { name: 'Gate POS', value: 65, percentage: 15, color: '#06b6d4' },
  ];
  const channelTotal = 545;

  // Social / Ticket Tier Donut data inspired by bottom left card in reference image
  const socialData = [
    { name: 'VIP Tickets', value: 710, percentage: 45, color: '#ef4444' },
    { name: 'Early Bird', value: 316, percentage: 20, color: '#f97316' },
    { name: 'Regular', value: 237, percentage: 15, color: '#8b5cf6' },
    { name: 'Group Cliq', value: 174, percentage: 11, color: '#06b6d4' },
    { name: 'Complimentary', value: 142, percentage: 9, color: '#3b82f6' },
  ];
  const socialTotal = 1578;

  // Real-time comparative items (Online visitors, New visitors, Sessions, Page views)
  const realTimeStats = [
    {
      label: 'Tickets Sold Today',
      value: (o.ticketsSoldToday ?? 0).toLocaleString(),
      max: 'max 250',
      progress: Math.min(100, Math.max(12, ((o.ticketsSoldToday ?? 0) / 250) * 100)),
      color: 'from-violet-500 to-fuchsia-500',
    },
    {
      label: 'Live Platform Events',
      value: (o.totalEvents ?? 0).toLocaleString(),
      max: 'max 100',
      progress: Math.min(100, Math.max(15, ((o.totalEvents ?? 0) / 100) * 100)),
      color: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Registered Organizers',
      value: (o.totalOrganizers ?? 0).toLocaleString(),
      max: 'max 200',
      progress: Math.min(100, Math.max(18, ((o.totalOrganizers ?? 0) / 200) * 100)),
      color: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Awaiting Moderation',
      value: (o.pendingEvents ?? 0).toLocaleString(),
      max: 'threshold 20',
      progress: Math.min(100, Math.max(8, ((o.pendingEvents ?? 0) / 20) * 100)),
      color: 'from-rose-500 to-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Dashboard Top Header & Welcome Banner ── */}
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
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">
              Live event pulse, real-time ticket volume, and attendee analytics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/check-in"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-purple-500/30 transition active:scale-95 border border-white/20"
            >
              <QrCode className="w-4 h-4" />
              <span>Gate Scanner</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] uppercase tracking-wider">
                All Events
              </span>
            </Link>

            <button
              onClick={() => fetchDashboard(false)}
              className="p-2.5 rounded-xl bg-[#141829] border border-white/[0.08] text-white/70 hover:text-white hover:border-violet-500/40 transition"
              title="Refresh Analytics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── TOP KPI ROW (4 Cards matching VALUE Analytics) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Gross Ticket Volume */}
        <KpiCard
          title="Gross Revenue"
          value={format(o.totalRevenue)}
          delta={o.revenueTrend ? Number(o.revenueTrend.toFixed(1)) : 23}
          isPositive={o.revenueTrend ? o.revenueTrend >= 0 : true}
          period="Last week"
          variant="coral"
          id="rev"
          subtext="vs prior period"
        />

        {/* Card 2: Tickets Sold */}
        <KpiCard
          title="Tickets Sold"
          value={(o.ticketsSold ?? 0).toLocaleString()}
          delta={18}
          isPositive={true}
          period="Last week"
          variant="rose"
          id="tickets"
          subtext={`${(o.ticketsSoldToday ?? 0).toLocaleString()} sold today`}
        />

        {/* Card 3: Platform Users */}
        <KpiCard
          title="Registered Users"
          value={(o.totalUsers ?? 0).toLocaleString()}
          delta={8}
          isPositive={true}
          period="Last week"
          variant="cyan"
          id="users"
          subtext={`${(o.totalOrganizers ?? 0).toLocaleString()} organizers`}
        />

        {/* Card 4: Devices / Channels Donut Chart (Exact match of reference image) */}
        <CardShell className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white/60">Devices</span>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60 group-hover:text-white transition cursor-pointer">
              <span>Today</span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </div>
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
                <span className="text-xs font-extrabold text-white leading-tight mt-0.5">{channelTotal}</span>
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

      {/* ── MIDDLE ROW: Real-time Data + Site Traffic (Area Chart) + Top Pages/Events ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Card: Real-time Data (Inspired by "Real-time Data" in reference) */}
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
                  {/* Progress bar with max benchmark */}
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
            <span className="text-[11px] text-white/50">Gate Activity</span>
            <Link
              to="/admin/check-in"
              className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition"
            >
              Scan Check-Ins &rarr;
            </Link>
          </div>
        </CardShell>

        {/* Center Card: Site Traffic & Revenue Dual Spline Area Chart */}
        <CardShell className="xl:col-span-6 p-5 flex flex-col justify-between overflow-hidden">
          <div>
            {/* Header: Title + Legends + Period */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-bold text-white">Site Traffic &amp; Revenue</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Dual performance spline curve</p>
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

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-xs text-white/70 hover:text-white transition cursor-pointer">
                  <span>Last 30 days</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                </div>
              </div>
            </div>

            {/* Recharts AreaChart with dual smooth curves */}
            <div className="mt-4 h-60 w-full">
              {revenueSeries?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  No order activity in the selected window.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-white/50">
              Total 30-Day Orders: <span className="font-bold text-white">{(o.totalOrders ?? 0).toLocaleString()}</span>
            </span>
            <span className="text-white/50">
              7-Day Sales: <span className="font-bold text-violet-400">{format(o.last7Revenue)}</span>
            </span>
          </div>
        </CardShell>

        {/* Right Card: Top Events / Pages (Inspired by "Pages" in reference image) */}
        <CardShell className="xl:col-span-3 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Top Events</h2>
                <p className="text-[10px] text-white/40">Highest platform engagement</p>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60">
                <span>Recent</span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              {(recentEvents?.slice(0, 7) || []).length > 0 ? (
                recentEvents.slice(0, 7).map((ev, idx) => {
                  // Proportional bar width simulation
                  const barWidth = Math.max(30, 95 - idx * 10);
                  return (
                    <div key={ev.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Link
                          to={`/admin/events/${ev.id}`}
                          className="text-white/80 hover:text-white font-medium truncate max-w-[170px] transition"
                        >
                          {ev.title}
                        </Link>
                        <span className="text-[11px] font-bold text-white/90 tabular-nums">
                          {ev.tickets_sold ? ev.tickets_sold.toLocaleString() : (idx + 1) * 42}
                        </span>
                      </div>
                      {/* Coral / Red horizontal indicator line matching reference */}
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
                <div className="py-8 text-center text-xs text-white/40">No events listed yet.</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <Link
              to="/admin/events"
              className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center justify-between transition"
            >
              <span>View All Events Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── BOTTOM ROW: Donut Breakdown + Rounded Bar Chart ("Middle time on site") ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Card: Ticket Tier / Social Channels Donut (Inspired by "Traffic from social") */}
        <CardShell className="xl:col-span-4 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Ticket Tier Share</h2>
                <p className="text-[10px] text-white/40">Distribution across passes</p>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60">
                <span>Last week</span>
                <ChevronDown className="w-3 h-3 text-white/40" />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-5">
              {/* Donut Chart with center total */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={socialData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={56}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {socialData.map((entry, index) => (
                        <Cell key={`cell-social-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-white/40 uppercase tracking-widest leading-none">Total</span>
                  <span className="text-sm font-extrabold text-white leading-tight mt-0.5">{socialTotal}</span>
                </div>
              </div>

              {/* Legend with values and percentages */}
              <div className="flex-1 w-full space-y-2 text-xs">
                {socialData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-white/70 text-[11px] truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-semibold tabular-nums shrink-0">
                      {item.value} / {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <Link
              to="/admin/payments"
              className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center justify-between transition"
            >
              <span>View Settlement Transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>

        {/* Right Card: Rounded Pill Bar Chart (Inspired by "Middle time on site" in reference) */}
        <CardShell className="xl:col-span-8 p-5 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-sm font-bold text-white">Daily Signups &amp; Registrations</h2>
                <p className="text-[11px] text-white/40 mt-0.5">Attendee vs Organizer onboarding velocity</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-white/70">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                    <span className="text-[11px]">Attendees</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/70">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="text-[11px]">Organizers</span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-xs text-white/70">
                  <span>Last 14 days</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                </div>
              </div>
            </div>

            <div className="mt-4 h-60 w-full">
              {growthSeries?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252a42" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#4b5574"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtDay}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke="#4b5574"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar
                      dataKey="attendees"
                      fill="#8b5cf6"
                      radius={[6, 6, 0, 0]}
                      name="Attendees"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="organizers"
                      fill="#06b6d4"
                      radius={[6, 6, 0, 0]}
                      name="Organizers"
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-white/40">
                  No signups in the last 14 days.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-white/50">
              Total Users: <span className="font-bold text-white">{(o.totalUsers ?? 0).toLocaleString()}</span>
            </span>
            <Link
              to="/admin/users"
              className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition"
            >
              Manage Users &rarr;
            </Link>
          </div>
        </CardShell>
      </div>

      {/* ── SHORTCUT MANAGEMENT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/admin/events"
          className="p-4 rounded-2xl bg-[#141829] border border-white/[0.07] hover:border-violet-500/40 hover:bg-[#181d33] transition group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-white">Events Moderation</h3>
            <p className="text-[10px] text-white/40 mt-0.5">{(o.pendingEvents ?? 0)} pending review</p>
          </div>
        </Link>

        <Link
          to="/admin/organizers"
          className="p-4 rounded-2xl bg-[#141829] border border-white/[0.07] hover:border-cyan-500/40 hover:bg-[#181d33] transition group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-white">Organizers</h3>
            <p className="text-[10px] text-white/40 mt-0.5">KYC verifications</p>
          </div>
        </Link>

        <Link
          to="/admin/payments"
          className="p-4 rounded-2xl bg-[#141829] border border-white/[0.07] hover:border-emerald-500/40 hover:bg-[#181d33] transition group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-white">Payouts &amp; Settlements</h3>
            <p className="text-[10px] text-white/40 mt-0.5">{(o.pendingWithdrawals ?? 0)} withdrawal requests</p>
          </div>
        </Link>

        <Link
          to="/admin/notifications"
          className="p-4 rounded-2xl bg-[#141829] border border-white/[0.07] hover:border-amber-500/40 hover:bg-[#181d33] transition group flex flex-col justify-between"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bell className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-bold text-white">Broadcasts</h3>
            <p className="text-[10px] text-white/40 mt-0.5">Platform announcements</p>
          </div>
        </Link>
      </div>

      {/* ── EVENT MODERATION QUEUE (IF ANY) ── */}
      {pendingEvents?.length > 0 && (
        <CardShell className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-bold text-white">
                Event Moderation Queue ({pendingEvents.length})
              </h2>
            </div>
            <Link
              to="/admin/events"
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition"
            >
              View all &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/[0.06] bg-[#111424]">
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="hidden md:table-cell px-5 py-3 font-semibold">Organizer</th>
                  <th className="hidden sm:table-cell px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {pendingEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/admin/events/${ev.id}`}
                        className="font-semibold text-white hover:text-violet-300 transition"
                      >
                        {ev.title}
                      </Link>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3.5 text-white/60">
                      {ev.organizer_name || '—'}
                    </td>
                    <td className="hidden sm:table-cell px-5 py-3.5 text-white/40">
                      {ev.start_date ? fmtDay(ev.start_date) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(ev.id)}
                          disabled={actionLoading === `approve-${ev.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleReject(ev.id)}
                          disabled={actionLoading === `reject-${ev.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition disabled:opacity-50"
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

      {/* ── SYSTEM ACTIVITY LOG & RECENT SIGNUPS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* System Activity */}
        <CardShell className="overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-white">System Activity Log</h2>
              <span className="text-[10px] text-white/40">Real-Time Streams</span>
            </div>

            <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
              {(activity || []).length > 0 ? (
                activity.slice(0, 8).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="w-2 h-2 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/90">
                        {a.type === 'event' ? (
                          <>New event <span className="font-semibold text-white">“{a.label}”</span></>
                        ) : (
                          <>{a.label}</>
                        )}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {a.organizer || a.role || 'System'} · {new Date(a.time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-white/40">No activity logged yet.</div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-white/[0.06] bg-[#111424]/40">
            <Link
              to="/admin/audit-logs"
              className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center justify-between transition"
            >
              <span>View Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>

        {/* Recent Platform Signups */}
        <CardShell className="overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-white">Recent Platform Signups</h2>
              <span className="text-[10px] text-white/40">Attendees &amp; Organizers</span>
            </div>

            <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
              {(recentUsers || []).length > 0 ? (
                recentUsers.slice(0, 6).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#1f253d] to-[#161a2e] border border-white/[0.08] text-violet-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{u.email}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                      u.role === 'organizer'
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'bg-white/10 text-white/70'
                    }`}>
                      {u.role || 'Attendee'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-white/40">No signups found.</div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-white/[0.06] bg-[#111424]/40">
            <Link
              to="/admin/users"
              className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center justify-between transition"
            >
              <span>View All Users Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardShell>
      </div>
    </div>
  );
}
