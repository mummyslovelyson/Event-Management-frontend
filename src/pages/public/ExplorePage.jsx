import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, X, MapPin, Calendar, Tag, ChevronDown,
  ArrowUpDown, Inbox, Sparkles, LayoutGrid, List, RotateCcw,
  Check, DollarSign, Clock, Compass, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EventCard from '@/components/common/EventCard';
import EmptyState from '@/components/common/EmptyState';
import Pagination from '@/components/common/Pagination';
import { getEvents } from '@/api/events';
import { POPULAR_CATEGORY_LIST } from '@/utils/categoryImages';
import { useCurrency } from '@/context/CurrencyContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CATEGORIES = [
  'Musical Shows',
  'Festivals',
  'Corporate Events',
  'Tournaments',
  'Social Events',
  'Movies & Stage Plays',
  'Fairs & Exhibitions',
  'Religious Activities',
];

const POPULAR_CITIES = ['Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast', 'Tamale'];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest & Upcoming' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];

const PRICE_MAX_GHS = 1000;

const DATE_PRESETS = [
  { label: 'All Dates', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Weekend', value: 'weekend' },
  { label: 'This Month', value: 'month' },
];

const DEFAULT_FILTERS = {
  search: '',
  categories: [],
  priceMin: 0,
  priceMax: PRICE_MAX_GHS,
  dateFrom: '',
  dateTo: '',
  datePreset: 'all',
  city: '',
  sort: 'latest',
  page: 1,
};

function EventCardSkeleton({ viewMode = 'grid' }) {
  if (viewMode === 'list') {
    return (
      <div className="rounded-2xl bg-[#171A1D] border border-[#262B2F] p-4 flex flex-col sm:flex-row gap-4 animate-pulse">
        <div className="w-full sm:w-56 h-36 bg-[#1C232B] rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 py-1">
          <div className="h-5 bg-[#1C232B] rounded w-2/3" />
          <div className="h-4 bg-[#1C232B] rounded w-1/3" />
          <div className="h-3 bg-[#1C232B] rounded w-1/2" />
          <div className="pt-2 flex gap-2">
            <div className="h-6 bg-[#1C232B] rounded w-16" />
            <div className="h-6 bg-[#1C232B] rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[#171A1D] border border-[#262B2F]">
      <div className="aspect-[16/10] bg-[#1C232B] animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#1C232B] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[#1C232B] rounded animate-pulse w-1/2" />
        <div className="h-3 bg-[#1C232B] rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { format, currency } = useCurrency();

  useDocumentTitle(
    'Explore Events & Shows in Ghana',
    'Discover upcoming concerts, nightlife, food festivals, tech conferences, and comedy shows across Ghana. Book tickets instantly on Tribes & Cliqs.'
  );

  // Search input with local debounce state
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    search: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    categories: searchParams.get('category') ? searchParams.get('category').split(',') : [],
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    datePreset: 'all',
    sort: searchParams.get('sort') || 'latest',
    page: Number(searchParams.get('page')) || 1,
  }));

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Debounce search typing by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput, page: 1 };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle Date presets
  const handleDatePreset = (preset) => {
    const today = new Date();
    let dateFrom = '';
    let dateTo = '';

    if (preset === 'today') {
      dateFrom = today.toISOString().split('T')[0];
      dateTo = dateFrom;
    } else if (preset === 'weekend') {
      const day = today.getDay();
      const diffToFriday = (5 - day + 7) % 7;
      const friday = new Date(today);
      friday.setDate(today.getDate() + diffToFriday);
      const sunday = new Date(friday);
      sunday.setDate(friday.getDate() + 2);

      dateFrom = friday.toISOString().split('T')[0];
      dateTo = sunday.toISOString().split('T')[0];
    } else if (preset === 'month') {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      dateFrom = today.toISOString().split('T')[0];
      dateTo = endOfMonth.toISOString().split('T')[0];
    }

    setFilters((prev) => ({
      ...prev,
      datePreset: preset,
      dateFrom,
      dateTo,
      page: 1,
    }));
  };

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
      if (filters.priceMax < PRICE_MAX_GHS) params.maxPrice = filters.priceMax;
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

  // Sync state to URL params for clean shareable queries
  useEffect(() => {
    const params = {};
    if (filters.search) params.q = filters.search;
    if (filters.city) params.city = filters.city;
    if (filters.categories.length > 0) params.category = filters.categories.join(',');
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
    setFilters((prev) => {
      const exists = prev.categories.includes(cat);
      const updated = exists ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat];
      return { ...prev, categories: updated, page: 1 };
    });
  };

  const removeFilter = (key, value) => {
    if (key === 'categories') {
      toggleCategory(value);
    } else if (key === 'search') {
      setSearchInput('');
      updateFilter('search', '');
    } else if (key === 'date') {
      setFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '', datePreset: 'all', page: 1 }));
    } else {
      updateFilter(key, key === 'priceMin' ? 0 : key === 'priceMax' ? PRICE_MAX_GHS : '');
    }
  };

  const clearAll = () => {
    setSearchInput('');
    setFilters({ ...DEFAULT_FILTERS });
  };

  const activeFilterCount = useMemo(() => {
    return [
      filters.search,
      filters.city,
      filters.categories.length > 0,
      filters.priceMin > 0,
      filters.priceMax < PRICE_MAX_GHS,
      filters.dateFrom || filters.dateTo,
    ].filter(Boolean).length;
  }, [filters]);

  const FilterPanel = () => (
    <div className="space-y-6 text-left">
      {/* City / Location */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#949599] mb-2.5">
          <MapPin className="w-3.5 h-3.5 text-white" /> Location
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => updateFilter('city', filters.city === c ? '' : c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filters.city.toLowerCase() === c.toLowerCase()
                  ? 'bg-white text-[#1C232B]'
                  : 'bg-[#1C232B] text-[#949599] hover:text-white hover:bg-[#262F38]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Or type another city..."
          value={filters.city}
          onChange={(e) => updateFilter('city', e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-[#14181C] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40"
        />
      </div>

      {/* Categories Multi-Select */}
      <div>
        <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#949599] mb-2.5">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-white" /> Categories
          </span>
          {filters.categories.length > 0 && (
            <span className="text-[10px] font-bold text-white bg-[#262F38] px-1.5 py-0.5 rounded">
              {filters.categories.length} selected
            </span>
          )}
        </label>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {CATEGORIES.map((cat) => {
            const isSelected = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                  isSelected
                    ? 'bg-white/10 text-white font-bold border border-white/20'
                    : 'text-[#949599] hover:text-white hover:bg-[#1C232B]'
                }`}
              >
                <span>{cat}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filter with Presets */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#949599] mb-2.5">
          <Calendar className="w-3.5 h-3.5 text-white" /> Date &amp; Time
        </label>
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handleDatePreset(p.value)}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition ${
                filters.datePreset === p.value
                  ? 'bg-white text-[#1C232B]'
                  : 'bg-[#1C232B] text-[#949599] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-[#949599] uppercase">From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, datePreset: 'custom', dateFrom: e.target.value, page: 1 }));
              }}
              className="w-full mt-1 px-2.5 py-1.5 rounded-xl bg-[#14181C] border border-[#2E363E] text-xs text-white focus:outline-none focus:border-white/40 [color-scheme:dark]"
            />
          </div>
          <div>
            <span className="text-[10px] text-[#949599] uppercase">To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, datePreset: 'custom', dateTo: e.target.value, page: 1 }));
              }}
              className="w-full mt-1 px-2.5 py-1.5 rounded-xl bg-[#14181C] border border-[#2E363E] text-xs text-white focus:outline-none focus:border-white/40 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#949599] mb-2.5">
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-white" /> Price Range
          </span>
          <span className="text-xs font-bold text-white">
            {format(filters.priceMin)} - {filters.priceMax >= PRICE_MAX_GHS ? `${format(PRICE_MAX_GHS)}+` : format(filters.priceMax)}
          </span>
        </label>

        {/* Quick price chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {[
            { label: 'Free', min: 0, max: 0 },
            { label: `Under ${format(100)}`, min: 0, max: 100 },
            { label: `${format(100)} - ${format(300)}`, min: 100, max: 300 },
            { label: `${format(300)}+`, min: 300, max: PRICE_MAX_GHS },
          ].map((pr, i) => {
            const isMatch = filters.priceMin === pr.min && filters.priceMax === pr.max;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    priceMin: isMatch ? 0 : pr.min,
                    priceMax: isMatch ? PRICE_MAX_GHS : pr.max,
                    page: 1,
                  }));
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  isMatch
                    ? 'bg-white text-[#1C232B]'
                    : 'bg-[#1C232B] text-[#949599] hover:text-white'
                }`}
              >
                {pr.label}
              </button>
            );
          })}
        </div>

        <input
          type="range"
          min="0"
          max={PRICE_MAX_GHS}
          step="25"
          value={filters.priceMax}
          onChange={(e) => updateFilter('priceMax', Number(e.target.value))}
          className="w-full accent-white cursor-pointer"
        />
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full py-2.5 rounded-xl bg-white/5 border border-[#2E363E] text-xs font-bold text-[#CBD5E1] hover:bg-white hover:text-[#1C232B] transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Filters</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111417] text-[#EFEFF1] pt-24 pb-16 sm:pt-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Hero & Title Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#242B32] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
              <Compass className="w-4 h-4" /> Live Events in Ghana
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Explore Events
            </h1>
            <p className="mt-1 text-sm text-[#949599]">
              {loading
                ? 'Discovering live events...'
                : `${pagination.total} event${pagination.total !== 1 ? 's' : ''} available`}
            </p>
          </div>

          {/* View mode toggle & Sort */}
          <div className="flex items-center gap-2.5">
            {/* View Mode */}
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-[#171A1D] border border-[#262B2F]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-white'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-white'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7278] pointer-events-none" />
              <select
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="pl-9 pr-8 py-2.5 rounded-xl bg-[#171A1D] border border-[#262B2F] text-xs font-semibold text-white focus:outline-none focus:border-white/50 appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7278] pointer-events-none" />
            </div>

            {/* Mobile Filter Trigger */}
            <button
              onClick={() => setShowFiltersMobile(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold shadow"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#1C232B] text-white text-[10px] flex items-center justify-center font-extrabold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar with Instant Clear */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7278]" />
          <input
            type="text"
            placeholder="Search by event title, artist, venue, city, or keywords..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#171A1D] border border-[#262B2F] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white/50 transition shadow-inner"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Featured Genres & Category Thumbnails Strip */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#949599] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Popular Categories
            </span>
            <span className="text-[11px] text-[#6B7278]">Scroll to view all</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {POPULAR_CATEGORY_LIST.map((cat) => {
              const isSelected = filters.categories.includes(cat.name);
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => toggleCategory(cat.name)}
                  className={`relative flex-shrink-0 w-32 sm:w-36 h-20 rounded-2xl overflow-hidden group snap-start border transition-all text-left ${
                    isSelected
                      ? 'border-white ring-2 ring-white/30 shadow-lg scale-[1.02]'
                      : 'border-[#262B2F] hover:border-white/40'
                  }`}
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isSelected ? 'scale-105' : 'group-hover:scale-110 opacity-70 group-hover:opacity-90'
                    }`}
                  />
                  <div
                    className={`absolute inset-0 transition-colors ${
                      isSelected
                        ? 'bg-black/40'
                        : 'bg-gradient-to-t from-black/90 via-black/40 to-transparent'
                    }`}
                  />
                  <div className="absolute inset-0 p-2.5 flex flex-col justify-end">
                    <span className="text-[11px] font-bold text-white leading-tight line-clamp-2">
                      {cat.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
            <span className="text-xs text-[#949599] font-medium mr-1">Active filters:</span>
            {filters.search && (
              <FilterChip label={`"${filters.search}"`} onRemove={() => removeFilter('search')} />
            )}
            {filters.city && (
              <FilterChip icon={MapPin} label={filters.city} onRemove={() => removeFilter('city')} />
            )}
            {filters.categories.map((c) => (
              <FilterChip key={c} label={c} onRemove={() => removeFilter('categories', c)} />
            ))}
            {(filters.dateFrom || filters.dateTo) && (
              <FilterChip
                icon={Calendar}
                label={
                  filters.datePreset === 'today'
                    ? 'Today'
                    : filters.datePreset === 'weekend'
                    ? 'This Weekend'
                    : filters.datePreset === 'month'
                    ? 'This Month'
                    : `${filters.dateFrom || 'Any'} → ${filters.dateTo || 'Any'}`
                }
                onRemove={() => removeFilter('date')}
              />
            )}
            {(filters.priceMin > 0 || filters.priceMax < PRICE_MAX_GHS) && (
              <FilterChip
                label={`${format(filters.priceMin)} - ${format(filters.priceMax)}`}
                onRemove={() => {
                  setFilters((prev) => ({ ...prev, priceMin: 0, priceMax: PRICE_MAX_GHS, page: 1 }));
                }}
              />
            )}
            <button
              onClick={clearAll}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline ml-2 transition"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Main Body: Sticky Filter Sidebar + Event Feed */}
        <div className="flex gap-8 items-start pt-2">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-28 rounded-2xl bg-[#171A1D] border border-[#262B2F] p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#242B32]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" /> Filter Events
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-[#949599] hover:text-white transition"
                  >
                    Reset
                  </button>
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          {/* Results Grid / List */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                    : 'space-y-4'
                }
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <EventCardSkeleton key={i} viewMode={viewMode} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No events match your criteria"
                description="Try loosening your search terms, changing the city, or resetting active filters to view all upcoming events."
                action={activeFilterCount > 0 ? clearAll : undefined}
                actionLabel="Clear Filters"
              />
            ) : (
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                      : 'space-y-4'
                  }
                >
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant={viewMode === 'list' ? 'list' : 'default'}
                    />
                  ))}
                </motion.div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="pt-4 border-t border-[#242B32] flex justify-center">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={(p) => {
                        setFilters((prev) => ({ ...prev, page: p }));
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {showFiltersMobile && (
          <div className="lg:hidden fixed inset-0 z-[100] flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowFiltersMobile(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative ml-auto w-full max-w-sm h-full bg-[#171A1D] border-l border-[#2E363E] overflow-y-auto flex flex-col justify-between shadow-2xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[#262B2F] bg-[#171A1D]/95 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Filters</h3>
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#1C232B]">
                      {activeFilterCount} active
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowFiltersMobile(false)}
                  className="p-2 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto">
                <FilterPanel />
              </div>

              <div className="p-4 border-t border-[#262B2F] bg-[#14181C]">
                <button
                  onClick={() => setShowFiltersMobile(false)}
                  className="w-full py-3 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition shadow"
                >
                  Show Results ({pagination.total})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ icon: Icon, label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-medium transition hover:border-white/40">
      {Icon && <Icon className="w-3 h-3 text-[#CBD5E1]" />}
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-white/20 hover:text-white text-[#949599] transition ml-0.5"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
