import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, DollarSign, Users, CalendarDays, Ticket as TicketIcon,
  Download, FileText, MapPin, TrendingUp, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getReports } from '@/api/admin';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const pieColors = ['#D4AF37', '#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#FB923C', '#22D3EE', '#FBBF24'];

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

export default function PlatformReportsPage() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [range, setRange] = useState('30d');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = { range };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await getReports(params);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [range, fromDate, toDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const revenue = data?.revenue || {};
  const users = data?.users || {};
  const events = data?.events || {};
  const tickets = data?.tickets || {};
  const geographic = data?.geographic || [];

  const revenueSeries = revenue.series || [];
  const userSeries = users.newUsersSeries || [];
  const categoryDist = events.byCategory || [];
  const eventsCreated = events.createdOverTime || [];
  const ticketTrend = tickets.salesTrend || [];
  const topEvents = tickets.topEvents || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        accent="blue"
        title="Platform Reports"
        subtitle="What's selling, who's signing up, and where tickets go."
        actions={
          <>
            <div className="flex items-center gap-1 rounded-lg bg-[#171A1D] border border-[#262B2F] p-1">
              {['7d', '30d', '90d', '1y'].map((r) => (
                <button
                  key={r}
                  onClick={() => { setRange(r); setFromDate(''); setToDate(''); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${range === r ? 'bg-[#D4AF37] text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
                >
                  {r === '1y' ? '1 Year' : r.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 rounded-lg bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] focus:outline-none focus:border-[#D4AF37]/60" />
              <span className="text-[#494F55]">—</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 rounded-lg bg-[#171A1D] border border-[#262B2F] text-xs text-[#EFEFF1] focus:outline-none focus:border-[#D4AF37]/60" />
            </div>
            <button
              onClick={() => exportCSV([{ section: 'Revenue', ...revenue }, { section: 'Users', ...users }, { section: 'Events', ...events }], 'platform-report.csv')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#262B2F] text-xs font-medium text-[#EFEFF1] hover:bg-[#2A2F33] transition"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#262B2F] text-xs font-medium text-[#EFEFF1] hover:bg-[#2A2F33] transition"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
          </>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading reports..." className="py-20" />
      ) : (
        <>
          {/* Revenue section */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#EFEFF1]"><span className="w-1 h-4 rounded-full bg-[#D4AF37]" /> Revenue</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Total Revenue" value={format(revenue.total)} trend={revenue.growth} trendLabel="vs last period" accent />
              <StatCard icon={TrendingUp} label="Growth" value={`${revenue.growth ?? 0}%`} />
              <StatCard icon={DollarSign} label="Commission Earned" value={format(revenue.commission)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Revenue Trend</h3>
                {revenueSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="reportRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="date" stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#949599" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => format(v, { compact: true })} />
                      <Tooltip contentStyle={{ background: '#161D22', border: '1px solid #494F55', borderRadius: 8, color: '#EFEFF1', fontSize: 12 }} formatter={(v) => [format(v), 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} fill="url(#reportRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart3} title="No revenue in this period" className="py-10" />}
              </div>
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Commission Breakdown</h3>
                <div className="space-y-3">
                  {(revenue.commissionBreakdown || [
                    { label: 'Ticket Sales', value: revenue.commission || 0 },
                    { label: 'Processing Fees', value: (revenue.commission || 0) * 0.1 },
                  ]).map((c, i) => {
                    const total = (revenue.commissionBreakdown || []).reduce((s, x) => s + (x.value || 0), 0) || 1;
                    const pct = Math.round((c.value / total) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#949599]">{c.label}</span>
                          <span className="text-sm font-medium text-[#EFEFF1]">{format(c.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#494F55]/30 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pieColors[i % pieColors.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Users section */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#EFEFF1]"><span className="w-1 h-4 rounded-full bg-[#60A5FA]" /> Users</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Users} label="New Users" value={(users.newUsers ?? 0).toLocaleString()} trend={users.growth} />
              <StatCard icon={TrendingUp} label="Active Users" value={(users.active ?? 0).toLocaleString()} />
              <StatCard icon={Users} label="Retention Rate" value={`${users.retention ?? 0}%`} />
            </div>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
              <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">New User Signups</h3>
              {userSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={userSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="date" stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#161D22', border: '1px solid #494F55', borderRadius: 8, color: '#EFEFF1', fontSize: 12 }} />
                    <Line type="monotone" dataKey="users" stroke="#60A5FA" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState icon={Users} title="No signups in this period" className="py-10" />}
            </div>
          </div>

          {/* Events section */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#EFEFF1]"><span className="w-1 h-4 rounded-full bg-[#34D399]" /> Events</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Events by Category</h3>
                {categoryDist.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                        {categoryDist.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#161D22', border: '1px solid #494F55', borderRadius: 8, color: '#EFEFF1', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#949599' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={CalendarDays} title="No categories with events yet" className="py-10" />}
              </div>
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Events Created Over Time</h3>
                {eventsCreated.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={eventsCreated} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="date" stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#161D22', border: '1px solid #494F55', borderRadius: 8, color: '#EFEFF1', fontSize: 12 }} cursor={{ fill: '#494F55', fillOpacity: 0.1 }} />
                      <Bar dataKey="events" fill="#34D399" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={CalendarDays} title="No events created in this period" className="py-10" />}
              </div>
            </div>
          </div>

          {/* Tickets section */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#EFEFF1]"><span className="w-1 h-4 rounded-full bg-[#A78BFA]" /> Tickets</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Ticket Sales Trend</h3>
                {ticketTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={ticketTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ticketGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#494F55" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="date" stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#949599" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#161D22', border: '1px solid #494F55', borderRadius: 8, color: '#EFEFF1', fontSize: 12 }} />
                      <Area type="monotone" dataKey="tickets" stroke="#A78BFA" strokeWidth={2} fill="url(#ticketGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={TicketIcon} title="No ticket sales in this period" className="py-10" />}
              </div>
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Top Events by Tickets</h3>
                {topEvents.length > 0 ? (
                  <div className="space-y-3">
                    {topEvents.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm text-[#EFEFF1] flex-1 truncate">{e.title || e.name}</span>
                        <span className="text-sm font-medium text-[#D4AF37]">{e.tickets ?? e.value ?? 0}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState icon={TicketIcon} title="No ticket sales yet" className="py-10" />}
              </div>
            </div>
          </div>

          {/* Geographic section */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#EFEFF1]"><span className="w-1 h-4 rounded-full bg-[#FB923C]" /> Geographic Distribution</h2>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
              {geographic.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                        <th className="px-5 py-3 font-medium">Rank</th>
                        <th className="px-5 py-3 font-medium">City</th>
                        <th className="px-5 py-3 font-medium text-right">Users</th>
                        <th className="px-5 py-3 font-medium text-right">Events</th>
                        <th className="px-5 py-3 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262B2F]/70">
                      {geographic.map((c, i) => (
                        <tr key={i} className="hover:bg-[#1D2124] transition-colors">
                          <td className="px-5 py-3 text-[#949599]">{i + 1}</td>
                          <td className="px-5 py-3 font-medium text-[#EFEFF1]">{c.city || c.name}</td>
                          <td className="px-5 py-3 text-right text-[#949599]">{(c.users ?? 0).toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-[#949599]">{c.events ?? 0}</td>
                          <td className="px-5 py-3 text-right font-medium text-[#EFEFF1]">{format(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={MapPin} title="No location data yet" className="py-16" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
