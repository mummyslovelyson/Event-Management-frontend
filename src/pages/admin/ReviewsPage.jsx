import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, CheckCircle2, XCircle, Clock, ShieldCheck, Sparkles,
  Search, RefreshCw, Trash2, Check, Globe, Eye, MessageSquare,
  AlertCircle, Ticket, User, Filter, MoreHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminReviews, approveAdminReview, rejectAdminReview,
  toggleFeatureAdminReview, deleteAdminReview,
} from '@/api/admin';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    avg_rating: 5.0,
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({ isOpen: false, review: null, notes: '' });
  // Delete confirm modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, review: null });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminReviews({
        status: tab,
        search: search.trim() || undefined,
        rating: ratingFilter || undefined,
      });
      const items = res.data?.reviews || (Array.isArray(res.data) ? res.data : []);
      setReviews(items);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [tab, search, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleApprove = async (review, featureOnHomepage = true) => {
    setActionLoadingId(review.id);
    try {
      await approveAdminReview(review.id, { is_featured: featureOnHomepage });
      toast.success(`Review by ${review.user_name || 'user'} approved & published to homepage!`);
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve review');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal.review) return;
    setActionLoadingId(rejectModal.review.id);
    try {
      await rejectAdminReview(rejectModal.review.id, { notes: rejectModal.notes.trim() });
      toast.success('Review status set to rejected');
      setRejectModal({ isOpen: false, review: null, notes: '' });
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject review');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleFeature = async (review) => {
    setActionLoadingId(review.id);
    try {
      const res = await toggleFeatureAdminReview(review.id);
      const isFeat = res.data?.is_featured;
      toast.success(isFeat ? 'Review featured on homepage!' : 'Review unfeatured from homepage');
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle featured status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteModal.review) return;
    setActionLoadingId(deleteModal.review.id);
    try {
      await deleteAdminReview(deleteModal.review.id);
      toast.success('Review permanently deleted');
      setDeleteModal({ isOpen: false, review: null });
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setActionLoadingId(null);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Reviews & Homepage Testimonials"
        subtitle="Moderate attendee reviews, approve submissions to publish live on the homepage, and feature top highlights."
      />

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Reviews"
          value={stats.total.toLocaleString()}
          icon={MessageSquare}
          color="white"
        />
        <div className="rounded-2xl bg-[#1C232B] border border-[#494F55]/40 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#949599] font-medium">Pending Moderation</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pending}</p>
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 mt-1">
                <Clock className="w-3 h-3" /> Needs Review
              </span>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#1C232B] border border-[#494F55]/40 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#949599] font-medium">Live on Homepage</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.approved}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-1">
              <Globe className="w-3 h-3" /> Published
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#1C232B] border border-[#494F55]/40 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#949599] font-medium">Average Rating</p>
            <p className="text-2xl font-bold text-white mt-1 flex items-center gap-1.5">
              <span>{Number(stats.avg_rating || 5.0).toFixed(1)}</span>
              <span className="text-xs text-[#949599] font-normal">/ 5.0</span>
            </p>
            <span className="text-[11px] text-[#CBD5E1]">Across approved reviews</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/[0.08] border border-white/10 text-white flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-white text-white" />
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1C232B] border border-[#494F55]/40 rounded-2xl p-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Reviews', count: stats.total },
            { id: 'pending', label: 'Pending Approval', count: stats.pending, alert: stats.pending > 0 },
            { id: 'approved', label: 'Approved & Live', count: stats.approved },
            { id: 'rejected', label: 'Rejected', count: stats.rejected },
          ].map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1C232B] shadow-md'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-[#1C232B] text-white'
                      : t.alert
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-white/10 text-[#949599]'
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Rating Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#949599] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, event, review..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-xs text-white placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition"
            />
          </div>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-xs text-[#CBD5E1] focus:outline-none focus:border-white/40 transition cursor-pointer"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <button
            onClick={fetchReviews}
            title="Refresh"
            className="p-2 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-[#CBD5E1] hover:text-white hover:bg-white/5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-20 text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-[#949599] mt-3">Loading review submissions...</p>
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={tab === 'pending' ? 'No Pending Reviews' : 'No Reviews Found'}
          description={
            tab === 'pending'
              ? 'All submitted attendee reviews have been moderated. New submissions will appear here for verification.'
              : 'No reviews matched your current search and filter criteria.'
          }
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isPending = rev.status === 'pending' || (!rev.is_approved && rev.status !== 'rejected');
            const isApproved = rev.status === 'approved' || rev.is_approved;
            const isRejected = rev.status === 'rejected';
            const isProcessing = actionLoadingId === rev.id;

            const reviewerInitials = (rev.user_name || 'Attendee')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <motion.div
                key={rev.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl bg-[#1C232B] border p-5 transition-all shadow-md ${
                  isPending
                    ? 'border-amber-500/40 bg-gradient-to-r from-[#1C232B] to-amber-950/10'
                    : 'border-[#494F55]/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Column: Author, Rating, Content */}
                  <div className="space-y-3.5 flex-1 min-w-0">
                    {/* Author & Event Row */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                        {rev.user_avatar ? (
                          <img src={rev.user_avatar} alt={rev.user_name} className="w-full h-full object-cover" />
                        ) : (
                          reviewerInitials
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#EFEFF1] truncate">
                            {rev.user_name || 'Verified Attendee'}
                          </h4>
                          {rev.is_verified_buyer && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-md border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> Ticket Holder
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#949599]">{rev.user_email || 'No email'}</p>
                      </div>

                      {/* Tag: Event or Platform */}
                      <div className="ml-auto sm:ml-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#14191E] border border-[#494F55]/40 text-xs text-[#CBD5E1]">
                        <Ticket className="w-3 h-3 text-[#CBD5E1]" />
                        <span className="truncate max-w-[200px]">
                          {rev.event_title ? `Event: ${rev.event_title}` : 'Platform Experience'}
                        </span>
                      </div>
                    </div>

                    {/* Stars & Title */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= rev.rating ? 'text-white fill-white' : 'text-[#494F55] fill-[#494F55]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-white">{Number(rev.rating).toFixed(1)} / 5.0</span>
                      </div>

                      {rev.title && (
                        <h5 className="text-sm font-bold text-white mb-1">
                          &ldquo;{rev.title}&rdquo;
                        </h5>
                      )}

                      <p className="text-xs text-[#CBD5E1] leading-relaxed whitespace-pre-line bg-[#14191E] p-3 rounded-xl border border-[#494F55]/30">
                        {rev.comment}
                      </p>
                    </div>

                    {/* Metadata & Admin Notes */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#949599] pt-1">
                      <span>Submitted: {fmtDate(rev.created_at)}</span>
                      {rev.approved_at && <span>&bull; Approved: {fmtDate(rev.approved_at)}</span>}
                      {rev.admin_notes && (
                        <span className="text-amber-300 font-medium">
                          &bull; Note: &ldquo;{rev.admin_notes}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Status Badges & Admin Actions */}
                  <div className="flex flex-row lg:flex-col lg:items-end justify-between lg:justify-start gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#494F55]/30">
                    {/* Status Indicators */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                          <Globe className="w-3 h-3" /> Live on Homepage
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
                          <Clock className="w-3 h-3" /> Pending Approval
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                      {rev.is_featured && isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-bold">
                          <Sparkles className="w-3 h-3" /> Featured
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Approve Button */}
                      {(!isApproved || isRejected) && (
                        <button
                          onClick={() => handleApprove(rev, true)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve &amp; Publish
                        </button>
                      )}

                      {/* Feature on Homepage Toggle */}
                      {isApproved && (
                        <button
                          onClick={() => handleToggleFeature(rev)}
                          disabled={isProcessing}
                          title={rev.is_featured ? 'Remove from Featured' : 'Feature on Homepage'}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                            rev.is_featured
                              ? 'bg-white/15 border-white/30 text-white'
                              : 'bg-[#14191E] border-[#494F55]/40 text-[#CBD5E1] hover:text-white'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {rev.is_featured ? 'Featured' : 'Feature'}
                        </button>
                      )}

                      {/* Reject Button */}
                      {!isRejected && (
                        <button
                          onClick={() => setRejectModal({ isOpen: true, review: rev, notes: '' })}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242B32] border border-[#494F55]/50 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition text-xs font-semibold"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, review: rev })}
                        disabled={isProcessing}
                        title="Delete permanently"
                        className="p-2 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-[#949599] hover:text-red-400 hover:border-red-500/30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, review: null, notes: '' })}
        title="Reject Review Submission"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#CBD5E1]">
            Are you sure you want to decline this review by{' '}
            <strong>{rejectModal.review?.user_name || 'this attendee'}</strong>? It will not be shown on the homepage.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
              Internal Admin Note / Rejection Reason <span className="text-[#949599]">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Spam / Advertising external links / Inappropriate language..."
              value={rejectModal.notes}
              onChange={(e) => setRejectModal((p) => ({ ...p, notes: e.target.value }))}
              className="w-full p-3 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-xs text-white placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setRejectModal({ isOpen: false, review: null, notes: '' })}
              className="px-4 py-2 rounded-xl text-xs text-[#CBD5E1] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectSubmit}
              className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, review: null })}
        title="Delete Review Permanently"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#CBD5E1]">
            This action cannot be undone. This review by{' '}
            <strong>{deleteModal.review?.user_name || 'this attendee'}</strong> will be permanently removed from the database.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteModal({ isOpen: false, review: null })}
              className="px-4 py-2 rounded-xl text-xs text-[#CBD5E1] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSubmit}
              className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition"
            >
              Delete Review
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
