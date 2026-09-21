import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, ArrowRight, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function ChatEventCard({ event, onNavigate }) {
  const [showTiers, setShowTiers] = useState(false);

  if (!event) return null;

  const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }) : '';

  const priceDisplay = event.minPrice === 0 ? 'Free' : formatCurrency(event.minPrice);

  return (
    <div className="rounded-xl overflow-hidden bg-[#161D22] border border-[#2E363E] hover:border-white/30 transition-all group flex flex-col my-2 shadow-md">
      {/* Flyer header */}
      <div className="h-28 bg-[#242B32] relative overflow-hidden">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1C232B] to-[#252E38]">
            <Ticket className="w-8 h-8 text-[#494F55]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161D22] via-transparent to-transparent" />
        
        {/* Top Badges: Category & ML Match Score */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
          {event.category && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1C232B]/90 text-white backdrop-blur border border-white/10">
              {event.category}
            </span>
          )}
          {event.matchScore && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-white text-[#1C232B] shadow-md backdrop-blur">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{event.matchScore}% Match</span>
            </span>
          )}
        </div>

        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-black bg-white text-[#1C232B] shadow">
          {priceDisplay}
        </span>
      </div>

      {/* Details */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-[#EFEFF1] line-clamp-1 group-hover:text-white transition-colors">
            {event.title}
          </h4>

          {/* ML Match explanation if present */}
          {event.matchReason && (
            <p className="text-[10px] text-[#CBD5E1] font-medium truncate mt-0.5">
              ✦ {event.matchReason}
            </p>
          )}

          <div className="mt-1.5 space-y-0.5 text-[11px] text-[#949599]">
            {eventDate && (
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#494F55] shrink-0" />
                <span>{eventDate} {event.time ? `• ${event.time}` : ''}</span>
              </p>
            )}
            {(event.venue || event.city) && (
              <p className="flex items-center gap-1.5 line-clamp-1">
                <MapPin className="w-3 h-3 text-[#494F55] shrink-0" />
                <span>{[event.venue, event.city].filter(Boolean).join(', ')}</span>
              </p>
            )}
          </div>
        </div>

        {/* Sell-out Velocity / Demand pill */}
        {event.demandBadge && (
          <div className="px-2 py-1 rounded-lg bg-[#1C232B] border border-[#2E363E] text-[10px] text-[#CBD5E1] font-semibold flex items-center justify-between">
            <span>{event.demandBadge}</span>
          </div>
        )}

        {/* Expandable Ticket Tiers Preview */}
        {event.ticketTiers && event.ticketTiers.length > 0 && (
          <div className="mt-1 border-t border-white/5 pt-1.5">
            <button
              type="button"
              onClick={() => setShowTiers((v) => !v)}
              className="w-full flex items-center justify-between text-[10px] font-semibold text-[#EFEFF1] hover:text-white py-0.5"
            >
              <span>{showTiers ? 'Hide Ticket Tiers' : `Preview Ticket Tiers (${event.ticketTiers.length})`}</span>
              {showTiers ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showTiers && (
              <div className="mt-1.5 space-y-1 bg-[#14181C] p-2 rounded-lg border border-[#2E363E]">
                {event.ticketTiers.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-white font-medium truncate max-w-[65%]">{t.name}</span>
                    <span className="text-[#EFEFF1] font-bold">{formatCurrency(t.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Link
          to={`/events/${event.id}`}
          onClick={onNavigate}
          className="w-full mt-0.5 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white hover:bg-[#CBD5E1] text-[#1C232B] text-xs font-bold transition-all border border-transparent shadow"
        >
          <span>View &amp; Buy Tickets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
