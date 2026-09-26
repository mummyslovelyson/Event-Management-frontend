import { Link } from 'react-router-dom';
import { Wallet, Calendar, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function ChatSpendingCard({ spending, onNavigate }) {
  if (!spending) return null;

  return (
    <div className="rounded-xl bg-[#14181C] border border-[#2E363E] p-4 my-2 text-sm shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-400/20 text-emerald-400 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#949599] block">Event Spending</span>
            <span className="text-xs font-bold text-white">{spending.month}</span>
          </div>
        </div>
        <span className="text-base font-extrabold text-emerald-400 font-mono">
          {formatCurrency(spending.total)}
        </span>
      </div>

      <p className="text-xs text-[#CBD5E1] mb-2.5">
        You have booked <strong className="text-white">{spending.count} event{spending.count === 1 ? '' : 's'}</strong> this month.
      </p>

      {spending.recentEvents && spending.recentEvents.length > 0 && (
        <div className="space-y-1.5 bg-[#1C232B] p-2.5 rounded-lg border border-[#2A333D] mb-3">
          {spending.recentEvents.map((ev, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-[#EFEFF1] font-medium truncate max-w-[70%]">{ev.title}</span>
              <span className="text-emerald-400 font-mono font-semibold">{formatCurrency(ev.total_amount)}</span>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/attendee/tickets"
        onClick={onNavigate}
        className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-white/10"
      >
        <span>View Invoices &amp; Orders</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
