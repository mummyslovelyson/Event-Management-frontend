import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2, CheckCircle2, XCircle, ArrowLeft, TicketCheck, RefreshCw,
  Download, Printer, Calendar, Copy, Check, ExternalLink, Sparkles, MapPin, Clock, FileText,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { verifyPayment } from '@/api/orders';
import Logo from '@/components/common/Logo';
import { downloadTicketPassAsImage, printTicketPass } from '@/components/tickets/TicketPass';
import { getGoogleCalendarUrl, downloadIcsFile } from '@/utils/calendar';

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [orderId, setOrderId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [eventData, setEventData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const navigate = useNavigate();

  const runVerification = useCallback(async () => {
    if (!reference) {
      setStatus('error');
      return;
    }

    setStatus('verifying');

    let attempts = 0;
    const maxAttempts = 5;

    const attemptVerify = async () => {
      attempts++;
      try {
        const res = await verifyPayment({ reference });
        const paymentStatus = res.data?.status;

        if (paymentStatus === 'success') {
          setOrderId(res.data?.orderId || null);
          setTickets(res.data?.tickets || []);
          setEventData(res.data?.event || null);
          setOrderData(res.data?.order || null);
          setStatus('success');
          return true;
        }

        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          return attemptVerify();
        }

        setStatus('error');
        return false;
      } catch (err) {
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          return attemptVerify();
        }
        setStatus('error');
        return false;
      }
    };

    attemptVerify();
  }, [reference]);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  const copyTicketCode = (code) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Ticket code copied!');
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleDownloadPass = async (ticket) => {
    setDownloadingId(ticket.id || ticket.ticketNumber);
    try {
      toast.loading('Generating official ticket pass...', { id: 'download-pass' });
      await downloadTicketPassAsImage(ticket);
      toast.success('Ticket pass downloaded successfully!', { id: 'download-pass' });
    } catch (err) {
      toast.error('Could not download pass image: ' + err.message, { id: 'download-pass' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrintTicket = (ticket) => {
    printTicketPass({
      ...ticket,
      event: ticket.event || eventData,
    });
  };

  const fmtEventDate = (d) => {
    if (!d) return 'Date TBA';
    try {
      return new Date(d).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return String(d);
    }
  };

  return (
    <div className="min-h-screen bg-[#141A1F] text-[#EFEFF1] py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        {/* Top Header Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <Logo size="lg" showText={false} />
          <h1 className="text-2xl font-bold mt-3">Payment &amp; Ticket Center</h1>
          <p className="text-sm text-[#949599] mt-0.5">Secure payment confirmation &amp; digital passes</p>
        </div>

        {/* ── Status 1: Verifying ── */}
        {status === 'verifying' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-[#1C232B] border border-[#494F55]/40 rounded-2xl p-8 text-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-[#EFEFF1]">Confirming Your Payment</h2>
            <p className="mt-2 text-sm text-[#949599]">
              Connecting with the payment gateway to finalize your order and issue your digital tickets...
            </p>
          </motion.div>
        )}

        {/* ── Status 2: Success (View Tickets) ── */}
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#1C232B] to-[#1C232B] border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                        Payment Verified
                      </span>
                      {orderData?.reference && (
                        <span className="text-xs text-[#949599]">
                          Ref: <span className="font-mono text-white">{orderData.reference}</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-white mt-1">Payment Successful!</h2>
                    <p className="text-sm text-[#949599] mt-0.5">
                      Your admission tickets and QR codes are ready below. Show them at the entrance.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-2 sm:pt-0">
                  <Link
                    to="/attendee/tickets"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition shadow-md"
                  >
                    <TicketCheck className="w-4 h-4" /> Go to My Tickets
                  </Link>
                  <Link
                    to="/attendee/bookings"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242B32] border border-[#494F55]/60 text-sm font-medium hover:bg-[#2C343D] transition"
                  >
                    View Receipt
                  </Link>
                </div>
              </div>

              {/* Event Metadata strip if available */}
              {eventData && (
                <div className="mt-6 pt-5 border-t border-[#494F55]/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#949599]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate font-semibold text-white">{eventData.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{fmtEventDate(eventData.startDate)} {eventData.startTime ? `at ${eventData.startTime}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="truncate">{eventData.venue || eventData.location || 'Accra, Ghana'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tickets Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TicketCheck className="w-5 h-5 text-amber-400" />
                  Your Digital Admission Tickets ({tickets.length})
                </h3>
                {eventData && (
                  <div className="flex items-center gap-2 text-xs">
                    <a
                      href={getGoogleCalendarUrl(eventData)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Add to Google Calendar
                    </a>
                  </div>
                )}
              </div>

              {tickets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map((t, idx) => {
                    const ticketEvent = t.event || eventData || {};
                    const isDownloading = downloadingId === (t.id || t.ticketNumber);

                    return (
                      <div
                        key={t.id || idx}
                        className="bg-[#1C232B] border border-[#494F55]/50 rounded-2xl p-5 shadow-xl hover:border-amber-400/50 transition duration-200 flex flex-col justify-between"
                      >
                        {/* Ticket Header */}
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/15 text-amber-300 border border-amber-400/30">
                                {t.ticketType || 'Standard Entry'}
                              </span>
                              <h4 className="text-base font-bold text-white mt-1.5 line-clamp-1">
                                {ticketEvent.title || 'Event Pass'}
                              </h4>
                              <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                <span className="truncate">{ticketEvent.venue || 'Venue TBA'}</span>
                              </p>
                            </div>

                            {/* Live QR Code with high-contrast scanning card */}
                            <div className="bg-white p-2 rounded-xl shrink-0 shadow-lg border border-white">
                              <QRCodeSVG
                                value={t.qrCode || t.ticketNumber || `TC-${t.id}`}
                                size={96}
                                level="M"
                                includeMargin={false}
                              />
                            </div>
                          </div>

                          {/* Ticket Details & Code */}
                          <div className="bg-[#161D22] border border-[#494F55]/30 rounded-xl p-3 my-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-[#949599]">Ticket Code</span>
                              <button
                                onClick={() => copyTicketCode(t.ticketNumber)}
                                className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1 font-mono font-bold"
                                title="Click to copy code"
                              >
                                {copiedCode === t.ticketNumber ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <span>#{t.ticketNumber}</span>
                                    <Copy className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-xs text-[#949599]">
                              <span>Attendee</span>
                              <span className="text-white font-medium">{t.attendeeName || 'Guest Attendee'}</span>
                            </div>
                            {t.seat && (
                              <div className="flex items-center justify-between text-xs text-[#949599] mt-1">
                                <span>Seat / Section</span>
                                <span className="text-amber-300 font-semibold">{t.seat}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ticket Action Buttons */}
                        <div className="pt-2 border-t border-[#494F55]/30 space-y-2">
                          {t.ticketFileUrl && (
                            <a
                              href={t.ticketFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={t.ticketFileName || 'Official-Ticket-Pass'}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-400/20 hover:from-amber-500/30 hover:to-amber-400/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5" /> Download Organizer's Pass ({t.ticketFileName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'File'})
                            </a>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleDownloadPass(t)}
                              disabled={isDownloading}
                              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                            >
                              {isDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              Save Pass Image
                            </button>
                            <button
                              onClick={() => handlePrintTicket(t)}
                              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#242B32] hover:bg-[#2C343D] text-white text-xs font-semibold border border-[#494F55]/50 transition"
                            >
                              <Printer className="w-3.5 h-3.5 text-cyan-400" />
                              Print Pass
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#1C232B] border border-[#494F55]/40 rounded-2xl p-8 text-center">
                  <TicketCheck className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-white">Your Tickets are Ready</h4>
                  <p className="text-sm text-[#949599] mt-1 max-w-md mx-auto">
                    You can view all your ticket passes, QR codes, and booking receipts anytime in your attendee account.
                  </p>
                  <div className="mt-5">
                    <Link
                      to="/attendee/tickets"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition shadow-md"
                    >
                      <TicketCheck className="w-4 h-4" /> Open My Tickets
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-sm text-[#949599]">
              <Link to="/explore" className="inline-flex items-center gap-1.5 hover:text-white transition">
                <ArrowLeft className="w-4 h-4" /> Explore More Events
              </Link>
              <div className="flex items-center gap-4 text-xs">
                <Link to="/attendee/dashboard" className="hover:text-white transition">
                  Attendee Dashboard
                </Link>
                <span>&bull;</span>
                <Link to="/contact" className="hover:text-white transition">
                  Need Help? Contact Support
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Status 3: Error ── */}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-[#1C232B] border border-[#494F55]/40 rounded-2xl p-8 text-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-[#EFEFF1]">Payment Verification Pending</h2>
            <p className="mt-2 text-sm text-[#949599]">
              {reference
                ? 'We could not confirm your payment yet. If your Mobile Money or Card was debited, your tickets will be available shortly in My Tickets.'
                : 'No payment reference was found in the URL. Please verify your transaction reference.'}
            </p>

            <div className="mt-6 space-y-3">
              {reference && (
                <button
                  onClick={() => runVerification()}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition shadow-md"
                >
                  <RefreshCw className="w-4 h-4" /> Retry Confirmation
                </button>
              )}
              <Link
                to="/attendee/tickets"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#242B32] border border-[#494F55]/50 text-[#EFEFF1] text-sm font-semibold hover:bg-[#2C343D] transition"
              >
                <TicketCheck className="w-4 h-4" /> Check My Tickets
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-[#494F55]/50 text-[#EFEFF1] text-sm font-medium hover:border-white/40 transition"
              >
                Browse Events
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
