import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  BarChart3, DollarSign, Users, TrendingUp, RotateCcw, Download, FileText,
  Calendar, Trophy, Crown, Medal, Award, MapPin, CreditCard, Ticket as TicketIcon, Percent,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getRevenue, getSalesReport, getReportSummary, getAttendanceReport,
  getTopEvents, getRefundReport, exportReport,
} from '@/api/organizer';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import Badge from '@/components/common/Badge';
import { useCurrency } from '@/context/CurrencyContext';

const COLORS = { gold: '#EFEFF1', muted: '#949599', dim: '#494F55', green: '#34d399', red: '#f87171' };

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#121620] border border-white/10 px-3 py-2 shadow-xl backdrop-blur-md">
      {label != null && <p className="text-xs text-neutral-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color || p.stroke || p.fill }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const { format } = useCurrency();
  const axisFmt = (v) => format(v, { compact: true });
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(today.getMonth() - 1);

  const [fromDate, setFromDate] = useState(monthAgo.toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [salesGranularity, setSalesGranularity] = useState('daily');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [attendance, setAttendance] = useState({ total: 0, rate: 0, byEvent: [] });
  const [topEvents, setTopEvents] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [salesByTicketType, setSalesByTicketType] = useState([]);
  const [salesByLocation, setSalesByLocation] = useState([]);
  const [salesByPaymentMethod, setSalesByPaymentMethod] = useState([]);
  const [refund, setRefund] = useState({ total: 0, count: 0, trend: [] });

  const params = useMemo(() => ({ from: fromDate, to: toDate, granularity: salesGranularity }), [fromDate, toDate, salesGranularity]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, revRes, attRes, topRes, salesRes, refundRes] = await Promise.allSettled([
        getReportSummary({ from: fromDate, to: toDate }),
        getRevenue({ from: fromDate, to: toDate }),
        getAttendanceReport({ from: fromDate, to: toDate }),
        getTopEvents({ from: fromDate, to: toDate }),
        getSalesReport({ from: fromDate, to: toDate, granularity: salesGranularity }),
        getRefundReport({ from: fromDate, to: toDate }),
      ]);

      const unwrapArr = (r, key) => {
        if (r.status !== 'fulfilled') return [];
        const d = r.value?.data;
        const val = key ? (d?.[key] ?? d) : d;
        return Array.isArray(val) ? val : [];
      };

      const unwrapObj = (r, key) => {
        if (r.status !== 'fulfilled') return {};
        const d = r.value?.data;
        const val = key ? (d?.[key] ?? d) : d;
        return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
      };

      setSummary(unwrapObj(sumRes, 'summary'));
      setRevenueData(unwrapArr(revRes, 'revenueByEvent'));
      setAttendance(unwrapObj(attRes, 'attendance'));
      setTopEvents(unwrapArr(topRes, 'events'));

      const sData = salesRes.status === 'fulfilled' ? salesRes.value?.data || {} : {};
      setSalesData(Array.isArray(sData.dailySales) ? sData.dailySales : unwrapArr(salesRes, 'sales'));
      setSalesByTicketType(Array.isArray(sData.salesByTicketType) ? sData.salesByTicketType : []);
      setSalesByLocation(Array.isArray(sData.salesByLocation) ? sData.salesByLocation : []);
      setSalesByPaymentMethod(Array.isArray(sData.salesByPaymentMethod) ? sData.salesByPaymentMethod : []);

      setRefund(unwrapObj(refundRes, 'refund'));

      // surface any hard failures
      [sumRes, revRes, attRes, topRes, salesRes, refundRes].forEach((r) => {
        if (r.status === 'rejected') console.error(r.reason);
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, salesGranularity]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExportPDF = async () => {
    const t = toast.loading('Generating PDF report...');
    try {
      const res = await exportReport({ from: fromDate, to: toDate, format: 'pdf' });
      downloadBlob(res.data, `report-${fromDate}-to-${toDate}.pdf`);
      toast.success('Report downloaded', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed', { id: t });
    }
  };

  const handleExportCSV = async () => {
    const t = toast.loading('Generating CSV report...');
    try {
      const res = await exportReport({ from: fromDate, to: toDate, format: 'csv' });
      downloadBlob(res.data, `report-${fromDate}-to-${toDate}.csv`);
      toast.success('Report downloaded', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed', { id: t });
    }
  };

  const totalRevenue = summary.totalRevenue ?? summary.grossRevenue ?? 0;
  const netRevenue = summary.netRevenue ?? (totalRevenue - (summary.commission ?? 0));
  const commission = summary.commission ?? 0;
  const totalTicketsSold = summary.totalTicketsSold ?? 0;
  const totalCapacity = summary.totalCapacity ?? 0;
  const ticketsSoldPct = totalCapacity > 0 ? Math.min(100, Math.round((totalTicketsSold / totalCapacity) * 100)) : 0;
  const conversionRate = summary.conversionRate ?? 0;
  const ratePct = summary.checkInRate ?? attendance.rate ?? (attendance.total ? Math.round(((attendance.checkedIn || 0) / attendance.total) * 100) : 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        accent="blue"
        title="Reports & Analytics"
        subtitle="Track revenue, attendance, and sales performance."
        actions={
          <>
            <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg text-sm font-medium text-white border border-white/20 hover:bg-white/10 transition-colors">
              <Download className="w-4 h-4" /> Download CSV
            </button>
            <button onClick={handleExportPDF} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors">
              <FileText className="w-4 h-4" /> Download PDF
            </button>
          </>
        }
      />

      {/* Date range */}
      <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/30 transition"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/30 transition"
              />
            </div>
          </div>
          <span className="text-xs text-neutral-500 pb-2.5 tabular-nums font-mono">{Math.max(1, Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1)} days</span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Generating reports..." className="py-20" />
      ) : (
        <>
          {/* Revenue & Ticket Admission Hero Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Event Revenue Hero */}
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Event Revenue</span>
                  <Badge variant="success" size="sm">Verified Payouts</Badge>
                </div>
                <h2 className="mt-3 text-3xl sm:text-4xl font-semibold text-white tracking-tight tabular-nums">{format(totalRevenue)}</h2>
                <p className="mt-1 text-xs text-neutral-500">Cumulative earnings across all published events</p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[11px] text-neutral-500">Net Revenue</span>
                  <strong className="text-white text-sm font-semibold tabular-nums">{format(netRevenue)}</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-neutral-500">Platform Fees</span>
                  <strong className="text-neutral-400 text-sm font-semibold tabular-nums">{format(commission)}</strong>
                </div>
              </div>
            </div>

            {/* Tickets Sold Hero Progress */}
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Tickets Sold</span>
                  <span className="text-xs font-semibold text-white tabular-nums">
                    {totalTicketsSold.toLocaleString()} / {totalCapacity.toLocaleString()} ({ticketsSoldPct}%)
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-semibold text-white tabular-nums">
                    {totalTicketsSold.toLocaleString()}
                  </span>
                  <span className="text-xs text-neutral-500">total admissions</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="mt-4">
                  <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden flex items-center">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(2, ticketsSoldPct))}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                    <span>Capacity reached</span>
                    <span className="text-white font-medium tabular-nums">{ticketsSoldPct}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[11px] text-neutral-500">Conversion Rate</span>
                  <strong className="text-white text-sm font-semibold tabular-nums">{conversionRate}%</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-neutral-500">Attendance Rate</span>
                  <strong className="text-white text-sm font-semibold tabular-nums">{ratePct}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={DollarSign} label="Total Orders" value={summary.totalOrders || 0} />
            <StatCard icon={Users} label="Total Attendees" value={attendance.total || summary.totalAttendees || 0} />
            <StatCard icon={TrendingUp} label="Check-in Rate" value={`${ratePct}%`} />
            <StatCard icon={RotateCcw} label="Total Refunds" value={format(refund.total || 0)} />
          </div>

          {/* Chart 1: Sales by Day & Revenue Over Time */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-neutral-400" /> Sales by Day & Revenue Over Time
              </h2>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#121620] border border-white/[0.08]">
                {['daily', 'weekly', 'monthly'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setSalesGranularity(g)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition ${salesGranularity === g ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5">
              <h3 className="text-xs font-medium text-neutral-400 mb-4">Daily Sales & Cumulative Revenue Trend</h3>
              {salesData.length === 0 && revenueData.length === 0 ? (
                <EmptyState icon={BarChart3} title="No sales data" description="No sales recorded in this period." className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={salesData.length > 0 ? salesData : revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisFmt} />
                    <Tooltip content={<ChartTooltip formatter={format} />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#FFFFFF" strokeWidth={2} fill="url(#revGrad)" />
                    <Line type="monotone" dataKey="ticketsSold" name="Tickets Sold" stroke="#818CF8" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Grid: Sales by Ticket Type & Sales by Location */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 2: Sales by Ticket Type */}
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-neutral-400" /> Sales by Ticket Type
                </h3>
                <span className="text-[11px] text-neutral-500">Tiers Breakdown</span>
              </div>
              {salesByTicketType.length === 0 ? (
                <EmptyState icon={TicketIcon} title="No ticket breakdown" description="Ticket tier distribution will appear once tickets are purchased." className="py-8" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={salesByTicketType} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="ticketType" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisFmt} />
                    <Tooltip content={<ChartTooltip formatter={format} />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ticketsSold" name="Tickets Sold" fill="#818CF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart 3: Sales by Location */}
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" /> Sales by Location
                </h3>
                <span className="text-[11px] text-neutral-500">Geographic Distribution</span>
              </div>
              {salesByLocation.length === 0 ? (
                <EmptyState icon={MapPin} title="No location data" description="Sales distribution across cities and venues will show here." className="py-8" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={salesByLocation} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="location" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={axisFmt} />
                    <Tooltip content={<ChartTooltip formatter={format} />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ticketsSold" name="Tickets Sold" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Grid: Sales by Payment Method & Refunds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 4: Sales by Payment Method */}
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-neutral-400" /> Sales by Payment Method
                </h3>
                <span className="text-[11px] text-neutral-500">Payment Breakdown</span>
              </div>
              {salesByPaymentMethod.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No payment method data"
                  description="Sales distribution by payment method will appear once transactions are processed."
                  className="py-8"
                />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={salesByPaymentMethod} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={axisFmt} />
                    <YAxis dataKey="paymentMethod" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={110} />
                    <Tooltip content={<ChartTooltip formatter={format} />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#FFFFFF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart 5: Refunds Report & Trend */}
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-neutral-400" /> Refunds & Dispute Metrics
                </h3>
                <Badge variant={refund.count > 0 ? 'warning' : 'success'} size="sm">
                  {refund.count || 0} Refunds Issued
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] text-neutral-400">Total Refunded</span>
                  <p className="text-base font-semibold text-rose-400 mt-1 tabular-nums">{format(refund.total || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] text-neutral-400">Refund Rate</span>
                  <p className="text-base font-semibold text-white mt-1 tabular-nums">
                    {totalRevenue > 0 ? ((refund.total / totalRevenue) * 100).toFixed(1) : '0.0'}%
                  </p>
                </div>
              </div>
              {(refund.trend || []).length === 0 ? (
                <EmptyState icon={RotateCcw} title="Clean record" description="No refunds requested in this selected period." className="py-6" />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={refund.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickFormatter={axisFmt} />
                    <Tooltip content={<ChartTooltip formatter={format} />} />
                    <Line type="monotone" dataKey="amount" name="Refunds" stroke="#f87171" strokeWidth={2} dot={{ fill: '#f87171', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart 6: Attendance by Event */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-400" /> Attendance & Gate Admission Turnout
            </h2>
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5">
              <h3 className="text-xs font-medium text-neutral-400 mb-4">Attendee Registrations vs Checked In</h3>
              {(attendance.byEvent || []).length === 0 ? (
                <EmptyState icon={Users} title="No attendance data" description="No check-ins recorded in this period." className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendance.byEvent} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="title" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="attendees" name="Total Sold" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="checkedIn" name="Checked In" fill="#818CF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Top Selling Events Table */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-neutral-400" /> Top Performing Events
            </h2>
            {topEvents.length === 0 ? (
              <div className="rounded-xl bg-[#121620] border border-white/[0.08]">
                <EmptyState icon={Trophy} title="No sales yet" description="Top events will appear here once tickets are sold." className="py-10" />
              </div>
            ) : (
              <div className="rounded-xl bg-[#121620] border border-white/[0.08] overflow-hidden overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-5 py-3 font-medium">Rank</th>
                      <th className="px-5 py-3 font-medium">Event</th>
                      <th className="px-5 py-3 font-medium text-right">Tickets Sold</th>
                      <th className="px-5 py-3 font-medium text-right">Revenue</th>
                      <th className="px-5 py-3 font-medium text-right">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {topEvents.map((e, i) => {
                      const avg = (e.ticketsSold || 0) > 0 ? (e.revenue || 0) / e.ticketsSold : 0;
                      const RankIcon = i === 0 ? Crown : i === 1 ? Medal : i === 2 ? Award : null;
                      return (
                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {RankIcon ? (
                                <RankIcon className={`w-4 h-4 ${i === 0 ? 'text-white' : i === 1 ? 'text-neutral-400' : 'text-neutral-500'}`} />
                              ) : (
                                <span className="w-4 h-4 flex items-center justify-center text-[11px] text-neutral-500 font-medium">{i + 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-white font-medium max-w-[220px] truncate">{e.title || e.eventTitle}</td>
                          <td className="px-5 py-3 text-right text-neutral-400 tabular-nums">{e.ticketsSold || 0}</td>
                          <td className="px-5 py-3 text-right font-medium text-white tabular-nums">{format(e.revenue)}</td>
                          <td className="px-5 py-3 text-right text-neutral-400 tabular-nums">{format(avg)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
