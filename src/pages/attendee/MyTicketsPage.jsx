import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket as TicketIcon, Search, Download, Send, Calendar, MapPin, Armchair,
  X, Printer, CheckCircle2, Clock, XCircle, QrCode, Tag, Store, BadgeDollarSign,
  ChevronDown, Loader2, CalendarPlus, Share2, Bell, BellRing, ExternalLink,
  Info, Sparkles, ShieldCheck,
} from 'lucide-react';
import { getUserTickets, transferTicket, downloadTicket } from '@/api/tickets';
import { getMyResale, createResaleListing, cancelResaleListing } from '@/api/resale';
import { getUserReminders, toggleEventReminder } from '@/api/events';
import { getGoogleCalendarUrl, downloadIcsFile } from '@/utils/calendar';
import Modal from '@/components/common/Modal';
import SocialShareModal from '@/components/common/SocialShareModal';
import InvoiceModal from '@/components/tickets/InvoiceModal';
import TicketPass, { downloadTicketPassAsImage } from '@/components/tickets/TicketPass';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useCurrency } from '@/context/CurrencyContext';
import Badge from '@/components/common/Badge';

const TABS = [
  { value: 'all', label: 'All Tickets' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'reminders', label: 'Event Reminders' },
  { value: 'cancelled', label: 'Cancelled' },
];

// The tickets API returns flat snake_case columns (event_title, event_venue,
// start_date, banner_image, ticket_type_name, ticket_template). Normalize them
// into the nested camelCase shape the ticket cards expect so event info actually displays.
const normalizeTicket = (t) => {
  const template = t.ticket_template || t.ticketTemplate || t.event?.ticket_template || t.event?.ticketTemplate || null;
  return {
    ...t,
    ticketType: t.ticketType || t.type || t.ticket_type_name || t.ticketTypeName || 'General',
    price: t.price || t.ticket_price || t.amount || 0,
    attendeeName: t.attendee_name || t.attendeeName || t.user_name || t.userName || 'Attendee',
    seat: t.seat || t.seatNumber || t.seat_number || t.seatInfo,
    ticketTemplate: template,
    event: {
      id: t.event_id || t.event?.id,
      title: t.event?.title || t.event_title || t.event_name || t.eventName || 'Event',
      venue: t.event?.venue || t.event_venue || t.venue || 'Venue TBA',
      startDate: t.event?.startDate || t.event?.start_date || t.startDate || t.start_date || t.eventDate,
      startTime: t.event?.startTime || t.event?.start_time || t.startTime || t.start_time,
      image: t.event?.image || t.banner_image || t.event?.banner_image || t.image,
      ticketTemplate: template,
      category: t.event?.category || t.category,
      city: t.event?.city || t.city,
    },
  };
};

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function MyTicketsPage() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [printTicket, setPrintTicket] = useState(null);
  const [shareTicket, setShareTicket] = useState(null);
  const [previewEvent, setPreviewEvent] = useState(null);

  // Reminders state
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [togglingReminderId, setTogglingReminderId] = useState(null);

  // Resale marketplace state
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [sellTarget, setSellTarget] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [selling, setSelling] = useState(false);
  const [showListings, setShowListings] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [invoiceTicket, setInvoiceTicket] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await getUserTickets({ limit: 100 });
      const data = res.data?.tickets ?? res.data ?? [];
      setTickets((Array.isArray(data) ? data : []).map(normalizeTicket));
    } catch (err) {
      toast.error('Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    setListingsLoading(true);
    try {
      const res = await getMyResale();
      const data = res.data?.listings ?? [];
      setListings(Array.isArray(data) ? data : []);
    } catch {
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const loadReminders = async () => {
    setRemindersLoading(true);
    try {
      const res = await getUserReminders();
      const data = res.data?.reminders ?? [];
      setReminders(Array.isArray(data) ? data : []);
    } catch {
      setReminders([]);
    } finally {
      setRemindersLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    loadListings();
    loadReminders();
  }, []);

  const handleRemoveReminder = async (eventId) => {
    setTogglingReminderId(eventId);
    try {
      await toggleEventReminder(eventId);
      toast.success('Event reminder removed');
      setReminders((prev) => prev.filter((r) => r.id !== eventId));
    } catch {
      toast.error('Failed to remove reminder');
    } finally {
      setTogglingReminderId(null);
    }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    return tickets.filter((t) => {
      const eventDate = t.event?.startDate || t.eventDate || t.startDate;
      const status = (t.status || '').toLowerCase();
      const matchesTab =
        tab === 'all' ? true
        : tab === 'upcoming' ? (eventDate ? new Date(eventDate) >= now : false) && status !== 'cancelled'
        : tab === 'past' ? (eventDate ? new Date(eventDate) < now : false) && status !== 'cancelled'
        : tab === 'cancelled' ? status === 'cancelled' || status === 'void'
        : true;
      if (!matchesTab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (t.event?.title || t.eventName || '').toLowerCase().includes(q) ||
        (t.event?.venue || t.venue || '').toLowerCase().includes(q) ||
        (t.ticketType || t.type || '').toLowerCase().includes(q) ||
        (t.ticketNumber || t.id || '').toString().toLowerCase().includes(q)
      );
    });
  }, [tickets, tab, search]);

  const handleTransfer = async () => {
    if (!transferTarget) return;
    if (!transferEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(transferEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setTransferring(true);
    try {
      await transferTicket(transferTarget.id, { recipientEmail: transferEmail.trim() });
      toast.success(`Ticket transfer initiated to ${transferEmail}`);
      setTickets((prev) => prev.map((t) => (t.id === transferTarget.id ? { ...t, status: 'transferred' } : t)));
      setTransferTarget(null);
      setTransferEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer ticket');
    } finally {
      setTransferring(false);
    }
  };

  const handleSell = async () => {
    if (!sellTarget) return;
    const price = Number(sellPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Enter a valid price greater than zero');
      return;
    }
    setSelling(true);
    try {
      await createResaleListing({ ticketId: sellTarget.id, price });
      toast.success('Ticket listed for resale');
      setSellTarget(null);
      setSellPrice('');
      loadListings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to list ticket');
    } finally {
      setSelling(false);
    }
  };

  const handleCancelListing = async (listing) => {
    setCancellingId(listing.id);
    try {
      await cancelResaleListing(listing.id);
      toast.success('Listing removed');
      loadListings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove listing');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownload = async (ticket) => {
    try {
      await downloadTicketPassAsImage(ticket);
    } catch {
      // Fallback: open print modal
      setPrintTicket(ticket);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" label="Loading your tickets..." className="py-24" />;
  }

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#EFEFF1]">My Tickets</h1>
          <p className="text-sm text-[#949599] mt-1">Your digital tickets and QR codes for events.</p>
        </div>
        <Link
          to="/attendee/explore"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] hover:-translate-y-0.5 transition-all shadow-[0_0_0_0_rgba(212,175,55,0)] hover:shadow-[0_6px_20px_-6px_rgba(212,175,55,0.45)] w-fit"
        >
          <TicketIcon className="w-4 h-4 transition-transform group-hover:-rotate-6" /> Browse Events
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </motion.div>

      {/* Search + Tabs */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex flex-wrap gap-1 rounded-xl bg-[#171A1D] border border-[#262B2F] p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`relative px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value ? 'text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'
              }`}
            >
              {tab === t.value && (
                <motion.span
                  layoutId="ticket-tab-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-[0_2px_10px_-2px_rgba(212,175,55,0.5)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
          />
        </div>
      </motion.div>

      {/* Tab Contents: Reminders vs Regular Tickets */}
      {tab === 'reminders' ? (
        remindersLoading ? (
          <LoadingSpinner size="lg" label="Loading your event reminders..." className="py-24" />
        ) : reminders.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No event reminders set yet"
            description="Set reminders on upcoming concerts, festivals, and games to receive pre-sale notifications, ticket availability alerts, and countdown reminders."
            action={() => (window.location.href = '/attendee/explore')}
            actionLabel="Discover Upcoming Shows"
          />
        ) : (
          <motion.div variants={containerStagger} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reminders.map((ev) => {
              const startDate = ev.start_date ? new Date(ev.start_date) : null;
              const formattedDate = startDate
                ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                : 'TBA';
              const daysLeft = startDate
                ? Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <motion.div
                  key={ev.id}
                  variants={itemFade}
                  className="rounded-2xl bg-[#171A1D] border border-[#262B2F] overflow-hidden hover:border-white/40 transition-all flex flex-col justify-between p-5 space-y-4"
                >
                  <div className="flex gap-4 items-start">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#242B32] shrink-0">
                      {ev.banner_image ? (
                        <img src={ev.banner_image} alt={ev.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TicketIcon className="w-8 h-8 text-[#494F55]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        {ev.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                            {ev.category}
                          </span>
                        )}
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                            {daysLeft === 0 ? 'Today' : `${daysLeft} days away`}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#EFEFF1] line-clamp-1 hover:text-white transition">
                        <Link to={`/events/${ev.id}`}>{ev.title}</Link>
                      </h3>
                      <p className="text-xs text-[#949599] flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-[#494F55] shrink-0" /> {formattedDate} {ev.start_time ? `• ${ev.start_time}` : ''}
                      </p>
                      <p className="text-xs text-[#949599] flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#494F55] shrink-0" /> {ev.venue || ev.city || 'Venue TBA'}
                      </p>
                    </div>
                  </div>

                  {/* Pre-sale & ticket alert info */}
                  <div className="p-3 rounded-xl bg-[#14171A] border border-[#262B2F] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#EFEFF1]">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{ev.min_price != null ? `Tickets from ${format(ev.min_price)}` : 'Tickets available'}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <BellRing className="w-3 h-3 animate-pulse" /> Reminder Active
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#262B2F]">
                    <Link
                      to={`/events/${ev.id}`}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition"
                    >
                      <TicketIcon className="w-3.5 h-3.5" /> Get Tickets
                    </Link>
                    <button
                      onClick={() => setShareTicket({ event: ev })}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 transition"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                    <button
                      onClick={() => handleRemoveReminder(ev.id)}
                      disabled={togglingReminderId === ev.id}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#949599] text-xs font-medium hover:text-red-400 hover:border-red-500/40 transition disabled:opacity-50"
                    >
                      {togglingReminderId === ev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                      Remove
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title={search ? "No tickets match your search" : "No tickets yet"}
          description={search ? "Try a different search term." : "Browse events and purchase tickets using the Browse Events button above to see them here."}
        />
      ) : (
        <motion.div variants={containerStagger} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((ticket) => (
            <motion.div key={ticket.id} variants={itemFade}>
              <TicketCard
                ticket={ticket}
                onDownload={() => handleDownload(ticket)}
                onTransfer={() => setTransferTarget(ticket)}
                onPrint={() => setPrintTicket(ticket)}
                onShare={() => setShareTicket(ticket)}
                onViewEvent={() => setPreviewEvent(ticket.event)}
                onInvoice={() => setInvoiceTicket(ticket)}
                onSell={() => { setSellTarget(ticket); setSellPrice(''); }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* My Resale Listings */}
      <motion.div variants={itemFade} className="rounded-2xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        <button
          onClick={() => setShowListings((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#1C232B]/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Store className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-semibold text-[#EFEFF1]">My Resale Listings</h2>
              <p className="text-xs text-[#949599]">Tickets you've put up for sale</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!listingsLoading && listings.length > 0 && (
              <Badge variant="gold" size="sm">{listings.length}</Badge>
            )}
            <ChevronDown className={`w-4 h-4 text-[#949599] transition-transform ${showListings ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {showListings && (
          <div className="border-t border-[#262B2F] px-5 py-4">
            {listingsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner label="Loading listings..." />
              </div>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Tag className="w-8 h-8 text-[#494F55]" />
                <p className="text-sm text-[#949599]">No resale listings yet.</p>
                <p className="text-xs text-[#494F55]">Tap "Sell" on any upcoming ticket to list it here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map((listing) => {
                  const st = listing.status;
                  const stMap = {
                    active: { label: 'Active', variant: 'success' },
                    sold: { label: 'Sold', variant: 'neutral' },
                    cancelled: { label: 'Cancelled', variant: 'error' },
                  };
                  const s = stMap[st] || { label: st, variant: 'neutral' };
                  return (
                    <div key={listing.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#14171A] border border-[#262B2F] p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#EFEFF1] truncate">{listing.eventTitle || 'Event'}</p>
                        <p className="mt-0.5 text-xs text-[#949599]">{listing.ticketTypeName || 'Ticket'} • Listed {new Date(listing.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-lg font-bold text-white">{format(listing.price)}</span>
                        <Badge variant={s.variant} size="sm">{s.label}</Badge>
                        {st === 'active' && (
                          <button
                            onClick={() => handleCancelListing(listing)}
                            disabled={cancellingId === listing.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#949599] text-xs font-medium hover:text-red-400 hover:border-red-400/40 disabled:opacity-50 transition-colors"
                          >
                            {cancellingId === listing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Sell ticket modal */}
      <Modal
        open={!!sellTarget}
        onClose={() => { setSellTarget(null); setSellPrice(''); }}
        title="Sell Ticket on Resale"
        footer={
          <>
            <button
              onClick={() => { setSellTarget(null); setSellPrice(''); }}
              className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSell}
              disabled={selling}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition"
            >
              <Tag className="w-4 h-4" />
              {selling ? 'Listing...' : 'List for Sale'}
            </button>
          </>
        }
      >
        {sellTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#1C232B] border border-[#262B2F] p-3">
              <p className="text-sm font-semibold text-[#EFEFF1]">{sellTarget.event?.title || sellTarget.eventName}</p>
              <p className="text-xs text-[#949599] mt-0.5">
                {sellTarget.ticketType || sellTarget.type} • #{String(sellTarget.ticketNumber || sellTarget.id).slice(-8).toUpperCase()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">
                Sale Price (₵)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
              />
              <p className="text-xs text-[#494F55] mt-2">
                Your ticket will appear in the event's Resale section. When someone buys it, the ticket transfers to them and you're notified.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer modal */}
      <Modal
        open={!!transferTarget}
        onClose={() => { setTransferTarget(null); setTransferEmail(''); }}
        title="Transfer Ticket"
        footer={
          <>
            <button
              onClick={() => { setTransferTarget(null); setTransferEmail(''); }}
              className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferring}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
              {transferring ? 'Sending...' : 'Transfer Ticket'}
            </button>
          </>
        }
      >
        {transferTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#1C232B] border border-[#262B2F] p-3">
              <p className="text-sm font-semibold text-[#EFEFF1]">{transferTarget.event?.title || transferTarget.eventName}</p>
              <p className="text-xs text-[#949599] mt-0.5">
                {transferTarget.ticketType || transferTarget.type} • #{(transferTarget.ticketNumber || transferTarget.id).toString().slice(-8).toUpperCase()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="Enter recipient email"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
              />
              <p className="text-xs text-[#494F55] mt-2">
                The recipient will receive an email to accept this ticket transfer.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Ticket Pass View & Download Modal */}
      <Modal
        open={!!printTicket}
        onClose={() => setPrintTicket(null)}
        title="Official Event Ticket Pass"
        size="xl"
      >
        {printTicket && (
          <div className="py-2">
            <TicketPass
              ticket={printTicket}
              onDownload={() => downloadTicketPassAsImage(printTicket)}
              onPrint={() => window.print()}
            />
          </div>
        )}
      </Modal>

      {/* Print-only ticket area */}
      {printTicket && (
        <div className="print-ticket-area">
          <TicketPass ticket={printTicket} />
        </div>
      )}
      {/* Quick Event Details Modal */}
      <Modal
        open={!!previewEvent}
        onClose={() => setPreviewEvent(null)}
        title={previewEvent?.title || 'Event Details'}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setPreviewEvent(null)}
              className="px-4 py-2.5 rounded-lg text-sm text-[#949599] hover:text-[#EFEFF1]"
            >
              Close
            </button>
            {previewEvent?.id && (
              <Link
                to={`/events/${previewEvent.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs sm:text-sm font-bold hover:bg-[#CBD5E1] transition"
              >
                Go to Event Page <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        }
      >
        {previewEvent && (
          <div className="space-y-4">
            <div className="h-44 rounded-xl overflow-hidden bg-[#242B32] relative">
              {previewEvent.image ? (
                <img src={previewEvent.image} alt={previewEvent.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <TicketIcon className="w-12 h-12 text-[#494F55]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] via-transparent to-transparent" />
              {previewEvent.category && (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#1C232B]/90 text-white backdrop-blur">
                  {previewEvent.category}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#EFEFF1]">{previewEvent.title}</h3>
              <p className="text-sm text-[#949599] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#494F55]" />
                <span>
                  {previewEvent.startDate ? new Date(previewEvent.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date TBA'}
                  {previewEvent.startTime ? ` at ${previewEvent.startTime}` : ''}
                </span>
              </p>
              <p className="text-sm text-[#949599] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#494F55]" />
                <span>{previewEvent.venue || previewEvent.city || 'Venue location TBA'}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#14171A] border border-[#262B2F] flex items-center justify-between text-xs text-[#949599]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Verified Ticket Pass
              </span>
              <span>Need help? Contact support</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Social Share & Squad Outings Modal */}
      <SocialShareModal
        open={!!shareTicket}
        onClose={() => setShareTicket(null)}
        event={shareTicket?.event}
        ticket={shareTicket}
      />

      {/* Invoice & Tax Receipt Modal */}
      <InvoiceModal
        open={!!invoiceTicket}
        onClose={() => setInvoiceTicket(null)}
        ticket={invoiceTicket}
      />
    </motion.div>
  );
}

function TicketCard({ ticket, onDownload, onPrint, onTransfer, onSell, onShare, onViewEvent, onInvoice }) {
  const event = ticket.event || {};
  const eventDate = event.startDate || ticket.eventDate || ticket.startDate;
  const status = (ticket.status || 'valid').toLowerCase();
  const ticketNumber = (ticket.ticketNumber || ticket.id || '').toString();
  const seat = ticket.seat || ticket.seatNumber || ticket.seatInfo;

  const statusMap = {
    valid: { variant: 'success', icon: CheckCircle2, label: 'Valid' },
    active: { variant: 'success', icon: CheckCircle2, label: 'Active' },
    used: { variant: 'neutral', icon: CheckCircle2, label: 'Used' },
    checked_in: { variant: 'neutral', icon: CheckCircle2, label: 'Checked In' },
    cancelled: { variant: 'error', icon: XCircle, label: 'Cancelled' },
    void: { variant: 'error', icon: XCircle, label: 'Void' },
    transferred: { variant: 'info', icon: Send, label: 'Transferred' },
    expired: { variant: 'warning', icon: Clock, label: 'Expired' },
  };
  const st = statusMap[status] || statusMap.valid;
  const isCancelled = status === 'cancelled' || status === 'void';

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://tribesandcliqs.com';
  const qrValue = `${origin}/verify/${encodeURIComponent(ticketNumber)}`;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={`group relative rounded-2xl overflow-hidden bg-[#171A1D] border shadow-[0_0_0_0_rgba(212,175,55,0)] hover:shadow-[0_14px_36px_-16px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,175,55,0.15)] ${isCancelled ? 'border-red-500/30 opacity-70' : 'border-[#262B2F] hover:border-white/40'} transition-[border-color,box-shadow,opacity]`}
    >
      {/* Banner */}
      <div
        onClick={onViewEvent}
        className="relative h-24 overflow-hidden bg-[#242B32] cursor-pointer group/banner"
        title="Click to view event details"
      >
        {event.image ? (
          <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover/banner:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TicketIcon className="w-10 h-10 text-[#494F55]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1D] via-[#171A1D]/40 to-transparent" />
        <div className="absolute top-3 right-3">
          <motion.div whileHover={{ scale: 1.06, rotate: -2 }}>
            <Badge variant={st.variant} size="sm" icon={st.icon}>{st.label}</Badge>
          </motion.div>
        </div>
      </div>

      {/* Body - ticket shape */}
      <div className="relative">
        {/* Torn edge perforation */}
        <div className="flex items-center gap-2 px-5">
          <div className="w-3 h-3 rounded-full bg-[#1C232B] -ml-6" />
          <div className="flex-1 border-t-2 border-dashed border-[#494F55]/40 my-0" />
          <div className="w-3 h-3 rounded-full bg-[#1C232B] -mr-6" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-5">
          {/* Left: details */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
                {ticket.ticketType || ticket.type || 'General'}
              </span>
              <h3
                onClick={onViewEvent}
                className="text-base font-bold text-[#EFEFF1] line-clamp-2 hover:text-white cursor-pointer transition flex items-center gap-1.5"
                title="Click to view event details"
              >
                <span>{event.title || ticket.eventName || 'Event'}</span>
                <Info className="w-3.5 h-3.5 text-[#949599] shrink-0 hover:text-white" />
              </h3>
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-[#949599] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#494F55] shrink-0" />
                <span className="truncate">
                  {eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                </span>
              </p>
              <p className="text-[#949599] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#494F55] shrink-0" />
                <span className="truncate">{event.venue || ticket.venue || 'Venue TBA'}</span>
              </p>
              {seat && (
                <p className="text-[#949599] flex items-center gap-1.5">
                  <Armchair className="w-4 h-4 text-[#494F55] shrink-0" />
                  <span className="truncate">Seat: {seat}</span>
                </p>
              )}
            </div>
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-[#494F55]">Ticket No.</p>
              <p className="text-sm font-mono font-semibold text-[#EFEFF1]">#{ticketNumber.slice(-8).toUpperCase()}</p>
            </div>
          </div>

          {/* Right: QR code */}
          <div className="shrink-0 flex sm:flex-col items-center justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262B2F]">
            <motion.div
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white p-2 flex items-center justify-center ring-1 ring-transparent hover:ring-white/40 transition-shadow"
            >
              <QRCodeSVG value={qrValue} size={88} level="M" includeMargin={false} />
            </motion.div>
            <p className="text-[10px] text-[#949599] flex items-center gap-1">
              <QrCode className="w-3 h-3" /> Scan at entry
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-5 pt-0">
          <button
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 hover:bg-[#242B32] transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 hover:bg-[#242B32] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={onInvoice}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 hover:bg-[#242B32] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Receipt
          </button>
          <button
            onClick={() => { downloadIcsFile(event); toast.success('Event added to calendar (.ics download)'); }}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 hover:bg-[#242B32] transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" /> Calendar
          </button>
          <button
            onClick={onShare}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-emerald-400 text-xs font-medium hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button
            onClick={onTransfer}
            disabled={isCancelled}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] text-xs font-medium hover:border-white/40 hover:bg-[#242B32] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Transfer
          </button>
          <button
            onClick={onSell}
            disabled={isCancelled}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold hover:bg-white hover:text-[#1C232B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Tag className="w-3.5 h-3.5" /> Sell
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PrintableTicket({ ticket }) {
  const event = ticket.event || {};
  const eventDate = event.startDate || ticket.eventDate || ticket.startDate;
  const ticketNumber = (ticket.ticketNumber || ticket.id || '').toString();
  const seat = ticket.seat || ticket.seatNumber || ticket.seatInfo;
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://tribesandcliqs.com';
  const qrValue = `${origin}/verify/${encodeURIComponent(ticketNumber)}`;

  return (
    <div className="rounded-xl border border-[#494F55]/40 overflow-hidden">
      <div className="bg-[#1C232B] p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-white font-semibold">Tribes & Cliqs</p>
        <h3 className="text-lg font-bold text-[#EFEFF1] mt-1">{event.title || ticket.eventName}</h3>
      </div>
      <div className="bg-white p-6 flex flex-col items-center gap-4">
        <div className="w-40 h-40 bg-white p-2 flex items-center justify-center">
          <QRCodeSVG value={qrValue} size={144} level="M" />
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full">
          <div>
            <p className="text-[10px] uppercase text-gray-400">Date</p>
            <p className="font-semibold text-gray-800">
              {eventDate ? new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-400">Venue</p>
            <p className="font-semibold text-gray-800">{event.venue || ticket.venue || 'TBA'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-400">Type</p>
            <p className="font-semibold text-gray-800">{ticket.ticketType || ticket.type || 'General'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-gray-400">Seat</p>
            <p className="font-semibold text-gray-800">{seat || 'N/A'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] uppercase text-gray-400">Ticket Number</p>
            <p className="font-mono font-bold text-gray-800">#{ticketNumber.slice(-8).toUpperCase()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
