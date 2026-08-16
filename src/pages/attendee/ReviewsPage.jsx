import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Star, Pencil, Trash2, Calendar, MapPin, MessageSquare, Award, Sparkles,
} from 'lucide-react';
import { getReviews, createReview, deleteReview } from '@/api/users';
import { getUserTickets } from '@/api/tickets';
import Modal from '@/components/common/Modal';
import StatCard from '@/components/common/StatCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [reviewModal, setReviewModal] = useState(null); // event object to review
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [reviewsRes, ticketsRes] = await Promise.allSettled([
          getReviews({ limit: 100 }),
          getUserTickets({ limit: 100 }),
        ]);
        const reviewData = reviewsRes.status === 'fulfilled' ? reviewsRes.value.data?.reviews ?? reviewsRes.value.data ?? [] : [];
        setReviews(Array.isArray(reviewData) ? reviewData : []);
        const ticketData = ticketsRes.status === 'fulfilled' ? ticketsRes.value.data?.tickets ?? ticketsRes.value.data ?? [] : [];
        setTickets(Array.isArray(ticketData) ? ticketData : []);
      } catch (err) {
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Past events not yet reviewed
  const eventsToReview = useMemo(() => {
    const now = new Date();
    const reviewedEventIds = new Set(reviews.map((r) => r.eventId || r.event?.id));
    const seen = new Map();
    tickets.forEach((t) => {
      const event = t.event || {};
      const eventId = event.id || t.eventId;
      if (!eventId) return;
      const eventDate = event.startDate || t.eventDate;
      if (!eventDate || new Date(eventDate) >= now) return;
      const status = (t.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'void') return;
      if (reviewedEventIds.has(eventId)) return;
      if (!seen.has(eventId)) seen.set(eventId, { ...event, id: eventId, ticketId: t.id });
    });
    return Array.from(seen.values());
  }, [tickets, reviews]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rt = Math.round(r.rating || 0);
      if (dist[rt] != null) dist[rt]++;
    });
    return dist;
  }, [reviews]);

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    if (rating < 1 || rating > 5) {
      toast.error('Please select a rating');
      return;
    }
    if (!reviewText.trim()) {
      toast.error('Please write a review');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createReview({
        eventId: reviewModal.id,
        rating,
        review: reviewText.trim(),
      });
      const newReview = res.data?.review ?? res.data;
      setReviews((prev) => [newReview, ...prev]);
      toast.success('Review submitted successfully!');
      setReviewModal(null);
      setRating(5);
      setReviewText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const prev = reviews;
    setReviews((p) => p.filter((r) => r.id !== id));
    try {
      await deleteReview(id);
      toast.success('Review deleted');
    } catch (err) {
      setReviews(prev);
      toast.error('Could not delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const openReviewModal = (event) => {
    setReviewModal(event);
    setRating(5);
    setHoverRating(0);
    setReviewText('');
  };

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading reviews..." className="py-24" />;
  }

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={itemFade}>
        <h1 className="text-2xl font-bold text-[#EFEFF1]">My Reviews</h1>
        <p className="text-sm text-[#949599] mt-1">Share your experience and help others discover great events.</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemFade} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={MessageSquare} label="Reviews Written" value={reviews.length} accent />
        <StatCard icon={Award} label="Average Rating Given" value={`${avgRating} / 5`} />
        <StatCard icon={Sparkles} label="Events to Review" value={eventsToReview.length} />
      </motion.div>

      {/* Rating distribution */}
      {reviews.length > 0 && (
        <motion.div variants={itemFade} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-4">Rating Distribution</p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star];
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 shrink-0">
                    <span className="text-sm text-[#EFEFF1]">{star}</span>
                    <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-[#242B32] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full bg-[#D4AF37]"
                    />
                  </div>
                  <span className="text-sm text-[#949599] w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Events to review */}
      <motion.div variants={itemFade}>
        <h2 className="text-lg font-bold text-[#EFEFF1] mb-4">Events to Review</h2>
        {eventsToReview.length === 0 ? (
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-8">
            <p className="text-sm text-[#949599] text-center">
              {reviews.length > 0 ? "You've reviewed all your past events. Great job!" : "No past events to review yet. Attend an event to leave a review."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventsToReview.map((event) => (
              <div key={event.id} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 flex flex-col">
                <div className="flex gap-3 items-start">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#242B32] shrink-0">
                    {event.image ? (
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#EFEFF1] line-clamp-1">{event.title}</h3>
                    <p className="text-xs text-[#949599] flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {event.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBA'}
                    </p>
                    {event.venue && (
                      <p className="text-xs text-[#494F55] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.venue}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openReviewModal(event)}
                  className="mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Write a Review
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Reviews I've written */}
      <motion.div variants={itemFade}>
        <h2 className="text-lg font-bold text-[#EFEFF1] mb-4">Reviews I've Written</h2>
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Share your thoughts on events you've attended to help other attendees."
          />
        ) : (
          <motion.div variants={containerStagger} className="space-y-4">
            {reviews.map((review) => {
              const event = review.event || {};
              return (
                <motion.div
                  key={review.id}
                  variants={itemFade}
                  className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 items-start min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#242B32] shrink-0">
                        {event.image ? (
                          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[#EFEFF1] truncate">{event.title || review.eventName || 'Event'}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${s <= (review.rating || 0) ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#494F55]'}`}
                            />
                          ))}
                          <span className="text-xs text-[#949599] ml-1">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      className="w-8 h-8 rounded-lg text-[#949599] hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center disabled:opacity-50 transition shrink-0"
                      title="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {review.review && (
                    <p className="mt-3 text-sm text-[#949599] leading-relaxed">{review.review}</p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>

      {/* Review form modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title="Write a Review"
        footer={
          <>
            <button onClick={() => setReviewModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">
              Cancel
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition"
            >
              <Pencil className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </>
        }
      >
        {reviewModal && (
          <div className="space-y-5">
            {/* Event info */}
            <div className="flex gap-3 items-center rounded-lg bg-[#1C232B] border border-[#262B2F] p-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#242B32] shrink-0">
                {reviewModal.image ? (
                  <img src={reviewModal.image} alt={reviewModal.title} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#EFEFF1] truncate">{reviewModal.title}</p>
                <p className="text-xs text-[#949599]">
                  {reviewModal.startDate ? new Date(reviewModal.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                </p>
              </div>
            </div>

            {/* Star rating */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-3">Your Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${s} star${s !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        s <= (hoverRating || rating)
                          ? 'fill-[#D4AF37] text-[#D4AF37]'
                          : 'text-[#494F55] hover:text-[#949599]'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium text-[#EFEFF1]">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || rating]}
                </span>
              </div>
            </div>

            {/* Review text */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">Your Review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={5}
                placeholder="Share details about your experience..."
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition resize-none"
              />
              <p className="text-xs text-[#494F55] mt-1.5">{reviewText.length} characters</p>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
