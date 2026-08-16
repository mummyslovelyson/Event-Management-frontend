import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Search, MapPin, Calendar, Tag, ArrowRight, Ticket, Compass,
  CalendarCheck, PartyPopper, Mic2, Trophy, Sparkles as FestivalIcon, Presentation,
  GraduationCap, Wrench, Drama, Church, Heart, Sparkles, Mail,
  TrendingUp, Users, Building2, ChevronRight, Star, LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';

import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { getFeaturedEvents, getTrendingEvents, getCategories, getFeaturedOrganizers } from '@/api/events';

const HERO_IMAGE = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg';

const CATEGORY_ICONS = {
  Concert: Mic2,
  Sports: Trophy,
  Festival: FestivalIcon,
  Conference: Presentation,
  Seminar: GraduationCap,
  Workshop: Wrench,
  Theatre: Drama,
  Church: Church,
  Wedding: Heart,
  Fashion: Sparkles,
};

const DEFAULT_CATEGORY_ICON = LayoutGrid;

const steps = [
  { icon: Compass, title: 'Discover', desc: 'Browse thousands of events curated for you. Filter by category, location, and date to find exactly what you love.' },
  { icon: Ticket, title: 'Book', desc: 'Choose your ticket type and pay securely with Paystack, Mobile Money, or Card. Get instant confirmation.' },
  { icon: CalendarCheck, title: 'Attend', desc: 'Receive your e-ticket instantly. Show it at the door and enjoy an unforgettable experience.' },
];

const stats = [
  { icon: CalendarCheck, label: 'Events Hosted', value: 12450, suffix: '+' },
  { icon: Ticket, label: 'Tickets Sold', value: 890000, suffix: '+' },
  { icon: Users, label: 'Happy Attendees', value: 560000, suffix: '+' },
  { icon: Building2, label: 'Cities', value: 120, suffix: '+' },
];

function StatCounter({ stat }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame;
    const duration = 1800;
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
    <div ref={ref} className="group rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 text-center hover:border-white/ hover:-translate-y-0.5 transition-all duration-300">
      <stat.icon className="w-6 h-6 text-[#494F55] mx-auto mb-3 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
      <p className="text-3xl font-bold text-[#EFEFF1]">
        {format(count)}{stat.suffix}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#949599]">{stat.label}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="w-[280px] shrink-0 rounded-xl overflow-hidden bg-[#171A1D] border border-[#262B2F]">
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
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredOrganizers, setFeaturedOrganizers] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [search, setSearch] = useState({ city: '', category: '', date: '' });

  useEffect(() => {
    let active = true;
    const loadFeatured = async () => {
      try {
        const res = await getFeaturedEvents({ limit: 8 });
        if (active) setFeatured(res.data?.events || res.data?.data || res.data || []);
      } catch {
        // graceful fail
      } finally {
        if (active) setLoadingFeatured(false);
      }
    };
    const loadTrending = async () => {
      try {
        const res = await getTrendingEvents({ limit: 8 });
        if (active) setTrending(res.data?.events || res.data?.data || res.data || []);
      } catch {
        // graceful fail
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
    if (search.city) params.set('city', search.city);
    if (search.category) params.set('category', search.category);
    if (search.date) params.set('date', search.date);
    navigate(`/explore?${params.toString()}`);
  };

  return (
    <>
      {/* HERO */}
      <section ref={heroRef} className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            style={{ y: heroY }}
            src={HERO_IMAGE}
            alt="Crowd at a live event"
            className="w-full h-full object-cover scale-[1.4]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C232B]/80 via-[#1C232B]/70 to-[#1C232B]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C232B]/90 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#171A1D]/90 border border-[#494F55]/40 text-[#9AA1A6] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Africa's Premier Event Platform
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-[#EFEFF1] leading-[1.1] tracking-tight">
              Where Every Event <br />Is a <span className="text-white">Success</span>
            </h1>
            <p className="mt-5 text-lg text-[#949599] max-w-xl leading-relaxed">
              Tribes & Cliqs is an online self-ticketing platform that allows you to curate events seamlessly
              and provide your guests with the ultimate booking experience.
            </p>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="mt-8 rounded-2xl bg-[#171A1D]/95 backdrop-blur-md border border-[#494F55]/40 p-3 shadow-2xl shadow-black/40"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="text"
                    placeholder="City"
                    value={search.city}
                    onChange={(e) => setSearch({ ...search, city: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none focus:border-[#494F55]/50"
                  />
                </div>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <select
                    value={search.category}
                    onChange={(e) => setSearch({ ...search, category: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-[#494F55]/50 appearance-none cursor-pointer"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="date"
                    value={search.date}
                    onChange={(e) => setSearch({ ...search, date: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-[#494F55]/50 [color-scheme:dark]"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors"
              >
                <Search className="w-4 h-4" /> Search Events
              </button>
            </form>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] hover:-translate-y-0.5 transition-all shadow-lg"
              >
                Explore Events <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#494F55] text-[#EFEFF1] text-sm font-semibold hover:border-white/ hover:text-white hover:-translate-y-0.5 transition-all"
              >
                Create Event
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURED EVENTS */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Handpicked</span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Featured Events</h2>
            </div>
            <Link to="/explore" className="group hidden sm:flex items-center gap-1 text-sm text-[#949599] hover:text-white transition-colors">
              View all <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : featured.length === 0 ? (
            <p className="text-sm text-[#949599] py-8 text-center">No featured events at the moment. Check back soon!</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
              {featured.map((event) => (
                <div key={event.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TRENDING EVENTS */}
      <section className="py-16 sm:py-20 bg-[#171A1D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#949599]">
                <TrendingUp className="w-3.5 h-3.5" /> Hot Right Now
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Trending Events</h2>
            </div>
            <Link to="/explore" className="group hidden sm:flex items-center gap-1 text-sm text-[#949599] hover:text-white transition-colors">
              View all <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loadingTrending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : trending.length === 0 ? (
            <p className="text-sm text-[#949599] py-8 text-center">No trending events right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trending.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Browse by interest</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Explore Categories</h2>
            <p className="mt-2 text-sm text-[#949599] max-w-lg mx-auto">Whatever you're into, we've got an event for you.</p>
          </div>
          {loadingCategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-[#242B32] mx-auto mb-3" />
                  <div className="h-3 bg-[#242B32] rounded w-2/3 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              {categories.map((cat, i) => {
                const name = cat.name || cat;
                const Icon = CATEGORY_ICONS[name] || DEFAULT_CATEGORY_ICON;
                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <Link
                      to={`/explore?category=${encodeURIComponent(name)}`}
                      className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-[#171A1D] border border-[#262B2F] hover:border-white/ hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-lg bg-[#242B32] flex items-center justify-center group-hover:bg-[#1C232B] transition-colors">
                        <Icon className="w-6 h-6 text-[#9AA1A6] group-hover:text-white group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300" />
                      </div>
                      <span className="text-sm font-semibold text-[#EFEFF1]">{name}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 sm:py-20 bg-[#171A1D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Simple process</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EFEFF1]">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                whileHover={{ y: -4 }}
                className="group relative rounded-2xl bg-[#1C232B] border border-[#262B2F] p-6 text-center hover:border-white/ transition-colors"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#242B32] border border-[#494F55]/40 text-[#9AA1A6] text-sm font-bold flex items-center justify-center transition group-hover:border-white/ group-hover:text-white">
                  {i + 1}
                </div>
                <step.icon className="w-7 h-7 text-[#494F55] mx-auto mb-4 mt-2 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                <h3 className="text-lg font-semibold text-[#EFEFF1]">{step.title}</h3>
                <p className="mt-2 text-sm text-[#949599] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED ORGANIZERS */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Trusted creators</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Featured Organizers</h2>
          </div>
          {loadingOrganizers ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#242B32]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-[#242B32] rounded w-2/3" />
                      <div className="h-2 bg-[#242B32] rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : featuredOrganizers.length === 0 ? (
            <p className="text-sm text-[#949599] py-8 text-center">No organizers featured yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredOrganizers.map((org, i) => {
                const initials = (org.name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <motion.div
                    key={org.id || org.name}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    whileHover={{ y: -3 }}
                    className="group rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 hover:border-white/ transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#242B32] border border-[#494F55]/40 text-[#9AA1A6] font-bold flex items-center justify-center shrink-0 overflow-hidden group-hover:ring-2 group-hover:ring-white/ transition-all">
                        {org.avatar ? (
                          <img src={org.avatar} alt={org.name} className="w-full h-full object-cover" />
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#EFEFF1] truncate">{org.organization_name || org.name}</h3>
                        <p className="text-xs text-[#949599]">{org.specialty || 'Event Organizer'}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#262B2F] flex items-center justify-between">
                      <span className="text-xs text-[#494F55]">Events hosted</span>
                      <span className="text-sm font-bold text-white">{org.events_count || 0}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 sm:py-20 bg-[#171A1D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Trusted by Thousands</h2>
            <p className="mt-2 text-sm text-[#949599]">The numbers speak for themselves.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => <StatCounter key={stat.label} stat={stat} />)}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <NewsletterSection />
    </>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    // Simulated subscription - would call a real endpoint
    await new Promise((r) => setTimeout(r, 900));
    toast.success('Subscribed! Check your inbox for confirmation.');
    setEmail('');
    setSubmitting(false);
  };

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative rounded-2xl bg-[#171A1D] border border-[#262B2F] p-8 sm:p-10 text-center overflow-hidden"
        >
          <div className="relative">
            <Mail className="w-7 h-7 text-[#494F55] mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Never Miss an Event</h2>
            <p className="mt-2 text-sm text-[#949599] max-w-md mx-auto">
              Get the hottest events, exclusive deals, and early-bird tickets delivered straight to your inbox.
            </p>
            <form onSubmit={subscribe} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none focus:border-[#494F55]/50"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {submitting ? <LoadingSpinner size="sm" /> : <><Star className="w-4 h-4" /> Subscribe</>}
              </button>
            </form>
            <p className="mt-3 text-xs text-[#494F55]">No spam. Unsubscribe anytime.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
