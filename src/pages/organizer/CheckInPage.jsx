import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Search, Camera, QrCode, CheckCircle2, XCircle, AlertTriangle,
  UserCheck, Clock, Users, ArrowRight, Ticket as TicketIcon,
  Volume2, VolumeX, Download, RefreshCw, Zap, VideoOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { getOrganizerEvents } from '@/api/events';
import { getAttendees } from '@/api/organizer';
import { checkIn, verifyTicket } from '@/api/tickets';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

// Synthesized audio feedback via Web Audio API
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
      // Pleasant double-beep chord (880Hz -> 1320Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Low warning tone (220Hz buzz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // AudioContext blocked or not supported
  }
};

const scanResultState = (type) => {
  if (type === 'success') return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Checked In Successfully' };
  if (type === 'used') return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Ticket Already Used' };
  return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Invalid / Unrecognized Ticket' };
};

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const paramEventId = searchParams.get('eventId') || searchParams.get('event');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(paramEventId || '');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [tab, setTab] = useState('scanner');

  // Scanner states
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');

  // Attendee & Log states
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [log, setLog] = useState([]);
  const [checkingIn, setCheckingIn] = useState(null);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await getOrganizerEvents({ limit: 100 });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload.events || payload.data || [];
      setEvents(list);
      if (list.length && !selectedEvent) {
        setSelectedEvent(paramEventId || list[0].id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEvent, paramEventId]);

  const fetchAttendees = useCallback(async () => {
    if (!selectedEvent) return;
    try {
      const res = await getAttendees(selectedEvent);
      const payload = res.data;
      setAttendees(Array.isArray(payload) ? payload : payload.attendees || payload.data || []);
    } catch {
      setAttendees([]);
    }
  }, [selectedEvent]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

  const stats = useMemo(() => {
    const total = attendees.length;
    const checkedIn = attendees.filter((a) => a.checkedIn || a.checkInStatus === 'checked_in' || a.checked_in).length;
    return {
      total,
      checkedIn,
      notArrived: Math.max(total - checkedIn, 0),
      rate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    };
  }, [attendees]);

  // Handle barcode / QR verification & check-in
  const handleScan = useCallback(async (code) => {
    if (!code || isProcessingRef.current) return;
    let cleanCode = String(code).trim();
    if (!cleanCode) return;

    // Parse JSON string or URL
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const obj = JSON.parse(cleanCode);
        cleanCode = obj.ticketNumber || obj.qrCode || obj.ticketId || cleanCode;
      } catch {}
    }
    if (cleanCode.includes('/verify/')) {
      cleanCode = cleanCode.split('/verify/')[1] || cleanCode;
    } else if (cleanCode.includes('?code=')) {
      cleanCode = cleanCode.split('?code=')[1].split('&')[0] || cleanCode;
    }

    isProcessingRef.current = true;
    setScanning(true);
    setScanResult(null);
    setLastScannedCode(cleanCode);

    try {
      const res = await verifyTicket(encodeURIComponent(cleanCode));
      const ticket = res.data?.ticket || res.data;

      if (!ticket || !ticket.id) {
        throw new Error('Ticket not found');
      }

      if (ticket.checkedIn || ticket.checkInStatus === 'checked_in' || ticket.checked_in) {
        setScanResult({ type: 'used', ticket });
        if (soundEnabled) playSound('error');
        toast.error('Ticket already checked in');
      } else {
        await checkIn(ticket.id || ticket.ticketId, { eventId: selectedEvent, method: 'qr' });
        setScanResult({ type: 'success', ticket });
        if (soundEnabled) playSound('success');
        toast.success(`${ticket.attendeeName || ticket.name || 'Attendee'} checked in!`);
        setLog((l) => [
          {
            name: ticket.attendeeName || ticket.name || 'Attendee',
            type: ticket.ticketType || ticket.ticket_type_name || 'General Admission',
            time: new Date(),
            status: 'success',
            code: cleanCode,
          },
          ...l,
        ].slice(0, 50));
        fetchAttendees();
      }
    } catch (err) {
      setScanResult({ type: 'invalid', ticket: null });
      if (soundEnabled) playSound('error');
      toast.error(err.response?.data?.message || 'Invalid or unrecognized ticket');
    } finally {
      setScanning(false);
      setQrInput('');
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500); // 1.5s cooldown before re-scanning the same ticket
    }
  }, [selectedEvent, soundEnabled, fetchAttendees]);

  // Start Camera QR Scanner
  const startCamera = async () => {
    try {
      setCameraActive(true);
      setTimeout(async () => {
        const qrContainer = document.getElementById('qr-reader-video');
        if (!qrContainer) return;

        if (scannerRef.current) {
          try { await scannerRef.current.stop(); } catch {}
        }

        const html5QrCode = new Html5Qrcode('qr-reader-video');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScan(decodedText);
          },
          () => {}
        );
      }, 150);
    } catch (err) {
      console.error('[CheckInCamera]', err);
      toast.error('Could not access camera. Please verify permissions or use manual entry.');
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('[CheckInCamera.stop]', err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Filtered attendees for manual search
  const filteredAttendees = useMemo(() => {
    if (!manualQuery.trim()) return attendees.slice(0, 30);
    const q = manualQuery.toLowerCase().trim();
    return attendees.filter((a) => {
      const name = (a.name || a.attendeeName || '').toLowerCase();
      const email = (a.email || a.attendeeEmail || '').toLowerCase();
      const phone = (a.phone || '').toLowerCase();
      const code = (a.ticketCode || a.ticket_code || a.id || '').toString().toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || code.includes(q);
    });
  }, [attendees, manualQuery]);

  const handleManualCheckIn = async (attendee) => {
    setCheckingIn(attendee.id);
    try {
      const ticketId = attendee.ticketId || attendee.id;
      await checkIn(ticketId, { eventId: selectedEvent, method: 'manual' });
      if (soundEnabled) playSound('success');
      toast.success(`${attendee.name || attendee.attendeeName} checked in`);
      setLog((l) => [
        {
          name: attendee.name || attendee.attendeeName,
          type: attendee.ticketType || attendee.ticket_type_name || 'Standard',
          time: new Date(),
          status: 'success',
          code: attendee.ticketCode || `#${ticketId}`,
        },
        ...l,
      ].slice(0, 50));
      fetchAttendees();
    } catch (err) {
      if (soundEnabled) playSound('error');
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(null);
    }
  };

  // Export Check-in CSV
  const exportCheckInCsv = () => {
    if (!attendees.length) {
      toast.error('No attendee records to export');
      return;
    }
    const headers = ['Attendee Name', 'Email', 'Phone', 'Ticket Tier', 'Status', 'Checked In Time'];
    const rows = attendees.map((a) => [
      `"${a.name || a.attendeeName || 'N/A'}"`,
      `"${a.email || a.attendeeEmail || 'N/A'}"`,
      `"${a.phone || 'N/A'}"`,
      `"${a.ticketType || a.ticket_type_name || 'Standard'}"`,
      a.checkedIn || a.checkInStatus === 'checked_in' || a.checked_in ? 'Checked In' : 'Not Arrived',
      a.checkedInAt || a.checked_in_at ? `"${new Date(a.checkedInAt || a.checked_in_at).toLocaleString()}"` : 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gate_checkin_export_${selectedEvent || 'event'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Gate check-in list exported to CSV');
  };

  if (loadingEvents) return <LoadingSpinner label="Loading events..." className="py-20" />;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ScanLine}
        accent="emerald"
        title="Gate Check-in & Scanner"
        subtitle="Fast QR verification and attendee lookup for on-site admission."
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171A1D] border border-[#262B2F] p-4 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Active Event</label>
          <select
            value={selectedEvent}
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              setScanResult(null);
            }}
            className="flex-1 max-w-md px-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer"
          >
            <option value="">Select event to scan for...</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-lg border transition ${soundEnabled ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-[#1C232B] border-[#494F55]/40 text-[#949599]'}`}
            title={soundEnabled ? 'Audio Feedback Active' : 'Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={fetchAttendees}
            className="p-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-[#EFEFF1] hover:text-white transition"
            title="Refresh Attendance Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCheckInCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-xs font-semibold text-[#EFEFF1] hover:border-white/40 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
          <div className="flex items-center gap-2 text-xs text-[#949599] uppercase tracking-wider"><Users className="w-4 h-4" /> Total Sold</div>
          <p className="mt-2 text-2xl font-bold text-[#EFEFF1]">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-[#171A1D] border border-emerald-500/30 p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 uppercase tracking-wider"><UserCheck className="w-4 h-4" /> Admitted Inside</div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{stats.checkedIn}</p>
        </div>
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
          <div className="flex items-center gap-2 text-xs text-[#949599] uppercase tracking-wider"><Clock className="w-4 h-4" /> Pending Entry</div>
          <p className="mt-2 text-2xl font-bold text-[#EFEFF1]">{stats.notArrived}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/10 to-[#171A1D] border border-white/20 p-4">
          <div className="flex items-center gap-2 text-xs text-white uppercase tracking-wider"><Zap className="w-4 h-4" /> Turnout Rate</div>
          <p className="mt-2 text-2xl font-bold text-[#EFEFF1]">{stats.rate}%</p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
        <div className="flex items-center justify-between text-xs text-[#949599] mb-2">
          <span>Gate Check-in Progress</span>
          <span className="tabular-nums font-semibold text-[#EFEFF1]">{stats.checkedIn} of {stats.total} Attendees</span>
        </div>
        <div className="h-2.5 rounded-full bg-[#494F55]/30 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-white to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${stats.rate}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#171A1D] border border-[#262B2F] w-fit">
        <button onClick={() => setTab('scanner')} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${tab === 'scanner' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'}`}>
          <ScanLine className="w-4 h-4" /> Camera Scanner
        </button>
        <button onClick={() => setTab('manual')} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${tab === 'manual' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'}`}>
          <Search className="w-4 h-4" /> Attendee Roster ({attendees.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main panel */}
        <div className="lg:col-span-2">
          {tab === 'scanner' ? (
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-6 space-y-5">
              {/* Camera Scanner View */}
              <div className="relative rounded-xl bg-[#14181C] border-2 border-dashed border-[#494F55]/40 overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
                {cameraActive ? (
                  <div className="w-full flex flex-col items-center p-4">
                    <div id="qr-reader-video" className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl" />
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={stopCamera}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold hover:bg-red-500/30 transition"
                      >
                        <VideoOff className="w-3.5 h-3.5" /> Stop Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-8 h-8 text-[#949599]" />
                    </div>
                    <h3 className="text-base font-semibold text-[#EFEFF1]">Live Camera Scanner Ready</h3>
                    <p className="text-xs text-[#949599] max-w-sm mx-auto mt-1 mb-5">
                      Point camera at attendee digital ticket QR code on phone or printed pass for automatic check-in.
                    </p>
                    <button
                      onClick={startCamera}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition shadow-lg"
                    >
                      <Camera className="w-4 h-4" /> Start Camera Scanner
                    </button>
                  </div>
                )}
              </div>

              {/* Paste code */}
              <div>
                <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Manual Code / Barcode Input</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                    <input
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
                      placeholder="Paste QR code string or enter ticket code..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
                    />
                  </div>
                  <button
                    onClick={() => handleScan(qrInput)}
                    disabled={!qrInput.trim() || scanning}
                    className="px-5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition shadow-md"
                  >
                    {scanning ? 'Verifying...' : 'Verify Ticket'}
                  </button>
                </div>
              </div>

              {/* Scan result banner */}
              <AnimatePresence>
                {scanResult && (() => {
                  const st = scanResultState(scanResult.type);
                  const t = scanResult.ticket;
                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`rounded-xl border p-5 ${st.bg} ${st.border}`}>
                      <div className="flex items-start gap-3.5">
                        <st.icon className={`w-7 h-7 ${st.color} shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-base font-bold ${st.color}`}>{st.label}</p>
                          {t ? (
                            <div className="mt-2 space-y-1 text-sm bg-black/20 p-3 rounded-lg border border-white/5">
                              <p className="text-white font-semibold">{t.attendeeName || t.name || t.user?.name || 'Attendee'}</p>
                              <p className="text-[#949599] text-xs">
                                Tier: <span className="text-[#EFEFF1]">{t.ticketType || t.ticket_type_name || 'Standard'}</span> · Seat: <span className="text-[#EFEFF1]">{t.seatNumber || 'General Admission'}</span>
                              </p>
                              {t.email && <p className="text-[#949599] text-xs">Email: {t.email}</p>}
                            </div>
                          ) : (
                            <p className="text-sm text-[#949599] mt-1">This ticket code is not registered for this event.</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-6 space-y-5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                <input
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Filter attendees by name, email, phone, or ticket code..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
                />
              </div>

              {filteredAttendees.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredAttendees.map((a) => {
                    const checked = a.checkedIn || a.checkInStatus === 'checked_in' || a.checked_in;
                    return (
                      <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 transition">
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-semibold text-[#EFEFF1] truncate">{a.name || a.attendeeName}</p>
                          <p className="text-xs text-[#949599] truncate mt-0.5">
                            {a.email || a.attendeeEmail} · {a.ticketType || a.ticket_type_name || 'Ticket'}
                          </p>
                        </div>
                        {checked ? (
                          <Badge variant="success" size="sm">Checked In</Badge>
                        ) : (
                          <button
                            onClick={() => handleManualCheckIn(a)}
                            disabled={checkingIn === a.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-xs font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition shadow"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> {checkingIn === a.id ? 'Checking In...' : 'Check In'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Search} title="No attendees found" description="Try searching with a different name, email, or ticket code." className="py-12" />
              )}
            </div>
          )}
        </div>

        {/* Live Gate Admission Feed */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 h-fit space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#EFEFF1] flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-white" /> Recent Gate Admissions
            </h3>
            {log.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {log.length} Logged
              </span>
            )}
          </div>

          {log.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#949599] border border-dashed border-[#262B2F] rounded-lg">
              No admissions logged in this session yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              <AnimatePresence>
                {log.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 p-3 rounded-xl bg-[#1C232B] border border-[#262B2F]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#EFEFF1] truncate">{l.name}</p>
                      <p className="text-[11px] text-[#949599]">
                        {l.type} · {l.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
