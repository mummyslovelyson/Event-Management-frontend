import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Download, FileText, CheckCircle2, Clock, UserX,
  Mail, Phone, Ticket as TicketIcon, MapPin, Calendar, X, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents } from '@/api/events';
import { getAttendees, exportAttendees, exportAttendeesPDF } from '@/api/organizer';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const TABS = ['All Attendees', 'Checked In', 'Not Arrived'];

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function AttendeesPage() {
  const { format } = useCurrency();
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');

  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(TABS[0]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);

  // Fetch events for dropdown
  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      try {
        const res = await getOrganizerEvents({ limit: 100 });
        const payload = res.data;
        const list = Array.isArray(payload) ? payload : payload.events || payload.data || [];
        setEvents(list);
        if (list.length) setSelectedEvent(list[0].id);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load events');
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, []);

  const fetchAttendees = useCallback(async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      const res = await getAttendees(selectedEvent);
      const payload = res.data;
      setAttendees(Array.isArray(payload) ? payload : payload.attendees || payload.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendees');
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

  const checkedInCount = useMemo(
    () => attendees.filter((a) => a.checkedIn || a.checkInStatus === 'checked_in').length,
    [attendees]
  );
  const notArrivedCount = attendees.length - checkedInCount;
  const checkInPct = attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendees.filter((a) => {
      const status = a.checkedIn || a.checkInStatus === 'checked_in' ? 'in' : 'out';
      if (tab === 'Checked In' && status !== 'in') return false;
      if (tab === 'Not Arrived' && status !== 'out') return false;
      if (!q) return true;
      const name = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.name || '';
      const email = a.email || '';
      const phone = a.phone || a.phoneNumber || '';
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q)
      );
    });
  }, [attendees, tab, search]);

  const handleExportCSV = async () => {
    if (!selectedEvent) { toast.error('Select an event first'); return; }
    const t = toast.loading('Preparing Excel/CSV...');
    try {
      const res = await exportAttendees(selectedEvent);
      downloadBlob(res.data, `attendees-${selectedEvent}.csv`);
      toast.success('Attendees exported to CSV', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed', { id: t });
    }
  };

  const handleExportPDF = async () => {
    if (!selectedEvent) { toast.error('Select an event first'); return; }
    const t = toast.loading('Generating PDF...');
    try {
      const res = await exportAttendeesPDF(selectedEvent);
      const ext = res.data?.type?.includes('pdf') ? 'pdf' : 'csv';
      downloadBlob(res.data, `attendees-${selectedEvent}.${ext}`);
      toast.success('Attendees exported to PDF', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed', { id: t });
    }
  };

  const selectedEventObj = events.find((e) => e.id === selectedEvent);

  return (
    <div className="space-y-5" onClick={() => setEventOpen(false)}>
      <PageHeader
        icon={Users}
        accent="sky"
        title="Attendees"
        subtitle="View and manage event registrations and check-ins."
        actions={
          <>
            <button
              onClick={handleExportCSV}
              disabled={!selectedEvent}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium text-white border border-white/20 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!selectedEvent}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" /> Export PDF
            </button>
          </>
        }
      />

      {/* Event selector */}
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <label className="block text-xs font-medium uppercase tracking-wider text-[#949599] mb-1.5">
          Select Event
        </label>
        <button
          onClick={() => setEventOpen((v) => !v)}
          disabled={loadingEvents}
          className="flex items-center justify-between gap-2 w-full sm:w-80 px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition disabled:opacity-50"
        >
          <span className="truncate">
            {loadingEvents ? 'Loading events...' : selectedEventObj ? selectedEventObj.title : 'Choose an event...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-[#949599] shrink-0 transition-transform ${eventOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {eventOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 mt-1 w-full sm:w-80 max-h-72 overflow-y-auto rounded-lg bg-[#171A1D] border border-[#494F55]/40 shadow-xl shadow-black/40 py-1"
            >
              {events.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#949599]">No events available</p>
              ) : (
                events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedEvent(e.id); setEventOpen(false); }}
                    className={`flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm hover:bg-[#494F55]/20 transition ${selectedEvent === e.id ? 'text-white' : 'text-[#EFEFF1]'}`}
                  >
                    <Calendar className="w-4 h-4 text-[#949599] shrink-0" />
                    <span className="truncate">{e.title}</span>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#949599]">
            <Users className="w-4 h-4" /> Total Registrations
          </div>
          <p className="mt-2 text-2xl font-bold text-[#EFEFF1]">{attendees.length}</p>
        </div>
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#949599]">
            <CheckCircle2 className="w-4 h-4" /> Checked In
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{checkedInCount}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-white/10 to-[#171A1D] border border-white/20 p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-white">
              <Clock className="w-4 h-4" /> Check-in Rate
            </span>
            <span className="text-2xl font-bold text-[#EFEFF1]">{checkInPct}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-[#494F55]/30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${checkInPct}%` }}
              className="h-full bg-gradient-to-r from-white to-[#c4a030] rounded-full"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-[#949599]">
            <span>{checkedInCount} in</span>
            <span>{notArrivedCount} not arrived</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#262B2F]">
        {TABS.map((t) => {
          const count = t === 'All Attendees' ? attendees.length : t === 'Checked In' ? checkedInCount : notArrivedCount;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? 'text-white' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
            >
              {t} <span className="ml-1 text-xs text-[#494F55]">({count})</span>
              {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loadingEvents ? (
        <LoadingSpinner label="Loading events..." className="py-20" />
      ) : events.length === 0 ? (
        <EmptyState icon={Users} title="No events yet" description="Create an event to view its attendees." className="py-16" />
      ) : !selectedEvent ? (
        <EmptyState icon={Users} title="Select an event" description="Choose an event above to view attendees." className="py-16" />
      ) : loading ? (
        <LoadingSpinner label="Loading attendees..." className="py-16" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserX} title="No attendees found" description={search ? "Try adjusting your search." : "No registrations for this event yet."} className="py-16" />
      ) : (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="hidden md:table-cell px-4 py-3 font-medium">Phone</th>
                <th className="hidden md:table-cell px-4 py-3 font-medium">Ticket Type</th>
                <th className="hidden md:table-cell px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="hidden md:table-cell px-4 py-3 font-medium">Check-in Time</th>
                <th className="hidden md:table-cell px-4 py-3 font-medium">Seat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262B2F]/70">
              {filtered.map((a, idx) => {
                const isCheckedIn = a.checkedIn || a.checkInStatus === 'checked_in';
                const fullName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.name || '—';
                return (
                  <tr
                    key={a.id || idx}
                    onClick={() => setDetail(a)}
                    className="hover:bg-[#1D2124] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {fullName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#EFEFF1]">{fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#949599]">{a.email || '—'}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-[#949599]">{a.phone || a.phoneNumber || '—'}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-[#949599]">{a.ticketType || a.ticket?.type || '—'}</td>
                    <td className="hidden md:table-cell px-4 py-3 font-mono text-xs text-[#949599]">#{a.orderId || a.orderReference || (a.order?.reference || '—')}</td>
                    <td className="px-4 py-3">
                      <Badge variant={isCheckedIn ? 'success' : 'pending'} size="sm">
                        {isCheckedIn ? 'Checked In' : 'Not Arrived'}
                      </Badge>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-xs text-[#949599]">
                      {isCheckedIn ? (a.checkInTime ? new Date(a.checkInTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—') : '—'}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-[#949599]">{a.seatNumber || a.seat || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Attendee Details"
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center text-xl font-semibold shrink-0">
                {`${detail.firstName || ''} ${detail.lastName || ''}`.trim().split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-[#EFEFF1]">
                  {`${detail.firstName || ''} ${detail.lastName || ''}`.trim() || detail.name || 'Attendee'}
                </h3>
                <div className="mt-1">
                  <Badge variant={detail.checkedIn || detail.checkInStatus === 'checked_in' ? 'success' : 'pending'} dot>
                    {detail.checkedIn || detail.checkInStatus === 'checked_in' ? 'Checked In' : 'Not Arrived'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="Email" value={detail.email} />
              <InfoRow icon={Phone} label="Phone" value={detail.phone || detail.phoneNumber} />
              <InfoRow icon={TicketIcon} label="Ticket Type" value={detail.ticketType || detail.ticket?.type} />
              <InfoRow icon={MapPin} label="Seat" value={detail.seatNumber || detail.seat} />
              <InfoRow icon={TicketIcon} label="Order ID" value={detail.orderId || detail.orderReference || detail.order?.reference} mono />
              <InfoRow icon={Calendar} label="Check-in Time" value={detail.checkInTime ? new Date(detail.checkInTime).toLocaleString('en-GB') : null} />
            </div>

            {detail.event && (
              <div className="rounded-lg bg-[#1C232B] border border-[#262B2F] p-4">
                <p className="text-xs uppercase tracking-wider text-[#949599] mb-1">Event</p>
                <p className="text-sm font-medium text-[#EFEFF1]">{detail.event.title || detail.eventTitle || '—'}</p>
                {detail.event.startDate && (
                  <p className="text-sm text-[#949599] mt-1">
                    {new Date(detail.event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {(detail.amountPaid != null || detail.price != null) && (
              <div className="flex items-center justify-between rounded-lg bg-gradient-to-br from-white/10 to-[#1D2124] border border-white/20 p-4">
                <span className="text-sm font-medium text-[#949599]">Amount Paid</span>
                <span className="text-lg font-bold text-white">{format(detail.amountPaid ?? detail.price)}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="rounded-lg bg-[#1C232B] border border-[#262B2F] p-4 space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-[#949599] flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className={`text-sm text-[#EFEFF1] ${mono ? 'font-mono' : 'font-medium'}`}>{value || '—'}</p>
    </div>
  );
}
