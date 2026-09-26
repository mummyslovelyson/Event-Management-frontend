import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Heart, Compass, Trash2, Search, Bell, BellRing, Music, Tag,
  Users, Sparkles, Plus, ExternalLink, Calendar, MapPin, Check,
  Settings, Clock, AlertCircle, ChevronRight, UserCheck, UserX,
} from 'lucide-react';
import {
  getFavorites, toggleFavorite,
  getFollowingSummary, followArtist, unfollowArtist,
  followCategory, unfollowCategory, unfollowOrganizer,
} from '@/api/users';
import { getUserReminders, getCategories } from '@/api/events';
import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import ReminderModal from '@/components/common/ReminderModal';
import FollowArtistButton from '@/components/common/FollowArtistButton';
import FollowCategoryButton from '@/components/common/FollowCategoryButton';

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const SUGGESTED_ARTISTS = [
  'Sarkodie', 'Stonebwoy', 'Black Sherif', 'King Promise', 'Shatta Wale',
  'Kuami Eugene', 'KiDi', 'Gyakie', 'Camidoh', 'Kweku Flick',
];

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'artists' | 'categories' | 'organizers' | 'reminders'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Data states
  const [favorites, setFavorites] = useState([]);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [reminders, setReminders] = useState([]);

  // New artist input
  const [newArtistName, setNewArtistName] = useState('');
  const [addingArtist, setAddingArtist] = useState(false);

  // Active reminder modal target
  const [selectedReminderEvent, setSelectedReminderEvent] = useState(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [favRes, sumRes, remRes, catRes] = await Promise.allSettled([
        getFavorites({ limit: 100 }),
        getFollowingSummary(),
        getUserReminders(),
        getCategories(),
      ]);

      if (favRes.status === 'fulfilled') {
        const favData = favRes.value.data?.events ?? favRes.value.data?.favorites ?? favRes.value.data ?? [];
        setFavorites(Array.isArray(favData) ? favData : []);
      }
      if (sumRes.status === 'fulfilled') {
        const sum = sumRes.value.data || {};
        setArtists(Array.isArray(sum.artists) ? sum.artists : []);
        setCategories(Array.isArray(sum.categories) ? sum.categories : []);
        setOrganizers(Array.isArray(sum.organizers) ? sum.organizers : []);
      }
      if (remRes.status === 'fulfilled') {
        const remData = remRes.value.data?.reminders ?? remRes.value.data ?? [];
        setReminders(Array.isArray(remData) ? remData : []);
      }
      if (catRes.status === 'fulfilled') {
        const catData = catRes.value.data || [];
        setAllCategories(Array.isArray(catData) ? catData : []);
      }
    } catch {
      toast.error('Failed to load following & favorites data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRemoveFavorite = async (eventId) => {
    setFavorites((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await toggleFavorite(eventId);
      toast.success('Removed from favorites');
    } catch {
      toast.error('Could not remove favorite');
      loadAllData();
    }
  };

  const handleAddArtist = async (e) => {
    e?.preventDefault();
    const name = newArtistName.trim();
    if (!name) return;
    setAddingArtist(true);
    try {
      await followArtist(name);
      toast.success(`Following ${name}! You'll be notified when they have events in Accra.`);
      setNewArtistName('');
      setArtists((prev) => [{ id: Date.now(), name, artist_name: name, followedAt: new Date().toISOString() }, ...prev]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not follow artist');
    } finally {
      setAddingArtist(false);
    }
  };

  const handleUnfollowArtist = async (name) => {
    try {
      await unfollowArtist(name);
      setArtists((prev) => prev.filter((a) => (a.name || a.artist_name || '').toLowerCase() !== name.toLowerCase()));
      toast.success(`Unfollowed ${name}`);
    } catch {
      toast.error('Could not unfollow artist');
    }
  };

  const handleUnfollowCategory = async (catName) => {
    try {
      await unfollowCategory(catName);
      setCategories((prev) => prev.filter((c) => (c.name || c.category_name || '').toLowerCase() !== catName.toLowerCase()));
      toast.success(`Unfollowed ${catName}`);
    } catch {
      toast.error('Could not unfollow category');
    }
  };

  const handleUnfollowOrg = async (orgId) => {
    try {
      await unfollowOrganizer(orgId);
      setOrganizers((prev) => prev.filter((o) => o.id !== orgId && o.organizer_id !== orgId));
      toast.success('Unfollowed organizer');
    } catch {
      toast.error('Could not unfollow organizer');
    }
  };

  const filteredFavorites = favorites.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (e.title || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q) ||
      (e.venue || e.location || '').toLowerCase().includes(q)
    );
  });

  const filteredReminders = reminders.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.title || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.venue || r.city || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading favorites & following..." className="py-24" />;
  }

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#EFEFF1]">Favorites & Following</h1>
          <p className="text-sm text-[#949599] mt-1">
            Manage your saved events, followed artists, organizers, categories, and event reminders.
          </p>
        </div>
        <Link
          to="/explore"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors w-fit shadow"
        >
          <Compass className="w-4 h-4" /> Explore Events
        </Link>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemFade} className="flex items-center gap-2 border-b border-[#262B2F] overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'events'
              ? 'border-white text-white'
              : 'border-transparent text-[#949599] hover:text-[#EFEFF1]'
          }`}
        >
          <Heart className="w-4 h-4 text-red-400" />
          <span>Saved Events</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white font-mono">
            {favorites.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('artists')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'artists'
              ? 'border-white text-white'
              : 'border-transparent text-[#949599] hover:text-[#EFEFF1]'
          }`}
        >
          <Music className="w-4 h-4 text-amber-400" />
          <span>Followed Artists</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white font-mono">
            {artists.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-white text-white'
              : 'border-transparent text-[#949599] hover:text-[#EFEFF1]'
          }`}
        >
          <Tag className="w-4 h-4 text-purple-400" />
          <span>Followed Categories</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white font-mono">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('organizers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'organizers'
              ? 'border-white text-white'
              : 'border-transparent text-[#949599] hover:text-[#EFEFF1]'
          }`}
        >
          <Users className="w-4 h-4 text-sky-400" />
          <span>Organizers</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white font-mono">
            {organizers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
            activeTab === 'reminders'
              ? 'border-white text-white'
              : 'border-transparent text-[#949599] hover:text-[#EFEFF1]'
          }`}
        >
          <BellRing className="w-4 h-4 text-amber-400" />
          <span>Event Reminders</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white font-mono">
            {reminders.length}
          </span>
        </button>
      </motion.div>

      {/* ──────────────── TAB 1: SAVED EVENTS ──────────────── */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {favorites.length > 0 && (
            <motion.div variants={itemFade} className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your saved events..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
              />
            </motion.div>
          )}

          {favorites.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              description="Tap the heart icon on any event across Tribes & Cliqs to save it here for quick access."
              action={() => (window.location.href = '/explore')}
              actionLabel="Explore Events"
            />
          ) : filteredFavorites.length === 0 ? (
            <EmptyState icon={Search} title="No matching favorites" description="Try a different search term." />
          ) : (
            <motion.div variants={containerStagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredFavorites.map((event) => (
                <motion.div key={event.id} variants={itemFade} className="relative group">
                  <EventCard event={{ ...event, isFavorite: true }} />
                  <button
                    onClick={() => handleRemoveFavorite(event.id)}
                    className="absolute top-2 left-2 z-10 w-9 h-9 rounded-lg bg-red-500/90 backdrop-blur-sm text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow"
                    aria-label="Remove from favorites"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: FOLLOWED ARTISTS ──────────────── */}
      {activeTab === 'artists' && (
        <div className="space-y-6">
          {/* Blueprint Hero / Follow New Artist Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Smart Artist Tracking
              </div>
              <h3 className="text-xl font-bold text-[#EFEFF1]">Never miss your favorite artist in Accra</h3>
              <p className="text-sm text-[#949599] leading-relaxed">
                Follow artists like Sarkodie, Stonebwoy, or Black Sherif. When a new event featuring them is created or announced, you will get an instant notification: <span className="text-white italic font-medium">"Sarkodie has a new event in Accra."</span>
              </p>

              {/* Add Custom Artist Form */}
              <form onSubmit={handleAddArtist} className="flex flex-col sm:flex-row gap-2 pt-2">
                <div className="relative flex-1">
                  <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="text"
                    value={newArtistName}
                    onChange={(e) => setNewArtistName(e.target.value)}
                    placeholder="Enter artist name (e.g. Sarkodie)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#171A1D] border border-[#2E353B] text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-amber-400/60 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingArtist || !newArtistName.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Follow Artist
                </button>
              </form>

              {/* Suggestions */}
              <div className="pt-2">
                <p className="text-[11px] text-[#6B7278] uppercase font-bold tracking-wider mb-2">Popular Ghanaian Artists:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_ARTISTS.map((suggested) => {
                    const isAlreadyFollowed = artists.some(
                      (a) => (a.name || a.artist_name || '').toLowerCase() === suggested.toLowerCase()
                    );
                    return (
                      <button
                        key={suggested}
                        onClick={() => {
                          if (isAlreadyFollowed) handleUnfollowArtist(suggested);
                          else {
                            followArtist(suggested).then(() => {
                              toast.success(`Following ${suggested}!`);
                              setArtists((prev) => [{ id: Date.now(), name: suggested, artist_name: suggested }, ...prev]);
                            });
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded-full transition border flex items-center gap-1 ${
                          isAlreadyFollowed
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-[#171A1D] text-[#949599] border-[#262B2F] hover:text-white hover:border-white/30'
                        }`}
                      >
                        <Music className="w-3 h-3 text-amber-400" />
                        <span>{suggested}</span>
                        {isAlreadyFollowed ? <Check className="w-3 h-3 text-amber-400" /> : <Plus className="w-3 h-3 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Followed Artists List */}
          {artists.length === 0 ? (
            <EmptyState
              icon={Music}
              title="No artists followed yet"
              description="Type an artist above (e.g. Sarkodie) or select a popular artist to follow and receive event alerts."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {artists.map((art) => {
                const name = art.name || art.artist_name;
                return (
                  <div
                    key={art.id || name}
                    className="p-4 rounded-xl bg-[#171A1D] border border-[#262B2F] hover:border-white/30 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#EFEFF1] truncate">{name}</h4>
                        <p className="text-[11px] text-[#949599]">Active alerts for new events</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnfollowArtist(name)}
                      className="p-2 rounded-lg text-[#949599] hover:text-red-400 hover:bg-white/5 transition"
                      title={`Unfollow ${name}`}
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 3: FOLLOWED CATEGORIES ──────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#1C232B]/60 border border-[#262B2F] space-y-2">
            <h3 className="text-lg font-bold text-[#EFEFF1]">Category Event Notifications</h3>
            <p className="text-sm text-[#949599]">
              Follow your favorite themes and genres. Whenever a newly published event matches your followed categories, you will receive a notification in your feed.
            </p>
          </div>

          {/* Quick toggle all platform categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#949599]">Browse All Categories</h4>
            <div className="flex flex-wrap gap-2.5">
              {allCategories.map((c) => {
                const catName = c.name;
                const isFollowed = categories.some((fc) => (fc.name || fc.category_name || '').toLowerCase() === catName.toLowerCase());
                return (
                  <button
                    key={c.id || catName}
                    onClick={async () => {
                      if (isFollowed) {
                        handleUnfollowCategory(catName);
                      } else {
                        try {
                          await followCategory(catName);
                          toast.success(`Following ${catName}!`);
                          setCategories((prev) => [{ id: Date.now(), name: catName, category_name: catName }, ...prev]);
                        } catch {
                          toast.error('Could not follow category');
                        }
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-2 ${
                      isFollowed
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow'
                        : 'bg-[#171A1D] text-[#949599] border-[#262B2F] hover:text-white hover:border-white/30'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>{catName}</span>
                    {isFollowed ? (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                        <Check className="w-3 h-3" /> Following
                      </span>
                    ) : (
                      <Plus className="w-3 h-3 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currently followed categories */}
          <div className="pt-4 border-t border-[#262B2F]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#949599] mb-4">
              Your Followed Categories ({categories.length})
            </h4>
            {categories.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No categories followed yet"
                description="Click any category chip above to follow it and receive curated alerts."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((c) => {
                  const name = c.name || c.category_name;
                  return (
                    <div
                      key={c.id || name}
                      className="p-4 rounded-xl bg-[#171A1D] border border-[#262B2F] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#EFEFF1]">{name}</h4>
                          <p className="text-[11px] text-[#949599]">Notified on new events</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/explore?category=${encodeURIComponent(name)}`}
                          className="p-1.5 text-[#949599] hover:text-white transition"
                          title="Browse events"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleUnfollowCategory(name)}
                          className="p-1.5 text-[#949599] hover:text-red-400 transition"
                          title="Unfollow"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── TAB 4: ORGANIZERS ──────────────── */}
      {activeTab === 'organizers' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#1C232B]/60 border border-[#262B2F] space-y-2">
            <h3 className="text-lg font-bold text-[#EFEFF1]">Followed Organizers</h3>
            <p className="text-sm text-[#949599]">
              Stay connected with trusted event planners and producers. You will get immediate updates whenever they publish new experiences.
            </p>
          </div>

          {organizers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No organizers followed yet"
              description="Visit organizer profiles across Tribes & Cliqs and click 'Follow' to stay in the loop."
              action={() => (window.location.href = '/explore')}
              actionLabel="Discover Organizers"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {organizers.map((org) => {
                const orgId = org.id || org.organizer_id;
                const orgName = org.name || org.organization_name;
                return (
                  <div
                    key={orgId}
                    className="p-5 rounded-xl bg-[#171A1D] border border-[#262B2F] hover:border-white/30 transition flex items-center justify-between gap-4"
                  >
                    <Link to={`/organizers/${orgId}`} className="flex items-center gap-3 min-w-0 group">
                      <div className="w-12 h-12 rounded-full bg-[#242B32] border border-[#2E353B] flex items-center justify-center shrink-0 overflow-hidden text-[#9AA1A6]">
                        {org.avatar ? (
                          <img src={org.avatar} alt={orgName} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#EFEFF1] group-hover:text-white truncate">
                          {orgName}
                        </h4>
                        <p className="text-xs text-[#949599] flex items-center gap-1 mt-0.5">
                          View profile <ChevronRight className="w-3 h-3" />
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleUnfollowOrg(orgId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-[#949599] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-transparent transition shrink-0"
                    >
                      Unfollow
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 5: EVENT REMINDERS ──────────────── */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#1C232B]/60 border border-[#262B2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#EFEFF1] flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-400" /> Active Event Reminders
              </h3>
              <p className="text-sm text-[#949599] mt-1">
                You receive notifications at 7 days, 24 hours, 1 hour before, ticket sales open, ticket almost sold out, time changes, venue changes, and cancellations.
              </p>
            </div>
            <Link
              to="/explore"
              className="px-4 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition shrink-0"
            >
              Browse Events
            </Link>
          </div>

          {reminders.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No active reminders"
              description="Click 'Remind me' on any upcoming event to get automatic milestone alerts and schedule change notifications."
              action={() => (window.location.href = '/explore')}
              actionLabel="Explore Upcoming Events"
            />
          ) : (
            <div className="space-y-4">
              {filteredReminders.map((rem) => {
                const prefs = rem.preferences || {};
                const activeTriggers = [];
                if (prefs.sevenDays !== false) activeTriggers.push('7d before');
                if (prefs.twentyFourHours !== false) activeTriggers.push('24h before');
                if (prefs.oneHour !== false) activeTriggers.push('1h before');
                if (prefs.salesOpening !== false) activeTriggers.push('Sales open');
                if (prefs.almostSoldOut !== false) activeTriggers.push('Almost sold out');
                if (prefs.timeChanged !== false) activeTriggers.push('Time changes');
                if (prefs.venueChanged !== false) activeTriggers.push('Venue changes');
                if (prefs.cancelled !== false) activeTriggers.push('Cancellations');

                const eventDate = rem.start_date
                  ? new Date(rem.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'TBA';

                return (
                  <div
                    key={rem.reminder_id || rem.id}
                    className="p-5 rounded-2xl bg-[#171A1D] border border-[#262B2F] hover:border-white/30 transition flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#1C232B] shrink-0 border border-[#2E353B]">
                        {rem.banner_image ? (
                          <img src={rem.banner_image} alt={rem.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-amber-400">
                            <Bell className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            Reminder Active
                          </span>
                          {rem.category && <span className="text-xs text-[#949599]">• {rem.category}</span>}
                        </div>
                        <Link
                          to={`/events/${rem.id}`}
                          className="text-base font-bold text-[#EFEFF1] hover:text-white transition truncate block"
                        >
                          {rem.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#949599]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#CBD5E1]" /> {eventDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#CBD5E1]" /> {rem.venue || rem.city || 'Venue TBA'}
                          </span>
                        </div>
                        {/* Trigger Badges */}
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {activeTriggers.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-[#CBD5E1] border border-white/10"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => setSelectedReminderEvent(rem)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition flex items-center gap-1.5 border border-white/15"
                      >
                        <Settings className="w-3.5 h-3.5 text-amber-400" /> Preferences
                      </button>
                      <Link
                        to={`/events/${rem.id}`}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-[#1C232B] hover:bg-[#CBD5E1] transition flex items-center gap-1.5 shadow"
                      >
                        View Event &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reminder Preferences Modal */}
      {selectedReminderEvent && (
        <ReminderModal
          open={!!selectedReminderEvent}
          onClose={() => setSelectedReminderEvent(null)}
          event={selectedReminderEvent}
          onStatusChange={(_reminded, updatedPrefs) => {
            setReminders((prev) =>
              prev.map((r) =>
                r.id === selectedReminderEvent.id ? { ...r, preferences: updatedPrefs } : r
              )
            );
          }}
        />
      )}
    </motion.div>
  );
}
