import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck, Clock, CheckCircle2, XCircle, Eye, Building2, Mail,
  Phone, CalendarDays, FileText, Percent, TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers, getUser, approveOrganizer, rejectOrganizer } from '@/api/admin';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function OrganizerApprovalsPage() {
  const [tab, setTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approvedThisMonth: 0, rejectionRate: 0 });
  const [reviewApp, setReviewApp] = useState(null);
  const [reviewData, setReviewData] = useState({ action: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const [tabRes, allRes] = await Promise.all([
        getUsers({ role: 'organizer', status: tab }),
        getUsers({ role: 'organizer' }),
      ]);
      const d = tabRes.data;
      const list = Array.isArray(d) ? d : d.users || d.data || [];
      setApplications(list);

      const all = Array.isArray(allRes.data) ? allRes.data : allRes.data?.users || [];
      const approved = all.filter((u) => u.is_approved === 1);
      const rejected = all.filter((u) => u.status === 'rejected' || u.status === 'suspended');
      setStats({
        total: all.length,
        pending: all.filter((u) => u.is_approved === 0 && u.status !== 'rejected' && u.status !== 'suspended').length,
        approvedThisMonth: approved.length,
        rejectionRate: approved.length + rejected.length
          ? Math.round((rejected.length / (approved.length + rejected.length)) * 100)
          : 0,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const openReview = async (app) => {
    setReviewApp(app);
    setReviewData({ action: '', reason: '' });
    try {
      const res = await getUser(app.id);
      setReviewApp(res.data.user || res.data);
    } catch {
      /* keep basic data */
    }
  };

  const handleReview = async () => {
    if (!reviewApp) return;
    const { action, reason } = reviewData;
    if (!action) return toast.error('Select Approve or Reject');
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await approveOrganizer(reviewApp.id);
        toast.success('Organizer approved');
      } else {
        await rejectOrganizer(reviewApp.id, { reason });
        toast.success('Organizer rejected');
      }
      setReviewApp(null);
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCheck}
        accent="gold"
        title="Organizer Approvals"
        subtitle="Approve or turn down organizer applications."
        count={stats.pending}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={UserCheck} label="Total Applications" value={stats.total.toLocaleString()} />
        <StatCard icon={Clock} label="Pending" value={stats.pending.toLocaleString()} />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approvedThisMonth.toLocaleString()} accent />
        <StatCard icon={TrendingDown} label="Rejection Rate" value={`${stats.rejectionRate}%`} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-[#D4AF37] text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Applications grid */}
      {loading ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <LoadingSpinner label="Loading applications..." className="py-16" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <EmptyState
            icon={UserCheck}
            title={`No ${tab} applications`}
            description={
              tab === 'pending' ? 'Nothing waiting on you right now.'
              : tab === 'approved' ? 'No approved applications to show.'
              : 'No applications were turned down.'
            }
            className="py-16"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {applications.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 hover:border-[#D4AF37]/40 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-sm font-bold">
                    {(app.name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#EFEFF1]">{app.name}</p>
                    <p className="text-xs text-[#949599]">{fmtDate(app.createdAt)}</p>
                  </div>
                </div>
                <Badge variant={tab === 'pending' ? 'pending' : tab === 'approved' ? 'success' : 'error'} size="sm">
                  {tab}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[#949599]">
                  <Mail className="w-4 h-4 shrink-0" /> <span className="truncate">{app.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[#949599]">
                  <Building2 className="w-4 h-4 shrink-0" /> <span className="truncate">{app.organizationName || app.organization?.name || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#949599]">
                  <Phone className="w-4 h-4 shrink-0" /> <span>{app.phone || '—'}</span>
                </div>
              </div>

              <button
                onClick={() => openReview(app)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-sm font-medium text-[#EFEFF1] hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition"
              >
                <Eye className="w-4 h-4" /> Review Application
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        open={!!reviewApp}
        onClose={() => setReviewApp(null)}
        title="Review Organizer Application"
        size="lg"
        footer={
          <>
            <button onClick={() => setReviewApp(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">Cancel</button>
            <button
              onClick={handleReview}
              disabled={actionLoading || !reviewData.action}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] transition disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : 'Submit Decision'}
            </button>
          </>
        }
      >
        {reviewApp && (
          <div className="space-y-5">
            {/* Profile header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xl font-bold">
                {(reviewApp.name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#EFEFF1]">{reviewApp.name}</h3>
                <p className="text-sm text-[#949599]">{reviewApp.email}</p>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Organization', value: reviewApp.organizationName || reviewApp.organization_name || reviewApp.organization?.name || '—' },
                { label: 'Phone', value: reviewApp.phone || '—' },
                { label: 'Location', value: reviewApp.city || reviewApp.location || '—' },
                { label: 'Applied', value: fmtDate(reviewApp.createdAt || reviewApp.created_at) },
              ].map((f) => (
                <div key={f.label} className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3">
                  <p className="text-xs text-[#949599]">{f.label}</p>
                  <p className="mt-1 text-sm font-medium text-[#EFEFF1]">{f.value}</p>
                </div>
              ))}
            </div>

            {(reviewApp.organization?.description || reviewApp.bio) && (
              <div className="rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2">About</p>
                <p className="text-sm text-[#EFEFF1] leading-relaxed">{reviewApp.organization?.description || reviewApp.bio}</p>
              </div>
            )}

            {reviewApp.organization?.documentUrl && (
              <div className="flex items-center gap-3 rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20 p-3">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                <a href={reviewApp.organization.documentUrl} target="_blank" rel="noreferrer" className="text-sm text-[#D4AF37] hover:underline">View verification document</a>
              </div>
            )}

            {/* Decision */}
            <div className="space-y-3 pt-2">
              <p className="text-sm font-semibold text-[#EFEFF1]">Decision</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReviewData((d) => ({ ...d, action: 'approve' }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition ${
                    reviewData.action === 'approve'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-[#1C232B]/50 text-[#949599] border-[#494F55]/30 hover:border-emerald-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" /> Approve
                </button>
                <button
                  onClick={() => setReviewData((d) => ({ ...d, action: 'reject' }))}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold transition ${
                    reviewData.action === 'reject'
                      ? 'bg-red-500/20 text-red-400 border-red-500/50'
                      : 'bg-[#1C232B]/50 text-[#949599] border-[#494F55]/30 hover:border-red-500/30'
                  }`}
                >
                  <XCircle className="w-5 h-5" /> Reject
                </button>
              </div>
              {reviewData.action === 'reject' && (
                <textarea
                  value={reviewData.reason}
                  onChange={(e) => setReviewData((d) => ({ ...d, reason: e.target.value }))}
                  placeholder="Reason for rejection (sent to applicant)..."
                  className="w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 resize-none"
                  rows={3}
                />
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
