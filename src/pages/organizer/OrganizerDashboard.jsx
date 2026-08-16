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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getDashboard, getRevenue } from '@/api/organizer';
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

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { format, currency } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, revRes] = await Promise.all([
        getDashboard(),
        getRevenue({ range: '30d' }).catch(() => ({ data: [] })),
      ]);
      setData(dashRes.data);
      setRevenueData(Array.isArray(revRes.data) ? revRes.data : revRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

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
            <h1 className="text-xl font-semibold tracking-tight text-[#EDF0F1]">
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {user?.name?.split(' ')[0] || 'there'}
            </h1>
            {data?.organization?.isApproved
              ? <Badge variant="success" size="sm" dot>Approved</Badge>
              : <Badge variant="pending" size="sm" dot>Pending approval</Badge>}
          </div>
          <p className="mt-1 text-sm text-[#8A9196]">
            {data?.organization?.name || 'Your organization'} · sales, tickets, and what's coming up.
          </p>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarDays}
          label="Total Events"
          value={metrics.totalEvents ?? 0}
          trend={metrics.totalEventsTrend ?? 0}
          trendLabel="vs last month"
        />
        <StatCard
          icon={TicketIcon}
          label="Tickets Sold"
          value={metrics.ticketsSold?.toLocaleString() ?? 0}
          trend={metrics.ticketsSoldTrend ?? 0}
          trendLabel="vs last month"
        />
        <StatCard
          label="Total Revenue"
          value={format(metrics.totalRevenue ?? 0)}
          trend={metrics.revenueTrend ?? 0}
          trendLabel="vs last month"
          accent
        />
        <StatCard
          icon={Activity}
          label="Active Events"
          value={metrics.activeEvents ?? 0}
          trend={metrics.activeEventsTrend ?? 0}
          trendLabel="vs last month"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Create Event', icon: PlusCircle, to: '/organizer/events/create' },
          { label: 'View Reports', icon: BarChart3, to: '/organizer/reports' },
          { label: 'Manage Team', icon: UsersRound, to: '/organizer/team' },
          { label: 'Withdraw Earnings', icon: Wallet, to: '/organizer/wallet' },
        ].map(({ label, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 p-4 rounded-xl bg-[#171A1D] border border-[#262B2F] hover:border-[#D4AF37]/30 transition-colors group"
          >
            <Icon className="w-5 h-5 text-[#5A6166] shrink-0 group-hover:text-[#D4AF37] transition-colors" />
            <span className="text-sm font-medium text-[#EDF0F1] transition-colors">{label}</span>
            <ArrowRight className="w-4 h-4 text-[#5A6166] ml-auto group-hover:text-[#D4AF37] transition-colors" />
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#EDF0F1]">Revenue</h2>
              <p className="text-xs text-[#8A9196]">Daily revenue, last 30 days</p>
            </div>
            <Badge variant="gold">{currency}</Badge>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#7D8387" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#7D8387" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => format(v, { compact: true })} />
                <Tooltip
                  contentStyle={{ background: '#171A1D', border: '1px solid #494F55', borderRadius: 8, color: '#EDF0F1', fontSize: 12 }}
                  labelStyle={{ color: '#7D8387' }}
                  formatter={(v) => [format(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Activity} title="No revenue data yet" description="Revenue will appear here once you start selling tickets." className="py-10" />
          )}
        </div>

        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-[#EDF0F1]">Ticket Sales by Event</h2>
              <p className="text-xs text-[#8A9196]">Your five best sellers</p>
            </div>
          </div>
          {topEvents.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topEvents} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} horizontal={false} />
                <XAxis type="number" stroke="#7D8387" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#7D8387" fontSize={11} tickLine={false} axisLine={false} width={100} />
                <Tooltip
                  contentStyle={{ background: '#171A1D', border: '1px solid #494F55', borderRadius: 8, color: '#EDF0F1', fontSize: 12 }}
                  cursor={{ fill: '#494F55', fillOpacity: 0.1 }}
                  formatter={(v) => [`${v} tickets`, 'Sold']}
                />
                <Bar dataKey="ticketsSold" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={TicketIcon} title="No sales yet" description="Your top selling events will show here." className="py-10" />
          )}
        </div>
      </div>

      {/* Recent Orders + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#262B2F]">
            <h2 className="text-[15px] font-semibold text-[#EDF0F1]">Recent Orders</h2>
            <Link to="/organizer/orders" className="text-xs font-medium text-[#D4AF37] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                    <th className="px-5 py-3 font-medium">Order ID</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Event</th>
                    <th className="px-5 py-3 font-medium text-center">Tickets</th>
                    <th className="px-5 py-3 font-medium text-right">Amount</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/70">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#1D2124] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-[#EDF0F1]">#{o.reference || o.id?.slice(-6)}</td>
                      <td className="px-5 py-3 text-[#EDF0F1]">{o.customerName || o.user?.name || '—'}</td>
                      <td className="px-5 py-3 text-[#8A9196] max-w-[140px] truncate">{o.eventTitle || o.event?.title || '—'}</td>
                      <td className="px-5 py-3 text-center text-[#8A9196]">{o.quantity || o.ticketCount || 0}</td>
                      <td className="px-5 py-3 text-right font-medium text-[#EDF0F1]">{format(o.amount || o.total)}</td>
                      <td className="px-5 py-3"><Badge variant={orderStatusVariant(o.status)} size="sm">{o.status}</Badge></td>
                      <td className="px-5 py-3 text-xs text-[#8A9196]">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Activity} title="No orders yet" description="Orders will appear here once tickets are purchased." className="py-10" />
          )}
        </div>

        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#262B2F]">
            <h2 className="text-[15px] font-semibold text-[#EDF0F1]">Upcoming Events</h2>
            <Link to="/organizer/events" className="text-xs font-medium text-[#D4AF37] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="p-5 space-y-4">
              {upcomingEvents.map((e) => {
                const sold = e.ticketsSold || 0;
                const cap = e.totalCapacity || e.capacity || 1;
                const pct = Math.min(100, Math.round((sold / cap) * 100));
                return (
                  <Link
                    key={e.id}
                    to={`/events/${e.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg bg-[#1D2124] hover:bg-[#23272A] border border-[#262B2F] transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-[#494F55] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#EDF0F1] truncate">{e.title}</p>
                      <p className="text-xs text-[#8A9196]">{e.startDate ? new Date(e.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} · {e.venue || e.city || '—'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-[#494F55]/30 overflow-hidden">
                          <div className="h-full bg-[#D4AF37] rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-medium text-[#8A9196] tabular-nums">{sold}/{cap}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No upcoming events" description="Create your first event to get started." action={() => navigate('/organizer/events/create')} actionLabel="Create Event" className="py-10" />
          )}
        </div>
      </div>
    </div>
  );
}
