import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search, SlidersHorizontal, X, MapPin, DollarSign, Tag, Calendar, ChevronDown, Ticket, Sparkles,
} from 'lucide-react';
import { getEvents, getCategories, getRecommendedEvents } from '@/api/events';
import { useAuth } from '@/context/AuthContext';
import EventCard from '@/components/common/EventCard';
import Pagination from '@/components/common/Pagination';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const PRICE_OPTIONS = [
  { value: '', label: 'Any Price' },
  { value: 'free', label: 'Free' },
  { value: '0-50', label: '₵0 - ₵50' },
  { value: '50-100', label: '₵50 - ₵100' },
  { value: '100-250', label: '₵100 - ₵250' },
  { value: '250+', label: '₵250+' },
];

const DATE_OPTIONS = [
  { value: '', label: 'Any Date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-weekend', label: 'This Weekend' },
  { value: 'next-week', label: 'Next Week' },
  { value: 'this-month', label: 'This Month' },
];

const SORT_OPTIONS = [
  { value: 'date-asc', label: 'Date: Soonest' },
  { value: 'date-desc', label: 'Date: Latest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ExploreEventsPage() {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    price: '',
    date: '',
    location: '',
    sort: 'date-asc',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await getCategories();
        const cats = Array.isArray(res.data) ? res.data : res.data?.categories ?? [];
        setCategories(cats);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  // Personalized picks — shown to signed-in attendees when available.
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setRecommendedLoading(true);
    (async () => {
      try {
        const res = await getRecommendedEvents({ limit: 3 });
        if (!active) return;
        const data = res.data?.events ?? res.data ?? [];
        setRecommended(Array.isArray(data) ? data : []);
      } catch {
        /* non-fatal */
      } finally {
        if (active) setRecommendedLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isAuthenticated]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        ...(query && { search: query }),
        ...(filters.category && { category: filters.category }),
        ...(filters.price && { price: filters.price }),
        ...(filters.date && { date: filters.date }),
        ...(filters.location && { location: filters.location }),
        ...(filters.sort && { sort: filters.sort }),
      };
      const res = await getEvents(params);
      const data = res.data;
      setEvents(data?.events ?? data?.data ?? []);
      setTotal(data?.total ?? (data?.events ?? data?.data ?? []).length);
      setTotalPages(data?.totalPages ?? data?.pages ?? 1);
    } catch (err) {
      toast.error('Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [page, query, filters]);

  useEffect(() => {
    const t = setTimeout(fetchEvents, 350);
    return () => clearTimeout(t);
  }, [fetchEvents]);

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ category: '', price: '', date: '', location: '', sort: 'date-asc' });
    setQuery('');
    setPage(1);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v && !(k === 'sort' && v === 'date-asc')
  ).length + (query ? 1 : 0);

  return (
    <motion.div
      variants={containerStagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemFade}>
        <h1 className="text-2xl font-bold text-[#EFEFF1]">Explore Events</h1>
        <p className="text-sm text-[#949599] mt-1">Discover and book tickets for events near you.</p>
      </motion.div>

      {/* Recommended for you */}
      {isAuthenticated && (recommendedLoading || recommended.length > 0) && (
        <motion.section variants={itemFade} className="rounded-xl bg-gradient-to-br from-white/ via-[#171A1D] to-[#171A1D] border border-white/ p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-white/ text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#EFEFF1]">Recommended For You</h2>
                <p className="text-xs text-[#949599]">Based on your favorites, past events, and location</p>
              </div>
            </div>
            <Link
              to="/attendee/favorites"
              className="text-xs font-medium text-white hover:underline underline-offset-4 decoration-white/ shrink-0"
            >
              Manage preferences
            </Link>
          </div>
          {recommendedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-[#1C232B]/60 border border-[#262B2F] p-4 animate-pulse">
                  <div className="h-20 bg-[#242B32] rounded-lg mb-3" />
                  <div className="h-3 bg-[#242B32] rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended.map((event) => (
                <EventCard key={event.id} event={event} compact />
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* Search + filter toggle */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#494F55]" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search events, artists, venues..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/ focus:ring-1 focus:ring-white/ transition"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949599] hover:text-[#EFEFF1]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-white/ border-white/ text-white'
              : 'bg-[#171A1D] border-[#494F55]/40 text-[#EFEFF1] hover:border-[#494F55]/60'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-white text-[#1C232B] text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </motion.div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 sm:p-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterField icon={Tag} label="Category">
              <SelectInput
                value={filters.category}
                onChange={(v) => updateFilter('category', v)}
                options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: c.id ?? c.slug ?? c.name, label: c.name ?? c }))]}
              />
            </FilterField>
            <FilterField icon={DollarSign} label="Price">
              <SelectInput
                value={filters.price}
                onChange={(v) => updateFilter('price', v)}
                options={PRICE_OPTIONS}
              />
            </FilterField>
            <FilterField icon={Calendar} label="Date">
              <SelectInput
                value={filters.date}
                onChange={(v) => updateFilter('date', v)}
                options={DATE_OPTIONS}
              />
            </FilterField>
            <FilterField icon={MapPin} label="Location">
              <input
                type="text"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                placeholder="City or venue"
                className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/ transition"
              />
            </FilterField>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#262B2F]">
            <button
              onClick={clearFilters}
              className="text-sm text-[#949599] hover:text-[#EFEFF1] transition"
            >
              Clear all filters
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition"
            >
              Apply
            </button>
          </div>
        </motion.div>
      )}

      {/* Sort + results count */}
      <motion.div variants={itemFade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-[#949599]">
          {loading ? 'Searching...' : (
            <>
              <span className="font-semibold text-[#EFEFF1]">{total}</span> event{total !== 1 ? 's' : ''} found
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#949599]">Sort by:</span>
          <div className="relative">
            <select
              value={filters.sort}
              onChange={(e) => { updateFilter('sort', e.target.value); }}
              className="appearance-none pl-3 pr-9 py-2 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/ transition cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#171A1D]">{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599] pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-[#242B32]" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-[#242B32] rounded w-3/4" />
                <div className="h-3 bg-[#242B32] rounded w-1/2" />
                <div className="h-3 bg-[#242B32] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No events found"
          description="Try adjusting your search or filters to find events."
          action={clearFilters}
          actionLabel="Clear filters"
        />
      ) : (
        <motion.div variants={containerStagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <motion.div key={event.id} variants={itemFade}>
              <EventCard event={event} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {!loading && events.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </motion.div>
  );
}

function FilterField({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">
        <Icon className="w-3.5 h-3.5 text-[#494F55]" />
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2.5 pr-9 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/ transition cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#171A1D]">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599] pointer-events-none" />
    </div>
  );
}
