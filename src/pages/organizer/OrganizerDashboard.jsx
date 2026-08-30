import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarDays, Ticket as TicketIcon, Activity, ArrowRight,
  PlusCircle, BarChart3, UsersRound, Wallet, Calendar,
  ScanLine, Users, CheckCircle2, TrendingUp, DollarSign,
  Clock, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getDashboard, getRevenue, getWalletBalance } from '@/api/organizer';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { format, currency } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [data, setData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [wallet, setWallet] = useState({ available: 0, pending: 0, totalRevenue: 0 });
  const [revenueLoading, setRevenueLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, revRes, wallRes] = await Promise.all([
        getDashboard(),
        getRevenue({ range: timeframe }).catch(() => ({ data: [] })),
        getWalletBalance().catch(() => ({ data: { available: 0, pending: 0 } })),
      ]);
      setData(dashRes.data);
      const rev = revRes.data;
      setRevenueData(Array.isArray(rev) ? rev : rev?.data || []);
      if (wallRes.data) setWallet(wallRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTimeframeChange = async (newRange) => {
    setTimeframe(newRange);
    setRevenueLoading(true);
    try {
      const res = await getRevenue({ range: newRange });
      const rev = res.data;
      setRevenueData(Array.isArray(rev) ? rev : rev?.data || []);
    } catch (err) {
      console.error('[Dashboard] Failed to change revenue range:', err);
    } finally {
      setRevenueLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingSpinner label="Loading your dashboard..." className="py-20" />;

  const metrics = data?.metrics || {};
  const recentOrders = data?.recentOrders || [];
  const upcomingEvents = data?.upcomingEvents || [];
  const topEvents = data?.topEvents || [];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-[#EFEFF1]">
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {user?.name?.split(' ')[0] || 'Organizer'}
            </h1>
            {data?.organization?.isApproved
              ? <Badge variant="success" size="sm" dot>Verified Organizer</Badge>
              : <Badge variant="pending" size="sm" dot>Pending Verification</Badge>}
          </div>
          <p className="mt-1 text-sm text-[#949599]">
            {data?.organization?.name || user?.name || 'Your Event Hub'} · Live analytics, ticket sales, and event operations.
          </p>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={format(metrics.totalRevenue ?? 0)}
          trend={metrics.revenueTrend ?? 0}
          trendLabel="vs last month"
          accent
        />
        <StatCard
          icon={TicketIcon}
          label="Tickets Sold"
          value={metrics.ticketsSold?.toLocaleString() ?? 0}
          trend={metrics.ticketsSoldTrend ?? 0}
          trendLabel="vs last month"
        />
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#949599]">Available Balance</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-[#EFEFF1] tabular-nums">
              {format(wallet.available ?? metrics.availableBalance ?? 0)}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#949599]">Pending: {format(wallet.pending ?? 0)}</span>
              <span className="text-xs text-emerald-400 font-medium">Ready for payout</span>
            </div>
          </div>
        </div>
        <StatCard
          icon={CalendarDays}
          label="Active Events"
          value={metrics.activeEvents ?? 0}
          trend={metrics.activeEventsTrend ?? 0}
          trendLabel="vs last month"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Performance Chart */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#EFEFF1]">Revenue Trend</h2>
              <p className="text-xs text-[#949599]">Earnings over time ({timeframe.toUpperCase()})</p>
            </div>
            <div className="flex items-center gap-1 bg-[#1C232B] p-1 rounded-lg border border-[#494F55]/30">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTimeframeChange(t.key)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    timeframe === t.key
                      ? 'bg-white text-[#1C232B] shadow-sm font-semibold'
                      : 'text-[#949599] hover:text-[#EFEFF1]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {revenueLoading ? (
            <div className="h-[260px] flex items-center justify-center">
              <LoadingSpinner label="Updating chart..." />
            </div>
          ) : revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EFEFF1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#EFEFF1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#949599"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d) => {
                    const date = new Date(d);
                    return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis stroke="#949599" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => format(v, { compact: true })} />
                <Tooltip
                  contentStyle={{ background: '#171A1D', border: '1px solid #494F55', borderRadius: 8, color: '#EFEFF1', fontSize: 12 }}
                  labelStyle={{ color: '#949599' }}
                  formatter={(v) => [format(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#EFEFF1" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Activity} title="No revenue data yet" description="Revenue will show here once tickets are sold in this timeframe." className="py-10" />
          )}
        </div>

        {/* Best Selling Events Bar Chart */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#EFEFF1]">Top Events by Ticket Sales</h2>
              <p className="text-xs text-[#949599]">Your most popular events</p>
            </div>
          </div>
          {topEvents.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topEvents} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} horizontal={false} />
                <XAxis type="number" stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#949599" fontSize={11} tickLine={false} axisLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: '#171A1D', border: '1px solid #494F55', borderRadius: 8, color: '#EFEFF1', fontSize: 12 }}
                  cursor={{ fill: '#494F55', fillOpacity: 0.1 }}
                  formatter={(v) => [`${v} tickets`, 'Sold']}
                />
                <Bar dataKey="ticketsSold" fill="#EFEFF1" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={TicketIcon} title="No sales yet" description="Your top selling events will be ranked here." className="py-10" />
          )}
        </div>
      </div>

      {/* Orders & Upcoming Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#262B2F]">
            <h2 className="text-[15px] font-semibold text-[#EFEFF1]">Recent Ticket Purchases</h2>
            <p className="text-xs text-[#949599]">Real-time orders received</p>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                    <th className="hidden md:table-cell px-5 py-3 font-medium">Ref</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="hidden sm:table-cell px-5 py-3 font-medium">Event</th>
                    <th className="px-5 py-3 font-medium text-right">Amount</th>
                    <th className="px-5 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/70">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#1D2124] transition-colors">
                      <td className="hidden md:table-cell px-5 py-3 font-mono text-xs text-[#EFEFF1]">
                        #{o.reference ? o.reference.slice(-6) : String(o.id ?? '').slice(-6)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#EFEFF1] text-xs truncate max-w-[120px]">
                          {o.customerName || o.user?.name || 'Customer'}
                        </p>
                        <p className="text-[10px] text-[#949599]">{o.quantity || o.ticketCount || 1} ticket(s)</p>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3 text-xs text-[#949599] max-w-[130px] truncate">
                        {o.eventTitle || o.event?.title || '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-xs text-[#EFEFF1]">
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
            <EmptyState icon={Activity} title="No orders yet" description="Orders will appear here once attendees purchase tickets." className="py-10" />
          )}
        </div>

        {/* Upcoming Events Management */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#262B2F]">
            <h2 className="text-[15px] font-semibold text-[#EFEFF1]">Upcoming Events</h2>
            <p className="text-xs text-[#949599]">Schedule & ticket capacity status</p>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="p-5 space-y-3.5">
              {upcomingEvents.map((e) => {
                const sold = e.ticketsSold || 0;
                const cap = e.totalCapacity || e.capacity || 100;
                const pct = Math.min(100, Math.round((sold / cap) * 100));
                return (
                  <div
                    key={e.id}
                    className="p-3.5 rounded-lg bg-[#1D2124] border border-[#262B2F] flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-[#EFEFF1] truncate block">
                          {e.title}
                        </span>
                        <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-[#494F55]" />
                          {e.startDate ? new Date(e.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          <span>·</span>
                          <span className="truncate">{e.venue || e.city || 'Accra'}</span>
                        </p>
                      </div>
                      <Badge variant={e.status === 'published' ? 'success' : 'pending'} size="sm">
                        {e.status}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#949599]">
                        <span>Capacity ({pct}%)</span>
                        <span className="font-semibold text-[#EFEFF1]">{sold} / {cap} tickets</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#494F55]/30 overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              description="Your upcoming events and ticket capacities will be tracked here."
              className="py-10"
            />
          )}
        </div>
      </div>
    </div>
  );
}
