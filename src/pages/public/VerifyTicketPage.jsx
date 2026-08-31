import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, ScanLine, Search, CheckCircle2, XCircle, AlertTriangle,
  Camera, VideoOff, RefreshCw, ShieldCheck, MapPin, Calendar, Clock,
  UserCheck, Ticket as TicketIcon, ArrowRight, Sparkles, Volume2, VolumeX,
  ExternalLink, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { verifyTicket, checkIn } from '@/api/tickets';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';

// Audio feedback helper
const playSound = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {}
};

export default function VerifyTicketPage() {
  const { code: routeCode } = useParams();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code') || searchParams.get('ticket') || routeCode || '';
  const { user, isAuthenticated } = useAuth();
  const { format } = useCurrency();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(queryCode);
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [result, setResult] = useState(null); // { valid, canCheckIn, isOrganizerOrStaff, ticket, error }
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [recentScans, setRecentScans] = useState([]);

  const scannerRef = useRef(null);
  const isScanningBusyRef = useRef(false);

  // Perform ticket verification API call
  const handleVerify = useCallback(async (codeToVerify) => {
    if (!codeToVerify || isScanningBusyRef.current) return;
    let cleanCode = String(codeToVerify).trim();
    if (!cleanCode) return;

    // Parse JSON QR payload if necessary
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const obj = JSON.parse(cleanCode);
        cleanCode = obj.ticketNumber || obj.qrCode || obj.ticketId || cleanCode;
      } catch {}
    }
    // Parse URL parameter if necessary
    if (cleanCode.includes('/verify/')) {
      cleanCode = cleanCode.split('/verify/')[1] || cleanCode;
    } else if (cleanCode.includes('?code=')) {
      cleanCode = cleanCode.split('?code=')[1].split('&')[0] || cleanCode;
    }

    isScanningBusyRef.current = true;
    setVerifying(true);
    setResult(null);

    try {
      const res = await verifyTicket(encodeURIComponent(cleanCode));
      const data = res.data;
      setResult(data);

      if (data.ticket?.status === 'active') {
        if (soundEnabled) playSound('success');
        toast.success('Valid Ticket Verified!');
      } else if (data.ticket?.status === 'used') {
        if (soundEnabled) playSound('error');
        toast('Ticket has already been checked in', { icon: '⚠️' });
      }

      setRecentScans((prev) => [
        {
          code: cleanCode,
          ticketNumber: data.ticket?.ticketNumber || cleanCode,
          attendeeName: data.ticket?.attendeeName || 'Attendee',
          eventTitle: data.ticket?.event?.title || 'Event',
          status: data.ticket?.status || 'unknown',
          time: new Date(),
        },
        ...prev.filter((p) => p.code !== cleanCode),
      ].slice(0, 10));
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or unrecognized ticket';
      setResult({ valid: false, error: msg, ticket: null });
      if (soundEnabled) playSound('error');
      toast.error(msg);
    } finally {
      setVerifying(false);
      setTimeout(() => {
        isScanningBusyRef.current = false;
      }, 1200);
    }
  }, [soundEnabled]);

  // Check in the attendee
  const handleCheckInNow = async () => {
    if (!result?.ticket?.id) return;
    setCheckingIn(true);
    try {
      await checkIn(result.ticket.id, { method: 'qr' });
      toast.success(`${result.ticket.attendeeName} checked in successfully!`);
      if (soundEnabled) playSound('success');
      // Update local state to show 'used'
      setResult((prev) => prev ? ({
        ...prev,
        canCheckIn: false,
        ticket: {
          ...prev.ticket,
          status: 'used',
          checkedIn: true,
          checkedInAt: new Date().toISOString(),
        },
      }) : null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in ticket');
      if (soundEnabled) playSound('error');
    } finally {
      setCheckingIn(false);
    }
  };

  // Run on mount if code query parameter exists
  useEffect(() => {
    if (queryCode) {
      handleVerify(queryCode);
    }
  }, [queryCode, handleVerify]);

  // Camera start / stop lifecycle
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    await stopCamera();
    try {
      const html5QrCode = new Html5Qrcode('qr-verify-reader');
      scannerRef.current = html5QrCode;
      setCameraActive(true);

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode },
        config,
        (decodedText) => {
          if (decodedText && !isScanningBusyRef.current) {
            handleVerify(decodedText);
          }
        },
        () => {} // ignore frame errors
      );
    } catch (err) {
      console.error('[Camera Error]', err);
      toast.error('Could not access camera. Please allow camera permissions.');
      setCameraActive(false);
    }
  }, [facingMode, handleVerify, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-[#0F1215] text-[#EFEFF1] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Official Ticket Verification
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Verify &amp; Validate Tickets
          </h1>
          <p className="text-xs sm:text-sm text-[#949599] max-w-lg mx-auto">
            Scan attendee QR code or enter ticket serial number to verify authenticity and check in guests in real time.
          </p>
        </div>

        {/* Action Controls & Scanner Box */}
        <div className="rounded-2xl bg-[#161D22] border border-[#262B2F] overflow-hidden shadow-2xl p-5 sm:p-6 space-y-5">
          
          {/* Top Bar Options */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#262B2F]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (cameraActive) stopCamera();
                  else startCamera();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  cameraActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-white text-[#1C232B] hover:bg-[#CBD5E1] shadow-md'
                }`}
              >
                {cameraActive ? <VideoOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                {cameraActive ? 'Stop Camera' : 'Scan with Camera'}
              </button>

              {cameraActive && (
                <button
                  onClick={() => {
                    setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'));
                    startCamera();
                  }}
                  className="p-2 rounded-xl bg-[#1C232B] border border-[#262B2F] text-[#949599] hover:text-white transition"
                  title="Switch Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setSoundEnabled((s) => !s)}
              className="p-2 rounded-xl bg-[#1C232B] border border-[#262B2F] text-[#949599] hover:text-white transition"
              title={soundEnabled ? 'Mute sound feedback' : 'Enable sound feedback'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-[#494F55]" />}
            </button>
          </div>

          {/* Camera Scanner Viewport */}
          {cameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-amber-500/40 p-2">
              <div id="qr-verify-reader" className="w-full h-auto overflow-hidden rounded-xl" />
              <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[11px] text-amber-300 font-bold border border-amber-500/30 shadow-lg">
                  Point camera at ticket QR code
                </span>
              </div>
            </div>
          )}

          {/* Manual Entry Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(inputCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter Ticket # (e.g. TC-00012345) or paste QR code..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1C232B] border border-[#262B2F] text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-amber-400/50 transition font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={verifying || !inputCode.trim()}
              className="px-6 py-3 rounded-xl bg-amber-500 text-[#1C232B] font-bold text-sm hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0 flex items-center gap-2"
            >
              {verifying ? <LoadingSpinner size="sm" /> : <Search className="w-4 h-4" />}
              <span>Verify</span>
            </button>
          </form>
        </div>

        {/* Verification Result Card */}
        <AnimatePresence mode="wait">
          {verifying ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-8 rounded-2xl bg-[#161D22] border border-[#262B2F] flex flex-col items-center justify-center gap-3 text-center"
            >
              <LoadingSpinner size="lg" />
              <p className="text-sm font-semibold text-white">Validating QR Code &amp; Security Signature...</p>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-2xl border p-6 sm:p-8 space-y-6 shadow-2xl ${
                result.valid && result.ticket?.status === 'active'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : result.ticket?.status === 'used'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      result.valid && result.ticket?.status === 'active'
                        ? 'bg-emerald-500 text-[#1C232B]'
                        : result.ticket?.status === 'used'
                        ? 'bg-amber-500 text-[#1C232B]'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {result.valid && result.ticket?.status === 'active' ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : result.ticket?.status === 'used' ? (
                      <AlertTriangle className="w-7 h-7" />
                    ) : (
                      <XCircle className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {result.valid && result.ticket?.status === 'active'
                        ? 'VALID TICKET'
                        : result.ticket?.status === 'used'
                        ? 'TICKET ALREADY USED'
                        : 'INVALID TICKET'}
                    </h2>
                    <p className="text-xs text-[#949599] mt-0.5">
                      {result.valid && result.ticket?.status === 'active'
                        ? 'Authentic pass verified against database'
                        : result.ticket?.status === 'used'
                        ? `Checked in on ${result.ticket.checkedInAt ? new Date(result.ticket.checkedInAt).toLocaleString() : 'earlier'}`
                        : result.error || 'This QR code does not match any active ticket'}
                    </p>
                  </div>
                </div>

                {result.ticket && (
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-mono font-bold text-amber-300">
                      #{result.ticket.ticketNumber}
                    </span>
                    <p className="text-xs text-[#949599]">Serial Number</p>
                  </div>
                )}
              </div>

              {/* Ticket & Event Details */}
              {result.ticket && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Attendee & Pass Info */}
                  <div className="space-y-4 rounded-xl bg-[#1C232B]/80 border border-white/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-[#949599]">Attendee Name</p>
                        <p className="text-base font-bold text-white">{result.ticket.attendeeName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-[#949599] block">Ticket Tier</span>
                        <span className="font-bold text-amber-300 text-sm">{result.ticket.ticketType}</span>
                      </div>
                      <div>
                        <span className="text-[#949599] block">Assigned Seat</span>
                        <span className="font-bold text-white text-sm">{result.ticket.seatNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Event Information */}
                  <div className="space-y-4 rounded-xl bg-[#1C232B]/80 border border-white/10 p-4">
                    <div>
                      <p className="text-xs text-[#949599]">Event</p>
                      <h3 className="text-base font-bold text-white line-clamp-1">{result.ticket.event?.title}</h3>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#CBD5E1]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{result.ticket.event?.startDate ? new Date(result.ticket.event.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{result.ticket.event?.venue}{result.ticket.event?.city ? `, ${result.ticket.event.city}` : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Check-In Action Button for Organizers/Staff */}
              {result.canCheckIn && (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/30 p-4 rounded-xl border border-white/10">
                  <div className="text-xs text-[#949599]">
                    <span className="text-white font-semibold">Organizer / Staff Controls:</span> Ready to admit this guest into the venue.
                  </div>
                  <button
                    onClick={handleCheckInNow}
                    disabled={checkingIn}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 text-[#1C232B] font-black text-sm hover:bg-emerald-400 transition shadow-lg flex items-center justify-center gap-2 shrink-0"
                  >
                    {checkingIn ? <LoadingSpinner size="sm" /> : <UserCheck className="w-4 h-4" />}
                    <span>Check In Guest Now</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Recent Session Scans */}
        {recentScans.length > 0 && (
          <div className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#949599] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Recent Scans ({recentScans.length})
            </h3>
            <div className="space-y-2">
              {recentScans.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleVerify(s.code)}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/30 cursor-pointer transition text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{s.attendeeName}</p>
                    <p className="text-[#949599] font-mono text-[11px]">#{s.ticketNumber}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : s.status === 'used'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {s.status.toUpperCase()}
                    </span>
                    <p className="text-[10px] text-[#494F55] mt-0.5">{new Date(s.time).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
