import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function ChatTicketCard({ ticket, onNavigate }) {
  if (!ticket) return null;

  const eventDate = ticket.date
    ? new Date(ticket.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      })
    : '';

  const isActive = ticket.status === 'active';

  return (
    <div className="rounded-xl overflow-hidden bg-[#161D22] border border-[#2E363E] hover:border-white/30 transition-all group flex flex-col my-2 shadow-md">
      {/* Top Banner / Event info */}
      <div className="p-3 bg-[#1C232B] flex items-center gap-3 border-b border-[#2E363E]">
        <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#252E38] shrink-0 relative flex items-center justify-center">
          {ticket.bannerImage ? (
            <img
              src={ticket.bannerImage}
              alt={ticket.eventTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <Ticket className="w-5 h-5 text-[#949599]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            {ticket.ticketNumber && (
              <span className="text-[10px] font-mono text-[#949599] truncate">
                {ticket.ticketNumber}
              </span>
            )}
            {ticket.status && (
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                  isActive
                    ? 'bg-white/10 text-[#EFEFF1] border border-white/20'
                    : 'bg-white/5 text-[#949599] border border-white/10'
                }`}
              >
                {ticket.status}
              </span>
            )}
          </div>
          <h4 className="text-xs font-bold text-[#EFEFF1] truncate group-hover:text-white transition-colors">
            {ticket.eventTitle}
          </h4>
          <span className="text-[11px] font-semibold text-[#EFEFF1]">
            {ticket.ticketTypeName}
            {ticket.ticketPrice ? ` • ${formatCurrency(ticket.ticketPrice)}` : ''}
          </span>
        </div>
      </div>

      {/* Date & Location */}
      <div className="px-3 py-2 text-[11px] text-[#949599] space-y-1 bg-[#161D22]">
        {eventDate && (
          <p className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3 h-3 text-[#494F55] shrink-0" />
            <span>{eventDate} {ticket.time ? `• ${ticket.time}` : ''}</span>
          </p>
        )}
        {ticket.venue && (
          <p className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3 h-3 text-[#494F55] shrink-0" />
            <span>{ticket.venue}</span>
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-2 pt-0 bg-[#161D22]">
        <Link
          to="/attendee/tickets"
          onClick={onNavigate}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white hover:bg-[#CBD5E1] text-[#1C232B] text-xs font-bold transition-all border border-transparent shadow"
        >
          <span>View QR Pass in My Tickets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
