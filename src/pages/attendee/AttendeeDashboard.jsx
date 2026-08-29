import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Ticket as TicketIcon, CalendarDays, CheckCircle2, Heart, Compass,
  ArrowRight, TrendingUp, Sparkles, Activity, MapPin, Calendar,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserTickets } from '@/api/tickets';
import { getEvents, getTrendingEvents, getRecommendedEvents } from '@/api/events';
import { getFollowingEvents } from '@/api/users';
import { getFavorites } from '@/api/users';
import EventCard from '@/components/common/EventCard';
import StatCard from '@/components/common/StatCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function AttendeeDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [followingEvents, setFollowingEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        const [ticketsRes, eventsRes, trendingRes, recRes, favRes, followRes] = await Promise.allSettled([
          getUserTickets({ limit: 20 }),
          getEvents({ limit: 8, upcoming: true }),
          getTrendingEvents({ limit: 6 }),
          getRecommendedEvents({ limit: 8 }),
          getFavorites({ limit: 4 }),
          getFollowingEvents({ limit: 4 }),
        ]);

        if (!active) return;

        const myTickets = ticketsRes.status === 'fulfilled' ? ticketsRes.value.data?.tickets ?? ticketsRes.value.data ?? [] : [];
        setTickets(Array.isArray(myTickets) ? myTickets : []);

        const eventsData = eventsRes.status === 'fulfilled' ? eventsRes.value.data?.events ?? eventsRes.value.data ?? [] : [];
        setUpcomingEvents(Array.isArray(eventsData) ? eventsData.slice(0, 8) : []);

        const trendingData = trendingRes.status === 'fulfilled' ? trendingRes.value.data?.events ?? trendingRes.value.data ?? [] : [];
        setTrending(Array.isArray(trendingData) ? trendingData.slice(0, 6) : []);

        const recData = recRes.status === 'fulfilled' ? recRes.value.data?.events ?? recRes.value.data ?? [] : [];
        setRecommended(Array.isArray(recData) ? recData.slice(0, 8) : []);

        const followData = followRes.status === 'fulfilled' ? followRes.value.data?.events ?? followRes.value.data ?? [] : [];
        setFollowingEvents(Array.isArray(followData) ? followData.slice(0, 4) : []);

        const favData = favRes.status === 'fulfilled' ? favRes.value.data?.events ?? favRes.value.data?.favorites ?? favRes.value.data ?? [] : [];
        setFavorites(Array.isArray(favData) ? favData : []);

        // Derive recent activity from ticket purchases
        const recent = (Array.isArray(myTickets) ? myTickets : [])
          .slice()
          .sort((a, b) => new Date(b.createdAt || b.purchasedAt || 0) - new Date(a.createdAt || a.purchasedAt || 0))
          .slice(0, 5)
          .map((t) => ({
            id: t.id,
            title: `Ticket for ${t.event?.title || t.eventName || 'an event'}`,
            detail: `${t.ticketType || t.type || 'General'} • #${(t.ticketNumber || t.id || '').toString().slice(-6).toUpperCase()}`,
            date: t.createdAt || t.purchasedAt,
          }));
        setActivity(recent);
      } catch (err) {
        if (active) toast.error('Failed to load dashboard data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const attendedCount = tickets.filter((t) => {
    const d = t.event?.endDate || t.event?.startDate || t.eventDate;
    return d && new Date(d) < new Date();
  }).length;

  const stats = [
    { icon: TicketIcon, label: 'My Tickets', value: tickets.length, accent: true },
    { icon: CalendarDays, label: 'Upcoming Events', value: upcomingEvents.length },
    { icon: CheckCircle2, label: 'Events Attended', value: attendedCount },
    { icon: Heart, label: 'Favorite Events', value: favorites.length },
  ];

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading your dashboard..." className="py-24" />;
  }

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-8">
      {/* Welcome banner */}
      <motion.div variants={itemFade} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#171A1D] via-[#1C232B] to-[#242B32] border border-[#262B2F] p-6 sm:p-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <motion.div
            initial={{ scale: 0.7, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white flex items-center justify-center text-[#1C232B] text-2xl font-bold shrink-0 shadow-lg shadow-white/5"
          >
            {(user?.name || user?.email || 'U')
              .split(' ')
              .map((s) => s[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'},
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#EFEFF1] truncate">
              {user?.name || 'there'}
            </h1>
            <p className="mt-1 text-sm text-[#949599] flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#494F55]" />
              Attendee Overview
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemFade} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </motion.div>

      {/* Upcoming events - horizontal scroll */}
      <motion.div variants={itemFade}>
        <SectionHeader title="Upcoming Live Events" subtitle="Concerts, festivals, and parties coming up" />
        {upcomingEvents.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming events listed"
            description="New events are added daily. Check back soon for trending shows."
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x scroll-pl-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="snap-start shrink-0 w-72 pointer-events-none">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recommended for you */}
      <motion.div variants={itemFade}>
        <SectionHeader title="Recommended For You" subtitle="Personalized recommendations based on your activity" />
        {recommended.length === 0 ? (
          <EmptyState icon={Sparkles} title="No recommendations yet" description="Personalized event recommendations will appear here." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map((event) => (
              <div key={event.id} className="pointer-events-none">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* From organizers you follow */}
      {followingEvents.length > 0 && (
        <motion.div variants={itemFade}>
          <SectionHeader title="From Organizers You Follow" subtitle="New events from your favorite organizers" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {followingEvents.map((event) => (
              <div key={event.id} className="pointer-events-none">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trending near you */}
        <motion.div variants={itemFade} className="lg:col-span-2">
          <SectionHeader title="Trending Near You" subtitle="Hot events in your area" />
          {trending.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No trending events" description="Trending events will appear here." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {trending.map((event) => (
                <div key={event.id} className="pointer-events-none">
                  <EventCard event={event} variant="compact" />
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent activity */}
        <motion.div variants={itemFade}>
          <SectionHeader title="Recent Activity" subtitle="Your latest bookings" />
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 space-y-3">
            {activity.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="w-8 h-8 text-[#494F55] mx-auto mb-2" />
                <p className="text-sm text-[#949599]">No recent activity</p>
              </div>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="group flex gap-3 items-start p-2 -m-2 rounded-lg bg-[#171A1D]">
                  <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                    <TicketIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#EFEFF1] truncate">{a.title}</p>
                    <p className="text-xs text-[#949599] truncate">{a.detail}</p>
                    <p className="text-[10px] text-[#494F55] mt-0.5">
                      {a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-[#EFEFF1]">{title}</h2>
        {subtitle && <p className="text-sm text-[#949599]">{subtitle}</p>}
      </div>
    </div>
  );
}
