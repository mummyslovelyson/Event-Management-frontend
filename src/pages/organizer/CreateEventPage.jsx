import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  CalendarDays, Info, MapPin, Ticket as TicketIcon, CheckCircle2,
  ChevronLeft, ChevronRight, Plus, Trash2, Upload, X, Save, Send,
  AlertTriangle, Globe, Navigation, Clock, Layers, Building2,
  Calendar, Check, ShieldCheck, Tag, DollarSign, Image as ImageIcon,
  UserCheck, Search, ArrowRight
} from 'lucide-react';
import { createEvent, getEvent, getCategories, publishEvent, uploadImage } from '@/api/events';
import { getUsers as getAdminUsers } from '@/api/admin';
import { useAuth } from '@/context/AuthContext';
import { POPULAR_CATEGORY_LIST } from '@/utils/categoryImages';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const STEPS = [
  { id: 1, title: 'Basic Information', icon: Info, subtitle: 'Name, details, category & artwork' },
  { id: 2, title: 'Location', icon: MapPin, subtitle: 'Physical venue or virtual livestream' },
  { id: 3, title: 'Date & Time', icon: CalendarDays, subtitle: 'Event schedule & timings' },
  { id: 4, title: 'Publish', icon: CheckCircle2, subtitle: 'Review & submit for approval' },
];

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition';
const labelCls = 'block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider';
const errCls = 'mt-1 text-xs text-rose-400 font-medium';

function Field({ name, label, type = 'text', placeholder, validation, options, textarea, rows, helperText }) {
  const { register, formState: { errors } } = useFormContext();
  const err = errors[name];
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {textarea ? (
        <textarea {...register(name, validation)} rows={rows || 4} placeholder={placeholder} className={inputCls} />
      ) : options ? (
        <select {...register(name, validation)} className={inputCls}>
          <option value="">Select an option...</option>
          {options.map((o) => <option key={o.value ?? o.id ?? o} value={o.value ?? o.id ?? o}>{o.label ?? o.name ?? o}</option>)}
        </select>
      ) : (
        <input type={type} {...register(name, validation)} placeholder={placeholder} className={inputCls} />
      )}
      {helperText && !err && <p className="mt-1 text-[11px] text-[#6B7278]">{helperText}</p>}
      {err && <p className={errCls}>{err.message}</p>}
    </div>
  );
}

/* =========================================================================
   STEP 1: BASIC INFORMATION
   - Event name
   - Description
   - Category
   - Event image (Banner)
   - Gallery (Up to 5 images)
   ========================================================================= */
const StepBasicInfo = ({ categories = [], organizers = [], loadingOrganizers = false, isAdmin = false }) => {
  const { watch, setValue, register, formState: { errors } } = useFormContext();
  const bannerUrl = watch('bannerImage');
  const gallery = watch('additionalImages') || [];
  const currentCategory = watch('category');
  const currentOrgId = watch('organizerId');
  const [orgSearch, setOrgSearch] = useState('');
  const [isSearchingOrg, setIsSearchingOrg] = useState(false);
  const fileRef = useRef(null);
  const galleryRef = useRef(null);
  const [uploading, setUploading] = useState(null); // 'banner' | 'gallery'

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const allCategories = useMemo(() => {
    const list = [...categories];
    if (currentCategory && !list.some((c) => (c.name || c) === currentCategory)) {
      list.unshift({ id: 'current', name: currentCategory, value: currentCategory });
    }
    return list;
  }, [categories, currentCategory]);

  const filteredOrganizers = useMemo(() => {
    if (!orgSearch.trim()) return organizers;
    const q = orgSearch.toLowerCase();
    return organizers.filter(
      (o) =>
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        (o.organizationName && o.organizationName.toLowerCase().includes(q))
    );
  }, [organizers, orgSearch]);

  const selectedOrganizer = useMemo(() => {
    if (!currentOrgId) return null;
    return organizers.find((o) => String(o.id) === String(currentOrgId)) || null;
  }, [organizers, currentOrgId]);

  const getInitials = (str = '') => {
    return str.split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || 'OR';
  };

  const handleBanner = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploading) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Event banner image must be under 5MB');
      return;
    }
    setUploading('banner');
    try {
      const res = await uploadImage(file);
      setValue('bannerImage', res.data.url, { shouldValidate: true, shouldDirty: true });
      toast.success('Event image uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Banner upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleGallery = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || uploading) return;
    if (files.some((f) => f.size > MAX_FILE_SIZE)) {
      toast.error('Each gallery image must be under 5MB');
      return;
    }
    const remainingSlots = Math.max(0, 5 - gallery.length);
    const batch = files.slice(0, remainingSlots);
    if (!batch.length) {
      toast.error('Maximum 5 gallery images allowed');
      return;
    }
    setUploading('gallery');
    try {
      const urls = [];
      for (const file of batch) {
        const res = await uploadImage(file);
        urls.push(res.data.url);
      }
      setValue('additionalImages', [...gallery, ...urls].slice(0, 5), { shouldDirty: true });
      toast.success(`Added ${urls.length} gallery ${urls.length === 1 ? 'image' : 'images'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gallery upload failed');
    } finally {
      setUploading(null);
    }
  };

  const removeGalleryImage = (index) => {
    setValue('additionalImages', gallery.filter((_, i) => i !== index), { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {/* Admin Organizer Selector */}
      {isAdmin && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121620] border border-white/[0.08] space-y-4 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  Event Organizer &amp; Host Assignment
                  <span className="text-[10px] font-mono uppercase tracking-wider bg-white/[0.06] text-neutral-400 border border-white/[0.08] px-2 py-0.5 rounded-md">
                    Admin Control
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Select which organizer account hosts this event and receives attendee ticket sales.
                </p>
              </div>
            </div>
            {loadingOrganizers && (
              <span className="text-xs text-neutral-400 animate-pulse">Loading organizers...</span>
            )}
          </div>

          {/* Hidden input registered for form validation */}
          <input
            type="hidden"
            {...register('organizerId', {
              required: isAdmin ? 'Please select an organizer for this event' : false,
            })}
          />
          {errors.organizerId && <p className={errCls}>{errors.organizerId.message}</p>}

          {/* Selected Organizer Summary Card */}
          {selectedOrganizer && !isSearchingOrg ? (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {getInitials(selectedOrganizer.organizationName || selectedOrganizer.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-xs truncate">
                      {selectedOrganizer.organizationName || selectedOrganizer.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400/10 border border-emerald-400/20 text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {selectedOrganizer.isSelf ? 'Admin Account' : 'Verified Host'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    {selectedOrganizer.email} {selectedOrganizer.phone ? `• ${selectedOrganizer.phone}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setIsSearchingOrg(true); setOrgSearch(''); }}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white border border-white/[0.08] transition cursor-pointer"
                >
                  Change Organizer
                </button>
              </div>
            </div>
          ) : (
            /* Searchable Organizer Picker */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className={labelCls}>
                  {selectedOrganizer ? 'Search & Choose Replacement Organizer' : 'Select Organizer *'}
                </label>
                {selectedOrganizer && (
                  <button
                    type="button"
                    onClick={() => setIsSearchingOrg(false)}
                    className="text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                  >
                    Keep Current Selection
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search by business name, organizer name, or email..."
                  className={`${inputCls} pl-9 pr-8`}
                  autoFocus={isSearchingOrg}
                />
                {orgSearch && (
                  <button
                    type="button"
                    onClick={() => setOrgSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtered Results Dropdown */}
              <div className="max-h-56 overflow-y-auto rounded-xl bg-[#0b0e14] border border-white/[0.08] divide-y divide-white/[0.06]">
                {filteredOrganizers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-400">
                    No organizers found matching &ldquo;{orgSearch}&rdquo;
                  </div>
                ) : (
                  filteredOrganizers.map((org) => {
                    const isSelected = String(currentOrgId) === String(org.id);
                    return (
                      <div
                        key={org.id}
                        onClick={() => {
                          setValue('organizerId', org.id, { shouldValidate: true, shouldDirty: true });
                          setIsSearchingOrg(false);
                          setOrgSearch('');
                        }}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-white/10 text-white font-medium'
                            : 'hover:bg-white/[0.04] text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-white shrink-0">
                            {getInitials(org.organizationName || org.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">
                              {org.organizationName ? `${org.organizationName} (${org.name})` : org.name}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate">
                              {org.email} {org.phone ? `• ${org.phone}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {org.isSelf && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
                              Admin
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Event Name */}
      <Field
        name="title"
        label="Event Name *"
        placeholder="Enter event name or festival title"
        validation={{
          required: 'Event name is required',
          minLength: { value: 5, message: 'Event name must be at least 5 characters' }
        }}
        helperText="A clear, memorable name helps attendees find your event quickly."
      />

      {/* Description */}
      <Field
        name="description"
        label="Description *"
        textarea
        rows={5}
        placeholder="Detail what attendees can expect: the experience, lineup, special guests, dress codes, schedule..."
        validation={{
          required: 'Event description is required',
          minLength: { value: 20, message: 'Please provide at least 20 characters of event details' }
        }}
        helperText="Detailed descriptions increase ticket conversion and reduce attendee queries."
      />

      {/* Category & Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Category *</label>
          <select
            {...register('category', { required: 'Please select an event category' })}
            className={inputCls}
          >
            <option value="">Select category...</option>
            {allCategories.map((c) => (
              <option key={c.value ?? c.id ?? c} value={c.name ?? c.value ?? c}>
                {c.name ?? c.label ?? c}
              </option>
            ))}
          </select>
          {errors.category && <p className={errCls}>{errors.category.message}</p>}
        </div>

        <Field
          name="tags"
          label="Tags (Optional)"
          placeholder="music, festival, outdoor, afrobeats"
          helperText="Comma-separated keywords for discoverability."
        />
      </div>

      {/* Event Image (Banner) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Event Image (Cover Banner) *</label>
          <span className="text-[11px] text-neutral-400">Recommended 1600 × 900px (16:9), Max 5MB</span>
        </div>
        <div
          onClick={() => { if (!uploading) fileRef.current?.click(); }}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            bannerUrl
              ? 'border-white/20 bg-white/[0.02]'
              : 'border-white/[0.12] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.03]'
          }`}
        >
          {uploading === 'banner' ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Upload className="w-8 h-8 text-white mx-auto animate-pulse" />
              <p className="text-xs text-neutral-400">Uploading event cover image...</p>
            </div>
          ) : bannerUrl ? (
            <div className="relative group">
              <img src={bannerUrl} alt="Event cover" className="w-full h-52 object-cover rounded-xl shadow-md" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                <span className="text-xs font-semibold text-white bg-black/70 px-3 py-1.5 rounded-lg">Click to change cover</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setValue('bannerImage', '', { shouldDirty: true }); }}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/70 text-white hover:bg-red-600 transition shadow-lg"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-4">
              <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
              <p className="text-xs text-white font-medium">Click to upload or drag &amp; drop event cover</p>
              <p className="text-[11px] text-neutral-500 mt-1">PNG, JPG, or WebP under 5MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
        </div>
      </div>

      {/* Gallery (Additional Images) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Gallery (Up to 5 Photos)</label>
          <span className="text-[11px] text-neutral-400">{gallery.length}/5 uploaded</span>
        </div>
        <p className="text-[11px] text-neutral-400 mb-3">
          Showcase past editions, venue scenery, artist performances, or seating atmosphere.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {gallery.map((url, idx) => (
            <div key={idx} className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.08] group">
              <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(idx)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/70 text-white hover:bg-red-600 transition shadow"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {gallery.length < 5 && (
            <button
              type="button"
              onClick={() => { if (!uploading) galleryRef.current?.click(); }}
              disabled={!!uploading}
              className="aspect-video sm:aspect-square rounded-xl border-2 border-dashed border-white/[0.12] flex flex-col items-center justify-center text-neutral-400 hover:border-white/20 hover:text-white transition-all bg-white/[0.02] hover:bg-white/[0.04] disabled:opacity-50 cursor-pointer"
            >
              {uploading === 'gallery' ? (
                <Upload className="w-5 h-5 animate-pulse text-white" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mb-1 text-neutral-400" />
                  <span className="text-[11px] font-medium">Add Photo</span>
                </>
              )}
            </button>
          )}
        </div>
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallery} />
      </div>
    </div>
  );
};

/* =========================================================================
   STEP 2: LOCATION
   - Online / Physical selector
   - Venue
   - Address
   - City
   - GPS location
   ========================================================================= */
const StepLocation = () => {
  const { watch, setValue, register, formState: { errors } } = useFormContext();
  const locationType = watch('locationType') || 'physical';
  const gpsLocation = watch('gpsLocation') || '';
  const [detectingGps, setDetectingGps] = useState(false);

  const handleLocationTypeChange = (type) => {
    setValue('locationType', type, { shouldDirty: true, shouldValidate: true });
    if (type === 'online') {
      if (!watch('city')) setValue('city', 'Online', { shouldDirty: true });
      if (!watch('venue')) setValue('venue', 'Virtual Livestream / Online Event', { shouldDirty: true });
    } else {
      if (watch('city') === 'Online') setValue('city', '', { shouldDirty: true });
      if (watch('venue') === 'Virtual Livestream / Online Event') setValue('venue', '', { shouldDirty: true });
    }
  };

  const detectGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const coords = `${lat}, ${lng}`;
        setValue('gpsLocation', coords, { shouldDirty: true, shouldValidate: true });
        setValue('latitude', lat, { shouldDirty: true });
        setValue('longitude', lng, { shouldDirty: true });
        toast.success(`GPS coordinates detected: ${coords}`);
        setDetectingGps(false);
      },
      (err) => {
        setDetectingGps(false);
        toast.error('Could not retrieve GPS location. Please type your coordinates or digital address.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6">
      {/* Online / Physical Toggle */}
      <div>
        <label className={labelCls}>Event Format *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleLocationTypeChange('physical')}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
              locationType === 'physical'
                ? 'bg-white/[0.08] border-white/30 text-white ring-1 ring-white/20 shadow-sm'
                : 'bg-[#121620] border-white/[0.08] text-neutral-400 hover:border-white/20'
            }`}
          >
            <div className={`p-2.5 rounded-xl border ${locationType === 'physical' ? 'bg-white text-black border-transparent' : 'bg-white/[0.04] text-neutral-400 border-white/[0.06]'}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                Physical Venue
                {locationType === 'physical' && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">In-person gathering at a hall, beach, arena, or outdoor grounds.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleLocationTypeChange('online')}
            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
              locationType === 'online'
                ? 'bg-white/[0.08] border-white/30 text-white ring-1 ring-white/20 shadow-sm'
                : 'bg-[#121620] border-white/[0.08] text-neutral-400 hover:border-white/20'
            }`}
          >
            <div className={`p-2.5 rounded-xl border ${locationType === 'online' ? 'bg-white text-black border-transparent' : 'bg-white/[0.04] text-neutral-400 border-white/[0.06]'}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                Online / Virtual
                {locationType === 'online' && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Livestreamed via Zoom, YouTube Live, Google Meet, etc.</p>
            </div>
          </button>
        </div>
      </div>

      {locationType === 'physical' ? (
        <>
          {/* Venue Name */}
          <Field
            name="venue"
            label="Venue Name *"
            placeholder="Venue, hall, or arena name"
            validation={{ required: 'Venue name is required' }}
            helperText="The official hall, building, or location name."
          />

          {/* Address & City & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field
                name="address"
                label="Address *"
                placeholder="Street address or landmark"
                validation={{ required: 'Street address is required' }}
              />
            </div>
            <div>
              <Field
                name="city"
                label="City *"
                placeholder="City or town"
                validation={{ required: 'City is required' }}
              />
            </div>
          </div>

          {/* GPS Location */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls}>GPS Location / Digital Address (Optional)</label>
              <button
                type="button"
                onClick={detectGps}
                disabled={detectingGps}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition cursor-pointer disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 text-neutral-300 ${detectingGps ? 'animate-spin' : ''}`} />
                <span>{detectingGps ? 'Detecting Location...' : 'Auto-Detect Coordinates'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                {...register('gpsLocation')}
                placeholder="GPS coordinates or Digital Address"
                className={inputCls}
              />
              <div className="absolute right-3 top-2.5 text-xs text-[#6B7278]">
                Coordinates or Digital Address
              </div>
            </div>
            <p className="mt-1 text-[11px] text-[#6B7278]">
              Provides one-click navigation for attendees via Google Maps or Apple Maps.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Virtual Platform */}
          <Field
            name="venue"
            label="Streaming Platform / Venue *"
            placeholder="Platform (Zoom, YouTube Live, Google Meet)"
            validation={{ required: 'Streaming platform is required' }}
            helperText="Specify where the online session will take place."
          />

          {/* Meeting Link / Instructions */}
          <Field
            name="address"
            label="Meeting Link or Access Instructions *"
            placeholder="Access link or instructions sent via ticket confirmation"
            validation={{ required: 'Access link or instructions are required' }}
            helperText="Attendees receive this link on their tickets upon purchase."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              name="city"
              label="Region / Target Audience"
              placeholder="Online / Global"
              helperText="Primary target geographic audience or community"
            />
            <Field
              name="gpsLocation"
              label="Virtual Portal / Channel URL (Optional)"
              placeholder="https://..."
            />
          </div>
        </>
      )}
    </div>
  );
};

/* =========================================================================
   STEP 3: DATE & TIME
   - Start date
   - Start time
   - End date
   - End time
   ========================================================================= */
const StepDateTime = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext();
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const endDate = watch('endDate');
  const endTime = watch('endTime');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const setPreset = (type) => {
    if (!startDate) {
      toast.error('Please select a Start Date first');
      return;
    }
    const d = new Date(startDate);
    if (type === 'sameday') {
      setValue('endDate', startDate, { shouldDirty: true, shouldValidate: true });
      if (!startTime) setValue('startTime', '18:00', { shouldDirty: true });
      if (!endTime) setValue('endTime', '23:30', { shouldDirty: true });
      toast.success('Set to Same Day event');
    } else if (type === 'nextday') {
      d.setDate(d.getDate() + 1);
      setValue('endDate', d.toISOString().slice(0, 10), { shouldDirty: true, shouldValidate: true });
      if (!startTime) setValue('startTime', '20:00', { shouldDirty: true });
      if (!endTime) setValue('endTime', '04:00', { shouldDirty: true });
      toast.success('Set to Overnight / Next Day');
    } else if (type === 'weekend') {
      d.setDate(d.getDate() + 2);
      setValue('endDate', d.toISOString().slice(0, 10), { shouldDirty: true, shouldValidate: true });
      toast.success('Set to 3-Day Weekend Festival');
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Schedule Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#121620] border border-white/[0.08]">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Clock className="w-4 h-4 text-neutral-400" />
          <span>Quick schedule helpers:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreset('sameday')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium border border-white/[0.08] transition cursor-pointer"
          >
            Same Day
          </button>
          <button
            type="button"
            onClick={() => setPreset('nextday')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium border border-white/[0.08] transition cursor-pointer"
          >
            Overnight
          </button>
          <button
            type="button"
            onClick={() => setPreset('weekend')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white text-xs font-medium border border-white/[0.08] transition cursor-pointer"
          >
            3-Day Weekend
          </button>
        </div>
      </div>

      {/* Start Date & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Start Date *</label>
          <input
            type="date"
            min={todayStr}
            {...register('startDate', { required: 'Start date is required' })}
            className={inputCls}
          />
          {errors.startDate && <p className={errCls}>{errors.startDate.message}</p>}
        </div>

        <div>
          <label className={labelCls}>Start Time *</label>
          <input
            type="time"
            {...register('startTime', { required: 'Start time is required' })}
            className={inputCls}
          />
          {errors.startTime && <p className={errCls}>{errors.startTime.message}</p>}
        </div>
      </div>

      {/* End Date & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>End Date *</label>
          <input
            type="date"
            min={startDate || todayStr}
            {...register('endDate', {
              required: 'End date is required',
              validate: (val) => !startDate || val >= startDate || 'End date cannot be earlier than start date'
            })}
            className={inputCls}
          />
          {errors.endDate && <p className={errCls}>{errors.endDate.message}</p>}
        </div>

        <div>
          <label className={labelCls}>End Time *</label>
          <input
            type="time"
            {...register('endTime', { required: 'End time is required' })}
            className={inputCls}
          />
          {errors.endTime && <p className={errCls}>{errors.endTime.message}</p>}
        </div>
      </div>

      {/* Dress code & timezone info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Field
          name="dressCode"
          label="Dress Code / Theme (Optional)"
          placeholder="Suggested attire or theme (e.g. All White, Casual)"
          helperText="Suggested attire for attendees."
        />

        <div className="p-3.5 rounded-xl bg-[#121620] border border-white/[0.08] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-white">Event Time Zone</p>
            <p className="text-[11px] text-neutral-400">GMT / Greenwich Mean Time (Accra, London)</p>
          </div>
          <span className="text-[11px] font-semibold text-neutral-300 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
            UTC +0
          </span>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   STEP 4: PUBLISH & REVIEW
   - Review overview
   - Save Draft
   - or Submit for Approval
   ========================================================================= */
const StepPublish = ({
  onSaveDraft,
  onSubmitApproval,
  onPublishImmediately,
  submitting,
  eventId,
  eventStatus,
  isAdmin = false,
  organizers = [],
}) => {
  const { watch } = useFormContext();
  const { format } = useCurrency();
  const data = watch();

  const selectedOrganizer = useMemo(() => {
    if (!data.organizerId) return null;
    return organizers.find((o) => String(o.id) === String(data.organizerId)) || null;
  }, [organizers, data.organizerId]);

  const totalTickets = useMemo(() => {
    return (data.ticketTypes || []).reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  }, [data.ticketTypes]);

  const totalGross = useMemo(() => {
    return (data.ticketTypes || []).reduce((sum, t) => sum + ((Number(t.quantity) || 0) * (Number(t.price) || 0)), 0);
  }, [data.ticketTypes]);

  return (
    <div className="space-y-6">
      {/* Overview Hero Card */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#121620]">
        {data.bannerImage ? (
          <div className="relative h-44 sm:h-56 w-full">
            <img src={data.bannerImage} alt="Event cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121620] via-[#121620]/60 to-transparent" />
          </div>
        ) : (
          <div className="h-28 bg-white/[0.02] border-b border-white/[0.06]" />
        )}

        <div className="p-5 sm:p-6 -mt-12 relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-white text-black">
              {data.category || 'General Event'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/[0.04] text-white border border-white/[0.08]">
              {data.locationType === 'online' ? 'Online Event' : 'Physical Venue'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
              {totalTickets.toLocaleString()} Total Capacity
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{data.title || 'Untitled Event'}</h2>
            <p className="text-xs text-neutral-400 mt-1.5 line-clamp-3 leading-relaxed">
              {data.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Host Banner (if admin) */}
      {isAdmin && selectedOrganizer && (
        <div className="p-4 rounded-2xl bg-[#121620] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                Assigned Event Organizer / Host:
              </span>
              <span className="text-xs font-semibold text-white">
                {selectedOrganizer.organizationName ? `${selectedOrganizer.organizationName} (${selectedOrganizer.name})` : selectedOrganizer.name}
              </span>
            </div>
          </div>
          <span className="text-xs text-neutral-300 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.08] self-start sm:self-center font-mono">
            {selectedOrganizer.email}
          </span>
        </div>
      )}

      {/* 2-Column Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121620] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
            <span>Location Details</span>
          </div>
          <div className="text-xs space-y-2 text-neutral-400">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase">Venue</span>
              <span className="text-white font-medium text-xs">{data.venue || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase">Address</span>
              <span className="text-neutral-300 text-xs">{data.address || '—'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">City</span>
                <span className="text-white font-medium text-xs">{data.city || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">GPS / Coords</span>
                <span className="text-neutral-300 font-mono text-xs">{data.gpsLocation || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121620] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-xs">
            <CalendarDays className="w-3.5 h-3.5 text-neutral-400" />
            <span>Date &amp; Schedule</span>
          </div>
          <div className="text-xs space-y-2 text-neutral-400">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Start Date</span>
                <span className="text-white font-medium text-xs">{data.startDate || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Start Time</span>
                <span className="text-white font-medium text-xs">{data.startTime || '—'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">End Date</span>
                <span className="text-white font-medium text-xs">{data.endDate || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">End Time</span>
                <span className="text-white font-medium text-xs">{data.endTime || '—'}</span>
              </div>
            </div>
            {data.dressCode && (
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Dress Code</span>
                <span className="text-neutral-300 text-xs">{data.dressCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Setup Notification Card */}
      <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
              <TicketIcon className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white">Tickets &amp; Admissions</h4>
                <span className="text-[10px] font-semibold text-neutral-300 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                  Configured Separately
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Tickets are created and managed separately on the Tickets page. You do not need to upload or configure ticket passes now. Once this event is saved, you will be directed straight to the Tickets dashboard to add tiers, pricing, capacity, and barcodes.
              </p>
            </div>
          </div>
          {eventId && (
            <a
              href={`/organizer/tickets?event=${eventId}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white border border-white/[0.08] transition shrink-0"
            >
              <span>Manage Tickets</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Existing ticket tiers display if editing an event that already has tickets */}
        {(data.ticketTypes || []).length > 0 && (
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Existing Configured Tiers ({(data.ticketTypes || []).length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.ticketTypes.map((t, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-white">{t.name || `Tier ${idx + 1}`}</span>
                    <span className="text-[11px] text-neutral-500 block">{Number(t.quantity || 0).toLocaleString()} passes</span>
                  </div>
                  <span className="font-semibold text-white">
                    {Number(t.price) > 0 ? format(t.price) : 'Free'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gallery Preview (if present) */}
      {(data.additionalImages || []).length > 0 && (
        <div className="p-4 rounded-2xl bg-[#121620] border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
            <span>Gallery Images ({(data.additionalImages || []).length})</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {data.additionalImages.map((img, i) => (
              <img key={i} src={img} alt="" className="aspect-square object-cover rounded-xl border border-white/[0.08]" />
            ))}
          </div>
        </div>
      )}

      {/* Publish Actions Callout */}
      <div className="p-5 rounded-2xl bg-[#121620] border border-white/[0.08] space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-neutral-300 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-white">
              {isAdmin ? 'Platform Administrator Publishing Authority' : 'Ready to publish your event?'}
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              {isAdmin
                ? 'Create and publish the event details now. After submission, you will be taken straight to the Tickets page to configure ticket tiers and pricing.'
                : 'Save as a draft or publish your event details now. After submission, you will be taken straight to the Tickets page to configure ticket tiers and pricing.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={submitting}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-neutral-400" />
            <span>{submitting ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={onSubmitApproval}
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-neutral-400" />
                <span>Save as Pending</span>
              </button>

              <button
                type="button"
                onClick={onPublishImmediately}
                disabled={submitting}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                <span>{submitting ? 'Publishing...' : 'Publish Event Live (Instant)'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSubmitApproval}
              disabled={submitting}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : (eventId ? 'Submit Changes for Approval' : 'Submit for Approval')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   MAIN CREATE EVENT PAGE COMPONENT
   ========================================================================= */
export default function CreateEventPage({ initialValues, eventId, onSubmit: customSubmit, eventStatus, rejectionReason } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'system_admin' || user?.role === 'superadmin';
  const [organizers, setOrganizers] = useState([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(false);
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingInit, setLoadingInit] = useState(!initialValues && !!eventId);

  const methods = useForm({
    defaultValues: initialValues || {
      title: '',
      description: '',
      category: '',
      organizerId: '',
      tags: '',
      locationType: 'physical',
      venue: '',
      address: '',
      city: '',
      gpsLocation: '',
      latitude: '',
      longitude: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      dressCode: '',
      bannerImage: '',
      additionalImages: [],
      ticketTypes: [],
    },
  });

  const { handleSubmit, trigger, reset, formState: { errors } } = methods;

  // Load organizers for admin to assign
  useEffect(() => {
    if (isAdmin) {
      setLoadingOrganizers(true);
      getAdminUsers({ role: 'organizer', limit: 100 })
        .then((res) => {
          const raw = Array.isArray(res.data) ? res.data : res.data?.users || res.data?.data || [];
          const orgList = raw.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            organizationName: u.organizationName || u.organization?.name || '',
            isApproved: u.is_approved || u.status === 'active',
          }));
          const adminSelf = {
            id: user?.id,
            name: `${user?.name || 'Platform Admin'} (Admin Account)`,
            email: user?.email,
            organizationName: 'Platform Administration',
            isApproved: true,
            isSelf: true,
          };
          setOrganizers([adminSelf, ...orgList]);
        })
        .catch((err) => {
          console.error('[CreateEventPage] Error loading organizers:', err);
        })
        .finally(() => {
          setLoadingOrganizers(false);
        });
    }
  }, [isAdmin, user]);

  // Load existing event data when editing
  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
      setLoadingInit(false);
    } else if (eventId) {
      setLoadingInit(true);
      getEvent(eventId)
        .then((res) => {
          const e = res.data?.event || res.data;
          if (e) {
            reset({
              title: e.title || '',
              description: e.description || '',
              category: e.category || '',
              organizerId: e.organizer_id || e.organizer?.id || '',
              tags: Array.isArray(e.tags) ? e.tags.join(', ') : e.tags || '',
              locationType: e.location_type || (e.venue?.toLowerCase().includes('online') ? 'online' : 'physical'),
              venue: e.venue || '',
              address: e.address || '',
              city: e.city || '',
              gpsLocation: e.gps_location || (e.latitude && e.longitude ? `${e.latitude}, ${e.longitude}` : ''),
              latitude: e.latitude || '',
              longitude: e.longitude || '',
              startDate: e.start_date ? String(e.start_date).slice(0, 10) : '',
              endDate: e.end_date ? String(e.end_date).slice(0, 10) : '',
              startTime: e.start_time ? String(e.start_time).slice(0, 5) : '',
              endTime: e.end_time ? String(e.end_time).slice(0, 5) : '',
              dressCode: e.dress_code || '',
              bannerImage: e.banner_image || '',
              additionalImages: Array.isArray(e.images) ? e.images : [],
              ticketTypes: (e.ticket_types || []).length
                ? e.ticket_types.map((t) => {
                    const upl = t.uploadedTickets || t.uploaded_tickets || [];
                    return {
                      id: t.id,
                      name: t.name || '',
                      price: t.price ?? 0,
                      quantity: upl.length > 0 ? upl.length : (t.quantity || 1),
                      description: t.description || '',
                      saleStartDate: t.sale_start ? String(t.sale_start).slice(0, 10) : '',
                      saleEndDate: t.sale_end ? String(t.sale_end).slice(0, 10) : '',
                      uploadedTickets: upl,
                    };
                  })
                : [],
            });
          }
        })
        .catch((err) => {
          console.error('[CreateEventPage] Error loading event:', err);
          toast.error(err.response?.data?.message || 'Failed to load event data');
          navigate(isAdmin ? '/admin/events' : '/organizer/events');
        })
        .finally(() => {
          setLoadingInit(false);
        });
    } else {
      setLoadingInit(false);
    }
  }, [eventId, initialValues, reset, navigate, isAdmin]);

  // Load categories
  useEffect(() => {
    getCategories()
      .then((res) => {
        const apiCats = Array.isArray(res.data) ? res.data : res.data?.categories || [];
        const existingNames = new Set(apiCats.map((c) => (c.name || c).toLowerCase()));
        const merged = [...apiCats];
        POPULAR_CATEGORY_LIST.forEach((item) => {
          if (!existingNames.has(item.name.toLowerCase())) {
            merged.push({ id: item.slug, name: item.name });
          }
        });
        setCategories(merged);
      })
      .catch(() => setCategories(POPULAR_CATEGORY_LIST.map((item) => ({ id: item.slug, name: item.name }))));
  }, []);

  // Step validation fields mapping
  const stepFields = {
    1: isAdmin ? ['title', 'description', 'category', 'organizerId'] : ['title', 'description', 'category'],
    2: methods.watch('locationType') === 'online' ? ['venue', 'address'] : ['venue', 'address', 'city'],
    3: ['startDate', 'endDate', 'startTime', 'endTime'],
  };

  const next = async () => {
    const fieldsToValidate = stepFields[step];
    if (fieldsToValidate) {
      const valid = await trigger(fieldsToValidate);
      if (!valid) {
        const formErrors = methods.formState.errors;
        const failedKey = fieldsToValidate.find((f) => formErrors[f]);
        const msg = (failedKey && formErrors[failedKey]?.message) || 'Please complete all required fields';
        toast.error(msg);
        return;
      }
    }

    setStep((s) => Math.min(4, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const goToStep = (targetStep) => {
    if (targetStep >= 1 && targetStep <= 4) {
      setStep(targetStep);
    }
  };

  const onInvalid = (formErrors) => {
    console.warn('[CreateEventPage] Form validation blocked:', formErrors);
    const errorKeys = Object.keys(formErrors);
    if (!errorKeys.length) return;

    const step1Keys = ['title', 'description', 'category', 'organizerId'];
    const step2Keys = ['venue', 'address', 'city'];
    const step3Keys = ['startDate', 'endDate', 'startTime', 'endTime'];

    let targetStep = 1;
    if (errorKeys.some((k) => step1Keys.includes(k))) targetStep = 1;
    else if (errorKeys.some((k) => step2Keys.includes(k))) targetStep = 2;
    else if (errorKeys.some((k) => step3Keys.includes(k))) targetStep = 3;
    else targetStep = 4;

    const firstErr = formErrors[errorKeys[0]];
    const msg = firstErr?.message || 'Please check the required fields';
    toast.error(`Step ${targetStep}: ${msg}`);
    setStep(targetStep);
  };

  const submit = async (data, status) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        tags: typeof data.tags === 'string' ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : data.tags,
        status,
      };

      let resultId = eventId;
      if (customSubmit) {
        const res = await customSubmit(payload);
        resultId = res?.data?.id || res?.data?.event?.id || eventId;
        if (status === 'pending' || status === 'published') {
          if (eventId) await publishEvent(eventId).catch(() => {});
        }
      } else {
        const res = await createEvent(payload);
        resultId = res?.data?.id || res?.data?.event?.id || res?.data?.eventId || res?.data?.insertId;
      }

      if (status === 'pending') {
        toast.success(eventId ? 'Event changes submitted for review!' : 'Event created! Now configure tickets on the Tickets page.');
      } else if (status === 'published') {
        toast.success('Event published! Now configure your tickets.');
      } else {
        toast.success(eventId ? 'Event changes saved!' : 'Event draft saved! Configure tickets on the Tickets page.');
      }

      // Direct both organizers and admins to the tickets page for this event
      if (resultId) {
        navigate(`/organizer/tickets?event=${resultId}`);
      } else {
        navigate(isAdmin ? '/admin/events' : '/organizer/events');
      }
    } catch (err) {
      console.error('[CreateEventPage.submit] Error:', err);
      toast.error(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) return <LoadingSpinner label="Loading event data..." className="py-20" />;

  const progress = (step / STEPS.length) * 100;

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
        {eventStatus === 'changes_requested' && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Admin Requested Changes</p>
              <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                {rejectionReason || 'Please review the requested changes below, make the modifications, and resubmit for approval.'}
              </p>
            </div>
          </div>
        )}

        {eventStatus === 'rejected' && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Event Submission Rejected</p>
              <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                {rejectionReason ? `Reason: ${rejectionReason}` : 'Review the feedback, make any requested adjustments, and resubmit for approval.'}
              </p>
            </div>
          </div>
        )}

        {eventStatus === 'pending' && (
          <div className="rounded-2xl border border-white/[0.08] bg-[#121620] p-4 text-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Event Currently Under Review</p>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                This event has been submitted to the platform admin team for moderation. You can still make updates and resubmit anytime.
              </p>
            </div>
          </div>
        )}

        <PageHeader
          icon={CalendarDays}
          accent="gold"
          title={eventId ? 'Edit Event' : 'Create New Event'}
          subtitle={isAdmin ? 'Configure event details, select the organizer, and publish.' : 'Complete the 4-step event creation wizard to publish your event. Tickets are managed separately on the Tickets page.'}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(isAdmin ? '/admin/events' : '/organizer/events')}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit((d) => submit(d, 'draft'), onInvalid)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition disabled:opacity-50 cursor-pointer"
                title="Save progress as draft at any stage"
              >
                <Save className="w-3.5 h-3.5 text-neutral-400" />
                <span>{submitting ? 'Saving...' : 'Save Draft'}</span>
              </button>
            </div>
          }
        />

        {/* 4-Step Clickable Progress Stepper */}
        <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => goToStep(s.id)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                  title={`Step ${s.id}: ${s.title}`}
                >
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      step === s.id
                        ? 'bg-white text-black ring-4 ring-white/20 font-bold scale-105 shadow-md'
                        : step > s.id
                        ? 'bg-white/[0.08] text-white border border-white/20 group-hover:bg-white group-hover:text-black'
                        : 'bg-white/[0.03] text-neutral-500 border border-white/[0.06] group-hover:text-neutral-300'
                    }`}
                  >
                    {step > s.id ? <Check className="w-3.5 h-3.5 text-white group-hover:text-black" /> : <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>
                  <div className="text-center hidden sm:block">
                    <span
                      className={`text-[11px] font-medium block transition-colors ${
                        step === s.id
                          ? 'text-white font-semibold'
                          : step > s.id
                          ? 'text-neutral-300'
                          : 'text-neutral-500 group-hover:text-neutral-300'
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                </button>
                {s.id < STEPS.length && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${step > s.id ? 'bg-white/40' : 'bg-white/[0.06]'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Step Container */}
        <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 sm:p-7 min-h-[360px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.06]">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Step {step} of 4: {STEPS[step - 1].title}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">{STEPS[step - 1].subtitle}</p>
                </div>
                <span className="text-[11px] font-mono font-medium text-neutral-300 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
                  Step {step} / 4
                </span>
              </div>

              {step === 1 && (
                <StepBasicInfo
                  categories={categories}
                  organizers={organizers}
                  loadingOrganizers={loadingOrganizers}
                  isAdmin={isAdmin}
                />
              )}
              {step === 2 && <StepLocation />}
              {step === 3 && <StepDateTime />}
              {step === 4 && (
                <StepPublish
                  onSaveDraft={handleSubmit((d) => submit(d, 'draft'), onInvalid)}
                  onSubmitApproval={handleSubmit((d) => submit(d, 'pending'), onInvalid)}
                  onPublishImmediately={handleSubmit((d) => submit(d, 'published'), onInvalid)}
                  submitting={submitting}
                  eventId={eventId}
                  eventStatus={eventStatus}
                  isAdmin={isAdmin}
                  organizers={organizers}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={back}
            disabled={step === 1 || submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200 disabled:opacity-60 transition shadow-sm cursor-pointer"
            >
              Continue to Step {step + 1} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit((d) => submit(d, 'draft'), onInvalid)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={handleSubmit((d) => submit(d, 'pending'), onInvalid)}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Save as Pending
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit((d) => submit(d, 'published'), onInvalid)}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Publish Event Live
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit((d) => submit(d, 'pending'), onInvalid)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Submit for Approval
                </button>
              )}
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
