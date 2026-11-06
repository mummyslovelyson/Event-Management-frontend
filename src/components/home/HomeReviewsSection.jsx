import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, MessageSquarePlus, ShieldCheck, CheckCircle2, Sparkles,
  Quote, Calendar, Ticket, ChevronRight,
} from 'lucide-react';
import { getPublicReviews } from '@/api/events';
import WriteReviewModal from '@/components/reviews/WriteReviewModal';

export default function HomeReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 5.0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await getPublicReviews({ limit: 12 });
      const items = res.data?.reviews || (Array.isArray(res.data) ? res.data : []);
      setReviews(items);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fmtDate = (d) => {
    if (!d) return 'Recently';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-[#0E1217] border-y border-white/[0.08] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold text-[#CBD5E1] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Community Reviews &amp; Testimonials</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Loved by Fans, Verified by Us
            </h2>
            <p className="mt-2 text-sm text-[#949599] max-w-2xl leading-relaxed">
              Real reviews from concertgoers, festival lovers, and event attendees across Ghana. Every ticket and entry is verified.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {stats.totalReviews > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#14191E] border border-white/10 text-xs text-[#CBD5E1]">
                <div className="flex items-center text-white">
                  <Star className="w-4 h-4 fill-white text-white mr-1" />
                  <span className="font-bold text-sm text-white">{stats.averageRating.toFixed(1)}</span>
                </div>
                <span className="text-[#949599]">&bull;</span>
                <span className="text-[#949599]">{stats.totalReviews} verified {stats.totalReviews === 1 ? 'review' : 'reviews'}</span>
              </div>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#14191E] text-xs font-bold hover:bg-[#CBD5E1] transition shadow-md active:scale-95 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Write a Review
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[#14191E] border border-white/[0.08] p-6 animate-pulse h-56 space-y-4"
              >
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-16 bg-white/5 rounded w-full" />
                <div className="h-8 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((rev) => {
              const reviewerInitials = (rev.user_name || 'Attendee')
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={rev.id}
                  className="rounded-2xl bg-[#14191E] border border-white/[0.08] p-6 flex flex-col justify-between hover:border-white/20 transition-all duration-300 shadow-lg group relative"
                >
                  <div>
                    {/* Header: Stars & Feature Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating
                                ? 'text-white fill-white'
                                : 'text-neutral-700 fill-neutral-700'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 text-xs font-bold text-white">
                          {Number(rev.rating).toFixed(1)}
                        </span>
                      </div>

                      {rev.is_featured && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                          <Sparkles className="w-2.5 h-2.5" /> Featured
                        </span>
                      )}
                    </div>

                    {/* Review Title */}
                    {rev.title && (
                      <h4 className="text-sm font-bold text-white mb-2 line-clamp-1 group-hover:text-[#CBD5E1] transition">
                        &ldquo;{rev.title}&rdquo;
                      </h4>
                    )}

                    {/* Review Comment */}
                    <p className="text-xs text-[#CBD5E1] leading-relaxed line-clamp-4 relative">
                      {rev.comment}
                    </p>

                    {/* Associated Event Tag (if applicable) */}
                    {rev.event_title && (
                      <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-[#949599]">
                        <Ticket className="w-3 h-3 text-[#CBD5E1]" />
                        <span className="truncate max-w-[220px]">{rev.event_title}</span>
                      </div>
                    )}
                  </div>

                  {/* Reviewer Footer */}
                  <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                        {rev.user_avatar ? (
                          <img
                            src={rev.user_avatar}
                            alt={rev.user_name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          reviewerInitials
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{rev.user_name || 'Verified Attendee'}</p>
                        <p className="text-[10px] text-[#949599]">{fmtDate(rev.approved_at || rev.created_at)}</p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State - Call to action to leave the first review */
          <div className="rounded-2xl bg-[#14191E] border border-white/[0.08] p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 text-white flex items-center justify-center mx-auto">
              <Star className="w-7 h-7 text-white fill-white/20" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Be the First to Share Your Experience</h3>
              <p className="text-xs text-[#949599] max-w-md mx-auto leading-relaxed">
                Have you booked tickets or attended an event on Tribes &amp; Cliqs? Write a review, share your story, and get featured right here on the homepage.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#14191E] text-xs font-bold hover:bg-[#CBD5E1] transition shadow-md active:scale-95 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Write the First Review
            </button>
          </div>
        )}
      </div>

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchReviews();
        }}
      />
    </section>
  );
}
