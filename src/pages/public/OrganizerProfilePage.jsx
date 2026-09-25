import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Globe, Mail, Phone, Calendar, Users, Star,
  ShieldCheck, Share2, ArrowLeft, ExternalLink, UserPlus, UserCheck,
  Sparkles, Ticket, MessageSquare, CheckCircle2, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPublicOrganizerProfile } from '@/api/events';
import { followOrganizer, unfollowOrganizer } from '@/api/users';
import { useAuth } from '@/context/AuthContext';
import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import SocialShareModal from '@/components/common/SocialShareModal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const TABS = [
  { id: 'upcoming', label: 'Upcoming Events' },
  { id: 'past', label: 'Past Events' },
  { id: 'reviews', label: 'Reviews & Ratings' },
  { id: 'about', label: 'About & Information' },
];

export default function OrganizerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const org = data?.organizer;
  const orgName = org?.organization_name || org?.name || 'Event Organizer';

  useDocumentTitle(
    `${orgName} — Events & Profile | Tribes & Cliqs`,
    org?.description || `Discover upcoming concerts, festivals, and live events hosted by ${orgName} on Tribes & Cliqs.`
  );

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await getPublicOrganizerProfile(id);
        if (active && res.data) {
          setData(res.data);
          setIsFollowing(Boolean(res.data.stats?.isFollowing));
          setFollowersCount(Number(res.data.stats?.followersCount || 0));
        }
      } catch (err) {
        console.error('Failed to load organizer profile:', err);
        if (active) toast.error('Failed to load organizer profile');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProfile();
    return () => { active = false; };
  }, [id]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      toast('Please sign in to follow organizers', { icon: '🔒' });
      navigate('/login', { state: { from: `/organizers/${id}` } });
      return;
    }

    setFollowingLoading(true);
    const nextState = !isFollowing;
    // Optimistic UI
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (nextState) {
        await followOrganizer(id);
        toast.success(`You are now following ${orgName}!`);
      } else {
        await unfollowOrganizer(id);
        toast('Unfollowed organizer', { icon: '👋' });
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      // Revert optimistic update
      setIsFollowing(!nextState);
      setFollowersCount((prev) => (nextState ? Math.max(0, prev - 1) : prev + 1));
      toast.error('Failed to update follow status');
    } finally {
      setFollowingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111417] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading organizer profile..." />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-[#111417] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#1C232B] flex items-center justify-center mb-4 text-[#949599]">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Organizer Not Found</h2>
        <p className="text-sm text-[#949599] max-w-sm mb-6">
          This organizer page doesn't exist or may have been deactivated.
        </p>
        <Link
          to="/explore"
          className="px-6 py-2.5 rounded-xl bg-[#b21414] hover:bg-[#911010] text-white text-sm font-semibold transition"
        >
          Explore All Events
        </Link>
      </div>
    );
  }

  const upcomingEvents = data?.upcomingEvents || [];
  const pastEvents = data?.pastEvents || [];
  const reviews = data?.reviews || [];
  const stats = data?.stats || {};

  const bannerImg = org.banner_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80';
  const logoImg = org.logo_url || org.avatar;

  return (
    <div className="min-h-screen bg-[#111417] text-[#EFEFF1] pb-24">
      {/* ── Banner Header ── */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-[#171A1D]">
        <img
          src={bannerImg}
          alt={orgName}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111417] via-[#111417]/50 to-transparent" />

        {/* Back Link */}
        <div className="absolute top-6 left-6 z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111417]/80 backdrop-blur-md border border-white/10 text-xs font-medium text-white hover:bg-[#111417] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Share Button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111417]/80 backdrop-blur-md border border-white/10 text-xs font-medium text-white hover:bg-[#111417] transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Profile</span>
          </button>
        </div>
      </div>

      {/* ── Organizer Identity Card ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-28 relative z-20">
        <div className="bg-[#171A1D]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left: Avatar & Meta */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                {logoImg ? (
                  <img
                    src={logoImg}
                    alt={orgName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-white/15 bg-[#1C232B] shadow-lg shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#1C232B] border-2 border-white/15 flex items-center justify-center text-white/50 text-2xl font-bold shrink-0">
                    {orgName.charAt(0).toUpperCase()}
                  </div>
                )}
                {org.is_verified && (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-[#22C55E] text-black p-1.5 rounded-full shadow-md" title="Verified Organizer">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {orgName}
                  </h1>
                  {org.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  {org.category && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-[#949599]">
                      {org.category}
                    </span>
                  )}
                </div>

                {org.tagline && (
                  <p className="text-sm text-white/80 font-medium">
                    {org.tagline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#949599] pt-1">
                  {org.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#b21414]" />
                      {org.city}, {org.country || 'Ghana'}
                    </span>
                  )}
                  {org.website && (
                    <a
                      href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-white hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#b21414]" />
                      <span>{org.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleFollow}
                disabled={followingLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                  isFollowing
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    : 'bg-[#b21414] hover:bg-[#911010] text-white shadow-red-900/30'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow Organizer</span>
                  </>
                )}
              </button>

              {org.email && (
                <a
                  href={`mailto:${org.email}?subject=Inquiry regarding ${encodeURIComponent(orgName)} events`}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition"
                  title="Contact Organizer"
                >
                  <Mail className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="bg-[#111417]/50 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Ticket className="w-3.5 h-3.5 text-[#b21414]" />
                <span>Upcoming Events</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {stats.upcomingCount ?? upcomingEvents.length}
              </p>
            </div>

            <div className="bg-[#111417]/50 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#b21414]" />
                <span>Total Hosted</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {stats.totalEvents ?? (upcomingEvents.length + pastEvents.length)}
              </p>
            </div>

            <div className="bg-[#111417]/50 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Users className="w-3.5 h-3.5 text-[#b21414]" />
                <span>Community Followers</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {followersCount.toLocaleString()}
              </p>
            </div>

            <div className="bg-[#111417]/50 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-xs text-[#949599] mb-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Attendee Rating</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                {stats.averageRating ? `${stats.averageRating} ★` : '5.0 ★'}
                <span className="text-xs text-[#949599] font-normal ml-1.5">
                  ({stats.reviewCount || reviews.length} reviews)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Navigation Tabs ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center border-b border-white/10 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const count =
              tab.id === 'upcoming' ? upcomingEvents.length :
              tab.id === 'past' ? pastEvents.length :
              tab.id === 'reviews' ? (stats.reviewCount || reviews.length) : null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3.5 px-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-[#949599] hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {count !== null && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-[#b21414] text-white' : 'bg-white/5 text-[#949599]'
                  }`}>
                    {count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeOrgTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b21414]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab Panels ── */}
        <div className="mt-8">
          {/* UPCOMING EVENTS */}
          {activeTab === 'upcoming' && (
            <div>
              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              ) : (
                <div className="bg-[#171A1D] border border-white/5 rounded-3xl p-12 text-center">
                  <Ticket className="w-12 h-12 text-[#949599]/40 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">No Upcoming Events Right Now</h3>
                  <p className="text-sm text-[#949599] max-w-sm mx-auto mb-5">
                    {orgName} doesn't have any scheduled events currently. Follow them to be notified as soon as tickets drop!
                  </p>
                  <button
                    onClick={handleToggleFollow}
                    className="px-5 py-2.5 rounded-xl bg-[#b21414] hover:bg-[#911010] text-white text-xs font-bold transition"
                  >
                    Follow for New Event Alerts
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PAST EVENTS */}
          {activeTab === 'past' && (
            <div>
              {pastEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map((ev) => (
                    <div key={ev.id} className="opacity-80 hover:opacity-100 transition">
                      <EventCard event={ev} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#171A1D] border border-white/5 rounded-3xl p-12 text-center">
                  <Calendar className="w-12 h-12 text-[#949599]/40 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">No Past Event Archive</h3>
                  <p className="text-sm text-[#949599] max-w-sm mx-auto">
                    There are no archived past events on record for this organizer yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* REVIEWS & RATINGS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-[#171A1D] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1C232B] flex items-center justify-center font-bold text-white text-sm">
                            {rev.reviewer_name?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{rev.reviewer_name || 'Verified Attendee'}</p>
                            <p className="text-xs text-[#949599]">{rev.event_title}</p>
                          </div>
                        </div>

                        {/* Star Rating */}
                        <div className="flex items-center gap-1 bg-amber-400/10 px-2 py-1 rounded-lg">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-bold text-amber-300">{rev.rating}.0</span>
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-sm text-white/80 leading-relaxed italic">
                          "{rev.comment}"
                        </p>
                      )}

                      <p className="text-[11px] text-[#949599] mt-3">
                        {new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#171A1D] border border-white/5 rounded-3xl p-12 text-center">
                  <Star className="w-12 h-12 text-amber-400/30 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">No Reviews Yet</h3>
                  <p className="text-sm text-[#949599] max-w-sm mx-auto">
                    Reviews from attendees who check into {orgName}'s events will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ABOUT & POLICIES */}
          {activeTab === 'about' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[#171A1D] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">About {orgName}</h3>
                  <p className="text-sm text-[#949599] leading-relaxed whitespace-pre-line">
                    {org.about || org.description || `${orgName} is an official event host and entertainment producer on Tribes & Cliqs.`}
                  </p>
                </div>

                {org.social_links && Object.keys(org.social_links).length > 0 && (
                  <div className="pt-6 border-t border-white/10">
                    <h4 className="text-xs font-bold text-[#949599] uppercase tracking-wider mb-3">
                      Official Social Channels
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(org.social_links).map(([platform, handle]) => {
                        if (!handle) return null;
                        return (
                          <span
                            key={platform}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/90 capitalize flex items-center gap-1.5"
                          >
                            <Globe className="w-3 h-3 text-[#b21414]" />
                            {platform}: {handle}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#171A1D] border border-white/5 rounded-3xl p-6 space-y-5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Trust & Verification</span>
                </h4>

                <div className="space-y-3 text-xs text-[#949599]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span>Identity Status</span>
                    <span className="font-semibold text-white">
                      {org.is_verified ? 'Verified Organizer' : 'Standard Partner'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span>Platform Member Since</span>
                    <span className="font-semibold text-white">
                      {org.created_at ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '2024'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span>Events Delivery</span>
                    <span className="font-semibold text-emerald-400">100% Guaranteed</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#111417] border border-white/5 text-xs text-[#949599] leading-relaxed">
                  All ticket purchases for {orgName} events are encrypted, authenticated, and protected under Tribes & Cliqs Buyer Guarantee.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <SocialShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`${orgName} on Tribes & Cliqs`}
        description={org.description || `Discover events hosted by ${orgName}.`}
        url={window.location.href}
      />
    </div>
  );
}
