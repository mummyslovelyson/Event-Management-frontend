import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Eye, Ban, CheckCircle2, Trash2, UserCheck,
  Pencil, XCircle, ShieldCheck, KeyRound, Copy, EyeOff, LayoutGrid,
  Table as TableIcon, Download, LogOut, StickyNote, Clock, Monitor,
  Send, Loader2, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  getUsers, getUser, suspendUser, unsuspendUser, deleteUser, updateUser,
  approveOrganizer, rejectOrganizer, resetUserPassword,
  getUserManagementStats, getUserActivity, getUserSessions, getUserStats,
  forceLogoutUser, addAdminNote, getAdminNotes, deleteAdminNote,
  exportUsersCSV, bulkRoleChange, bulkDeleteUsers,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'attendee', label: 'Attendees' },
  { key: 'organizer', label: 'Organizers' },
  { key: 'suspended', label: 'Suspended' },
];

const roleVariant = (r) => ({ admin: 'danger', organizer: 'gold', attendee: 'info' }[r] || 'neutral');
const isSuspendedUser = (u) => u?.status === 'suspended';
const userStatus = (u) => {
  if (isSuspendedUser(u)) return { label: 'Suspended', variant: 'error' };
  if (u?.role === 'organizer') {
    if (u.is_approved === 1) return { label: 'Active', variant: 'success' };
    if (u.status === 'rejected') return { label: 'Rejected', variant: 'error' };
    return { label: 'Pending', variant: 'pending' };
  }
  return { label: 'Active', variant: 'success' };
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const initials = (name = '') => name.split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
const avatarBg = ['bg-white/10 text-white', 'bg-[#EFEFF1]/10 text-[#EFEFF1]', 'bg-[#494F55]/40 text-[#9AA1A6]', 'bg-white/10 text-[#E8C75E]'];
const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition';
const actionBtn = 'p-2 rounded-lg text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition disabled:opacity-50';

const panelTabs = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'activity', label: 'Activity', icon: Clock },
  { key: 'sessions', label: 'Sessions', icon: Monitor },
  { key: 'notes', label: 'Notes', icon: StickyNote },
];

export default function UserManagementPage() {
  const [tab, setTab] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('cards');
  const [selected, setSelected] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, active: 0, suspended: 0, pendingOrganizers: 0 });
  const [actionLoading, setActionLoading] = useState(null);

  const [editTarget, setEditTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [revealHash, setRevealHash] = useState(false);

  const [panelUser, setPanelUser] = useState(null);
  const [panelTab, setPanelTab] = useState('overview');
  const [panelDetail, setPanelDetail] = useState(null);
  const [panelStats, setPanelStats] = useState(null);
  const [panelActivity, setPanelActivity] = useState([]);
  const [panelSessions, setPanelSessions] = useState([]);
  const [panelNotes, setPanelNotes] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!editTarget) return;
    reset({ name: editTarget.name || '', email: editTarget.email || '', phone: editTarget.phone || '', role: editTarget.role === 'organizer' ? 'organizer' : 'attendee' });
  }, [editTarget, reset]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getUserManagementStats();
      setStats(res.data.stats || {});
    } catch { /* stats optional */ }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12, sort };
      if (tab === 'suspended') params.status = 'suspended';
      else if (tab !== 'all') params.role = tab;
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (roleFilter) params.role = roleFilter;
      const res = await getUsers(params);
      const d = res.data;
      setUsers(Array.isArray(d) ? d : d.users || d.data || []);
      setTotalPages(d.pagination?.totalPages || 1);
      setTotal(d.pagination?.total ?? 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally { setLoading(false); }
  }, [tab, page, search, statusFilter, roleFilter, sort]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [tab, search, statusFilter, roleFilter, sort]);

  const toggleSelect = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelected((prev) => prev.size === users.length ? new Set() : new Set(users.map((u) => u.id)));

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(suspendTarget.id);
    try {
      if (isSuspendedUser(suspendTarget)) { await unsuspendUser(suspendTarget.id); toast.success('User unsuspended'); }
      else { await suspendUser(suspendTarget.id, { reason: suspendTarget.reason || 'Violation of platform policy' }); toast.success('User suspended'); }
      setSuspendTarget(null); fetchUsers(); refreshPanel();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try { await deleteUser(deleteTarget.id); toast.success('User deleted'); setDeleteTarget(null); if (panelUser?.id === deleteTarget.id) setPanelUser(null); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to delete user'); }
    finally { setActionLoading(null); }
  };

  const handleVerify = async (u) => {
    setActionLoading(`verify-${u.id}`);
    try { await approveOrganizer(u.id); toast.success('Organizer approved'); fetchUsers(); refreshPanel(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try { await rejectOrganizer(rejectTarget.id, { reason: rejectTarget.reason || 'Application did not meet requirements.' }); toast.success('Rejected'); setRejectTarget(null); fetchUsers(); refreshPanel(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
    finally { setActionLoading(null); }
  };

  const handleEdit = async (data) => {
    if (!editTarget) return;
    setActionLoading(editTarget.id);
    try { await updateUser(editTarget.id, data); toast.success('User updated'); setEditTarget(null); fetchUsers(); refreshPanel(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to update user'); }
    finally { setActionLoading(null); }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setActionLoading(`reset-${resetTarget.id}`);
    try {
      const body = resetTarget.password ? { password: resetTarget.password } : {};
      const res = await resetUserPassword(resetTarget.id, body);
      setResetResult(res.data || {}); toast.success(res.data?.message || 'Password reset'); fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reset password'); }
    finally { setActionLoading(null); }
  };

  const handleForceLogout = async (userId) => {
    setActionLoading(`logout-${userId}`);
    try { await forceLogoutUser(userId); toast.success('All sessions revoked'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleBulkRoleChange = async (role) => {
    if (selected.size === 0) return;
    setActionLoading('bulk');
    try { await bulkRoleChange({ ids: [...selected], role }); toast.success(`${selected.size} users changed to ${role}`); setSelected(new Set()); fetchUsers(); }
    catch (err) { toast.error('Bulk action failed'); }
    finally { setActionLoading(null); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setActionLoading('bulk');
    try { await bulkDeleteUsers({ ids: [...selected] }); toast.success(`${selected.size} users deleted`); setSelected(new Set()); fetchUsers(); }
    catch (err) { toast.error('Bulk delete failed'); }
    finally { setActionLoading(null); }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (tab !== 'all') params.role = tab;
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await exportUsersCSV(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'users-export.csv'; a.click();
      window.URL.revokeObjectURL(url); toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  const copyToClipboard = async (text) => { try { await navigator.clipboard.writeText(text); toast.success('Copied'); } catch { toast.error('Could not copy'); } };
  const fillRandomPassword = () => { const c = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = ''; for (let i = 0; i < 14; i++) o += c[Math.floor(Math.random() * c.length)]; setResetTarget((p) => ({ ...p, password: o })); };
  const openReset = (u) => { setResetTarget(u); setResetResult(null); setRevealHash(false); };

  const openPanel = async (u) => {
    setPanelUser(u); setPanelTab('overview'); setPanelDetail(null); setPanelStats(null); setPanelActivity([]); setPanelSessions([]); setPanelNotes([]);
    setPanelLoading(true);
    try {
      const [detailRes, statsRes] = await Promise.all([getUser(u.id), getUserStats(u.id)]);
      setPanelDetail(detailRes.data.user || detailRes.data);
      setPanelStats(statsRes.data.stats || {});
    } catch { toast.error('Failed to load user details'); }
    finally { setPanelLoading(false); }
  };

  const refreshPanel = async () => {
    if (!panelUser) return;
    try {
      const [detailRes, statsRes] = await Promise.all([getUser(panelUser.id), getUserStats(panelUser.id)]);
      setPanelDetail(detailRes.data.user || detailRes.data);
      setPanelStats(statsRes.data.stats || {});
    } catch { /* silent */ }
  };

  const loadPanelTab = async (key) => {
    setPanelTab(key);
    if (key === 'activity' && panelActivity.length === 0) {
      try { const res = await getUserActivity(panelUser.id); setPanelActivity(res.data.activities || []); } catch { /* */ }
    }
    if (key === 'sessions' && panelSessions.length === 0) {
      try { const res = await getUserSessions(panelUser.id); setPanelSessions(res.data.sessions || []); } catch { /* */ }
    }
    if (key === 'notes' && panelNotes.length === 0) {
      try { const res = await getAdminNotes(panelUser.id); setPanelNotes(res.data.notes || []); } catch { /* */ }
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteLoading(true);
    try { await addAdminNote(panelUser.id, { note: noteText }); setNoteText(''); toast.success('Note added'); const res = await getAdminNotes(panelUser.id); setPanelNotes(res.data.notes || []); }
    catch { toast.error('Failed to add note'); }
    finally { setNoteLoading(false); }
  };

  const handleDeleteNote = async (noteId) => {
    try { await deleteAdminNote(noteId); setPanelNotes((p) => p.filter((n) => n.id !== noteId)); toast.success('Note deleted'); }
    catch { toast.error('Failed to delete note'); }
  };

  const d = panelDetail;
  const pStats = panelStats;
  const hasSelectedSuspended = [...selected].some((id) => users.find((u) => u.id === id)?.status === 'suspended');
  const selectedNonAdmins = [...selected].some((id) => users.find((u) => u.id === id)?.role !== 'admin');

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} accent="sky" title="Users" subtitle="Manage accounts, approvals, suspensions, and activity." count={total}
        actions={<button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-sm text-[#EFEFF1] hover:border-white/40 transition"><Download className="w-4 h-4" /> Export CSV</button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total?.toLocaleString() || '0'} />
        <StatCard icon={UserCheck} label="Active" value={stats.active?.toLocaleString() || '0'} accent />
        <StatCard icon={Ban} label="Suspended" value={stats.suspended?.toLocaleString() || '0'} />
        <StatCard icon={Clock} label="Pending Organizers" value={stats.pendingOrganizers?.toLocaleString() || '0'} />
      </div>

      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, organization..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition">
            <option value="">All Roles</option><option value="attendee">Attendee</option><option value="organizer">Organizer</option><option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition">
            <option value="">All Status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="pending">Pending</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition">
            <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name A-Z</option>
          </select>
          <div className="flex rounded-lg border border-[#494F55]/40 overflow-hidden">
            <button onClick={() => setViewMode('cards')} className={`p-2.5 transition ${viewMode === 'cards' ? 'bg-white text-[#1C232B]' : 'bg-[#1C232B] text-[#949599] hover:text-[#EFEFF1]'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('table')} className={`p-2.5 transition ${viewMode === 'table' ? 'bg-white text-[#1C232B]' : 'bg-[#1C232B] text-[#949599] hover:text-[#EFEFF1]'}`}><TableIcon className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'}`}>{t.label}</button>
          ))}
        </div>

        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#494F55]/20">
            <span className="text-sm font-medium text-white mr-1">{selected.size} selected</span>
            {selectedNonAdmins && <>
              <button onClick={() => handleBulkRoleChange('attendee')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-500/25 transition"><UserCheck className="w-3.5 h-3.5" /> Set Attendee</button>
              <button onClick={() => handleBulkRoleChange('organizer')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white/10 text-white border border-white/20 text-xs font-semibold hover:bg-white/20 transition"><ShieldCheck className="w-3.5 h-3.5" /> Set Organizer</button>
              <button onClick={bulkSuspend} disabled={actionLoading === 'bulk'} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition disabled:opacity-50"><Ban className="w-3.5 h-3.5" /> Suspend</button>
            </>}
            {hasSelectedSuspended && <button onClick={bulkUnsuspend} disabled={actionLoading === 'bulk'} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition disabled:opacity-50"><UserCheck className="w-3.5 h-3.5" /> Unsuspend</button>}
            {selectedNonAdmins && <button onClick={handleBulkDelete} disabled={actionLoading === 'bulk'} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
            <button onClick={() => setSelected(new Set())} className="text-xs text-[#949599] hover:text-[#EFEFF1] ml-auto"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]"><LoadingSpinner label="Loading users..." className="py-16" /></div>
      ) : users.length === 0 ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]"><EmptyState icon={Users} title="No users found" description="Try adjusting your filters." className="py-16" /></div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((u, i) => {
            const uInit = initials(u.name || u.email);
            const isAdmin = u.role === 'admin';
            const isPendingOrg = u.role === 'organizer' && u.is_approved !== 1 && u.status !== 'rejected';
            return (
              <motion.div key={u.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => openPanel(u)}
                className={`group relative rounded-xl bg-[#171A1D] border p-5 transition-all cursor-pointer hover:border-white/30 hover:shadow-lg hover:shadow-black/20 ${selected.has(u.id) ? 'border-white/40 bg-white/5' : 'border-[#262B2F]'}`}>
                <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]" />
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                  {!isAdmin && <button onClick={() => setEditTarget(u)} className={actionBtn} title="Edit"><Pencil className="w-3.5 h-3.5" /></button>}
                  {!isAdmin && <button onClick={() => setSuspendTarget(u)} className={`${actionBtn} ${isSuspendedUser(u) ? 'text-emerald-400' : 'text-amber-400'}`} title={isSuspendedUser(u) ? 'Unsuspend' : 'Suspend'}><Ban className="w-3.5 h-3.5" /></button>}
                  {!isAdmin && <button onClick={() => setDeleteTarget(u)} className={`${actionBtn} text-red-400`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
                <div className="flex items-center gap-3.5 mt-5">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarBg[i % avatarBg.length]}`}>{uInit}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#EFEFF1] truncate flex items-center gap-1.5">{u.name || 'Unknown'}{isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-white shrink-0" />}</p>
                    <p className="text-xs text-[#949599] truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={roleVariant(u.role)} size="sm">{u.role}</Badge>
                  <Badge variant={userStatus(u).variant} size="sm" dot>{userStatus(u).label}</Badge>
                  {isPendingOrg && <div className="ml-auto flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleVerify(u)} className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/15 transition" title="Approve"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setRejectTarget(u)} className="p-1.5 rounded-md text-red-400 hover:bg-red-500/15 transition" title="Reject"><XCircle className="w-3.5 h-3.5" /></button>
                  </div>}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#262B2F]/70">
                  <div className="text-center"><p className="text-sm font-semibold text-[#EFEFF1] tabular-nums">{u.eventsCount ?? 0}</p><p className="text-[10px] text-[#949599] uppercase tracking-wider">Events</p></div>
                  <div className="text-center"><p className="text-sm font-semibold text-[#EFEFF1] tabular-nums">{u.ticketsCount ?? 0}</p><p className="text-[10px] text-[#949599] uppercase tracking-wider">Tickets</p></div>
                  <div className="text-center"><p className="text-[11px] text-[#949599] mt-0.5">{fmtDate(u.createdAt)}</p><p className="text-[10px] text-[#949599] uppercase tracking-wider">Joined</p></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                <th className="hidden md:table-cell px-4 py-3 w-10"><input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]" /></th>
                <th className="px-4 py-3">User</th><th className="hidden md:table-cell px-4 py-3">Role</th><th className="px-4 py-3">Status</th>
                <th className="hidden md:table-cell px-4 py-3 text-center">Events</th><th className="hidden md:table-cell px-4 py-3 text-center">Tickets</th>
                <th className="hidden md:table-cell px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-[#262B2F]/70">
                {users.map((u, i) => {
                  const uInit = initials(u.name || u.email);
                  const isAdmin = u.role === 'admin';
                  const isPendingOrg = u.role === 'organizer' && u.is_approved !== 1 && u.status !== 'rejected';
                  return (
                    <tr key={u.id} className={`hover:bg-[#1D2124] transition-colors ${selected.has(u.id) ? 'bg-white/5' : ''}`}>
                      <td className="hidden md:table-cell px-4 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => openPanel(u)}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarBg[i % avatarBg.length]}`}>{uInit}</div>
                          <div className="min-w-0"><p className="font-medium text-[#EFEFF1] truncate max-w-[160px] flex items-center gap-1.5">{u.name || 'Unknown'}{isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-white" />}</p><p className="text-xs text-[#949599] truncate max-w-[180px]">{u.email}</p></div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3"><Badge variant={roleVariant(u.role)} size="sm">{u.role}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={userStatus(u).variant} size="sm" dot>{userStatus(u).label}</Badge></td>
                      <td className="hidden md:table-cell px-4 py-3 text-center text-[#949599]">{u.eventsCount ?? 0}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-center text-[#949599]">{u.ticketsCount ?? 0}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-[#949599]">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openPanel(u)} className={actionBtn} title="View"><Eye className="w-4 h-4" /></button>
                          {!isAdmin && <button onClick={() => setEditTarget(u)} className={actionBtn} title="Edit"><Pencil className="w-4 h-4" /></button>}
                          {isPendingOrg && <button onClick={() => handleVerify(u)} className={`${actionBtn} text-emerald-400`} title="Approve"><CheckCircle2 className="w-4 h-4" /></button>}
                          {!isAdmin && <button onClick={() => setSuspendTarget(u)} className={`${actionBtn} text-amber-400`} title="Suspend"><Ban className="w-4 h-4" /></button>}
                          {!isAdmin && <button onClick={() => setDeleteTarget(u)} className={`${actionBtn} text-red-400`} title="Delete"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
            <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal open={!!panelUser} onClose={() => setPanelUser(null)} size="xl" hideClose
        title={d ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center text-base font-bold">{initials(d.name)}</div>
            <div>
              <p className="text-base font-semibold text-[#EFEFF1] flex items-center gap-2">{d.name}{d.role === 'admin' && <ShieldCheck className="w-4 h-4 text-white" />}</p>
              <p className="text-sm text-[#949599]">{d.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={roleVariant(d.role)} size="sm">{d.role}</Badge>
                <Badge variant={userStatus(d).variant} size="sm" dot>{userStatus(d).label}</Badge>
              </div>
            </div>
          </div>
        ) : undefined}>
        {panelLoading && !d ? (
          <div className="flex items-center justify-center py-16"><LoadingSpinner label="Loading..." /></div>
        ) : d ? (
          <div className="space-y-5">
            {d.role !== 'admin' && (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => { setPanelUser(null); setEditTarget(d); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs font-medium text-[#EFEFF1] hover:border-white/40 transition"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => { setPanelUser(null); openReset(d); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs font-medium text-[#EFEFF1] hover:border-white/40 transition"><KeyRound className="w-3.5 h-3.5" /> Reset Password</button>
                <button onClick={() => handleForceLogout(d.id)} disabled={actionLoading === `logout-${d.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs font-medium text-[#EFEFF1] hover:border-white/40 transition disabled:opacity-50"><LogOut className="w-3.5 h-3.5" /> Force Logout</button>
                {isSuspendedUser(d) ? (
                  <button onClick={() => { setPanelUser(null); setSuspendTarget(d); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition"><UserCheck className="w-3.5 h-3.5" /> Unsuspend</button>
                ) : (
                  <button onClick={() => { setPanelUser(null); setSuspendTarget(d); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition"><Ban className="w-3.5 h-3.5" /> Suspend</button>
                )}
                <button onClick={() => { setPanelUser(null); setDeleteTarget(d); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
            )}
            {d.isSuspended && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Suspended</p>
                <p className="text-sm text-[#EFEFF1] mt-0.5">{d.suspendReason || 'No reason'}</p>
                {d.suspendedAt && <p className="text-xs text-[#949599] mt-1">{fmtDateTime(d.suspendedAt)}</p>}
              </div>
            )}
            <div className="flex gap-1 border-b border-[#262B2F] -mx-5 px-5">
              {panelTabs.map((pt) => (
                <button key={pt.key} onClick={() => loadPanelTab(pt.key)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition ${panelTab === pt.key ? 'border-white text-[#EFEFF1]' : 'border-transparent text-[#949599] hover:text-[#EFEFF1]'}`}>
                  <pt.icon className="w-3.5 h-3.5" />{pt.label}
                </button>
              ))}
            </div>
            <div className="min-h-[200px]">
              {panelTab === 'overview' && (
                <div className="space-y-4">
                  {pStats && (
                    <div className="grid grid-cols-3 gap-3">
                      {[{ l: 'Orders', v: pStats.orders }, { l: 'Revenue', v: `₵${(pStats.revenue || 0).toLocaleString()}` }, { l: 'Events', v: pStats.events }, { l: 'Tickets', v: pStats.tickets }, { l: 'Reviews', v: pStats.reviews }, { l: 'Sessions', v: pStats.activeSessions }].map((s) => (
                        <div key={s.l} className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3 text-center">
                          <p className="text-lg font-semibold text-[#EFEFF1] tabular-nums">{s.v}</p>
                          <p className="text-[10px] text-[#949599] uppercase tracking-wider mt-0.5">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {[{ l: 'Phone', v: d.phone || '—' }, { l: 'Location', v: d.location || '—' }, { l: 'Joined', v: fmtDate(d.created_at || d.createdAt) }, { l: 'Last Active', v: d.last_login_at ? fmtDateTime(d.last_login_at) : '—' }, { l: 'Email Verified', v: d.email_verified ? 'Yes' : 'No' }, { l: 'DOB', v: d.date_of_birth ? fmtDate(d.date_of_birth) : '—' }].map((f) => (
                      <div key={f.l} className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3"><p className="text-xs text-[#949599]">{f.l}</p><p className="mt-1 text-sm font-medium text-[#EFEFF1]">{f.v}</p></div>
                    ))}
                  </div>
                  {d.organization?.name && (
                    <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1">Organization</p>
                      <p className="text-sm text-[#EFEFF1]">{d.organization.name}</p>
                      {d.organization.description && <p className="text-xs text-[#949599] mt-1">{d.organization.description}</p>}
                    </div>
                  )}
                  {d.passwordHash && (
                    <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Password Hash</p>
                        <button onClick={() => setRevealHash((v) => !v)} className="text-xs text-[#949599] hover:text-[#EFEFF1] transition flex items-center gap-1">{revealHash ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{revealHash ? 'Hide' : 'View'}</button>
                      </div>
                      {revealHash && <div className="flex items-center gap-2"><code className="flex-1 break-all rounded bg-[#171A1D] border border-[#494F55]/30 px-3 py-2 text-[11px] text-[#9AA1A6] font-mono">{d.passwordHash}</code><button onClick={() => copyToClipboard(d.passwordHash)} className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"><Copy className="w-3.5 h-3.5" /></button></div>}
                    </div>
                  )}
                </div>
              )}
              {panelTab === 'activity' && (
                <div className="space-y-3">
                  {panelActivity.length === 0 ? <p className="text-sm text-[#949599] text-center py-8">No activity recorded yet.</p> : panelActivity.map((a, i) => (
                    <div key={a.id || i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#494F55] mt-2 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-[#EFEFF1]">{a.action?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-[#949599] mt-0.5">{fmtDateTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {panelTab === 'sessions' && (
                <div className="space-y-3">
                  {panelSessions.length === 0 ? <p className="text-sm text-[#949599] text-center py-8">No active sessions.</p> : panelSessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3">
                      <Monitor className="w-4 h-4 text-[#494F55] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#EFEFF1] truncate">{s.user_agent || 'Unknown device'}</p>
                        <p className="text-[11px] text-[#949599] mt-0.5">IP: {s.ip_address || '—'} · {fmtDateTime(s.last_active || s.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {panelTab === 'notes' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add an internal note..." onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition" />
                    <button onClick={handleAddNote} disabled={noteLoading || !noteText.trim()} className="px-3 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50"><Send className="w-4 h-4" /></button>
                  </div>
                  {panelNotes.length === 0 ? <p className="text-sm text-[#949599] text-center py-8">No notes yet.</p> : panelNotes.map((n) => (
                    <div key={n.id} className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-[#EFEFF1] flex-1">{n.note}</p>
                        <button onClick={() => handleDeleteNote(n.id)} className="shrink-0 p-1 rounded text-[#949599] hover:text-red-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <p className="text-[11px] text-[#949599] mt-2">by {n.admin_name || 'Admin'} · {fmtDateTime(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : <p className="text-sm text-[#949599] text-center py-8">User not found</p>}
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit — ${editTarget?.name || ''}`}
        footer={<><button onClick={() => setEditTarget(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
          <button onClick={handleSubmit(handleEdit)} disabled={actionLoading === editTarget?.id} className="px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50">{actionLoading === editTarget?.id ? 'Saving...' : 'Save'}</button></>}>
        <form className="space-y-4">
          <div><label className="block text-xs font-medium text-[#949599] mb-1.5">Name</label><input {...register('name', { required: 'Required' })} className={inputCls} />{errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}</div>
          <div><label className="block text-xs font-medium text-[#949599] mb-1.5">Email</label><input type="email" {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid' } })} className={inputCls} />{errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-[#949599] mb-1.5">Phone</label><input {...register('phone')} className={inputCls} /></div>
            <div><label className="block text-xs font-medium text-[#949599] mb-1.5">Role</label><select {...register('role')} className={inputCls}><option value="attendee">Attendee</option><option value="organizer">Organizer</option></select></div>
          </div>
        </form>
      </Modal>

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Organizer"
        footer={<><button onClick={() => setRejectTarget(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
          <button onClick={handleReject} disabled={actionLoading === rejectTarget?.id} className="px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50">Reject</button></>}>
        <p className="text-sm text-[#949599]">Reject <span className="font-semibold text-[#EFEFF1]">{rejectTarget?.name}</span>'s application?</p>
        <textarea placeholder="Reason (optional)..." onChange={(e) => setRejectTarget({ ...rejectTarget, reason: e.target.value })} className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none" rows={3} />
      </Modal>

      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title={isSuspendedUser(suspendTarget) ? 'Unsuspend User' : 'Suspend User'}
        footer={<><button onClick={() => setSuspendTarget(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
          <button onClick={handleSuspend} disabled={actionLoading === suspendTarget?.id} className="px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50">{isSuspendedUser(suspendTarget) ? 'Unsuspend' : 'Suspend'}</button></>}>
        <p className="text-sm text-[#949599]">{isSuspendedUser(suspendTarget) ? `Unsuspend ${suspendTarget?.name}?` : `Suspend ${suspendTarget?.name}?`}</p>
        {!isSuspendedUser(suspendTarget) && <textarea placeholder="Reason (optional)..." onChange={(e) => setSuspendTarget({ ...suspendTarget, reason: e.target.value })} className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none" rows={3} />}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User"
        footer={<><button onClick={() => setDeleteTarget(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
          <button onClick={handleDelete} disabled={actionLoading === deleteTarget?.id} className="px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50">Delete</button></>}>
        <p className="text-sm text-[#EFEFF1]">Permanently delete <span className="font-semibold">{deleteTarget?.name}</span>?</p>
        <p className="text-xs text-[#949599] mt-1">This cannot be undone. All data will be removed.</p>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => { setResetTarget(null); setResetResult(null); }} title={`Reset Password — ${resetTarget?.name || ''}`}
        footer={resetResult ? <button onClick={() => { setResetTarget(null); setResetResult(null); }} className="px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition">Done</button> :
          <><button onClick={() => { setResetTarget(null); setResetResult(null); }} className="px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button onClick={handleResetPassword} disabled={actionLoading === `reset-${resetTarget?.id}`} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50">
              {actionLoading === `reset-${resetTarget?.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}{resetTarget?.password ? 'Set Password' : 'Generate'}</button></>}>
        {resetResult ? (
          <div className="space-y-3"><p className="text-sm text-[#EFEFF1]">{resetResult.message}</p>
            {resetResult.temporaryPassword && <div className="rounded-xl bg-white/10 border border-white/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white mb-2">Temporary Password</p>
              <div className="flex items-center gap-2"><code className="flex-1 break-all rounded-lg bg-[#171A1D] border border-[#494F55]/30 px-3 py-2.5 text-sm text-[#EFEFF1] font-mono">{resetResult.temporaryPassword}</code>
                <button onClick={() => copyToClipboard(resetResult.temporaryPassword)} className="p-2.5 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"><Copy className="w-4 h-4" /></button></div>
              <p className="mt-2 text-xs text-[#949599]">Share once — it won't be shown again.</p></div>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#949599]">Reset <span className="font-semibold text-[#EFEFF1]">{resetTarget?.name}</span>'s password. Leave empty to auto-generate.</p>
            <div className="flex gap-2"><input type="text" value={resetTarget?.password || ''} onChange={(e) => setResetTarget({ ...resetTarget, password: e.target.value })} placeholder="Auto-generate" className="flex-1 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition" />
              <button onClick={fillRandomPassword} className="px-3 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs text-[#949599] hover:text-[#EFEFF1] hover:border-white/40 transition whitespace-nowrap">Random</button></div>
            <p className="text-xs text-[#494F55]">Min 10 chars with uppercase, lowercase, numbers, and a special character.</p>
          </div>
        )}
      </Modal>
    </div>
  );

  function bulkSuspend() { if (selected.size === 0) return; setActionLoading('bulk'); Promise.all([...selected].filter((id) => !users.find((u) => u.id === id)?.status?.includes('suspended')).map((id) => suspendUser(id, { reason: 'Bulk action' }))).then(() => { toast.success(`${selected.size} users suspended`); setSelected(new Set()); fetchUsers(); }).catch(() => toast.error('Bulk action failed')).finally(() => setActionLoading(null)); }
  function bulkUnsuspend() { const t = [...selected].filter((id) => users.find((u) => u.id === id)?.status === 'suspended'); if (!t.length) return; setActionLoading('bulk'); Promise.all(t.map((id) => unsuspendUser(id))).then(() => { toast.success(`${t.length} unsuspended`); setSelected(new Set()); fetchUsers(); }).catch(() => toast.error('Failed')).finally(() => setActionLoading(null)); }
}
