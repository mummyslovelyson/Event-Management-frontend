import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  CalendarDays, Info, MapPin, Ticket as TicketIcon, CheckCircle2,
  ChevronLeft, ChevronRight, Plus, Trash2, Upload, X, Save, Send,
  AlertTriangle, Globe, Navigation, Clock, Sparkles, Layers, Building2,
  Calendar, Check, ShieldCheck, Tag, DollarSign, Image as ImageIcon
} from 'lucide-react';
import { createEvent, getEvent, getCategories, publishEvent, uploadImage } from '@/api/events';
import { POPULAR_CATEGORY_LIST } from '@/utils/categoryImages';
import TicketFilesUploader from '@/components/organizer/TicketFilesUploader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const STEPS = [
  { id: 1, title: 'Basic Information', icon: Info, subtitle: 'Name, details, category & artwork' },
  { id: 2, title: 'Location', icon: MapPin, subtitle: 'Physical venue or virtual livestream' },
  { id: 3, title: 'Date & Time', icon: CalendarDays, subtitle: 'Event schedule & timings' },
  { id: 4, title: 'Tickets', icon: TicketIcon, subtitle: 'Pricing, tiers & quantities' },
  { id: 5, title: 'Publish', icon: CheckCircle2, subtitle: 'Review & submit for approval' },
];

const inputCls =
  'w-full px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition';
const labelCls = 'block text-xs font-semibold text-[#949599] mb-1.5 uppercase tracking-wider';
const errCls = 'mt-1 text-xs text-red-400 font-medium';

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
const StepBasicInfo = ({ categories = [] }) => {
  const { watch, setValue, register, formState: { errors } } = useFormContext();
  const bannerUrl = watch('bannerImage');
  const gallery = watch('additionalImages') || [];
  const currentCategory = watch('category');
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
      {/* Event Name */}
      <Field
        name="title"
        label="Event Name *"
        placeholder="e.g. Accra AfroFusion & Jazz Festival 2026"
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
          <span className="text-[11px] text-[#949599]">Recommended 1600 × 900px (16:9), Max 5MB</span>
        </div>
        <div
          onClick={() => { if (!uploading) fileRef.current?.click(); }}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            bannerUrl
              ? 'border-emerald-500/40 bg-[#171A1D]'
              : 'border-[#494F55]/50 hover:border-white/40 bg-[#171A1D]'
          }`}
        >
          {uploading === 'banner' ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Upload className="w-8 h-8 text-white mx-auto animate-pulse" />
              <p className="text-sm text-[#949599]">Uploading event cover image...</p>
            </div>
          ) : bannerUrl ? (
            <div className="relative group">
              <img src={bannerUrl} alt="Event cover" className="w-full h-52 object-cover rounded-lg shadow-md" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                <span className="text-xs font-semibold text-white bg-black/70 px-3 py-1.5 rounded-md">Click to change cover</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setValue('bannerImage', '', { shouldDirty: true }); }}
                className="absolute top-2 right-2 p-2 rounded-md bg-black/70 text-white hover:bg-red-600 transition shadow-lg"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-4">
              <Upload className="w-8 h-8 text-[#494F55] mx-auto mb-2" />
              <p className="text-sm text-[#EFEFF1] font-medium">Click to upload or drag &amp; drop event cover</p>
              <p className="text-xs text-[#6B7278] mt-1">PNG, JPG, or WebP under 5MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
        </div>
      </div>

      {/* Gallery (Additional Images) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Gallery (Up to 5 Photos)</label>
          <span className="text-[11px] text-[#949599]">{gallery.length}/5 uploaded</span>
        </div>
        <p className="text-xs text-[#6B7278] mb-3">
          Showcase past editions, venue scenery, artist performances, or seating atmosphere.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {gallery.map((url, idx) => (
            <div key={idx} className="relative aspect-video sm:aspect-square rounded-lg overflow-hidden bg-[#242B32] border border-[#3A4045] group">
              <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(idx)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/70 text-white hover:bg-red-600 transition shadow"
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
              className="aspect-video sm:aspect-square rounded-lg border-2 border-dashed border-[#494F55]/50 flex flex-col items-center justify-center text-[#949599] hover:border-white/40 hover:text-white transition-all bg-[#171A1D]/60 hover:bg-[#171A1D] disabled:opacity-50 cursor-pointer"
            >
              {uploading === 'gallery' ? (
                <Upload className="w-5 h-5 animate-pulse text-white" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mb-1" />
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
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
              locationType === 'physical'
                ? 'bg-white/10 border-white text-white ring-1 ring-white/30 shadow-md'
                : 'bg-[#171A1D] border-[#262B2F] text-[#949599] hover:border-[#494F55]'
            }`}
          >
            <div className={`p-2 rounded-lg ${locationType === 'physical' ? 'bg-white text-[#111417]' : 'bg-[#242B32] text-[#949599]'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#EFEFF1] flex items-center gap-1.5">
                Physical Venue
                {locationType === 'physical' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-[#949599] mt-0.5">In-person gathering at a hall, beach, arena, or outdoor grounds.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleLocationTypeChange('online')}
            className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
              locationType === 'online'
                ? 'bg-white/10 border-white text-white ring-1 ring-white/30 shadow-md'
                : 'bg-[#171A1D] border-[#262B2F] text-[#949599] hover:border-[#494F55]'
            }`}
          >
            <div className={`p-2 rounded-lg ${locationType === 'online' ? 'bg-white text-[#111417]' : 'bg-[#242B32] text-[#949599]'}`}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#EFEFF1] flex items-center gap-1.5">
                Online / Virtual
                {locationType === 'online' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-[#949599] mt-0.5">Livestreamed via Zoom, YouTube Live, Google Meet, etc.</p>
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
            placeholder="e.g. National Theatre / Labadi Beach Hotel / Untamed Empire"
            validation={{ required: 'Venue name is required' }}
            helperText="The official hall, building, or location name."
          />

          {/* Address & City & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Field
                name="address"
                label="Address *"
                placeholder="e.g. South Liberia Road, Ministries / 1st Labadi Bypass"
                validation={{ required: 'Street address is required' }}
              />
            </div>
            <div>
              <Field
                name="city"
                label="City *"
                placeholder="e.g. Accra, Kumasi, Takoradi"
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
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition cursor-pointer"
              >
                <Navigation className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                <span>{detectingGps ? 'Detecting GPS...' : '📍 Use Current GPS'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                {...register('gpsLocation')}
                placeholder="e.g. 5.55602, -0.19690 or GhanaPost GPS (GA-183-9204)"
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
            placeholder="e.g. Zoom Webinar / YouTube Live / Google Meet"
            validation={{ required: 'Streaming platform is required' }}
            helperText="Specify where the online session will take place."
          />

          {/* Meeting Link / Instructions */}
          <Field
            name="address"
            label="Meeting Link or Access Instructions *"
            placeholder="e.g. https://zoom.us/j/123456789 or Access link sent via ticket confirmation"
            validation={{ required: 'Access link or instructions are required' }}
            helperText="Attendees receive this link on their tickets upon purchase."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              name="city"
              label="Region / Target Audience"
              placeholder="Online / Global"
              helperText="E.g. Ghana & Diaspora, Global, West Africa"
            />
            <Field
              name="gpsLocation"
              label="Virtual Portal / Channel URL (Optional)"
              placeholder="e.g. https://tribesandcliqs.com/live"
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#242B32]/70 border border-[#3A4045]">
        <div className="flex items-center gap-2 text-xs text-[#949599]">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Quick schedule helpers:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreset('sameday')}
            className="px-2.5 py-1.5 rounded-md bg-[#171A1D] hover:bg-white/10 text-[#EFEFF1] text-xs font-medium border border-[#494F55]/40 transition"
          >
            ⚡ Same Day
          </button>
          <button
            type="button"
            onClick={() => setPreset('nextday')}
            className="px-2.5 py-1.5 rounded-md bg-[#171A1D] hover:bg-white/10 text-[#EFEFF1] text-xs font-medium border border-[#494F55]/40 transition"
          >
            🌙 Overnight
          </button>
          <button
            type="button"
            onClick={() => setPreset('weekend')}
            className="px-2.5 py-1.5 rounded-md bg-[#171A1D] hover:bg-white/10 text-[#EFEFF1] text-xs font-medium border border-[#494F55]/40 transition"
          >
            🎪 3-Day Festival
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
          placeholder="e.g. All White / Black Tie / African Chic / Casual"
          helperText="Suggested attire for attendees."
        />

        <div className="p-3.5 rounded-lg bg-[#171A1D] border border-[#262B2F] flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#EFEFF1]">Event Time Zone</p>
            <p className="text-[11px] text-[#6B7278]">GMT / Greenwich Mean Time (Accra, London)</p>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            UTC +0
          </span>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   STEP 4: TICKETS
   - Ticket name
   - Price (GHS)
   - Quantity
   - Sales start
   - Sales end
   - Standard presets: Regular GHS 100 1,000 | VIP GHS 250 300 | VVIP GHS 500 100
   ========================================================================= */
const StepTickets = () => {
  const { control, register, watch, setValue, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'ticketTypes' });
  const { format } = useCurrency();

  const ticketTypes = watch('ticketTypes') || [];

  // Calculate total tickets and projected gross revenue
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalGross = 0;
    ticketTypes.forEach((t) => {
      const q = Number(t.quantity) || 0;
      const p = Number(t.price) || 0;
      totalQty += q;
      totalGross += q * p;
    });
    return { totalQty, totalGross };
  }, [ticketTypes]);

  const addTicket = () => {
    append({
      name: '',
      price: '',
      quantity: '',
      description: '',
      saleStartDate: '',
      saleEndDate: '',
      uploadedTickets: [],
    });
  };

  /**
   * Exact requirement preset:
   * Ticket: Regular | Price: GHS 100 | Quantity: 1,000
   * Ticket: VIP     | Price: GHS 250 | Quantity: 300
   * Ticket: VVIP    | Price: GHS 500 | Quantity: 100
   */
  const loadGhanaianStandardPreset = () => {
    setValue('ticketTypes', [
      {
        name: 'Regular',
        price: 100,
        quantity: 1000,
        description: 'General admission pass with complete festival and stage access.',
        saleStartDate: '',
        saleEndDate: '',
        uploadedTickets: [],
      },
      {
        name: 'VIP',
        price: 250,
        quantity: 300,
        description: 'Priority express gate entry, designated VIP lounge, private bar and restroom access.',
        saleStartDate: '',
        saleEndDate: '',
        uploadedTickets: [],
      },
      {
        name: 'VVIP',
        price: 500,
        quantity: 100,
        description: 'Front-row stage view, complimentary champagne welcome, private wait-service, and backstage pass.',
        saleStartDate: '',
        saleEndDate: '',
        uploadedTickets: [],
      },
    ], { shouldValidate: true, shouldDirty: true });

    toast.success('Standard Ghanaian tiers loaded: Regular GHS 100 (1k) • VIP GHS 250 (300) • VVIP GHS 500 (100)');
  };

  return (
    <div className="space-y-5">
      {/* 1-Click Ghanaian Standard Tiers Preset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#1C232B] to-[#1C232B] border border-amber-500/30 shadow-sm">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Standard Admission Matrix
          </div>
          <p className="text-xs text-[#949599] mt-0.5">
            Quickly fill the platform standard admission tiers: Regular GHS 100 &bull; VIP GHS 250 &bull; VVIP GHS 500
          </p>
        </div>
        <button
          type="button"
          onClick={loadGhanaianStandardPreset}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition shadow cursor-pointer shrink-0"
        >
          ⚡ Load Standard Matrix (Regular • VIP • VVIP)
        </button>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <span className="text-[11px] font-medium text-[#949599] block uppercase">Ticket Tiers</span>
          <span className="text-lg font-bold text-[#EFEFF1]">{fields.length}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <span className="text-[11px] font-medium text-[#949599] block uppercase">Total Capacity</span>
          <span className="text-lg font-bold text-white">{stats.totalQty.toLocaleString()} tickets</span>
        </div>
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-[#171A1D] border border-amber-500/20">
          <span className="text-[11px] font-medium text-amber-400 block uppercase">Projected Gross Revenue</span>
          <span className="text-lg font-bold text-amber-400">{format(stats.totalGross)}</span>
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        <AnimatePresence>
          {fields.map((f, i) => {
            const ticketErr = errors?.ticketTypes?.[i];
            const currentUploaded = watch(`ticketTypes.${i}.uploadedTickets`) || [];
            const hasUploaded = currentUploaded.length > 0;

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 sm:p-5 space-y-4 transition-all"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#262B2F]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {watch(`ticketTypes.${i}.name`) || `Ticket Tier ${i + 1}`}
                    </span>
                    {hasUploaded && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        {currentUploaded.length} pre-generated passes
                      </span>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="p-1.5 rounded-md text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                      title="Delete ticket tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Primary Row: Name, Price, Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Ticket Name *</label>
                    <input
                      {...register(`ticketTypes.${i}.name`, { required: 'Ticket name is required' })}
                      placeholder="e.g. Regular, VIP, VVIP, Early Bird"
                      className={inputCls}
                    />
                    {ticketErr?.name && <p className={errCls}>{ticketErr.name.message}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>Price (GHS) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-[#949599] font-semibold">GHS</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        {...register(`ticketTypes.${i}.price`, {
                          required: 'Price is required (enter 0 for free)',
                          min: { value: 0, message: 'Price cannot be negative' }
                        })}
                        placeholder="100"
                        className={`${inputCls} pl-12`}
                      />
                    </div>
                    {ticketErr?.price && <p className={errCls}>{ticketErr.price.message}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>Quantity Available *</label>
                    <input
                      type="number"
                      min="1"
                      {...register(`ticketTypes.${i}.quantity`, {
                        required: hasUploaded ? false : 'Quantity is required',
                        min: { value: 1, message: 'Minimum 1 ticket required' }
                      })}
                      readOnly={hasUploaded}
                      placeholder="1000"
                      className={`${inputCls} ${hasUploaded ? 'bg-[#12161A] text-amber-300 font-bold border-amber-400/30' : ''}`}
                    />
                    {ticketErr?.quantity && <p className={errCls}>{ticketErr.quantity.message}</p>}
                  </div>
                </div>

                {/* Sales Start & End Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Sales Start Date (Optional)</label>
                    <input
                      type="date"
                      {...register(`ticketTypes.${i}.saleStartDate`)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Sales End Date (Optional)</label>
                    <input
                      type="date"
                      {...register(`ticketTypes.${i}.saleEndDate`)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Perks / Description */}
                <div>
                  <label className={labelCls}>Perks &amp; Description (Optional)</label>
                  <input
                    type="text"
                    {...register(`ticketTypes.${i}.description`)}
                    placeholder="e.g. Complimentary welcome cocktail, VIP lounge access, fast-track entrance"
                    className={inputCls}
                  />
                </div>

                {/* Optional pre-generated ticket files / barcode passes */}
                <div className="pt-2 border-t border-[#262B2F]">
                  <TicketFilesUploader
                    files={currentUploaded}
                    onChange={(newFiles) => {
                      setValue(`ticketTypes.${i}.uploadedTickets`, newFiles, { shouldValidate: true, shouldDirty: true });
                      if (newFiles && newFiles.length > 0) {
                        setValue(`ticketTypes.${i}.quantity`, newFiles.length, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <button
          type="button"
          onClick={addTicket}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#494F55]/40 text-sm font-medium text-[#949599] hover:border-white/40 hover:text-white transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Another Ticket Type
        </button>
      </div>
    </div>
  );
};

/* =========================================================================
   STEP 5: PUBLISH
   - Review overview
   - Save Draft
   - or Submit for Approval
   ========================================================================= */
const StepPublish = ({ onSaveDraft, onSubmitApproval, submitting, eventId, eventStatus }) => {
  const { watch } = useFormContext();
  const { format } = useCurrency();
  const data = watch();

  const totalTickets = useMemo(() => {
    return (data.ticketTypes || []).reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
  }, [data.ticketTypes]);

  const totalGross = useMemo(() => {
    return (data.ticketTypes || []).reduce((sum, t) => sum + ((Number(t.quantity) || 0) * (Number(t.price) || 0)), 0);
  }, [data.ticketTypes]);

  return (
    <div className="space-y-6">
      {/* Overview Hero Card */}
      <div className="relative rounded-2xl overflow-hidden border border-[#3A4045] bg-[#171A1D]">
        {data.bannerImage ? (
          <div className="relative h-44 sm:h-56 w-full">
            <img src={data.bannerImage} alt="Event cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111417] via-[#111417]/60 to-transparent" />
          </div>
        ) : (
          <div className="h-28 bg-gradient-to-r from-amber-500/20 via-[#242B32] to-[#171A1D]" />
        )}

        <div className="p-5 sm:p-6 -mt-12 relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-amber-400 text-black">
              {data.category || 'General Event'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/10 text-white border border-white/20">
              {data.locationType === 'online' ? '🌐 Online Event' : '📍 In-Person'}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {totalTickets.toLocaleString()} Total Capacity
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">{data.title || 'Untitled Event'}</h2>
            <p className="text-sm text-[#949599] mt-1.5 line-clamp-3 leading-relaxed">
              {data.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location Box */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#242B32]/70 border border-[#3A4045] space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Location Details</span>
          </div>
          <div className="text-xs space-y-2 text-[#949599]">
            <div>
              <span className="text-[#6B7278] block">Venue</span>
              <span className="text-[#EFEFF1] font-medium text-sm">{data.venue || '—'}</span>
            </div>
            <div>
              <span className="text-[#6B7278] block">Address</span>
              <span className="text-[#EFEFF1]">{data.address || '—'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[#6B7278] block">City</span>
                <span className="text-[#EFEFF1] font-medium">{data.city || '—'}</span>
              </div>
              <div>
                <span className="text-[#6B7278] block">GPS / Coords</span>
                <span className="text-[#EFEFF1] font-mono">{data.gpsLocation || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time Box */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#242B32]/70 border border-[#3A4045] space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            <span>Date &amp; Schedule</span>
          </div>
          <div className="text-xs space-y-2 text-[#949599]">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[#6B7278] block">Start Date</span>
                <span className="text-[#EFEFF1] font-medium text-sm">{data.startDate || '—'}</span>
              </div>
              <div>
                <span className="text-[#6B7278] block">Start Time</span>
                <span className="text-[#EFEFF1] font-medium text-sm">{data.startTime || '—'}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[#6B7278] block">End Date</span>
                <span className="text-[#EFEFF1] font-medium text-sm">{data.endDate || '—'}</span>
              </div>
              <div>
                <span className="text-[#6B7278] block">End Time</span>
                <span className="text-[#EFEFF1] font-medium text-sm">{data.endTime || '—'}</span>
              </div>
            </div>
            {data.dressCode && (
              <div>
                <span className="text-[#6B7278] block">Dress Code</span>
                <span className="text-[#EFEFF1]">{data.dressCode}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Tiers Table */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        <div className="p-4 border-b border-[#262B2F] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TicketIcon className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Configured Ticket Tiers ({(data.ticketTypes || []).length})</h3>
          </div>
          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            Est. Gross: {format(totalGross)}
          </span>
        </div>

        <div className="divide-y divide-[#262B2F]">
          {(data.ticketTypes || []).map((t, idx) => (
            <div key={idx} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#EFEFF1] text-sm">{t.name || `Tier ${idx + 1}`}</span>
                  {(t.uploadedTickets || []).length > 0 && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded">
                      {t.uploadedTickets.length} passes uploaded
                    </span>
                  )}
                </div>
                {t.description && <p className="text-[#949599]">{t.description}</p>}
                {(t.saleStartDate || t.saleEndDate) && (
                  <p className="text-[11px] text-[#6B7278]">
                    Sales: {t.saleStartDate || 'Anytime'} &rarr; {t.saleEndDate || 'Event start'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0 sm:text-right">
                <div>
                  <span className="text-[10px] text-[#6B7278] block uppercase">Available</span>
                  <span className="font-semibold text-white">{Number(t.quantity || 0).toLocaleString()} qty</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7278] block uppercase">Price</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {Number(t.price) > 0 ? format(t.price) : 'Free Admission'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gallery Preview (if present) */}
      {(data.additionalImages || []).length > 0 && (
        <div className="p-4 rounded-xl bg-[#171A1D] border border-[#262B2F] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#949599] uppercase tracking-wider">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Gallery Images ({(data.additionalImages || []).length})</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {data.additionalImages.map((img, i) => (
              <img key={i} src={img} alt="" className="aspect-square object-cover rounded-lg border border-[#3A4045]" />
            ))}
          </div>
        </div>
      )}

      {/* Publish Actions Callout */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1C232B] to-[#12161A] border border-amber-500/30 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">Ready to publish your event?</h4>
            <p className="text-xs text-[#949599] mt-0.5 leading-relaxed">
              You can save as a private draft to continue tweaking later, or submit for admin review. Once verified, tickets will instantly be accessible to attendees.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={submitting}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#494F55]/50 bg-[#171A1D] hover:bg-[#242B32] text-sm font-semibold text-[#EFEFF1] transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[#949599]" />
            <span>{submitting ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            onClick={onSubmitApproval}
            disabled={submitting}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-[#111417] hover:bg-[#CBD5E1] text-sm font-extrabold transition shadow-lg shadow-white/10 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : (eventId ? 'Submit Changes for Approval' : 'Submit for Approval')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   MAIN CREATE EVENT PAGE COMPONENT
   ========================================================================= */
export default function CreateEventPage({ initialValues, eventId, onSubmit: customSubmit, eventStatus } = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingInit, setLoadingInit] = useState(!initialValues && !!eventId);

  const methods = useForm({
    defaultValues: initialValues || {
      title: '',
      description: '',
      category: '',
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
      ticketTypes: [
        { name: 'Regular', price: 100, quantity: 1000, description: 'Standard admission', saleStartDate: '', saleEndDate: '', uploadedTickets: [] },
      ],
    },
  });

  const { handleSubmit, trigger, reset, formState: { errors } } = methods;

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
                : [{ name: 'Regular', price: 100, quantity: 1000, description: '', saleStartDate: '', saleEndDate: '', uploadedTickets: [] }],
            });
          }
        })
        .catch((err) => {
          console.error('[CreateEventPage] Error loading event:', err);
          toast.error(err.response?.data?.message || 'Failed to load event data');
          navigate('/organizer/events');
        })
        .finally(() => {
          setLoadingInit(false);
        });
    } else {
      setLoadingInit(false);
    }
  }, [eventId, initialValues, reset, navigate]);

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
    1: ['title', 'description', 'category'],
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

    if (step === 4) {
      const ticketTypes = methods.getValues('ticketTypes') || [];
      if (!ticketTypes.length) {
        toast.error('Please configure at least one ticket type');
        return;
      }
      for (let i = 0; i < ticketTypes.length; i++) {
        const t = ticketTypes[i];
        if (!t.name?.trim()) {
          toast.error(`Ticket Tier ${i + 1}: Name is required`);
          return;
        }
        const qty = Number(t.quantity);
        const utCount = (t.uploadedTickets || []).length;
        if ((!qty || qty < 1) && utCount === 0) {
          toast.error(`Ticket Tier ${i + 1}: Quantity must be at least 1`);
          return;
        }
      }
    }

    setStep((s) => Math.min(5, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const goToStep = (targetStep) => {
    if (targetStep >= 1 && targetStep <= 5) {
      setStep(targetStep);
    }
  };

  const onInvalid = (formErrors) => {
    console.warn('[CreateEventPage] Form validation blocked:', formErrors);
    const errorKeys = Object.keys(formErrors);
    if (!errorKeys.length) return;

    const step1Keys = ['title', 'description', 'category'];
    const step2Keys = ['venue', 'address', 'city'];
    const step3Keys = ['startDate', 'endDate', 'startTime', 'endTime'];
    const step4Keys = ['ticketTypes'];

    let targetStep = 1;
    if (errorKeys.some((k) => step1Keys.includes(k))) targetStep = 1;
    else if (errorKeys.some((k) => step2Keys.includes(k))) targetStep = 2;
    else if (errorKeys.some((k) => step3Keys.includes(k))) targetStep = 3;
    else if (errorKeys.some((k) => step4Keys.includes(k))) targetStep = 4;

    const firstErr = formErrors[errorKeys[0]];
    const msg = firstErr?.message || 'Please check the required fields';
    toast.error(`Step ${targetStep}: ${msg}`);
    setStep(targetStep);
  };

  const submit = async (data, status) => {
    setSubmitting(true);
    try {
      const sanitizedTicketTypes = (data.ticketTypes || []).map((t) => ({
        ...t,
        price: (t.price === '' || t.price === null || t.price === undefined) ? 0 : Number(t.price),
        quantity: (t.uploadedTickets && t.uploadedTickets.length > 0)
          ? t.uploadedTickets.length
          : Math.max(Number(t.quantity) || 1, 1),
      }));

      const totalCap = sanitizedTicketTypes.reduce((sum, t) => sum + t.quantity, 0);

      const payload = {
        ...data,
        capacity: totalCap,
        totalCapacity: totalCap,
        ticketTypes: sanitizedTicketTypes,
        ticket_types: sanitizedTicketTypes,
        tags: typeof data.tags === 'string' ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : data.tags,
        status,
      };

      if (customSubmit) {
        await customSubmit(payload);
        if (status === 'pending' || status === 'published') {
          if (eventId) await publishEvent(eventId).catch(() => {});
        }
      } else {
        await createEvent(payload);
      }

      if (status === 'pending') {
        toast.success(eventId ? 'Event changes submitted for review!' : 'Event submitted for admin approval! Review typically completes within 24h.');
      } else if (status === 'published') {
        toast.success('Event published! Tickets are live.');
      } else {
        toast.success(eventId ? 'Event changes saved!' : 'Event saved as draft.');
      }

      navigate('/organizer/events');
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
        {eventStatus === 'rejected' && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>This event was previously rejected. Review the feedback, make any requested adjustments, and resubmit for approval.</span>
          </div>
        )}

        <PageHeader
          icon={CalendarDays}
          accent="gold"
          title={eventId ? 'Edit Event' : 'Create New Event'}
          subtitle="Complete the 5-step event creation wizard to publish your event."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/organizer/events')}
                className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit((d) => submit(d, 'draft'), onInvalid)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20 border border-white/20 transition disabled:opacity-50 cursor-pointer"
                title="Save progress as draft at any stage"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>{submitting ? 'Saving...' : 'Save Draft'}</span>
              </button>
            </div>
          }
        />

        {/* 5-Step Clickable Progress Stepper */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 sm:p-5">
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
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                      step === s.id
                        ? 'bg-white text-[#1C232B] ring-4 ring-white/20 font-bold scale-110 shadow-lg'
                        : step > s.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 group-hover:bg-white group-hover:text-black'
                        : 'bg-[#494F55]/30 text-[#949599] group-hover:bg-[#494F55]/60 group-hover:text-white'
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:text-black" /> : <s.icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  <div className="text-center hidden sm:block">
                    <span
                      className={`text-xs font-semibold block transition-colors ${
                        step === s.id
                          ? 'text-white font-bold'
                          : step > s.id
                          ? 'text-[#EFEFF1]'
                          : 'text-[#949599] group-hover:text-[#EFEFF1]'
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                </button>
                {s.id < STEPS.length && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${step > s.id ? 'bg-emerald-500/60' : 'bg-[#494F55]/30'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-[#494F55]/30 overflow-hidden">
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Step Container */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 sm:p-7 min-h-[360px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#262B2F]">
                <div>
                  <h2 className="text-lg font-bold text-[#EFEFF1]">
                    Step {step} of 5: {STEPS[step - 1].title}
                  </h2>
                  <p className="text-xs text-[#949599] mt-0.5">{STEPS[step - 1].subtitle}</p>
                </div>
                <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                  Step {step} / 5
                </span>
              </div>

              {step === 1 && <StepBasicInfo categories={categories} />}
              {step === 2 && <StepLocation />}
              {step === 3 && <StepDateTime />}
              {step === 4 && <StepTickets />}
              {step === 5 && (
                <StepPublish
                  onSaveDraft={handleSubmit((d) => submit(d, 'draft'), onInvalid)}
                  onSubmitApproval={handleSubmit((d) => submit(d, 'pending'), onInvalid)}
                  submitting={submitting}
                  eventId={eventId}
                  eventStatus={eventStatus}
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
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-bold bg-white text-[#1C232B] hover:bg-[#CBD5E1] disabled:opacity-60 transition shadow-md cursor-pointer"
            >
              Continue to Step {step + 1} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit((d) => submit(d, 'draft'), onInvalid)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-white border border-[#494F55]/40 hover:bg-[#242B32] transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button
                type="button"
                onClick={handleSubmit((d) => submit(d, 'pending'), onInvalid)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-bold bg-white text-[#111417] hover:bg-[#CBD5E1] transition shadow-lg cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Submit for Approval
              </button>
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
