import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket, Sparkles, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function ChatEventCard({ event, onNavigate }) {
  if (!event) return null;

  const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }) : '';

  const priceDisplay = event.minPrice === 0 ? 'Free' : formatCurrency(event.minPrice);

  return (
    <div className="rounded-xl overflow-hidden bg-[#161D22] border border-[#2E363E] hover:border-white/40 transition-all group flex flex-col my-2 shadow-md">
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
        {event.category && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1C232B]/90 text-white backdrop-blur border border-white/10">
            {event.category}
          </span>
        )}
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
          <div className="mt-1 space-y-0.5 text-[11px] text-[#949599]">
            {eventDate && (
              <p className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#494F55] shrink-0" />
                <span>{eventDate} {event.time ? `• ${event.time}` : ''}</span>
              </p>
            )}
            <p className="flex items-center gap-1.5 line-clamp-1">
              <MapPin className="w-3 h-3 text-[#494F55] shrink-0" />
              <span>{event.venue || event.city || 'Accra, Ghana'}</span>
            </p>
          </div>
        </div>

        <Link
          to={`/events/${event.id}`}
          onClick={onNavigate}
          className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white text-white hover:text-[#1C232B] text-xs font-bold transition-all"
        >
          <span>View &amp; Buy Tickets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
