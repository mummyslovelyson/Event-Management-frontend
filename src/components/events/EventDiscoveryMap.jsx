import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Tag, ArrowRight, X, ExternalLink,
  Compass, Navigation, DollarSign, Layers, Eye, Ticket,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

// City GPS Coordinates & Viewbox Bounds for Ghana Hubs
const CITY_COORDINATES = {
  Accra: { lat: 5.6037, lng: -0.1870, x: 74, y: 76 },
  Kumasi: { lat: 6.6885, lng: -1.6244, x: 46, y: 55 },
  Takoradi: { lat: 4.8874, lng: -1.7554, x: 38, y: 88 },
  Tema: { lat: 5.6698, lng: -0.0166, x: 79, y: 74 },
  'Cape Coast': { lat: 5.1315, lng: -1.2795, x: 50, y: 84 },
  Tamale: { lat: 9.4008, lng: -0.8393, x: 60, y: 22 },
  Koforidua: { lat: 6.0784, lng: -0.2588, x: 71, y: 68 },
  Sunyani: { lat: 7.3399, lng: -2.3268, x: 32, y: 45 },
};

const CITY_PILLS = ['All Cities', 'Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast', 'Tamale'];

export default function EventDiscoveryMap({ events = [] }) {
  const { format } = useCurrency();
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [activeEvent, setActiveEvent] = useState(null);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'satellite'

  // Map each event to a pin coordinate (using event lat/lng or city fallbacks)
  const mappedEvents = useMemo(() => {
    return events.map((ev, idx) => {
      let coords = null;

      // Check if event has a known city
      const cityKey = Object.keys(CITY_COORDINATES).find(
        (c) => ev.city?.toLowerCase() === c.toLowerCase() || ev.venue?.toLowerCase().includes(c.toLowerCase())
      );

      if (cityKey) {
        const base = CITY_COORDINATES[cityKey];
        // Add subtle offset for distinct events in the same city
        const seed = (ev.id || idx) * 17;
        const offsetX = ((seed % 11) - 5) * 1.4;
        const offsetY = (((seed * 7) % 11) - 5) * 1.4;
        coords = {
          city: cityKey,
          x: Math.max(10, Math.min(90, base.x + offsetX)),
          y: Math.max(10, Math.min(90, base.y + offsetY)),
        };
      } else {
        // Default to Accra cluster
        const seed = (ev.id || idx) * 13;
        coords = {
          city: 'Accra',
          x: 74 + ((seed % 9) - 4) * 1.5,
          y: 76 + (((seed * 3) % 9) - 4) * 1.5,
        };
      }

      const minPrice = ev.minPrice ?? ev.min_price ?? ev.price;
      const priceLabel = minPrice != null ? (Number(minPrice) === 0 ? 'Free' : format(minPrice)) : 'Tickets';

      return {
        ...ev,
        coords,
        priceLabel,
      };
    });
  }, [events, format]);

  // Filter events based on active city chip
  const filteredEvents = useMemo(() => {
    if (selectedCity === 'All Cities') return mappedEvents;
    return mappedEvents.filter(
      (ev) => ev.coords.city.toLowerCase() === selectedCity.toLowerCase()
    );
  }, [mappedEvents, selectedCity]);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#161D22] border border-white/10 shadow-2xl">
      {/* ── Top Bar: City Selector & Controls ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#111417]/85 backdrop-blur-xl border border-white/10 shadow-xl overflow-x-auto no-scrollbar pointer-events-auto">
          {CITY_PILLS.map((city) => {
            const count =
              city === 'All Cities'
                ? mappedEvents.length
                : mappedEvents.filter((e) => e.coords.city.toLowerCase() === city.toLowerCase()).length;

            return (
              <button
                key={city}
                onClick={() => {
                  setSelectedCity(city);
                  setActiveEvent(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCity === city
                    ? 'bg-[#b21414] text-white shadow-md'
                    : 'text-[#949599] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{city}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCity === city ? 'bg-black/30 text-white' : 'bg-white/5 text-[#949599]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend / Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111417]/85 backdrop-blur-xl border border-white/10 text-xs text-[#949599] pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{filteredEvents.length} Events on Map</span>
        </div>
      </div>

      {/* ── Interactive Map Canvas ── */}
      <div className="relative w-full h-[540px] sm:h-[620px] bg-[#111417] overflow-hidden select-none">
        {/* Radar scan effect background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(178,20,20,0.12),transparent_70%)]" />

        {/* Stylized Grid Overlay */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Stylized Ghana Country Silhouette SVG Outline */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-20"
        >
          {/* Ghana territorial border representation */}
          <path
            d="M 35 15 L 68 15 L 75 35 L 78 60 L 82 75 L 74 88 L 38 90 L 32 65 L 28 35 Z"
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          {/* Major Coastline */}
          <path
            d="M 32 89 Q 55 92 82 76"
            fill="none"
            stroke="#b21414"
            strokeWidth="1.2"
          />
        </svg>

        {/* Region Labels */}
        <div className="absolute left-[72%] top-[78%] text-[10px] uppercase tracking-widest font-black text-white/30 pointer-events-none">
          Greater Accra
        </div>
        <div className="absolute left-[40%] top-[57%] text-[10px] uppercase tracking-widest font-black text-white/30 pointer-events-none">
          Ashanti / Kumasi
        </div>
        <div className="absolute left-[30%] top-[87%] text-[10px] uppercase tracking-widest font-black text-white/30 pointer-events-none">
          Western Region
        </div>
        <div className="absolute left-[54%] top-[20%] text-[10px] uppercase tracking-widest font-black text-white/30 pointer-events-none">
          Northern / Tamale
        </div>

        {/* ── Interactive Event Pins ── */}
        {filteredEvents.map((ev) => {
          const isSelected = activeEvent?.id === ev.id;
          const { x, y } = ev.coords;

          return (
            <div
              key={ev.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <button
                onClick={() => setActiveEvent(isSelected ? null : ev)}
                className="relative group focus:outline-none"
              >
                {/* Ping wave animation for active/hovered pin */}
                {isSelected && (
                  <span className="absolute -inset-2 rounded-full bg-[#b21414]/40 animate-ping" />
                )}

                {/* Pin Button */}
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border transition-all ${
                    isSelected
                      ? 'bg-[#b21414] border-white text-white scale-110 shadow-red-900/50'
                      : 'bg-[#1C232B] hover:bg-[#242B32] border-white/20 text-white'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#b21414]'}`} />
                  <span className="text-[11px] font-bold tracking-tight">
                    {ev.priceLabel}
                  </span>
                </motion.div>
              </button>
            </div>
          );
        })}

        {/* ── Active Event Card Drawer / Popup ── */}
        <AnimatePresence>
          {activeEvent && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30"
            >
              <div className="bg-[#171A1D]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl overflow-hidden">
                <div className="flex items-start gap-4">
                  {/* Event Thumbnail */}
                  <div className="w-20 h-20 rounded-2xl bg-[#1C232B] overflow-hidden shrink-0 border border-white/10">
                    <img
                      src={activeEvent.image || activeEvent.banner_image || 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg'}
                      alt={activeEvent.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#b21414]">
                        {activeEvent.category || 'Live Event'}
                      </span>
                      <button
                        onClick={() => setActiveEvent(null)}
                        className="text-[#949599] hover:text-white p-1 rounded-full hover:bg-white/5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate mb-1" title={activeEvent.title}>
                      {activeEvent.title}
                    </h4>

                    <p className="text-xs text-[#949599] flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-[#b21414] shrink-0" />
                      <span className="truncate">{activeEvent.venue || activeEvent.location || 'Venue TBA'}</span>
                    </p>

                    <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#b21414] shrink-0" />
                      <span>
                        {activeEvent.start_date || activeEvent.startDate
                          ? new Date(activeEvent.start_date || activeEvent.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Upcoming'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer CTAs */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#949599] uppercase tracking-wider block">Tickets From</span>
                    <span className="text-sm font-extrabold text-white">{activeEvent.priceLabel}</span>
                  </div>

                  <Link
                    to={`/events/${activeEvent.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b21414] hover:bg-[#911010] text-white text-xs font-bold transition shadow-md"
                  >
                    <span>Get Tickets</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty Filter State Notice ── */}
        {filteredEvents.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-[#1C232B] border border-white/10 flex items-center justify-center text-[#949599] mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">No Events Found in {selectedCity}</p>
            <p className="text-xs text-[#949599] max-w-xs mb-4">
              Try selecting "All Cities" or choose another destination to see available events.
            </p>
            <button
              onClick={() => setSelectedCity('All Cities')}
              className="pointer-events-auto px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold border border-white/10 transition"
            >
              Show All Cities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
