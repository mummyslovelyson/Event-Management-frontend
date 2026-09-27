import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, MapPin, Tag, Ticket, Compass,
  Mic2, Trophy, PartyPopper as FestivalIcon, Presentation,
  GraduationCap, Wrench, Drama, Church, Heart, Mail, Shirt,
  TrendingUp, Users, ChevronRight, CheckCircle2, Shield,
  CreditCard, QrCode, LayoutGrid, Music, Flame, Sparkles,
  Star, Smartphone, Zap, HelpCircle, ChevronDown, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { getFeaturedEvents, getTrendingEvents, getRecommendedEvents, getCategories, getFeaturedOrganizers } from '@/api/events';
import { getCategoryImage, POPULAR_CATEGORY_LIST } from '@/utils/categoryImages';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const HERO_IMAGE = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

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
  Fashion: Shirt,
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

const CURATED_FLAGSHIP_EVENTS = [
  {
    id: 'afrofusion-accra-2026',
    title: 'Accra AfroFusion & Jazz Festival',
    category: 'Concert',
    image: '/assets/images/musical-shows/cover.png',
    startDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    venue: 'Grand Arena, Accra',
    minPrice: 150,
    recommendationBadge: 'Top Pick',
    organizer: { name: 'EchoHouse Africa' }
  },
  {
    id: 'afrofuture-festival-2026',
    title: 'AfroFuture Music & Heritage Festival',
    category: 'Festival',
    image: '/assets/images/festivals/cover.png',
    startDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    venue: 'El-Wak Stadium, Accra',
    minPrice: 200,
    recommendationBadge: 'Selling Fast',
    organizer: { name: 'AfroFuture Live' }
  },
  {
    id: 'west-africa-tech-summit',
    title: 'Ghana Tech Innovators Summit & Expo',
    category: 'Conference',
    image: '/assets/images/corporate-event/cover.png',
    startDate: new Date(Date.now() + 86400000 * 20).toISOString(),
    venue: 'Accra International Conference Centre',
    minPrice: 100,
    recommendationBadge: 'Trending',
    organizer: { name: 'TechGhana Ventures' }
  },
  {
    id: 'kumasi-sunset-clash',
    title: 'Kumasi Sunset Sound Clash & Rave',
    category: 'Nightlife',
    image: '/assets/images/social-events/cover.png',
    startDate: new Date(Date.now() + 86400000 * 9).toISOString(),
    venue: 'Baba Yara Sports Complex, Kumasi',
    minPrice: 80,
    recommendationBadge: 'Popular',
    organizer: { name: 'Garden City Vibe' }
  },
  {
    id: 'national-theatre-comedy',
    title: 'Black Star Comedy Showcase Live',
    category: 'Comedy',
    image: '/assets/images/movies-and-stage-plays/cover.png',
    startDate: new Date(Date.now() + 86400000 * 16).toISOString(),
    venue: 'National Theatre of Ghana, Accra',
    minPrice: 120,
    recommendationBadge: 'Must Attend',
    organizer: { name: 'Comedy Republic' }
  }
];

const CURATED_ORGANIZERS = [
  { id: 'echo-house', name: 'EchoHouse Africa', organization_name: 'EchoHouse Africa', specialty: 'Concerts & Festivals', events_count: 28, avatar: '/assets/images/Logo.jpeg' },
  { id: 'afrofuture-global', name: 'AfroFuture Global', organization_name: 'AfroFuture Global', specialty: 'Culture & Arts Festivals', events_count: 19, avatar: '/assets/images/festivals/cover.png' },
  { id: 'ghana-tech-alliance', name: 'Ghana Tech Alliance', organization_name: 'Ghana Tech Alliance', specialty: 'Tech & Summits', events_count: 14, avatar: '/assets/images/corporate-event/cover.png' },
  { id: 'untamed-empire', name: 'Untamed Empire', organization_name: 'Untamed Empire', specialty: 'Nightlife & Day Parties', events_count: 35, avatar: '/assets/images/social-events/cover.png' },
];

const STEPS = [
  {
    icon: Compass,
    title: '1. Discover What’s Happening',
    desc: 'Browse live concerts, festivals, parties, comedy specials, and conferences across Accra, Kumasi, Lagos, and beyond.',
  },
  {
    icon: CreditCard,
    title: '2. Pay Instantly via MoMo & Card',
    desc: 'Instant checkout using MTN MoMo, Telecel Cash, AT Money, or Visa/Mastercard via secure Paystack processing.',
  },
  {
    icon: QrCode,
    title: '3. Scan In With Your QR Pass',
    desc: 'Your verified digital ticket is delivered straight to phone, SMS, and email. Gate staff scan your pass in 1 second.',
  },
];

const TRUST_PILLARS = [
  {
    icon: Shield,
    title: '100% Verified Entry Guarantee',
    desc: 'Every ticket features a unique, cryptographically signed dynamic QR code that prevents counterfeiting and duplicate entries.',
  },
  {
    icon: Zap,
    title: 'Anti-Scalping Fair Price Policy',
    desc: 'Secondary resale prices are strictly capped at maximum +25% markup. Fans always get fair ticket prices without predatory gouging.',
  },
  {
    icon: Smartphone,
    title: 'Direct Mobile Money Checkout',
    desc: 'Seamless, frictionless payments on MTN, Telecel, AT, and Cards with zero hidden booking surcharges.',
  },
  {
    icon: QrCode,
    title: 'Instant Gate Scanner App',
    desc: 'Organizers can download our door-scanner app to validate thousands of admissions per hour even with offline connection.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Purchased VIP passes for AfroFuture in less than 30 seconds using MTN MoMo. Gate verification took 1 second on my phone. Flawless experience!',
    author: 'Kofi Antwi',
    role: 'Concert Attendee',
    location: 'Accra, Ghana',
    rating: 5,
  },
  {
    quote: 'We sold out 3,500 tickets for our Tech Summit through Tribes & Cliqs. The live analytics and instant MoMo payout settlements were game-changing.',
    author: 'Ama Osei-Bonsu',
    role: 'Lead Conference Producer',
    location: 'Kumasi, Ghana',
    rating: 5,
  },
  {
    quote: 'When my friend could not make the music festival, transferring the ticket to his sister took 2 clicks. The easiest ticketing platform in West Africa.',
    author: 'Daniel Mensah',
    role: 'Music Enthusiast',
    location: 'Takoradi, Ghana',
    rating: 5,
  },
];

const FAQS = [
  {
    q: 'How do I receive my tickets after payment?',
    a: 'Immediately upon payment confirmation, your digital ticket with its secure QR code is displayed on screen, emailed to your inbox, and made available in your account under "My Tickets". You can download the PDF or save it to your phone wallet.',
  },
  {
    q: 'Which payment methods can I use?',
    a: 'We natively support all major Ghanaian and West African Mobile Money networks (MTN Mobile Money, Telecel Cash, AT Money) as well as Visa, Mastercard, and Apple Pay through our secure Paystack integration.',
  },
  {
    q: 'Can I transfer or resell my ticket if I cannot attend?',
    a: 'Yes! You can transfer your ticket directly to a friend using their email or phone number. Alternatively, list it securely on our official Resale Marketplace with price caps that protect buyers against scalping.',
  },
  {
    q: 'How do event organizers receive their ticket payouts?',
    a: 'Organizers can request automated direct payouts to their Mobile Money wallet or Ghanaian commercial bank account at any time with transparent ledger reconciliation.',
  },
];

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

  useDocumentTitle(
    'Tribes & Cliqs — Premier Events, Concerts & Ticketing in Ghana',
    'Find and book verified tickets for top concerts, music festivals, nightlife, and conferences in Ghana. Fast, secure checkout with Mobile Money & Cards.'
  );

  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredOrganizers, setFeaturedOrganizers] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [search, setSearch] = useState({ query: '', city: '', category: '', date: '' });
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    let active = true;

    const loadFeatured = async () => {
      try {
        const res = await getFeaturedEvents({ limit: 8 });
        const events = res.data?.events || res.data?.data || res.data || [];
        if (active) setFeatured(events.length > 0 ? events : CURATED_FLAGSHIP_EVENTS);
      } catch {
        if (active) setFeatured(CURATED_FLAGSHIP_EVENTS);
      } finally {
        if (active) setLoadingFeatured(false);
      }
    };

    const loadTrending = async () => {
      try {
        const res = await getTrendingEvents({ limit: 8 });
        const events = res.data?.events || res.data?.data || res.data || [];
        if (active) setTrending(events.length > 0 ? events : CURATED_FLAGSHIP_EVENTS);
      } catch {
        if (active) setTrending(CURATED_FLAGSHIP_EVENTS);
      } finally {
        if (active) setLoadingTrending(false);
      }
    };

    const loadCategories = async () => {
      try {
        const res = await getCategories();
        const apiCats = Array.isArray(res.data) ? res.data : res.data?.categories || [];
        const existingNames = new Set(apiCats.map((c) => (c.name || c).toLowerCase()));
        const merged = [...apiCats];
        POPULAR_CATEGORY_LIST.forEach((item) => {
          if (!existingNames.has(item.name.toLowerCase())) {
            merged.push({ name: item.name, event_count: 0, subtitle: item.countLabel });
          }
        });
        if (active) setCategories(merged);
      } catch {
        if (active) setCategories(POPULAR_CATEGORY_LIST.map((item) => ({ name: item.name, event_count: 0, subtitle: item.countLabel })));
      } finally {
        if (active) setLoadingCategories(false);
      }
    };

    const loadOrganizers = async () => {
      try {
        const res = await getFeaturedOrganizers({ limit: 4 });
        const orgs = Array.isArray(res.data) ? res.data : res.data?.organizers || [];
        if (active) setFeaturedOrganizers(orgs.length > 0 ? orgs : CURATED_ORGANIZERS);
      } catch {
        if (active) setFeaturedOrganizers(CURATED_ORGANIZERS);
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

  const displayedFeatured = featured.length > 0 ? featured : CURATED_FLAGSHIP_EVENTS;
  const displayedTrending = trending.length > 0 ? trending : CURATED_FLAGSHIP_EVENTS;
  const displayedOrganizers = featuredOrganizers.length > 0 ? featuredOrganizers : CURATED_ORGANIZERS;

  return (
    <div className="bg-[#1C232B] text-[#EFEFF1]">
      {/* ─── HERO SECTION ─── */}
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
                    className="px-2.5 py-1 rounded-lg bg-[#1C232B] border border-[#262B2F] text-xs font-medium text-[#CBD5E1] hover:text-white hover:border-white/40 transition"
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

      {/* ─── PLATFORM STATS STRIP ─── */}
      <section className="bg-[#14171A] border-b border-[#262B2F] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white">50,000+</p>
              <p className="text-xs text-[#949599] mt-0.5 font-medium">Tickets Issued</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">1,200+</p>
              <p className="text-xs text-[#949599] mt-0.5 font-medium">Verified Event Creators</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-amber-400">99.8%</p>
              <p className="text-xs text-[#949599] mt-0.5 font-medium">Gate Scan Accuracy</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white">4 Networks</p>
              <p className="text-xs text-[#949599] mt-0.5 font-medium">MoMo &amp; Instant Card Payouts</p>
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
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
            {displayedFeatured.map((event) => (
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
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
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
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {displayedTrending.slice(0, 8).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── POPULAR CATEGORIES GRID ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Browse by Vibe</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Explore Categories</h2>
          </div>
          <Link to="/explore" className="group hidden sm:flex items-center gap-1 text-sm font-semibold text-[#CBD5E1] hover:text-white transition">
            All categories <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-[#161D22] border border-[#262B2F] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {categories.slice(0, 12).map((cat, idx) => {
              const name = cat.name || cat;
              const count = cat.event_count ?? 0;
              const subtitle = cat.subtitle || '';
              const coverImg = getCategoryImage(name, idx);
              const Icon = CATEGORY_ICONS[name] || DEFAULT_CATEGORY_ICON;

              return (
                <Link
                  key={name}
                  to={`/explore?category=${encodeURIComponent(name)}`}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#161D22] border border-[#262B2F] hover:border-white/50 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-end p-3.5"
                >
                  <img
                    src={coverImg}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = '/assets/images/musical-shows/cover.png'; }}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 brightness-[0.6] group-hover:brightness-[0.7]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="relative z-10">
                    <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-1.5 group-hover:bg-white group-hover:text-[#1C232B] transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white leading-tight drop-shadow">{name}</p>
                    {Number(count) > 0 ? (
                      <p className="mt-0.5 text-[11px] text-white/70">{count.toLocaleString()} events</p>
                    ) : subtitle ? (
                      <p className="mt-0.5 text-[11px] text-white/60 line-clamp-1">{subtitle}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── TRUST & GUARANTEE SECTION ─── */}
      <section className="py-14 sm:py-20 bg-[#14171A] border-y border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Built for Security &amp; Trust</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Why Fans and Organizers Trust Tribes &amp; Cliqs</h2>
            <p className="mt-2 text-sm text-[#CBD5E1]">
              Industry-grade cryptography, zero counterfeit passes, and seamless local payment rails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl bg-[#1C232B] border border-[#262B2F] p-6 hover:border-white/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center mb-4">
                  <pillar.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#EFEFF1] mb-2">{pillar.title}</h3>
                <p className="text-xs sm:text-sm text-[#949599] leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Simple &amp; Fast</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">How Tribes &amp; Cliqs Works</h2>
          <p className="mt-2 text-sm text-[#949599]">Everything you need to attend or host events without hassle.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-7 text-center hover:border-white/20 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#1C232B] border border-[#262B2F] text-white flex items-center justify-center mx-auto mb-5">
                <step.icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#EFEFF1]">{step.title}</h3>
              <p className="mt-2 text-sm text-[#949599] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Organizer Callout */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-[#1C232B] via-[#202730] to-[#1C232B] border border-white/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left shadow-lg">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">For Creators &amp; Promoters</span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#EFEFF1] mt-0.5">Hosting a concert, party, or conference?</h3>
            <p className="mt-1 text-sm text-[#CBD5E1]">Set up ticket tiers (VIP, Regular, Tables), track live revenue, and scan guests at the door with our mobile scanner app.</p>
          </div>
          <Link
            to="/become-organizer"
            className="px-6 py-3.5 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-md shrink-0 active:scale-95"
          >
            Create an Event Free
          </Link>
        </div>
      </section>

      {/* ─── FEATURED ORGANIZERS ─── */}
      <section className="py-14 sm:py-20 bg-[#161D22] border-y border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Event Creators</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Featured Event Organizers</h2>
            <p className="mt-2 text-sm text-[#949599]">Follow verified organizers and never miss their next show.</p>
          </div>

          {loadingOrganizers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-[#1C232B] border border-[#262B2F] p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedOrganizers.map((org) => {
                const initials = (org.name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div
                    key={org.id || org.name}
                    className="rounded-2xl bg-[#1C232B] border border-[#262B2F] p-5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#161D22] border border-[#494F55]/40 text-[#CBD5E1] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                        {org.avatar ? (
                          <img
                            src={org.avatar}
                            alt={org.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { e.currentTarget.src = '/assets/images/Logo.jpeg'; }}
                            className="w-full h-full object-cover"
                          />
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#EFEFF1] truncate">{org.organization_name || org.name}</h3>
                        <p className="text-xs text-[#949599]">{org.specialty || 'Event Host'}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#262B2F] flex items-center justify-between text-xs">
                      <span className="text-[#949599]">Events hosted</span>
                      <span className="font-bold text-white">{org.events_count || 12}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── TESTIMONIALS / SOCIAL PROOF ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Verified Reviews</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Loved by Event Lovers &amp; Creators</h2>
          <p className="mt-2 text-sm text-[#CBD5E1]">See what concertgoers, party lovers, and conference organizers say.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[#EFEFF1] leading-relaxed italic">"{t.quote}"</p>
              </div>
              <div className="mt-5 pt-4 border-t border-[#262B2F] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{t.author}</p>
                  <p className="text-[11px] text-[#949599]">{t.role} • {t.location}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ACCORDION ─── */}
      <section className="py-14 sm:py-20 bg-[#161D22] border-t border-[#262B2F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Common Questions</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl bg-[#1C232B] border border-[#262B2F] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-[#EFEFF1] hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#949599] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-[#949599] leading-relaxed border-t border-[#262B2F]/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
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
        <p className="mt-2 text-sm text-[#CBD5E1] max-w-md mx-auto leading-relaxed">
          Get weekly updates on popular concerts, festivals, and early-bird ticket discounts in your area.
        </p>
        <form onSubmit={subscribe} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            required
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address for event updates"
            className="flex-1 px-4 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder:text-[#949599] focus:outline-none focus:border-white/40 transition"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-label="Subscribe to newsletter"
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
