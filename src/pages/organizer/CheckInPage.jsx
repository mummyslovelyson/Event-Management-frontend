import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Search, Camera, QrCode, CheckCircle2, XCircle, AlertTriangle,
  UserCheck, Clock, Users, Ticket as TicketIcon,
  Volume2, VolumeX, Download, RefreshCw, Zap, VideoOff, ShieldCheck,
  Check, Play, Pause, SwitchCamera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { getOrganizerEvents } from '@/api/events';
import { getAttendees } from '@/api/organizer';
import { checkIn, checkInTicketByCode, getCheckInStats } from '@/api/tickets';
import { useAuth } from '@/context/AuthContext';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

// Helper to identify virtual/mock camera drivers (e.g. Iriun, OBS)
const isVirtualCamera = (label = '') => {
  if (!label) return false;
  const l = label.toLowerCase();
  return (
    l.includes('iriun') ||
    l.includes('obs') ||
    l.includes('virtual') ||
    l.includes('droidcam') ||
    l.includes('manycam') ||
    l.includes('camo') ||
    l.includes('vysor') ||
    l.includes('splitcam')
  );
};

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

const normalizeCheckInAttendee = (a) => {
  const isCheckedIn = Boolean(a.checked_in || a.checkedIn || a.status === 'used' || a.checkInStatus === 'checked_in' || a.checked_in_at);
  const name = a.attendee_name || a.attendeeName || a.name || 'Attendee';
  const email = a.email || a.attendeeEmail || '';
  const phone = a.phone || a.phoneNumber || '';
  const ticketType = a.ticket_type || a.ticketType || a.ticket_type_name || 'Standard Admission';
  const ticketCode = a.ticket_number || a.ticketCode || a.id;
  const seatNumber = a.seat_number || a.seatNumber || 'General Admission';
  const checkedInAt = a.checked_in_at || a.checkInTime || null;

  return {
    ...a,
    name,
    email,
    phone,
    ticketType,
    ticketCode,
    seatNumber,
    checkedIn: isCheckedIn,
    checkedInAt,
  };
};

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const paramEventId = searchParams.get('eventId') || searchParams.get('event');
  const { user, isAdmin } = useAuth();

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(paramEventId || (isAdmin ? 'all' : ''));
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [tab, setTab] = useState('scanner'); // 'scanner' | 'manual'

  // Hardware, camera devices, and audio controls
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoResume, setAutoResume] = useState(true);

  // Form & Scanning states
  const [qrInput, setQrInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { type: 'approved' | 'duplicate' | 'cancelled' | 'unauthorized' | 'invalid', ticket, message, checkedInAt }
  const [lastScannedCode, setLastScannedCode] = useState('');

  // Live Database Stats & Recent Scans (Synced across Web & Mobile)
  const [dbStats, setDbStats] = useState({ totalTickets: 0, admitted: 0, remaining: 0 });
  const [recentScans, setRecentScans] = useState([]);

  // Attendee Roster state
  const [manualQuery, setManualQuery] = useState('');
  const [checkingIn, setCheckingIn] = useState(null);
  const [attendees, setAttendees] = useState([]);

  const isProcessingRef = useRef(false);
  const scannerRef = useRef(null);
  const autoResumeTimerRef = useRef(null);

  // Fetch organizer/admin events
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await getOrganizerEvents({ limit: 100 });
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload.events || payload.data || [];
      setEvents(list);

      if (!selectedEvent) {
        if (paramEventId) {
          setSelectedEvent(paramEventId);
        } else if (isAdmin) {
          setSelectedEvent('all');
        } else if (list.length > 0) {
          setSelectedEvent(list[0].id);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEvent, paramEventId, isAdmin]);

  // Fetch true database stats & recent admissions log (shared with mobile app)
  const fetchLiveStats = useCallback(async () => {
    try {
      const params = {};
      if (selectedEvent && selectedEvent !== 'all') {
        params.eventId = selectedEvent;
      }
      const res = await getCheckInStats(params);
      if (res.data?.success && res.data?.stats) {
        setDbStats(res.data.stats);
        if (Array.isArray(res.data.recentScans)) {
          setRecentScans(res.data.recentScans);
        }
      }
    } catch (err) {
      console.warn('[CheckInPage] fetchLiveStats error:', err?.message);
    }
  }, [selectedEvent]);

  // Fetch attendees list for roster tab
  const fetchAttendees = useCallback(async () => {
    if (!selectedEvent || selectedEvent === 'all') {
      setAttendees([]);
      return;
    }
    try {
      const res = await getAttendees(selectedEvent);
      const payload = res.data;
      const rawList = Array.isArray(payload) ? payload : payload.attendees || payload.data || [];
      setAttendees(rawList.map(normalizeCheckInAttendee));
    } catch {
      setAttendees([]);
    }
  }, [selectedEvent]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchLiveStats();
    fetchAttendees();
  }, [fetchLiveStats, fetchAttendees]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    };
  }, []);

  // Compute stats prioritizing live DB numbers
  const stats = useMemo(() => {
    const total = dbStats.totalTickets > 0 ? dbStats.totalTickets : attendees.length;
    const checkedIn = dbStats.admitted > 0 ? dbStats.admitted : attendees.filter((a) => a.checkedIn).length;
    const notArrived = dbStats.remaining > 0 ? dbStats.remaining : Math.max(total - checkedIn, 0);
    const rate = total > 0 ? ((checkedIn / total) * 100).toFixed(1) : '0.0';
    return {
      total,
      checkedIn,
      notArrived,
      rate,
    };
  }, [dbStats, attendees]);

  // Clean ticket raw code from QR or manual input
  const extractCode = (raw) => {
    if (!raw) return '';
    let cleaned = String(raw).trim();

    // 1. JSON QR string
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      try {
        const obj = JSON.parse(cleaned);
        const resolved = (
          obj.ticket_number ||
          obj.ticketNumber ||
          obj.ticket_code ||
          obj.qr_code ||
          obj.qrCode ||
          obj.ticketId ||
          obj.id ||
          cleaned
        );
        if (resolved) return String(resolved).trim();
      } catch {}
    }

    // 2. Standard ticket patterns: TC-XXXXXX or TRB-XXXXXX
    const match = cleaned.match(/\b(TC-[A-Z0-9]+|TRB-[A-Z0-9-]+)\b/i);
    if (match) return match[1].toUpperCase();

    // 3. URLs
    if (cleaned.includes('/') || cleaned.includes('?')) {
      try {
        const urlStr = cleaned.startsWith('http') ? cleaned : `https://dummy.com/${cleaned.replace(/^\/+/, '')}`;
        const u = new URL(urlStr);
        const queryParam = u.searchParams.get('code') || u.searchParams.get('ticket') || u.searchParams.get('ticketNumber') || u.searchParams.get('reference');
        if (queryParam) return queryParam.trim();
        const parts = u.pathname.split('/').filter(Boolean);
        const lastPart = parts.pop();
        if (lastPart) return lastPart.split('?')[0].trim();
      } catch {
        const parts = cleaned.split('/').filter(Boolean);
        const lastPart = parts.pop() || cleaned;
        return lastPart.split('?')[0].trim();
      }
    }

    return cleaned;
  };

  const handleResetScan = () => {
    if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    setScanResult(null);
    setQrInput('');
    isProcessingRef.current = false;
  };

  // Perform ticket check-in and handle approved, duplicate, or invalid states
  const handleScan = useCallback(async (rawCode) => {
    const cleanCode = extractCode(rawCode);
    if (!cleanCode || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setScanning(true);
    setScanResult(null);
    setLastScannedCode(cleanCode);

    try {
      // 1. Direct Gate Check-In API (Atomic check & admission)
      const res = await checkInTicketByCode(cleanCode);
      const ticket = res.data?.ticket || res.data;

      // Event Scoping Guard
      if (selectedEvent && selectedEvent !== 'all' && ticket?.event_id && String(ticket.event_id) !== String(selectedEvent)) {
        setScanResult({
          type: 'unauthorized',
          ticket,
          message: `Ticket is for a different event: "${ticket.event_title || 'Other Event'}"`,
        });
        if (soundEnabled) playSound('error');
        toast.error(`Ticket belongs to "${ticket.event_title || 'Other Event'}"`);
        return;
      }

      // 🟢 SUCCESS: TICKET APPROVED & ADMITTED!
      setScanResult({
        type: 'approved',
        ticket,
        message: 'ENTRY APPROVED & ADMITTED',
        checkedInAt: new Date().toISOString(),
      });

      if (soundEnabled) playSound('success');
      toast.success(`✅ Valid Ticket — Entry Approved (${ticket.attendee_name || ticket.attendeeName || 'Guest'})`);

      // Refresh DB stats and attendee roster
      fetchLiveStats();
      fetchAttendees();

      // Auto-Resume Timer (3.5 seconds)
      if (autoResume) {
        if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = setTimeout(() => {
          handleResetScan();
        }, 3500);
      }
    } catch (err) {
      const errData = err.response?.data || {};
      const statusType = errData.status || '';
      const errMsg = errData.message || err.message || '';

      // ⚠️ DUPLICATE TICKET CHECK
      if (statusType === 'used' || errMsg.toLowerCase().includes('already used') || errMsg.toLowerCase().includes('already checked in')) {
        setScanResult({
          type: 'duplicate',
          ticket: {
            ticketNumber: errData.ticketNumber || cleanCode,
            attendeeName: errData.attendeeName || 'Registered Attendee',
            checkedInAt: errData.checkedInAt || null,
          },
          message: 'DUPLICATE TICKET — ALREADY USED',
          checkedInAt: errData.checkedInAt,
        });

        if (soundEnabled) playSound('error');
        toast.error('⚠️ Duplicate Ticket — Pass already checked in earlier');
      } else if (statusType === 'cancelled' || errMsg.toLowerCase().includes('cancelled')) {
        // ❌ CANCELLED TICKET
        setScanResult({
          type: 'cancelled',
          ticket: { ticketNumber: errData.ticketNumber || cleanCode, attendeeName: errData.attendeeName },
          message: 'CANCELLED TICKET — ENTRY DENIED',
        });

        if (soundEnabled) playSound('error');
        toast.error('❌ Cancelled Ticket — Entry Denied');
      } else if (err.response?.status === 401) {
        setScanResult({
          type: 'unauthorized',
          message: 'Session expired. Please log in again.',
        });
        if (soundEnabled) playSound('error');
        toast.error('Login session expired. Please refresh.');
      } else {
        // ❌ INVALID OR NOT FOUND
        setScanResult({
          type: 'invalid',
          ticket: { ticketNumber: cleanCode },
          message: errMsg || 'Invalid ticket pass or unrecognized QR code.',
        });

        if (soundEnabled) playSound('error');
        toast.error(errMsg || 'Invalid ticket pass');
      }
      fetchLiveStats();
    } finally {
      setScanning(false);
      setQrInput('');
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  }, [selectedEvent, soundEnabled, autoResume, fetchLiveStats, fetchAttendees]);

  // Enumerate all available camera devices & prioritize physical webcams
  const loadCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Find first physical camera (avoiding virtual webcam drivers like Iriun / OBS)
        const nonVirtual = devices.find((d) => !isVirtualCamera(d.label));
        const defaultCam = nonVirtual || devices[0];

        setSelectedCameraId((prev) => {
          if (prev && devices.some((d) => d.id === prev)) {
            const currentIsVirtual = devices.find((d) => d.id === prev && isVirtualCamera(d.label));
            if (currentIsVirtual && nonVirtual) {
              return nonVirtual.id;
            }
            return prev;
          }
          return defaultCam ? defaultCam.id : '';
        });
        return devices;
      }
    } catch (err) {
      console.warn('[CheckInCamera] Could not enumerate cameras:', err);
    }
    return [];
  }, []);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('[CheckInCamera.stop]', err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  // Start Camera QR Scanner with chosen or best physical camera
  const startCamera = async (overrideCameraId) => {
    try {
      setCameraActive(true);
      const targetId = overrideCameraId || selectedCameraId;

      setTimeout(async () => {
        const qrContainer = document.getElementById('qr-reader-video');
        if (!qrContainer) return;

        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
        }

        let activeId = targetId;
        let available = cameras;
        if (!available || available.length === 0) {
          available = await loadCameras();
        }

        // If activeId is not set, or points to a virtual driver while a physical camera exists, prefer physical
        if (!activeId || (available.some((d) => d.id === activeId && isVirtualCamera(d.label)) && available.some((d) => !isVirtualCamera(d.label)))) {
          const physical = available.find((d) => !isVirtualCamera(d.label));
          if (physical) {
            activeId = physical.id;
            setSelectedCameraId(physical.id);
          } else if (available[0]) {
            activeId = available[0].id;
            setSelectedCameraId(available[0].id);
          }
        }

        const html5QrCode = new Html5Qrcode('qr-reader-video');
        scannerRef.current = html5QrCode;

        // Pass direct camera device ID or fallback to front/user camera
        const cameraConfig = activeId ? activeId : { facingMode: 'user' };

        await html5QrCode.start(
          cameraConfig,
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

        // Re-read cameras in case granting permission populated labels
        try {
          const fresh = await Html5Qrcode.getCameras();
          if (fresh && fresh.length > 0) {
            setCameras(fresh);
          }
        } catch {}
      }, 150);
    } catch (err) {
      console.error('[CheckInCamera]', err);
      toast.error('Could not access camera. Please select a camera or use manual entry.');
      setCameraActive(false);
    }
  };

  // Switch camera live without UI breaks
  const handleCameraChange = async (newId) => {
    setSelectedCameraId(newId);
    if (cameraActive) {
      await stopCamera();
      setTimeout(() => {
        startCamera(newId);
      }, 200);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {}
      }
    };
  }, []);

  // Filtered attendees for manual search
  const filteredAttendees = useMemo(() => {
    if (!manualQuery.trim()) return attendees.slice(0, 40);
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
      toast.success(`${attendee.name || attendee.attendeeName} checked in successfully`);
      fetchLiveStats();
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
      toast.error('No attendee records to export for this event');
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

  const activeCameraInfo = cameras.find((c) => c.id === selectedCameraId);
  const isCurrentCameraVirtual = activeCameraInfo ? isVirtualCamera(activeCameraInfo.label) : false;
  const physicalCameras = cameras.filter((c) => !isVirtualCamera(c.label));

  if (loadingEvents) return <LoadingSpinner label="Loading check-in system..." className="py-20" />;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ScanLine}
        accent="emerald"
        title={isAdmin ? "Admin Gate Check-in & Scanner (Platform Boss)" : "Gate Check-in & Scanner"}
        subtitle={isAdmin ? "Platform-wide ticket verification, universal gate scanner, and live admissions across all events." : "Fast QR verification and attendee lookup for on-site admission."}
      />

      {/* Control Bar: Event Selector & Audio / Auto-resume Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121620] border border-white/[0.08] p-3.5 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">Active Event</label>
          <select
            value={selectedEvent}
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              setScanResult(null);
            }}
            className="flex-1 max-w-md px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-neutral-200 focus:outline-none focus:border-white/30 transition cursor-pointer"
          >
            {isAdmin && <option value="all" className="bg-[#121620]">⭐ All Events (Platform Global Check-In)</option>}
            {events.map((e) => (
              <option key={e.id} value={e.id} className="bg-[#121620]">{e.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto Resume Toggle */}
          <button
            onClick={() => setAutoResume(!autoResume)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              autoResume ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white'
            }`}
            title="Auto-resume next scan after 3.5 seconds"
          >
            {autoResume ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            Auto-Resume {autoResume ? 'ON' : 'OFF'}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition ${
              soundEnabled ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white'
            }`}
            title={soundEnabled ? 'Audio Chime Enabled' : 'Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchLiveStats();
              fetchAttendees();
            }}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-400 hover:text-white transition"
            title="Refresh Live Attendance"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export Button */}
          {selectedEvent !== 'all' && (
            <button
              onClick={exportCheckInCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06] transition"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Live Check-in Statistics Scoreboard (Synced with DB) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium uppercase tracking-wider">
            <Users className="w-4 h-4 text-sky-400" /> TOTAL PASSES
          </div>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">{stats.total.toLocaleString()}</p>
          <span className="text-[11px] text-neutral-500">Total registered tickets</span>
        </div>

        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium uppercase tracking-wider">
            <UserCheck className="w-4 h-4" /> ADMITTED INSIDE
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400 tabular-nums">{stats.checkedIn.toLocaleString()}</p>
          <span className="text-[11px] text-neutral-500">Scanned &amp; approved at gate</span>
        </div>

        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium uppercase tracking-wider">
            <Clock className="w-4 h-4" /> REMAINING
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-300 tabular-nums">{stats.notArrived.toLocaleString()}</p>
          <span className="text-[11px] text-neutral-500">Awaiting gate arrival</span>
        </div>

        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium uppercase tracking-wider">
            <Zap className="w-4 h-4 text-white" /> ADMISSION RATE
          </div>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">{stats.rate}%</p>
          <span className="text-[11px] text-neutral-500">{stats.rate}% of guests admitted</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
          <span>Live Gate Check-in Progress</span>
          <span className="tabular-nums font-medium text-white">{stats.checkedIn} of {stats.total} Attendees</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${Math.min(Number(stats.rate), 100)}%` }}
          />
        </div>
      </div>

      {/* Tabs: Camera Scanner vs Attendee Roster */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121620] border border-white/[0.08] w-fit">
        <button
          onClick={() => setTab('scanner')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            tab === 'scanner' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ScanLine className="w-3.5 h-3.5" /> Camera Scanner &amp; Manual Input
        </button>
        {selectedEvent !== 'all' && (
          <button
            onClick={() => setTab('manual')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              tab === 'manual' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Attendee Roster ({attendees.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Scanner Section */}
        <div className="lg:col-span-2">
          {tab === 'scanner' ? (
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5 space-y-4">
              {/* Camera Device Selector & Hardware Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider shrink-0">
                    Camera:
                  </span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="flex-1 bg-[#121620] border border-white/[0.08] text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-white/30 transition cursor-pointer"
                  >
                    {cameras.length === 0 && <option value="">Default Web Camera</option>}
                    {cameras.map((c, idx) => {
                      const isVirtual = isVirtualCamera(c.label);
                      return (
                        <option key={c.id || idx} value={c.id}>
                          {c.label || `Camera ${idx + 1}`} {isVirtual ? '⚠️ (Virtual Driver)' : '✅ (Physical Camera)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => loadCameras()}
                    className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-400 hover:text-white transition"
                    title="Refresh detected cameras"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  {cameras.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
                        const nextIndex = (currentIndex + 1) % cameras.length;
                        handleCameraChange(cameras[nextIndex].id);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-neutral-200 hover:text-white transition"
                      title="Switch to next camera"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" /> Flip Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Virtual Camera Notice */}
              {isCurrentCameraVirtual && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <div className="flex items-start sm:items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                    <span>
                      <strong>Virtual Camera ({activeCameraInfo?.label || 'Iriun'}) is active.</strong> Switch to your physical webcam if feed is blank.
                    </span>
                  </div>
                  {physicalCameras.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCameraChange(physicalCameras[0].id)}
                      className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-semibold hover:bg-amber-500/30 shrink-0 transition"
                    >
                      Switch to {physicalCameras[0].label || 'Built-in Webcam'}
                    </button>
                  )}
                </div>
              )}

              {/* Camera Scanner Viewfinder */}
              <div className="relative rounded-xl bg-white/[0.01] border-2 border-dashed border-white/10 overflow-hidden min-h-[280px] flex flex-col items-center justify-center">
                {cameraActive ? (
                  <div className="w-full flex flex-col items-center p-4">
                    <div id="qr-reader-video" className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl" />
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={stopCamera}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition"
                      >
                        <VideoOff className="w-3.5 h-3.5" /> Stop Camera
                      </button>
                      {cameras.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
                            const nextIndex = (currentIndex + 1) % cameras.length;
                            handleCameraChange(cameras[nextIndex].id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition"
                        >
                          <SwitchCamera className="w-3.5 h-3.5" /> Switch Camera
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-10 px-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-neutral-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Live Camera Scanner Ready</h3>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 mb-4">
                      Point web camera at attendee QR code on phone or printed pass for automatic gate check-in.
                    </p>
                    <button
                      onClick={() => startCamera()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition shadow"
                    >
                      <Camera className="w-3.5 h-3.5" /> Start Camera Scanner
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Code / Barcode Input */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Manual Ticket Code / Barcode Input
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
                      placeholder="Paste QR code string or enter pass number (e.g. TC-ABC123)..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
                    />
                  </div>
                  <button
                    onClick={() => handleScan(qrInput)}
                    disabled={!qrInput.trim() || scanning}
                    className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 disabled:opacity-50 transition"
                  >
                    {scanning ? 'Verifying...' : 'Check In'}
                  </button>
                </div>
              </div>

              {/* DETAILED SCAN RESULT BANNERS (Approved / Duplicate / Invalid) */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* 🟢 1. APPROVED TICKET */}
                    {scanResult.type === 'approved' && (
                      <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="text-base font-extrabold text-emerald-400">ENTRY APPROVED &amp; ADMITTED</h4>
                              <p className="text-xs text-emerald-300">Ticket pass successfully validated for entry</p>
                            </div>
                          </div>
                          <Badge variant="success" size="sm">APPROVED</Badge>
                        </div>

                        {/* Attendee Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-black/40 border border-emerald-500/20 text-xs">
                          <div>
                            <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Attendee Name</span>
                            <p className="text-sm font-bold text-white mt-0.5">
                              {scanResult.ticket?.attendee_name || scanResult.ticket?.attendeeName || 'Guest'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Pass Code</span>
                            <p className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
                              #{scanResult.ticket?.ticket_number || scanResult.ticket?.ticketNumber || lastScannedCode}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Ticket Tier</span>
                            <p className="text-xs font-semibold text-[#EFEFF1] mt-0.5">
                              {scanResult.ticket?.ticket_type || scanResult.ticket?.ticketType || 'Standard Admission'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Admitted At</span>
                            <p className="text-xs font-semibold text-[#EFEFF1] mt-0.5">
                              {new Date(scanResult.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </div>
                          {scanResult.ticket?.event_title && (
                            <div className="sm:col-span-2 pt-1 border-t border-white/5">
                              <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Event</span>
                              <p className="text-xs font-medium text-[#CBD5E1] mt-0.5 truncate">
                                {scanResult.ticket.event_title}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <button
                            onClick={handleResetScan}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-bold hover:bg-emerald-400 transition shadow"
                          >
                            <Check className="w-3.5 h-3.5" /> Scan Next Ticket
                          </button>
                          {autoResume && (
                            <span className="text-[11px] text-emerald-400/80">Auto-resuming in 3.5s...</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ⚠️ 2. DUPLICATE TICKET WARNING */}
                    {scanResult.type === 'duplicate' && (
                      <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                              <h4 className="text-base font-extrabold text-amber-400">DUPLICATE TICKET — ALREADY USED</h4>
                              <p className="text-xs text-amber-300">Entry denied: This pass was already admitted earlier</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-extrabold border border-amber-500/40">
                            FLAGGED
                          </span>
                        </div>

                        {/* Duplicate Alert Notice Box */}
                        <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>This ticket has already been admitted at the gate entrance. Do not allow duplicate entry without manager verification.</span>
                        </div>

                        {/* Attendee Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-black/40 border border-amber-500/20 text-xs">
                          <div>
                            <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Registered Attendee</span>
                            <p className="text-sm font-bold text-white mt-0.5">
                              {scanResult.ticket?.attendeeName || 'Guest'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Pass Code</span>
                            <p className="text-sm font-mono font-bold text-amber-300 mt-0.5">
                              #{scanResult.ticket?.ticketNumber || lastScannedCode}
                            </p>
                          </div>
                          {scanResult.checkedInAt && (
                            <div className="sm:col-span-2">
                              <span className="text-[#949599] font-medium uppercase text-[10px] tracking-wider">Originally Checked In At</span>
                              <p className="text-xs font-bold text-amber-400 mt-0.5">
                                {new Date(scanResult.checkedInAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <button
                            onClick={handleResetScan}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-neutral-950 text-xs font-bold hover:bg-amber-400 transition shadow"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Dismiss &amp; Scan Next Ticket
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ❌ 3. CANCELLED / UNAUTHORIZED / INVALID ERROR */}
                    {(scanResult.type === 'cancelled' || scanResult.type === 'unauthorized' || scanResult.type === 'invalid') && (
                      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                              <XCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                              <h4 className="text-base font-extrabold text-red-400">
                                {scanResult.type === 'cancelled'
                                  ? 'PASS CANCELLED'
                                  : scanResult.type === 'unauthorized'
                                    ? 'UNAUTHORIZED EVENT'
                                    : 'INVALID PASS CODE'}
                              </h4>
                              <p className="text-xs text-red-300">Entry denied at gate</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 text-xs font-extrabold border border-red-500/40">
                            DENIED
                          </span>
                        </div>

                        <p className="text-xs text-[#CBD5E1] bg-black/40 p-3 rounded-lg border border-red-500/20">
                          {scanResult.message}
                        </p>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <button
                            onClick={handleResetScan}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition shadow"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Dismiss &amp; Scan Next
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* MANUAL ATTENDEE ROSTER TAB */
            <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Filter attendees by name, email, phone, or ticket code..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
                />
              </div>

              {filteredAttendees.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredAttendees.map((a) => {
                    const checked = a.checkedIn || a.checkInStatus === 'checked_in' || a.checked_in;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="text-sm font-medium text-white truncate">{a.name || a.attendeeName}</p>
                          <p className="text-xs text-neutral-400 truncate mt-0.5">
                            {a.email || a.attendeeEmail} · {a.ticketType || a.ticket_type_name || 'Ticket'} · #{a.ticketCode || a.id}
                          </p>
                        </div>
                        {checked ? (
                          <Badge variant="success" size="sm">Checked In</Badge>
                        ) : (
                          <button
                            onClick={() => handleManualCheckIn(a)}
                            disabled={checkingIn === a.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 disabled:opacity-50 transition active:scale-95"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {checkingIn === a.id ? 'Checking In...' : 'Check In'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Search}
                  title="No attendees found"
                  description="Try searching with a different attendee name, email, or pass number."
                  className="py-12"
                />
              )}
            </div>
          )}
        </div>

        {/* Live Gate Admission Feed (Shared across Web & Mobile) */}
        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4 h-fit space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-white" /> Recent Gate Admissions
            </h3>
            {recentScans.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {recentScans.length} Live
              </span>
            )}
          </div>

          {recentScans.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 border border-dashed border-white/[0.08] rounded-lg">
              No admissions recorded for this event yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              <AnimatePresence>
                {recentScans.map((item, idx) => (
                  <motion.div
                    key={item.id || idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.08]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">
                        {item.attendee || item.name || 'Guest'}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        #{item.code || item.ticket_number} · {item.tier || 'General Admission'} {item.time ? `· ${item.time}` : ''}
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
