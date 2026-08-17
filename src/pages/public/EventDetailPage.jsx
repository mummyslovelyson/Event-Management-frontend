import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Clock, Share2, Heart, ChevronLeft, Ticket,
  Minus, Plus, Tag, Mail, Phone, Shirt, ChevronDown, ChevronRight,
  CheckCircle2, Facebook, Twitter, Linkedin, Link2, CreditCard,
  Smartphone, Wallet, ShieldCheck, Loader2, User, AlertCircle,
  UserPlus, UserCheck, UsersRound, CalendarClock, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import { getEvent, getTrendingEvents } from '@/api/events';
import { getTicketTypes } from '@/api/tickets';
import { toggleFavorite, followOrganizer, unfollowOrganizer } from '@/api/users';
import { getEventMeetups, createMeetup, joinMeetup, leaveMeetup, deleteMeetup } from '@/api/meetups';
import { getEventResale, purchaseResaleListing } from '@/api/resale';
import { applyCoupon, createOrder, initiatePayment } from '@/api/orders';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';

const TABS = ['Overview', 'Tickets', 'Meet-ups', 'FAQs'];

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Meet-ups state
  const [meetups, setMeetups] = useState([]);
  const [meetupsLoading, setMeetupsLoading] = useState(true);
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [meetupForm, setMeetupForm] = useState({ title: '', description: '', meetingSpot: '', meetAt: '', maxMembers: '' });
  const [meetupBusy, setMeetupBusy] = useState(false);

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

  // Meet-ups for this event.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setMeetupsLoading(true);
      try {
        const res = await getEventMeetups(id);
        if (!active) return;
        const data = res.data?.meetups ?? res.data?.data ?? [];
        setMeetups(Array.isArray(data) ? data : []);
      } catch {
        if (active) setMeetups([]);
      } finally {
        if (active) setMeetupsLoading(false);
      }
    };
    load();
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
      toast.error('Please log in to create a meet-up');
      navigate('/login');
      return;
    }
    if (!meetupForm.title.trim()) {
      toast.error('Give your meet-up a title');
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
      });
      toast.success('Meet-up created!');
      setCreateMeetupOpen(false);
      setMeetupForm({ title: '', description: '', meetingSpot: '', meetAt: '', maxMembers: '' });
      refreshMeetups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create meet-up');
    } finally {
      setMeetupBusy(false);
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
    const text = `Check out this event: ${event?.title}`;
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
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
      <div className="relative h-[42vh] min-h-[320px] w-full overflow-hidden">
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
                <div className="relative">
                  <motion.button
                    onClick={() => setShareOpen((v) => !v)}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ y: -2 }}
                    className="w-10 h-10 rounded-lg bg-[#171A1D]/90 backdrop-blur border border-[#494F55]/40 flex items-center justify-center text-[#EFEFF1] hover:text-[#9AA1A6] hover:border-[#494F55] transition"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>
                  <AnimatePresence>
                    {shareOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 mt-2 w-44 rounded-lg bg-[#171A1D] border border-[#494F55]/40 shadow-xl py-1 z-20"
                      >
                        {[
                          { id: 'facebook', label: 'Facebook', icon: Facebook },
                          { id: 'twitter', label: 'Twitter', icon: Twitter },
                          { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                          { id: 'copy', label: 'Copy Link', icon: Link2 },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleShare(s.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#949599] hover:text-white hover:bg-[#494F55]/20 transition"
                          >
                            <s.icon className="w-4 h-4" /> {s.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  onClick={handleFavorite}
                  disabled={favLoading}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ y: -2 }}
                  className="w-10 h-10 rounded-lg bg-[#171A1D]/90 backdrop-blur border border-[#494F55]/40 flex items-center justify-center text-[#EFEFF1] hover:border-[#494F55] transition disabled:opacity-50"
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
                                      className="w-9 h-9 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1] disabled:opacity-30 transition"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-10 text-center text-sm font-semibold text-[#EFEFF1]">{qty}</span>
                                    <button
                                      onClick={() => setQty(ticket.id, 1)}
                                      disabled={available !== null && qty >= available}
                                      className="w-9 h-9 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1] disabled:opacity-30 transition"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => openPurchase(ticket)}
                                    disabled={available !== null && available <= 0}
                                    className="px-5 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-40 disabled:cursor-not-allowed"
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

                {/* MEET-UPS */}
                {activeTab === 'Meet-ups' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#EFEFF1]">Meet-ups & Group Outings</h3>
                        <p className="text-sm text-[#949599] mt-0.5">Gather with other attendees before the event.</p>
                      </div>
                      <button
                        onClick={() => setCreateMeetupOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition w-fit"
                      >
                        <Plus className="w-4 h-4" /> Create Meet-up
                      </button>
                    </div>

                    {meetupsLoading ? (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner label="Loading meet-ups..." />
                      </div>
                    ) : meetups.length === 0 ? (
                      <EmptyState
                        icon={UsersRound}
                        title="No meet-ups yet"
                        description="Be the first to plan a group outing for this event."
                        action={() => setCreateMeetupOpen(true)}
                        actionLabel="Create a Meet-up"
                      />
                    ) : (
                      <div className="space-y-3">
                        {meetups.map((m) => {
                          const full = m.maxMembers > 0 && m.memberCount >= m.maxMembers;
                          return (
                            <motion.div
                              key={m.id}
                              whileHover={{ y: -2 }}
                              className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 hover:border-white/40 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-base font-semibold text-[#EFEFF1]">{m.title}</h4>
                                    <Badge variant="gold" size="sm">
                                      {m.memberCount}/{m.maxMembers > 0 ? m.maxMembers : '∞'} going
                                    </Badge>
                                    {m.isPublic ? null : <Badge variant="neutral" size="sm">Private</Badge>}
                                  </div>
                                  {m.description && (
                                    <p className="mt-1.5 text-sm text-[#949599] leading-relaxed line-clamp-2">{m.description}</p>
                                  )}
                                  <div className="mt-3 space-y-1.5 text-xs text-[#949599]">
                                    {m.host && (
                                      <p className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-[#494F55]" /> Hosted by {m.host.name}
                                      </p>
                                    )}
                                    {m.meetingSpot && (
                                      <p className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-[#494F55]" /> Meet at {m.meetingSpot}
                                      </p>
                                    )}
                                    {m.meetAt && (
                                      <p className="flex items-center gap-1.5">
                                        <CalendarClock className="w-3.5 h-3.5 text-[#494F55]" />
                                        {new Date(m.meetAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {m.hostId === currentUser?.id && (
                                    <button
                                      onClick={() => handleDeleteMeetup(m)}
                                      disabled={meetupBusy}
                                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/15 transition disabled:opacity-50"
                                      title="Delete meet-up"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleToggleJoin(m)}
                                    disabled={meetupBusy || (full && !m.joined)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                      m.joined
                                        ? 'bg-white/10 text-white border border-white/20 hover:bg-white/10'
                                        : 'bg-white text-[#1C232B] hover:bg-[#CBD5E1]'
                                    }`}
                                  >
                                    {m.joined ? 'Joined' : full ? 'Full' : 'Join'}
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
                    className="w-8 h-8 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1] disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-[#EFEFF1]">{selectedQty}</span>
                  <button
                    onClick={() => setQty(purchaseModal.id, 1)}
                    className="w-8 h-8 flex items-center justify-center text-[#949599] hover:text-[#EFEFF1]"
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
