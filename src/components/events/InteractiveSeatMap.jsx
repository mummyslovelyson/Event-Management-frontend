import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Check, ArrowRight, ShieldCheck,
  Layers, TableProperties,
  Compass,
} from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';

// Standard architectural section blueprints with realistic acoustic & sightline profiles
const SECTION_BLUEPRINTS = [
  {
    id: 'vip_lounge',
    slug: 'vip',
    name: 'VIP Terrace & Tables',
    category: 'VIP Experience',
    color: '#E5A93C', // Warm Champagne Gold
    accentColor: '#F5C862',
    bgTint: 'rgba(229, 169, 60, 0.14)',
    borderStroke: 'rgba(229, 169, 60, 0.55)',
    defaultPrice: 350,
    proximity: '3 – 8m to Stage',
    sightline: 'Direct Elevated Angle (Unobstructed Front Stage)',
    format: 'Reserved Table & Lounge Service',
    entryGate: 'Dedicated VIP East Gate (Fast-Track)',
    defaultPerks: [
      'Fast-track priority entry with dedicated VIP lane',
      'Access to air-conditioned VIP lounge & private cocktail bar',
      'Dedicated table host & premium bottle service options',
      'Elevated terrace view directly facing the performance apron',
      'Private luxury restrooms & commemorative event laminate',
    ],
  },
  {
    id: 'golden_circle',
    slug: 'golden_circle',
    name: 'Golden Circle (Front Pit)',
    category: 'Stage Front Pit',
    color: '#10B981', // Electric Emerald
    accentColor: '#34D399',
    bgTint: 'rgba(16, 185, 129, 0.14)',
    borderStroke: 'rgba(16, 185, 129, 0.55)',
    defaultPrice: 180,
    proximity: '1 – 10m to Center Stage',
    sightline: 'Direct Stage Front (High Energy Pit)',
    format: 'Standing Floor • Immediate Stage Proximity',
    entryGate: 'Express Pit Access via Gate 2',
    defaultPerks: [
      'Immediate front-of-stage access inside the barrier perimeter',
      'Unmatched proximity to headliners and visual production',
      'Complimentary welcome beverage token upon entry',
      'Exclusive Golden Circle wristband & early floor access',
    ],
  },
  {
    id: 'general_floor',
    slug: 'general',
    name: 'Main Arena Floor',
    category: 'General Admission',
    color: '#3B82F6', // Royal Steel Blue
    accentColor: '#60A5FA',
    bgTint: 'rgba(59, 130, 246, 0.14)',
    borderStroke: 'rgba(59, 130, 246, 0.5)',
    defaultPrice: 80,
    proximity: '12 – 35m to Stage',
    sightline: 'Panoramic Center Floor View',
    format: 'Open Standing & Dancing Floor',
    entryGate: 'Main Arena Gates 1 & 4',
    defaultPerks: [
      'Full access to the main arena floor and central dance area',
      'Optimal acoustic stereo sound field positioned behind FOH mix',
      'Direct access to food village, merchandise stalls & main bars',
      'High-energy crowd atmosphere with full light & laser coverage',
    ],
  },
  {
    id: 'mezzanine_tier',
    slug: 'balcony',
    name: 'Mezzanine & Tiered Suites',
    category: 'Elevated Seating',
    color: '#8B5CF6', // Refined Purple / Amethyst
    accentColor: '#A78BFA',
    bgTint: 'rgba(139, 92, 246, 0.14)',
    borderStroke: 'rgba(139, 92, 246, 0.5)',
    defaultPrice: 220,
    proximity: '20 – 38m (Elevated +3.5m)',
    sightline: 'Sweeping Bird’s-Eye Amphitheater View',
    format: 'Tiered Auditorium Seating with Armrests',
    entryGate: 'Upper Concourse Escalators / Elevator B',
    defaultPerks: [
      'Assigned tiered seating with cushioned theater chairs',
      'Elevated unobstructed panorama of the complete stage set & lights',
      'Exclusive access to upper concourse bar with shorter queues',
      'Relaxed viewing experience away from general floor movement',
    ],
  },
];

const parsePerksList = (perks) => {
  if (Array.isArray(perks)) return perks;
  if (typeof perks === 'string' && perks.trim()) {
    try {
      const parsed = JSON.parse(perks);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return perks.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export default function InteractiveSeatMap({
  ticketTypes = [],
  currency = 'GHS',
  event = null,
  onSelectTicket,
}) {
  const { format } = useCurrency();
  const [selectedSectionId, setSelectedSectionId] = useState('vip_lounge');
  const [hoveredSectionId, setHoveredSectionId] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'comparison'

  // Map architectural blueprints with actual tickets configured by organizer
  const sections = useMemo(() => {
    return SECTION_BLUEPRINTS.map((bp) => {
      // Find corresponding ticket type from event tickets list
      const matchingTicket = ticketTypes.find((t) => {
        const name = (t.name || '').toLowerCase();
        const secType = (t.section_type || '').toLowerCase();
        return (
          secType === bp.slug ||
          name.includes(bp.slug) ||
          (bp.slug === 'vip' && (t.isVip || name.includes('vip') || name.includes('lounge') || name.includes('table'))) ||
          (bp.slug === 'golden_circle' && (name.includes('gold') || name.includes('pit') || name.includes('front') || name.includes('circle'))) ||
          (bp.slug === 'general' && (name.includes('regular') || name.includes('general') || name.includes('standard') || name.includes('early'))) ||
          (bp.slug === 'balcony' && (name.includes('balcony') || name.includes('mezzanine') || name.includes('suite') || name.includes('elevated')))
        );
      });

      const parsedPerks = matchingTicket ? parsePerksList(matchingTicket.perks) : [];
      const perks = parsedPerks.length > 0 ? parsedPerks : bp.defaultPerks;
      const price = matchingTicket ? Number(matchingTicket.price) : bp.defaultPrice;
      const earlyBirdPrice = matchingTicket?.early_bird_price ? Number(matchingTicket.early_bird_price) : null;
      const isEarlyBirdActive = earlyBirdPrice !== null && earlyBirdPrice < price;
      const effectivePrice = isEarlyBirdActive ? earlyBirdPrice : price;

      const availableQty = matchingTicket
        ? (matchingTicket.quantity != null && matchingTicket.quantity_sold != null
            ? Math.max(0, matchingTicket.quantity - matchingTicket.quantity_sold)
            : (matchingTicket.available ?? matchingTicket.quantityAvailable ?? null))
        : null;

      return {
        ...bp,
        matchingTicket,
        displayName: matchingTicket?.name || bp.name,
        price: effectivePrice,
        originalPrice: price,
        isEarlyBird: isEarlyBirdActive,
        available: availableQty,
        perks,
      };
    });
  }, [ticketTypes]);

  const activeSection = sections.find((s) => s.id === (hoveredSectionId || selectedSectionId)) || sections[0];

  const handleSelect = (sec) => {
    setSelectedSectionId(sec.id);
    if (onSelectTicket) {
      if (sec.matchingTicket) {
        onSelectTicket(sec.matchingTicket);
      } else if (ticketTypes.length > 0) {
        onSelectTicket(ticketTypes[0]);
      }
    }
  };

  const venueTitle = event?.venue || 'Main Concert Auditorium';
  const venueLocation = event?.city ? `${event.city}, Ghana` : 'Main Stage';

  return (
    <div className="rounded-2xl bg-[#12161A] border border-[#242A30] overflow-hidden shadow-2xl">
      {/* ─── Top Bar: Clean Context & View Mode Switcher ─── */}
      <div className="px-5 py-4 bg-[#161B20] border-b border-[#242A30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Venue Layout &amp; Experience Tiers</span>
            </h3>
            <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3 h-3 text-[#D4AF37]" />
              <span>{venueTitle}</span>
              <span className="text-[#494F55]">•</span>
              <span>{venueLocation}</span>
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0C0F12] border border-[#242A30] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'map'
                ? 'bg-[#242A30] text-white shadow-sm'
                : 'text-[#949599] hover:text-[#EFEFF1]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Floorplan</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'comparison'
                ? 'bg-[#242A30] text-white shadow-sm'
                : 'text-[#949599] hover:text-[#EFEFF1]'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>Compare Tiers</span>
          </button>
        </div>
      </div>

      {/* ─── Mode 1: Interactive Floorplan Layout ─── */}
      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Architectural Stage Map Canvas */}
          <div className="lg:col-span-7 p-6 flex flex-col items-center justify-between bg-[#0B0E11] relative min-h-[440px] border-b lg:border-b-0 lg:border-r border-[#242A30]">
            
            {/* Subtle Blueprint Grid Accent */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #FFFFFF 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Architectural Stage Header */}
            <div className="w-full max-w-sm mx-auto mb-4 text-center select-none">
              <div className="inline-flex items-center justify-center gap-2 px-6 py-1.5 rounded-full bg-[#181D23] border border-[#2E363E] text-[11px] font-semibold tracking-widest text-[#949599] uppercase shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Performance Stage</span>
              </div>
            </div>

            {/* Master Architectural SVG Floorplan */}
            <div className="w-full max-w-lg aspect-[4/3] relative">
              <svg
                viewBox="0 0 460 340"
                className="w-full h-full select-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Subtle architectural gradient fills */}
                  <linearGradient id="stageWood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2A241A" />
                    <stop offset="100%" stopColor="#171410" />
                  </linearGradient>
                  <radialGradient id="stageSpot" cx="50%" cy="10%" r="90%">
                    <stop offset="0%" stopColor="rgba(245, 200, 98, 0.18)" />
                    <stop offset="60%" stopColor="rgba(245, 200, 98, 0.03)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  
                  {/* Filter for glowing active borders */}
                  <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#E5A93C" floodOpacity="0.45" />
                  </filter>
                  <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10B981" floodOpacity="0.45" />
                  </filter>
                  <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#3B82F6" floodOpacity="0.45" />
                  </filter>
                  <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#8B5CF6" floodOpacity="0.45" />
                  </filter>
                </defs>

                {/* Stage Lighting Spotlight Cone radiating toward crowd */}
                <path
                  d="M 170 35 L 20 330 L 440 330 L 290 35 Z"
                  fill="url(#stageSpot)"
                  pointerEvents="none"
                />

                {/* ─── STAGE STRUCTURE ─── */}
                <g className="select-none">
                  {/* Stage Apron Arc */}
                  <path
                    d="M 130 18 L 330 18 C 340 38 310 50 230 50 C 150 50 120 38 130 18 Z"
                    fill="url(#stageWood)"
                    stroke="#594732"
                    strokeWidth="1.5"
                  />
                  {/* Stage Lighting Truss & Speaker PA Towers */}
                  <rect x="98" y="14" width="16" height="30" rx="3" fill="#1B1E22" stroke="#373D44" strokeWidth="1" />
                  <rect x="346" y="14" width="16" height="30" rx="3" fill="#1B1E22" stroke="#373D44" strokeWidth="1" />
                  <text x="106" y="32" fill="#717882" fontSize="7" fontWeight="bold" textAnchor="middle">PA</text>
                  <text x="354" y="32" fill="#717882" fontSize="7" fontWeight="bold" textAnchor="middle">PA</text>
                  
                  {/* Stage Center Label */}
                  <text x="230" y="36" fill="#D4AF37" fontSize="10" fontWeight="700" letterSpacing="2" textAnchor="middle">
                    MAIN STAGE
                  </text>
                  {/* Subtle acoustic soundline */}
                  <circle cx="230" cy="32" r="3" fill="#F5C862" opacity="0.8" />
                </g>

                {/* ─── SIGHTLINE VECTOR TO ACTIVE SECTION ─── */}
                {activeSection && (
                  <g pointerEvents="none" opacity="0.65">
                    {activeSection.id === 'golden_circle' && (
                      <line x1="230" y1="36" x2="230" y2="85" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}
                    {activeSection.id === 'vip_lounge' && (
                      <>
                        <line x1="230" y1="36" x2="65" y2="90" stroke="#E5A93C" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="230" y1="36" x2="395" y2="90" stroke="#E5A93C" strokeWidth="1.5" strokeDasharray="3 3" />
                      </>
                    )}
                    {activeSection.id === 'general_floor' && (
                      <line x1="230" y1="36" x2="230" y2="185" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}
                    {activeSection.id === 'mezzanine_tier' && (
                      <line x1="230" y1="36" x2="230" y2="285" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="3 3" />
                    )}
                  </g>
                )}

                {/* ─── SECTION 1: GOLDEN CIRCLE (FRONT PIT) ─── */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleSelect(sections[1])}
                  onMouseEnter={() => setHoveredSectionId('golden_circle')}
                  onMouseLeave={() => setHoveredSectionId(null)}
                >
                  <path
                    d="M 132 58 Q 230 64 328 58 L 340 120 Q 230 134 120 120 Z"
                    fill={activeSection.id === 'golden_circle' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.12)'}
                    stroke={activeSection.id === 'golden_circle' ? '#10B981' : 'rgba(16, 185, 129, 0.5)'}
                    strokeWidth={activeSection.id === 'golden_circle' ? '2.5' : '1.2'}
                    filter={activeSection.id === 'golden_circle' ? 'url(#glowGreen)' : 'none'}
                  />
                  {/* Subtle pit stipple points representing stage front crowd */}
                  <circle cx="190" cy="85" r="1.5" fill="#34D399" opacity="0.4" />
                  <circle cx="230" cy="88" r="1.5" fill="#34D399" opacity="0.5" />
                  <circle cx="270" cy="85" r="1.5" fill="#34D399" opacity="0.4" />
                  <circle cx="210" cy="105" r="1.5" fill="#34D399" opacity="0.4" />
                  <circle cx="250" cy="105" r="1.5" fill="#34D399" opacity="0.4" />

                  <text x="230" y="96" fill="#E6FFFA" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
                    GOLDEN CIRCLE
                  </text>
                  <text x="230" y="112" fill="#6EE7B7" fontSize="8" fontWeight="500" textAnchor="middle">
                    Front-Stage Pit
                  </text>
                </g>

                {/* ─── SECTION 2: VIP TABLES & TERRACES (LEFT & RIGHT) ─── */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleSelect(sections[0])}
                  onMouseEnter={() => setHoveredSectionId('vip_lounge')}
                  onMouseLeave={() => setHoveredSectionId(null)}
                >
                  {/* West VIP Terrace Box */}
                  <rect
                    x="20"
                    y="50"
                    width="88"
                    height="85"
                    rx="8"
                    fill={activeSection.id === 'vip_lounge' ? 'rgba(229, 169, 60, 0.28)' : 'rgba(229, 169, 60, 0.12)'}
                    stroke={activeSection.id === 'vip_lounge' ? '#F5C862' : 'rgba(229, 169, 60, 0.5)'}
                    strokeWidth={activeSection.id === 'vip_lounge' ? '2.5' : '1.2'}
                    filter={activeSection.id === 'vip_lounge' ? 'url(#glowGold)' : 'none'}
                  />
                  {/* East VIP Terrace Box */}
                  <rect
                    x="352"
                    y="50"
                    width="88"
                    height="85"
                    rx="8"
                    fill={activeSection.id === 'vip_lounge' ? 'rgba(229, 169, 60, 0.28)' : 'rgba(229, 169, 60, 0.12)'}
                    stroke={activeSection.id === 'vip_lounge' ? '#F5C862' : 'rgba(229, 169, 60, 0.5)'}
                    strokeWidth={activeSection.id === 'vip_lounge' ? '2.5' : '1.2'}
                    filter={activeSection.id === 'vip_lounge' ? 'url(#glowGold)' : 'none'}
                  />

                  {/* Architectural Table & Chair Nodes (Left) */}
                  <circle cx="50" cy="78" r="7" fill="#2E2416" stroke="#D4AF37" strokeWidth="1" />
                  <circle cx="78" cy="78" r="7" fill="#2E2416" stroke="#D4AF37" strokeWidth="1" />
                  <circle cx="64" cy="110" r="7" fill="#2E2416" stroke="#D4AF37" strokeWidth="1" />

                  {/* Architectural Table & Chair Nodes (Right) */}
                  <circle cx="382" cy="78" r="7" fill="#2E2416" stroke="#D4AF37" strokeWidth="1" />
                  <circle cx="410" cy="78" r="7" fill="#2E2416" stroke="#D4AF37" strokeWidth="1" />
                  <circle cx="396" cy="110" r="7" fill="#2E2416" stroke="#D4AF37" strokeWidth="1" />

                  <text x="64" y="98" fill="#FFFBEB" fontSize="9" fontWeight="700" textAnchor="middle">
                    VIP WEST
                  </text>
                  <text x="396" y="98" fill="#FFFBEB" fontSize="9" fontWeight="700" textAnchor="middle">
                    VIP EAST
                  </text>
                </g>

                {/* ─── SECTION 3: MAIN ARENA (GENERAL ADMISSION) ─── */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleSelect(sections[2])}
                  onMouseEnter={() => setHoveredSectionId('general_floor')}
                  onMouseLeave={() => setHoveredSectionId(null)}
                >
                  <path
                    d="M 20 148 L 440 148 L 420 236 L 40 236 Z"
                    fill={activeSection.id === 'general_floor' ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.12)'}
                    stroke={activeSection.id === 'general_floor' ? '#60A5FA' : 'rgba(59, 130, 246, 0.5)'}
                    strokeWidth={activeSection.id === 'general_floor' ? '2.5' : '1.2'}
                    filter={activeSection.id === 'general_floor' ? 'url(#glowBlue)' : 'none'}
                  />

                  {/* FOH Sound & Lighting Station Box (Real Arena Feature) */}
                  <rect x="200" y="195" width="60" height="26" rx="4" fill="#14181D" stroke="#3A434D" strokeWidth="1" />
                  <text x="230" y="211" fill="#8B95A1" fontSize="7" fontWeight="bold" textAnchor="middle">
                    FOH CONSOLE
                  </text>

                  {/* Aisle markings */}
                  <line x1="120" y1="152" x2="120" y2="232" stroke="#253245" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="340" y1="152" x2="340" y2="232" stroke="#253245" strokeWidth="1" strokeDasharray="3 3" />

                  <text x="230" y="174" fill="#EFF6FF" fontSize="12" fontWeight="700" textAnchor="middle" letterSpacing="1">
                    GENERAL ADMISSION
                  </text>
                  <text x="230" y="188" fill="#93C5FD" fontSize="8" fontWeight="500" textAnchor="middle">
                    Main Floor Standing &amp; Aisle
                  </text>
                </g>

                {/* ─── SECTION 4: MEZZANINE & TIERED SUITES ─── */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => handleSelect(sections[3])}
                  onMouseEnter={() => setHoveredSectionId('mezzanine_tier')}
                  onMouseLeave={() => setHoveredSectionId(null)}
                >
                  <path
                    d="M 20 250 Q 230 236 440 250 L 440 315 Q 230 295 20 315 Z"
                    fill={activeSection.id === 'mezzanine_tier' ? 'rgba(139, 92, 246, 0.28)' : 'rgba(139, 92, 246, 0.12)'}
                    stroke={activeSection.id === 'mezzanine_tier' ? '#A78BFA' : 'rgba(139, 92, 246, 0.5)'}
                    strokeWidth={activeSection.id === 'mezzanine_tier' ? '2.5' : '1.2'}
                    filter={activeSection.id === 'mezzanine_tier' ? 'url(#glowPurple)' : 'none'}
                  />

                  {/* Tiered seat row concentric curved guidelines */}
                  <path d="M 40 270 Q 230 255 420 270" stroke="rgba(192, 132, 252, 0.25)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
                  <path d="M 40 290 Q 230 275 420 290" stroke="rgba(192, 132, 252, 0.25)" strokeWidth="1" strokeDasharray="4 4" fill="none" />

                  <text x="230" y="280" fill="#FAF5FF" fontSize="11" fontWeight="700" textAnchor="middle" letterSpacing="0.5">
                    MEZZANINE &amp; BALCONY TIERS
                  </text>
                  <text x="230" y="296" fill="#D8B4FE" fontSize="8" fontWeight="500" textAnchor="middle">
                    Reserved Tiered Seating (+3.5m Elevation)
                  </text>
                </g>
              </svg>
            </div>

            {/* Quick-Switch Pill Bar for all 4 Tiers */}
            <div className="w-full pt-4 mt-2 border-t border-[#1C2228] flex flex-wrap items-center justify-center gap-2">
              {sections.map((sec) => {
                const isSelected = activeSection.id === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelect(sec)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#222830] text-white border shadow-sm'
                        : 'bg-[#12161A] text-[#949599] border border-[#242A30] hover:text-white hover:border-[#373F48]'
                    }`}
                    style={{
                      borderColor: isSelected ? sec.color : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: sec.color }}
                    />
                    <span>{sec.displayName}</span>
                    <span className="text-[11px] text-[#949599] font-mono">
                      {sec.price === 0 ? 'Free' : format(sec.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience Specifications & Direct Booking Sheet */}
          <div className="lg:col-span-5 p-6 bg-[#13171B] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Zone Category & Availability */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                    style={{
                      backgroundColor: activeSection.bgTint,
                      color: activeSection.color,
                      border: `1px solid ${activeSection.borderStroke}`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeSection.color }} />
                    {activeSection.category}
                  </span>

                  {activeSection.isEarlyBird && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                      Early Bird Price Active
                    </span>
                  )}
                  {activeSection.available !== null && (
                    <span
                      className={`text-xs font-medium ${
                        activeSection.available > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {activeSection.available > 0 ? `${activeSection.available} passes left` : 'Sold out'}
                    </span>
                  )}
                </div>

                {/* Section Title & Sightline */}
                <div>
                  <h4 className="text-xl font-bold text-white tracking-tight">
                    {activeSection.displayName}
                  </h4>
                  <p className="text-xs text-[#949599] mt-1 leading-relaxed">
                    {activeSection.sightline}
                  </p>
                </div>

                {/* Pricing Block */}
                <div className="p-3.5 rounded-xl bg-[#181D23] border border-[#242A30] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#949599] tracking-wider block">
                      Price per Admission
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black text-white">
                        {activeSection.price === 0 ? 'Free' : format(activeSection.price)}
                      </span>
                      {activeSection.isEarlyBird && (
                        <span className="text-xs text-[#949599] line-through">
                          {format(activeSection.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-[#949599]">Taxes &amp; fees incl.</span>
                </div>

                {/* Technical Specifications Grid (Full text without ugly ellipses) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-[#181D23]/70 border border-[#242A30]">
                    <span className="text-[10px] uppercase tracking-wider text-[#949599] font-medium block">
                      Stage Proximity
                    </span>
                    <span className="font-semibold text-[#EFEFF1] block mt-1">
                      {activeSection.proximity}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#181D23]/70 border border-[#242A30]">
                    <span className="text-[10px] uppercase tracking-wider text-[#949599] font-medium block">
                      Seating Format
                    </span>
                    <span className="font-semibold text-[#EFEFF1] block mt-1">
                      {activeSection.format}
                    </span>
                  </div>
                </div>

                {/* Included Experience Perks */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#949599] mb-2.5 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Included Tier Perks &amp; Inclusions</span>
                  </h5>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {activeSection.perks.map((perk, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-[#EFEFF1]">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                        <span className="leading-snug">{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Direct Checkout CTA */}
            <div className="mt-6 pt-4 border-t border-[#242A30]">
              <button
                type="button"
                onClick={() => handleSelect(activeSection)}
                className="w-full py-3.5 px-4 rounded-xl bg-white text-[#12161A] font-bold text-sm hover:bg-[#CBD5E1] transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/30 active:scale-[0.99]"
              >
                <span>Select {activeSection.displayName} — {activeSection.price === 0 ? 'Free' : format(activeSection.price)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center text-[#949599] mt-2.5 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Official Ticket • Instant Mobile QR Pass</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Mode 2: Clean Studio Tier Comparison Table ─── */
        <div className="p-6 bg-[#0E1216]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#242A30] text-[11px] uppercase tracking-wider text-[#949599]">
                  <th className="py-3 px-4">Experience Tier</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Sightline &amp; Distance</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Key Inclusions</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F252B] text-xs">
                {sections.map((sec) => (
                  <tr
                    key={sec.id}
                    className="hover:bg-[#14181D] transition-colors group cursor-pointer"
                    onClick={() => handleSelect(sec)}
                  >
                    <td className="py-4 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                            {sec.displayName}
                          </p>
                          <span className="text-[11px] text-[#949599]">{sec.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                      {sec.price === 0 ? 'Free' : format(sec.price)}
                    </td>
                    <td className="py-4 px-4 text-[#C5C7CB]">
                      <p className="font-medium text-white">{sec.proximity}</p>
                      <p className="text-[11px] text-[#949599]">{sec.sightline}</p>
                    </td>
                    <td className="py-4 px-4 text-[#C5C7CB] whitespace-nowrap">
                      {sec.format}
                    </td>
                    <td className="py-4 px-4 text-[#949599] max-w-xs">
                      <ul className="space-y-1">
                        {sec.perks.slice(0, 2).map((p, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-[11px] text-[#EFEFF1]">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(sec);
                        }}
                        className="px-4 py-2 rounded-lg bg-white text-[#12161A] text-xs font-bold hover:bg-[#CBD5E1] transition-all shadow-sm inline-flex items-center gap-1"
                      >
                        <span>Select</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
