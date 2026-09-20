import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  CalendarDays, Info, MapPin, Image, Settings as SettingsIcon, Ticket as TicketIcon,
  CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, Upload, X, Save, Send,
  AlertTriangle,
} from 'lucide-react';
import { createEvent, getEvent, getCategories, publishEvent, uploadImage } from '@/api/events';
import TicketFilesUploader from '@/components/organizer/TicketFilesUploader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';
import { useCurrency } from '@/context/CurrencyContext';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Info },
  { id: 2, title: 'Location & Time', icon: MapPin },
  { id: 3, title: 'Media', icon: Image },
  { id: 4, title: 'Capacity & Settings', icon: SettingsIcon },
  { id: 5, title: 'Ticket Types', icon: TicketIcon },
  { id: 6, title: 'Review & Publish', icon: CheckCircle2 },
];

const inputCls =
  'w-full px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition';
const labelCls = 'block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider';
const errCls = 'mt-1 text-xs text-red-400';

function Field({ name, label, type = 'text', placeholder, validation, options, textarea, rows }) {
  const { register, formState: { errors } } = useFormContext();
  const err = errors[name];
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {textarea ? (
        <textarea {...register(name, validation)} rows={rows || 4} placeholder={placeholder} className={inputCls} />
      ) : options ? (
        <select {...register(name, validation)} className={inputCls}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value ?? o.id ?? o} value={o.value ?? o.id ?? o}>{o.label ?? o.name ?? o}</option>)}
        </select>
      ) : (
        <input type={type} {...register(name, validation)} placeholder={placeholder} className={inputCls} />
      )}
      {err && <p className={errCls}>{err.message}</p>}
    </div>
  );
}

const StepBasicInfo = ({ categories = [] }) => {
  const { watch } = useFormContext();
  const currentCategory = watch('category');
  const allCategories = [...categories];
  if (currentCategory && !allCategories.some((c) => (c.name || c) === currentCategory)) {
    allCategories.unshift({ id: 'current', name: currentCategory, value: currentCategory });
  }

  return (
    <div className="space-y-5">
      <Field name="title" label="Event Title" placeholder="e.g. Accra Jazz Festival 2024" validation={{ required: 'Title is required', minLength: { value: 5, message: 'Min 5 characters' } }} />
      <Field name="description" label="Description" textarea rows={6} placeholder="Describe your event..." validation={{ required: 'Description is required', minLength: { value: 20, message: 'Min 20 characters' } }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field name="category" label="Category" options={allCategories.map((c) => ({ value: c.name || c.value || c, label: c.name || c.label || c }))} validation={{ required: 'Category is required' }} />
        <Field name="tags" label="Tags (comma separated)" placeholder="music, festival, outdoor" />
      </div>
    </div>
  );
};

const StepLocationTime = () => (
  <div className="space-y-5">
    <Field name="venue" label="Venue Name" placeholder="e.g. National Theatre" validation={{ required: 'Venue is required' }} />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field name="address" label="Address" placeholder="Street address" validation={{ required: 'Address is required' }} />
      <Field name="city" label="City" placeholder="Accra" validation={{ required: 'City is required' }} />
      <Field name="country" label="Country" placeholder="Ghana" validation={{ required: 'Country is required' }} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field name="startDate" label="Start Date" type="date" validation={{ required: 'Start date is required' }} />
      <Field name="endDate" label="End Date" type="date" validation={{ required: 'End date is required' }} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field name="startTime" label="Start Time" type="time" validation={{ required: 'Start time is required' }} />
      <Field name="endTime" label="End Time" type="time" validation={{ required: 'End time is required' }} />
    </div>
    <Field name="dressCode" label="Dress Code" placeholder="e.g. Smart Casual / African Print" />
  </div>
);

const StepMedia = () => {
  const { watch, setValue } = useFormContext();
  const bannerUrl = watch('bannerImage');
  const ticketTemplateUrl = watch('ticketTemplate');
  const additional = watch('additionalImages') || [];
  const fileRef = useRef(null);
  const ticketRef = useRef(null);
  const extraRef = useRef(null);
  const [uploading, setUploading] = useState(null); // 'banner' | 'ticket' | 'extra' | null

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleBanner = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploading) return;
    if (file.size > MAX_FILE_SIZE) { toast.error('Banner image must be under 5MB'); return; }
    setUploading('banner');
    try {
      const res = await uploadImage(file);
      setValue('bannerImage', res.data.url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Banner upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleTicketTemplate = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploading) return;
    if (file.size > MAX_FILE_SIZE) { toast.error('Ticket template image must be under 5MB'); return; }
    setUploading('ticket');
    try {
      const res = await uploadImage(file);
      setValue('ticketTemplate', res.data.url);
      toast.success('Custom ticket design uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ticket upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleExtra = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || uploading) return;
    if (files.some((f) => f.size > MAX_FILE_SIZE)) { toast.error('Each image must be under 5MB'); return; }
    const keep = Math.max(0, 5 - additional.length);
    const batch = files.slice(0, keep);
    if (!batch.length) return;
    setUploading('extra');
    try {
      const urls = [];
      for (const file of batch) {
        const res = await uploadImage(file);
        urls.push(res.data.url);
      }
      setValue('additionalImages', [...additional, ...urls].slice(0, 5));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(null);
    }
  };

  const removeExtra = (i) => setValue('additionalImages', additional.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      {/* Banner Upload */}
      <div>
        <label className={labelCls}>Banner Image</label>
        <div
          onClick={() => { if (!uploading) fileRef.current?.click(); }}
          className="relative border-2 border-dashed border-[#494F55]/50 rounded-xl p-6 text-center cursor-pointer hover:border-white/40 transition-colors bg-[#171A1D]"
        >
          {uploading === 'banner' ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Upload className="w-8 h-8 text-white mx-auto animate-pulse" />
              <p className="text-sm text-[#949599]">Uploading banner...</p>
            </div>
          ) : bannerUrl ? (
            <div className="relative">
              <img src={bannerUrl} alt="banner" className="w-full h-48 object-cover rounded-lg" />
              <button type="button" onClick={(e) => { e.stopPropagation(); setValue('bannerImage', ''); }} className="absolute top-2 right-2 p-2 rounded-md bg-black/60 text-white hover:bg-black/80"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-[#494F55] mx-auto mb-2" />
              <p className="text-sm text-[#949599]">Drag & drop or <span className="text-white">browse</span></p>
              <p className="text-xs text-[#494F55] mt-1">Recommended 1600x900px, max 5MB</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
        </div>
      </div>

      {/* Custom Ticket Template Upload */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls}>Event Ticket Design / Pass Artwork (Optional)</label>
          <span className="text-[11px] text-amber-400 font-medium">Attendees download &amp; print this</span>
        </div>
        <p className="text-xs text-[#949599] mb-2.5">
          Upload your branded concert pass, stub, or VIP badge artwork. We will automatically superimpose the attendee's live QR code, Seat/Row, Ticket #, and event details onto this design when they download or print their pass.
        </p>
        <div
          onClick={() => { if (!uploading) ticketRef.current?.click(); }}
          className="relative border-2 border-dashed border-amber-500/30 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400/60 transition-colors bg-[#171A1D]/80"
        >
          {uploading === 'ticket' ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Upload className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
              <p className="text-sm text-[#949599]">Uploading custom ticket artwork...</p>
            </div>
          ) : ticketTemplateUrl ? (
            <div className="relative">
              <div className="max-h-56 overflow-hidden rounded-lg border border-amber-500/30 flex items-center justify-center bg-black/40">
                <img src={ticketTemplateUrl} alt="custom ticket" className="max-h-56 w-auto object-contain rounded" />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs text-amber-300 font-medium px-1">
                <span>Custom Ticket Design Active</span>
                <span className="text-[#949599]">Click to change</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setValue('ticketTemplate', ''); }}
                className="absolute top-2 right-2 p-2 rounded-md bg-black/70 text-white hover:bg-black/90 shadow-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <TicketIcon className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
              <p className="text-sm text-[#949599]">Upload your <span className="text-amber-400 font-semibold">Custom Ticket / Badge Artwork</span></p>
              <p className="text-xs text-[#494F55] mt-1">Recommended landscape ratio (1600x680px or 1200x500px), PNG or JPG under 5MB</p>
            </>
          )}
          <input ref={ticketRef} type="file" accept="image/*" className="hidden" onChange={handleTicketTemplate} />
        </div>
      </div>

      {/* Additional Images */}
      <div>
        <label className={labelCls}>Additional Images (up to 5)</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {additional.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#242B32]">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeExtra(i)} className="absolute top-1 right-1 p-2 rounded-md bg-black/60 text-white hover:bg-black/80"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {additional.length < 5 && (
            <button
              type="button"
              onClick={() => { if (!uploading) extraRef.current?.click(); }}
              className="aspect-square rounded-lg border-2 border-dashed border-[#494F55]/50 flex items-center justify-center text-[#494F55] hover:border-white/40 hover:text-white transition-colors disabled:opacity-50"
              disabled={!!uploading}
            >
              {uploading === 'extra'
                ? <Upload className="w-6 h-6 animate-pulse" />
                : <Plus className="w-6 h-6" />}
            </button>
          )}
        </div>
        <input ref={extraRef} type="file" accept="image/*" multiple className="hidden" onChange={handleExtra} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field name="contactEmail" label="Contact Email" type="email" placeholder="events@yourorg.com" validation={{ required: 'Contact email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' } }} />
        <Field name="contactPhone" label="Contact Phone" placeholder="+233 24 000 0000" validation={{ required: 'Contact phone is required' }} />
      </div>
    </div>
  );
};

const StepCapacity = () => {
  const { watch, setValue } = useFormContext();
  const visibility = watch('visibility') || 'public';
  return (
    <div className="space-y-5">
      <Field name="totalCapacity" label="Total Capacity" type="number" placeholder="500" validation={{ required: 'Capacity is required', min: { value: 1, message: 'Must be at least 1' } }} />
      <div className="space-y-3">
        <label className="flex items-center justify-between p-4 rounded-lg bg-[#171A1D] border border-[#262B2F] cursor-pointer hover:border-[#494F55]/50">
          <div>
            <p className="text-sm font-medium text-[#EFEFF1]">Event Visibility</p>
            <p className="text-xs text-[#949599]">Public events are searchable, private are invite-only</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setValue('visibility', 'public', { shouldDirty: true, shouldValidate: true })} className={`px-3 py-2.5 rounded-md text-xs font-medium transition ${visibility === 'public' ? 'bg-white text-[#1C232B]' : 'bg-[#494F55]/30 text-[#949599]'}`}>Public</button>
            <button type="button" onClick={() => setValue('visibility', 'private', { shouldDirty: true, shouldValidate: true })} className={`px-3 py-2.5 rounded-md text-xs font-medium transition ${visibility === 'private' ? 'bg-white text-[#1C232B]' : 'bg-[#494F55]/30 text-[#949599]'}`}>Private</button>
          </div>
        </label>
      </div>
    </div>
  );
};

const StepTickets = () => {
  const { control, register, watch, setValue, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'ticketTypes' });

  const addTicket = () =>
    append({
      name: '',
      price: '',
      quantity: '',
      description: '',
      saleStartDate: '',
      saleEndDate: '',
      uploadedTickets: [],
    });

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <div className="text-center py-8 text-sm text-[#949599]">No ticket types added yet. Click below to add one.</div>
      )}
      <AnimatePresence>
        {fields.map((f, i) => {
          const allTicketTypes = watch('ticketTypes') || [];
          const currentUploaded =
            (allTicketTypes[i] && allTicketTypes[i].uploadedTickets) ||
            f.uploadedTickets ||
            watch(`ticketTypes.${i}.uploadedTickets`) ||
            [];
          const hasUploadedFiles = currentUploaded.length > 0;
          const ticketErr = errors?.ticketTypes?.[i];

          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Ticket Type {i + 1}</span>
                  {hasUploadedFiles && (
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      ★ {currentUploaded.length} pre-generated {currentUploaded.length === 1 ? 'ticket' : 'tickets'} loaded
                    </span>
                  )}
                </span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="p-2.5 rounded-md text-[#949599] hover:text-red-400 hover:bg-red-500/10 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Name</label>
                  <input {...register(`ticketTypes.${i}.name`, { required: 'Name is required' })} placeholder="VIP, Regular, Table..." className={inputCls} />
                  {ticketErr?.name && <p className={errCls}>{ticketErr.name.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Section / Layout Zone</label>
                  <select {...register(`ticketTypes.${i}.section_type`)} className={inputCls}>
                    <option value="general">General Admission Floor</option>
                    <option value="golden_circle">Golden Circle (Front Pit)</option>
                    <option value="vip">Diamond VIP Lounge & Tables</option>
                    <option value="balcony">Mezzanine & Elevated Suites</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#949599] uppercase tracking-wider">Price / Amount</label>
                    {hasUploadedFiles ? (
                      <span className="text-[10px] font-bold text-amber-400">On Pass</span>
                    ) : (
                      <span className="text-[10px] text-[#949599]">Optional</span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`ticketTypes.${i}.price`, { min: { value: 0, message: 'Price cannot be negative' } })}
                    placeholder={hasUploadedFiles ? 'Amount is on pass' : '0.00'}
                    className={`${inputCls} ${hasUploadedFiles ? 'bg-[#12161A] text-amber-300 placeholder:text-[#949599]/60 border-amber-400/20' : ''}`}
                  />
                  <p className="mt-1 text-[11px] text-[#949599]">
                    {hasUploadedFiles
                      ? 'The uploaded ticket contains the amount. No need to enter an amount.'
                      : 'Optional if amount is on uploaded pass'}
                  </p>
                  {ticketErr?.price && <p className={errCls}>{ticketErr.price.message}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#949599] uppercase tracking-wider">Total Quantity</label>
                    {hasUploadedFiles && (
                      <span className="text-[10px] font-bold text-amber-400">Locked to files</span>
                    )}
                  </div>
                  <input
                    type="number"
                    {...register(`ticketTypes.${i}.quantity`, { required: 'Quantity is required', min: { value: 1, message: 'Min 1' } })}
                    placeholder="50"
                    readOnly={hasUploadedFiles}
                    className={`${inputCls} ${hasUploadedFiles ? 'bg-[#12161A] text-amber-300 font-bold border-amber-400/30' : ''}`}
                  />
                  {ticketErr?.quantity && <p className={errCls}>{ticketErr.quantity.message}</p>}
                  <p className="mt-1 text-[11px] text-[#949599]">
                    {hasUploadedFiles
                      ? `Auto-set from ${currentUploaded.length} uploaded files`
                      : 'Upload files below or enter manual figure'}
                  </p>
                </div>
              </div>

              {/* Upload Pre-Generated Tickets (PDF/Images) */}
              <div className="pt-2 border-t border-[#262B2F]/60">
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

              {/* Optional Early Bird Rules */}
              <div className="p-3.5 rounded-xl bg-[#14181C] border border-[#2E363E] space-y-3">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  Optional Early-Bird Pricing Rules
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Early-Bird Price (GHS)</label>
                    <input type="number" step="0.01" {...register(`ticketTypes.${i}.early_bird_price`)} placeholder="e.g. 70" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Early-Bird Deadline</label>
                    <input type="date" {...register(`ticketTypes.${i}.early_bird_deadline`)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Early-Bird Cap (Max Tickets)</label>
                    <input type="number" {...register(`ticketTypes.${i}.early_bird_max_qty`)} placeholder="e.g. 20" className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Description & Perks (What's included)</label>
                <textarea {...register(`ticketTypes.${i}.description`)} rows={2} placeholder="e.g. Fast-track entry, welcome cocktail, backstage access..." className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Sale Start Date (Optional)</label>
                  <input type="date" {...register(`ticketTypes.${i}.saleStartDate`)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Sale End Date (Optional)</label>
                  <input type="date" {...register(`ticketTypes.${i}.saleEndDate`)} className={inputCls} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <button type="button" onClick={addTicket} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#494F55]/40 text-sm font-medium text-[#949599] hover:border-white/40 hover:text-white transition-colors">
        <Plus className="w-4 h-4" /> Add Another Ticket Type
      </button>
    </div>
  );
};

const StepReview = () => {
  const { watch } = useFormContext();
  const { format } = useCurrency();
  const d = watch();
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Basic Info</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-[#949599]">Title</dt><dd className="text-[#EFEFF1]">{d.title || '—'}</dd></div>
          <div><dt className="text-xs text-[#949599]">Category</dt><dd className="text-[#EFEFF1]">{d.category || '—'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-[#949599]">Description</dt><dd className="text-[#EFEFF1] line-clamp-2">{d.description || '—'}</dd></div>
        </dl>
      </div>
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Location & Time</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-[#949599]">Venue</dt><dd className="text-[#EFEFF1]">{d.venue || '—'}</dd></div>
          <div><dt className="text-xs text-[#949599]">Location</dt><dd className="text-[#EFEFF1]">{[d.city, d.country].filter(Boolean).join(', ') || '—'}</dd></div>
          <div><dt className="text-xs text-[#949599]">Date</dt><dd className="text-[#EFEFF1]">{d.startDate || '—'} → {d.endDate || '—'}</dd></div>
          <div><dt className="text-xs text-[#949599]">Time</dt><dd className="text-[#EFEFF1]">{d.startTime || '—'} - {d.endTime || '—'}</dd></div>
        </dl>
      </div>
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Capacity & Settings</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><dt className="text-xs text-[#949599]">Total Capacity</dt><dd className="text-[#EFEFF1]">{d.totalCapacity || '—'}</dd></div>
          <div><dt className="text-xs text-[#949599]">Visibility</dt><dd className="text-[#EFEFF1] capitalize">{d.visibility || '—'}</dd></div>
        </dl>
      </div>
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Media & Custom Ticket Design</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-[#949599] block mb-1.5">Banner Image</span>
            {d.bannerImage ? (
              <img src={d.bannerImage} alt="banner" className="w-full h-24 object-cover rounded-lg border border-[#494F55]/30" />
            ) : (
              <p className="text-xs text-[#494F55] italic">No banner uploaded</p>
            )}
          </div>
          <div>
            <span className="text-xs text-[#949599] block mb-1.5">Custom Ticket Design</span>
            {d.ticketTemplate ? (
              <div className="relative">
                <img src={d.ticketTemplate} alt="ticket design" className="w-full h-24 object-contain rounded-lg border border-amber-500/40 bg-black/30" />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/90 text-black font-bold">Custom Design</span>
              </div>
            ) : (
              <div className="h-24 rounded-lg border border-dashed border-[#494F55]/40 flex items-center justify-center p-3 text-center">
                <p className="text-xs text-[#949599]">Default Golden &amp; Burgundy Concert Stub Pass</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Ticket Types ({(d.ticketTypes || []).length})</h3>
        <div className="space-y-2">
          {(d.ticketTypes || []).map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#171A1D]">
              <div>
                <p className="text-sm font-medium text-[#EFEFF1]">{t.name || `Ticket ${i + 1}`}</p>
                <p className="text-xs text-[#949599]">
                  {t.quantity} available
                  {(t.uploadedTickets || []).length > 0 && (
                    <span className="ml-2 text-amber-400 font-medium">
                      ({(t.uploadedTickets || []).length} passes uploaded)
                    </span>
                  )}
                </p>
              </div>
              <span className="text-sm font-semibold text-white">{format(t.price)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function CreateEventPage({ initialValues, eventId, onSubmit: customSubmit, eventStatus } = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingInit, setLoadingInit] = useState(!initialValues && !!eventId);

  const methods = useForm({
    defaultValues: initialValues || {
      title: '', description: '', category: '', tags: '',
      venue: '', address: '', city: '', country: '',
      startDate: '', endDate: '', startTime: '', endTime: '', dressCode: '',
      bannerImage: '', ticketTemplate: '', additionalImages: [],
      contactEmail: '', contactPhone: '',
      totalCapacity: '', visibility: 'public',
      ticketTypes: [{ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '', uploadedTickets: [] }],
    },
  });
  const { handleSubmit, trigger, reset, formState: { errors } } = methods;

  // Sync form values when initialValues arrives or load directly by eventId
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
              venue: e.venue || '',
              address: e.address || '',
              city: e.city || '',
              country: e.country || '',
              startDate: e.start_date ? String(e.start_date).slice(0, 10) : '',
              endDate: e.end_date ? String(e.end_date).slice(0, 10) : '',
              startTime: e.start_time ? String(e.start_time).slice(0, 5) : '',
              endTime: e.end_time ? String(e.end_time).slice(0, 5) : '',
              dressCode: e.dress_code || '',
              bannerImage: e.banner_image || '',
              ticketTemplate: e.ticket_template || '',
              additionalImages: Array.isArray(e.images) ? e.images : [],
              contactEmail: e.contact_email || '',
              contactPhone: e.contact_phone || '',
              totalCapacity: e.capacity || '',
              visibility: e.visibility || 'public',
              ticketTypes: (e.ticket_types || []).length
                ? e.ticket_types.map((t) => {
                    const upl = t.uploadedTickets || t.uploaded_tickets || [];
                    return {
                      id: t.id,
                      name: t.name || '',
                      price: t.price || '',
                      quantity: upl.length > 0 ? upl.length : (t.quantity || ''),
                      description: t.description || '',
                      section_type: t.section_type || 'general',
                      early_bird_price: t.early_bird_price || '',
                      early_bird_deadline: t.early_bird_deadline ? String(t.early_bird_deadline).slice(0, 10) : '',
                      early_bird_max_qty: t.early_bird_max_qty || '',
                      saleStartDate: t.sale_start ? String(t.sale_start).slice(0, 10) : '',
                      saleEndDate: t.sale_end ? String(t.sale_end).slice(0, 10) : '',
                      uploadedTickets: upl,
                    };
                  })
                : [{ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '', uploadedTickets: [] }],
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

  // load categories
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : res.data?.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const stepFields = {
    1: ['title', 'description', 'category'],
    2: ['venue', 'address', 'city', 'country', 'startDate', 'endDate', 'startTime', 'endTime'],
    3: ['contactEmail', 'contactPhone'],
    4: ['totalCapacity'],
  };

  const next = async () => {
    const fields = stepFields[step];
    if (fields) {
      const valid = await trigger(fields);
      if (!valid) {
        const formErrors = methods.formState.errors;
        const failedKey = fields.find((f) => formErrors[f]);
        const msg = (failedKey && formErrors[failedKey]?.message) || 'Please fill in all required fields';
        toast.error(msg);
        return;
      }
    }
    if (step === 5) {
      const ticketTypes = methods.getValues('ticketTypes') || [];
      if (!ticketTypes.length) {
        toast.error('Please add at least one ticket type');
        return;
      }
      for (let i = 0; i < ticketTypes.length; i++) {
        const t = ticketTypes[i];
        if (!t.name?.trim()) {
          toast.error(`Ticket Type ${i + 1}: Name is required`);
          return;
        }
        if (t.price === '' || t.price === null || t.price === undefined) {
          methods.setValue(`ticketTypes.${i}.price`, 0);
        } else if (isNaN(Number(t.price)) || Number(t.price) < 0) {
          toast.error(`Ticket Type ${i + 1}: Price cannot be negative`);
          return;
        }
        const utCount = (t.uploadedTickets || []).length;
        const currentQty = utCount > 0 ? utCount : Number(t.quantity);
        if (!currentQty || isNaN(currentQty) || currentQty < 1) {
          toast.error(`Ticket Type ${i + 1}: Quantity must be at least 1 (or upload passes below)`);
          return;
        }
      }
    }
    setStep((s) => Math.min(6, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  const goToStep = (targetStep) => {
    if (targetStep >= 1 && targetStep <= 6) {
      setStep(targetStep);
    }
  };

  const onInvalid = (formErrors) => {
    console.warn('[CreateEventPage] Form validation blocked:', formErrors);
    const errorKeys = Object.keys(formErrors);
    if (!errorKeys.length) return;

    const step1Keys = ['title', 'description', 'category', 'tags'];
    const step2Keys = ['venue', 'address', 'city', 'country', 'startDate', 'endDate', 'startTime', 'endTime', 'dressCode'];
    const step3Keys = ['bannerImage', 'ticketTemplate', 'additionalImages', 'contactEmail', 'contactPhone'];
    const step4Keys = ['totalCapacity', 'visibility'];
    const step5Keys = ['ticketTypes'];

    let targetStep = 1;
    if (errorKeys.some((k) => step1Keys.includes(k))) targetStep = 1;
    else if (errorKeys.some((k) => step2Keys.includes(k))) targetStep = 2;
    else if (errorKeys.some((k) => step3Keys.includes(k))) targetStep = 3;
    else if (errorKeys.some((k) => step4Keys.includes(k))) targetStep = 4;
    else if (errorKeys.some((k) => step5Keys.includes(k))) targetStep = 5;

    const firstErr = formErrors[errorKeys[0]];
    const msg = firstErr?.message || (errorKeys[0] === 'ticketTypes' ? 'Please complete ticket type details' : `Please check required field: ${errorKeys[0]}`);
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
          : Math.max(Number(t.quantity) || 0, 0),
      }));

      const payload = {
        ...data,
        ticketTypes: sanitizedTicketTypes,
        ticket_types: sanitizedTicketTypes,
        tags: typeof data.tags === 'string' ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : data.tags,
        status,
      };
      if (customSubmit) {
        await customSubmit(payload);
        // Editing keeps the current status server-side, so an explicit
        // "Submit for Review" on an edit resubmits the event for approval.
        if (status === 'published' && eventId) {
          await publishEvent(eventId);
        }
      } else {
        await createEvent(payload);
      }
      toast.success(
        status === 'published'
          ? (eventId ? 'Event updated & published successfully!' : 'Event published successfully! Tickets are now on sale.')
          : (eventId ? 'Event changes saved successfully!' : 'Event saved as draft'),
      );
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
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit((d) => submit(d, 'draft'), onInvalid)(e); }} className="space-y-6">
        {eventStatus === 'rejected' && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>This event was rejected by an admin. Make the requested changes, then publish it again.</span>
          </div>
        )}
        <PageHeader
          icon={CalendarDays}
          accent="gold"
          title={eventId ? 'Edit Event' : 'Create New Event'}
          subtitle="Complete all steps to publish your event."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/organizer/events')}
                className="px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition"
              >
                Cancel
              </button>
              {eventId && (
                <button
                  type="button"
                  onClick={handleSubmit((d) => submit(d, eventStatus || 'draft'), onInvalid)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20 border border-white/20 transition disabled:opacity-50"
                  title="Quick Save your changes at any step"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{submitting ? 'Saving...' : 'Quick Save'}</span>
                </button>
              )}
            </div>
          }
        />

        {/* Clickable Progress Stepper */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => goToStep(s.id)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer focus:outline-none"
                  title={`Go to Step ${s.id}: ${s.title}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      step === s.id
                        ? 'bg-white text-[#1C232B] ring-4 ring-white/20 font-bold scale-110 shadow-lg'
                        : step > s.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 group-hover:bg-white group-hover:text-black'
                        : 'bg-[#494F55]/30 text-[#949599] group-hover:bg-[#494F55]/60 group-hover:text-white'
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:text-black" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:block transition-colors ${
                      step === s.id
                        ? 'text-white font-bold'
                        : step > s.id
                        ? 'text-[#EFEFF1]'
                        : 'text-[#949599] group-hover:text-[#EFEFF1]'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
                {s.id < STEPS.length && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${step > s.id ? 'bg-emerald-500/50' : 'bg-[#494F55]/30'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-[#494F55]/30 overflow-hidden">
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 sm:p-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-[#EFEFF1]">
                  Step {step} of 6: {STEPS[step - 1].title}
                </h2>
                <span className="text-xs text-[#949599]">
                  Click any step circle above to jump directly
                </span>
              </div>
              {step === 1 && <StepBasicInfo categories={categories} />}
              {step === 2 && <StepLocationTime />}
              {step === 3 && <StepMedia />}
              {step === 4 && <StepCapacity />}
              {step === 5 && <StepTickets />}
              {step === 6 && <StepReview />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={back}
            disabled={step === 1 || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < 6 ? (
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-lg text-sm font-semibold bg-white text-[#1C232B] hover:bg-[#CBD5E1] disabled:opacity-60 transition shadow-md cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit((d) => submit(d, 'draft'), onInvalid)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-sm font-medium text-[#949599] hover:text-[#EFEFF1] border border-[#494F55]/40 hover:bg-[#494F55]/20 disabled:opacity-60 transition cursor-pointer"
              >
                <Save className="w-4 h-4" /> {submitting ? 'Saving...' : eventId ? 'Save Changes' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={handleSubmit((d) => submit(d, 'published'), onInvalid)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-lg text-sm font-semibold bg-white text-[#1C232B] hover:bg-[#CBD5E1] disabled:opacity-60 transition shadow-lg cursor-pointer"
              >
                <Send className="w-4 h-4" /> {submitting ? 'Publishing...' : eventId ? (eventStatus === 'published' ? 'Update Event' : 'Submit for Review') : 'Publish Event Now'}
              </button>
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
