import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Tag, ArrowRight, Sparkles, Compass } from 'lucide-react';
import { POPULAR_CATEGORY_LIST } from '@/utils/categoryImages';

const HERO_IMAGE = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1920&q=80';

const POPULAR_TAGS = [
  'Concerts',
  'Festivals',
  'Nightlife',
  'Conferences',
  'Sports',
];

const CITIES = ['Accra', 'Kumasi', 'Lagos', 'Takoradi'];

export default function HeroSection() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ query: '', city: '', category: '', date: '' });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.query) params.set('search', search.query);
    if (search.city) params.set('city', search.city);
    if (search.category) params.set('category', search.category);
    if (search.date) params.set('date', search.date);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <section className="relative pt-24 pb-14 sm:pt-32 sm:pb-20 overflow-hidden border-b border-[#262B2F]">
      {/* Background Image with Atmospheric Lighting & Gradient Scrim */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Concert crowd with vibrant stage lights"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center opacity-30 scale-105 filter blur-[0.5px]"
        />
        {/* Multi-stop radial and linear lighting overlay */}
        <div className="absolute inset-0 bg-radial-gradient from-purple-900/15 via-[#1C232B]/85 to-[#1C232B]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] via-[#1C232B]/75 to-[#1C232B]/90" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Subtle Trust Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-[#CBD5E1] mb-5 backdrop-blur-md shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Verified Tickets &bull; Instant Mobile Money Checkout</span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#EFEFF1] leading-[1.12]"
        >
          Find Your Tribe. <br />
          <span className="text-white">Book the Moment.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-4 text-base sm:text-lg text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed"
        >
          Discover verified concerts, music festivals, nightlife, conferences, and parties across Africa.
        </motion.p>

        {/* ─── PRIMARY FOCAL ACTION: Integrated Search Bar Box ─── */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          onSubmit={handleSearch}
          className="mt-8 rounded-2xl bg-[#161D22]/95 border border-white/15 p-3 sm:p-4 shadow-2xl shadow-black/70 backdrop-blur-xl text-left"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Event / Artist Keyword */}
            <div className="sm:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
              <input
                type="text"
                placeholder="Search event, artist, or venue..."
                value={search.query}
                onChange={(e) => setSearch({ ...search, query: e.target.value })}
                aria-label="Search event, artist, or venue"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition"
              />
            </div>

            {/* City Filter */}
            <div className="sm:col-span-3 relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
              <input
                type="text"
                placeholder="City or location"
                value={search.city}
                onChange={(e) => setSearch({ ...search, city: e.target.value })}
                aria-label="Filter by city"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition"
              />
            </div>

            {/* Category Dropdown */}
            <div className="sm:col-span-2 relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
              <select
                value={search.category}
                onChange={(e) => setSearch({ ...search, category: e.target.value })}
                aria-label="Filter by category"
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] focus:outline-none focus:border-white/40 transition cursor-pointer appearance-none truncate"
              >
                <option value="">Categories</option>
                {POPULAR_CATEGORY_LIST.slice(0, 10).map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ─── THE SINGLE DOMINANT HERO ACTION BUTTON ─── */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                aria-label="Search events"
                className="w-full h-full min-h-[46px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-extrabold hover:bg-[#CBD5E1] transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Secondary Discovery Bar (Trending Tags + Secondary Host Action) */}
          <div className="mt-3 pt-3 border-t border-[#262B2F] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-[#949599] uppercase tracking-wider mr-1">Trending:</span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => navigate(`/explore?category=${encodeURIComponent(tag)}`)}
                  className="px-2.5 py-1 rounded-lg bg-[#1C232B] border border-[#262B2F] text-[11px] font-medium text-[#CBD5E1] hover:text-white hover:border-white/30 transition cursor-pointer"
                >
                  {tag}
                </button>
              ))}
              <div className="hidden md:flex items-center gap-1 ml-2">
                <span className="text-[#949599]">•</span>
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => navigate(`/explore?city=${encodeURIComponent(c)}`)}
                    className="px-2 py-0.5 rounded text-[11px] text-[#949599] hover:text-white transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Dark Outline Action for Organizers */}
            <div className="flex items-center gap-3">
              <Link
                to="/explore"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#CBD5E1] hover:text-white transition font-medium"
              >
                <span>Browse all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                to="/become-organizer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C232B] border border-white/10 hover:border-white/25 text-[11px] font-semibold text-[#CBD5E1] hover:text-white transition shadow-none"
              >
                <span>Host an Event</span>
                <ArrowRight className="w-3 h-3 text-[#949599]" />
              </Link>
            </div>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
