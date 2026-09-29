import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin, Calendar, Tag, ArrowRight, X, ExternalLink,
  Compass, Navigation, Layers, Maximize2, Locate, RefreshCw,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
  '';

// Known centroids for major event cities in Ghana
const CITY_CENTROIDS = {
  Accra: { lng: -0.1870, lat: 5.6037, zoom: 11.5 },
  Kumasi: { lng: -1.6244, lat: 6.6885, zoom: 11.5 },
  Takoradi: { lng: -1.7554, lat: 4.8874, zoom: 12 },
  Tema: { lng: -0.0166, lat: 5.6698, zoom: 12 },
  'Cape Coast': { lng: -1.2795, lat: 5.1315, zoom: 12 },
  Tamale: { lng: -0.8393, lat: 9.4008, zoom: 11.5 },
  Koforidua: { lng: -0.2588, lat: 6.0784, zoom: 12 },
  Sunyani: { lng: -2.3268, lat: 7.3399, zoom: 12 },
  Ho: { lng: 0.4713, lat: 6.6111, zoom: 12 },
};

const CITY_PILLS = ['All Cities', 'Accra', 'Kumasi', 'Takoradi', 'Tema', 'Cape Coast', 'Tamale'];

const GHANA_CENTER = { lng: -1.0232, lat: 7.9465, zoom: 6.2 };

export default function EventDiscoveryMap({ events = [] }) {
  const { format } = useCurrency();
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [activeEvent, setActiveEvent] = useState(null);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'satellite'
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Map each event to concrete GPS coordinates
  const mappedEvents = useMemo(() => {
    return events.map((ev, idx) => {
      let lng = null;
      let lat = null;
      let resolvedCity = ev.city || 'Accra';

      // 1. Direct coordinates
      if (ev.longitude != null && ev.latitude != null) {
        lng = parseFloat(ev.longitude);
        lat = parseFloat(ev.latitude);
      } else if (ev.gps_location) {
        const parts = ev.gps_location.split(',').map((p) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          // If first number is lat (Ghana is ~4.5 - 11 lat, -3 to 1 lng)
          if (parts[0] > parts[1]) {
            lat = parts[0];
            lng = parts[1];
          } else {
            lng = parts[0];
            lat = parts[1];
          }
        }
      }

      // 2. City fallback if coordinates are missing or invalid
      if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) {
        const matchedCity = Object.keys(CITY_CENTROIDS).find(
          (c) =>
            ev.city?.toLowerCase() === c.toLowerCase() ||
            ev.venue?.toLowerCase().includes(c.toLowerCase()) ||
            ev.address?.toLowerCase().includes(c.toLowerCase())
        );

        const base = matchedCity ? CITY_CENTROIDS[matchedCity] : CITY_CENTROIDS.Accra;
        resolvedCity = matchedCity || 'Accra';

        // Add subtle deterministic jitter so events in the same city cluster don't stack exactly on top
        const seed = Number(ev.id || idx) * 31;
        const offsetLng = (((seed % 17) - 8) / 1000) * 1.5;
        const offsetLat = ((((seed * 7) % 17) - 8) / 1000) * 1.5;
        lng = base.lng + offsetLng;
        lat = base.lat + offsetLat;
      }

      const minPrice = ev.minPrice ?? ev.min_price ?? ev.price;
      const priceLabel = minPrice != null ? (Number(minPrice) === 0 ? 'Free' : format(minPrice)) : 'Tickets';

      return {
        ...ev,
        resolvedCity,
        coordinates: [lng, lat],
        priceLabel,
      };
    });
  }, [events, format]);

  // Filter events based on active city chip
  const filteredEvents = useMemo(() => {
    if (selectedCity === 'All Cities') return mappedEvents;
    return mappedEvents.filter(
      (ev) => (ev.city || ev.resolvedCity)?.toLowerCase() === selectedCity.toLowerCase()
    );
  }, [mappedEvents, selectedCity]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const styleUrl =
      mapStyle === 'satellite'
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/dark-v11';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [GHANA_CENTER.lng, GHANA_CENTER.lat],
      zoom: GHANA_CENTER.zoom,
      pitch: 35,
      antialias: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [mapStyle]);

  // Update Markers whenever filteredEvents, mapLoaded, or activeEvent changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for filtered events
    filteredEvents.forEach((ev) => {
      const isSelected = activeEvent?.id === ev.id;

      const el = document.createElement('div');
      el.className = 'mapbox-custom-event-marker';
      el.style.cursor = 'pointer';

      // Custom marker inner styling
      el.innerHTML = `
        <div style="
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 9999px;
          background: ${isSelected ? '#b21414' : '#1C232B'};
          color: #ffffff;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          border: 1.5px solid ${isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'};
          transition: all 0.2s ease-in-out;
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
          z-index: ${isSelected ? 20 : 1};
        ">
          ${isSelected ? '<span style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(178,20,20,0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; z-index: -1;"></span>' : ''}
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${isSelected ? '#ffffff' : '#b21414'};"></span>
          <span>${ev.priceLabel}</span>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setActiveEvent(ev);
        map.flyTo({
          center: ev.coordinates,
          zoom: Math.max(map.getZoom(), 13),
          duration: 1000,
          essential: true,
        });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(ev.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [filteredEvents, activeEvent, mapLoaded]);

  // Handle City Selector navigation
  const handleSelectCity = useCallback((city) => {
    setSelectedCity(city);
    setActiveEvent(null);

    const map = mapRef.current;
    if (!map) return;

    if (city === 'All Cities') {
      if (mappedEvents.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        mappedEvents.forEach((e) => bounds.extend(e.coordinates));
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 1200 });
      } else {
        map.flyTo({ center: [GHANA_CENTER.lng, GHANA_CENTER.lat], zoom: GHANA_CENTER.zoom, duration: 1200 });
      }
    } else if (CITY_CENTROIDS[city]) {
      const c = CITY_CENTROIDS[city];
      map.flyTo({ center: [c.lng, c.lat], zoom: c.zoom, pitch: 45, duration: 1400 });
    }
  }, [mappedEvents]);

  // Geolocate user and find nearby events
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocatingUser(false);

        const map = mapRef.current;
        if (map) {
          map.flyTo({
            center: [longitude, latitude],
            zoom: 13,
            pitch: 45,
            duration: 1500,
          });

          const userEl = document.createElement('div');
          userEl.innerHTML = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: ping 1.5s infinite;"></div>
              <div style="width: 16px; height: 16px; border-radius: 50%; background: #3B82F6; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>
            </div>
          `;
          new mapboxgl.Marker({ element: userEl, anchor: 'center' })
            .setLngLat([longitude, latitude])
            .addTo(map);
        }
      },
      (err) => {
        console.warn('Geolocation failed:', err);
        setLocatingUser(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#161D22] border border-white/10 shadow-2xl">
      {/* ── Top Bar: City Selector, Map Layers & Status ── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 shadow-xl overflow-x-auto no-scrollbar pointer-events-auto">
          {CITY_PILLS.map((city) => {
            const count =
              city === 'All Cities'
                ? mappedEvents.length
                : mappedEvents.filter(
                    (e) => (e.city || e.resolvedCity)?.toLowerCase() === city.toLowerCase()
                  ).length;

            return (
              <button
                key={city}
                type="button"
                onClick={() => handleSelectCity(city)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCity === city
                    ? 'bg-[#b21414] text-white shadow-md'
                    : 'text-[#949599] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{city}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCity === city ? 'bg-black/30 text-white' : 'bg-white/5 text-[#949599]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Style Switcher, Locate Me & Count */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Style Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 text-xs shadow-xl">
            <button
              type="button"
              onClick={() => setMapStyle('dark')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition-all ${
                mapStyle === 'dark'
                  ? 'bg-[#b21414] text-white shadow-sm'
                  : 'text-[#949599] hover:text-white'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              className={`px-2.5 py-1 rounded-xl font-semibold transition-all ${
                mapStyle === 'satellite'
                  ? 'bg-[#b21414] text-white shadow-sm'
                  : 'text-[#949599] hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Locate Me Button */}
          <button
            type="button"
            onClick={handleLocateUser}
            disabled={locatingUser}
            title="Find events near me"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#111417]/90 hover:bg-[#1C232B] backdrop-blur-xl border border-white/10 text-xs font-semibold text-white shadow-xl transition active:scale-95 disabled:opacity-50"
          >
            <Locate className={`w-3.5 h-3.5 text-blue-400 ${locatingUser ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Near Me</span>
          </button>

          {/* Total Counter Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#111417]/90 backdrop-blur-xl border border-white/10 text-xs text-[#949599] shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-medium">{filteredEvents.length}</span> Events
          </div>
        </div>
      </div>

      {/* ── Mapbox Container Canvas ── */}
      <div className="relative w-full h-[540px] sm:h-[620px] bg-[#111417] overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Loading State */}
        {!mapLoaded && (
          <div className="absolute inset-0 bg-[#111417] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-[#949599]">
              <div className="w-8 h-8 border-2 border-[#b21414] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Initializing Mapbox discovery map...</span>
            </div>
          </div>
        )}

        {/* ── Active Event Card Drawer / Popup ── */}
        <AnimatePresence>
          {activeEvent && (
            <motion.div
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[400px] z-30"
            >
              <div className="bg-[#171A1D]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-2xl overflow-hidden">
                <div className="flex items-start gap-3.5">
                  {/* Event Thumbnail */}
                  <div className="w-20 h-20 rounded-2xl bg-[#1C232B] overflow-hidden shrink-0 border border-white/10 relative">
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
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider">
                      {activeEvent.category || 'Live'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#b21414] truncate">
                        {activeEvent.city || activeEvent.resolvedCity || 'Ghana'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveEvent(null)}
                        className="text-[#949599] hover:text-white p-1 rounded-full hover:bg-white/5 transition"
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
                          ? new Date(activeEvent.start_date || activeEvent.startDate).toLocaleDateString(
                              'en-US',
                              { month: 'short', day: 'numeric', year: 'numeric' }
                            )
                          : 'Upcoming'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Footer CTAs */}
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#949599] uppercase tracking-wider block">Tickets From</span>
                    <span className="text-sm font-extrabold text-white">{activeEvent.priceLabel}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${activeEvent.venue || ''} ${activeEvent.city || ''} Ghana`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Maps"
                      className="p-2 rounded-xl bg-[#242B32] hover:bg-[#2d363e] border border-white/10 text-white transition active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#949599] hover:text-white" />
                    </a>

                    <Link
                      to={`/events/${activeEvent.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b21414] hover:bg-[#911010] text-white text-xs font-bold transition shadow-md active:scale-95"
                    >
                      <span>Get Tickets</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty Filter State Notice ── */}
        {filteredEvents.length === 0 && mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-[#1C232B] border border-white/10 flex items-center justify-center text-[#949599] mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">No Events Found in {selectedCity}</p>
            <p className="text-xs text-[#949599] max-w-xs mb-4">
              Try selecting "All Cities" or choose another destination to see available events.
            </p>
            <button
              type="button"
              onClick={() => handleSelectCity('All Cities')}
              className="pointer-events-auto px-4 py-1.5 rounded-xl bg-[#b21414] hover:bg-[#911010] text-xs text-white font-semibold shadow-md transition cursor-pointer"
            >
              Show All Cities
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
