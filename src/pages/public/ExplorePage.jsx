import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, X, MapPin, Calendar, Tag, ChevronDown,
  ArrowUpDown, Inbox, Heart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EventCard from '@/components/common/EventCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { getEvents } from '@/api/events';

const CATEGORIES = [
  'Concert', 'Sports', 'Festival', 'Conference', 'Seminar',
  'Workshop', 'Theatre', 'Church', 'Wedding', 'Fashion',
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'popularity', label: 'Popularity' },
];

const PRICE_MAX = 500;

const DEFAULT_FILTERS = {
  search: '',
  categories: [],
  priceMin: 0,
  priceMax: PRICE_MAX,
  dateFrom: '',
  dateTo: '',
  city: '',
  sort: 'latest',
  page: 1,
};

function EventCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#171A1D] border border-[#262B2F]">
      <div className="aspect-[16/10] bg-[#1E252B] animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#1E252B] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[#1E252B] rounded animate-pulse w-1/2" />
        <div className="h-3 bg-[#1E252B] rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    search: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    categories: searchParams.get('category') ? [searchParams.get('category')] : [],
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    sort: searchParams.get('sort') || 'latest',
    page: Number(searchParams.get('page')) || 1,
  }));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: 12,
        sort: filters.sort,
      };
      if (filters.search) params.q = filters.search;
      if (filters.city) params.city = filters.city;
      if (filters.categories.length) params.category = filters.categories.join(',');
      if (filters.priceMin > 0) params.minPrice = filters.priceMin;
      if (filters.priceMax < PRICE_MAX) params.maxPrice = filters.priceMax;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const res = await getEvents(params);
      const data = res.data?.data || res.data || [];
      setEvents(Array.isArray(data) ? data : data.events || []);
      setPagination({
        page: res.data?.page || filters.page,
        totalPages: res.data?.totalPages || res.data?.pages || Math.ceil((res.data?.total || data.length) / 12) || 1,
        total: res.data?.total || data.length || 0,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Sync filters to URL
  useEffect(() => {
    const params = {};
    if (filters.search) params.q = filters.search;
    if (filters.city) params.city = filters.city;
    if (filters.categories.length === 1) params.category = filters.categories[0];
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.sort !== 'latest') params.sort = filters.sort;
    if (filters.page > 1) params.page = String(filters.page);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const toggleCategory = (cat) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
      page: 1,
    }));
  };

  const removeFilter = (key, value) => {
    if (key === 'categories') {
      toggleCategory(value);
    } else {
      updateFilter(key, key === 'priceMin' ? 0 : key === 'priceMax' ? PRICE_MAX : '');
    }
  };

  const clearAll = () => setFilters({ ...DEFAULT_FILTERS });

  const activeFilterCount = [
    filters.search,
    filters.city,
    filters.categories.length > 0,
    filters.priceMin > 0,
    filters.priceMax < PRICE_MAX,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A9196] mb-2">
          <Search className="w-3.5 h-3.5" /> Keyword
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
          <input
            type="text"
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder:text-[#494F55] focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A9196] mb-3">
          <Tag className="w-3.5 h-3.5" /> Category
        </label>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {CATEGORIES.map((cat) => (
            <motion.label
              key={cat}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={filters.categories.includes(cat)}
                onChange={() => toggleCategory(cat)}
                className="w-4 h-4 rounded border-[#494F55] bg-[#1E252B] text-[#D4AF37] focus:ring-[#D4AF37]/40 focus:ring-offset-0"
              />
              <span className={`text-sm transition-colors ${filters.categories.includes(cat) ? 'text-[#D4AF37]' : 'text-[#8A9196] group-hover:text-[#EDF0F1]'}`}>
                {cat}
              </span>
            </motion.label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A9196] mb-3">
          Price Range
        </label>
        <div className="flex items-center justify-between text-sm text-[#EDF0F1] mb-2">
          <span>${filters.priceMin}</span>
          <span>${filters.priceMax}{filters.priceMax >= PRICE_MAX ? '+' : ''}</span>
        </div>
        <input
          type="range"
          min="0"
          max={PRICE_MAX}
          step="10"
          value={filters.priceMax}
          onChange={(e) => updateFilter('priceMax', Number(e.target.value))}
          className="w-full accent-[#D4AF37] cursor-pointer"
        />
        <input
          type="range"
          min="0"
          max={PRICE_MAX}
          step="10"
          value={filters.priceMin}
          onChange={(e) => updateFilter('priceMin', Number(e.target.value))}
          className="w-full accent-[#D4AF37] cursor-pointer mt-2"
        />
      </div>

      {/* Date */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A9196] mb-2">
          <Calendar className="w-3.5 h-3.5" /> Date
        </label>
        <div className="space-y-2">
          <input
            type="date"
            placeholder="From"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] focus:outline-none focus:border-[#D4AF37]/50 [color-scheme:dark]"
          />
          <input
            type="date"
            placeholder="To"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] focus:outline-none focus:border-[#D4AF37]/50 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8A9196] mb-2">
          <MapPin className="w-3.5 h-3.5" /> Location
        </label>
        <input
          type="text"
          placeholder="Enter city"
          value={filters.city}
          onChange={(e) => updateFilter('city', e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder:text-[#494F55] focus:outline-none focus:border-[#D4AF37]/50"
        />
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full py-2.5 rounded-lg border border-[#494F55]/40 text-sm text-[#8A9196] hover:text-[#EDF0F1] hover:border-[#494F55] transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-[#EDF0F1]">Explore Events</h1>
          <p className="mt-1 text-sm text-[#8A9196]">
            {loading ? 'Loading...' : `${pagination.total} event${pagination.total !== 1 ? 's' : ''} found`}
          </p>
        </motion.div>

        {/* Top search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
            <input
              type="text"
              placeholder="Search by event name, artist, or keyword..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder:text-[#494F55] focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <button
            onClick={() => setShowFiltersMobile(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-3 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters{activeFilterCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#1E252B] text-xs font-bold">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Sort + active filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 && (
              <>
                {filters.search && (
                  <FilterChip label={`"${filters.search}"`} onRemove={() => removeFilter('search')} />
                )}
                {filters.city && (
                  <FilterChip icon={MapPin} label={filters.city} onRemove={() => removeFilter('city')} />
                )}
                {filters.categories.map((c) => (
                  <FilterChip key={c} label={c} onRemove={() => removeFilter('categories', c)} />
                ))}
                {filters.priceMin > 0 && (
                  <FilterChip label={`Min $${filters.priceMin}`} onRemove={() => removeFilter('priceMin')} />
                )}
                {filters.priceMax < PRICE_MAX && (
                  <FilterChip label={`Max $${filters.priceMax}`} onRemove={() => removeFilter('priceMax')} />
                )}
                {filters.dateFrom && (
                  <FilterChip icon={Calendar} label={`From ${filters.dateFrom}`} onRemove={() => removeFilter('dateFrom')} />
                )}
                {filters.dateTo && (
                  <FilterChip icon={Calendar} label={`To ${filters.dateTo}`} onRemove={() => removeFilter('dateTo')} />
                )}
              </>
            )}
          </div>
          <div className="relative shrink-0">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55] pointer-events-none" />
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] focus:outline-none focus:border-[#D4AF37]/50 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55] pointer-events-none" />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className={`sticky top-20 rounded-xl bg-[#171A1D] border p-5 transition-colors duration-300 ${activeFilterCount > 0 ? 'border-[#D4AF37]/30' : 'border-[#262B2F]'}`}>
              <h3 className="text-sm font-semibold text-[#EDF0F1] mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" /> Filters
              </h3>
              <FilterPanel />
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No events found"
                description="Try adjusting your filters or search terms to find what you're looking for."
                action={activeFilterCount > 0 ? clearAll : undefined}
                actionLabel="Clear Filters"
              />
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                >
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </motion.div>
                <div className="mt-8">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(p) => {
                      setFilters((prev) => ({ ...prev, page: p }));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFiltersMobile && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowFiltersMobile(false)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="relative ml-auto w-80 max-w-[85%] h-full bg-[#171A1D] border-l border-[#494F55]/40 overflow-y-auto"
          >
            <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-[#262B2F] bg-[#171A1D]">
              <h3 className="text-sm font-semibold text-[#EDF0F1]">Filters</h3>
              <button onClick={() => setShowFiltersMobile(false)} className="p-1.5 rounded-lg text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <FilterPanel />
              <button
                onClick={() => setShowFiltersMobile(false)}
                className="mt-6 w-full py-3 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition-colors"
              >
                Show Results
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function FilterChip({ icon: Icon, label, onRemove }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-medium"
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <button onClick={onRemove} className="hover:text-[#EDF0F1] transition-colors">
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  );
}
