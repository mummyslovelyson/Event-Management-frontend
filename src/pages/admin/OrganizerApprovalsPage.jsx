import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, Search, Eye, Ban, CheckCircle2, Trash2, UserCheck,
  Pencil, XCircle, ShieldCheck, KeyRound, Copy, LayoutGrid,
  Table as TableIcon, Download, LogOut, StickyNote, Clock, Monitor,
  Send, Loader2, X, FileText, Globe, MapPin, AlertTriangle, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getUsers, getUser, suspendUser, unsuspendUser, deleteUser, updateUser,
  approveOrganizer, rejectOrganizer, resetUserPassword,
  getUserActivity, getUserSessions, getUserStats,
  forceLogoutUser, addAdminNote, getAdminNotes, deleteAdminNote,
  exportUsersCSV, bulkDeleteUsers,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import StatCard from '@/components/common/StatCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'all', label: 'All Organizers' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved & Active' },
  { key: 'suspended', label: 'Suspended' },
];

const CATEGORIES = [
  'All Categories',
  'Music & Concerts',
  'Business & Networking',
  'Tech & Innovation',
  'Entertainment & Parties',
  'Sports & Fitness',
  'Arts & Culture',
  'Food & Drink',
  'Community & Charity',
  'Education & Workshops',
  'Other',
];

const isSuspendedUser = (u) => u?.status === 'suspended';

const getOrganizerStatus = (u) => {
  if (isSuspendedUser(u)) return { label: 'Suspended', variant: 'error' };
  const isApproved = u?.is_approved === true || u?.is_approved === 1 || u?.is_approved === 'true' || (u?.status === 'active' && u?.is_approved !== false && u?.is_approved !== 0);
  if (isApproved) return { label: 'Approved', variant: 'success' };
  if (u?.status === 'rejected') return { label: 'Rejected', variant: 'error' };
  return { label: 'Pending Approval', variant: 'pending' };
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const initials = (name = '') => name.split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'OR';
const avatarBg = ['bg-white/10 text-white', 'bg-[#EFEFF1]/10 text-[#EFEFF1]', 'bg-[#494F55]/40 text-[#9AA1A6]', 'bg-white/10 text-[#E8C75E]'];
const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition';
const actionBtn = 'p-2 rounded-lg text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition disabled:opacity-50';

const panelTabs = [
  { key: 'overview', label: 'Overview', icon: Eye },
  { key: 'dossier', label: 'KYC Dossier', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Clock },
  { key: 'sessions', label: 'Sessions', icon: Monitor },
  { key: 'notes', label: 'Notes', icon: StickyNote },
];

export default function OrganizerApprovalsPage() {
  const [tab, setTab] = useState('pending');
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('cards');
  const [selected, setSelected] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [actionLoading, setActionLoading] = useState(null);

  // Edit target and form
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    organization_name: '',
    email: '',
    phone: '',
    category: '',
    city: '',
    website: '',
    description: '',
    is_approved: true,
  });

  // Action modals
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [resetResult, setResetResult] = useState(null);

  // Slide-out detail drawer
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

  // Sync edit form on target change
  useEffect(() => {
    if (!editTarget) return;
    setEditForm({
      name: editTarget.name || '',
      organization_name: editTarget.organizationName || editTarget.organization_name || editTarget.organization?.name || '',
      email: editTarget.email || '',
      phone: editTarget.phone || '',
      category: editTarget.category || editTarget.organization?.category || editTarget.org_category || 'Music & Concerts',
      city: editTarget.city || editTarget.location || editTarget.organization?.city || '',
      website: editTarget.website || editTarget.organization?.website || '',
      description: editTarget.bio || editTarget.description || editTarget.org_description || editTarget.organization?.description || '',
      is_approved: editTarget.is_approved === true || editTarget.is_approved === 1 || editTarget.status === 'active',
    });
  }, [editTarget]);

  // Fetch organizer list
  const fetchOrganizers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { role: 'organizer', page, limit: 12, sort };
      if (tab === 'pending') params.status = 'pending';
      else if (tab === 'approved') params.status = 'approved';
      else if (tab === 'suspended') params.status = 'suspended';

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const [res, allRes] = await Promise.all([
        getUsers(params),
        getUsers({ role: 'organizer' }),
      ]);

      const d = res.data;
      const list = Array.isArray(d) ? d : d.users || d.data || [];
      setOrganizers(list);
      setTotalPages(d.pagination?.totalPages || 1);
      setTotal(d.pagination?.total ?? list.length);

      const all = Array.isArray(allRes.data) ? allRes.data : allRes.data?.users || [];
      const approvedCount = all.filter((u) => u.is_approved === true || u.is_approved === 1 || u.is_approved === 'true' || u.status === 'active').length;
      const suspendedCount = all.filter((u) => u.status === 'suspended' || u.status === 'rejected').length;
      const pendingCount = all.filter((u) => !u.is_approved && u.status !== 'rejected' && u.status !== 'suspended' && u.status !== 'active').length;

      setStats({
        total: all.length,
        active: approvedCount,
        pending: pendingCount,
        suspended: suspendedCount,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load organizers');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, statusFilter, sort]);

  useEffect(() => { fetchOrganizers(); }, [fetchOrganizers]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [tab, search, statusFilter, categoryFilter, sort]);

  // Client-side category filtering if set
  const displayedOrganizers = useMemo(() => {
    if (!categoryFilter || categoryFilter === 'All Categories') return organizers;
    return organizers.filter((org) => {
      const cat = org.category || org.org_category || org.organization?.category || '';
      return cat.toLowerCase() === categoryFilter.toLowerCase();
    });
  }, [organizers, categoryFilter]);

  // Selection
  const toggleSelect = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelected((prev) => prev.size === displayedOrganizers.length ? new Set() : new Set(displayedOrganizers.map((u) => u.id)));

  // 1-Click Approve Organizer
  const handleApprove = async (u) => {
    setActionLoading(`approve-${u.id}`);
    try {
      await approveOrganizer(u.id);
      toast.success(`Organizer "${u.organizationName || u.name}" approved successfully!`);

      // Optimistic update
      setOrganizers((prev) => {
        if (tab === 'pending') return prev.filter((usr) => usr.id !== u.id);
        return prev.map((usr) => usr.id === u.id ? { ...usr, is_approved: true, status: 'active' } : usr);
      });

      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        active: prev.active + 1,
      }));

      if (panelUser?.id === u.id) {
        setPanelUser((prev) => prev ? { ...prev, is_approved: true, status: 'active' } : null);
        refreshPanel();
      }
      fetchOrganizers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve organizer');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Application
  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(`reject-${rejectTarget.id}`);
    try {
      await rejectOrganizer(rejectTarget.id, { reason: rejectReason || 'Application does not meet platform requirements.' });
      toast.success(`Organizer "${rejectTarget.organizationName || rejectTarget.name}" rejected`);
      setRejectTarget(null);
      setRejectReason('');
      if (panelUser?.id === rejectTarget.id) refreshPanel();
      fetchOrganizers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject organizer');
    } finally {
      setActionLoading(null);
    }
  };

  // Suspend / Unsuspend
  const handleToggleSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(`suspend-${suspendTarget.id}`);
    try {
      if (isSuspendedUser(suspendTarget)) {
        await unsuspendUser(suspendTarget.id);
        toast.success(`Organizer "${suspendTarget.organizationName || suspendTarget.name}" unsuspended`);
      } else {
        await suspendUser(suspendTarget.id, { reason: suspendReason || 'Violation of platform terms' });
        toast.success(`Organizer "${suspendTarget.organizationName || suspendTarget.name}" suspended`);
      }
      setSuspendTarget(null);
      setSuspendReason('');
      if (panelUser?.id === suspendTarget.id) refreshPanel();
      fetchOrganizers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Save Edit Profile
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setActionLoading('edit-save');
    try {
      await updateUser(editTarget.id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        organization_name: editForm.organization_name,
        category: editForm.category,
        city: editForm.city,
        website: editForm.website,
        description: editForm.description,
        is_approved: editForm.is_approved,
        status: editForm.is_approved ? 'active' : editTarget.status,
      });

      toast.success('Organizer profile updated successfully');
      setEditTarget(null);
      if (panelUser?.id === editTarget.id) refreshPanel();
      fetchOrganizers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update organizer profile');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Organizer
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(`delete-${deleteTarget.id}`);
    try {
      await deleteUser(deleteTarget.id);
      toast.success('Organizer permanently deleted');
      setDeleteTarget(null);
      if (panelUser?.id === deleteTarget.id) setPanelUser(null);
      fetchOrganizers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete organizer');
    } finally {
      setActionLoading(null);
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setActionLoading(`reset-${resetTarget.id}`);
    try {
      const body = resetTarget.password ? { password: resetTarget.password } : {};
      const res = await resetUserPassword(resetTarget.id, body);
      setResetResult(res.data || {});
      toast.success(res.data?.message || 'Password reset');
      fetchOrganizers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  // Force Logout
  const handleForceLogout = async (userId) => {
    setActionLoading(`logout-${userId}`);
    try {
      await forceLogoutUser(userId);
      toast.success('All organizer sessions revoked');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke sessions');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk Actions
  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setActionLoading('bulk');
    try {
      for (const id of selected) {
        await approveOrganizer(id);
      }
      toast.success(`${selected.size} organizers approved!`);
      setSelected(new Set());
      fetchOrganizers();
    } catch {
      toast.error('Bulk approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setActionLoading('bulk');
    try {
      await bulkDeleteUsers({ ids: [...selected] });
      toast.success(`${selected.size} organizers deleted`);
      setSelected(new Set());
      fetchOrganizers();
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      const params = { role: 'organizer' };
      if (tab === 'pending') params.status = 'pending';
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await exportUsersCSV(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'organizers-export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Organizer directory exported');
    } catch {
      toast.error('Export failed');
    }
  };

  // Open Detail Panel
  const openPanel = async (u) => {
    setPanelUser(u);
    setPanelTab('overview');
    setPanelDetail(null);
    setPanelStats(null);
    setPanelActivity([]);
    setPanelSessions([]);
    setPanelNotes([]);
    setPanelLoading(true);
    try {
      const [detailRes, statsRes] = await Promise.all([
        getUser(u.id),
        getUserStats(u.id),
      ]);
      setPanelDetail(detailRes.data.user || detailRes.data);
      setPanelStats(statsRes.data.stats || {});
    } catch {
      toast.error('Failed to load organizer details');
    } finally {
      setPanelLoading(false);
    }
  };

  const refreshPanel = async () => {
    if (!panelUser) return;
    try {
      const [detailRes, statsRes] = await Promise.all([
        getUser(panelUser.id),
        getUserStats(panelUser.id),
      ]);
      setPanelDetail(detailRes.data.user || detailRes.data);
      setPanelStats(statsRes.data.stats || {});
    } catch {
      /* silent */
    }
  };

  const loadPanelTab = async (key) => {
    setPanelTab(key);
    if (!panelUser) return;
    if (key === 'activity' && panelActivity.length === 0) {
      try {
        const res = await getUserActivity(panelUser.id);
        setPanelActivity(res.data.activities || []);
      } catch { /* */ }
    }
    if (key === 'sessions' && panelSessions.length === 0) {
      try {
        const res = await getUserSessions(panelUser.id);
        setPanelSessions(res.data.sessions || []);
      } catch { /* */ }
    }
    if (key === 'notes' && panelNotes.length === 0) {
      try {
        const res = await getAdminNotes(panelUser.id);
        setPanelNotes(res.data.notes || []);
      } catch { /* */ }
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !panelUser) return;
    setNoteLoading(true);
    try {
      await addAdminNote(panelUser.id, { note: noteText });
      setNoteText('');
      toast.success('Note added');
      const res = await getAdminNotes(panelUser.id);
      setPanelNotes(res.data.notes || []);
    } catch {
      toast.error('Failed to add note');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteAdminNote(noteId);
      setPanelNotes((p) => p.filter((n) => n.id !== noteId));
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const d = panelDetail;
  const pStats = panelStats;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        icon={Building2}
        accent="gold"
        title="Organizers"
        subtitle="Manage event organizers, verify KYC submissions, inspect creator profiles, and control account permissions."
        count={total}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-sm text-[#EFEFF1] hover:border-white/40 transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        }
      />

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Organizers" value={stats.total?.toLocaleString() || '0'} />
        <StatCard icon={CheckCircle2} label="Approved & Active" value={stats.active?.toLocaleString() || '0'} accent />
        <StatCard icon={Clock} label="Pending Approval" value={stats.pending?.toLocaleString() || '0'} />
        <StatCard icon={Ban} label="Suspended" value={stats.suspended?.toLocaleString() || '0'} />
      </div>

      {/* ── Filter & Search Block (identical layout to UserManagementPage) ── */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizer, contact name, email, city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved &amp; Active</option>
            <option value="pending">Pending Approval</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c === 'All Categories' ? '' : c}>
                {c}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-[#494F55]/40 overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2.5 transition ${viewMode === 'cards' ? 'bg-white text-[#1C232B]' : 'bg-[#1C232B] text-[#949599] hover:text-[#EFEFF1]'}`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 transition ${viewMode === 'table' ? 'bg-white text-[#1C232B]' : 'bg-[#1C232B] text-[#949599] hover:text-[#EFEFF1]'}`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-white text-[#1C232B] font-semibold'
                  : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
              }`}
            >
              <span>{t.label}</span>
              {t.key === 'pending' && stats.pending > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    tab === t.key ? 'bg-[#1C232B] text-white' : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#494F55]/20">
            <span className="text-sm font-medium text-white mr-1">{selected.size} selected</span>
            <button
              onClick={handleBulkApprove}
              disabled={actionLoading === 'bulk'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve Selected
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading === 'bulk'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-[#949599] hover:text-[#EFEFF1] ml-auto">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Main Content: Cards or Table ── */}
      {loading ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <LoadingSpinner label="Loading organizers..." className="py-16" />
        </div>
      ) : displayedOrganizers.length === 0 ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <EmptyState
            icon={Building2}
            title={search ? 'No matching organizers found' : `No ${tab} organizers`}
            description={
              search
                ? `No organizer matches "${search}". Try adjusting your filters.`
                : tab === 'pending'
                ? 'All organizer applications have been reviewed. No pending approvals.'
                : 'No organizer accounts found in this category.'
            }
            className="py-16"
          />
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedOrganizers.map((u, i) => {
            const orgTitle = u.organizationName || u.organization_name || u.organization?.name || u.name || 'Organizer';
            const uInit = initials(orgTitle);
            const statusInfo = getOrganizerStatus(u);
            const isApproved = u.is_approved === true || u.is_approved === 1 || u.is_approved === 'true' || u.status === 'active';
            const isPending = !isApproved && u.status !== 'rejected' && u.status !== 'suspended';

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openPanel(u)}
                className={`group relative rounded-xl bg-[#171A1D] border p-5 transition-all cursor-pointer hover:border-white/30 hover:shadow-lg hover:shadow-black/20 ${
                  selected.has(u.id) ? 'border-white/40 bg-white/5' : 'border-[#262B2F]'
                }`}
              >
                {/* Top-left checkbox */}
                <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]"
                  />
                </div>

                {/* Top-right action hover buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditTarget(u)} className={actionBtn} title="Edit Profile">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setSuspendTarget(u); setSuspendReason(''); }}
                    className={`${actionBtn} ${isSuspendedUser(u) ? 'text-emerald-400' : 'text-amber-400'}`}
                    title={isSuspendedUser(u) ? 'Unsuspend' : 'Suspend'}
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(u)} className={`${actionBtn} text-red-400`} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Avatar & Header */}
                <div className="flex items-center gap-3.5 mt-5">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarBg[i % avatarBg.length]}`}>
                    {uInit}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#EFEFF1] truncate flex items-center gap-1.5">
                      {orgTitle}
                    </p>
                    <p className="text-xs text-[#949599] truncate">
                      {u.name} • {u.email}
                    </p>
                  </div>
                </div>

                {/* Badges and Quick Approval */}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="gold" size="sm">organizer</Badge>
                  <Badge variant={statusInfo.variant} size="sm" dot>{statusInfo.label}</Badge>

                  {isPending && (
                    <div className="ml-auto flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleApprove(u)}
                        disabled={actionLoading === `approve-${u.id}`}
                        className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/15 transition"
                        title="Approve Organizer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setRejectTarget(u); setRejectReason(''); }}
                        className="p-1.5 rounded-md text-red-400 hover:bg-red-500/15 transition"
                        title="Reject Application"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3-Column Metrics (Events, Tickets, Joined) */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#262B2F]/70">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#EFEFF1] tabular-nums">{u.eventsCount ?? 0}</p>
                    <p className="text-[10px] text-[#949599] uppercase tracking-wider">Events</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#EFEFF1] tabular-nums">{u.ticketsCount ?? 0}</p>
                    <p className="text-[10px] text-[#949599] uppercase tracking-wider">Tickets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] text-[#949599] mt-0.5">{fmtDate(u.createdAt || u.created_at)}</p>
                    <p className="text-[10px] text-[#949599] uppercase tracking-wider">Joined</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                  <th className="hidden md:table-cell px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === displayedOrganizers.length && displayedOrganizers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]"
                    />
                  </th>
                  <th className="px-4 py-3">Organizer</th>
                  <th className="hidden md:table-cell px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden md:table-cell px-4 py-3 text-center">Events</th>
                  <th className="hidden md:table-cell px-4 py-3 text-center">Tickets</th>
                  <th className="hidden md:table-cell px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B2F]/70">
                {displayedOrganizers.map((u, i) => {
                  const orgTitle = u.organizationName || u.organization_name || u.organization?.name || u.name || 'Organizer';
                  const uInit = initials(orgTitle);
                  const statusInfo = getOrganizerStatus(u);
                  const isApproved = u.is_approved === true || u.is_approved === 1 || u.is_approved === 'true' || u.status === 'active';
                  const isPending = !isApproved && u.status !== 'rejected' && u.status !== 'suspended';

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-[#1D2124] transition-colors ${selected.has(u.id) ? 'bg-white/5' : ''}`}
                    >
                      <td className="hidden md:table-cell px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => openPanel(u)}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarBg[i % avatarBg.length]}`}>
                            {uInit}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#EFEFF1] truncate max-w-[180px]">
                              {orgTitle}
                            </p>
                            <p className="text-xs text-[#949599] truncate max-w-[200px]">
                              {u.name} • {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-[#949599]">
                        {u.category || u.org_category || u.organization?.category || 'General'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant} size="sm" dot>{statusInfo.label}</Badge>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-center text-[#949599]">{u.eventsCount ?? 0}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-center text-[#949599]">{u.ticketsCount ?? 0}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-[#949599]">{fmtDate(u.createdAt || u.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openPanel(u)} className={actionBtn} title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditTarget(u)} className={actionBtn} title="Edit Profile">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isPending && (
                            <button
                              onClick={() => handleApprove(u)}
                              disabled={actionLoading === `approve-${u.id}`}
                              className={`${actionBtn} text-emerald-400`}
                              title="Approve Organizer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => { setSuspendTarget(u); setSuspendReason(''); }}
                            className={`${actionBtn} ${isSuspendedUser(u) ? 'text-emerald-400' : 'text-amber-400'}`}
                            title={isSuspendedUser(u) ? 'Unsuspend' : 'Suspend'}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(u)} className={`${actionBtn} text-red-400`} title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ── Slide-Out Detail Modal (size="xl", hideClose) ── */}
      <Modal
        open={!!panelUser}
        onClose={() => setPanelUser(null)}
        size="xl"
        hideClose
        title={
          d ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center text-base font-bold">
                {initials(d.organizationName || d.name)}
              </div>
              <div>
                <p className="text-base font-semibold text-[#EFEFF1] flex items-center gap-2">
                  {d.organizationName || d.organization_name || d.name}
                </p>
                <p className="text-sm text-[#949599]">
                  Contact: {d.name} • {d.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="gold" size="sm">organizer</Badge>
                  <Badge variant={getOrganizerStatus(d).variant} size="sm" dot>{getOrganizerStatus(d).label}</Badge>
                </div>
              </div>
            </div>
          ) : undefined
        }
      >
        {panelLoading && !d ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner label="Loading organizer details..." />
          </div>
        ) : d ? (
          <div className="space-y-5">
            {/* Top action row */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setPanelUser(null); setEditTarget(d); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs font-medium text-[#EFEFF1] hover:border-white/40 transition"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </button>
              <button
                onClick={() => { setPanelUser(null); setResetTarget(d); setResetResult(null); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs font-medium text-[#EFEFF1] hover:border-white/40 transition"
              >
                <KeyRound className="w-3.5 h-3.5" /> Reset Password
              </button>
              <button
                onClick={() => handleForceLogout(d.id)}
                disabled={actionLoading === `logout-${d.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs font-medium text-[#EFEFF1] hover:border-white/40 transition disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" /> Revoke Sessions
              </button>
              {isSuspendedUser(d) ? (
                <button
                  onClick={() => { setPanelUser(null); setSuspendTarget(d); setSuspendReason(''); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Unsuspend
                </button>
              ) : (
                <button
                  onClick={() => { setPanelUser(null); setSuspendTarget(d); setSuspendReason(''); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition"
                >
                  <Ban className="w-3.5 h-3.5" /> Suspend
                </button>
              )}
              <button
                onClick={() => { setPanelUser(null); setDeleteTarget(d); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>

            {/* Direct Verification Banner if pending (NO inner decision radio buttons) */}
            {(!d.is_approved && d.status !== 'active' && d.status !== 'suspended' && d.status !== 'rejected') && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    Pending Application Review
                  </p>
                  <p className="text-xs text-[#949599] mt-0.5">
                    Inspect KYC details, business credentials, and event scope below before granting ticket publishing access.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setRejectTarget(d); setRejectReason(''); }}
                    className="px-3.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/25 transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleApprove(d)}
                    disabled={actionLoading === `approve-${d.id}`}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {actionLoading === `approve-${d.id}` ? 'Approving...' : 'Approve Organizer'}
                  </button>
                </div>
              </div>
            )}

            {/* Suspension banner if suspended */}
            {d.isSuspended && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Account Suspended</p>
                <p className="text-sm text-[#EFEFF1] mt-0.5">{d.suspendReason || 'No reason provided'}</p>
                {d.suspendedAt && <p className="text-xs text-[#949599] mt-1">{fmtDateTime(d.suspendedAt)}</p>}
              </div>
            )}

            {/* Navigation Tabs inside Panel */}
            <div className="flex gap-1 border-b border-[#262B2F] -mx-5 px-5">
              {panelTabs.map((pt) => (
                <button
                  key={pt.key}
                  onClick={() => loadPanelTab(pt.key)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition ${
                    panelTab === pt.key
                      ? 'border-white text-[#EFEFF1]'
                      : 'border-transparent text-[#949599] hover:text-[#EFEFF1]'
                  }`}
                >
                  <pt.icon className="w-3.5 h-3.5" />
                  {pt.label}
                </button>
              ))}
            </div>

            {/* Tab Views */}
            <div className="min-h-[220px]">
              {/* Tab: Overview */}
              {panelTab === 'overview' && (
                <div className="space-y-4">
                  {pStats && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { l: 'Events', v: pStats.events || d.eventsCount || 0 },
                        { l: 'Tickets', v: pStats.tickets || d.ticketsCount || 0 },
                        { l: 'Revenue', v: `₵${(pStats.revenue || 0).toLocaleString()}` },
                        { l: 'Orders', v: pStats.orders || 0 },
                        { l: 'Reviews', v: pStats.reviews || 0 },
                        { l: 'Active Sessions', v: pStats.activeSessions || 0 },
                      ].map((s) => (
                        <div key={s.l} className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3 text-center">
                          <p className="text-lg font-semibold text-[#EFEFF1] tabular-nums">{s.v}</p>
                          <p className="text-[10px] text-[#949599] uppercase tracking-wider mt-0.5">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: 'Organization / Brand', v: d.organizationName || d.organization_name || d.name || '—' },
                      { l: 'Category / Industry', v: d.category || d.org_category || d.organization?.category || 'General Events' },
                      { l: 'Operating City / Region', v: d.city || d.location || d.organization?.city || '—' },
                      { l: 'Contact Phone Number', v: d.phone || '—' },
                      { l: 'Official Website / Link', v: d.website || d.organization?.website || '—', isLink: true },
                      { l: 'Date Registered', v: fmtDate(d.created_at || d.createdAt) },
                      { l: 'Email Verification', v: (d.email_verified || d.emailVerified) ? 'Verified' : 'Unverified' },
                      { l: 'Last Active', v: d.last_login_at ? fmtDateTime(d.last_login_at) : '—' },
                    ].map((f) => (
                      <div key={f.l} className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3">
                        <p className="text-xs text-[#949599]">{f.l}</p>
                        {f.isLink && f.v !== '—' ? (
                          <a
                            href={f.v.startsWith('http') ? f.v : `https://${f.v}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 text-sm font-medium text-blue-400 hover:underline truncate block"
                          >
                            {f.v}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm font-medium text-[#EFEFF1] truncate">{f.v}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {(d.bio || d.org_description || d.organization?.description || d.description) && (
                    <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Organization Bio &amp; Event Scope</p>
                      <p className="text-sm text-[#EFEFF1] leading-relaxed whitespace-pre-wrap">
                        {d.bio || d.org_description || d.organization?.description || d.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: KYC Dossier */}
              {panelTab === 'dossier' && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#262B2F] pb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-[#EFEFF1]">Verification Credentials</h4>
                        <p className="text-xs text-[#949599]">Identity and contact proof submitted during onboarding</p>
                      </div>
                      <Badge variant={getOrganizerStatus(d).variant} size="sm" dot>{getOrganizerStatus(d).label}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-3 rounded-lg bg-[#171A1D] border border-[#262B2F]">
                        <p className="text-[#949599]">Organization Legal / Brand Name</p>
                        <p className="text-sm font-medium text-[#EFEFF1] mt-0.5">{d.organizationName || d.organization_name || d.name}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#171A1D] border border-[#262B2F]">
                        <p className="text-[#949599]">Registered Contact Person</p>
                        <p className="text-sm font-medium text-[#EFEFF1] mt-0.5">{d.name}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#171A1D] border border-[#262B2F]">
                        <p className="text-[#949599]">Work Email Address</p>
                        <p className="text-sm font-medium text-[#EFEFF1] mt-0.5">{d.email}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#171A1D] border border-[#262B2F]">
                        <p className="text-[#949599]">Operating Phone</p>
                        <p className="text-sm font-medium text-[#EFEFF1] mt-0.5">{d.phone || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#171A1D] border border-[#262B2F]">
                        <p className="text-[#949599]">Operating City</p>
                        <p className="text-sm font-medium text-[#EFEFF1] mt-0.5">{d.city || d.location || '—'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#171A1D] border border-[#262B2F]">
                        <p className="text-[#949599]">Industry Category</p>
                        <p className="text-sm font-medium text-[#EFEFF1] mt-0.5">{d.category || d.org_category || 'General Events'}</p>
                      </div>
                    </div>

                    {(d.bio || d.org_description || d.organization?.description || d.description) && (
                      <div className="p-3 rounded-lg bg-[#171A1D] border border-[#262B2F] mt-2">
                        <p className="text-xs text-[#949599] font-medium mb-1">Declared Scope of Events</p>
                        <p className="text-xs text-[#EFEFF1] leading-relaxed whitespace-pre-wrap">
                          {d.bio || d.org_description || d.organization?.description || d.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Activity */}
              {panelTab === 'activity' && (
                <div className="space-y-2">
                  {panelActivity.length === 0 ? (
                    <EmptyState icon={Clock} title="No activity recorded" description="Organizer actions will appear here." className="py-8" />
                  ) : (
                    panelActivity.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#1C232B]/40 border border-[#494F55]/20 text-xs">
                        <div>
                          <p className="font-medium text-[#EFEFF1]">{a.action || a.activity_type || 'Activity'}</p>
                          <p className="text-[#949599] mt-0.5">{a.description || a.details || '—'}</p>
                        </div>
                        <span className="text-[#949599] shrink-0">{fmtDateTime(a.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab: Sessions */}
              {panelTab === 'sessions' && (
                <div className="space-y-2">
                  {panelSessions.length === 0 ? (
                    <EmptyState icon={Monitor} title="No active sessions" description="Active login sessions will show here." className="py-8" />
                  ) : (
                    panelSessions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#1C232B]/40 border border-[#494F55]/20 text-xs">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-[#949599]" />
                          <div>
                            <p className="font-medium text-[#EFEFF1]">{s.device || s.user_agent || 'Browser Session'}</p>
                            <p className="text-[#949599]">{s.ip_address || '—'}</p>
                          </div>
                        </div>
                        <span className="text-[#949599]">{fmtDateTime(s.last_active || s.created_at)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab: Notes */}
              {panelTab === 'notes' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add an internal note about this organizer..."
                      className={inputCls}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={noteLoading || !noteText.trim()}
                      className="px-4 py-2 rounded-lg bg-white text-[#1C232B] text-xs font-semibold hover:bg-slate-200 transition shrink-0 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {panelNotes.length === 0 ? (
                      <EmptyState icon={StickyNote} title="No notes yet" description="Internal admin notes will appear here." className="py-8" />
                    ) : (
                      panelNotes.map((n) => (
                        <div key={n.id} className="flex items-start justify-between p-3 rounded-lg bg-[#1C232B]/40 border border-[#494F55]/20 text-xs">
                          <div>
                            <p className="text-[#EFEFF1] whitespace-pre-wrap">{n.note}</p>
                            <p className="text-[#949599] mt-1">{fmtDateTime(n.created_at)}</p>
                          </div>
                          <button onClick={() => handleDeleteNote(n.id)} className="text-red-400 hover:text-red-300 ml-2">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Edit Organizer Profile Modal ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Organizer Profile" size="lg">
        {editTarget && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#949599] mb-1">Organization / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.organization_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, organization_name: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#949599] mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#949599] mb-1">Work Email Address *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#949599] mb-1">Contact Phone Number *</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#949599] mb-1">Operating City / Region</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Accra, Lagos, London"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#949599] mb-1">Event Category / Industry</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputCls}
                >
                  {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#949599] mb-1">Official Website / Social Link</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#949599] mb-1">Organization Bio &amp; Scope</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between p-3.5 rounded-lg bg-[#1C232B] border border-[#262B2F]">
                <div>
                  <p className="text-sm font-medium text-[#EFEFF1]">Approval Status</p>
                  <p className="text-xs text-[#949599]">Grant this organizer full permission to publish events and sell tickets</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_approved}
                    onChange={(e) => setEditForm((f) => ({ ...f, is_approved: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#262B2F] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#262B2F]">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-[#949599] hover:text-[#EFEFF1] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'edit-save'}
                className="px-5 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-slate-200 transition disabled:opacity-50"
              >
                {actionLoading === 'edit-save' ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Suspend / Unsuspend Modal ── */}
      <Modal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.status === 'suspended' ? 'Unsuspend Organizer' : 'Suspend Organizer Account'}
        size="md"
        footer={
          suspendTarget && (
            <div className="flex items-center justify-end gap-2 w-full">
              <button onClick={() => setSuspendTarget(null)} className="px-4 py-2 rounded-lg text-sm text-[#949599] hover:text-[#EFEFF1] transition">
                Cancel
              </button>
              <button
                onClick={handleToggleSuspend}
                disabled={actionLoading === `suspend-${suspendTarget.id}`}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${
                  suspendTarget.status === 'suspended' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {actionLoading === `suspend-${suspendTarget.id}` ? 'Processing...' : suspendTarget.status === 'suspended' ? 'Confirm Unsuspend' : 'Confirm Suspension'}
              </button>
            </div>
          )
        }
      >
        {suspendTarget && (
          <div className="space-y-3">
            <p className="text-sm text-[#949599]">
              {suspendTarget.status === 'suspended'
                ? `Restore full publishing and ticket access for "${suspendTarget.organizationName || suspendTarget.name}"?`
                : `Suspending "${suspendTarget.organizationName || suspendTarget.name}" will temporarily revoke their event publishing and ticket sales privileges.`}
            </p>
            {suspendTarget.status !== 'suspended' && (
              <div>
                <label className="block text-xs font-semibold text-[#949599] mb-1">Reason for Suspension</label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Terms violation, ticket disputes, or identity audit..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Reject Modal ── */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Organizer Application"
        size="md"
        footer={
          rejectTarget && (
            <div className="flex items-center justify-end gap-2 w-full">
              <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-lg text-sm text-[#949599] hover:text-[#EFEFF1] transition">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === `reject-${rejectTarget.id}`}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {actionLoading === `reject-${rejectTarget.id}` ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          )
        }
      >
        {rejectTarget && (
          <div className="space-y-3">
            <p className="text-sm text-[#949599]">
              Reject application for <strong className="text-[#EFEFF1]">{rejectTarget.organizationName || rejectTarget.name}</strong> ({rejectTarget.email}).
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#949599] mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete business documents, unverified contact, or ineligible event category..."
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reset Password Modal ── */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Organizer Password"
        size="md"
        footer={
          resetTarget && (
            <div className="flex items-center justify-end gap-2 w-full">
              <button onClick={() => setResetTarget(null)} className="px-4 py-2 rounded-lg text-sm text-[#949599] hover:text-[#EFEFF1] transition">
                Close
              </button>
              <button
                onClick={handleResetPassword}
                disabled={actionLoading === `reset-${resetTarget.id}`}
                className="px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-slate-200 transition disabled:opacity-50"
              >
                {actionLoading === `reset-${resetTarget.id}` ? 'Resetting...' : 'Execute Reset'}
              </button>
            </div>
          )
        }
      >
        {resetTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[#949599]">
              Reset credentials for organizer <span className="font-semibold text-[#EFEFF1]">{resetTarget.name}</span> ({resetTarget.email}).
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#949599] mb-1">Custom Temporary Password (leave blank to auto-generate)</label>
              <input
                type="text"
                value={resetTarget.password || ''}
                onChange={(e) => setResetTarget((p) => ({ ...p, password: e.target.value }))}
                placeholder="Optional temporary password..."
                className={inputCls}
              />
            </div>
            {resetResult?.temporaryPassword && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-xs text-emerald-400 font-semibold mb-1">Generated Temporary Password:</p>
                <code className="text-sm font-mono text-emerald-200 select-all block bg-black/40 px-2 py-1 rounded">
                  {resetResult.temporaryPassword}
                </code>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Permanently Delete Organizer"
        size="md"
        footer={
          deleteTarget && (
            <div className="flex items-center justify-end gap-2 w-full">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm text-[#949599] hover:text-[#EFEFF1] transition">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === `delete-${deleteTarget.id}`}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {actionLoading === `delete-${deleteTarget.id}` ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          )
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>This action is destructive and irreversible.</span>
            </div>
            <p className="text-sm text-[#949599]">
              Are you sure you want to permanently delete organizer{' '}
              <strong className="text-[#EFEFF1]">{deleteTarget.organizationName || deleteTarget.name}</strong> ({deleteTarget.email})?
              All creator profile and associated data will be removed.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
