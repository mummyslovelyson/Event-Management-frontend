import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, ShieldCheck, CheckCircle2, Building2, Mail, Phone,
  MapPin, Tag, Globe, RefreshCw, LogOut, ArrowRight, ExternalLink,
  Sparkles, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function OrganizerPendingApproval() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const updated = await refreshProfile();
      if (updated?.is_approved || updated?.isApproved) {
        toast.success('Congratulations! Your organizer account has been approved. Welcome to your dashboard!', { duration: 6000 });
        window.location.reload();
      } else {
        toast('Your application is still under review by our operations team. We will notify you as soon as it is approved.', {
          icon: '⏳',
          duration: 4500,
        });
      }
    } catch {
      toast.error('Unable to refresh status at this time. Please try again shortly.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const orgName = user?.organization_name || user?.organizationName || user?.name || 'Your Organization';
  const category = user?.category || user?.organization?.category || 'Events & Entertainment';
  const city = user?.city || user?.location || 'Not specified';
  const bio = user?.bio || user?.description || user?.organization?.description || '';
  const website = user?.website || user?.organization?.website || '';

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl space-y-6"
      >
        {/* Main Status Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1C232B] to-[#161D22] border border-[#494F55]/40 shadow-2xl p-6 sm:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262B2F]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Account Under Review
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#EFEFF1]">
                  Organizer Application Pending Approval
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white text-[#1C232B] text-xs sm:text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking...' : 'Check Status'}
              </button>
            </div>
          </div>

          {/* Explanation banner */}
          <div className="mt-6 p-4 rounded-xl bg-[#111417]/80 border border-[#262B2F] flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-[#949599] leading-relaxed">
              Welcome, <strong className="text-[#EFEFF1]">{user?.name || 'Organizer'}</strong>! Your account has been verified. To maintain trust and event safety across Tribes &amp; Cliqs, our administration team reviews all organizer submissions before granting access to publish events and sell tickets.
            </p>
          </div>

          {/* Live Step Progress */}
          <div className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-4">
              Application Progress Timeline
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl bg-[#171A1D] border border-emerald-500/30 relative">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Step 1 · Completed</span>
                </div>
                <p className="text-sm font-semibold text-[#EFEFF1]">Account &amp; Verification</p>
                <p className="text-xs text-[#949599] mt-0.5">Email &amp; phone OTP verified</p>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 relative">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <Clock className="w-4 h-4 shrink-0 animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider">Step 2 · In Progress</span>
                </div>
                <p className="text-sm font-semibold text-amber-200">Admin KYC Review</p>
                <p className="text-xs text-[#949599] mt-0.5">Operations team review</p>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl bg-[#171A1D]/60 border border-[#262B2F] opacity-75">
                <div className="flex items-center gap-2 text-[#6B7278] mb-1">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Step 3 · Pending</span>
                </div>
                <p className="text-sm font-semibold text-[#949599]">Dashboard &amp; Ticketing</p>
                <p className="text-xs text-[#6B7278] mt-0.5">Unlocks upon approval</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary of Submitted Data */}
        <div className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-6 sm:p-7">
          <h2 className="text-sm font-semibold text-[#EFEFF1] mb-1">
            Submitted Organization Details
          </h2>
          <p className="text-xs text-[#949599] mb-5">
            Below is the information you provided during registration, currently visible to the admin review board.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Building2 className="w-3.5 h-3.5" /> Organization / Brand
              </div>
              <p className="text-sm font-medium text-[#EFEFF1]">{orgName}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Tag className="w-3.5 h-3.5" /> Event Category
              </div>
              <p className="text-sm font-medium text-[#EFEFF1]">{category}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Mail className="w-3.5 h-3.5" /> Verified Email
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#EFEFF1] truncate">{user?.email}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0 font-semibold">
                  Verified
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Phone className="w-3.5 h-3.5" /> Contact Phone
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#EFEFF1]">{user?.phone || '—'}</p>
                {user?.phone && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0 font-semibold">
                    Verified
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <MapPin className="w-3.5 h-3.5" /> City / Region
              </div>
              <p className="text-sm font-medium text-[#EFEFF1]">{city}</p>
            </div>

            <div className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Globe className="w-3.5 h-3.5" /> Website / Social Handle
              </div>
              {website ? (
                <a
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-blue-400 hover:underline flex items-center gap-1.5 truncate"
                >
                  <span className="truncate">{website}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <p className="text-sm text-[#6B7278]">—</p>
              )}
            </div>
          </div>

          {bio && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-[#1C232B] border border-[#262B2F]">
              <p className="text-xs text-[#949599] mb-1 font-medium">Organization Bio &amp; Scope</p>
              <p className="text-sm text-[#EFEFF1] leading-relaxed whitespace-pre-wrap">{bio}</p>
            </div>
          )}

          {/* Email and SMS Alert notification notice */}
          <div className="mt-5 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-300">
                Automatic Notification Alert
              </p>
              <p className="text-xs text-[#949599] mt-0.5 leading-relaxed">
                As soon as an administrator approves your account, you will immediately receive an <strong>Email and SMS alert</strong> notifying you that your dashboard is active and ready for event publishing.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm font-medium text-[#EFEFF1] hover:border-white/40 hover:text-white transition"
          >
            <Globe className="w-4 h-4" /> Explore Public Website
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#949599] hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
