import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket as TicketIcon, Search, Download, Send, Calendar, MapPin, Armchair,
  X, Printer, CheckCircle2, Clock, XCircle, QrCode, Tag, Store, BadgeDollarSign,
  ChevronDown, Loader2,
} from 'lucide-react';
import { getUserTickets, transferTicket, downloadTicket } from '@/api/tickets';
import { getMyResale, createResaleListing, cancelResaleListing } from '@/api/resale';
import Modal from '@/components/common/Modal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { useCurrency } from '@/context/CurrencyContext';
import Badge from '@/components/common/Badge';

const TABS = [
  { value: 'all', label: 'All Tickets' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

// The tickets API returns flat snake_case columns (event_title, event_venue,
// start_date, banner_image, ticket_type_name). Normalize them into the nested
// camelCase shape the ticket cards expect so event info actually displays.
const normalizeTicket = (t) => ({
  ...t,
  ticketType: t.ticketType || t.type || t.ticket_type_name || t.ticketTypeName || 'General',
  seat: t.seat || t.seatNumber || t.seat_number || t.seatInfo,
  event: {
    title: t.event?.title || t.event_title || t.event_name || t.eventName || 'Event',
    venue: t.event?.venue || t.event_venue || t.venue || 'Venue TBA',
    startDate: t.event?.startDate || t.event?.start_date || t.startDate || t.start_date || t.eventDate,
    startTime: t.event?.startTime || t.event?.start_time || t.startTime || t.start_time,
    image: t.event?.image || t.banner_image || t.event?.banner_image || t.image,
  },
});

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

  // Resale marketplace state
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [sellTarget, setSellTarget] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  const [selling, setSelling] = useState(false);
  const [showListings, setShowListings] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

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

  useEffect(() => {
    loadTickets();
    loadListings();
  }, []);

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
      const res = await downloadTicket(ticket.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${(ticket.ticketNumber || ticket.id).toString().slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Ticket downloaded');
    } catch (err) {
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
          <h1 className="text-2xl font-bold text-[#EDF0F1]">My Tickets</h1>
          <p className="text-sm text-[#8A9196] mt-1">Your digital tickets and QR codes for events.</p>
        </div>
        <Link
          to="/attendee/explore"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] hover:-translate-y-0.5 transition-all shadow-[0_0_0_0_rgba(212,175,55,0)] hover:shadow-[0_6px_20px_-6px_rgba(212,175,55,0.45)] w-fit"
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
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value ? 'text-[#1E252B]' : 'text-[#8A9196] hover:text-[#EDF0F1]'
              }`}
            >
              {tab === t.value && (
                <motion.span
                  layoutId="ticket-tab-pill"
                  className="absolute inset-0 rounded-lg bg-[#D4AF37] shadow-[0_2px_10px_-2px_rgba(212,175,55,0.5)]"
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
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
          />
        </div>
      </motion.div>

      {/* Tickets list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title={search ? "No tickets match your search" : "No tickets yet"}
          description={search ? "Try a different search term." : "Browse events and purchase tickets to see them here."}
          action={() => (window.location.href = '/attendee/explore')}
          actionLabel="Browse Events"
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
          className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#1E252B]/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
              <Store className="w-4.5 h-4.5 text-[#D4AF37]" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-semibold text-[#EDF0F1]">My Resale Listings</h2>
              <p className="text-xs text-[#8A9196]">Tickets you've put up for sale</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!listingsLoading && listings.length > 0 && (
              <Badge variant="gold" size="sm">{listings.length}</Badge>
            )}
            <ChevronDown className={`w-4 h-4 text-[#8A9196] transition-transform ${showListings ? 'rotate-180' : ''}`} />
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
                <p className="text-sm text-[#8A9196]">No resale listings yet.</p>
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
                        <p className="text-sm font-semibold text-[#EDF0F1] truncate">{listing.eventTitle || 'Event'}</p>
                        <p className="mt-0.5 text-xs text-[#8A9196]">{listing.ticketTypeName || 'Ticket'} • Listed {new Date(listing.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-lg font-bold text-[#D4AF37]">{format(listing.price)}</span>
                        <Badge variant={s.variant} size="sm">{s.label}</Badge>
                        {st === 'active' && (
                          <button
                            onClick={() => handleCancelListing(listing)}
                            disabled={cancellingId === listing.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-[#8A9196] text-xs font-medium hover:text-red-400 hover:border-red-400/40 disabled:opacity-50 transition-colors"
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
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSell}
              disabled={selling}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition"
            >
              <Tag className="w-4 h-4" />
              {selling ? 'Listing...' : 'List for Sale'}
            </button>
          </>
        }
      >
        {sellTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#1E252B] border border-[#262B2F] p-3">
              <p className="text-sm font-semibold text-[#EDF0F1]">{sellTarget.event?.title || sellTarget.eventName}</p>
              <p className="text-xs text-[#8A9196] mt-0.5">
                {sellTarget.ticketType || sellTarget.type} • #{String(sellTarget.ticketNumber || sellTarget.id).slice(-8).toUpperCase()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#8A9196] mb-2">
                Sale Price (₵)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
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
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferring}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4" />
              {transferring ? 'Sending...' : 'Transfer Ticket'}
            </button>
          </>
        }
      >
        {transferTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#1E252B] border border-[#262B2F] p-3">
              <p className="text-sm font-semibold text-[#EDF0F1]">{transferTarget.event?.title || transferTarget.eventName}</p>
              <p className="text-xs text-[#8A9196] mt-0.5">
                {transferTarget.ticketType || transferTarget.type} • #{(transferTarget.ticketNumber || transferTarget.id).toString().slice(-8).toUpperCase()}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#8A9196] mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
              />
              <p className="text-xs text-[#494F55] mt-2">
                The recipient will receive an email to accept this ticket transfer.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Print modal */}
      <Modal
        open={!!printTicket}
        onClose={() => setPrintTicket(null)}
        title="Download Ticket"
        size="md"
        footer={
          <>
            <button
              onClick={() => setPrintTicket(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] transition"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </>
        }
      >
        {printTicket && <PrintableTicket ticket={printTicket} />}
      </Modal>

      {/* Print-only ticket: when the user hits Print, only this clean ticket
          (with its QR code) is sent to the printer. */}
      {printTicket && (
        <div className="print-ticket-area">
          <PrintableTicket ticket={printTicket} />
        </div>
      )}
    </motion.div>
  );
}

function TicketCard({ ticket, onDownload, onTransfer, onPrint, onSell }) {
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

  const qrValue = JSON.stringify({
    ticketId: ticket.id,
    ticketNumber,
    event: event.title,
    type: ticket.ticketType || ticket.type,
  });

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={`group relative rounded-2xl overflow-hidden bg-[#171A1D] border shadow-[0_0_0_0_rgba(212,175,55,0)] hover:shadow-[0_14px_36px_-16px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,175,55,0.15)] ${isCancelled ? 'border-red-500/30 opacity-70' : 'border-[#262B2F] hover:border-[#D4AF37]/40'} transition-[border-color,box-shadow,opacity]`}
    >
      {/* Banner */}
      <div className="relative h-24 overflow-hidden bg-[#242B32]">
        {event.image ? (
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
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
          <div className="w-3 h-3 rounded-full bg-[#1E252B] -ml-6" />
          <div className="flex-1 border-t-2 border-dashed border-[#494F55]/40 my-0" />
          <div className="w-3 h-3 rounded-full bg-[#1E252B] -mr-6" />
        </div>

        <div className="flex gap-4 p-5">
          {/* Left: details */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#D4AF37]">
                {ticket.ticketType || ticket.type || 'General'}
              </span>
              <h3 className="text-base font-bold text-[#EDF0F1] line-clamp-2">{event.title || ticket.eventName || 'Event'}</h3>
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-[#8A9196] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#494F55] shrink-0" />
                <span className="truncate">
                  {eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                </span>
              </p>
              <p className="text-[#8A9196] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#494F55] shrink-0" />
                <span className="truncate">{event.venue || ticket.venue || 'Venue TBA'}</span>
              </p>
              {seat && (
                <p className="text-[#8A9196] flex items-center gap-1.5">
                  <Armchair className="w-4 h-4 text-[#494F55] shrink-0" />
                  <span className="truncate">Seat: {seat}</span>
                </p>
              )}
            </div>
            <div className="pt-2">
              <p className="text-[10px] uppercase tracking-wider text-[#494F55]">Ticket No.</p>
              <p className="text-sm font-mono font-semibold text-[#EDF0F1]">#{ticketNumber.slice(-8).toUpperCase()}</p>
            </div>
          </div>

          {/* Right: QR code */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-28 h-28 rounded-xl bg-white p-2 flex items-center justify-center ring-1 ring-transparent hover:ring-[#D4AF37]/40 transition-shadow"
            >
              <QRCodeSVG value={qrValue} size={96} level="M" includeMargin={false} />
            </motion.div>
            <p className="text-[10px] text-[#494F55] flex items-center gap-1">
              <QrCode className="w-3 h-3" /> Scan at entry
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-5 pt-0">
          <button
            onClick={onDownload}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-[#EDF0F1] text-xs font-medium hover:border-[#D4AF37]/40 hover:bg-[#242B32] transition-colors group-hover:border-[#494F55]/60"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={onPrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-[#EDF0F1] text-xs font-medium hover:border-[#D4AF37]/40 hover:bg-[#242B32] transition-colors group-hover:border-[#494F55]/60"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={onTransfer}
            disabled={isCancelled}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-[#EDF0F1] text-xs font-medium hover:border-[#D4AF37]/40 hover:bg-[#242B32] disabled:opacity-40 disabled:cursor-not-allowed transition-colors group-hover:border-[#494F55]/60"
          >
            <Send className="w-3.5 h-3.5" /> Transfer
          </button>
          <button
            onClick={onSell}
            disabled={isCancelled}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold hover:bg-[#D4AF37] hover:text-[#1E252B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  const qrValue = JSON.stringify({ ticketId: ticket.id, ticketNumber, event: event.title });

  return (
    <div className="rounded-xl border border-[#494F55]/40 overflow-hidden">
      <div className="bg-[#1E252B] p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">Tribes & Cliqs</p>
        <h3 className="text-lg font-bold text-[#EDF0F1] mt-1">{event.title || ticket.eventName}</h3>
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
