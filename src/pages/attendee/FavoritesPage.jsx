import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, Compass, Trash2, Search } from 'lucide-react';
import { getFavorites, toggleFavorite } from '@/api/users';
import EventCard from '@/components/common/EventCard';
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

export default function FavoritesPage() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getFavorites({ limit: 100 });
        const data = res.data?.events ?? res.data?.favorites ?? res.data ?? [];
        setFavorites(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Failed to load favorites');
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRemove = async (eventId) => {
    setFavorites((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await toggleFavorite(eventId);
      toast.success('Removed from favorites');
    } catch (err) {
      toast.error('Could not remove favorite');
      // Re-fetch to restore
      const res = await getFavorites({ limit: 100 });
      const data = res.data?.events ?? res.data?.favorites ?? res.data ?? [];
      setFavorites(Array.isArray(data) ? data : []);
    }
  };

  const filtered = favorites.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.title || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.venue || e.location || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading your favorites..." className="py-24" />;
  }

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#EFEFF1]">Favorites</h1>
          <p className="text-sm text-[#949599] mt-1">
            {favorites.length > 0
              ? `${favorites.length} event${favorites.length !== 1 ? 's' : ''} saved to your favorites.`
              : 'Events you save will appear here.'}
          </p>
        </div>
        {favorites.length > 0 && (
          <Link
            to="/attendee/explore"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors w-fit"
          >
            <Compass className="w-4 h-4" /> Explore More Events
          </Link>
        )}
      </motion.div>

      {/* Search */}
      {favorites.length > 0 && (
        <motion.div variants={itemFade} className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your favorites..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
          />
        </motion.div>
      )}

      {/* Content */}
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          description="Tap the heart icon on any event to save it here for quick access later."
          action={() => (window.location.href = '/attendee/explore')}
          actionLabel="Explore Events"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching favorites"
          description="Try a different search term."
        />
      ) : (
        <motion.div variants={containerStagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((event) => (
            <motion.div key={event.id} variants={itemFade} className="relative group">
              <EventCard event={{ ...event, isFavorite: true }} />
              <button
                onClick={() => handleRemove(event.id)}
                className="absolute top-2 left-2 z-10 w-11 h-11 rounded-lg bg-red-500/90 backdrop-blur-sm text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500"
                aria-label="Remove from favorites"
                title="Remove from favorites"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
