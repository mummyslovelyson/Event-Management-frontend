import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Tag, Compass } from 'lucide-react';
import { POPULAR_CATEGORY_LIST } from '@/utils/categoryImages';

const HERO_IMAGE = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

const POPULAR_TAGS = [
  'Concerts',
  'Festivals',
  'Nightlife',
  'Conferences',
  'Sports',
  'Workshops',
];

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
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden border-b border-[#262B2F]">
      {/* Background Image & Scrim */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={HERO_IMAGE}
          alt="Live concert crowd enjoying music event"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] via-[#1C232B]/85 to-[#1C232B]/70" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#EFEFF1] leading-[1.12]"
        >
          Find Your Tribe. <br />
          <span className="text-white">Book the Moment.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-5 text-base sm:text-lg text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed"
        >
          Discover verified concerts, music festivals, parties, conferences, and community gatherings across Africa.
          Buy tickets in seconds with Mobile Money or host and sell out your own event.
        </motion.p>

        {/* ─── Search Bar Card ─── */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          onSubmit={handleSearch}
          className="mt-8 rounded-2xl bg-[#161D22] border border-[#494F55]/60 p-3 sm:p-4 shadow-2xl shadow-black/50 text-left"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Event / Artist Keyword */}
            <div className="sm:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
              <input
                type="text"
                placeholder="Event, artist, or venue..."
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
            <div className="sm:col-span-3 relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
              <select
                value={search.category}
                onChange={(e) => setSearch({ ...search, category: e.target.value })}
                aria-label="Filter by category"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] focus:outline-none focus:border-white/40 transition cursor-pointer appearance-none"
              >
                <option value="">All Categories</option>
                {POPULAR_CATEGORY_LIST.slice(0, 10).map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                aria-label="Search events"
                className="w-full h-full min-h-[46px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Popular Quick-Filter Pills */}
          <div className="mt-3 pt-3 border-t border-[#262B2F] flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#949599] uppercase tracking-wider mr-1">Trending:</span>
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate(`/explore?category=${encodeURIComponent(tag)}`)}
                className="px-3 py-1 rounded-lg bg-[#1C232B] border border-[#262B2F] text-xs font-medium text-[#CBD5E1] hover:text-white hover:border-white/40 transition cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* City Quick Pills & Map Link */}
          <div className="mt-2.5 pt-2.5 border-t border-[#262B2F]/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#949599] uppercase tracking-wider mr-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Cities:
              </span>
              {['Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast', 'Tamale'].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => navigate(`/explore?city=${encodeURIComponent(city)}`)}
                  className="px-2.5 py-1 rounded-lg bg-[#1C232B] border border-[#262B2F] text-xs font-medium text-[#CBD5E1] hover:text-white hover:border-white/40 transition cursor-pointer"
                >
                  {city}
                </button>
              ))}
            </div>
            <Link
              to="/explore?view=map"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/20 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Compass className="w-3.5 h-3.5 text-rose-400" />
              Live Map View
            </Link>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
