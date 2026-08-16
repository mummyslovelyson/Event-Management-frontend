import { useState, useEffect, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText, Search, Download, ChevronDown, Filter,
  Plus, Pencil, Trash2, LogIn, Ban, User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuditLogs } from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const actionConfig = {
  CREATE: { color: 'success', icon: Plus, badge: 'success' },
  UPDATE: { color: 'info', icon: Pencil, badge: 'info' },
  DELETE: { color: 'error', icon: Trash2, badge: 'error' },
  LOGIN: { color: 'neutral', icon: LogIn, badge: 'neutral' },
  SUSPEND: { color: 'warning', icon: Ban, badge: 'warning' },
};

const getActionConfig = (a) => actionConfig[(a || '').toUpperCase()] || { color: 'neutral', icon: ScrollText, badge: 'neutral' };

const roleVariant = (r) => ({ admin: 'danger', organizer: 'gold', attendee: 'info' }[r] || 'neutral');

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—');

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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (userFilter) params.user = userFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await getAuditLogs(params);
      const d = res.data;
      setLogs(Array.isArray(d) ? d : d.logs || d.data || []);
      setTotalPages(d.totalPages || d.pages || 1);
      setTotal(d.total || d.count || (Array.isArray(d) ? d.length : 0));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, entityFilter, userFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, userFilter, fromDate, toDate]);

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        accent="slate"
        title="Audit Logs"
        subtitle="Who did what, and when — newest first."
        count={total}
        actions={
          <button
            onClick={() => exportCSV(logs, 'audit-logs.csv')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#262B2F] text-sm font-medium text-[#EDF0F1] hover:bg-[#2A2F33] transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
            />
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] focus:outline-none focus:border-[#D4AF37]/60 transition">
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="SUSPEND">Suspend</option>
          </select>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] focus:outline-none focus:border-[#D4AF37]/60 transition">
            <option value="">All Entities</option>
            <option value="user">User</option>
            <option value="event">Event</option>
            <option value="payment">Payment</option>
            <option value="category">Category</option>
            <option value="content">Content</option>
            <option value="settings">Settings</option>
          </select>
          <input type="text" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="User..." className="px-4 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition" />
          <div className="flex items-center gap-2">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-xs text-[#F2F4F5] focus:outline-none focus:border-[#D4AF37]/60 transition" />
            <span className="text-[#494F55]">—</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-xs text-[#F2F4F5] focus:outline-none focus:border-[#D4AF37]/60 transition" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading logs..." className="py-16" />
        ) : logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit logs found" description="Try adjusting your filters." className="py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                  <th className="px-4 py-3.5 font-medium w-8"></th>
                  <th className="px-4 py-3.5 font-medium">Timestamp</th>
                  <th className="px-4 py-3.5 font-medium">User</th>
                  <th className="px-4 py-3.5 font-medium">Action</th>
                  <th className="px-4 py-3.5 font-medium">Entity</th>
                  <th className="px-4 py-3.5 font-medium">Entity ID</th>
                  <th className="px-4 py-3.5 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B2F]/70">
                {logs.map((log) => {
                  const cfg = getActionConfig(log.action);
                  const ActionIcon = cfg.icon;
                  const isExpanded = expanded.has(log.id);
                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className="hover:bg-[#1D2124] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <ChevronDown className={`w-4 h-4 text-[#7D8387] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7D8387] whitespace-nowrap">{fmtDateTime(log.timestamp || log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#F2F4F5] max-w-[140px] truncate">{log.user?.name || log.userName || 'System'}</span>
                            {log.user?.role && <Badge variant={roleVariant(log.user.role)} size="sm">{log.user.role}</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={cfg.badge} size="sm"><ActionIcon className="w-3 h-3" /> {log.action}</Badge>
                        </td>
                        <td className="px-4 py-3 text-[#7D8387] capitalize">{log.entityType || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#7D8387]">{log.entityId ? `#${log.entityId.slice(-8)}` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#7D8387]">{log.ip || log.ipAddress || '—'}</td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <tr key={`${log.id}-detail`}>
                            <td colSpan={7} className="px-4 py-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="py-4 px-2">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7D8387] mb-2">Details</p>
                                  <div className="rounded-lg bg-[#111417] border border-[#262B2F] p-4 overflow-x-auto">
                                    <pre className="text-xs text-[#F2F4F5] font-mono whitespace-pre-wrap break-words">
                                      {JSON.stringify(log.details || log.metadata || log, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && logs.length > 0 && (
          <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
            <span className="text-xs text-[#7D8387]">Page {page} of {totalPages} · {total} total entries</span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
