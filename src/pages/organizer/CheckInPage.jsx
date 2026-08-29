import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Search, Camera, QrCode, CheckCircle2, XCircle, AlertTriangle,
  UserCheck, Clock, Users, ArrowRight, Ticket as TicketIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents } from '@/api/events';
import { getAttendees } from '@/api/organizer';
import { checkIn, verifyTicket } from '@/api/tickets';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const scanResultState = (type) => {
  if (type === 'success') return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Checked In' };
  if (type === 'used') return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Already Used' };
  return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Invalid Ticket' };
};

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const paramEventId = searchParams.get('eventId') || searchParams.get('event');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(paramEventId || '');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [tab, setTab] = useState('scanner');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [log, setLog] = useState([]);
  const [checkingIn, setCheckingIn] = useState(null);

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
    } catch { setAttendees([]); }
  }, [selectedEvent]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

  const stats = useMemo(() => {
    const total = attendees.length;
    const checkedIn = attendees.filter((a) => a.checkedIn || a.checkInStatus === 'checked_in').length;
    return { total, checkedIn, notArrived: total - checkedIn, rate: total > 0 ? Math.round((checkedIn / total) * 100) : 0 };
  }, [attendees]);

  const handleScan = async (code) => {
    if (!code) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await verifyTicket(code);
      const ticket = res.data?.ticket || res.data;
      if (ticket?.checkedIn || ticket?.checkInStatus === 'checked_in') {
        setScanResult({ type: 'used', ticket });
        toast.error('Ticket already used');
      } else {
        await checkIn(ticket.id || ticket.ticketId, { eventId: selectedEvent, method: 'qr' });
        setScanResult({ type: 'success', ticket });
        toast.success(`${ticket.attendeeName || 'Attendee'} checked in`);
        setLog((l) => [{ name: ticket.attendeeName, type: ticket.ticketType, time: new Date(), status: 'success' }, ...l].slice(0, 20));
        fetchAttendees();
      }
    } catch (err) {
      setScanResult({ type: 'invalid', ticket: null });
      toast.error(err.response?.data?.message || 'Invalid ticket');
    } finally {
      setScanning(false);
      setQrInput('');
    }
  };

  const handleManualSearch = async () => {
    if (!manualQuery.trim()) return;
    setSearching(true);
    try {
      const res = await getAttendees(selectedEvent, { search: manualQuery });
      const payload = res.data;
      setManualResults(Array.isArray(payload) ? payload : payload.attendees || payload.data || []);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleManualCheckIn = async (attendee) => {
    setCheckingIn(attendee.id);
    try {
      const ticketId = attendee.ticketId || attendee.id;
      await checkIn(ticketId, { eventId: selectedEvent, method: 'manual' });
      toast.success(`${attendee.name || attendee.attendeeName} checked in`);
      setLog((l) => [{ name: attendee.name || attendee.attendeeName, type: attendee.ticketType, time: new Date(), status: 'success' }, ...l].slice(0, 20));
      handleManualSearch();
      fetchAttendees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(null);
    }
  };

  if (loadingEvents) return <LoadingSpinner label="Loading events..." className="py-20" />;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ScanLine}
        accent="emerald"
        title="Check-in"
        subtitle="Scan QR codes or search manually to check in attendees."
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-[#949599]">Event</label>
        <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="flex-1 max-w-md px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer">
          <option value="">Choose event...</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      {/* Attendance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
          <div className="flex items-center gap-2 text-xs text-[#949599] uppercase tracking-wider"><Users className="w-4 h-4" /> Expected</div>
          <p className="mt-2 text-xl font-bold text-[#EFEFF1]">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-[#171A1D] border border-emerald-500/30 p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400 uppercase tracking-wider"><UserCheck className="w-4 h-4" /> Checked In</div>
          <p className="mt-2 text-xl font-bold text-emerald-400">{stats.checkedIn}</p>
        </div>
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
          <div className="flex items-center gap-2 text-xs text-[#949599] uppercase tracking-wider"><Clock className="w-4 h-4" /> Not Arrived</div>
          <p className="mt-2 text-xl font-bold text-[#EFEFF1]">{stats.notArrived}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/10 to-[#171A1D] border border-white/20 p-4">
          <div className="flex items-center gap-2 text-xs text-white uppercase tracking-wider"><UserCheck className="w-4 h-4" /> Check-in Rate</div>
          <p className="mt-2 text-xl font-bold text-[#EFEFF1]">{stats.rate}%</p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
        <div className="flex items-center justify-between text-xs text-[#949599] mb-2">
          <span>Attendance Progress</span>
          <span className="tabular-nums">{stats.checkedIn}/{stats.total}</span>
        </div>
        <div className="h-2.5 rounded-full bg-[#494F55]/30 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-white to-emerald-400 rounded-full transition-all" style={{ width: `${stats.rate}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#171A1D] border border-[#262B2F] w-fit">
        <button onClick={() => setTab('scanner')} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${tab === 'scanner' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'}`}>
          <ScanLine className="w-4 h-4" /> QR Scanner
        </button>
        <button onClick={() => setTab('manual')} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${tab === 'manual' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'}`}>
          <Search className="w-4 h-4" /> Manual Search
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main panel */}
        <div className="lg:col-span-2">
          {tab === 'scanner' ? (
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-6 space-y-5">
              {/* Camera placeholder */}
              <div className="relative aspect-video rounded-xl bg-[#1C232B] border-2 border-dashed border-[#494F55]/40 flex flex-col items-center justify-center overflow-hidden">
                {cameraOpen ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    <div className="w-48 h-48 border-2 border-white/30 rounded-xl relative">
                      <div className="absolute -top-px -left-px w-6 h-6 border-t-4 border-l-4 border-white/30 rounded-tl-lg" />
                      <div className="absolute -top-px -right-px w-6 h-6 border-t-4 border-r-4 border-white/30 rounded-tr-lg" />
                      <div className="absolute -bottom-px -left-px w-6 h-6 border-b-4 border-l-4 border-white/30 rounded-bl-lg" />
                      <div className="absolute -bottom-px -right-px w-6 h-6 border-b-4 border-r-4 border-white/30 rounded-br-lg" />
                      <motion.div animate={{ y: [0, 180, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-x-2 h-0.5 bg-white shadow-[0_0_8px_#EFEFF1]" />
                    </div>
                    <p className="absolute bottom-4 text-sm text-[#949599]">Scanning...</p>
                  </div>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-[#494F55] mb-3" />
                    <p className="text-sm text-[#949599]">Camera scanner is ready</p>
                    <button onClick={() => setCameraOpen(true)} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition">
                      <Camera className="w-4 h-4" /> Open Camera Scanner
                    </button>
                  </>
                )}
              </div>

              {/* Paste code */}
              <div>
                <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Or paste QR code for testing</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                    <input value={qrInput} onChange={(e) => setQrInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)} placeholder="Enter ticket code..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition" />
                  </div>
                  <button onClick={() => handleScan(qrInput)} disabled={!qrInput || scanning} className="px-4 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition">
                    {scanning ? 'Scanning...' : 'Verify'}
                  </button>
                </div>
              </div>

              {/* Scan result */}
              <AnimatePresence>
                {scanResult && (() => {
                  const st = scanResultState(scanResult.type);
                  const t = scanResult.ticket;
                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`rounded-xl border p-5 ${st.bg} ${st.border}`}>
                      <div className="flex items-center gap-3">
                        <st.icon className={`w-8 h-8 ${st.color}`} />
                        <div>
                          <p className={`text-lg font-bold ${st.color}`}>{st.label}</p>
                          {t ? (
                            <div className="mt-1 space-y-0.5 text-sm">
                              <p className="text-[#EFEFF1]">{t.attendeeName || t.user?.name || 'Attendee'}</p>
                              <p className="text-[#949599]">{t.ticketType || 'Ticket'} · Seat: {t.seatNumber || 'N/A'}</p>
                            </div>
                          ) : <p className="text-sm text-[#949599]">This ticket code is not valid.</p>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-6 space-y-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()} placeholder="Search by name, email, or ticket number..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition" />
                </div>
                <button onClick={handleManualSearch} disabled={searching} className="px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition">{searching ? 'Searching...' : 'Search'}</button>
              </div>
              {manualResults.length > 0 ? (
                <div className="space-y-2">
                  {manualResults.map((a) => {
                    const checked = a.checkedIn || a.checkInStatus === 'checked_in';
                    return (
                      <div key={a.id} className="flex items-center justify-between p-4 rounded-lg bg-[#1C232B] border border-[#262B2F]">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#EFEFF1] truncate">{a.name || a.attendeeName}</p>
                          <p className="text-xs text-[#949599]">{a.email || a.attendeeEmail} · {a.ticketType}</p>
                        </div>
                        {checked ? (
                          <Badge variant="success" size="sm">Checked In</Badge>
                        ) : (
                          <button onClick={() => handleManualCheckIn(a)} disabled={checkingIn === a.id} className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-md bg-white text-[#1C232B] text-xs font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition">
                            <UserCheck className="w-3.5 h-3.5" /> {checkingIn === a.id ? '...' : 'Check In'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={Search} title="Search for attendees" description="Enter a name, email, or ticket number above." className="py-10" />
              )}
            </div>
          )}
        </div>

        {/* Live log */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 h-fit">
          <h3 className="text-sm font-semibold text-[#EFEFF1] mb-3 flex items-center gap-2"><TicketIcon className="w-4 h-4 text-white" /> Recent Check-ins</h3>
          {log.length === 0 ? (
            <p className="text-sm text-[#949599] py-6 text-center">No check-ins yet.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {log.map((l, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1C232B] border border-[#262B2F]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#EFEFF1] truncate">{l.name}</p>
                      <p className="text-xs text-[#949599]">{l.type} · {l.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
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

