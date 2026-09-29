import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin, Navigation, Copy, Check, ExternalLink,
  Compass, Maximize2, AlertCircle, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
  '';

// Known centroids for cities in Ghana & West Africa
const CITY_CENTROIDS = {
  accra: [-0.1870, 5.6037],
  kumasi: [-1.6244, 6.6885],
  takoradi: [-1.7554, 4.8874],
  sekondi: [-1.7142, 4.9340],
  tema: [-0.0166, 5.6698],
  'cape coast': [-1.2795, 5.1315],
  tamale: [-0.8393, 9.4008],
  koforidua: [-0.2588, 6.0784],
  sunyani: [-2.3268, 7.3399],
  ho: [0.4713, 6.6111],
  bolgatanga: [-0.8553, 10.7876],
  wa: [-2.5019, 10.0601],
  techiman: [-1.9427, 7.5815],
  lagos: [3.3792, 6.5244],
  abuja: [7.3986, 9.0765],
  nairobi: [36.8219, -1.2921],
  london: [-0.1276, 51.5074],
};

export default function EventLocationMap({ event }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' | 'satellite'

  const venueName = event?.venue || event?.location || 'Venue TBA';
  const address = event?.address || '';
  const city = event?.city || '';
  const country = event?.country || 'Ghana';

  // Determine initial coordinates from event data
  const coordinates = useMemo(() => {
    // 1. Direct latitude & longitude fields
    if (event?.longitude != null && event?.latitude != null) {
      const lng = parseFloat(event.longitude);
      const lat = parseFloat(event.latitude);
      if (!isNaN(lng) && !isNaN(lat)) return [lng, lat];
    }

    // 2. gps_location string (e.g. "5.6037, -0.1870" or "-0.1870, 5.6037")
    if (event?.gps_location) {
      const parts = event.gps_location.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // Standard convention: if first number is around 4-11 and second around -3 to 1, first is lat
        if (Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180) {
          if (parts[0] < parts[1]) {
            return [parts[0], parts[1]]; // [lng, lat]
          }
          return [parts[1], parts[0]]; // [lng, lat]
        }
      }
    }

    // 3. Known city match
    const normalizedCity = (city || venueName).toLowerCase().trim();
    for (const [key, coords] of Object.entries(CITY_CENTROIDS)) {
      if (normalizedCity.includes(key)) {
        return coords;
      }
    }

    // Default: Accra City Center
    return CITY_CENTROIDS.accra;
  }, [event, city, venueName]);

  // Construct directions URLs
  const encodedQuery = encodeURIComponent(
    [venueName, address, city, country].filter(Boolean).join(', ')
  );
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodedQuery}&ll=${coordinates[1]},${coordinates[0]}`;

  const copyAddress = async () => {
    const fullText = [venueName, address, city, country].filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox access token is not configured.');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const styleUrl =
        mapStyle === 'satellite'
          ? 'mapbox://styles/mapbox/satellite-streets-v12'
          : 'mapbox://styles/mapbox/dark-v11';

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: coordinates,
        zoom: 14.5,
        pitch: 40,
        bearing: -10,
        antialias: true,
        attributionControl: false,
      });

      // Controls
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
      map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.on('load', () => {
        setMapLoaded(true);

        // Custom pulsed marker element
        const el = document.createElement('div');
        el.className = 'custom-venue-marker';
        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(178, 20, 20, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #b21414 0%, #e52e2e 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(178, 20, 20, 0.6); border: 2.5px solid #ffffff;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
        `;

        // Popup with event info
        const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, className: 'mapbox-dark-popup' })
          .setHTML(`
            <div style="padding: 10px; min-width: 180px; font-family: inherit;">
              <div style="font-weight: 700; font-size: 13px; color: #FFFFFF; margin-bottom: 2px;">${venueName}</div>
              <div style="font-size: 11px; color: #949599;">${address || city || country}</div>
            </div>
          `);

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coordinates)
          .setPopup(popup)
          .addTo(map);

        markerRef.current = marker;

        // Try geocoding more precise coordinates if only text was known and no exact lat/lng
        if (
          !event?.latitude &&
          !event?.gps_location &&
          (address || venueName) &&
          MAPBOX_TOKEN
        ) {
          const query = [venueName, address, city, country].filter(Boolean).join(', ');
          fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=gh&limit=1`
          )
            .then((res) => res.json())
            .then((data) => {
              if (data?.features?.[0]?.center) {
                const [geocodedLng, geocodedLat] = data.features[0].center;
                marker.setLngLat([geocodedLng, geocodedLat]);
                map.flyTo({ center: [geocodedLng, geocodedLat], zoom: 15, duration: 1200 });
              }
            })
            .catch(() => {
              // Silently keep default centroid
            });
        }
      });

      map.on('error', (e) => {
        console.warn('[Mapbox error]', e);
      });

      mapRef.current = map;

      return () => {
        map.remove();
      };
    } catch (err) {
      console.error('[Mapbox init failed]', err);
      setMapError('Could not initialize Mapbox map.');
    }
  }, [coordinates, mapStyle, venueName, address, city, country, event]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#EFEFF1] flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#b21414]" />
          Event Location
        </h3>

        {/* Map Style Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#1C232B] border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setMapStyle('dark')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
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
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mapStyle === 'satellite'
                ? 'bg-[#b21414] text-white shadow-sm'
                : 'text-[#949599] hover:text-white'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* Main Map Box */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#262B2F] bg-[#111417] shadow-xl group">
        <div
          ref={mapContainerRef}
          className="w-full h-72 sm:h-96"
          style={{ minHeight: '280px' }}
        />

        {/* Loading overlay */}
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-[#111417]/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2.5 text-xs text-[#949599]">
              <div className="w-4 h-4 border-2 border-[#b21414] border-t-transparent rounded-full animate-spin" />
              <span>Loading venue satellite map...</span>
            </div>
          </div>
        )}

        {/* Error Fallback */}
        {mapError && (
          <div className="absolute inset-0 bg-[#161D22] flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-sm font-semibold text-white mb-1">Map Preview Unavailable</p>
            <p className="text-xs text-[#949599] max-w-sm mb-4">
              We couldn't load the interactive map view. You can still navigate directly using the external map links below.
            </p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b21414] hover:bg-[#911010] text-white text-xs font-bold transition"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Floating Quick Compass / Recenter Button */}
        {mapLoaded && (
          <button
            type="button"
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo({
                  center: coordinates,
                  zoom: 15,
                  pitch: 40,
                  bearing: 0,
                  duration: 1000,
                });
              }
            }}
            title="Recenter Venue"
            className="absolute bottom-3 right-3 z-10 p-2.5 rounded-xl bg-[#111417]/90 hover:bg-[#1C232B] backdrop-blur-md border border-white/15 text-white shadow-lg transition-transform active:scale-95"
          >
            <Compass className="w-4 h-4 text-[#b21414]" />
          </button>
        )}
      </div>

      {/* Venue Address Info & Direction Actions */}
      <div className="rounded-2xl p-4 bg-[#171A1D] border border-[#262B2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
            <span>{venueName}</span>
          </div>
          <p className="text-xs text-[#949599] mt-1 flex items-center gap-1.5 flex-wrap">
            <span>{[address, city, country].filter(Boolean).join(', ') || 'Address information provided by host.'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={copyAddress}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242B32] hover:bg-[#2e3740] border border-white/10 text-xs font-semibold text-white transition active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#949599]" />}
            <span>{copied ? 'Copied' : 'Copy Address'}</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#b21414] hover:bg-[#911010] text-xs font-bold text-white transition shadow-md active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Get Directions</span>
            <ExternalLink className="w-3 h-3 opacity-75" />
          </a>
        </div>
      </div>
    </div>
  );
}
