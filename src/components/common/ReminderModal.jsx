import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellRing, X, Check, Calendar, Clock, Ticket, AlertTriangle, MapPin, Sparkles, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { toggleEventReminder, getEventReminderStatus, updateReminderPreferences } from '@/api/events';

const defaultPreferences = {
  sevenDays: true,
  twentyFourHours: true,
  oneHour: true,
  salesOpening: true,
  almostSoldOut: true,
  timeChanged: true,
  venueChanged: true,
  cancelled: true,
};

export default function ReminderModal({ open, onClose, event, onStatusChange }) {
  const [isReminded, setIsReminded] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !event?.id) return;
    setLoading(true);
    getEventReminderStatus(event.id)
      .then((res) => {
        setIsReminded(!!res.data?.isReminded);
        if (res.data?.preferences) {
          setPreferences({ ...defaultPreferences, ...res.data.preferences });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, event?.id]);

  if (!open || !event) return null;

  const handleToggleActive = async () => {
    setSaving(true);
    try {
      const res = await toggleEventReminder(event.id, preferences);
      const nextStatus = !!res.data?.isReminded;
      setIsReminded(nextStatus);
      if (res.data?.preferences) {
        setPreferences({ ...defaultPreferences, ...res.data.preferences });
      }
      onStatusChange?.(nextStatus, res.data?.preferences || preferences);
      toast.success(nextStatus ? 'Reminder enabled!' : 'Reminder turned off');
      if (!nextStatus) {
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      if (!isReminded) {
        // If not already reminded, enable it with current preferences
        const res = await toggleEventReminder(event.id, preferences);
        setIsReminded(true);
        onStatusChange?.(true, preferences);
        toast.success('Reminder set with your preferences!');
      } else {
        await updateReminderPreferences(event.id, preferences);
        onStatusChange?.(true, preferences);
        toast.success('Preferences saved!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleOption = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg rounded-2xl bg-[#171A1D] border border-[#2E353B] shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-[#262B2F] flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#EFEFF1]">Event Reminders</h2>
                <p className="text-xs text-[#949599] truncate max-w-xs sm:max-w-sm mt-0.5">
                  {event.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#949599] hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Master Switch */}
          <div className="p-6 py-4 bg-[#1C232B]/60 border-b border-[#262B2F] flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#EFEFF1]">
                {isReminded ? 'Reminders Active' : 'Enable Reminders'}
              </p>
              <p className="text-xs text-[#949599] mt-0.5">
                {isReminded
                  ? 'We will notify you based on your selected triggers below.'
                  : 'Turn on to receive timely updates and countdown alerts.'}
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              disabled={saving || loading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isReminded
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
            >
              {isReminded ? (
                <>
                  <Check className="w-4 h-4" /> Active
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" /> Remind Me
                </>
              )}
            </button>
          </div>

          {/* Granular Preferences Body */}
          <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4 no-scrollbar">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7278]">
              Select when you want to be notified
            </p>

            <div className="space-y-2.5">
              {/* 7 Days Before */}
              <label
                onClick={() => toggleOption('sevenDays')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">7 days before</p>
                    <p className="text-[11px] text-[#949599]">Advance notification to prepare your schedule</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.sevenDays}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>

              {/* 24 Hours Before */}
              <label
                onClick={() => toggleOption('twentyFourHours')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">24 hours before</p>
                    <p className="text-[11px] text-[#949599]">Daily countdown reminder with venue directions</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.twentyFourHours}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>

              {/* 1 Hour Before */}
              <label
                onClick={() => toggleOption('oneHour')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">1 hour before</p>
                    <p className="text-[11px] text-[#949599]">Final doors open & start-time alert</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.oneHour}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Ticket Sales Opening */}
              <label
                onClick={() => toggleOption('salesOpening')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <Ticket className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">Ticket sales opening</p>
                    <p className="text-[11px] text-[#949599]">Instant alert when tickets are available to buy</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.salesOpening}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Ticket Almost Sold Out */}
              <label
                onClick={() => toggleOption('almostSoldOut')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">Ticket almost sold out</p>
                    <p className="text-[11px] text-[#949599]">Urgent alert when only few tickets remain (&le;15%)</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.almostSoldOut}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Event Time Changed */}
              <label
                onClick={() => toggleOption('timeChanged')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">Event time changed</p>
                    <p className="text-[11px] text-[#949599]">Immediate alert if dates or start times are modified</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.timeChanged}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Venue Changed */}
              <label
                onClick={() => toggleOption('venueChanged')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-teal-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">Venue changed</p>
                    <p className="text-[11px] text-[#949599]">Immediate alert if location or venue changes</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.venueChanged}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>

              {/* Event Cancelled */}
              <label
                onClick={() => toggleOption('cancelled')}
                className="flex items-center justify-between p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] hover:border-white/20 cursor-pointer transition select-none"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs font-medium text-[#EFEFF1]">Event cancelled</p>
                    <p className="text-[11px] text-[#949599]">Immediate alert with refund instructions if cancelled</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.cancelled}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-amber-500 bg-[#262B2F] border-transparent focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-[#262B2F] bg-[#171A1D] flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition flex items-center gap-1.5 shadow"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Preferences
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
