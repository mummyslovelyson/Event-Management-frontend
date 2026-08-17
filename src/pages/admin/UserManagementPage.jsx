import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, Eye, Ban, CheckCircle2, Trash2, UserCheck,
  Pencil, XCircle, ShieldCheck, KeyRound, Copy, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  getUsers, getUser, suspendUser, unsuspendUser, deleteUser, updateUser,
  approveOrganizer, rejectOrganizer, resetUserPassword,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
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

const roleVariant = (r) => ({
  admin: 'danger', organizer: 'gold', attendee: 'info',
}[r] || 'neutral');

const isSuspendedUser = (u) => u?.status === 'suspended';
const userStatus = (u) => {
  if (isSuspendedUser(u)) return { label: 'Suspended', variant: 'error' };
  if (u?.role === 'organizer') {
    if (u.is_approved === 1) return { label: 'Active', variant: 'success' };
    if (u.status === 'rejected') return { label: 'Rejected', variant: 'error' };
    return { label: 'Pending', variant: 'pending' };
  }
  // Attendees and admins don't go through organizer approval.
  return { label: 'Active', variant: 'success' };
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const avatarColors = ['bg-white/10 text-white', 'bg-white/10 text-white', 'bg-[#EFEFF1]/10 text-[#EFEFF1]', 'bg-[#494F55]/40 text-[#9AA1A6]', 'bg-white/10 text-[#E8C75E]'];

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition';

export default function UserManagementPage() {
  const [tab, setTab] = useState('all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(new Set());
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [revealHash, setRevealHash] = useState(false);

  const {
    register, handleSubmit, reset, formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!editTarget) return;
    reset({
      name: editTarget.name || '',
      email: editTarget.email || '',
      phone: editTarget.phone || '',
      role: editTarget.role === 'organizer' ? 'organizer' : 'attendee',
    });
  }, [editTarget, reset]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, sort };
      if (tab === 'suspended') params.status = 'suspended';
      else if (tab !== 'all') params.role = tab;
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await getUsers(params);
      const d = res.data;
      setUsers(Array.isArray(d) ? d : d.users || d.data || []);
      setTotalPages(d.pagination?.totalPages || d.totalPages || d.pages || 1);
      setTotal(d.pagination?.total ?? d.total ?? d.count ?? (Array.isArray(d) ? d.length : 0));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, statusFilter, sort]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [tab, search, statusFilter, sort]);

  const openProfile = async (id) => {
    setProfileLoading(true);
    setShowProfile(true);
    try {
      const res = await getUser(id);
      setProfile(res.data.user || res.data);
    } catch (err) {
      setProfile(null);
      toast.error('Failed to load user');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setActionLoading(suspendTarget.id);
    try {
      if (isSuspendedUser(suspendTarget)) {
        await unsuspendUser(suspendTarget.id);
        toast.success('User unsuspended');
      } else {
        await suspendUser(suspendTarget.id, { reason: suspendTarget.reason || 'Violation of platform policy' });
        toast.success('User suspended');
      }
      setSuspendTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await deleteUser(deleteTarget.id);
      toast.success('User deleted');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (u) => {
    setActionLoading(`verify-${u.id}`);
    try {
      await approveOrganizer(u.id);
      toast.success('Organizer approved');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    try {
      await rejectOrganizer(rejectTarget.id, { reason: rejectTarget.reason || 'Application did not meet requirements.' });
      toast.success('Organizer application rejected');
      setRejectTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async (data) => {
    if (!editTarget) return;
    setActionLoading(editTarget.id);
    try {
      await updateUser(editTarget.id, data);
      toast.success('User updated');
      setEditTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setActionLoading(`reset-${resetTarget.id}`);
    try {
      const body = resetTarget.password ? { password: resetTarget.password } : {};
      const res = await resetUserPassword(resetTarget.id, body);
      setResetResult(res.data || {});
      toast.success(res.data?.message || 'Password reset');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  const fillRandomPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setResetTarget((prev) => ({ ...prev, password: out }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

  const openReset = (u) => {
    setResetTarget(u);
    setResetResult(null);
    setRevealHash(false);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === users.length ? new Set() : new Set(users.map((u) => u.id))));
  };

  const bulkSuspend = async () => {
    if (selected.size === 0) return;
    setActionLoading('bulk');
    try {
      await Promise.all([...selected].map((id) => suspendUser(id, { reason: 'Bulk moderation action' })));
      toast.success(`${selected.size} users suspended`);
      setSelected(new Set());
      fetchUsers();
    } catch (err) {
      toast.error('Bulk action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const bulkUnsuspend = async () => {
    const targets = [...selected].filter((id) => users.find((u) => u.id === id)?.status === 'suspended');
    if (targets.length === 0) return;
    setActionLoading('bulk');
    try {
      await Promise.all(targets.map((id) => unsuspendUser(id)));
      toast.success(`${targets.length} users unsuspended`);
      setSelected(new Set());
      fetchUsers();
    } catch (err) {
      toast.error('Bulk action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const hasSelectedSuspended = [...selected].some((id) => users.find((u) => u.id === id)?.status === 'suspended');
  const selectedNonAdmins = [...selected].some((id) => users.find((u) => u.id === id)?.role !== 'admin');

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        accent="sky"
        title="Users"
        subtitle="View accounts, edit details, and handle approvals, suspensions, and resets."
        count={total}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key
                ? 'bg-white text-[#1C232B]'
                : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending Approval</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mt-3 pt-3 border-t border-[#494F55]/20"
          >
            <span className="text-sm text-white">{selected.size} selected</span>
            {selectedNonAdmins && (
              <button
                onClick={bulkSuspend}
                disabled={actionLoading === 'bulk'}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25 transition disabled:opacity-50"
              >
                <Ban className="w-3.5 h-3.5" /> Bulk Suspend
              </button>
            )}
            {hasSelectedSuspended && (
              <button
                onClick={bulkUnsuspend}
                disabled={actionLoading === 'bulk'}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" /> Bulk Unsuspend
              </button>
            )}
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-[#949599] hover:text-[#EFEFF1] ml-auto"
            >
              Clear selection
            </button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading users..." className="py-16" />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try adjusting your filters or search." className="py-16" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                  <th className="hidden md:table-cell px-4 py-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium text-center">Events</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium text-center">Tickets</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B2F]/70">
                {users.map((u, i) => {
                  const initials = (u.name || u.email || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
                  const isAdmin = u.role === 'admin';
                  const isPendingOrg = u.role === 'organizer' && u.is_approved !== 1 && u.status !== 'rejected';
                  return (
                    <tr key={u.id} className={`hover:bg-[#1D2124] transition-colors ${selected.has(u.id) ? 'bg-white/10' : ''}`}>
                      <td className="hidden md:table-cell px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] accent-[#EFEFF1]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#EFEFF1] truncate max-w-[160px] flex items-center gap-1.5">
                              {u.name || 'Unknown'}
                              {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-white" />}
                            </p>
                            <p className="text-xs text-[#949599] truncate max-w-[180px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3"><Badge variant={roleVariant(u.role)} size="sm">{u.role}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={userStatus(u).variant} size="sm" dot>
                          {userStatus(u).label}
                        </Badge>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-center text-[#949599]">{u.eventsCount ?? u.events ?? 0}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-center text-[#949599]">{u.ticketsCount ?? u.tickets ?? 0}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-[#949599]">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openProfile(u.id)} className="p-2.5 rounded-md text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition" title="View Profile">
                            <Eye className="w-4 h-4" />
                          </button>
                          {!isAdmin && (
                            <button
                              onClick={() => setEditTarget(u)}
                              disabled={actionLoading === u.id}
                              className="p-2.5 rounded-md text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition disabled:opacity-50"
                              title="Edit User"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {!isAdmin && (
                            <button
                              onClick={() => openReset(u)}
                              className="p-2.5 rounded-md text-[#949599] hover:text-white hover:bg-white/10 transition"
                              title="Reset Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}
                          {isPendingOrg && (
                            <>
                              <button
                                onClick={() => handleVerify(u)}
                                disabled={actionLoading === `verify-${u.id}`}
                                className="p-2.5 rounded-md text-white hover:bg-white/10 transition disabled:opacity-50"
                                title="Approve Organizer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRejectTarget(u)}
                                disabled={actionLoading === u.id}
                                className="p-2.5 rounded-md text-red-400 hover:bg-red-500/15 transition disabled:opacity-50"
                                title="Reject Organizer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {!isAdmin && (
                            <button
                              onClick={() => setSuspendTarget(u)}
                              className="p-2.5 rounded-md text-amber-400 hover:bg-amber-500/15 transition"
                              title={isSuspendedUser(u) ? 'Unsuspend' : 'Suspend'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {!isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-2.5 rounded-md text-red-400 hover:bg-red-500/15 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && users.length > 0 && (
          <div className="px-5 py-4 border-t border-[#262B2F] flex items-center justify-between">
            <span className="text-xs text-[#949599]">Page {page} of {totalPages}</span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <Modal open={showProfile} onClose={() => setShowProfile(false)} title="User Profile" size="lg">
        {profileLoading ? (
          <LoadingSpinner label="Loading profile..." className="py-10" />
        ) : profile ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center text-xl font-bold">
                {(profile.name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#EFEFF1]">{profile.name}</h3>
                <p className="text-sm text-[#949599]">{profile.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={roleVariant(profile.role)} size="sm">{profile.role}</Badge>
                  <Badge variant={userStatus(profile).variant} size="sm" dot>
                    {userStatus(profile).label}
                  </Badge>
                </div>
              </div>
            </div>
            {profile.isSuspended && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1">Suspension</p>
                <p className="text-sm text-[#EFEFF1]">{profile.suspendReason || 'No reason recorded'}</p>
                {profile.suspendedAt && (
                  <p className="text-xs text-[#949599] mt-1">Suspended {fmtDateTime(profile.suspendedAt)}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Phone', value: profile.phone || '—' },
                { label: 'Location', value: profile.city || profile.location || '—' },
                { label: 'Events', value: profile.eventsCount ?? profile.events ?? 0 },
                { label: 'Tickets', value: profile.ticketsCount ?? profile.tickets ?? 0 },
                { label: 'Joined', value: fmtDate(profile.createdAt) },
                { label: 'Last Active', value: profile.lastLoginAt ? fmtDateTime(profile.lastLoginAt) : (profile.lastActive ? fmtDate(profile.lastActive) : '—') },
                { label: 'Email Verified', value: profile.emailVerified ? 'Yes' : 'No' },
                { label: 'Date of Birth', value: profile.date_of_birth ? fmtDate(profile.date_of_birth) : '—' },
              ].map((f) => (
                <div key={f.label} className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3">
                  <p className="text-xs text-[#949599]">{f.label}</p>
                  <p className="mt-1 text-sm font-medium text-[#EFEFF1]">{f.value}</p>
                </div>
              ))}
            </div>
            {profile.passwordHash && (
              <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1">Stored Password</p>
                    <p className="text-xs text-[#949599]">
                      Passwords are stored as an irreversible <span className="text-white">bcrypt hash</span>. The plaintext password can never be recovered — reset it if the user forgot it.
                    </p>
                  </div>
                  <button
                    onClick={() => setRevealHash((v) => !v)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs text-[#949599] hover:text-[#EFEFF1] hover:border-white/40 transition"
                  >
                    {revealHash ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {revealHash ? 'Hide Hash' : 'View Hash'}
                  </button>
                </div>
                {revealHash && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 break-all rounded-lg bg-[#171A1D] border border-[#494F55]/30 px-3 py-2 text-[11px] text-[#9AA1A6] font-mono">{profile.passwordHash}</code>
                      <button
                        onClick={() => copyToClipboard(profile.passwordHash)}
                        className="p-2.5 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"
                        title="Copy hash"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-[#494F55]">This is the encrypted hash stored in the database — it cannot be used to log in directly.</p>
                  </div>
                )}
                <button
                  onClick={() => openReset(profile)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/10 text-white border border-white/20 text-xs font-semibold hover:bg-white/10 transition"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Reset Password
                </button>
              </div>
            )}
            {profile.organization && profile.organization.name && (
              <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2">Organization</p>
                <p className="text-sm text-[#EFEFF1]">{profile.organization.name}</p>
                <p className="text-xs text-[#949599] mt-1">{profile.organization.description}</p>
              </div>
            )}
          </div>
        ) : (
          <EmptyState title="User not found" className="py-10" />
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit User — ${editTarget?.name || ''}`}
        footer={
          <>
            <button onClick={() => setEditTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleSubmit(handleEdit)}
              disabled={actionLoading === editTarget?.id}
              className="px-4 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#E0C25A] transition disabled:opacity-50"
            >
              {actionLoading === editTarget?.id ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit(handleEdit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5">Full Name</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className={inputCls}
              placeholder="Full name"
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5">Email</label>
            <input
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
              })}
              className={inputCls}
              placeholder="user@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5">Phone</label>
              <input
                {...register('phone')}
                className={inputCls}
                placeholder="+233 ..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5">Role</label>
              <select {...register('role')} className={inputCls}>
                <option value="attendee">Attendee</option>
                <option value="organizer">Organizer</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-[#494F55]">Changing a user to Organizer creates their organizer profile; they will still need approval to publish events.</p>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Organizer Application"
        footer={
          <>
            <button onClick={() => setRejectTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleReject}
              disabled={actionLoading === rejectTarget?.id}
              className="px-4 py-3 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              Reject Application
            </button>
          </>
        }
      >
        <p className="text-sm text-[#949599]">
          You are about to reject <span className="font-semibold text-[#EFEFF1]">{rejectTarget?.name}</span>&apos;s organizer application. They will be notified with the reason.
        </p>
        <textarea
          placeholder="Reason for rejection (optional)..."
          onChange={(e) => setRejectTarget({ ...rejectTarget, reason: e.target.value })}
          className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none"
          rows={3}
        />
      </Modal>

      {/* Suspend Modal */}
      <Modal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title={isSuspendedUser(suspendTarget) ? 'Unsuspend User' : 'Suspend User'}
        footer={
          <>
            <button onClick={() => setSuspendTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleSuspend}
              disabled={actionLoading === suspendTarget?.id}
              className="px-4 py-3 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50"
            >
              {isSuspendedUser(suspendTarget) ? 'Unsuspend' : 'Suspend'}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#949599]">
          {isSuspendedUser(suspendTarget)
            ? `Are you sure you want to unsuspend ${suspendTarget?.name}? They will regain access.`
            : `You are about to suspend ${suspendTarget?.name}. They will lose access to the platform.`}
        </p>
        {isSuspendedUser(suspendTarget) && suspendTarget?.suspendReason && (
          <p className="mt-2 text-xs text-[#949599]">
            Suspension reason: <span className="text-[#EFEFF1]">{suspendTarget.suspendReason}</span>
          </p>
        )}
        {!isSuspendedUser(suspendTarget) && (
          <textarea
            placeholder="Reason for suspension (optional)..."
            onChange={(e) => setSuspendTarget({ ...suspendTarget, reason: e.target.value })}
            className="mt-3 w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 resize-none"
            rows={3}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === deleteTarget?.id}
              className="px-4 py-3 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              Delete
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[#EFEFF1]">Are you sure you want to permanently delete <span className="font-semibold">{deleteTarget?.name}</span>?</p>
            <p className="text-xs text-[#949599] mt-1">This action cannot be undone. All associated data (orders, tickets, events) will be removed.</p>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => { setResetTarget(null); setResetResult(null); }}
        title={`Reset Password — ${resetTarget?.name || ''}`}
        footer={
          resetResult ? (
            <button
              onClick={() => { setResetTarget(null); setResetResult(null); }}
              className="px-4 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#E0C25A] transition"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => { setResetTarget(null); setResetResult(null); }}
                className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={actionLoading === `reset-${resetTarget?.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#E0C25A] transition disabled:opacity-50"
              >
                {actionLoading === `reset-${resetTarget?.id}` ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {resetTarget?.password ? 'Set New Password' : 'Generate Temporary Password'}
              </button>
            </>
          )
        }
      >
        {resetResult ? (
          <div className="space-y-4">
            <p className="text-sm text-[#EFEFF1]">{resetResult.message}</p>
            {resetResult.temporaryPassword && (
              <div className="rounded-xl bg-white/10 border border-white/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white mb-2">Temporary Password</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 break-all rounded-lg bg-[#171A1D] border border-[#494F55]/30 px-3 py-2.5 text-sm text-[#EFEFF1] font-mono">
                    {resetResult.temporaryPassword}
                  </code>
                  <button
                    onClick={() => copyToClipboard(resetResult.temporaryPassword)}
                    className="p-2.5 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"
                    title="Copy password"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-3 text-xs text-[#949599]">
                  Share this once with the user — it won't be shown again. They'll also receive an in-app notification.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#949599]">
              You are about to reset <span className="font-semibold text-[#EFEFF1]">{resetTarget?.name}</span>'s password. Leave the field empty to generate a strong temporary password, or enter a custom one below.
            </p>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5">New Password (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resetTarget?.password || ''}
                  onChange={(e) => setResetTarget({ ...resetTarget, password: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
                />
                <button
                  onClick={fillRandomPassword}
                  className="px-3 py-3 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-xs text-[#949599] hover:text-[#EFEFF1] hover:border-white/40 transition whitespace-nowrap"
                >
                  Random
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[#494F55]">At least 8 characters with letters and numbers.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
