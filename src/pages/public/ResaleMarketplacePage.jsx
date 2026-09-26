import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, ShieldCheck, RefreshCw, Zap, Search, Filter,
  ArrowRight, CheckCircle2, AlertCircle, Calendar, MapPin,
  Clock, User, Tag, ChevronRight, Loader2, Sparkles, SlidersHorizontal,
  DollarSign, ShoppingCart, HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getMarketplaceListings, purchaseResaleListing } from '@/api/resale';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';

export default function ResaleMarketplacePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { format } = useCurrency();

  useDocumentTitle(
    'Verified Ticket Resale Marketplace — Tribes & Cliqs',
    'Buy and sell authentic event tickets safely. Fair anti-scalping price caps (max +25%), organizer approvals, and instant QR code re-issuance.'
  );

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price_asc' | 'price_desc'

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await getMarketplaceListings({
        search: searchTerm || undefined,
        limit: 50,
      });
      const data = res.data?.listings || res.data?.data || res.data || [];
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load resale tickets');
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleBuy = async (listing) => {
    if (!isAuthenticated) {
      toast.error('Please log in to purchase a resale ticket');
      navigate('/login?redirect=/resale');
      return;
    }

    if (user?.id && listing.seller_id === user.id) {
      toast.error('You cannot purchase your own resale listing');
      return;
    }

    setBuyingId(listing.id);
    try {
      const res = await purchaseResaleListing(listing.id);
      const data = res.data?.data || res.data;
      const authUrl = data?.authorizationUrl;
      if (authUrl) {
        window.location.href = authUrl;
        return;
      }
      toast.success('Ticket purchased successfully! A brand new QR code has been generated in your tickets.');
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      navigate('/attendee/tickets');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete ticket purchase');
    } finally {
      setBuyingId(null);
    }
  };

  // Filtered & Sorted listings
  const filteredListings = listings.filter((item) => {
    const evTitle = (item.event_title || item.eventTitle || '').toLowerCase();
    const tName = (item.ticket_type_name || item.ticketTypeName || '').toLowerCase();
    const city = (item.event_city || item.city || '').toLowerCase();
    const matchesSearch = !searchTerm || evTitle.includes(searchTerm.toLowerCase()) || tName.includes(searchTerm.toLowerCase()) || city.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (item.event_category || '').toLowerCase() === selectedCategory.toLowerCase();
    const matchesMaxPrice = !maxPriceFilter || Number(item.resale_price || item.price) <= Number(maxPriceFilter);
    return matchesSearch && matchesCategory && matchesMaxPrice;
  }).sort((a, b) => {
    const priceA = Number(a.resale_price || a.price || 0);
    const priceB = Number(b.resale_price || b.price || 0);
    if (sortBy === 'price_asc') return priceA - priceB;
    if (sortBy === 'price_desc') return priceB - priceA;
    return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
  });

  const categories = ['all', ...new Set(listings.map((l) => l.event_category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#111417] text-[#EFEFF1] pt-24 pb-20">
      {/* ─── Hero Header ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1C232B] via-[#171A1D] to-[#111417] border border-[#262B2F] p-8 sm:p-12 shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Verified Secondary Marketplace
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Fair Ticket Resale. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
                Zero Scalping, Pure Peace of Mind.
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#949599] leading-relaxed">
              Plans change, but your money shouldn’t go to waste. Buy authentic resale tickets protected by our
              <span className="text-white font-medium"> +25% anti-scalping price cap</span>, organizer oversight, and
              <span className="text-white font-medium"> instant digital QR code re-issuance</span>.
            </p>

            {/* Key Guarantees */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#262B2F]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Capped Pricing</h4>
                  <p className="text-xs text-[#949599] mt-0.5">Max +25% markup over face value to prevent price gouging.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fresh QR Code</h4>
                  <p className="text-xs text-[#949599] mt-0.5">Old ticket is revoked instantly. You get a brand-new digital pass.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Organizer Oversight</h4>
                  <p className="text-xs text-[#949599] mt-0.5">Approved and backed directly through the official event organizers.</p>
                </div>
              </div>
            </div>

            {/* Seller CTA Banner */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/attendee/tickets"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#111417] text-sm font-bold hover:bg-[#EFEFF1] transition shadow-lg"
              >
                <Tag className="w-4 h-4" />
                Resell My Spare Ticket
              </Link>
              <span className="text-xs text-[#949599]">
                Already have an event pass? Resell safely from your <strong className="text-[#CBD5E1]">My Tickets</strong> page.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#171A1D] border border-[#262B2F] p-4 rounded-2xl">
          {/* Search box */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by event, ticket type, city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111417] border border-[#262B2F] text-sm text-white placeholder-[#949599] focus:outline-none focus:border-white/40 transition"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Category filter */}
            {categories.length > 1 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#111417] border border-[#262B2F] text-xs font-medium text-white focus:outline-none focus:border-white/40"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            )}

            {/* Sort order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#111417] border border-[#262B2F] text-xs font-medium text-white focus:outline-none focus:border-white/40"
            >
              <option value="newest">Newest Listings</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            <button
              onClick={fetchListings}
              title="Refresh Listings"
              className="p-2.5 rounded-xl bg-[#111417] border border-[#262B2F] text-[#949599] hover:text-white transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Listings Grid ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner label="Loading verified resale tickets..." />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-3xl bg-[#171A1D] border border-[#262B2F] p-12 text-center max-w-xl mx-auto">
            <Ticket className="w-12 h-12 text-[#949599] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">No active resale tickets right now</h3>
            <p className="text-xs text-[#949599] mt-2 leading-relaxed">
              Every resale ticket listed on Tribes & Cliqs is snatched up quickly! Check back soon or browse general upcoming events.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/explore"
                className="px-5 py-2.5 rounded-xl bg-white text-[#111417] text-xs font-bold hover:bg-[#CBD5E1] transition"
              >
                Explore All Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const originalPrice = Number(listing.original_price || listing.ticket_type_price || 0);
              const resalePrice = Number(listing.resale_price || listing.price || 0);
              const eventBanner = listing.event_banner || listing.banner_image || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg';
              const eventTitle = listing.event_title || listing.eventTitle || 'Featured Event';
              const ticketType = listing.ticket_type_name || listing.ticketTypeName || 'General Admission';
              const sellerName = listing.seller_name || listing.seller?.name || 'Verified Attendee';
              const eventDate = listing.event_date ? new Date(listing.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
              const eventVenue = listing.event_venue || listing.venue || 'Accra, Ghana';
              const markupPercent = originalPrice > 0 ? Math.round(((resalePrice - originalPrice) / originalPrice) * 100) : 0;

              return (
                <motion.div
                  key={listing.id}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl bg-[#171A1D] border border-[#262B2F] hover:border-emerald-500/40 overflow-hidden flex flex-col transition-all shadow-lg hover:shadow-emerald-500/10"
                >
                  {/* Event Thumbnail Header */}
                  <div className="relative h-44 overflow-hidden bg-[#111417]">
                    <img
                      src={eventBanner}
                      alt={eventTitle}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171A1D] via-transparent to-black/60" />

                    {/* Verified Resale Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1 shadow-md">
                        <ShieldCheck className="w-3 h-3" /> Verified Resale
                      </span>
                    </div>

                    {/* Anti-scalping indicator */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 text-[#CBD5E1] backdrop-blur-sm border border-white/10">
                        {markupPercent > 0 ? `+${markupPercent}% Markup` : 'Face Value'}
                      </span>
                    </div>

                    {/* Ticket tier badge at bottom of image */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#111417]/90 text-white backdrop-blur-md border border-white/10">
                        {ticketType}
                      </span>
                      {listing.approval_status === 'approved' && (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Organizer Approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        to={`/events/${listing.event_id}`}
                        className="text-base font-bold text-white hover:text-emerald-400 transition line-clamp-1"
                      >
                        {eventTitle}
                      </Link>

                      <div className="mt-2.5 space-y-1 text-xs text-[#949599]">
                        {eventDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#CBD5E1]" />
                            <span>{eventDate}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#CBD5E1]" />
                          <span className="truncate">{eventVenue}</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <User className="w-3.5 h-3.5 text-[#CBD5E1]" />
                          <span>Listed by <strong className="text-[#CBD5E1]">{sellerName}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Purchase Section */}
                    <div className="mt-5 pt-4 border-t border-[#262B2F]">
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <div className="text-[10px] text-[#949599] uppercase tracking-wider font-semibold">Resale Price</div>
                          <div className="text-xl font-black text-white">{format(resalePrice)}</div>
                        </div>
                        {originalPrice > 0 && (
                          <div className="text-right">
                            <div className="text-[10px] text-[#949599] uppercase tracking-wider font-semibold">Original Face Value</div>
                            <div className="text-xs text-[#949599] line-through">{format(originalPrice)}</div>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-[#949599] flex items-center justify-between mb-3 bg-[#111417] p-2 rounded-lg border border-[#262B2F]">
                        <span>Platform Protected Transfer</span>
                        <span className="font-semibold text-emerald-400">Included</span>
                      </div>

                      <button
                        onClick={() => handleBuy(listing)}
                        disabled={buyingId === listing.id}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {buyingId === listing.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Securing Ticket...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            Buy Resale Ticket &rarr;
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Explainer Section ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="rounded-3xl bg-[#171A1D] border border-[#262B2F] p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Security & Integrity</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">How Tribes & Cliqs Resale Works</h2>
            <p className="mt-2 text-xs sm:text-sm text-[#949599]">
              Built to eradicate ticket fraud, fake screenshots, and predatory black-market markups.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#111417] border border-[#262B2F]">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-sm mb-4">1</div>
              <h3 className="text-sm font-bold text-white">Attendee Lists Ticket</h3>
              <p className="text-xs text-[#949599] mt-2 leading-relaxed">
                Attendees can list active tickets directly from their Digital Wallet, capped strictly at +25% of original face value.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111417] border border-[#262B2F]">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm mb-4">2</div>
              <h3 className="text-sm font-bold text-white">Organizer Moderation</h3>
              <p className="text-xs text-[#949599] mt-2 leading-relaxed">
                Event organizers maintain visibility over all secondary sales and can verify or approve listings.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111417] border border-[#262B2F]">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm mb-4">3</div>
              <h3 className="text-sm font-bold text-white">Secure Payment &amp; Fee</h3>
              <p className="text-xs text-[#949599] mt-2 leading-relaxed">
                Buyer pays securely via Mobile Money or Card. A 5% platform service fee is deducted and 95% goes to the seller's wallet.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111417] border border-[#262B2F]">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">4</div>
              <h3 className="text-sm font-bold text-white">Automatic Ownership Transfer</h3>
              <p className="text-xs text-[#949599] mt-2 leading-relaxed">
                Seller's old QR code is revoked immediately. A brand-new digital ticket and QR code is minted for the buyer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
