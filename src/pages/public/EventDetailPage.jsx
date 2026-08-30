import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Clock, Share2, Heart, ChevronLeft, Ticket,
  Minus, Plus, Tag, Mail, Phone, Shirt, ChevronDown, ChevronRight,
  CheckCircle2, Facebook, Twitter, Linkedin, Link2, CreditCard,
  Smartphone, Wallet, ShieldCheck, Loader2, User, AlertCircle,
  UserPlus, UserCheck, UsersRound, CalendarClock, Trash2,
  Bell, BellRing, CalendarPlus, MessageCircle, Send as TelegramIcon,
  MessageSquare, Car, Sparkles, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import SocialShareModal from '@/components/common/SocialShareModal';
import { getEvent, getTrendingEvents, toggleEventReminder, getEventReminderStatus } from '@/api/events';
import { getGoogleCalendarUrl, getOutlookCalendarUrl, downloadIcsFile } from '@/utils/calendar';
import { getTicketTypes } from '@/api/tickets';
import { toggleFavorite, followOrganizer, unfollowOrganizer } from '@/api/users';
import {
  getEventMeetups, createMeetup, joinMeetup, leaveMeetup, deleteMeetup,
  getEventAttendees, getEventDiscussions, postEventDiscussion,
} from '@/api/meetups';
import { getEventResale, purchaseResaleListing } from '@/api/resale';
import { applyCoupon, createOrder, initiatePayment } from '@/api/orders';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import InteractiveSeatMap from '@/components/events/InteractiveSeatMap';

const TABS = ['Overview', 'Tickets', 'Seating & VIP Sections', 'Squads & Group Outings', 'Community & Attendees', 'FAQs'];

const PAYMENT_METHODS = [
  { id: 'paystack', label: 'Paystack', icon: ShieldCheck },
  { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
];

function EventCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#171A1D] border border-[#262B2F]">
      <div className="aspect-[16/10] bg-[#1C232B] animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#1C232B] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[#1C232B] rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user: currentUser } = useAuth();
  const { format } = useCurrency();

  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialTargetMeetup, setSocialTargetMeetup] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isReminded, setIsReminded] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Meet-ups state
  const [meetups, setMeetups] = useState([]);
  const [meetupsLoading, setMeetupsLoading] = useState(true);
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [meetupForm, setMeetupForm] = useState({ title: '', description: '', meetingSpot: '', meetAt: '', maxMembers: '', type: 'general' });
  const [meetupBusy, setMeetupBusy] = useState(false);

  // Community / Attendees / Discussion state
  const [attendees, setAttendees] = useState([]);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [attendeesLoading, setAttendeesLoading] = useState(true);
  const [discussions, setDiscussions] = useState([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(true);
  const [discussionMessage, setDiscussionMessage] = useState('');
  const [postingDiscussion, setPostingDiscussion] = useState(false);

  // Purchase modal state
  const [quantities, setQuantities] = useState({});
  const [purchaseModal, setPurchaseModal] = useState(null); // ticket type object
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Resale marketplace state
  const [resaleListings, setResaleListings] = useState([]);
  const [resaleLoading, setResaleLoading] = useState(true);
  const [buyingResaleId, setBuyingResaleId] = useState(null);

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (isAuthenticated && id) {
      getEventReminderStatus(id)
        .then((res) => setIsReminded(!!res.data?.isReminded))
        .catch(() => {});
    }
  }, [isAuthenticated, id]);

  const handleToggleReminder = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to set event reminders');
      navigate('/login');
      return;
    }
    setReminderLoading(true);
    try {
      const res = await toggleEventReminder(id);
      setIsReminded(!!res.data?.isReminded);
      toast.success(res.data?.message || 'Reminder updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update reminder');
    } finally {
      setReminderLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getEvent(id);
        if (!active) return;
        const ev = res.data?.data || res.data;
        setEvent(ev);
        setIsFav(!!ev?.isFavorite);
        setIsFollowing(!!ev?.organizer?.isFollowing);
        setFollowersCount(ev?.organizer?.followersCount ?? 0);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load event');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    const loadResale = async () => {
      setResaleLoading(true);
      try {
        const res = await getEventResale(id);
        if (!active) return;
        const data = res.data?.listings ?? [];
        setResaleListings(Array.isArray(data) ? data : []);
      } catch {
        if (active) setResaleListings([]);
      } finally {
        if (active) setResaleLoading(false);
      }
    };
    loadResale();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    const loadTickets = async () => {
      setLoadingTickets(true);
      try {
        const res = await getTicketTypes(id);
        if (!active) return;
        const data = res.data?.data || res.data || [];
        setTickets(Array.isArray(data) ? data : []);
      } catch {
        // tickets may not exist yet
        if (active) setTickets([]);
      } finally {
        if (active) setLoadingTickets(false);
      }
    };
    const loadRelated = async () => {
      try {
        const res = await getTrendingEvents({ limit: 3 });
        if (!active) return;
        const data = res.data?.data || res.data || [];
        setRelated(Array.isArray(data) ? data.filter((e) => e.id !== Number(id)) : []);
      } catch {
        // graceful
      }
    };
    if (id) {
      loadTickets();
      loadRelated();
    }
    return () => { active = false; };
  }, [id]);

  // Meet-ups & Community for this event
  useEffect(() => {
    let active = true;
    const loadCommunityData = async () => {
      setMeetupsLoading(true);
      setAttendeesLoading(true);
      setDiscussionsLoading(true);
      try {
        const [mRes, aRes, dRes] = await Promise.allSettled([
          getEventMeetups(id),
          getEventAttendees(id),
          getEventDiscussions(id),
        ]);
        if (!active) return;
        if (mRes.status === 'fulfilled') {
          const data = mRes.value.data?.meetups ?? mRes.value.data?.data ?? [];
          setMeetups(Array.isArray(data) ? data : []);
        }
        if (aRes.status === 'fulfilled') {
          setAttendees(aRes.value.data?.attendees || []);
          setTotalAttendees(aRes.value.data?.totalAttendees || 0);
        }
        if (dRes.status === 'fulfilled') {
          setDiscussions(dRes.value.data?.discussions || []);
        }
      } catch {
        // fail gracefully
      } finally {
        if (active) {
          setMeetupsLoading(false);
          setAttendeesLoading(false);
          setDiscussionsLoading(false);
        }
      }
    };
    if (id) loadCommunityData();
    return () => { active = false; };
  }, [id]);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to follow organizers');
      navigate('/login');
      return;
    }
    if (!event?.organizer) return;
    setFollowLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev);
    setFollowersCount((c) => Math.max(0, c + (prev ? -1 : 1)));
    try {
      if (prev) {
        await unfollowOrganizer(event.organizer.id);
        toast.success('Unfollowed organizer');
      } else {
        await followOrganizer(event.organizer.id);
        toast.success('Now following this organizer');
      }
    } catch (err) {
      setIsFollowing(prev);
      setFollowersCount((c) => Math.max(0, c + (prev ? 1 : -1)));
      toast.error(err.response?.data?.message || 'Could not update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const refreshMeetups = async () => {
    try {
      const res = await getEventMeetups(id);
      const data = res.data?.meetups ?? res.data?.data ?? [];
      setMeetups(Array.isArray(data) ? data : []);
    } catch {
      /* keep current list */
    }
  };

  const handleCreateMeetup = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to create a group outing');
      navigate('/login');
      return;
    }
    if (!meetupForm.title.trim()) {
      toast.error('Give your group outing a title');
      return;
    }
    setMeetupBusy(true);
    try {
      await createMeetup(id, {
        title: meetupForm.title,
        description: meetupForm.description || undefined,
        meetingSpot: meetupForm.meetingSpot || undefined,
        meetAt: meetupForm.meetAt ? new Date(meetupForm.meetAt).toISOString() : undefined,
        maxMembers: meetupForm.maxMembers ? Number(meetupForm.maxMembers) : undefined,
        type: meetupForm.type || 'general',
      });
      toast.success('Group Outing created! Invite your squad now.');
      setCreateMeetupOpen(false);
      setMeetupForm({ title: '', description: '', meetingSpot: '', meetAt: '', maxMembers: '', type: 'general' });
      refreshMeetups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create meet-up');
    } finally {
      setMeetupBusy(false);
    }
  };

  const handlePostDiscussion = async (e) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please sign in to join the conversation');
      navigate('/login');
      return;
    }
    if (!discussionMessage.trim()) return;
    setPostingDiscussion(true);
    try {
      const res = await postEventDiscussion(id, { message: discussionMessage.trim() });
      if (res.data?.discussion) {
        setDiscussions((prev) => [...prev, res.data.discussion]);
      }
      setDiscussionMessage('');
      toast.success('Message posted to event wall!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post message');
    } finally {
      setPostingDiscussion(false);
    }
  };

  const handleToggleJoin = async (meetup) => {
    if (!isAuthenticated) {
      toast.error('Please log in to join a meet-up');
      navigate('/login');
      return;
    }
    setMeetupBusy(true);
    try {
      if (meetup.joined) {
        await leaveMeetup(meetup.id);
        toast.success('You left the meet-up');
      } else {
        await joinMeetup(meetup.id);
        toast.success('You joined the meet-up!');
      }
      refreshMeetups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update meet-up');
    } finally {
      setMeetupBusy(false);
    }
  };

  const handleDeleteMeetup = async (meetup) => {
    if (!window.confirm('Delete this meet-up?')) return;
    setMeetupBusy(true);
    try {
      await deleteMeetup(meetup.id);
      toast.success('Meet-up deleted');
      refreshMeetups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete meet-up');
    } finally {
      setMeetupBusy(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to save favorites');
      navigate('/login');
      return;
    }
    setFavLoading(true);
    const prev = isFav;
    setIsFav(!prev);
    try {
      await toggleFavorite(id);
      toast.success(!prev ? 'Added to favorites' : 'Removed from favorites');
    } catch {
      setIsFav(prev);
      toast.error('Could not update favorite');
    } finally {
      setFavLoading(false);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = event?.title || 'Event';
    const date = event?.startDate ? new Date(event.startDate).toLocaleDateString() : '';
    const venue = event?.venue || '';
    const squadMsg = `Hey! Check out "${title}" on Tribes & Cliqs! Happening ${date ? `on ${date}` : ''} ${venue ? `at ${venue}` : ''}.\nGet tickets or join the squad here: ${url}`;

    const shareUrls = {
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(squadMsg)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Join me at ${title}!`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Going to ${title} on Tribes & Cliqs! Get your tickets: `)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=500');
    }
    setShareOpen(false);
  };

  const setQty = (ticketId, delta) => {
    setQuantities((prev) => {
      const current = prev[ticketId] || 0;
      const next = Math.max(0, Math.min(10, current + delta));
      return { ...prev, [ticketId]: next };
    });
  };

  const openPurchase = (ticket) => {
    if (!isAuthenticated) {
      toast.error('Please log in to purchase tickets');
      navigate('/login');
      return;
    }
    setPurchaseModal(ticket);
    if (!quantities[ticket.id]) setQuantities((prev) => ({ ...prev, [ticket.id]: 1 }));
  };

  const selectedQty = purchaseModal ? quantities[purchaseModal.id] || 1 : 0;
  const subtotal = purchaseModal ? Number(purchaseModal.price) * selectedQty : 0;
  const discountAmount = (subtotal * couponDiscount) / 100;
  const total = subtotal - discountAmount;

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    try {
      const res = await applyCoupon({ code: coupon, eventId: id, amount: subtotal });
      const disc = res.data?.discount || res.data?.discountPercent || 0;
      setCouponDiscount(disc);
      toast.success(`Coupon applied: ${disc}% off!`);
    } catch (err) {
      setCouponDiscount(0);
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleBuyResale = async (listing) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to buy a resale ticket');
      navigate('/login');
      return;
    }
    setBuyingResaleId(listing.id);
    try {
      const res = await purchaseResaleListing(listing.id);
      const data = res.data?.data || res.data;
      const authUrl = data?.authorizationUrl;
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
      toast.success('Resale ticket purchased! It\u2019s in your tickets now.');
      setResaleListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to buy resale ticket');
      setResaleListings((prev) => prev.filter((l) => l.id !== listing.id));
    } finally {
      setBuyingResaleId(null);
    }
  };

  const handleProceedPayment = async () => {
    if (selectedQty < 1) {
      toast.error('Please select at least one ticket');
      return;
    }
    setPlacingOrder(true);
    try {
      const orderRes = await createOrder({
        eventId: id,
        items: [{ ticketTypeId: purchaseModal.id, quantity: selectedQty }],
        couponCode: couponDiscount > 0 ? coupon : undefined,
        paymentMethod,
      });
      const order = orderRes.data?.data || orderRes.data;
      // createOrder already initialises the Paystack session server-side and
      // returns its authorization_url. Only fall back to initiatePayment when
      // there is none (e.g. free orders) — re-initialising with the same
      // reference is rejected by Paystack as a duplicate.
      const authUrl = order?.authorizationUrl;
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
      const payRes = await initiatePayment(order.id, { paymentMethod });
      const initUrl = payRes.data?.authorizationUrl || payRes.data?.data?.authorizationUrl;
      if (initUrl) {
        window.location.href = initUrl;
      } else {
        toast.success('Order placed! Redirecting to your tickets...');
        navigate('/attendee/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading event..." />
        </div>
    );
  }

  if (!event) {
    return (
      <EmptyState
          icon={AlertCircle}
          title="Event not found"
          description="This event may have been removed or doesn't exist."
          action={() => navigate('/explore')}
          actionLabel="Browse Events"
        />
    );
  }

  const fmtDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBA';
  const fmtTime = event.startDate
    ? new Date(event.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';
  const faqs = event.faqs || [];
  const mapSrc = event.venue || event.location
    ? `https://maps.google.com/maps?q=${encodeURIComponent(`${event.venue || ''} ${event.location || ''}`)}&output=embed`
    : null;

  return (
    <>
      {/* Banner */}
      <div className="relative h-[30vh] sm:h-[42vh] min-h-[200px] sm:min-h-[320px] w-full overflow-hidden">
        <motion.img
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          src={event.image || event.banner || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg'}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] via-[#1C232B]/50 to-[#1C232B]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C232B]/80 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <Link to="/explore" className="group inline-flex items-center gap-1 text-sm text-[#949599] hover:text-white mb-3 transition-colors">
              <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to Explore
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-2xl">
                {event.category && (
                  <Badge variant="gold" className="mb-3">{event.category}</Badge>
                )}
                <h1 className="text-3xl sm:text-4xl font-bold text-[#EFEFF1] leading-tight">{event.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#949599]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#949599]" /> {fmtDate}
                  </span>
                  {fmtTime && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#949599]" /> {fmtTime}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#949599]" /> {event.venue || event.location || 'Venue TBA'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Event Reminder Toggle */}
                <motion.button
                  onClick={handleToggleReminder}
                  disabled={reminderLoading}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ y: -2 }}
                  title={isReminded ? 'Event reminder active (click to remove)' : 'Set event reminder'}
                  className={`w-11 h-11 rounded-lg backdrop-blur border flex items-center justify-center transition disabled:opacity-50 ${
                    isReminded
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-[#171A1D]/90 border-[#494F55]/40 text-[#EFEFF1] hover:text-white hover:border-[#494F55]'
                  }`}
                >
                  {reminderLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isReminded ? (
                    <BellRing className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </motion.button>

                {/* Add to Calendar Dropdown */}
                <div className="relative">
                  <motion.button
                    onClick={() => setCalendarOpen((v) => !v)}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ y: -2 }}
                    title="Add to Calendar"
                    className="w-11 h-11 rounded-lg bg-[#171A1D]/90 backdrop-blur border border-[#494F55]/40 flex items-center justify-center text-[#EFEFF1] hover:text-white hover:border-[#494F55] transition"
                  >
                    <CalendarPlus className="w-4 h-4" />
                  </motion.button>
                  <AnimatePresence>
                    {calendarOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-52 rounded-xl bg-[#171A1D] border border-[#494F55]/40 shadow-2xl py-2 z-30"
                      >
                        <p className="px-3.5 py-1 text-[10px] font-bold text-[#949599] uppercase tracking-wider">Sync Calendar</p>
                        <a
                          href={getGoogleCalendarUrl(event)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setCalendarOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[#EFEFF1] hover:bg-white/10 transition"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-400" /> Google Calendar
                        </a>
                        <a
                          href={getOutlookCalendarUrl(event)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setCalendarOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[#EFEFF1] hover:bg-white/10 transition"
                        >
                          <Calendar className="w-3.5 h-3.5 text-sky-400" /> Outlook Calendar
                        </a>
                        <button
                          type="button"
                          onClick={() => { downloadIcsFile(event); setCalendarOpen(false); toast.success('Apple iCal / .ics file downloaded'); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[#EFEFF1] hover:bg-white/10 transition text-left"
                        >
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Apple Calendar (.ics)
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Social Share & Squad Hub */}
                <motion.button
                  onClick={() => { setSocialTargetMeetup(null); setSocialModalOpen(true); }}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ y: -2 }}
                  title="Share Event & Invite Friends"
                  className="w-11 h-11 rounded-lg bg-[#171A1D]/90 backdrop-blur border border-[#494F55]/40 flex items-center justify-center text-[#EFEFF1] hover:text-white hover:border-[#494F55] transition"
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>

                {/* Favorite Toggle */}
                <motion.button
                  onClick={handleFavorite}
                  disabled={favLoading}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ y: -2 }}
                  title="Favorite Event"
                  className="w-11 h-11 rounded-lg bg-[#171A1D]/90 backdrop-blur border border-[#494F55]/40 flex items-center justify-center text-[#EFEFF1] hover:border-[#494F55] transition disabled:opacity-50"
                >
                  <motion.span
                    key={isFav ? 'on' : 'off'}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                    className="flex"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-[#EFEFF1] text-white' : ''}`} />
                  </motion.span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Organizer card */}
            {event.organizer && (
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 mb-6 flex items-center justify-between gap-4 hover:border-white/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-[#242B32] border border-[#494F55]/40 text-[#9AA1A6] flex items-center justify-center shrink-0 overflow-hidden">
                    {event.organizer.avatar ? (
                      <img src={event.organizer.avatar} alt={event.organizer.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#494F55] uppercase tracking-wider">Organized by</p>
                    <h3 className="text-sm font-semibold text-[#EFEFF1] truncate">{event.organizer.name}</h3>
                    <p className="text-xs text-[#949599] mt-0.5">
                      {followersCount.toLocaleString()} follower{followersCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                      isFollowing
                        ? 'bg-white/10 text-white border border-white/20 hover:bg-white/10'
                        : 'bg-white text-[#1C232B] hover:bg-[#CBD5E1]'
                    }`}
                  >
                    {followLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFollowing ? (
                      <><UserCheck className="w-4 h-4" /> Following</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Follow</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div id="event-tabs-section" className="flex items-center gap-1 border-b border-[#262B2F] mb-6 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab ? 'text-[#EFEFF1]' : 'text-[#949599] hover:text-[#EFEFF1]'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#494F55]"
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {/* OVERVIEW */}
                {activeTab === 'Overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-[#EFEFF1] mb-3">About this event</h3>
                      <p className="text-sm text-[#949599] leading-relaxed whitespace-pre-line">
                        {event.description || 'No description available for this event yet.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {event.dressCode && (
                        <InfoRow icon={Shirt} label="Dress Code" value={event.dressCode} />
                      )}
                      {event.contactEmail && (
                        <InfoRow icon={Mail} label="Contact Email" value={event.contactEmail} />
                      )}
                      {event.contactPhone && (
                        <InfoRow icon={Phone} label="Contact Phone" value={event.contactPhone} />
                      )}
                    </div>

                    {mapSrc && (
                      <div>
                        <h3 className="text-lg font-semibold text-[#EFEFF1] mb-3">Location</h3>
                        <div className="rounded-xl overflow-hidden border border-[#262B2F] h-64">
                          <iframe
                            src={mapSrc}
                            title="Event location map"
                            className="w-full h-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                        <p className="mt-2 text-sm text-[#949599] flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#494F55]" />
                          {event.venue || event.location}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TICKETS */}
                {activeTab === 'Tickets' && (
                  <div>
                    {loadingTickets ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner label="Loading tickets..." />
                      </div>
                    ) : tickets.length === 0 ? (
                      <EmptyState
                        icon={Ticket}
                        title="No tickets available"
                        description="Tickets for this event haven't been released yet. Check back soon!"
                      />
                    ) : (
                      <div className="space-y-4">
                        {tickets.map((ticket) => {
                          const qty = quantities[ticket.id] || 0;
                          const available = ticket.quantityAvailable ?? ticket.available ?? null;
                          return (
                            <motion.div
                              key={ticket.id}
                              whileHover={{ y: -2 }}
                              className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 hover:border-white/40 transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold text-[#EFEFF1]">{ticket.name}</h4>
                                    {ticket.isVip && <Badge variant="gold" size="sm">VIP</Badge>}
                                  </div>
                                  <p className="mt-1 text-sm text-[#949599] line-clamp-2">{ticket.description || ticket.name}</p>
                                  <div className="mt-2 flex items-center gap-3 text-xs">
                                    <span className="text-2xl font-bold text-white">
                                      {ticket.price === 0 ? 'Free' : format(ticket.price)}
                                    </span>
                                    {available !== null && (
                                      <span className={available > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        {available > 0 ? `${available} available` : 'Sold out'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Quantity selector */}
                                  <div className="flex items-center rounded-lg border border-[#494F55]/40">
                                    <button
                                      onClick={() => setQty(ticket.id, -1)}
                                      disabled={qty <= 0}
                                      className="w-10 h-10 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1] disabled:opacity-30 transition"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-10 text-center text-sm font-semibold text-[#EFEFF1]">{qty}</span>
                                    <button
                                      onClick={() => setQty(ticket.id, 1)}
                                      disabled={available !== null && qty >= available}
                                      className="w-10 h-10 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1] disabled:opacity-30 transition"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => openPurchase(ticket)}
                                    disabled={available !== null && available <= 0}
                                    className="px-5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    Buy Now
                                  </button>
                                  </div>
                                </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* Resale marketplace */}
                    {resaleLoading ? (
                      <div className="mt-8 flex justify-center py-8">
                        <LoadingSpinner label="Loading resale tickets..." />
                      </div>
                    ) : resaleListings.length > 0 ? (
                      <div className="mt-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-lg bg-[#242B32] border border-[#494F55]/40 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-[#9AA1A6]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#EFEFF1]">Resale Tickets</h3>
                            <p className="text-xs text-[#949599]">
                              Tickets other attendees are reselling. Buy one and the ticket transfers to you instantly.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {resaleListings.map((listing) => (
                            <motion.div
                              key={listing.id}
                              whileHover={{ y: -2 }}
                              className="rounded-xl bg-[#14171A] border border-[#262B2F] p-4 sm:p-5 hover:border-white/40 transition-colors"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="gold" size="sm">Resale</Badge>
                                    <span className="text-sm font-semibold text-[#EFEFF1]">{listing.ticketTypeName || 'General Admission'}</span>
                                  </div>
                                  <p className="mt-1.5 text-xs text-[#949599] flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Sold by {listing.seller?.name || 'another attendee'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <span className="text-2xl font-bold text-white">{format(listing.price)}</span>
                                  </div>
                                  <button
                                    onClick={() => handleBuyResale(listing)}
                                    disabled={buyingResaleId === listing.id}
                                    className="px-5 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                  >
                                    {buyingResaleId === listing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                                    {buyingResaleId === listing.id ? 'Buying...' : 'Buy'}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* SEATING & VIP SECTIONS */}
                {activeTab === 'Seating & VIP Sections' && (
                  <div className="space-y-6">
                    <InteractiveSeatMap
                      ticketTypes={tickets}
                      currency={event?.currency || 'GHS'}
                      onSelectTicket={(ticket) => openPurchase(ticket)}
                    />
                  </div>
                )}

                {/* SQUADS & GROUP OUTINGS */}
                {activeTab === 'Squads & Group Outings' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161D22] border border-[#262B2F]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-white/10 text-white">
                            <UsersRound className="w-4 h-4" />
                          </span>
                          <h3 className="text-base font-bold text-[#EFEFF1]">Squads & Group Outings</h3>
                        </div>
                        <p className="text-xs text-[#949599] mt-1">
                          Don't go solo! Join a pre-party, carpool, or squad meetup organized by verified attendees.
                        </p>
                      </div>
                      <button
                        onClick={() => setCreateMeetupOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition shrink-0 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Create Group Outing
                      </button>
                    </div>

                    {meetupsLoading ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner label="Loading group outings..." />
                      </div>
                    ) : meetups.length === 0 ? (
                      <div className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-3">
                          <UsersRound className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-[#EFEFF1]">No squads formed yet</h4>
                        <p className="text-xs text-[#949599] max-w-sm mx-auto mt-1">
                          Be the first to gather your crew! Create a pre-event meetup, carpool, or afterparty squad.
                        </p>
                        <button
                          onClick={() => setCreateMeetupOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Start a Squad
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {meetups.map((m) => {
                          const full = m.maxMembers > 0 && m.memberCount >= m.maxMembers;
                          const squadTypeLabels = {
                            carpool: { label: 'Carpool / Ride Share', bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
                            preparty: { label: 'Pre-Event Party', bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
                            vip: { label: 'VIP Lounge Crew', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
                            food: { label: 'Drinks & Bites', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
                            general: { label: 'Squad Hangout', bg: 'bg-white/10 text-white border-white/20' },
                          };
                          const typeInfo = squadTypeLabels[m.type] || squadTypeLabels.general;

                          return (
                            <motion.div
                              key={m.id}
                              whileHover={{ y: -2 }}
                              className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-5 hover:border-white/40 transition-colors flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeInfo.bg}`}>
                                    {typeInfo.label}
                                  </span>
                                  <span className="text-[11px] font-semibold text-[#949599]">
                                    {m.memberCount}{m.maxMembers > 0 ? ` / ${m.maxMembers}` : ''} squad members
                                  </span>
                                </div>

                                <h4 className="text-base font-bold text-[#EFEFF1] line-clamp-1">{m.title}</h4>
                                {m.description && (
                                  <p className="mt-1.5 text-xs text-[#949599] line-clamp-2 leading-relaxed">
                                    {m.description}
                                  </p>
                                )}

                                <div className="mt-3 space-y-1.5 text-xs text-[#949599]">
                                  {m.meetingSpot && (
                                    <p className="flex items-center gap-1.5 truncate">
                                      <MapPin className="w-3.5 h-3.5 text-[#494F55] shrink-0" />
                                      <span>Meet at <strong className="text-[#EFEFF1]">{m.meetingSpot}</strong></span>
                                    </p>
                                  )}
                                  {m.meetAt && (
                                    <p className="flex items-center gap-1.5">
                                      <CalendarClock className="w-3.5 h-3.5 text-[#494F55] shrink-0" />
                                      <span>{new Date(m.meetAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Member Avatars Stack */}
                                {m.members && m.members.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-[#262B2F] flex items-center justify-between">
                                    <div className="flex items-center -space-x-2 overflow-hidden">
                                      {m.members.map((member) => (
                                        <div
                                          key={member.id}
                                          title={member.name}
                                          className="w-7 h-7 rounded-full bg-[#242B32] border-2 border-[#161D22] text-[10px] font-bold text-white flex items-center justify-center overflow-hidden shrink-0"
                                        >
                                          {member.avatar ? (
                                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                          ) : (
                                            member.name?.[0] || 'U'
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <span className="text-[11px] text-[#949599]">
                                      Hosted by <strong className="text-[#EFEFF1]">{m.host?.name || 'Organizer'}</strong>
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Squad Action Buttons */}
                              <div className="mt-4 pt-3 border-t border-[#262B2F] flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setSocialTargetMeetup(m); setSocialModalOpen(true); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition"
                                >
                                  <Share2 className="w-3.5 h-3.5" /> Invite
                                </button>
                                <div className="flex items-center gap-2">
                                  {m.hostId === currentUser?.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMeetup(m)}
                                      disabled={meetupBusy}
                                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 transition disabled:opacity-50"
                                      title="Delete outing"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleJoin(m)}
                                    disabled={meetupBusy || (full && !m.joined)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                      m.joined
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-white text-[#1C232B] hover:bg-[#CBD5E1]'
                                    }`}
                                  >
                                    {m.joined ? 'In Squad' : full ? 'Squad Full' : 'Join Squad'}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* COMMUNITY & ATTENDEES */}
                {activeTab === 'Community & Attendees' && (
                  <div className="space-y-8">
                    {/* Verified Attendees Wall */}
                    <div className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-[#262B2F]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                            <h3 className="text-base font-bold text-[#EFEFF1]">Who's Pulling Up?</h3>
                          </div>
                          <p className="text-xs text-[#949599] mt-0.5">
                            Verified ticket holders attending this event. Connect and plan together!
                          </p>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold shrink-0">
                          {totalAttendees} Event-Goer{totalAttendees !== 1 ? 's' : ''} Confirmed
                        </div>
                      </div>

                      {attendeesLoading ? (
                        <div className="flex justify-center py-6">
                          <LoadingSpinner label="Loading attendees..." />
                        </div>
                      ) : attendees.length === 0 ? (
                        <p className="text-xs text-[#949599] text-center py-4">
                          Be the first to secure your ticket and join the attendee wall!
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {attendees.map((att) => (
                            <div
                              key={att.id}
                              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-center group hover:border-white/40 transition"
                            >
                              <div className="w-10 h-10 rounded-full bg-[#242B32] border border-[#494F55]/40 text-white font-bold flex items-center justify-center overflow-hidden">
                                {att.avatar ? (
                                  <img src={att.avatar} alt={att.name} className="w-full h-full object-cover" />
                                ) : (
                                  att.name?.[0] || 'U'
                                )}
                              </div>
                              <span className="text-xs font-semibold text-[#EFEFF1] truncate max-w-full">
                                {att.name}
                              </span>
                              <span className="text-[9px] uppercase tracking-wider text-[#949599] font-bold">
                                {att.role === 'organizer' ? 'Host' : 'Going'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Community Discussion Board & Chat */}
                    <div className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-5 sm:p-6 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#262B2F]">
                        <div>
                          <h3 className="text-base font-bold text-[#EFEFF1]">Event Discussion & Q&A</h3>
                          <p className="text-xs text-[#949599] mt-0.5">Chat with fellow attendees, ask questions, or share tips.</p>
                        </div>
                        <span className="text-xs text-[#949599]">
                          {discussions.length} message{discussions.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Discussion Message Thread */}
                      <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
                        {discussionsLoading ? (
                          <div className="flex justify-center py-8">
                            <LoadingSpinner label="Loading messages..." />
                          </div>
                        ) : discussions.length === 0 ? (
                          <div className="text-center py-8 space-y-2">
                            <MessageSquare className="w-8 h-8 text-[#494F55] mx-auto" />
                            <p className="text-xs text-[#949599]">No messages yet. Start the conversation!</p>
                          </div>
                        ) : (
                          discussions.map((d) => (
                            <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
                              <div className="w-8 h-8 rounded-full bg-[#242B32] border border-white/10 text-white text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                                {d.user_avatar ? (
                                  <img src={d.user_avatar} alt={d.user_name} className="w-full h-full object-cover" />
                                ) : (
                                  d.user_name?.[0] || 'U'
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-[#EFEFF1]">{d.user_name || 'Attendee'}</span>
                                  <span className="text-[10px] text-[#949599]">
                                    {d.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-[#CBD5E1] mt-1 whitespace-pre-wrap leading-relaxed">
                                  {d.message}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Discussion Input Form */}
                      <form onSubmit={handlePostDiscussion} className="space-y-2 pt-2 border-t border-[#262B2F]">
                        {/* Quick Prompts */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                          {[
                            'Anyone carpooling?',
                            'What is the dress code vibe?',
                            'Who wants to grab drinks before?',
                            'Anyone got spare VIP tickets?',
                          ].map((prompt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDiscussionMessage(prompt)}
                              className="px-2.5 py-1 rounded-lg bg-[#1C232B] border border-[#262B2F] text-[11px] text-[#949599] hover:text-white hover:border-white/30 transition shrink-0"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={discussionMessage}
                            onChange={(e) => setDiscussionMessage(e.target.value)}
                            placeholder={isAuthenticated ? "Write a message to event-goers..." : "Sign in to join the conversation..."}
                            disabled={postingDiscussion}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[#1C232B] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/40 transition"
                          />
                          <button
                            type="submit"
                            disabled={postingDiscussion || !discussionMessage.trim()}
                            className="px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
                          >
                            {postingDiscussion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span>Send</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* FAQs */}
                {activeTab === 'FAQs' && (
                  <div>
                    {faqs.length === 0 ? (
                      <EmptyState
                        icon={AlertCircle}
                        title="No FAQs yet"
                        description="FAQs for this event will appear here once the organizer adds them."
                      />
                    ) : (
                      <div className="space-y-3">
                        {faqs.map((faq, i) => (
                          <div key={i} className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden hover:border-white/40 transition-colors">
                            <button
                              onClick={() => setOpenFaq(openFaq === i ? null : i)}
                              className="w-full flex items-center justify-between px-5 py-4 text-left"
                            >
                              <span className="text-sm font-semibold text-[#EFEFF1] pr-4">{faq.question}</span>
                              <ChevronDown className={`w-5 h-5 text-[#949599] shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {openFaq === i && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <p className="px-5 pb-4 text-sm text-[#949599] leading-relaxed">{faq.answer}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* FAQs */}
                {activeTab === 'FAQs' && (
                  <div>
                    {faqs.length === 0 ? (
                      <EmptyState
                        icon={AlertCircle}
                        title="No FAQs yet"
                        description="FAQs for this event will appear here once the organizer adds them."
                      />
                    ) : (
                      <div className="space-y-3">
                        {faqs.map((faq, i) => (
                          <div key={i} className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden hover:border-white/40 transition-colors">
                            <button
                              onClick={() => setOpenFaq(openFaq === i ? null : i)}
                              className="w-full flex items-center justify-between px-5 py-4 text-left"
                            >
                              <span className="text-sm font-semibold text-[#EFEFF1] pr-4">{faq.question}</span>
                              <ChevronDown className={`w-5 h-5 text-[#949599] shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {openFaq === i && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <p className="px-5 pb-4 text-sm text-[#949599] leading-relaxed">{faq.answer}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sidebar - quick info */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
                <h3 className="text-sm font-semibold text-[#EFEFF1] mb-4">Event Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-[#494F55] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#494F55]">Date & Time</p>
                      <p className="text-sm text-[#EFEFF1]">{fmtDate}</p>
                      {fmtTime && <p className="text-sm text-[#949599]">{fmtTime}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#494F55] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#494F55]">Venue</p>
                      <p className="text-sm text-[#EFEFF1]">{event.venue || 'TBA'}</p>
                      <p className="text-sm text-[#949599]">{event.location || event.city}</p>
                    </div>
                  </div>
                  {event.category && (
                    <div className="flex items-start gap-3">
                      <Tag className="w-4 h-4 text-[#494F55] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-[#494F55]">Category</p>
                        <p className="text-sm text-[#EFEFF1]">{event.category}</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setActiveTab('Tickets')}
                  className="mt-5 w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" /> Get Tickets
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Related events */}
        {related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-[#EFEFF1]">You might also like</h2>
              <Link to="/explore" className="group flex items-center gap-1 text-sm text-[#949599] hover:text-white transition">
                More events <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>

      {/* Create Meet-up Modal */}
      <Modal
        open={createMeetupOpen}
        onClose={() => setCreateMeetupOpen(false)}
        title="Create a Meet-up"
        footer={
          <>
            <button onClick={() => setCreateMeetupOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition">
              Cancel
            </button>
            <button
              onClick={handleCreateMeetup}
              disabled={meetupBusy}
              className="px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50"
            >
              {meetupBusy ? 'Creating...' : 'Create Meet-up'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5">Outing Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'general', label: 'Squad Hangout' },
                { id: 'carpool', label: 'Carpool / Ride' },
                { id: 'preparty', label: 'Pre-Party' },
                { id: 'vip', label: 'VIP Lounge' },
                { id: 'food', label: 'Drinks & Food' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMeetupForm((f) => ({ ...f, type: t.id }))}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                    (meetupForm.type || 'general') === t.id
                      ? 'bg-white text-[#1C232B] border-white shadow-sm'
                      : 'bg-[#1C232B] border-[#494F55]/40 text-[#EFEFF1] hover:border-white/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5">Title *</label>
            <input
              type="text"
              value={meetupForm.title}
              onChange={(e) => setMeetupForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Pre-show dinner at the Grand Arena"
              className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5">Description</label>
            <textarea
              value={meetupForm.description}
              onChange={(e) => setMeetupForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="What's the plan? Where should people look out for you?"
              className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5">Meeting Spot</label>
              <input
                type="text"
                value={meetupForm.meetingSpot}
                onChange={(e) => setMeetupForm((f) => ({ ...f, meetingSpot: e.target.value }))}
                placeholder="e.g. Main entrance, VIP lounge"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5">Meet Time</label>
              <input
                type="datetime-local"
                value={meetupForm.meetAt}
                onChange={(e) => setMeetupForm((f) => ({ ...f, meetAt: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5">Max Members (leave empty for unlimited)</label>
            <input
              type="number"
              min="1"
              value={meetupForm.maxMembers}
              onChange={(e) => setMeetupForm((f) => ({ ...f, maxMembers: e.target.value }))}
              placeholder="e.g. 12"
              className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
            />
          </div>
        </div>
      </Modal>

      {/* Purchase Modal */}
      <Modal
        open={!!purchaseModal}
        onClose={() => { setPurchaseModal(null); setCoupon(''); setCouponDiscount(0); }}
        title="Complete Your Purchase"
        size="md"
      >
        {purchaseModal && (
          <div className="space-y-5">
            {/* Ticket summary */}
            <div className="rounded-lg bg-[#1C232B] border border-[#262B2F] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#EFEFF1]">{purchaseModal.name}</p>
                  <p className="text-xs text-[#949599]">{event.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    {purchaseModal.price === 0 ? 'Free' : format(purchaseModal.price)}
                  </p>
                  <p className="text-xs text-[#494F55]">per ticket</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-[#949599]">Quantity</span>
                <div className="flex items-center rounded-lg border border-[#494F55]/40">
                  <button
                    onClick={() => setQty(purchaseModal.id, -1)}
                    disabled={selectedQty <= 1}
                    className="w-10 h-10 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1] disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-[#EFEFF1]">{selectedQty}</span>
                  <button
                    onClick={() => setQty(purchaseModal.id, 1)}
                    className="w-10 h-10 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2 block">Coupon Code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none focus:border-white/50"
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !coupon.trim()}
                  className="px-4 py-2.5 rounded-lg border border-[#494F55]/40 text-sm text-[#EFEFF1] hover:border-white/40 hover:text-white transition disabled:opacity-50"
                >
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#949599] mb-2 block">Payment Method</label>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <motion.label
                    key={m.id}
                    whileTap={{ scale: 0.99 }}
                    animate={{ scale: paymentMethod === m.id ? [1, 1.02, 1] : 1 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      paymentMethod === m.id
                        ? 'border-white/20 bg-white/10'
                        : 'border-[#494F55]/40 hover:border-[#494F55]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      checked={paymentMethod === m.id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4 text-white focus:ring-white/30 focus:ring-offset-0"
                    />
                    <m.icon className="w-5 h-5 text-[#494F55]" />
                    <span className="text-sm text-[#EFEFF1]">{m.label}</span>
                  </motion.label>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-[#1C232B] border border-[#262B2F] p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#949599]">Subtotal</span>
                <span className="text-[#EFEFF1] font-medium">{format(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-400">Discount ({couponDiscount}%)</span>
                  <span className="text-emerald-400 font-medium">-{format(discountAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#262B2F] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#EFEFF1]">Total</span>
                <span className="text-xl font-bold text-white">{format(total)}</span>
              </div>
            </div>

            <button
              onClick={handleProceedPayment}
              disabled={placingOrder}
              className="w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {placingOrder ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <><Wallet className="w-4 h-4" /> Proceed to Payment</>
              )}
            </button>
            <p className="text-center text-xs text-[#494F55] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure payment powered by Paystack
            </p>
          </div>
        )}
      </Modal>

      {/* Mobile Sticky Bottom Ticket Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#161D22]/95 backdrop-blur-xl border-t border-[#262B2F] px-4 py-3 shadow-2xl flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[#949599] font-medium truncate">
            {tickets.length > 0 && Math.min(...tickets.map((t) => Number(t.price) || 0)) === 0
              ? 'Admission'
              : tickets.length > 0
              ? 'Tickets from'
              : 'Tickets'}
          </p>
          <p className="text-base sm:text-lg font-bold text-white truncate">
            {tickets.length > 0 && Math.min(...tickets.map((t) => Number(t.price) || 0)) === 0
              ? 'Free'
              : tickets.length > 0
              ? format(Math.min(...tickets.map((t) => Number(t.price) || 0)))
              : 'Select Ticket'}
          </p>
        </div>
        <button
          onClick={() => {
            setActiveTab('Tickets');
            const el = document.getElementById('event-tabs-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="px-5 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs sm:text-sm font-bold shadow-lg hover:bg-[#CBD5E1] transition active:scale-95 flex items-center gap-1.5 shrink-0"
        >
          <Ticket className="w-4 h-4" />
          Get Tickets
        </button>
      </div>

      {/* Social Share & Squad Outings Hub Modal */}
      <SocialShareModal
        open={socialModalOpen}
        onClose={() => { setSocialModalOpen(false); setSocialTargetMeetup(null); }}
        event={event}
        meetup={socialTargetMeetup}
      />
    </>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-start gap-3 rounded-lg bg-[#171A1D] border border-[#262B2F] p-4 hover:border-white/40 transition-colors"
    >
      <Icon className="w-5 h-5 text-[#494F55] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-[#494F55] uppercase tracking-wider">{label}</p>
        <p className="text-sm text-[#EFEFF1] truncate">{value}</p>
      </div>
    </motion.div>
  );
}
