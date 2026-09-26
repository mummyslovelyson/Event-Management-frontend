import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Plus, Edit2, Trash2, Percent, DollarSign, Calendar, Zap, Copy,
  CheckCircle2, XCircle, Clock, RefreshCw, Users, Sparkles, AlertCircle, ArrowRight,
  TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents } from '@/api/events';
import {
  getCoupons, createCoupon, updateCoupon, deleteCoupon,
  getFlashSales, createFlashSale, deleteFlashSale,
} from '@/api/organizer';
import { getTicketTypes, updateTicketType } from '@/api/tickets';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const inputCls = 'w-full px-4 py-3.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition';

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
  const [tab, setTab] = useState('Promo Codes');
  const [events, setEvents] = useState([]);

  // Coupons & Promo Codes
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponModal, setCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteCouponTarget, setDeleteCouponTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(null);

  // Early-bird Tickets
  const [selectedEBEvent, setSelectedEBEvent] = useState('');
  const [ebTiers, setEbTiers] = useState([]);
  const [loadingEBTiers, setLoadingEBTiers] = useState(false);
  const [ebModal, setEbModal] = useState(false);
  const [ebTargetTier, setEbTargetTier] = useState(null);
  const [ebForm, setEbForm] = useState({ earlyBirdPrice: '', earlyBirdDeadline: '', earlyBirdMaxQty: '' });
  const [ebSubmitting, setEbSubmitting] = useState(false);

  // Group discounts
  const [groupModal, setGroupModal] = useState(false);
  const [gForm, setGForm] = useState({
    code: '', minQuantity: '5', discountPct: '10', maxUses: '50', validTo: '', eventId: '',
  });
  const [gSubmitting, setGSubmitting] = useState(false);

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
        const list = Array.isArray(payload) ? payload : payload.events || payload.data || [];
        setEvents(list);
        if (list.length > 0 && !selectedEBEvent) {
          setSelectedEBEvent(list[0].id);
        }
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

  const fetchEBTiers = useCallback(async () => {
    if (!selectedEBEvent) return;
    setLoadingEBTiers(true);
    try {
      const res = await getTicketTypes(selectedEBEvent);
      const list = res.data?.ticketTypes || res.data || [];
      setEbTiers(Array.isArray(list) ? list : []);
    } catch {
      setEbTiers([]);
    } finally {
      setLoadingEBTiers(false);
    }
  }, [selectedEBEvent]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);
  useEffect(() => { fetchFlash(); }, [fetchFlash]);
  useEffect(() => { fetchEBTiers(); }, [fetchEBTiers]);

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

  const openConfigureEB = (tier) => {
    setEbTargetTier(tier);
    setEbForm({
      earlyBirdPrice: tier.early_bird_price ?? tier.earlyBirdPrice ?? '',
      earlyBirdDeadline: tier.early_bird_deadline ? String(tier.early_bird_deadline).slice(0, 10) : '',
      earlyBirdMaxQty: tier.early_bird_max_qty ?? tier.earlyBirdMaxQty ?? '',
    });
    setEbModal(true);
  };

  const submitEarlyBird = async (e) => {
    e.preventDefault();
    if (!ebTargetTier || !selectedEBEvent) return;
    if (!ebForm.earlyBirdPrice || !ebForm.earlyBirdDeadline) {
      toast.error('Early-bird price and deadline are required');
      return;
    }
    setEbSubmitting(true);
    try {
      await updateTicketType(selectedEBEvent, ebTargetTier.id, {
        early_bird_price: Number(ebForm.earlyBirdPrice),
        early_bird_deadline: ebForm.earlyBirdDeadline,
        early_bird_max_qty: ebForm.earlyBirdMaxQty ? Number(ebForm.earlyBirdMaxQty) : null,
      });
      toast.success('Early-bird pricing saved successfully');
      setEbModal(false);
      fetchEBTiers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save early-bird pricing');
    } finally {
      setEbSubmitting(false);
    }
  };

  const submitGroupDiscount = async (e) => {
    e.preventDefault();
    if (!gForm.code || !gForm.discountPct || !gForm.minQuantity) {
      toast.error('Code, minimum tickets, and discount % are required');
      return;
    }
    setGSubmitting(true);
    try {
      await createCoupon({
        code: gForm.code.toUpperCase(),
        type: 'percentage',
        value: Number(gForm.discountPct),
        minQuantity: Number(gForm.minQuantity),
        maxUses: gForm.maxUses ? Number(gForm.maxUses) : 100,
        validTo: gForm.validTo || null,
        eventId: gForm.eventId || null,
      });
      toast.success('Group discount rule created');
      setGroupModal(false);
      setGForm({ code: '', minQuantity: '5', discountPct: '10', maxUses: '50', validTo: '', eventId: '' });
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group discount');
    } finally {
      setGSubmitting(false);
    }
  };

  const standardPromoCodes = coupons.filter((c) => (Number(c.min_quantity || c.minQuantity) || 1) <= 1);
  const groupDiscounts = coupons.filter((c) => (Number(c.min_quantity || c.minQuantity) || 1) > 1);

  const TABS = ['Promo Codes', 'Early-bird Tickets', 'Group Discounts', 'Flash Sales'];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Tag}
        accent="amber"
        title="Promotional Tools"
        subtitle="Boost attendance with promo codes, early-bird pricing, and group discounts."
        actions={
          tab === 'Promo Codes' ? (
            <button onClick={openCreateCoupon} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0">
              <Plus className="w-4 h-4" /> Create Promo Code
            </button>
          ) : tab === 'Early-bird Tickets' ? (
            <button
              onClick={() => {
                if (ebTiers.length > 0) openConfigureEB(ebTiers[0]);
                else toast.error('Select an event with ticket tiers first');
              }}
              disabled={!ebTiers.length}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" /> Configure Early-Bird
            </button>
          ) : tab === 'Group Discounts' ? (
            <button onClick={() => setGroupModal(true)} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0">
              <Users className="w-4 h-4" /> Create Group Discount
            </button>
          ) : (
            <button onClick={() => setFlashModal(true)} className="inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition-colors shrink-0">
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
            className={`relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? 'text-white' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: PROMO CODES ─── */}
      {tab === 'Promo Codes' && (
        <div className="space-y-4">
          {/* Example Banner (Section 21) */}
          <div className="rounded-xl bg-gradient-to-r from-amber-500/15 via-[#171A1D] to-[#14171A] border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-400 font-semibold">Promo Code Example</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  <span className="font-mono text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">EARLYBIRD20</span> — 20% discount on order total.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCForm({
                  code: 'EARLYBIRD20',
                  type: 'percentage',
                  value: '20',
                  maxUses: '100',
                  validFrom: new Date().toISOString().slice(0, 10),
                  validTo: '',
                  scope: 'all',
                  eventId: '',
                });
                setCouponModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 text-xs font-semibold border border-amber-400/30 transition shrink-0 self-start sm:self-center"
            >
              Use This Template
            </button>
          </div>

          {loadingCoupons ? (
            <LoadingSpinner label="Loading promo codes..." className="py-16" />
          ) : standardPromoCodes.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No promo codes yet"
              description="Create promo codes (e.g. EARLYBIRD20) to offer percentage or fixed discounts."
              className="py-16"
            />
          ) : (
            <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[920px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F] bg-[#14171A]">
                    <th className="px-4 py-3 font-medium">Promo Code</th>
                    <th className="px-4 py-3 font-medium">Discount</th>
                    <th className="px-4 py-3 font-medium">Max Uses</th>
                    <th className="px-4 py-3 font-medium">Used</th>
                    <th className="px-4 py-3 font-medium">Valid Period</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262B2F]/70">
                  <AnimatePresence>
                    {standardPromoCodes.map((c) => {
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
                              <span className="font-mono font-semibold text-white tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/10">{c.code}</span>
                              <button onClick={() => copyCode(c.code)} className="p-1.5 rounded text-[#949599] hover:text-[#EFEFF1] transition" title="Copy">
                                {copied === c.code ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {c.eventId && (
                              <span className="text-[10px] text-[#494F55] block mt-0.5">Specific event</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#EFEFF1]">
                            {(c.type === 'percentage' || c.discountType === 'percentage')
                              ? <span className="text-amber-400 font-bold">{c.value ?? c.discountValue}% off</span>
                              : <span className="text-emerald-400 font-bold">{format(c.value ?? c.discountValue)} off</span>}
                          </td>
                          <td className="px-4 py-3 text-[#949599]">{max || '∞'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[#EFEFF1] font-medium">{used}</span>
                            {max && (
                              <div className="mt-1 h-1.5 w-16 rounded-full bg-[#494F55]/30 overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
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
                              <button onClick={() => openEditCoupon(c)} className="p-2 rounded-md text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition" title="Edit">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => toggleCouponActive(c)} className="p-2 rounded-md text-[#949599] hover:text-white hover:bg-[#494F55]/30 transition" title={active ? 'Deactivate' : 'Activate'}>
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteCouponTarget(c)} className="p-2 rounded-md text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition" title="Delete">
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
          )}
        </div>
      )}

      {/* ─── TAB 2: EARLY-BIRD TICKETS ─── */}
      {tab === 'Early-bird Tickets' && (
        <div className="space-y-4">
          {/* Example Banner (Section 21) */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-500/15 via-[#171A1D] to-[#14171A] border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Early-Bird Ticket Example</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  Early Bird: <span className="text-emerald-300">GHS 80</span> — Available until <span className="text-amber-300 font-medium">30 October</span>
                </p>
              </div>
            </div>
            <span className="text-xs text-[#949599]">Auto-applied at checkout until deadline</span>
          </div>

          {/* Event Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#171A1D] border border-[#262B2F] p-4 rounded-xl">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Select Event</label>
            <select
              value={selectedEBEvent}
              onChange={(e) => setSelectedEBEvent(e.target.value)}
              className="flex-1 max-w-md px-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition cursor-pointer"
            >
              <option value="">Choose an event...</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          {loadingEBTiers ? (
            <LoadingSpinner label="Loading ticket tiers..." className="py-16" />
          ) : !selectedEBEvent ? (
            <EmptyState icon={Clock} title="Select an event" description="Choose an event above to view and configure its Early-Bird pricing." className="py-16" />
          ) : ebTiers.length === 0 ? (
            <EmptyState icon={Tag} title="No ticket tiers found" description="Create ticket tiers in Ticket Management before setting early bird pricing." className="py-16" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ebTiers.map((tier) => {
                const ebPrice = tier.early_bird_price ?? tier.earlyBirdPrice;
                const ebDeadline = tier.early_bird_deadline ?? tier.earlyBirdDeadline;
                const hasEB = ebPrice != null && Number(ebPrice) > 0;
                const isExpired = ebDeadline && new Date(ebDeadline) < new Date();
                const normalPrice = Number(tier.price || 0);

                return (
                  <div key={tier.id} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 flex flex-col justify-between hover:border-[#494F55] transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-base truncate">{tier.name}</span>
                        {hasEB ? (
                          <Badge variant={isExpired ? 'neutral' : 'success'} size="sm">
                            {isExpired ? 'Early Bird Expired' : 'Early Bird Active'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Standard Pricing</Badge>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-[#949599]">Regular Price:</span>
                          <span className="text-[#EFEFF1] font-semibold">{format(normalPrice)}</span>
                        </div>
                        {hasEB && (
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-emerald-400 font-medium">Early Bird Price:</span>
                            <span className="text-emerald-300 font-bold text-sm">{format(Number(ebPrice))}</span>
                          </div>
                        )}
                        {ebDeadline && (
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-[#949599]">Available Until:</span>
                            <span className="text-white font-medium">
                              {new Date(ebDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {tier.early_bird_max_qty && (
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-[#949599]">Max Allocation:</span>
                            <span className="text-white font-medium">{tier.early_bird_max_qty} tickets</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openConfigureEB(tier)}
                      className="mt-5 w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> {hasEB ? 'Update Early-Bird Rule' : 'Set Early-Bird Pricing'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: GROUP DISCOUNTS ─── */}
      {tab === 'Group Discounts' && (
        <div className="space-y-4">
          {/* Example Banner (Section 21) */}
          <div className="rounded-xl bg-gradient-to-r from-blue-500/15 via-[#171A1D] to-[#14171A] border border-blue-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">Group Discount Rule Example</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  &gt; Buy 5 tickets and get 10% off.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setGForm({
                  code: 'GROUP5',
                  minQuantity: '5',
                  discountPct: '10',
                  maxUses: '50',
                  validTo: '',
                  eventId: '',
                });
                setGroupModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-400/20 text-blue-300 hover:bg-blue-400/30 text-xs font-semibold border border-blue-400/30 transition shrink-0 self-start sm:self-center"
            >
              Use 5-Ticket / 10% Preset
            </button>
          </div>

          {loadingCoupons ? (
            <LoadingSpinner label="Loading group discounts..." className="py-16" />
          ) : groupDiscounts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No group discounts created yet"
              description="Incentivize bulk purchases with rules like 'Buy 5 tickets and get 10% off'."
              className="py-16"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupDiscounts.map((c) => {
                const minQty = c.min_quantity || c.minQuantity || 5;
                const active = isCouponActive(c);
                return (
                  <div key={c.id} className="rounded-xl bg-[#171A1D] border border-blue-500/30 p-5 flex flex-col justify-between hover:border-blue-400/60 transition">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-mono font-bold text-white text-base tracking-wider bg-white/5 px-2.5 py-1 rounded border border-white/10">{c.code}</span>
                        <Badge variant={active ? 'success' : 'neutral'} size="sm" dot>
                          {active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs font-bold text-blue-300">
                          &gt; Buy {minQty} tickets and get {c.value ?? c.discountValue}% off.
                        </p>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-[#949599]">
                        <p>Used: <strong className="text-white">{c.usedCount || 0}</strong> of {c.maxUses || '∞'} times</p>
                        {c.validTo && (
                          <p>Expires: <strong className="text-white">{new Date(c.validTo).toLocaleDateString('en-GB')}</strong></p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#262B2F] flex items-center justify-between">
                      <button
                        onClick={() => copyCode(c.code)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-white transition"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </button>
                      <button
                        onClick={() => setDeleteCouponTarget(c)}
                        className="p-1.5 rounded text-[#949599] hover:text-red-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: FLASH SALES ─── */}
      {tab === 'Flash Sales' && (
        loadingFlash ? (
          <LoadingSpinner label="Loading flash sales..." className="py-16" />
        ) : flashSales.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No flash sales yet"
            description="Create time-limited flash sales to drive urgent ticket purchases."
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
                      className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg text-xs font-medium text-[#949599] border border-[#262B2F] hover:text-red-400 hover:border-red-500/30 transition"
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
            <button onClick={() => setCouponModal(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitCoupon} disabled={submitting} className="px-4 py-3 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">
              {submitting ? 'Saving...' : editingCoupon ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={submitCoupon} className="space-y-4">
          {/* Quick Presets (Kwame Blueprint Sec. 21) */}
          {!editingCoupon && (
            <div className="p-3 rounded-lg bg-[#14181C] border border-[#262B2F] space-y-2">
              <span className="text-[11px] font-semibold text-[#949599] uppercase tracking-wider block">
                Quick Preset Templates
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 14);
                    setCForm({
                      code: 'EARLYBIRD20',
                      type: 'percentage',
                      value: '20',
                      maxUses: '100',
                      validFrom: new Date().toISOString().slice(0, 10),
                      validTo: d.toISOString().slice(0, 10),
                      scope: 'all',
                      eventId: '',
                    });
                  }}
                  className="px-2.5 py-1 rounded bg-[#1C232B] hover:bg-white/10 border border-[#494F55]/40 text-xs text-amber-300 font-medium transition"
                >
                  ⚡ Early Bird (20% Off)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCForm({
                      code: 'GROUP10',
                      type: 'percentage',
                      value: '10',
                      maxUses: '50',
                      validFrom: '',
                      validTo: '',
                      scope: 'all',
                      eventId: '',
                    });
                  }}
                  className="px-2.5 py-1 rounded bg-[#1C232B] hover:bg-white/10 border border-[#494F55]/40 text-xs text-blue-300 font-medium transition"
                >
                  👥 Group Bundle (10% Off)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCForm({
                      code: 'VIP15',
                      type: 'percentage',
                      value: '15',
                      maxUses: '25',
                      validFrom: '',
                      validTo: '',
                      scope: 'all',
                      eventId: '',
                    });
                  }}
                  className="px-2.5 py-1 rounded bg-[#1C232B] hover:bg-white/10 border border-[#494F55]/40 text-xs text-purple-300 font-medium transition"
                >
                  🎟️ VIP Launch (15% Off)
                </button>
              </div>
            </div>
          )}

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
            <button onClick={() => setFlashModal(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitFlash} disabled={flashSubmitting} className="px-4 py-3 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">
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

      {/* Early-Bird Configuration Modal (Section 21) */}
      <Modal
        open={ebModal}
        onClose={() => setEbModal(false)}
        title={`Configure Early-Bird Rate: ${ebTargetTier?.name || ''}`}
        footer={
          <>
            <button onClick={() => setEbModal(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitEarlyBird} disabled={ebSubmitting} className="px-4 py-3 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">
              {ebSubmitting ? 'Saving...' : 'Save Early-Bird Rate'}
            </button>
          </>
        }
      >
        <form onSubmit={submitEarlyBird} className="space-y-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            Early-Bird rates automatically apply on ticket checkout before the selected cut-off deadline.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Regular Price</label>
              <input
                type="text"
                disabled
                value={format(Number(ebTargetTier?.price || 0))}
                className={`${inputCls} bg-[#14171A] opacity-70`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-400 mb-1.5 uppercase tracking-wider">Early-Bird Price (₵)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={ebForm.earlyBirdPrice}
                onChange={(e) => setEbForm((f) => ({ ...f, earlyBirdPrice: e.target.value }))}
                placeholder="80"
                className={`${inputCls} border-emerald-500/40 text-emerald-300 font-semibold`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Available Until (Cut-off Date)</label>
            <input
              type="date"
              required
              value={ebForm.earlyBirdDeadline}
              onChange={(e) => setEbForm((f) => ({ ...f, earlyBirdDeadline: e.target.value }))}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-[#949599]">e.g. 30 October. After this date, price returns to standard.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Max Early-Bird Quantity (Optional)</label>
            <input
              type="number"
              min="1"
              value={ebForm.earlyBirdMaxQty}
              onChange={(e) => setEbForm((f) => ({ ...f, earlyBirdMaxQty: e.target.value }))}
              placeholder="e.g. 100"
              className={inputCls}
            />
          </div>
        </form>
      </Modal>

      {/* Group Discount Rule Modal (Section 21) */}
      <Modal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        title="Create Group Discount Rule"
        footer={
          <>
            <button onClick={() => setGroupModal(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={submitGroupDiscount} disabled={gSubmitting} className="px-4 py-3 rounded-lg text-sm font-semibold text-[#1C232B] bg-white hover:bg-[#CBD5E1] disabled:opacity-60 transition">
              {gSubmitting ? 'Creating...' : 'Create Group Discount'}
            </button>
          </>
        }
      >
        <form onSubmit={submitGroupDiscount} className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            Group discounts encourage buyers to purchase in bulk (e.g. Buy 5 tickets and get 10% off).
          </div>

          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Discount Code</label>
            <input
              required
              value={gForm.code}
              onChange={(e) => setGForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="GROUP5 or SQUAD10"
              className={`${inputCls} font-mono uppercase`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Minimum Tickets Required</label>
              <input
                type="number"
                min="2"
                required
                value={gForm.minQuantity}
                onChange={(e) => setGForm((f) => ({ ...f, minQuantity: e.target.value }))}
                placeholder="5"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-400 mb-1.5 uppercase tracking-wider">Discount (% Off)</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={gForm.discountPct}
                onChange={(e) => setGForm((f) => ({ ...f, discountPct: e.target.value }))}
                placeholder="10"
                className={`${inputCls} text-blue-300 font-semibold`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Applicable Event</label>
            <select
              value={gForm.eventId}
              onChange={(e) => setGForm((f) => ({ ...f, eventId: e.target.value }))}
              className={inputCls}
            >
              <option value="">All Published Events</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Max Uses</label>
              <input
                type="number"
                min="1"
                value={gForm.maxUses}
                onChange={(e) => setGForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="50"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider">Expiry Date (Optional)</label>
              <input
                type="date"
                value={gForm.validTo}
                onChange={(e) => setGForm((f) => ({ ...f, validTo: e.target.value }))}
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
            <button onClick={() => setDeleteCouponTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDeleteCoupon} className="px-4 py-3 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition">Delete</button>
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
            <button onClick={() => setDeleteFlashTarget(null)} className="px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 transition">Cancel</button>
            <button onClick={handleDeleteFlash} className="px-4 py-3 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition">Delete</button>
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
