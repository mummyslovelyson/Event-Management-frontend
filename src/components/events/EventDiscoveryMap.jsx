import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin, Calendar, Tag, ArrowRight, X, ExternalLink,
  Compass, Navigation, DollarSign, Layers, Eye, Ticket,
  Maximize2, RotateCcw, AlertCircle, KeyRound, Check
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

// City GPS Coordinates & Default Views for Ghana Hubs
const CITY_COORDINATES = {
  Accra: { lat: 5.6037, lng: -0.1870, zoom: 12 },
  Kumasi: { lat: 6.6885, lng: -1.6244, zoom: 12 },
  Takoradi: { lat: 4.8874, lng: -1.7554, zoom: 12 },
  Tema: { lat: 5.6698, lng: -0.0166, zoom: 12 },
  'Cape Coast': { lat: 5.1315, lng: -1.2795, zoom: 12 },
  Tamale: { lat: 9.4008, lng: -0.8393, zoom: 12 },
  Koforidua: { lat: 6.0784, lng: -0.2588, zoom: 12 },
  Sunyani: { lat: 7.3399, lng: -2.3268, zoom: 12 },
};

const GHANA_CENTER = { lng: -1.0232, lat: 7.9465, zoom: 6.4 };

const CITY_PILLS = ['All Cities', 'Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast', 'Tamale'];

const MAP_STYLES = {
  dark: {
    id: 'dark',
    label: 'Dark Mode',
    url: 'mapbox://styles/mapbox/dark-v11',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
  streets: {
    id: 'streets',
    label: 'Streets',
    url: 'mapbox://styles/mapbox/navigation-night-v1',
  },
};

export default function EventDiscoveryMap({ events = [] }) {
  const { format } = useCurrency();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Token management: check env first, allow runtime fallback input
  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const [userToken, setUserToken] = useState(() => {
    return localStorage.getItem('tc_mapbox_token') || (envToken && envToken !== 'your_mapbox_access_token' ? envToken : '');
  });
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState(null);

  const activeToken = userToken || (envToken && envToken !== 'your_mapbox_access_token' ? envToken : '');

  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [activeEvent, setActiveEvent] = useState(null);
  const [currentStyle, setCurrentStyle] = useState('dark');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Map each event to a pin coordinate (using real lat/lng or city fallbacks)
  const mappedEvents = useMemo(() => {
    return events.map((ev, idx) => {
      let lat = null;
      let lng = null;
      let city = 'Accra';

      // 1. Direct coordinates if provided on event object
      if (ev.latitude && ev.longitude) {
        lat = parseFloat(ev.latitude);
        lng = parseFloat(ev.longitude);
      } else if (ev.lat && ev.lng) {
        lat = parseFloat(ev.lat);
        lng = parseFloat(ev.lng);
      }

      // 2. City fallback if coordinates are missing or invalid
      const cityKey = Object.keys(CITY_COORDINATES).find(
        (c) =>
          ev.city?.toLowerCase() === c.toLowerCase() ||
          ev.venue?.toLowerCase().includes(c.toLowerCase()) ||
          ev.location?.toLowerCase().includes(c.toLowerCase())
      );

      if (cityKey) {
        city = cityKey;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          const base = CITY_COORDINATES[cityKey];
          // Deterministic jitter based on event id or index to prevent exact overlaps
          const seed = Number(ev.id || idx) * 19;
          const jitterLng = ((seed % 13) - 6) * 0.006;
          const jitterLat = (((seed * 7) % 13) - 6) * 0.006;
          lat = base.lat + jitterLat;
          lng = base.lng + jitterLng;
        }
      } else if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        // Fallback to Accra area with deterministic spread
        const seed = Number(ev.id || idx) * 23;
        lat = CITY_COORDINATES.Accra.lat + (((seed * 3) % 11) - 5) * 0.007;
        lng = CITY_COORDINATES.Accra.lng + ((seed % 11) - 5) * 0.007;
      }

      const minPrice = ev.minPrice ?? ev.min_price ?? ev.price;
      const priceLabel = minPrice != null ? (Number(minPrice) === 0 ? 'Free' : format(minPrice)) : 'Tickets';

      return {
        ...ev,
        coords: { lat, lng, city },
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

  // Initialize Mapbox instance
  useEffect(() => {
    if (!mapContainerRef.current || !activeToken) return;

    try {
      mapboxgl.accessToken = activeToken;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[currentStyle].url,
        center: [GHANA_CENTER.lng, GHANA_CENTER.lat],
        zoom: GHANA_CENTER.zoom,
        attributionControl: false,
        cooperativeGestures: true, // Clean mobile scroll behavior
      });

      // Add navigation controls styled with dark theme
      const nav = new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      });
      map.addControl(nav, 'bottom-left');

      // Add minimal attribution in bottom right
      map.addControl(
        new mapboxgl.AttributionControl({
          compact: true,
        }),
        'bottom-right'
      );

      map.on('load', () => {
        setMapLoaded(true);
        setTokenError(null);
      });

      map.on('error', (e) => {
        if (e?.error?.status === 401 || e?.error?.message?.includes('access token')) {
          setTokenError('Invalid Mapbox access token. Please check your token key.');
        }
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    } catch (err) {
      console.error('Failed to initialize Mapbox:', err);
      setTokenError(err.message || 'Mapbox initialization failed');
    }
  }, [activeToken]);

  // Handle map style changes
  useEffect(() => {
    if (mapRef.current && mapLoaded) {
      mapRef.current.setStyle(MAP_STYLES[currentStyle].url);
    }
  }, [currentStyle, mapLoaded]);

  // Sync Markers with Mapbox
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers for filtered events
    filteredEvents.forEach((ev) => {
      const { lng, lat } = ev.coords;
      if (!lng || !lat || isNaN(lng) || isNaN(lat)) return;

      const isSelected = activeEvent?.id === ev.id;

      // Custom marker container matching the brand color palette (#b21414, #1C232B, #242B32)
      const el = document.createElement('div');
      el.className = 'tc-mapbox-marker-wrapper relative cursor-pointer group';

      el.innerHTML = `
        <div class="tc-marker-inner relative transition-transform duration-200 ${
          isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-10'
        }">
          ${
            isSelected
              ? `<span class="absolute -inset-2 rounded-full bg-[#b21414]/40 animate-ping"></span>`
              : ''
          }
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-xl border text-xs font-bold tracking-tight transition-all ${
            isSelected
              ? 'bg-[#b21414] border-white text-white shadow-red-950/60 ring-2 ring-[#b21414]/50'
              : 'bg-[#1C232B] hover:bg-[#242B32] border-white/20 text-[#EFEFF1]'
          }">
            <svg class="w-3.5 h-3.5 ${
              isSelected ? 'text-white' : 'text-[#b21414]'
            }" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>${ev.priceLabel}</span>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setActiveEvent(ev);

        // Center map smoothly on the clicked pin
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: Math.max(mapRef.current.getZoom(), 12.5),
          speed: 1.1,
          curve: 1.2,
          essential: true,
        });
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [filteredEvents, activeEvent, mapLoaded]);

  // Handle flyTo when selected city changes
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setActiveEvent(null);

    if (!mapRef.current) return;

    if (city === 'All Cities') {
      mapRef.current.flyTo({
        center: [GHANA_CENTER.lng, GHANA_CENTER.lat],
        zoom: GHANA_CENTER.zoom,
        speed: 1.1,
        essential: true,
      });
    } else if (CITY_COORDINATES[city]) {
      const { lng, lat, zoom } = CITY_COORDINATES[city];
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: zoom || 12,
        speed: 1.2,
        essential: true,
      });
    }
  };

  // Recenter map back to Ghana overview
  const handleResetBounds = () => {
    setSelectedCity('All Cities');
    setActiveEvent(null);
    mapRef.current?.flyTo({
      center: [GHANA_CENTER.lng, GHANA_CENTER.lat],
      zoom: GHANA_CENTER.zoom,
      speed: 1.2,
      essential: true,
    });
  };

  const handleSaveRuntimeToken = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    localStorage.setItem('tc_mapbox_token', tokenInput.trim());
    setUserToken(tokenInput.trim());
    setTokenError(null);
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#161D22] border border-[#262B2F] shadow-2xl">
      {/* ── Top Bar: City Selector & Controls ── */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pointer-events-none">
        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 shadow-xl overflow-x-auto no-scrollbar pointer-events-auto touch-pan-x max-w-full">
          {CITY_PILLS.map((city) => {
            const count =
              city === 'All Cities'
                ? mappedEvents.length
                : mappedEvents.filter(
                    (e) => e.coords.city.toLowerCase() === city.toLowerCase()
                  ).length;

            return (
              <button
                key={city}
                onClick={() => handleCitySelect(city)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedCity === city
                    ? 'bg-[#b21414] text-white shadow-md shadow-red-950/40'
                    : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-white/5'
                }`}
              >
                <span>{city}</span>
                <span
                  className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCity === city
                      ? 'bg-black/30 text-white'
                      : 'bg-white/5 text-[#949599]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Action Tools: Event Count & Style Switcher & Recenter */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Recenter Button */}
          <button
            onClick={handleResetBounds}
            className="p-1.5 sm:p-2 rounded-xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 text-[#949599] hover:text-white hover:bg-white/10 transition shadow-xl"
            title="Recenter Ghana Overview"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Style Selector */}
          <div className="relative">
            <button
              onClick={() => setShowStyleMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 text-[11px] sm:text-xs text-[#EFEFF1] hover:bg-white/10 transition shadow-xl"
              title="Map Style"
            >
              <Layers className="w-3.5 h-3.5 text-[#b21414]" />
              <span className="capitalize">{MAP_STYLES[currentStyle].label}</span>
            </button>

            <AnimatePresence>
              {showStyleMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-36 rounded-2xl bg-[#171A1D] border border-[#262B2F] shadow-2xl p-1.5 z-40"
                >
                  {Object.values(MAP_STYLES).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setCurrentStyle(s.id);
                        setShowStyleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition ${
                        currentStyle === s.id
                          ? 'bg-[#b21414] text-white'
                          : 'text-[#949599] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{s.label}</span>
                      {currentStyle === s.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Events Count Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 text-[11px] sm:text-xs text-[#949599] shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-[#EFEFF1]">{filteredEvents.length}</span>
            <span className="hidden xs:inline sm:inline">Live Pins</span>
          </div>
        </div>
      </div>

      {/* ── Mapbox Canvas Container ── */}
      <div className="relative w-full h-[460px] sm:h-[620px] bg-[#111417] overflow-hidden select-none">
        {/* Mapbox Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Mobile touch hint indicator */}
        <div className="sm:hidden absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-[#CBD5E1] border border-white/10">
            Use 2 fingers to navigate map
          </span>
        </div>

        {/* ── Missing Token / Auth Warning Overlay ── */}
        {(!activeToken || tokenError) && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#161D22]/95 backdrop-blur-md text-center">
            <div className="max-w-md w-full bg-[#1C232B] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-left">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#b21414]/15 border border-[#b21414]/30 flex items-center justify-center text-[#b21414] mb-3 sm:mb-4">
                <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mb-1.5">
                Mapbox Access Token Required
              </h3>
              <p className="text-xs text-[#949599] leading-relaxed mb-4">
                {tokenError ||
                  'To render live satellite & street tiles with full interactivity, enter your Mapbox public token or add VITE_MAPBOX_ACCESS_TOKEN to your .env file.'}
              </p>

              <form onSubmit={handleSaveRuntimeToken} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#CBD5E1] block mb-1">
                    Paste Mapbox Access Token (pk.ey...)
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSI..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#262B2F] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-[#b21414] transition"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#b21414] hover:bg-[#911010] text-white text-xs font-bold transition shadow-md"
                  >
                    Activate Live Map
                  </button>
                  <a
                    href="https://account.mapbox.com/access-tokens/"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition flex items-center gap-1.5"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Active Event Card Drawer / Popup ── */}
        <AnimatePresence>
          {activeEvent && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-auto sm:right-6 sm:w-96 z-30"
            >
              <div className="bg-[#171A1D]/95 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl overflow-hidden">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Event Thumbnail */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#1C232B] overflow-hidden shrink-0 border border-white/10">
                    <img
                      src={
                        activeEvent.image ||
                        activeEvent.banner_image ||
                        activeEvent.bannerImage ||
                        'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg'
                      }
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
                        className="text-[#949599] hover:text-white p-1 rounded-full hover:bg-white/5 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <h4
                      className="text-xs sm:text-sm font-bold text-white truncate mb-1"
                      title={activeEvent.title}
                    >
                      {activeEvent.title}
                    </h4>

                    <p className="text-[11px] sm:text-xs text-[#949599] flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 text-[#b21414] shrink-0" />
                      <span className="truncate">
                        {activeEvent.venue || activeEvent.location || 'Venue TBA'}
                      </span>
                    </p>

                    <p className="text-[11px] sm:text-xs text-[#949599] flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-[#b21414] shrink-0" />
                      <span>
                        {activeEvent.start_date || activeEvent.startDate
                          ? new Date(
                              activeEvent.start_date || activeEvent.startDate
                            ).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Upcoming'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer CTAs */}
                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[9px] sm:text-[10px] text-[#949599] uppercase tracking-wider block">
                      Tickets From
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      {activeEvent.priceLabel}
                    </span>
                  </div>

                  <Link
                    to={`/events/${activeEvent.id}`}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#b21414] hover:bg-[#911010] text-white text-xs font-bold transition shadow-md shadow-red-950/40"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-20">
            <div className="w-12 h-12 rounded-2xl bg-[#1C232B] border border-white/10 flex items-center justify-center text-[#949599] mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">
              No Events Found in {selectedCity}
            </p>
            <p className="text-xs text-[#949599] max-w-xs mb-4">
              Try selecting "All Cities" or choose another destination to see available events.
            </p>
            <button
              onClick={() => handleCitySelect('All Cities')}
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
