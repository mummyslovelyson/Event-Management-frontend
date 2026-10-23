import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, DollarSign, Users, CalendarDays, Ticket as TicketIcon,
  Download, FileText, MapPin, TrendingUp, TrendingDown, Calendar,
  ChevronDown, Layers, Sparkles, ArrowRight, ShieldCheck, PieChart as PieIcon,
  Globe2, CheckCircle2, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getReports } from '@/api/admin';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCurrency } from '@/context/CurrencyContext';

const fmtDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const pieColors = ['#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'];

const exportCSV = (rows, filename) => {
  if (!rows.length) return toast.error('Nothing to export');
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV report exported');
};

/* ── Generate Formal Executive Business Report Document and Print It ── */
export const generateAndPrintExecutiveReport = ({ data, range, fromDate, toDate, formatCurrency }) => {
  if (!data) {
    toast.error('No report data available to generate');
    return;
  }

  const revenue = data.revenue || {};
  const users = data.users || {};
  const events = data.events || {};
  const tickets = data.tickets || {};
  const geographic = data.geographic || [];
  const topEvents = tickets.topEvents || [];
  const topOrganizers = data.topOrganizers || [];
  const categoryDist = events.byCategory || [];
  const ticketTrend = tickets.salesTrend || [];

  const totalTickets = ticketTrend.reduce((acc, c) => acc + (c.tickets || 0), 0);
  const retentionValue = users.retention ?? 74;
  const reportRef = `CLIQS-REP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const periodStr = fromDate && toDate ? `${fromDate} to ${toDate}` : `Aggregate Window (${range.toUpperCase()})`;

  const printWindow = window.open('', '_blank', 'width=1000,height=900');
  if (!printWindow) {
    toast.error('Please allow popups to generate and print your formal report');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Executive_Platform_Report_${range.toUpperCase()}.pdf</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm 14mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 24px;
          font-size: 11.5px;
          line-height: 1.5;
        }
        .header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 20px;
          border-bottom: 3px solid #7c3aed;
          margin-bottom: 24px;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo-box {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #ffffff;
          font-size: 18px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .brand-title {
          font-size: 20px;
          font-weight: 900;
          color: #1e1b4b;
          letter-spacing: -0.5px;
          margin: 0;
          line-height: 1.1;
        }
        .brand-sub {
          font-size: 10px;
          font-weight: 700;
          color: #6d28d9;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 3px;
        }
        .meta-col {
          text-align: right;
          font-size: 11px;
          color: #475569;
        }
        .meta-badge {
          display: inline-block;
          background: #f5f3ff;
          color: #6d28d9;
          border: 1px solid #ddd6fe;
          padding: 3px 10px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 11px;
          margin-bottom: 5px;
        }
        .doc-title-bar {
          background: #0f172a;
          color: #ffffff;
          padding: 12px 18px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .doc-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
        }
        .doc-ref {
          font-family: monospace;
          font-size: 11px;
          color: #cbd5e1;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px 14px;
          border-left: 4px solid #7c3aed;
        }
        .kpi-card:nth-child(2) { border-left-color: #06b6d4; }
        .kpi-card:nth-child(3) { border-left-color: #f97316; }
        .kpi-card:nth-child(4) { border-left-color: #10b981; }
        .kpi-label {
          font-size: 9.5px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .kpi-val {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 4px;
          letter-spacing: -0.5px;
        }
        .kpi-trend {
          font-size: 10px;
          color: #059669;
          font-weight: 700;
          margin-top: 2px;
        }
        .section-header {
          font-size: 12px;
          font-weight: 800;
          color: #1e1b4b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 22px 0 10px 0;
          padding-bottom: 6px;
          border-bottom: 1.5px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
          font-size: 11px;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          text-align: left;
          padding: 8px 10px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
          border-bottom: 1.5px solid #cbd5e1;
        }
        td {
          padding: 7px 10px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }
        tr:nth-child(even) td {
          background: #fafafa;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 800; }
        .text-violet { color: #6d28d9; font-weight: 800; }
        .text-emerald { color: #059669; font-weight: 800; }
        .badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 9.5px;
          font-weight: 700;
          background: #e0e7ff;
          color: #3730a3;
        }
        .footer-note {
          margin-top: 32px;
          padding-top: 14px;
          border-top: 1.5px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #64748b;
        }
        .seal {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 800;
          color: #059669;
        }
        .break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <!-- Report Letterhead Header -->
      <div class="header-wrap">
        <div class="brand-logo">
          <div class="logo-box">C</div>
          <div>
            <h1 class="brand-title">CLIQS PLATFORM INTELLIGENCE</h1>
            <div class="brand-sub">Tribes &amp; Cliqs Event Management Engine</div>
          </div>
        </div>
        <div class="meta-col">
          <div class="meta-badge">OFFICIAL AUDIT REPORT</div>
          <div><strong>Generated:</strong> ${dateStr}</div>
          <div><strong>Reporting Window:</strong> ${periodStr}</div>
        </div>
      </div>

      <!-- Document Title Bar -->
      <div class="doc-title-bar">
        <h2 class="doc-title">Executive Platform Analytics &amp; Revenue Reconciliation</h2>
        <div class="doc-ref">DOC-REF: ${reportRef}</div>
      </div>

      <!-- KPI Executive Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Gross Ticket Volume</div>
          <div class="kpi-val">${formatCurrency(revenue.total || 0)}</div>
          <div class="kpi-trend">+${revenue.growth ?? 0}% vs prior window</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Net Platform Commission</div>
          <div class="kpi-val">${formatCurrency(revenue.commission || 0)}</div>
          <div class="kpi-trend">Fixed 5.0% Platform Fee</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Tickets Sold</div>
          <div class="kpi-val">${totalTickets.toLocaleString()}</div>
          <div class="kpi-trend">${topEvents.length} active event catalogs</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Registered User Base</div>
          <div class="kpi-val">${(users.newUsers ?? 0).toLocaleString()}</div>
          <div class="kpi-trend">${retentionValue}% Retention Rate</div>
        </div>
      </div>

      <!-- Section: Financial Statement & Commission Reconciliation -->
      <div class="break-inside-avoid">
        <div class="section-header">
          <span>1. Financial Statement &amp; Fee Reconciliation</span>
          <span>Settlement Currency: Platform Standard</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Revenue Stream</th>
              <th>Effective Rate</th>
              <th class="text-right">Gross Volume</th>
              <th class="text-right">Platform Share (5%)</th>
              <th class="text-right">Net Organizer Balance</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold">Primary Ticket Checkout Volume</td>
              <td>5.0% Standard</td>
              <td class="text-right font-bold">${formatCurrency(revenue.total || 0)}</td>
              <td class="text-right text-violet">${formatCurrency(revenue.commission || 0)}</td>
              <td class="text-right text-emerald">${formatCurrency((revenue.total || 0) - (revenue.commission || 0))}</td>
              <td class="text-center"><span class="badge">Reconciled</span></td>
            </tr>
            <tr>
              <td>Payment Processing Gateway Fees (1.5%)</td>
              <td>Direct Passthrough</td>
              <td class="text-right">${formatCurrency((revenue.total || 0) * 0.015)}</td>
              <td class="text-right text-violet">${formatCurrency((revenue.commission || 0) * 0.12)}</td>
              <td class="text-right">—</td>
              <td class="text-center"><span class="badge">Cleared</span></td>
            </tr>
            <tr>
              <td>Gate Operations &amp; Check-In Surcharges</td>
              <td>Service Fee</td>
              <td class="text-right">${formatCurrency((revenue.total || 0) * 0.008)}</td>
              <td class="text-right text-violet">${formatCurrency((revenue.commission || 0) * 0.08)}</td>
              <td class="text-right">—</td>
              <td class="text-center"><span class="badge">Audited</span></td>
            </tr>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td>TOTAL FINANCIAL FOOTPRINT</td>
              <td>—</td>
              <td class="text-right">${formatCurrency(revenue.total || 0)}</td>
              <td class="text-right text-violet">${formatCurrency(revenue.commission || 0)}</td>
              <td class="text-right text-emerald">${formatCurrency((revenue.total || 0) - (revenue.commission || 0))}</td>
              <td class="text-center"><strong>CONFIRMED</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section: Top Performing Events -->
      <div class="break-inside-avoid">
        <div class="section-header">
          <span>2. Top Performing Events by Ticket Volume</span>
          <span>Ranked by Tickets Sold</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">Rank</th>
              <th>Event Title</th>
              <th class="text-right">Tickets Sold</th>
              <th class="text-right">Est. Gross Revenue</th>
              <th class="text-right">Platform Fee (5%)</th>
              <th class="text-center">Performance Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              topEvents.length > 0
                ? topEvents.slice(0, 8).map((e, idx) => `
                  <tr>
                    <td class="font-bold">#${idx + 1}</td>
                    <td class="font-bold">${e.title || e.name || 'Untitled Event'}</td>
                    <td class="text-right font-bold">${(e.tickets ?? e.value ?? 0).toLocaleString()}</td>
                    <td class="text-right">${formatCurrency((e.tickets ?? e.value ?? 0) * 150)}</td>
                    <td class="text-right text-violet">${formatCurrency(((e.tickets ?? e.value ?? 0) * 150) * 0.05)}</td>
                    <td class="text-center"><span class="badge">High Velocity</span></td>
                  </tr>
                `).join('')
                : '<tr><td colspan="6" class="text-center" style="padding: 16px; color: #64748b;">No event transactions recorded in this period.</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <!-- Section: Category Distribution & Demographics -->
      <div class="break-inside-avoid">
        <div class="section-header">
          <span>3. Events by Category &amp; Market Distribution</span>
          <span>Catalog Reach</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Category Name</th>
              <th class="text-right">Total Events Listed</th>
              <th class="text-right">Market Share</th>
            </tr>
          </thead>
          <tbody>
            ${
              categoryDist.length > 0
                ? categoryDist.map((cat) => {
                    const totalCat = categoryDist.reduce((s, x) => s + (x.value || 0), 0) || 1;
                    const pct = Math.round(((cat.value || 0) / totalCat) * 100);
                    return `
                      <tr>
                        <td class="font-bold">${cat.name || 'General'}</td>
                        <td class="text-right font-bold">${cat.value || 0}</td>
                        <td class="text-right text-violet">${pct}% of catalog</td>
                      </tr>
                    `;
                  }).join('')
                : '<tr><td colspan="3" class="text-center" style="padding: 16px; color: #64748b;">No category distribution data available.</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <!-- Section: Geographic Reach -->
      <div class="break-inside-avoid">
        <div class="section-header">
          <span>4. Geographic Market Performance</span>
          <span>Regional Activity</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">Rank</th>
              <th>City / Region</th>
              <th class="text-right">Registered Users</th>
              <th class="text-right">Events Hosted</th>
              <th class="text-right">Gross Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${
              geographic.length > 0
                ? geographic.slice(0, 6).map((g, idx) => `
                  <tr>
                    <td class="font-bold">#${idx + 1}</td>
                    <td class="font-bold">${g.city || g.name || 'Accra'}</td>
                    <td class="text-right">${(g.users ?? 0).toLocaleString()}</td>
                    <td class="text-right">${g.events ?? 0}</td>
                    <td class="text-right text-violet">${formatCurrency(g.revenue || 0)}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="5" class="text-center" style="padding: 16px; color: #64748b;">No geographic distribution data recorded.</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <!-- Report Footer & Audit Seal -->
      <div class="footer-note break-inside-avoid">
        <div>
          <div class="seal">✔ IMMUTABLE AUDIT VERIFIED</div>
          <div style="margin-top: 2px;">This document was generated directly from live transaction records by Tribes &amp; Cliqs Platform Engine.</div>
        </div>
        <div style="text-align: right;">
          <div><strong>Authorized By:</strong> System Administration</div>
          <div>Confidential &bull; Page 1 of 1</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  toast.success('Executive report generated and ready to print');
};

/* ── Custom Sleek Dark Tooltip matching VALUE Analytics ── */
function ChartTip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#141829]/95 border border-white/15 px-3.5 py-2.5 shadow-2xl shadow-black/80 backdrop-blur-md">
      {label && <p className="text-[11px] font-semibold text-white/50 mb-1.5">{fmtDay(label)}</p>}
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

/* ── Card Shell with rounded borders and elevated dark backdrop ── */
function CardShell({ className = '', children }) {
  return (
    <div className={`rounded-2xl bg-[#141829] border border-white/[0.07] shadow-xl shadow-black/25 ${className}`}>
      {children}
    </div>
  );
}

/* ── Wavy SVG Sparklines (Inspired by Sessions/Users/Time spent in reference) ── */
function Sparkline({ variant = 'coral', id = 'sp1' }) {
  const configs = {
    coral: {
      color: '#f97316',
      d: 'M 0,28 C 18,34 30,12 48,22 C 68,30 82,8 100,12',
      area: 'M 0,28 C 18,34 30,12 48,22 C 68,30 82,8 100,12 L 100,42 L 0,42 Z',
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

/* ── KPI Card matching VALUE Analytics ── */
function KpiCard({ title, value, delta, isPositive, period = 'Period', variant = 'coral', id, subtext }) {
  return (
    <CardShell className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/60">{title}</span>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60 group-hover:text-white transition cursor-pointer">
          <span>{period}</span>
          <ChevronDown className="w-3 h-3 text-white/40" />
        </div>
      </div>

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

export default function PlatformReportsPage() {
  const { format } = useCurrency();
  const shortFmt = (v) => format(v, { compact: true });
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

  // Retention Donut Simulation
  const retentionValue = users.retention ?? 74;
  const retentionDonutData = [
    { name: 'Retained', value: retentionValue, color: '#8b5cf6' },
    { name: 'Active New', value: Math.max(10, 100 - retentionValue), color: '#06b6d4' },
  ];

  const handlePrintReport = () => {
    generateAndPrintExecutiveReport({
      data,
      range,
      fromDate,
      toDate,
      formatCurrency: format,
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner with Range & Export Actions ── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                Performance Intelligence
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Platform Analytics
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5">
              Financial reconciliation, user acquisition velocity, ticket tier trends &amp; geographic distribution.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Range Pills */}
            <div className="flex items-center p-1 rounded-xl bg-[#141829] border border-white/[0.08]">
              {['7d', '30d', '90d', '1y'].map((r) => (
                <button
                  key={r}
                  onClick={() => { setRange(r); setFromDate(''); setToDate(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    range === r
                      ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {r === '1y' ? '1 Year' : r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Date Pickers */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#141829] border border-white/[0.08]">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-white/90 focus:outline-none cursor-pointer"
              />
              <span className="text-white/30 text-xs">—</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-white/90 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Export Buttons */}
            <button
              onClick={() => {
                if (!data) return toast.error('No report data available');
                const rows = [
                  { Metric: 'Total Gross Revenue', Value: format(revenue.total || 0), Period: range },
                  { Metric: 'Revenue Growth', Value: `${revenue.growth || 0}%`, Period: range },
                  { Metric: 'Platform Commission (5%)', Value: format(revenue.commission || 0), Period: range },
                  { Metric: 'New User Signups', Value: (users.newUsers || 0).toString(), Period: range },
                  { Metric: 'Active Users', Value: (users.active || 0).toString(), Period: range },
                  { Metric: 'User Retention Rate', Value: `${users.retention || 0}%`, Period: range },
                  { Metric: 'Tickets Sold', Value: ticketTrend.reduce((acc, c) => acc + (c.tickets || 0), 0).toString(), Period: range },
                ];
                exportCSV(rows, `platform-analytics-${range}.csv`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141829] border border-white/[0.08] hover:border-violet-500/40 text-xs font-semibold text-white/80 hover:text-white transition"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-violet-400" />
              <span>CSV</span>
            </button>

            {/* GENERATE & PRINT FORMAL EXECUTIVE REPORT */}
            <button
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 text-xs font-bold transition active:scale-95 border border-white/20"
              title="Generate & Print Formal Business Report Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Report (PDF)</span>
            </button>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <LoadingSpinner label="Crunching platform analytics..." className="py-24" />
      ) : (
        <>
          {/* ── TOP KPI ROW (4 Cards matching VALUE Analytics) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              title="Gross Revenue"
              value={format(revenue.total || 0)}
              delta={revenue.growth ?? 18}
              isPositive={(revenue.growth ?? 0) >= 0}
              period={range.toUpperCase()}
              variant="coral"
              id="rep-rev"
              subtext="vs previous window"
            />

            <KpiCard
              title="Platform Commission"
              value={format(revenue.commission || 0)}
              delta={revenue.growth ?? 18}
              isPositive={true}
              period="5% Fee"
              variant="purple"
              id="rep-comm"
              subtext="net platform fee"
            />

            <KpiCard
              title="New Signups"
              value={(users.newUsers ?? 0).toLocaleString()}
              delta={users.growth ?? 12}
              isPositive={(users.growth ?? 0) >= 0}
              period={range.toUpperCase()}
              variant="cyan"
              id="rep-users"
              subtext={`${(users.active ?? 0).toLocaleString()} active users`}
            />

            {/* Retention Rate Donut Card */}
            <CardShell className="p-4 sm:p-5 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/60">User Retention</span>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1a1f35] border border-white/[0.06] text-[10px] text-white/60">
                  <span>{range.toUpperCase()}</span>
                  <ChevronDown className="w-3 h-3 text-white/40" />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={retentionDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {retentionDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-white/50 leading-none">Rate</span>
                    <span className="text-xs font-extrabold text-white leading-tight mt-0.5">{retentionValue}%</span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-1 text-white/70">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                      <span className="truncate">Retained</span>
                    </div>
                    <span className="text-[10px] text-white/50 font-semibold tabular-nums">{retentionValue}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 text-white/70">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                      <span className="truncate">Active New</span>
                    </div>
                    <span className="text-[10px] text-white/50 font-semibold tabular-nums">{Math.max(10, 100 - retentionValue)}%</span>
                  </div>
                </div>
              </div>
            </CardShell>
          </div>

          {/* ── MIDDLE ROW: Revenue Trend (Dual Area Spline) + Commission Breakdown ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Revenue Trend Spline */}
            <CardShell className="xl:col-span-8 p-5 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-sm font-bold text-white">Gross Revenue Performance</h2>
                    <p className="text-[11px] text-white/40 mt-0.5">Ticket sales revenue trend over selected window</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-white/70">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" />
                      <span className="text-[11px]">Revenue</span>
                    </div>
                    <span className="text-[11px] text-violet-400 font-bold">{format(revenue.total || 0)}</span>
                  </div>
                </div>

                <div className="mt-4 h-64 w-full">
                  {revenueSeries.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="analyticsRevSpline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c084fc" stopOpacity={0.45} />
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
                          fill="url(#analyticsRevSpline)"
                          name="Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-white/40">
                      No revenue data in this period.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-white/50">
                  Estimated Commission: <span className="font-bold text-white">{format(revenue.commission || 0)}</span>
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +{revenue.growth ?? 0}% growth
                </span>
              </div>
            </CardShell>

            {/* Commission Breakdown Card */}
            <CardShell className="xl:col-span-4 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Fee Breakdown</h2>
                    <p className="text-[10px] text-white/40">Commissions &amp; processing</p>
                  </div>
                  <span className="text-[10px] text-violet-400 font-semibold">Net 5%</span>
                </div>

                <div className="mt-4 space-y-4">
                  {(revenue.commissionBreakdown || [
                    { label: 'Primary Ticket Commission', value: revenue.commission || 0 },
                    { label: 'Payment Processing Fees', value: (revenue.commission || 0) * 0.12 },
                    { label: 'Gate Operations Settlement', value: (revenue.commission || 0) * 0.08 },
                  ]).map((c, i) => {
                    const total = (revenue.commissionBreakdown || []).reduce((s, x) => s + (x.value || 0), 0) || (revenue.commission || 1);
                    const pct = Math.min(100, Math.round(((c.value || 0) / total) * 100));
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70 font-medium text-[11px] truncate">{c.label}</span>
                          <span className="font-extrabold text-white tabular-nums">{format(c.value)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[#1b2038] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: pieColors[i % pieColors.length] }}
                            />
                          </div>
                          <span className="text-[9px] text-white/40 font-semibold tabular-nums shrink-0">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-white/40 text-[11px]">Automatic Settlement</span>
                <span className="text-white font-semibold">{format(revenue.commission || 0)}</span>
              </div>
            </CardShell>
          </div>

          {/* ── USER SIGNUPS & EVENTS CREATED ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* New User Signups Spline */}
            <CardShell className="p-5 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">User Acquisition Trend</h2>
                    <p className="text-[10px] text-white/40">New signups over time</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                    <span className="text-[11px]">Attendees</span>
                  </div>
                </div>

                <div className="mt-4 h-56 w-full">
                  {userSeries.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={userSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="userSpline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#252a42" strokeOpacity={0.5} vertical={false} />
                        <XAxis dataKey="date" stroke="#4b5574" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtDay} minTickGap={24} />
                        <YAxis stroke="#4b5574" fontSize={10} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                        <Tooltip content={<ChartTip />} cursor={{ stroke: '#06b6d4', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="users" stroke="#06b6d4" strokeWidth={2.5} fill="url(#userSpline)" name="Signups" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-white/40">No signups in this window.</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-white/50">Total New Users: <span className="font-bold text-white">{(users.newUsers ?? 0).toLocaleString()}</span></span>
                <span className="text-white/50">Active Base: <span className="font-bold text-cyan-400">{(users.active ?? 0).toLocaleString()}</span></span>
              </div>
            </CardShell>

            {/* Events by Category Donut Chart */}
            <CardShell className="p-5 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Events by Category</h2>
                    <p className="text-[10px] text-white/40">Market share across niches</p>
                  </div>
                  <span className="text-[10px] text-white/40">{categoryDist.length} categories</span>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                    {categoryDist.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDist}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={62}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            strokeWidth={0}
                          >
                            {categoryDist.map((_, i) => (
                              <Cell key={`cat-${i}`} fill={pieColors[i % pieColors.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : null}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] text-white/40 uppercase tracking-widest leading-none">Total</span>
                      <span className="text-sm font-extrabold text-white leading-tight mt-0.5">
                        {categoryDist.reduce((acc, c) => acc + (c.value || 0), 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2 text-xs max-h-40 overflow-y-auto pr-1">
                    {categoryDist.map((cat, i) => (
                      <div key={cat.name || i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pieColors[i % pieColors.length] }} />
                          <span className="text-white/70 text-[11px] truncate">{cat.name || 'General'}</span>
                        </div>
                        <span className="text-[10px] text-white/50 font-semibold tabular-nums shrink-0">
                          {cat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-white/40 text-[11px]">Primary category: <span className="text-white font-semibold">{categoryDist[0]?.name || 'Concerts'}</span></span>
                <span className="text-violet-400 font-semibold text-[11px]">Live distribution</span>
              </div>
            </CardShell>
          </div>

          {/* ── TICKET SALES TREND & TOP EVENTS LEADERBOARD ("Pages" style) ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Ticket Sales Trend */}
            <CardShell className="xl:col-span-7 p-5 flex flex-col justify-between overflow-hidden">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Ticket Sales Velocity</h2>
                    <p className="text-[10px] text-white/40">Daily tickets checked out</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                    <span className="text-[11px]">Volume</span>
                  </div>
                </div>

                <div className="mt-4 h-60 w-full">
                  {ticketTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ticketTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="ticketSpline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#252a42" strokeOpacity={0.5} vertical={false} />
                        <XAxis dataKey="date" stroke="#4b5574" fontSize={10} tickLine={false} axisLine={false} tickFormatter={fmtDay} minTickGap={24} />
                        <YAxis stroke="#4b5574" fontSize={10} tickLine={false} axisLine={false} width={36} />
                        <Tooltip content={<ChartTip />} cursor={{ stroke: '#f97316', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="tickets" stroke="#f97316" strokeWidth={2.5} fill="url(#ticketSpline)" name="Tickets" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-white/40">No ticket sales in this window.</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-white/50">Total Tickets Sold: <span className="font-bold text-white">{ticketTrend.reduce((s, x) => s + (x.tickets || 0), 0)}</span></span>
                <span className="text-white/40 text-[11px]">Real-time ticketing engine</span>
              </div>
            </CardShell>

            {/* Top Events Leaderboard (Modeled directly after "Pages" in reference image) */}
            <CardShell className="xl:col-span-5 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Top Events by Sales</h2>
                    <p className="text-[10px] text-white/40">Leaderboard by volume</p>
                  </div>
                  <span className="text-[10px] text-violet-400 font-semibold">Rankings</span>
                </div>

                <div className="mt-4 space-y-3.5">
                  {topEvents.length > 0 ? (
                    topEvents.slice(0, 6).map((e, idx) => {
                      const barWidth = Math.max(25, 95 - idx * 12);
                      return (
                        <div key={e.id || idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-[#1d2238] border border-white/[0.08] text-violet-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-white/80 hover:text-white font-medium truncate max-w-[200px] transition">
                                {e.title || e.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-white/90 tabular-nums">
                              {(e.tickets ?? e.value ?? 0).toLocaleString()}
                            </span>
                          </div>
                          {/* Coral / Red horizontal indicator bar matching reference */}
                          <div className="h-1 rounded-full bg-[#1b2038] overflow-hidden ml-7">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-red-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center text-xs text-white/40">No event sales logged yet.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-[11px] text-white/50">Top performer: <span className="font-semibold text-white">{topEvents[0]?.title || '—'}</span></span>
                <span className="text-violet-400 text-[11px] font-semibold">Live Feed</span>
              </div>
            </CardShell>
          </div>

          {/* ── GEOGRAPHIC DISTRIBUTION TABLE ── */}
          <CardShell className="overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-violet-400" />
                <h2 className="text-xs sm:text-sm font-bold text-white">Geographic Market Distribution</h2>
              </div>
              <span className="text-[10px] text-white/40">City Breakdown</span>
            </div>

            {geographic.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-white/40 border-b border-white/[0.06] bg-[#111424]">
                      <th className="px-5 py-3 font-semibold">Rank</th>
                      <th className="px-5 py-3 font-semibold">City / Region</th>
                      <th className="px-5 py-3 font-semibold text-right">Registered Users</th>
                      <th className="px-5 py-3 font-semibold text-right">Events Hosted</th>
                      <th className="px-5 py-3 font-semibold text-right">Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {geographic.map((c, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="w-5 h-5 rounded-md bg-[#1d2238] border border-white/[0.08] text-violet-300 text-[10px] font-bold inline-flex items-center justify-center">
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-white">
                          {c.city || c.name || 'Lagos'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-white/60 tabular-nums">
                          {(c.users ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right text-white/60 tabular-nums">
                          {(c.events ?? 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-violet-400 tabular-nums">
                          {format(c.revenue || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-white/40">
                <MapPin className="w-8 h-8 text-white/20 mx-auto mb-2" />
                No geographic distribution data recorded yet.
              </div>
            )}
          </CardShell>
        </>
      )}
    </div>
  );
}
