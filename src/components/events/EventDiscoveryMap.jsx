import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin, Calendar, ArrowRight, X,
  Compass, Layers, RotateCcw,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

// City GPS Coordinates & Viewbox Bounds for Ghana Hubs
const CITY_COORDINATES = {
  Accra: { lat: 5.6037, lng: -0.1870, zoom: 12, x: 74, y: 76 },
  Kumasi: { lat: 6.6885, lng: -1.6244, zoom: 12, x: 46, y: 55 },
  Takoradi: { lat: 4.8874, lng: -1.7554, zoom: 12, x: 38, y: 88 },
  Tema: { lat: 5.6698, lng: -0.0166, zoom: 12, x: 79, y: 74 },
  'Cape Coast': { lat: 5.1315, lng: -1.2795, zoom: 12, x: 50, y: 84 },
  Tamale: { lat: 9.4008, lng: -0.8393, zoom: 12, x: 60, y: 22 },
  Koforidua: { lat: 6.0784, lng: -0.2588, zoom: 12, x: 71, y: 68 },
  Sunyani: { lat: 7.3399, lng: -2.3268, zoom: 12, x: 32, y: 45 },
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

  // Check if Mapbox token is provided in environment variables
  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const hasMapboxToken = Boolean(
    envToken &&
    envToken.trim() !== '' &&
    envToken !== 'your_mapbox_access_token' &&
    envToken.startsWith('pk.')
  );

  const [mapError, setMapError] = useState(false);
  const isLiveMap = hasMapboxToken && !mapError;

  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [activeEvent, setActiveEvent] = useState(null);
  const [currentStyle, setCurrentStyle] = useState('dark');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Map each event to both GPS (lat/lng) and 2D percentage (x/y) coordinates
  const mappedEvents = useMemo(() => {
    return events.map((ev, idx) => {
      let lat = null;
      let lng = null;
      let city = 'Accra';

      // 1. Direct GPS coordinates if provided on event object
      if (ev.latitude && ev.longitude) {
        lat = parseFloat(ev.latitude);
        lng = parseFloat(ev.longitude);
      } else if (ev.lat && ev.lng) {
        lat = parseFloat(ev.lat);
        lng = parseFloat(ev.lng);
      }

      // 2. City matching
      const cityKey = Object.keys(CITY_COORDINATES).find(
        (c) =>
          ev.city?.toLowerCase() === c.toLowerCase() ||
          ev.venue?.toLowerCase().includes(c.toLowerCase()) ||
          ev.location?.toLowerCase().includes(c.toLowerCase())
      );

      const base = cityKey ? CITY_COORDINATES[cityKey] : CITY_COORDINATES.Accra;
      if (cityKey) city = cityKey;

      // Deterministic spread to prevent overlapping pins
      const seed = Number(ev.id || idx) * 19;
      const jitterLng = ((seed % 13) - 6) * 0.007;
      const jitterLat = (((seed * 7) % 13) - 6) * 0.007;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        lat = base.lat + jitterLat;
        lng = base.lng + jitterLng;
      }

      // 2D percentage coordinates for mockup radar view
      const offsetX = ((seed % 11) - 5) * 1.5;
      const offsetY = (((seed * 7) % 11) - 5) * 1.5;
      const x = Math.max(12, Math.min(88, base.x + offsetX));
      const y = Math.max(12, Math.min(88, base.y + offsetY));

      const minPrice = ev.minPrice ?? ev.min_price ?? ev.price;
      const priceLabel = minPrice != null ? (Number(minPrice) === 0 ? 'Free' : format(minPrice)) : 'Tickets';

      return {
        ...ev,
        coords: { lat, lng, x, y, city },
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

  // Initialize Mapbox instance only if token is valid and no error
  useEffect(() => {
    if (!isLiveMap || !mapContainerRef.current) return;

    try {
      mapboxgl.accessToken = envToken;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[currentStyle].url,
        center: [GHANA_CENTER.lng, GHANA_CENTER.lat],
        zoom: GHANA_CENTER.zoom,
        attributionControl: false,
        cooperativeGestures: true,
      });

      const nav = new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      });
      map.addControl(nav, 'bottom-left');

      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-right'
      );

      map.on('load', () => {
        setMapLoaded(true);
        setMapError(false);
      });

      map.on('error', (e) => {
        if (e?.error?.status === 401 || e?.error?.message?.includes('access token')) {
          console.warn('Mapbox auth error, falling back to radar view');
          setMapError(true);
        }
      });

      mapRef.current = map;

      return () => {
        map.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    } catch (err) {
      console.warn('Failed to initialize Mapbox, falling back to radar view:', err);
      setMapError(true);
    }
  }, [isLiveMap, envToken]);

  // Handle map style changes in Mapbox mode
  useEffect(() => {
    if (mapRef.current && mapLoaded && isLiveMap) {
      mapRef.current.setStyle(MAP_STYLES[currentStyle].url);
    }
  }, [currentStyle, mapLoaded, isLiveMap]);

  // Sync Markers with Mapbox
  useEffect(() => {
    if (!isLiveMap || !mapRef.current || !mapLoaded) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filteredEvents.forEach((ev) => {
      const { lng, lat } = ev.coords;
      if (!lng || !lat || isNaN(lng) || isNaN(lat)) return;

      const isSelected = activeEvent?.id === ev.id;

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
  }, [filteredEvents, activeEvent, mapLoaded, isLiveMap]);

  // Handle city select
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setActiveEvent(null);

    if (isLiveMap && mapRef.current) {
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
    }
  };

  // Recenter map / reset city
  const handleResetBounds = () => {
    setSelectedCity('All Cities');
    setActiveEvent(null);

    if (isLiveMap && mapRef.current) {
      mapRef.current.flyTo({
        center: [GHANA_CENTER.lng, GHANA_CENTER.lat],
        zoom: GHANA_CENTER.zoom,
        speed: 1.2,
        essential: true,
      });
    }
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

          {/* Style Selector (Only shown in Live Map mode) */}
          {isLiveMap && (
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
                    className="absolute right-0 mt-2 w-36 rounded-xl bg-[#171A1D]/95 backdrop-blur-xl border border-white/15 p-1 shadow-2xl z-40"
                  >
                    {Object.values(MAP_STYLES).map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setCurrentStyle(st.id);
                          setShowStyleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                          currentStyle === st.id
                            ? 'bg-[#b21414] text-white font-semibold'
                            : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>{st.label}</span>
                        {currentStyle === st.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Live Pins Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 text-[11px] sm:text-xs text-[#949599] shadow-xl whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-[#EFEFF1]">{filteredEvents.length}</span>
            <span className="hidden xs:inline sm:inline">Live Pins</span>
          </div>
        </div>
      </div>

      {/* ── Map Canvas Area (Live Mapbox or Stylized Radar Mockup) ── */}
      <div className="relative w-full h-[460px] sm:h-[620px] bg-[#111417] overflow-hidden select-none">
        {isLiveMap ? (
          <>
            {/* Live Mapbox Container */}
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Mobile touch hint indicator */}
            <div className="sm:hidden absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none z-10">
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-[#CBD5E1] border border-white/10">
                Use 2 fingers to navigate map
              </span>
            </div>
          </>
        ) : (
          <>
            {/* ── Stylized Interactive Ghana Radar Mockup ── */}
            {/* Radar glow sweep animation */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full border border-white/5 animate-pulse" />
              <div className="absolute w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] rounded-full border border-[#b21414]/10" />
              <div className="absolute w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] rounded-full border border-white/5" />
            </div>

            {/* Subtle Grid Lines Overlay */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                backgroundSize: '48px 48px',
              }}
            />

            {/* Stylized Ghana Country Silhouette SVG Outline */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-25"
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

            {/* Regional Labels */}
            <div className="absolute left-[70%] top-[78%] text-[10px] uppercase tracking-widest font-black text-white/30 pointer-events-none">
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

            {/* ── Interactive Event Pins for Mockup ── */}
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
                    className="relative group focus:outline-none cursor-pointer"
                  >
                    {/* Ping wave animation for active pin */}
                    {isSelected && (
                      <span className="absolute -inset-2 rounded-full bg-[#b21414]/40 animate-ping" />
                    )}

                    {/* Pin Button */}
                    <motion.div
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border transition-all ${
                        isSelected
                          ? 'bg-[#b21414] border-white text-white scale-110 shadow-red-950/60 ring-2 ring-[#b21414]/50'
                          : 'bg-[#1C232B] hover:bg-[#242B32] border-white/20 text-[#EFEFF1]'
                      }`}
                    >
                      <MapPin
                        className={`w-3.5 h-3.5 ${
                          isSelected ? 'text-white' : 'text-[#b21414]'
                        }`}
                      />
                      <span className="text-[11px] font-bold tracking-tight">
                        {ev.priceLabel}
                      </span>
                    </motion.div>
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* ── Active Event Card Drawer / Popup (Shared by both modes) ── */}
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
                        className="text-[#949599] hover:text-white p-1 rounded-full hover:bg-white/5 transition cursor-pointer"
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
              className="pointer-events-auto px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold border border-white/10 transition cursor-pointer"
            >
              Show All Cities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
