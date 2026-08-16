import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Plus, Edit2, Trash2, Percent, DollarSign, Calendar, Zap, Copy,
  CheckCircle2, XCircle, Clock, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents } from '@/api/events';
import {
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getFlashSales, createFlashSale, deleteFlashSale,
} from '@/api/organizer';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition';

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

const periodLabel = (c) => {
  const from = c.validFrom ? new Date(c.validFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
  const to = c.validTo ? new Date(c.validTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
  return `${from} → ${to}`;
};

const isCouponActive = (c) => {
  if (c.active === false || c.isActive === false) return false;
  const now = new Date();
  if (c.validTo && new Date(c.validTo) < now) return false;
  if (c.maxUses && (c.usedCount || 0) >= c.maxUses) return false;
  return true;
};

export default function PromotionsPage() {
  const { format } = useCurrency();
  const [tab, setTab] = useState('Discount Codes');
  const [events, setEvents] = useState([]);

  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponModal, setCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteCouponTarget, setDeleteCouponTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(null);

  // Flash sales
  const [flashSales, setFlashSales] = useState([]);
  const [loadingFlash, setLoadingFlash] = useState(true);
  const [flashModal, setFlashModal] = useState(false);
  const [deleteFlashTarget, setDeleteFlashTarget] = useState(null);
  const [flashSubmitting, setFlashSubmitting] = useState(false);

  // Coupon form
  const [cForm, setCForm] = useState({
    code: '', type: 'percentage', value: '', maxUses: '', validFrom: '', validTo: '', scope: 'all', eventId: '',
  });
  // Flash form
  const [fForm, setFForm] = useState({
    eventId: '', ticketType: '', discountPct: '', durationHours: '24',
  });

  useEffect(() => {
    getOrganizerEvents({ limit: 100 })
      .then((res) => {
        const payload = res.data;
        setEvents(Array.isArray(payload) ? payload : payload.events || payload.data || []);
      })
      .catch(() => setEvents([]));
  }, []);

  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const res = await getCoupons();
      const payload = res.data;
      setCoupons(Array.isArray(payload) ? payload : payload.coupons || payload.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load discount codes');
      setCoupons([]);
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  const fetchFlash = useCallback(async () => {
    setLoadingFlash(true);
    try {
      const res = await getFlashSales();
      const payload = res.data;
      setFlashSales(Array.isArray(payload) ? payload : payload.flashSales || payload.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load flash sales');
      setFlashSales([]);
    } finally {
      setLoadingFlash(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  useEffect(() => { fetchFlash(); }, [fetchFlash]);

  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCForm({ code: genCode(), type: 'percentage', value: '', maxUses: '', validFrom: '', validTo: '', scope: 'all', eventId: '' });
    setCouponModal(true);
  };

  const openEditCoupon = (c) => {
    setEditingCoupon(c);
    setCForm({
      code: c.code || '',
      type: c.type || c.discountType || 'percentage',
      value: c.value ?? c.discountValue ?? '',
      maxUses: c.maxUses ?? c.usageLimit ?? '',
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
      validTo: c.validTo ? c.validTo.slice(0, 10) : '',
      scope: c.eventId ? 'specific' : 'all',
      eventId: c.eventId || '',
    });
    setCouponModal(true);
  };

  const submitCoupon = async (e) => {
    e.preventDefault();
    if (!cForm.code || !cForm.value) { toast.error('Code and value are required'); return; }
    if (cForm.type === 'percentage' && Number(cForm.value) > 100) { toast.error('Percentage cannot exceed 100'); return; }
    setSubmitting(true);
    try {
      const payload = {
        code: cForm.code.toUpperCase(),
        type: cForm.type,
        value: Number(cForm.value),
        maxUses: cForm.maxUses ? Number(cForm.maxUses) : null,
        validFrom: cForm.validFrom || null,
        validTo: cForm.validTo || null,
        eventId: cForm.scope === 'specific' ? cForm.eventId : null,
      };
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, payload);
        toast.success('Discount code updated');
      } else {
        await createCoupon(payload);
        toast.success('Discount code created');
      }
      setCouponModal(false);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save discount code');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCouponActive = async (c) => {
    const newVal = !isCouponActive(c);
    try {
      await updateCoupon(c.id, { active: newVal });
      toast.success(`Code ${newVal ? 'activated' : 'deactivated'}`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle code');
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteCouponTarget) return;
    try {
      await deleteCoupon(deleteCouponTarget.id);
      toast.success('Discount code deleted');
      setDeleteCouponTarget(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete code');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    toast.success('Code copied');
    setTimeout(() => setCopied(null), 1500);
  };

  const submitFlash = async (e) => {
    e.preventDefault();
    if (!fForm.eventId || !fForm.ticketType || !fForm.discountPct) {
      toast.error('Fill all required fields'); return;
    }
    setFlashSubmitting(true);
    try {
      await createFlashSale({
        eventId: fForm.eventId,
        ticketType: fForm.ticketType,
        discountPct: Number(fForm.discountPct),
        durationHours: Number(fForm.durationHours),
      });
      toast.success('Flash sale created');
      setFlashModal(false);
      setFForm({ eventId: '', ticketType: '', discountPct: '', durationHours: '24' });
      fetchFlash();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create flash sale');
    } finally {
      setFlashSubmitting(false);
    }
  };

  const handleDeleteFlash = async () => {
    if (!deleteFlashTarget) return;
    try {
      await deleteFlashSale(deleteFlashTarget.id);
      toast.success('Flash sale deleted');
      setDeleteFlashTarget(null);
      fetchFlash();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete flash sale');
    }
  };

  const flashStatus = (f) => {
    if (!f.endsAt && !f.endDate) return { v: 'success', label: 'Active' };
    const now = new Date();
    const end = new Date(f.endsAt || f.endDate);
    const start = new Date(f.startsAt || f.startDate || now);
    if (now > end) return { v: 'error', label: 'Ended' };
    if (now < start) return { v: 'pending', label: 'Upcoming' };
    return { v: 'success', label: 'Active' };
  };

  const TABS = ['Discount Codes', 'Flash Sales'];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Tag}
        accent="amber"
        title="Promotions"
        subtitle="Create discount codes and flash sales to boost ticket sales."
        actions={
          tab === 'Discount Codes' ? (
            <button onClick={openCreateCoupon} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0">
              <Plus className="w-4 h-4" /> Create Discount Code
            </button>
          ) : (
            <button onClick={() => setFlashModal(true)} className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0">
              <Zap className="w-4 h-4" /> Create Flash Sale
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#262B2F]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? 'text-white' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />}
          </button>
        ))}
      </div>

      {/* Discount Codes */}
      {tab === 'Discount Codes' && (
        loadingCoupons ? (
          <LoadingSpinner label="Loading discount codes..." className="py-16" />
        ) : coupons.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No discount codes yet"
            description="Create discount codes to offer promotions to your customers."
            action={openCreateCoupon}
            actionLabel="Create Discount Code"
            className="py-16"
          />
        ) : (
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead>
                <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                  <th className="px-4 py-3 font-medium">Max Uses</th>
                  <th className="px-4 py-3 font-medium">Used</th>
                  <th className="px-4 py-3 font-medium">Valid Period</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B2F]/70">
                <AnimatePresence>
                  {coupons.map((c) => {
                    const active = isCouponActive(c);
                    const used = c.usedCount || c.timesUsed || 0;
                    const max = c.maxUses || c.usageLimit;
                    return (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-[#1D2124] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-white tracking-wider">{c.code}</span>
                            <button onClick={() => copyCode(c.code)} className="p-1 rounded text-[#949599] hover:text-[#EFEFF1] transition" title="Copy">
                              {copied === c.code ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {c.eventId && (
                            <span className="text-[10px] text-[#494F55]">Specific event</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[#949599]">
                            {c.type === 'percentage' || c.discountType === 'percentage' ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                            <span className="capitalize">{c.type || c.discountType || 'percentage'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-[#EFEFF1]">
                          {(c.type === 'percentage' || c.discountType === 'percentage')
                            ? `${c.value ?? c.discountValue}%`
                            : format(c.value ?? c.discountValue)}
                        </td>
                        <td className="px-4 py-3 text-[#949599]">{max || '∞'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[#EFEFF1] font-medium">{used}</span>
                          {max && (
                            <div className="mt-1 h-1.5 w-16 rounded-full bg-[#494F55]/30 overflow-hidden">
                              <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#949599] whitespace-nowrap">{periodLabel(c)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={active ? 'success' : 'neutral'} size="sm" dot>
                            {active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditCoupon(c)} className="p-1.5 rounded-md text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => toggleCouponActive(c)} className="p-1.5 rounded-md text-[#949599] hover:text-white hover:bg-[#494F55]/30 transition" title={active ? 'Deactivate' : 'Activate'}>
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteCouponTarget(c)} className="p-1.5 rounded-md text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Flash Sales */}
      {tab === 'Flash Sales' && (
        loadingFlash ? (
          <LoadingSpinner label="Loading flash sales..." className="py-16" />
        ) : flashSales.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No flash sales yet"
            description="Create time-limited flash sales to drive urgent ticket purchases."
            action={() => setFlashModal(true)}
            actionLabel="Create Flash Sale"
            className="py-16"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {flashSales.map((f) => {
                const st = flashStatus(f);
                const ev = events.find((e) => e.id === (f.eventId || f.event?.id));
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-xl bg-gradient-to-br from-[#171A1D] to-[#1D2124] border border-[#262B2F] p-5 hover:border-white/40 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-white/10 text-white flex items-center justify-center">
                        <Zap className="w-5 h-5" />
                      </div>
                      <Badge variant={st.v} size="sm" dot>{st.label}</Badge>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[#EFEFF1]">{f.ticketType || f.ticketTypeName || 'Flash Sale'}</h3>
                    {ev && <p className="text-xs text-[#949599] mt-0.5 truncate">{ev.title}</p>}
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">{f.discountPct || f.discountPercent}%</span>
                      <span className="text-xs text-[#949599]">off</span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-xs text-[#949599]">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {f.startsAt ? new Date(f.startsAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Now'}
                        {' → '}
                        {(f.endsAt || f.endDate) ? new Date(f.endsAt || f.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Duration: {f.durationHours || (f.endsAt ? Math.round((new Date(f.endsAt) - new Date(f.startsAt)) / 36e5) : 0)}h
                      </p>
                      {f.ticketsSold != null && (
                        <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {f.ticketsSold} sold</p>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteFlashTarget(f)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#949599] border border-[#262B2F] hover:text-red-400 hover:border-red-500/30 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )
      )}

      {/* Coupon Modal */}
      <Modal
        open={couponModal}
        onClose={() => setCouponModal(false)}
        title={editingCoupon ? 'Edit Discount Code' : 'Create Discount Code'}
        size="lg"
        footer={
          <>
            <button onClick={() => setCouponModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitCoupon} disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">
              {submitting ? 'Saving...' : editingCoupon ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={submitCoupon} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Code</label>
            <div className="flex gap-2">
              <input
                value={cForm.code}
                onChange={(e) => setCForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER20"
                className={`${inputCls} font-mono uppercase`}
              />
              <button
                type="button"
                onClick={() => setCForm((f) => ({ ...f, code: genCode() }))}
                className="shrink-0 px-3 rounded-lg border border-[#494F55]/40 text-[#949599] hover:text-white hover:border-white/40 transition text-sm"
                title="Auto-generate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Discount Type</label>
              <select
                value={cForm.type}
                onChange={(e) => setCForm((f) => ({ ...f, type: e.target.value }))}
                className={inputCls}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₵)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">
                {cForm.type === 'percentage' ? 'Percentage Off' : 'Amount Off (₵)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cForm.value}
                onChange={(e) => setCForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={cForm.type === 'percentage' ? '20' : '50'}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Max Uses (optional)</label>
            <input
              type="number"
              min="1"
              value={cForm.maxUses}
              onChange={(e) => setCForm((f) => ({ ...f, maxUses: e.target.value }))}
              placeholder="100"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Valid From</label>
              <input
                type="date"
                value={cForm.validFrom}
                onChange={(e) => setCForm((f) => ({ ...f, validFrom: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Valid To</label>
              <input
                type="date"
                value={cForm.validTo}
                onChange={(e) => setCForm((f) => ({ ...f, validTo: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Apply To</label>
            <select
              value={cForm.scope}
              onChange={(e) => setCForm((f) => ({ ...f, scope: e.target.value, eventId: '' }))}
              className={inputCls}
            >
              <option value="all">All Events</option>
              <option value="specific">Specific Event</option>
            </select>
          </div>
          {cForm.scope === 'specific' && (
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Select Event</label>
              <select
                value={cForm.eventId}
                onChange={(e) => setCForm((f) => ({ ...f, eventId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Choose an event...</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>

      {/* Flash Sale Modal */}
      <Modal
        open={flashModal}
        onClose={() => setFlashModal(false)}
        title="Create Flash Sale"
        footer={
          <>
            <button onClick={() => setFlashModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitFlash} disabled={flashSubmitting} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">
              {flashSubmitting ? 'Creating...' : 'Create Flash Sale'}
            </button>
          </>
        }
      >
        <form onSubmit={submitFlash} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Event</label>
            <select value={fForm.eventId} onChange={(e) => setFForm((f) => ({ ...f, eventId: e.target.value, ticketType: '' }))} className={inputCls}>
              <option value="">Choose an event...</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Ticket Type</label>
            <input
              value={fForm.ticketType}
              onChange={(e) => setFForm((f) => ({ ...f, ticketType: e.target.value }))}
              placeholder="e.g. VIP, General Admission"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Discount (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={fForm.discountPct}
                onChange={(e) => setFForm((f) => ({ ...f, discountPct: e.target.value }))}
                placeholder="30"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Duration (hours)</label>
              <input
                type="number"
                min="1"
                value={fForm.durationHours}
                onChange={(e) => setFForm((f) => ({ ...f, durationHours: e.target.value }))}
                placeholder="24"
                className={inputCls}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Coupon */}
      <Modal
        open={!!deleteCouponTarget}
        onClose={() => setDeleteCouponTarget(null)}
        title="Delete Discount Code"
        footer={
          <>
            <button onClick={() => setDeleteCouponTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDeleteCoupon} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition">Delete</button>
          </>
        }
      >
        <p className="text-sm text-[#949599]">
          Delete code <span className="font-mono font-semibold text-white">{deleteCouponTarget?.code}</span>? This cannot be undone.
        </p>
      </Modal>

      {/* Delete Flash */}
      <Modal
        open={!!deleteFlashTarget}
        onClose={() => setDeleteFlashTarget(null)}
        title="Delete Flash Sale"
        footer={
          <>
            <button onClick={() => setDeleteFlashTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDeleteFlash} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition">Delete</button>
          </>
        }
      >
        <p className="text-sm text-[#949599]">
          Delete this flash sale? Any discounted tickets already sold will remain valid.
        </p>
      </Modal>
    </div>
  );
}
