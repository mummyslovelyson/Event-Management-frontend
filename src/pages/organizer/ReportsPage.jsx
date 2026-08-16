import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart3, DollarSign, Users, TrendingUp, RotateCcw, Download, FileText,
  Calendar, Trophy, Crown, Medal, Award,
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

const ghc = (n) => `₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

const COLORS = { gold: '#D4AF37', muted: '#8A9196', dim: '#494F55', green: '#34d399', red: '#f87171' };

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const fmtAxis = (v) => {
  if (v >= 1000) return `₵${(v / 1000).toFixed(1)}k`;
  return `₵${v}`;
};

const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#171A1D] border border-[#494F55]/50 px-3 py-2 shadow-xl">
      {label != null && <p className="text-xs text-[#8A9196] mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color || p.stroke || p.fill }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
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
      setSalesData(unwrapArr(salesRes, 'sales'));
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
  const ratePct = attendance.rate ?? (attendance.total ? Math.round(((attendance.checkedIn || 0) / attendance.total) * 100) : 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        accent="blue"
        title="Reports & Analytics"
        subtitle="Track revenue, attendance, and sales performance."
        actions={
          <>
            <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 transition-colors">
              <Download className="w-4 h-4" /> Download CSV
            </button>
            <button onClick={handleExportPDF} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition-colors">
              <FileText className="w-4 h-4" /> Download PDF
            </button>
          </>
        }
      />

      {/* Date range */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#8A9196] mb-1.5">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] focus:outline-none focus:border-[#D4AF37]/60 transition"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#8A9196] mb-1.5">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] focus:outline-none focus:border-[#D4AF37]/60 transition"
              />
            </div>
          </div>
          <span className="text-xs text-[#494F55] pb-3">{Math.max(1, Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1)} days</span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Generating reports..." className="py-20" />
      ) : (
        <>
          {/* Revenue Report */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#EDF0F1] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#D4AF37]" /> Revenue Report
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Total Revenue" value={ghc(totalRevenue)} accent />
              <StatCard icon={TrendingUp} label="Net Revenue" value={ghc(netRevenue)} />
              <StatCard icon={RotateCcw} label="Commission" value={ghc(commission)} />
            </div>

            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
              <h3 className="text-sm font-medium text-[#EDF0F1] mb-4">Revenue Over Time</h3>
              {revenueData.length === 0 ? (
                <EmptyState icon={BarChart3} title="No revenue data" description="No sales recorded in this period." className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.dim} strokeOpacity={0.3} />
                    <XAxis dataKey="date" stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
                    <Tooltip content={<ChartTooltip formatter={ghc} />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.gold} strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Event breakdown */}
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
              <div className="px-5 py-3 border-b border-[#262B2F]">
                <h3 className="text-sm font-medium text-[#EDF0F1]">Revenue Breakdown by Event</h3>
              </div>
              {topEvents.length === 0 ? (
                <p className="px-5 py-8 text-sm text-[#8A9196] text-center">No event data for this period.</p>
              ) : (
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                      <th className="px-5 py-3 font-medium">Event</th>
                      <th className="px-5 py-3 font-medium text-right">Tickets</th>
                      <th className="px-5 py-3 font-medium text-right">Revenue</th>
                      <th className="px-5 py-3 font-medium text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/70">
                    {topEvents.map((e) => {
                      const share = totalRevenue > 0 ? Math.round(((e.revenue || 0) / totalRevenue) * 100) : 0;
                      return (
                        <tr key={e.id} className="hover:bg-[#1D2124] transition-colors">
                          <td className="px-5 py-3 text-[#EDF0F1] font-medium max-w-[220px] truncate">{e.title || e.eventTitle}</td>
                          <td className="px-5 py-3 text-right text-[#8A9196]">{e.ticketsSold || 0}</td>
                          <td className="px-5 py-3 text-right font-medium text-[#EDF0F1]">{ghc(e.revenue)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-[#D4AF37] font-medium">{share}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Attendance Report */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#EDF0F1] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D4AF37]" /> Attendance Report
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard icon={Users} label="Total Attendees" value={attendance.total || summary.totalAttendees || 0} />
              <StatCard icon={TrendingUp} label="Check-in Rate" value={`${ratePct}%`} accent />
            </div>

            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
              <h3 className="text-sm font-medium text-[#EDF0F1] mb-4">Attendance by Event</h3>
              {(attendance.byEvent || []).length === 0 ? (
                <EmptyState icon={Users} title="No attendance data" description="No check-ins recorded in this period." className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendance.byEvent} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.dim} strokeOpacity={0.3} />
                    <XAxis dataKey="title" stroke={COLORS.muted} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: COLORS.dim, fillOpacity: 0.1 }} />
                    <Bar dataKey="attendees" name="Attendees" fill={COLORS.gold} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="checkedIn" name="Checked In" fill={COLORS.green} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Top Selling Events */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#EDF0F1] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#D4AF37]" /> Top Selling Events
            </h2>
            {topEvents.length === 0 ? (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
                <EmptyState icon={Trophy} title="No sales yet" description="Top events will appear here once tickets are sold." className="py-10" />
              </div>
            ) : (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                      <th className="px-5 py-3 font-medium">Rank</th>
                      <th className="px-5 py-3 font-medium">Event</th>
                      <th className="px-5 py-3 font-medium text-right">Tickets Sold</th>
                      <th className="px-5 py-3 font-medium text-right">Revenue</th>
                      <th className="px-5 py-3 font-medium text-right">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262B2F]/70">
                    {topEvents.map((e, i) => {
                      const avg = (e.ticketsSold || 0) > 0 ? (e.revenue || 0) / e.ticketsSold : 0;
                      const RankIcon = i === 0 ? Crown : i === 1 ? Medal : i === 2 ? Award : null;
                      return (
                        <tr key={e.id} className="hover:bg-[#1D2124] transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {RankIcon ? (
                                <RankIcon className={`w-5 h-5 ${i === 0 ? 'text-[#D4AF37]' : i === 1 ? 'text-[#8A9196]' : 'text-[#a0611a]'}`} />
                              ) : (
                                <span className="w-5 h-5 flex items-center justify-center text-xs text-[#8A9196] font-semibold">{i + 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-[#EDF0F1] font-medium max-w-[220px] truncate">{e.title || e.eventTitle}</td>
                          <td className="px-5 py-3 text-right text-[#8A9196]">{e.ticketsSold || 0}</td>
                          <td className="px-5 py-3 text-right font-medium text-[#EDF0F1]">{ghc(e.revenue)}</td>
                          <td className="px-5 py-3 text-right text-[#8A9196]">{ghc(avg)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Sales Report */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#EDF0F1] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" /> Sales Report
              </h2>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#171A1D] border border-[#494F55]/40">
                {['daily', 'weekly', 'monthly'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setSalesGranularity(g)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition ${salesGranularity === g ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-[#8A9196] hover:text-[#EDF0F1]'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
              {salesData.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No sales data" description="No sales recorded in this period." className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.dim} strokeOpacity={0.3} />
                    <XAxis dataKey="date" stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip formatter={ghc} />} />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke={COLORS.gold} strokeWidth={2} dot={{ fill: COLORS.gold, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Refund Report */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#EDF0F1] flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#D4AF37]" /> Refund Report
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard icon={DollarSign} label="Total Refunds" value={ghc(refund.total)} />
              <StatCard icon={RotateCcw} label="Refund Count" value={refund.count || 0} />
            </div>
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
              <h3 className="text-sm font-medium text-[#EDF0F1] mb-4">Refund Trend</h3>
              {(refund.trend || []).length === 0 ? (
                <EmptyState icon={RotateCcw} title="No refunds" description="No refunds issued in this period." className="py-10" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={refund.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.dim} strokeOpacity={0.3} />
                    <XAxis dataKey="date" stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={COLORS.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
                    <Tooltip content={<ChartTooltip formatter={ghc} />} />
                    <Line type="monotone" dataKey="amount" name="Refunds" stroke={COLORS.red} strokeWidth={2} dot={{ fill: COLORS.red, r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
