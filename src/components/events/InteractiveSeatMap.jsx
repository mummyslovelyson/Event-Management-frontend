import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, Ticket, Shield, Users, Eye,
  ArrowRight, Info, Zap, Crown, Flame,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

const DEFAULT_SECTIONS = [
  {
    id: 'vip_diamond',
    name: 'Diamond VIP Lounge & Tables',
    tierName: 'VIP',
    type: 'vip',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.6)',
    defaultPrice: 350,
    distance: '3 - 8 meters from Stage',
    viewAngle: 'Front Stage Direct • Premium Elevated View',
    capacity: 'Exclusive Table Service',
    perks: [
      'Dedicated VIP Fast-Track Entry',
      'Complimentary Premium Bottle / Cocktails',
      'Access to Air-Conditioned VIP Lounge & Private Bar',
      'Backstage Artist Viewing Deck Access',
      'Dedicated Waiter & Restrooms',
      'Exclusive Commemorative VIP Pass',
    ],
  },
  {
    id: 'golden_circle',
    name: 'Golden Circle (Front Stage Pit)',
    tierName: 'Golden Circle',
    type: 'golden_circle',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.6)',
    defaultPrice: 180,
    distance: '1 - 12 meters from Stage',
    viewAngle: 'Center Stage • Highest Energy Front Pit',
    capacity: 'Limited Front Stage Standing',
    perks: [
      'Front-of-Stage Golden Circle Access',
      'Priority Entrance Gate',
      '1 Free Welcome Beverage Voucher',
      'Unobstructed Sightline to Headliners',
    ],
  },
  {
    id: 'general_admission',
    name: 'General Admission Floor',
    tierName: 'Regular',
    type: 'general',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
    defaultPrice: 80,
    distance: '15 - 45 meters from Stage',
    viewAngle: 'Main Festival Floor • 360° Sound Immersion',
    capacity: 'Main Arena Crowd',
    perks: [
      'Access to Main Festival / Concert Floor',
      'Access to Food & Beverage Village',
      'Immersive Festival Sound & Light Experience',
    ],
  },
  {
    id: 'balcony_suites',
    name: 'Mezzanine & Elevated Suites',
    tierName: 'Balcony',
    type: 'balcony',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.5)',
    defaultPrice: 220,
    distance: '20 - 35 meters (Elevated Tier)',
    viewAngle: 'Panoramic Arena Sightline • Relaxed Seating',
    capacity: 'Tiered Reserved Seating',
    perks: [
      'Elevated Tiered Seating with Stadium Chairs',
      'Panoramic Bird’s-Eye View of Main Stage & Pyro',
      'Dedicated Mezzanine Bar & Concessions',
    ],
  },
];

export default function InteractiveSeatMap({
  ticketTypes = [],
  currency = 'GHS',
  onSelectTicket,
}) {
  const [selectedSectionId, setSelectedSectionId] = useState('vip_diamond');
  const [hoveredSectionId, setHoveredSectionId] = useState(null);

  // Map each default visual section to actual event ticket types if available
  const sections = DEFAULT_SECTIONS.map((sec) => {
    // Find matching ticket type by name or section_type
    const matchingTicket = ticketTypes.find(
      (t) =>
        t.section_type === sec.type ||
        t.name?.toLowerCase().includes(sec.tierName.toLowerCase()) ||
        t.name?.toLowerCase().includes(sec.type) ||
        (sec.type === 'vip' && t.isVip)
    );

    const price = matchingTicket ? Number(matchingTicket.price) : sec.defaultPrice;
    const isEarlyBird = matchingTicket?.early_bird_price && Number(matchingTicket.early_bird_price) < price;
    const effectivePrice = isEarlyBird ? Number(matchingTicket.early_bird_price) : price;

    return {
      ...sec,
      matchingTicket,
      price: effectivePrice,
      originalPrice: price,
      isEarlyBird,
      available: matchingTicket ? matchingTicket.quantityAvailable ?? matchingTicket.available : null,
    };
  });

  const activeSection = sections.find((s) => s.id === (hoveredSectionId || selectedSectionId)) || sections[0];

  const handleSectionClick = (sec) => {
    setSelectedSectionId(sec.id);
    if (onSelectTicket && sec.matchingTicket) {
      onSelectTicket(sec.matchingTicket);
    } else if (onSelectTicket && ticketTypes.length > 0) {
      onSelectTicket(ticketTypes[0]);
    }
  };

  return (
    <div className="rounded-2xl bg-[#14181C] border border-[#262B2F] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#262B2F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171C22]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400/15 text-amber-300">
              <Crown className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#EFEFF1]">Interactive Venue & VIP Section Visualizer</h3>
          </div>
          <p className="text-xs text-[#949599] mt-0.5">
            Click or tap any zone on the venue layout to inspect sightlines, perks, and pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#949599] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" /> Interactive 360° Map
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Visual Map SVG Area */}
        <div className="lg:col-span-7 p-6 flex flex-col items-center justify-center bg-[#0F1215] relative min-h-[380px]">
          {/* Main Stage Banner */}
          <div className="w-full max-w-md mx-auto mb-6 text-center">
            <div className="relative py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500/20 via-white/15 to-amber-500/20 border border-white/20 shadow-lg shadow-black/40">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-[#EFEFF1]">
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>MAIN PERFORMANCE STAGE</span>
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 inset-x-8 h-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent blur-[2px]" />
            </div>
          </div>

          {/* Interactive SVG Floorplan */}
          <div className="w-full max-w-md aspect-[4/3] relative">
            <svg
              viewBox="0 0 400 300"
              className="w-full h-full drop-shadow-2xl select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="vipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#B45309" stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="gcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.65" />
                </linearGradient>
                <linearGradient id="gaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id="balconyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#BE185D" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* VIP Diamond Left & Right Wings */}
              <g
                className="cursor-pointer transition-all duration-300"
                onClick={() => handleSectionClick(sections[0])}
                onMouseEnter={() => setHoveredSectionId('vip_diamond')}
                onMouseLeave={() => setHoveredSectionId(null)}
              >
                {/* Left VIP Box */}
                <path
                  d="M 20 20 L 95 20 L 95 85 L 20 85 Z"
                  fill="url(#vipGrad)"
                  stroke={activeSection.id === 'vip_diamond' ? '#F59E0B' : '#78350F'}
                  strokeWidth={activeSection.id === 'vip_diamond' ? '3' : '1.5'}
                  className="transition-all duration-200"
                />
                {/* Right VIP Box */}
                <path
                  d="M 305 20 L 380 20 L 380 85 L 305 85 Z"
                  fill="url(#vipGrad)"
                  stroke={activeSection.id === 'vip_diamond' ? '#F59E0B' : '#78350F'}
                  strokeWidth={activeSection.id === 'vip_diamond' ? '3' : '1.5'}
                  className="transition-all duration-200"
                />
                <text x="57" y="55" fill="#FEF3C7" fontSize="10" fontWeight="bold" textAnchor="middle">
                  VIP TABLE
                </text>
                <text x="342" y="55" fill="#FEF3C7" fontSize="10" fontWeight="bold" textAnchor="middle">
                  VIP LOUNGE
                </text>
              </g>

              {/* Golden Circle (Center Front Pit) */}
              <g
                className="cursor-pointer transition-all duration-300"
                onClick={() => handleSectionClick(sections[1])}
                onMouseEnter={() => setHoveredSectionId('golden_circle')}
                onMouseLeave={() => setHoveredSectionId(null)}
              >
                <rect
                  x="110"
                  y="20"
                  width="180"
                  height="75"
                  rx="10"
                  fill="url(#gcGrad)"
                  stroke={activeSection.id === 'golden_circle' ? '#10B981' : '#065F46'}
                  strokeWidth={activeSection.id === 'golden_circle' ? '3' : '1.5'}
                  className="transition-all duration-200"
                />
                <text x="200" y="52" fill="#D1FAE5" fontSize="12" fontWeight="bold" textAnchor="middle">
                  GOLDEN CIRCLE
                </text>
                <text x="200" y="68" fill="#A7F3D0" fontSize="9" textAnchor="middle">
                  Front Stage Pit
                </text>
              </g>

              {/* General Admission Floor */}
              <g
                className="cursor-pointer transition-all duration-300"
                onClick={() => handleSectionClick(sections[2])}
                onMouseEnter={() => setHoveredSectionId('general_admission')}
                onMouseLeave={() => setHoveredSectionId(null)}
              >
                <rect
                  x="35"
                  y="110"
                  width="330"
                  height="105"
                  rx="12"
                  fill="url(#gaGrad)"
                  stroke={activeSection.id === 'general_admission' ? '#60A5FA' : '#1E3A8A'}
                  strokeWidth={activeSection.id === 'general_admission' ? '3' : '1.5'}
                  className="transition-all duration-200"
                />
                <text x="200" y="155" fill="#DBEAFE" fontSize="14" fontWeight="bold" textAnchor="middle">
                  GENERAL ADMISSION
                </text>
                <text x="200" y="175" fill="#93C5FD" fontSize="10" textAnchor="middle">
                  Main Arena Floor • Standing & Dance Area
                </text>
              </g>

              {/* Mezzanine & Balcony Suites */}
              <g
                className="cursor-pointer transition-all duration-300"
                onClick={() => handleSectionClick(sections[3])}
                onMouseEnter={() => setHoveredSectionId('balcony_suites')}
                onMouseLeave={() => setHoveredSectionId(null)}
              >
                <path
                  d="M 20 235 Q 200 215 380 235 L 380 285 Q 200 270 20 285 Z"
                  fill="url(#balconyGrad)"
                  stroke={activeSection.id === 'balcony_suites' ? '#F472B6' : '#831843'}
                  strokeWidth={activeSection.id === 'balcony_suites' ? '3' : '1.5'}
                  className="transition-all duration-200"
                />
                <text x="200" y="260" fill="#FCE7F3" fontSize="11" fontWeight="bold" textAnchor="middle">
                  MEZZANINE & ELEVATED SUITES
                </text>
              </g>
            </svg>
          </div>

          {/* Legend Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSectionClick(sec)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  activeSection.id === sec.id
                    ? 'border-white bg-white text-[#1C232B] shadow-md'
                    : 'bg-[#181D23] border-[#2E363E] text-[#949599] hover:text-[#EFEFF1]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sec.color }} />
                <span>{sec.tierName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section Intel & Booking Card */}
        <div className="lg:col-span-5 p-6 bg-[#161B20] border-t lg:border-t-0 lg:border-l border-[#262B2F] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Section Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: activeSection.bgColor,
                      color: activeSection.color,
                      border: `1px solid ${activeSection.borderColor}`,
                    }}
                  >
                    {activeSection.tierName} Section
                  </span>
                  {activeSection.isEarlyBird && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold animate-pulse">
                      <Flame className="w-3 h-3 text-red-400" /> Early Bird Active
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-[#EFEFF1]">{activeSection.name}</h4>
                <p className="text-xs text-[#949599] mt-0.5">{activeSection.viewAngle}</p>
              </div>

              {/* Price Display */}
              <div className="p-3.5 rounded-xl bg-[#1B2127] border border-[#262B2F] flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#949599]">Price per ticket</p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-white">
                      {activeSection.price === 0 ? 'Free' : formatCurrency(activeSection.price, currency)}
                    </span>
                    {activeSection.isEarlyBird && (
                      <span className="text-xs text-[#949599] line-through">
                        {formatCurrency(activeSection.originalPrice, currency)}
                      </span>
                    )}
                  </div>
                </div>
                {activeSection.available !== null && (
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${activeSection.available > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {activeSection.available > 0 ? `${activeSection.available} remaining` : 'Sold out'}
                    </span>
                  </div>
                )}
              </div>

              {/* Stage Proximity & Sightlines */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#1B2127]/60 border border-[#262B2F]">
                  <span className="text-[10px] text-[#949599] block">Stage Distance</span>
                  <span className="font-semibold text-[#EFEFF1] truncate block mt-0.5">
                    {activeSection.distance}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#1B2127]/60 border border-[#262B2F]">
                  <span className="text-[10px] text-[#949599] block">Seating Type</span>
                  <span className="font-semibold text-[#EFEFF1] truncate block mt-0.5">
                    {activeSection.capacity}
                  </span>
                </div>
              </div>

              {/* Inclusions & Perks List */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#949599] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Included Section Perks
                </p>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {activeSection.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#EFEFF1]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="leading-tight">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action CTA */}
          <div className="mt-6 pt-4 border-t border-[#262B2F]">
            <button
              type="button"
              onClick={() => handleSectionClick(activeSection)}
              className="w-full py-3 px-4 rounded-xl bg-white text-[#1C232B] font-bold text-sm hover:bg-[#CBD5E1] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-98"
            >
              <span>Book {activeSection.tierName} Pass</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-[#949599] mt-2 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Guaranteed official admission • Instant QR delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
