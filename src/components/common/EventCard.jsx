import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Calendar, Tag, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { toggleFavorite } from '@/api/users';
import { useCurrency } from '@/context/CurrencyContext';

export default function EventCard({ event, onToggleFavorite, variant = 'default' }) {
  const { format } = useCurrency();
  const [fav, setFav] = useState(!!event.isFavorite);
  const [loading, setLoading] = useState(false);

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
    );
  }

  return (
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
          <motion.button
            onClick={handleFav}
            disabled={loading}
            whileTap={{ scale: 0.8 }}
            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-[#1C232B]/90 backdrop-blur-sm flex items-center justify-center text-[#EFEFF1] hover:scale-110 transition disabled:opacity-50"
            aria-label="Toggle favorite"
          >
            <motion.span
              key={fav ? 'on' : 'off'}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 14 }}
              className="flex"
            >
              <Heart className={`w-4 h-4 ${fav ? 'fill-[#EFEFF1] text-white' : ''}`} />
            </motion.span>
          </motion.button>
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
            <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold group-hover:bg-white group-hover:text-[#1C232B] transition">
              View Details
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
