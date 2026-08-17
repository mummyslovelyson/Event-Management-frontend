import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Search, MapPin, Calendar, Tag, ArrowRight, Ticket, Compass,
  CalendarCheck, Mic2, Trophy, Sparkles as FestivalIcon, Presentation,
  GraduationCap, Wrench, Drama, Church, Heart, Sparkles, Mail,
  TrendingUp, Users, Building2, ChevronRight, CheckCircle2, Shield,
  CreditCard, QrCode, LayoutGrid, Music, Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';

import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { getFeaturedEvents, getTrendingEvents, getCategories, getFeaturedOrganizers } from '@/api/events';

const HERO_IMAGE = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg';

const CATEGORY_ICONS = {
  Concert: Mic2,
  Music: Music,
  Sports: Trophy,
  Festival: FestivalIcon,
  Conference: Presentation,
  Seminar: GraduationCap,
  Workshop: Wrench,
  Theatre: Drama,
  Church: Church,
  Wedding: Heart,
  Fashion: Sparkles,
  Nightlife: Flame,
};

const DEFAULT_CATEGORY_ICON = LayoutGrid;

const POPULAR_TAGS = [
  'Concerts',
  'Festivals',
  'Nightlife',
  'Conferences',
  'Sports',
  'Workshops',
];

const steps = [
  {
    icon: Compass,
    title: '1. Discover Events',
    desc: 'Explore upcoming live shows, festivals, parties, and conferences happening in your city or online.',
  },
  {
    icon: CreditCard,
    title: '2. Book in Seconds',
    desc: 'Select your tickets and checkout securely with Mobile Money (MTN, Telecel, AT) or Card via Paystack.',
  },
  {
    icon: QrCode,
    title: '3. Scan & Enjoy',
    desc: 'Get your QR e-ticket sent straight to your email and dashboard. Simply show it at the door for fast entry.',
  },
];

const stats = [
  { icon: CalendarCheck, label: 'Events Hosted', value: 12450, suffix: '+' },
  { icon: Ticket, label: 'Tickets Sold', value: 890000, suffix: '+' },
  { icon: Users, label: 'Active Attendees', value: 560000, suffix: '+' },
  { icon: Building2, label: 'Cities Covered', value: 120, suffix: '+' },
];

function StatCounter({ stat }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame;
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * stat.value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, stat.value]);

  const format = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  return (
    <div ref={ref} className="group rounded-2xl bg-[#161D22] border border-[#262B2F] p-6 text-center hover:border-white/20 transition-all duration-300">
      <stat.icon className="w-6 h-6 text-[#949599] mx-auto mb-3 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
      <p className="text-3xl sm:text-4xl font-extrabold text-[#EFEFF1] tracking-tight">
        {format(count)}{stat.suffix}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#949599]">{stat.label}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-[280px] shrink-0 rounded-2xl overflow-hidden bg-[#161D22] border border-[#262B2F]">
      <div className="aspect-[16/10] bg-[#1C232B] animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#1C232B] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[#1C232B] rounded animate-pulse w-1/2" />
        <div className="h-3 bg-[#1C232B] rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredOrganizers, setFeaturedOrganizers] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [search, setSearch] = useState({ query: '', city: '', category: '', date: '' });

  useEffect(() => {
    let active = true;
    const loadFeatured = async () => {
      try {
        const res = await getFeaturedEvents({ limit: 8 });
        if (active) setFeatured(res.data?.events || res.data?.data || res.data || []);
      } catch {
        // fail gracefully
      } finally {
        if (active) setLoadingFeatured(false);
      }
    };
    const loadTrending = async () => {
      try {
        const res = await getTrendingEvents({ limit: 8 });
        if (active) setTrending(res.data?.events || res.data?.data || res.data || []);
      } catch {
        // fail gracefully
      } finally {
        if (active) setLoadingTrending(false);
      }
    };
    const loadCategories = async () => {
      try {
        const res = await getCategories();
        const cats = Array.isArray(res.data) ? res.data : res.data?.categories || [];
        if (active) setCategories(cats);
      } catch {
        if (active) setCategories([]);
      } finally {
        if (active) setLoadingCategories(false);
      }
    };
    const loadOrganizers = async () => {
      try {
        const res = await getFeaturedOrganizers({ limit: 4 });
        if (active) setFeaturedOrganizers(Array.isArray(res.data) ? res.data : res.data?.organizers || []);
      } catch {
        if (active) setFeaturedOrganizers([]);
      } finally {
        if (active) setLoadingOrganizers(false);
      }
    };
    loadFeatured();
    loadTrending();
    loadCategories();
    loadOrganizers();
    return () => { active = false; };
  }, []);

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
    <div className="bg-[#1C232B] text-[#EFEFF1]">
      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden border-b border-[#262B2F]">
        {/* Background Image & Scrim */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={HERO_IMAGE}
            alt="Concert crowd"
            className="w-full h-full object-cover object-center opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] via-[#1C232B]/85 to-[#1C232B]/70" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Tagline Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161D22]/90 border border-[#494F55]/60 text-xs font-semibold uppercase tracking-widest text-[#EFEFF1] mb-6 shadow-md"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Events &amp; Self-Ticketing
          </motion.div>

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

          {/* Human Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-5 text-base sm:text-lg text-[#949599] max-w-2xl mx-auto leading-relaxed"
          >
            Discover concerts, festivals, nightlife, conferences, and community gatherings across Africa.
            Buy verified tickets in seconds or create and sell out your own event.
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
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition"
                />
              </div>

              {/* City Filter */}
              <div className="sm:col-span-3 relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
                <input
                  type="text"
                  placeholder="City (e.g. Accra, Lagos)"
                  value={search.city}
                  onChange={(e) => setSearch({ ...search, city: e.target.value })}
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition"
                />
              </div>

              {/* Category Dropdown */}
              <div className="sm:col-span-3 relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
                <select
                  value={search.category}
                  onChange={(e) => setSearch({ ...search, category: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] focus:outline-none focus:border-white/40 transition cursor-pointer appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full h-full min-h-[46px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition-all shadow-md active:scale-95"
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
                  className="px-3 py-1 rounded-lg bg-[#1C232B] border border-[#262B2F] text-xs font-medium text-[#CBD5E1] hover:text-white hover:border-white/40 transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </motion.form>

          {/* Human Trust & Feature Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#949599]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Verified Tickets</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-white shrink-0" />
              <span>MoMo &amp; Card Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-white shrink-0" />
              <span>Instant QR Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-white shrink-0" />
              <span>Free Organizer Setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURED EVENTS ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Curated Selection</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Featured Events</h2>
          </div>
          <Link to="/explore" className="group hidden sm:flex items-center gap-1 text-sm font-semibold text-[#CBD5E1] hover:text-white transition">
            View all events <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-10 text-center">
            <Ticket className="w-8 h-8 text-[#949599] mx-auto mb-2" />
            <p className="text-sm text-[#949599]">No featured events currently listed. Explore all upcoming events!</p>
            <Link to="/explore" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition">
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
            {featured.map((event) => (
              <div key={event.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── TRENDING EVENTS ─── */}
      <section className="py-14 sm:py-20 bg-[#161D22] border-y border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white">
                <TrendingUp className="w-3.5 h-3.5" /> Popular Right Now
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Trending Near You</h2>
            </div>
            <Link to="/explore" className="group hidden sm:flex items-center gap-1 text-sm font-semibold text-[#CBD5E1] hover:text-white transition">
              Explore all <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loadingTrending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-sm text-[#949599] py-8 text-center">No trending events at the moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {trending.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Browse by Experience</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Find Events by Category</h2>
          <p className="mt-2 text-sm text-[#949599] max-w-lg mx-auto">From intimate workshops to stadium concerts, pick your vibe.</p>
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[#161D22] border border-[#262B2F] p-5 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-[#1C232B] mx-auto mb-3" />
                <div className="h-3 bg-[#1C232B] rounded w-2/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((cat, i) => {
              const name = cat.name || cat;
              const Icon = CATEGORY_ICONS[name] || DEFAULT_CATEGORY_ICON;
              return (
                <Link
                  key={name}
                  to={`/explore?category=${encodeURIComponent(name)}`}
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#161D22] border border-[#262B2F] hover:border-white/30 hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1C232B] border border-[#262B2F] flex items-center justify-center text-[#CBD5E1] group-hover:text-white group-hover:bg-white/10 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-[#EFEFF1] text-center">{name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-14 sm:py-20 bg-[#161D22] border-y border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Simple &amp; Fast</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">How Tribes &amp; Cliqs Works</h2>
            <p className="mt-2 text-sm text-[#949599]">Everything you need to attend or host events without hassle.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl bg-[#1C232B] border border-[#262B2F] p-7 text-center hover:border-white/20 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#161D22] border border-[#262B2F] text-white flex items-center justify-center mx-auto mb-5">
                  <step.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-[#EFEFF1]">{step.title}</h3>
                <p className="mt-2 text-sm text-[#949599] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Organizer Callout */}
          <div className="mt-12 rounded-2xl bg-[#1C232B] border border-[#494F55]/40 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <h3 className="text-xl font-bold text-[#EFEFF1]">Planning an event of your own?</h3>
              <p className="mt-1 text-sm text-[#949599]">Create ticket tiers, track real-time sales, and check in guests with our scanner.</p>
            </div>
            <Link
              to="/register"
              className="px-6 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-md shrink-0"
            >
              Host an Event
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FEATURED ORGANIZERS ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Event Creators</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Featured Event Organizers</h2>
          <p className="mt-2 text-sm text-[#949599]">Follow verified organizers and never miss their next show.</p>
        </div>

        {loadingOrganizers ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#1C232B]" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-[#1C232B] rounded w-2/3" />
                    <div className="h-2 bg-[#1C232B] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : featuredOrganizers.length === 0 ? (
          <p className="text-sm text-[#949599] py-6 text-center">No organizers listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredOrganizers.map((org) => {
              const initials = (org.name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div
                  key={org.id || org.name}
                  className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#CBD5E1] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {org.avatar ? (
                        <img src={org.avatar} alt={org.name} className="w-full h-full object-cover" />
                      ) : initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#EFEFF1] truncate">{org.organization_name || org.name}</h3>
                      <p className="text-xs text-[#949599]">{org.specialty || 'Event Host'}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#262B2F] flex items-center justify-between text-xs">
                    <span className="text-[#949599]">Events hosted</span>
                    <span className="font-bold text-[#EFEFF1]">{org.events_count || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── PLATFORM STATS ─── */}
      <section className="py-14 sm:py-20 bg-[#161D22] border-y border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Trusted Across Africa</h2>
            <p className="mt-2 text-sm text-[#949599]">Empowering attendees and organizers with simple self-ticketing.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => <StatCounter key={stat.label} stat={stat} />)}
          </div>
        </div>
      </section>

      {/* ─── NEWSLETTER ─── */}
      <NewsletterSection />
    </div>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    toast.success('Subscribed! We will keep you updated on upcoming events.');
    setEmail('');
    setSubmitting(false);
  };

  return (
    <section className="py-16 sm:py-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-[#161D22] border border-[#262B2F] p-8 sm:p-10 text-center">
        <Mail className="w-8 h-8 text-[#CBD5E1] mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Stay in the Loop</h2>
        <p className="mt-2 text-sm text-[#949599] max-w-md mx-auto leading-relaxed">
          Get weekly updates on popular concerts, festivals, and early-bird ticket discounts in your area.
        </p>
        <form onSubmit={subscribe} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            required
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition disabled:opacity-60 shrink-0"
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Subscribe'}
          </button>
        </form>
        <p className="mt-3 text-xs text-[#949599]">No spam. Unsubscribe anytime with one click.</p>
      </div>
    </section>
  );
}
