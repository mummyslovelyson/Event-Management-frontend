import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Mail, Trash2, Clock, Shield, CheckSquare, Square,
  UsersRound, Crown, Eye, Ticket as TicketIcon, ShoppingBag, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getTeamMembers, inviteTeamMember, removeTeamMember,
  getPendingInvites, cancelInvite, resendInvite,
} from '@/api/organizer';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const inputCls = 'w-full px-4 py-3.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition';

const ROLES = {
  Manager: {
    variant: 'gold',
    icon: Crown,
    desc: 'Full access. Can manage events, orders, team members, wallet, and settings.',
    perms: ['Manage Events', 'View Reports', 'Check-in', 'Manage Orders', 'Manage Team', 'Manage Wallet'],
  },
  Inspector: {
    variant: 'info',
    icon: Eye,
    desc: 'Focused on event operations. Can check in attendees and view event details.',
    perms: ['Check-in', 'View Events'],
  },
  Staff: {
    variant: 'neutral',
    icon: Shield,
    desc: 'Support role. Can manage orders and assist with check-in.',
    perms: ['Manage Orders', 'Check-in'],
  },
};

const ALL_PERMISSIONS = ['Manage Events', 'View Reports', 'Check-in', 'Manage Orders', 'Manage Team', 'Manage Wallet'];

const PERM_ICONS = {
  'Manage Events': TicketIcon,
  'View Reports': Eye,
  'Check-in': CheckSquare,
  'Manage Orders': ShoppingBag,
  'Manage Team': UsersRound,
  'Manage Wallet': Crown,
};

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Invite form
  const [iForm, setIForm] = useState({ email: '', role: 'Staff', permissions: ['Manage Events', 'Check-in'] });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, invRes] = await Promise.allSettled([getTeamMembers(), getPendingInvites()]);
      if (memRes.status === 'fulfilled') {
        const p = memRes.value.data;
        setMembers(Array.isArray(p) ? p : p.members || p.data || []);
      }
      if (invRes.status === 'fulfilled') {
        const p = invRes.value.data;
        setInvites(Array.isArray(p) ? p : p.invites || p.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const togglePerm = (perm) => {
    setIForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const handleRoleChange = (role) => {
    setIForm((f) => ({ ...f, role, permissions: ROLES[role].perms }));
  };

  const submitInvite = async (e) => {
    e?.preventDefault();
    if (!iForm.email) { toast.error('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(iForm.email)) { toast.error('Enter a valid email'); return; }
    setSubmitting(true);
    try {
      await inviteTeamMember({ email: iForm.email, role: iForm.role, permissions: iForm.permissions });
      toast.success(`Invitation sent to ${iForm.email}`);
      setInviteModal(false);
      setIForm({ email: '', role: 'Staff', permissions: ['Manage Events', 'Check-in'] });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeTeamMember(removeTarget.id);
      toast.success('Team member removed');
      setRemoveTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  const handleResend = async (inv) => {
    try {
      await resendInvite(inv.id);
      toast.success('Invitation resent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    }
  };

  const handleCancelInvite = async (inv) => {
    try {
      await cancelInvite(inv.id);
      toast.success('Invitation cancelled');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const initials = (name) => (name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={UsersRound}
        accent="violet"
        title="Team"
        subtitle="Manage team members, roles, and permissions."
        actions={
          <button onClick={() => setInviteModal(true)} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0">
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        }
      />

      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(ROLES).map(([role, info]) => {
          const Icon = info.icon;
          return (
            <div key={role} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  info.variant === 'gold' ? 'bg-white/10 text-white' :
                  info.variant === 'info' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-[#494F55]/30 text-[#949599]'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[#EFEFF1]">{role}</h3>
              </div>
              <p className="mt-3 text-sm text-[#949599] leading-relaxed">{info.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {info.perms.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#494F55]/20 text-[#949599] border border-[#262B2F]">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading team..." className="py-16" />
      ) : (
        <>
          {/* Current members */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#EFEFF1] flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-white" /> Current Members
              <span className="text-sm text-[#949599] font-normal">({members.length})</span>
            </h2>
            {members.length === 0 ? (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
                <EmptyState icon={UsersRound} title="No team members" description="Invite team members to help manage your events." className="py-12" />
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {members.map((m) => {
                    const role = m.role || 'Staff';
                    const roleInfo = ROLES[role] || ROLES.Staff;
                    const perms = m.permissions || roleInfo.perms;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 hover:border-[#494F55]/50 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                              {initials(m.name || m.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#EFEFF1] truncate">{m.name || m.email}</p>
                              <p className="text-xs text-[#949599] truncate">{m.email}</p>
                              {m.dateAdded && (
                                <p className="text-[10px] text-[#494F55] mt-0.5">Added {new Date(m.dateAdded).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={roleInfo.variant} size="sm">{role}</Badge>
                          </div>

                          <div className="flex flex-wrap gap-1.5 lg:max-w-[280px]">
                            {perms.map((p) => (
                              <span key={p} className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#494F55]/20 text-[#949599] border border-[#262B2F]">
                                {p}
                              </span>
                            ))}
                          </div>

                          {!m.isOwner && (
                            <button
                              onClick={() => setRemoveTarget(m)}
                              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-[#949599] border border-[#262B2F] hover:text-red-400 hover:border-red-500/30 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Pending invitations */}
          {invites.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#EFEFF1] flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" /> Pending Invitations
                <span className="text-sm text-[#949599] font-normal">({invites.length})</span>
              </h2>
              <div className="space-y-3">
                {invites.map((inv) => (
                  <div key={inv.id} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#494F55]/30 text-[#949599] flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#EFEFF1] truncate">{inv.email}</p>
                          <p className="text-xs text-[#949599]">
                            Invited as <span className="text-white">{inv.role || 'Staff'}</span>
                            {inv.createdAt && ` · ${new Date(inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="pending" size="sm" dot>Awaiting</Badge>
                        <button onClick={() => handleResend(inv)} className="p-2.5 rounded-md text-[#949599] hover:text-white hover:bg-[#494F55]/30 transition" title="Resend">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleCancelInvite(inv)} className="p-2.5 rounded-md text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Invite Modal */}
      <Modal
        open={inviteModal}
        onClose={() => setInviteModal(false)}
        title="Invite Team Member"
        size="lg"
        footer={
          <>
            <button onClick={() => setInviteModal(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitInvite} disabled={submitting} className="px-4 py-3 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">
              {submitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </>
        }
      >
        <form onSubmit={submitInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              value={iForm.email}
              onChange={(e) => setIForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Enter teammate email"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(ROLES).map((role) => {
                const Icon = ROLES[role].icon;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-sm font-medium transition ${
                      iForm.role === role
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-[#1C232B] border-[#494F55]/40 text-[#949599] hover:border-[#494F55]/60'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = iForm.permissions.includes(perm);
                const Icon = PERM_ICONS[perm] || CheckSquare;
                return (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePerm(perm)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition text-left ${
                      checked
                        ? 'bg-white/10 border-white/20 text-[#EFEFF1]'
                        : 'bg-[#1C232B] border-[#494F55]/40 text-[#949599] hover:border-[#494F55]/60'
                    }`}
                  >
                    {checked ? <CheckSquare className="w-4 h-4 text-white shrink-0" /> : <Square className="w-4 h-4 text-[#494F55] shrink-0" />}
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{perm}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#494F55]">Selecting a role above auto-fills default permissions. Adjust as needed.</p>
          </div>
        </form>
      </Modal>

      {/* Remove confirm */}
      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Team Member"
        footer={
          <>
            <button onClick={() => setRemoveTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleRemove} disabled={removing} className="px-4 py-3 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition">
              {removing ? 'Removing...' : 'Remove'}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#949599]">
          Remove <span className="font-semibold text-[#EFEFF1]">{removeTarget?.name || removeTarget?.email}</span> from the team? They will lose all access immediately.
        </p>
      </Modal>
    </div>
  );
}
