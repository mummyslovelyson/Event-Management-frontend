import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, CreditCard, ShieldCheck, Ticket, QrCode, ArrowRight,
  ExternalLink, Loader2, Smartphone, AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function ChatBookingCard({
  booking,
  onContinuePayment,
  onVerifyPayment,
  onNavigate,
  onShowQR,
  verifying = false,
}) {
  const [timeLeft, setTimeLeft] = useState(booking?.remainingSeconds || 600);
  const [showQRPreview, setShowQRPreview] = useState(false);

  // 10-minute hold countdown
  useEffect(() => {
    if (booking?.status !== 'reserved') return;
    if (!booking?.expiresAt && !booking?.remainingSeconds) return;

    const targetTime = booking.expiresAt
      ? new Date(booking.expiresAt).getTime()
      : Date.now() + (booking.remainingSeconds || 600) * 1000;

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [booking]);

  if (!booking) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = timeLeft <= 0 && booking.status === 'reserved';

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ORDER SUMMARY STATE (Pre-payment breakdown)
  // ──────────────────────────────────────────────────────────────────────────
  if (booking.status === 'summary') {
    return (
      <div className="rounded-xl bg-[#14181C] border border-[#2E363E] p-4 my-3 text-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#949599] block">Order Breakdown</span>
              <span className="text-xs font-bold text-white line-clamp-1">{booking.eventTitle}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
            Selection Ready
          </span>
        </div>

        {/* Breakdown table */}
        <div className="space-y-2 bg-[#1C232B] p-3 rounded-lg border border-[#2A333D]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#CBD5E1] font-semibold">{booking.quantity} × {booking.tierName}</span>
            <span className="text-white font-mono font-medium">{formatCurrency(booking.unitPrice)} each</span>
          </div>

          <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-[#949599]">
              <span>Subtotal</span>
              <span className="font-mono text-[#CBD5E1]">{formatCurrency(booking.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#949599]">
              <span>Service Fee</span>
              <span className="font-mono text-[#CBD5E1]">{formatCurrency(booking.serviceFee)}</span>
            </div>
            <div className="border-t border-white/10 pt-1.5 flex justify-between text-sm font-bold text-white">
              <span>Total</span>
              <span className="font-mono text-emerald-400">{formatCurrency(booking.total)}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onContinuePayment?.(booking)}
          className="mt-3 w-full py-2.5 px-4 rounded-lg bg-white hover:bg-[#CBD5E1] text-[#1C232B] text-xs font-bold transition flex items-center justify-center gap-2 shadow"
        >
          <span>Continue to Payment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. RESERVED STATE (10-minute hold & payment processing)
  // ──────────────────────────────────────────────────────────────────────────
  if (booking.status === 'reserved') {
    return (
      <div className="rounded-xl bg-[#14181C] border border-amber-500/30 p-4 my-3 text-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">Tickets Reserved</span>
              <span className="text-xs font-bold text-white font-mono">{booking.orderNumber || 'Pending Order'}</span>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 ${
            isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-400/10 text-amber-300 border border-amber-400/30'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{isExpired ? 'Expired' : `${timeFormatted} remaining`}</span>
          </div>
        </div>

        <div className="bg-[#1C232B] p-3 rounded-lg border border-[#2A333D] space-y-2 mb-3">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-[#949599]">Reservation for:</span>
            <span className="text-white font-semibold">{booking.quantity} × {booking.tierName}</span>
          </div>
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-[#949599]">Total Amount:</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">{formatCurrency(booking.total)}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#949599] pt-1 border-t border-white/5">
            <Smartphone className="w-3 h-3 text-blue-400" />
            <span>Supports MTN MoMo, Telecel Cash, AT Money &amp; Cards</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {booking.authorizationUrl && (
            <a
              href={booking.authorizationUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow"
            >
              <CreditCard className="w-4 h-4" />
              <span>Complete Payment ({formatCurrency(booking.total)})</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            disabled={verifying}
            onClick={() => onVerifyPayment?.(booking)}
            className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-white/20 disabled:opacity-50"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verifying with payment switch...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>I Have Paid / Verify Payment</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-2 text-[10px] text-center text-[#949599]">
          Direct verification with Paystack gateway. Tickets are guaranteed upon approval.
        </p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CONFIRMED STATE (Paid tickets & QR codes ready)
  // ──────────────────────────────────────────────────────────────────────────
  if (booking.status === 'confirmed') {
    const firstTicket = booking.tickets?.[0];

    return (
      <div className="rounded-xl bg-gradient-to-b from-emerald-500/15 via-[#14181C] to-[#14181C] border border-emerald-500/40 p-4 my-3 text-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white">Booking Confirmed!</span>
              <span className="text-[10px] font-mono text-emerald-400 block">{booking.orderNumber || `Order #${booking.orderId}`}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            PAID
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-[#CBD5E1] bg-[#1C232B] p-3 rounded-lg border border-[#2E363E] mb-3">
          <p className="font-semibold text-white text-sm">{booking.eventTitle}</p>
          {booking.eventDate && <p className="text-[#949599]">📅 {booking.eventDate}</p>}
          {booking.eventVenue && <p className="text-[#949599]">📍 {booking.eventVenue}</p>}
          <div className="pt-1.5 border-t border-white/10 flex justify-between font-medium">
            <span className="text-white">{booking.quantity ? `${booking.quantity} × ` : ''}{booking.tierName || 'Pass'}</span>
            <span className="text-emerald-400 font-bold font-mono">Paid {formatCurrency(booking.total)}</span>
          </div>
        </div>

        {/* QR Code preview if available */}
        {firstTicket?.qr_code && (
          <div className="mb-3 p-3 bg-white rounded-lg flex flex-col items-center justify-center text-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(firstTicket.qr_code || firstTicket.ticket_number)}`}
              alt="Ticket QR Pass"
              className="w-28 h-28 object-contain"
            />
            <span className="mt-1 font-mono text-[11px] font-bold text-[#1C232B]">
              {firstTicket.ticket_number}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/attendee/tickets"
            onClick={onNavigate}
            className="py-2 px-3 rounded-lg bg-white hover:bg-[#CBD5E1] text-[#1C232B] text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
          >
            <span>View in My Tickets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => onShowQR?.(booking.tickets || [firstTicket])}
            className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-white/20"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Show QR Pass</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
