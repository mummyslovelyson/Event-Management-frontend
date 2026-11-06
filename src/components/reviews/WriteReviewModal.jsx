import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, X, Sparkles, CheckCircle2, ShieldCheck, Ticket, MessageSquarePlus,
  LogIn, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { createReview } from '@/api/users';
import { getUserTickets } from '@/api/tickets';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const RATING_LABELS = {
  5: '5.0 ★ Exceptional! Loved every moment.',
  4: '4.0 ★ Great experience! Highly recommended.',
  3: '3.0 ★ Good, met expectations.',
  2: '2.0 ★ Fair, room for improvement.',
  1: '1.0 ★ Disappointing experience.',
};

export default function WriteReviewModal({
  isOpen,
  onClose,
  onSuccess,
  defaultEventId = null,
  defaultEventTitle = '',
}) {
  const { isAuthenticated, user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId || '');
  const [eventsList, setEventsList] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultEventId) {
      setSelectedEventId(defaultEventId);
    }
  }, [defaultEventId]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      // Fetch user tickets to allow selecting which event they attended
      (async () => {
        setLoadingEvents(true);
        try {
          const res = await getUserTickets({ limit: 50 });
          const tList = res.data?.tickets || (Array.isArray(res.data) ? res.data : []);
          const seen = new Set();
          const uniqueEvents = [];
          for (const t of tList) {
            const ev = t.event || {};
            const eid = ev.id || t.eventId || t.event_id;
            if (eid && !seen.has(eid)) {
              seen.add(eid);
              uniqueEvents.push({ id: eid, title: ev.title || t.eventTitle || `Event #${eid}` });
            }
          }
          setEventsList(uniqueEvents);
        } catch {
          setEventsList([]);
        } finally {
          setLoadingEvents(false);
        }
      })();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please log in to submit a review');
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      toast.error('Please select a star rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a few words about your experience');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
        eventId: selectedEventId ? Number(selectedEventId) : undefined,
      };

      const res = await createReview(payload);
      toast.success(
        res.data?.message || 'Review submitted! It will appear on the homepage once approved by our team.',
        { duration: 5000 }
      );
      if (onSuccess) onSuccess(res.data?.review);
      setTitle('');
      setComment('');
      setRating(5);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-2xl bg-[#1C232B] border border-[#494F55]/40 shadow-2xl p-6 sm:p-7 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#494F55]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-white shrink-0">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#EFEFF1]">Share Your Review</h3>
                <p className="text-xs text-[#949599]">
                  Inspire the community & get featured on our homepage
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isAuthenticated ? (
            /* Auth Required State */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 text-white flex items-center justify-center mx-auto">
                <LogIn className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Login Required</h4>
                <p className="text-xs text-[#949599] max-w-xs mx-auto">
                  To prevent spam and keep reviews genuine, please log in to submit your verified attendee review.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  to="/login?redirect=/"
                  className="px-5 py-2.5 rounded-xl bg-white text-[#1C232B] font-bold text-xs hover:bg-[#CBD5E1] transition shadow-md"
                >
                  Log In
                </Link>
                <Link
                  to="/register?redirect=/"
                  className="px-5 py-2.5 rounded-xl bg-[#242B32] border border-[#494F55]/40 text-[#EFEFF1] font-bold text-xs hover:bg-[#2C343D] transition"
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* User Identity Chip */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#14191E] border border-[#494F55]/30 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-xs overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      (user?.name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="text-[#949599]">Posting as </span>
                    <strong className="text-white font-semibold">{user?.name || 'Attendee'}</strong>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> Verified Account
                </span>
              </div>

              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#CBD5E1] mb-2">
                  Rating <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= activeRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 rounded-lg hover:bg-white/5 transition transform active:scale-95"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={`w-7 h-7 transition-all ${
                            isFilled
                              ? 'text-white fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                              : 'text-[#494F55] fill-transparent'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-[#CBD5E1] font-medium">
                  {RATING_LABELS[activeRating] || `${activeRating} Stars`}
                </p>
              </div>

              {/* Event / Experience Tag */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#CBD5E1] mb-1.5">
                  What are you reviewing?
                </label>
                {defaultEventTitle ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#14191E] border border-[#494F55]/30 text-xs text-[#EFEFF1]">
                    <Ticket className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                    <span className="truncate">{defaultEventTitle}</span>
                  </div>
                ) : (
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-xs text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer"
                  >
                    <option value="">Tribes &amp; Cliqs Platform / Ticketing Experience</option>
                    {eventsList.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        Event: {ev.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Review Headline / Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#CBD5E1] mb-1.5">
                  Review Headline <span className="text-[11px] text-[#949599] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Unforgettable vibes & instant QR pass check-in!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-xs text-white placeholder:text-[#949599]/60 focus:outline-none focus:border-white/50 transition"
                />
              </div>

              {/* Review Text Area */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#CBD5E1] mb-1.5">
                  Your Review &amp; Experience <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  placeholder="Share details of your experience: the sound, ticketing speed, venue organization, and highlights..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#14191E] border border-[#494F55]/40 text-xs text-white placeholder:text-[#949599]/60 focus:outline-none focus:border-white/50 transition resize-none leading-relaxed"
                />
                <div className="flex justify-between text-[11px] text-[#949599] mt-1">
                  <span>Minimum 10 characters</span>
                  <span>{comment.length}/1000</span>
                </div>
              </div>

              {/* Admin Moderation Notice */}
              <div className="p-3 rounded-xl bg-[#14191E] border border-[#494F55]/30 flex items-start gap-2.5 text-[11px] text-[#CBD5E1] leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                <span>
                  <strong>Moderation Policy:</strong> All community reviews are reviewed by administrators to uphold authenticity before appearing live on the homepage.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#CBD5E1] hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50 shadow-md cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" /> Submitting...
                    </>
                  ) : (
                    <>
                      <MessageSquarePlus className="w-3.5 h-3.5" /> Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
