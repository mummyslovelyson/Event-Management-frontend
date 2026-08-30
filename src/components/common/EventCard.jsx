import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Calendar, Tag, Ticket, Share2, Bell, BellRing } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { toggleFavorite } from '@/api/users';
import { toggleEventReminder } from '@/api/events';
import { useCurrency } from '@/context/CurrencyContext';
import SocialShareModal from './SocialShareModal';

export default function EventCard({ event, onToggleFavorite, variant = 'default' }) {
  const { format } = useCurrency();
  const [fav, setFav] = useState(!!event.isFavorite);
  const [loading, setLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [reminded, setReminded] = useState(!!event.isReminded);
  const [reminderLoading, setReminderLoading] = useState(false);

  const handleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const prev = fav;
    setFav(!prev);
    try {
      await toggleFavorite(event.id);
      onToggleFavorite?.(event.id, !prev);
      toast.success(!prev ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      setFav(prev);
      toast.error('Could not update favorite');
    } finally {
      setLoading(false);
    }
  };

  const handleReminder = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setReminderLoading(true);
    const prev = reminded;
    setReminded(!prev);
    try {
      await toggleEventReminder(event.id);
      toast.success(!prev ? 'Event reminder set!' : 'Reminder removed');
    } catch {
      setReminded(prev);
      toast.error('Could not update reminder');
    } finally {
      setReminderLoading(false);
    }
  };

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShareOpen(true);
  };

  // The API returns snake_case columns (banner_image, min_price, start_date)
  // while some pages pass camelCase — accept both shapes.
  const img = event.image || event.banner_image || event.images?.[0] || '';
  const formattedDate = (event.startDate || event.start_date)
    ? new Date(event.startDate || event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBA';

  const minPrice = event.minPrice ?? event.price ?? event.min_price;
  const priceLabel =
    minPrice != null ? (minPrice === 0 ? 'Free' : format(minPrice)) : '—';

  if (variant === 'compact') {
    return (
      <>
        <Link
          to={`/events/${event.id}`}
          className="flex gap-3 p-3 rounded-xl bg-[#171A1D] border border-[#262B2F] hover:border-white/40 transition group"
        >
          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[#1C232B]">
            {img && <img src={img} alt={event.title} className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-white">{event.category}</span>
            <h4 className="text-sm font-semibold text-[#EFEFF1] truncate group-hover:text-white transition">{event.title}</h4>
            <p className="text-xs text-[#949599] flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" /> {formattedDate}
            </p>
          </div>
        </Link>
        <SocialShareModal open={shareOpen} onClose={() => setShareOpen(false)} event={event} />
      </>
    );
  }

  if (variant === 'list') {
    return (
      <>
        <motion.div
          whileHover={{ y: -2 }}
          className="group rounded-2xl overflow-hidden bg-[#171A1D] border border-[#262B2F] hover:border-white/40 hover:shadow-xl hover:shadow-black/25 transition-all p-4"
        >
          <Link to={`/events/${event.id}`} className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <div className="relative w-full sm:w-56 h-36 rounded-xl overflow-hidden shrink-0 bg-[#1C232B]">
              {img ? (
                <img
                  src={img}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Ticket className="w-10 h-10 text-[#494F55]" />
                </div>
              )}
              {event.category && (
                <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-[#1C232B]/90 text-white backdrop-blur-sm">
                  {event.category}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2 w-full">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[#EFEFF1] group-hover:text-white transition line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="text-xs text-[#949599] line-clamp-1 mt-0.5">
                    {event.description || 'Join us for this exciting live event.'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.preventDefault()}>
                  <button
                    onClick={handleReminder}
                    disabled={reminderLoading}
                    className={`p-2 rounded-full backdrop-blur-sm transition ${
                      reminded ? 'bg-amber-500/30 text-amber-400' : 'bg-[#1C232B] text-[#949599] hover:text-white'
                    }`}
                    title="Reminder"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleShareClick}
                    className="p-2 rounded-full bg-[#1C232B] text-[#949599] hover:text-white transition"
                    title="Share"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleFav}
                    disabled={loading}
                    className="p-2 rounded-full bg-[#1C232B] text-[#949599] hover:text-white transition"
                    title="Favorite"
                  >
                    <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-white text-white' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-[#949599] pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#CBD5E1]" /> {formattedDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#CBD5E1]" /> {event.venue || event.location || 'Venue TBA'}
                </span>
              </div>

              <div className="pt-3 border-t border-[#262B2F] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#6B7278]">From</span>
                  <span className="text-base font-extrabold text-white">{priceLabel}</span>
                </div>
                <span className="px-3.5 py-1.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold shadow group-hover:bg-[#CBD5E1] transition">
                  Get Tickets &rarr;
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
        <SocialShareModal open={shareOpen} onClose={() => setShareOpen(false)} event={event} />
      </>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group rounded-xl overflow-hidden bg-[#171A1D] border border-[#262B2F] hover:border-white/40 hover:shadow-xl hover:shadow-black/25 transition-all"
      >
        <Link to={`/events/${event.id}`} className="block">
          <div className="relative aspect-[16/10] overflow-hidden bg-[#1C232B]">
            {img ? (
              <img
                src={img}
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Ticket className="w-12 h-12 text-[#494F55]" />
              </div>
            )}
            {event.category && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-[#1C232B]/90 text-white backdrop-blur-sm">
                {event.category}
              </span>
            )}
            
            {/* Top Right Action Buttons (Reminder, Share & Favorite) */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <motion.button
                onClick={handleReminder}
                disabled={reminderLoading}
                whileTap={{ scale: 0.8 }}
                className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition disabled:opacity-50 ${
                  reminded
                    ? 'bg-amber-500/40 text-amber-400 border border-amber-500/60 shadow-lg shadow-amber-500/20'
                    : 'bg-[#1C232B]/90 text-[#EFEFF1] hover:text-amber-400 hover:scale-110'
                }`}
                aria-label="Set event reminder"
                title={reminded ? 'Reminder active (click to remove)' : 'Set event reminder'}
              >
                {reminded ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              </motion.button>
              <motion.button
                onClick={handleShareClick}
                whileTap={{ scale: 0.8 }}
                className="w-9 h-9 rounded-full bg-[#1C232B]/90 backdrop-blur-sm flex items-center justify-center text-[#EFEFF1] hover:text-white hover:scale-110 transition"
                aria-label="Share event"
                title="Share Event & Invite Squad"
              >
                <Share2 className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                onClick={handleFav}
                disabled={loading}
                whileTap={{ scale: 0.8 }}
                className="w-9 h-9 rounded-full bg-[#1C232B]/90 backdrop-blur-sm flex items-center justify-center text-[#EFEFF1] hover:scale-110 transition disabled:opacity-50"
                aria-label="Toggle favorite"
              >
                <motion.span
                  key={fav ? 'on' : 'off'}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 14 }}
                  className="flex"
                >
                  <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-[#EFEFF1] text-white' : ''}`} />
                </motion.span>
              </motion.button>
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-base font-semibold text-[#EFEFF1] line-clamp-1 group-hover:text-white transition">
              {event.title}
            </h3>
            <div className="mt-3 space-y-1.5">
              <p className="text-sm text-[#949599] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#494F55] shrink-0" />
                <span className="truncate">{formattedDate}</span>
              </p>
              <p className="text-sm text-[#949599] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#494F55] shrink-0" />
                <span className="truncate">{event.venue || event.location || 'Venue TBA'}</span>
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#262B2F] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#494F55]">From</span>
                <span className="text-lg font-bold text-white">{priceLabel}</span>
              </div>
              <span className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold group-hover:bg-white group-hover:text-[#1C232B] transition">
                View Details
              </span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Quick Share Modal */}
      <SocialShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        event={event}
      />
    </>
  );
}
