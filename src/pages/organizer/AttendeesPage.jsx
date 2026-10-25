import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Download, FileText, CheckCircle2, Clock, UserX,
  Mail, Phone, Ticket as TicketIcon, MapPin, Calendar, X, ChevronDown,
  FileSpreadsheet, ShieldCheck, CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents } from '@/api/events';
import { getAttendees, exportAttendees, exportAttendeesExcel, exportAttendeesPDF } from '@/api/organizer';
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

const normalizeAttendee = (a) => {
  const isCheckedIn = Boolean(a.checked_in || a.checkedIn || a.status === 'used' || a.checkInStatus === 'checked_in' || a.checked_in_at);
  const fullName = a.attendee_name || a.attendeeName || a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Attendee';
  const email = a.email || a.attendee_email || '—';
  const phone = a.phone || a.attendee_phone || a.phoneNumber || '—';
  const ticketType = a.ticket_type || a.ticketType || a.ticket_type_name || a.ticket?.type || 'Standard Entry';
  const orderId = a.order_reference || a.orderReference || a.ticket_number || a.ticketNumber || (a.order_id ? String(a.order_id) : '—');
  const checkInTime = a.checked_in_at || a.checkInTime || null;
  const seatNumber = a.seat_number || a.seatNumber || a.seat || '—';
  const ticketNumber = a.ticket_number || a.ticketNumber || (a.id ? `TC-${a.id}` : '—');
  const purchaseDate = a.purchase_date || a.purchaseDate || a.created_at || a.createdAt || null;
  const paymentStatus = (a.payment_status || a.paymentStatus || (a.status === 'refunded' ? 'refunded' : 'completed')).toLowerCase();

  return {
    ...a,
    isCheckedIn,
    fullName,
    email,
    phone,
    ticketType,
    orderId,
    checkInTime,
    seatNumber,
    ticketNumber,
    purchaseDate,
    paymentStatus,
  };
};

export default function AttendeesPage() {
  const [searchParams] = useSearchParams();
  const paramEventId = searchParams.get('eventId') || searchParams.get('event');
  const { format } = useCurrency();
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(paramEventId || '');

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
        if (list.length && !selectedEvent) setSelectedEvent(paramEventId || list[0].id);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load events');
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, [paramEventId, selectedEvent]);

  const fetchAttendees = useCallback(async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      const res = await getAttendees(selectedEvent);
      const payload = res.data;
      const rawList = Array.isArray(payload) ? payload : payload.attendees || payload.data || [];
      setAttendees(rawList.map(normalizeAttendee));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendees');
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEvent]);

  useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

  const checkedInCount = useMemo(
    () => attendees.filter((a) => a.isCheckedIn).length,
    [attendees]
  );
  const notArrivedCount = attendees.length - checkedInCount;
  const checkInPct = attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendees.filter((a) => {
      const status = a.isCheckedIn ? 'in' : 'out';
      if (tab === 'Checked In' && status !== 'in') return false;
      if (tab === 'Not Arrived' && status !== 'out') return false;
      if (!q) return true;
      return (
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.ticketType.toLowerCase().includes(q) ||
        String(a.orderId).toLowerCase().includes(q)
      );
    });
  }, [attendees, tab, search]);

  const handleExportCSV = async () => {
    if (!selectedEvent) { toast.error('Select an event first'); return; }
    const t = toast.loading('Preparing CSV...');
    try {
      const res = await exportAttendees(selectedEvent);
      downloadBlob(res.data, `attendees-${selectedEvent}.csv`);
      toast.success('Attendees exported to CSV', { id: t });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed', { id: t });
    }
  };

  const handleExportExcel = async () => {
    if (!selectedEvent) { toast.error('Select an event first'); return; }
    const t = toast.loading('Generating Excel spreadsheet...');
    try {
      const res = await exportAttendeesExcel(selectedEvent);
      downloadBlob(res.data, `attendees-${selectedEvent}.xlsx`);
      toast.success('Attendees exported to Excel', { id: t });
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
        subtitle="View and manage event registrations, payment status, and check-ins."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!selectedEvent}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium text-white border border-[#494F55]/40 hover:bg-white/10 disabled:opacity-50 transition-colors"
              title="Download attendee list as CSV"
            >
              <Download className="w-4 h-4 text-sky-400" /> Export CSV
            </button>
            <button
              onClick={handleExportExcel}
              disabled={!selectedEvent}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium text-white border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
              title="Download attendee list as Excel workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!selectedEvent}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white text-[#1C232B] text-xs md:text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-50 transition-colors shadow-sm"
              title="Download attendee list as printable PDF"
            >
              <FileText className="w-4 h-4 text-rose-600" /> Export PDF
            </button>
          </div>
        }
      />

      {/* Event selector */}
      <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        <label className="block text-xs font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
          Select Event
        </label>
        <button
          onClick={() => setEventOpen((v) => !v)}
          disabled={loadingEvents}
          className="flex items-center justify-between gap-2 w-full sm:w-80 px-3.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/30 transition disabled:opacity-50"
        >
          <span className="truncate">
            {loadingEvents ? 'Loading events...' : selectedEventObj ? selectedEventObj.title : 'Choose an event...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${eventOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {eventOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 mt-1 w-full sm:w-80 max-h-72 overflow-y-auto rounded-lg bg-[#121620] border border-white/[0.08] shadow-xl py-1"
            >
              {events.length === 0 ? (
                <p className="px-4 py-3 text-xs text-neutral-400">No events available</p>
              ) : (
                events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedEvent(e.id); setEventOpen(false); }}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-left text-xs hover:bg-white/[0.06] transition ${selectedEvent === e.id ? 'text-white font-medium bg-white/[0.04]' : 'text-neutral-300'}`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
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
        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-400">
            <Users className="w-4 h-4" /> Total Registrations
          </div>
          <p className="mt-2 text-2xl font-bold text-white tabular-nums">{attendees.length}</p>
        </div>
        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Checked In
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400 tabular-nums">{checkedInCount}</p>
        </div>
        <div className="rounded-xl bg-[#121620] border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-400">
              <Clock className="w-4 h-4" /> Check-in Rate
            </span>
            <span className="text-2xl font-bold text-white tabular-nums">{checkInPct}%</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${checkInPct}%` }}
              className="h-full bg-white rounded-full"
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-neutral-400 tabular-nums">
            <span>{checkedInCount} checked in</span>
            <span>{notArrivedCount} remaining</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {TABS.map((t) => {
          const count = t === 'All Attendees' ? attendees.length : t === 'Checked In' ? checkedInCount : notArrivedCount;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                tab === t
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>{t}</span>
              <span className={`text-[10px] ${tab === t ? 'text-black/60 font-bold' : 'text-neutral-500'}`}>({count})</span>
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
        <div className="rounded-xl bg-[#121620] border border-white/[0.08] overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 font-medium">Full Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Ticket Type</th>
                <th className="px-4 py-3 font-medium">Purchase Date</th>
                <th className="px-4 py-3 font-medium">Payment Status</th>
                <th className="px-4 py-3 font-medium">Check-in Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map((a, idx) => {
                const isCheckedIn = Boolean(a.isCheckedIn);
                const fullName = a.fullName || '—';
                const paymentStatus = a.paymentStatus || 'completed';
                const isPaid = paymentStatus === 'completed' || paymentStatus === 'paid' || paymentStatus === 'success';
                const isRefunded = paymentStatus === 'refunded';

                return (
                  <tr
                    key={a.id || idx}
                    onClick={() => setDetail(a)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                          {fullName.split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || 'AT'}
                        </div>
                        <div>
                          <span className="font-medium text-white block">{fullName}</span>
                          {a.ticketNumber && a.ticketNumber !== '—' && (
                            <span className="text-[10px] font-mono text-neutral-500">{a.ticketNumber}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 font-mono text-xs">{a.phone || '—'}</td>
                    <td className="px-4 py-3 text-neutral-400">{a.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/[0.04] text-neutral-300 border border-white/10">
                        {a.ticketType || 'Standard Entry'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={isPaid ? 'success' : isRefunded ? 'danger' : 'warning'} size="sm">
                        {isPaid ? 'Paid' : isRefunded ? 'Refunded' : (paymentStatus || 'Pending')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={isCheckedIn ? 'success' : 'pending'} size="sm">
                        {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                      </Badge>
                    </td>
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
              <div className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center text-lg font-semibold shrink-0">
                {(detail.fullName || 'Attendee').split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || 'AT'}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white">
                  {detail.fullName || 'Attendee'}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={detail.isCheckedIn ? 'success' : 'pending'} dot>
                    {detail.isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  </Badge>
                  <Badge variant={detail.paymentStatus === 'refunded' ? 'danger' : 'success'} size="sm">
                    Payment: {detail.paymentStatus || 'Paid'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={Mail} label="Email" value={detail.email} />
              <InfoRow icon={Phone} label="Phone" value={detail.phone} />
              <InfoRow icon={TicketIcon} label="Ticket Type" value={detail.ticketType} />
              <InfoRow icon={CreditCard} label="Payment Status" value={detail.paymentStatus ? (detail.paymentStatus.charAt(0).toUpperCase() + detail.paymentStatus.slice(1)) : 'Paid'} />
              <InfoRow icon={Calendar} label="Purchase Date" value={detail.purchaseDate ? new Date(detail.purchaseDate).toLocaleString('en-GB') : '—'} />
              <InfoRow icon={CheckCircle2} label="Check-in Status" value={detail.isCheckedIn ? `Checked In (${detail.checkInTime ? new Date(detail.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Verified'})` : 'Not Checked In'} />
              <InfoRow icon={MapPin} label="Seat" value={detail.seatNumber} />
              <InfoRow icon={TicketIcon} label="Ticket Number" value={detail.ticketNumber} mono />
              <InfoRow icon={TicketIcon} label="Order Reference" value={detail.orderId} mono />
            </div>

            {detail.event && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Event</p>
                <p className="text-sm font-medium text-white">{detail.event.title || detail.eventTitle || '—'}</p>
                {detail.event.startDate && (
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(detail.event.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {(detail.amountPaid != null || detail.price != null) && (
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.08] p-4">
                <span className="text-xs font-medium text-neutral-400">Amount Paid</span>
                <span className="text-base font-bold text-white tabular-nums">{format(detail.amountPaid ?? detail.price)}</span>
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
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-3 space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className={`text-xs text-white truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value || '—'}</p>
    </div>
  );
}
