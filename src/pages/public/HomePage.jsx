import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Mic2, Trophy, PartyPopper as FestivalIcon, Presentation,
  GraduationCap, Wrench, Drama, Church, Heart, Mail, Shirt,
  TrendingUp, ChevronRight, CreditCard, QrCode, LayoutGrid, Music, Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';

import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import HeroSection from '@/components/home/HeroSection';
import SearchBarSection from '@/components/home/SearchBarSection';
import { getFeaturedEvents, getTrendingEvents, getCategories, getFeaturedOrganizers } from '@/api/events';
import { getCategoryImage, POPULAR_CATEGORY_LIST } from '@/utils/categoryImages';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

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

  useEffect(() => {
    let active = true;

    const loadFeatured = async () => {
      try {
        const res = await getFeaturedEvents({ limit: 8 });
        const events = res.data?.events || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        if (active) setFeatured(events);
      } catch {
        if (active) setFeatured([]);
      } finally {
        if (active) setLoadingFeatured(false);
      }
    };

    const loadTrending = async () => {
      try {
        const res = await getTrendingEvents({ limit: 8 });
        const events = res.data?.events || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        if (active) setTrending(events);
      } catch {
        if (active) setTrending([]);
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
        const res = await getFeaturedOrganizers({ limit: 8 });
        const orgs = Array.isArray(res.data) ? res.data : res.data?.organizers || [];
        if (active) setFeaturedOrganizers(orgs);
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

  return (
    <div className="bg-[#1C232B] text-[#EFEFF1]">
      {/* ─── HERO SECTION ─── */}
      <HeroSection />

      {/* ─── SEARCH & EXPLORE BAR ─── */}
      <SearchBarSection />

      {/* ─── FEATURED EVENTS ─── */}
      {(loadingFeatured || featured.length > 0) && (
        <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Featured Events</h2>
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
              {featured.map((event) => (
                <div key={event.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── TRENDING EVENTS ─── */}
      {(loadingTrending || trending.length > 0) && (
        <section className="py-14 sm:py-20 bg-[#161D22] border-y border-[#262B2F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Trending Near You</h2>
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
                {trending.slice(0, 8).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── POPULAR CATEGORIES GRID ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Explore Categories</h2>
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

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">How Tribes &amp; Cliqs Works</h2>
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
            <h3 className="text-xl sm:text-2xl font-bold text-[#EFEFF1]">Hosting a concert, party, or conference?</h3>
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

      {/* ─── FEATURED ORGANIZERS (Rendered only when real organizers exist) ─── */}
      {(loadingOrganizers || featuredOrganizers.length > 0) && (
        <section className="py-14 sm:py-20 bg-[#161D22] border-y border-[#262B2F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Featured Event Organizers</h2>
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
                {featuredOrganizers.map((org) => {
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
                      {org.events_count !== undefined && (
                        <div className="mt-4 pt-3 border-t border-[#262B2F] flex items-center justify-between text-xs">
                          <span className="text-[#949599]">Events hosted</span>
                          <span className="font-bold text-white">{org.events_count}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

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
            className="px-6 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition disabled:opacity-60 shrink-0 cursor-pointer"
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Subscribe'}
          </button>
        </form>
        <p className="mt-3 text-xs text-[#949599]">No spam. Unsubscribe anytime with one click.</p>
      </div>
    </section>
  );
}
