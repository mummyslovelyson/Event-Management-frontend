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
import { createEvent, getCategories, publishEvent, uploadImage } from '@/api/events';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: Info },
  { id: 2, title: 'Location & Time', icon: MapPin },
  { id: 3, title: 'Media', icon: Image },
  { id: 4, title: 'Capacity & Settings', icon: SettingsIcon },
  { id: 5, title: 'Ticket Types', icon: TicketIcon },
  { id: 6, title: 'Review & Publish', icon: CheckCircle2 },
];

const inputCls =
  'w-full px-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition';
const labelCls = 'block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider';
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

const StepBasicInfo = ({ categories }) => (
  <div className="space-y-5">
    <Field name="title" label="Event Title" placeholder="e.g. Accra Jazz Festival 2024" validation={{ required: 'Title is required', minLength: { value: 5, message: 'Min 5 characters' } }} />
    <Field name="description" label="Description" textarea rows={6} placeholder="Describe your event..." validation={{ required: 'Description is required', minLength: { value: 20, message: 'Min 20 characters' } }} />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field name="category" label="Category" options={categories.map((c) => ({ value: c.name, label: c.name }))} validation={{ required: 'Category is required' }} />
      <Field name="tags" label="Tags (comma separated)" placeholder="music, festival, outdoor" />
    </div>
  </div>
);

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
  const additional = watch('additionalImages') || [];
  const fileRef = useRef(null);
  const extraRef = useRef(null);
  const [uploading, setUploading] = useState(null); // 'banner' | 'extra' | null

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
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Banner Image</label>
        <div
          onClick={() => { if (!uploading) fileRef.current?.click(); }}
          className="relative border-2 border-dashed border-[#494F55]/50 rounded-xl p-6 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors bg-[#171A1D]"
        >
          {uploading === 'banner' ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Upload className="w-8 h-8 text-[#D4AF37] mx-auto animate-pulse" />
              <p className="text-sm text-[#8A9196]">Uploading banner...</p>
            </div>
          ) : bannerUrl ? (
            <div className="relative">
              <img src={bannerUrl} alt="banner" className="w-full h-48 object-cover rounded-lg" />
              <button onClick={(e) => { e.stopPropagation(); setValue('bannerImage', ''); }} className="absolute top-2 right-2 p-1 rounded-md bg-black/60 text-white hover:bg-black/80"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-[#494F55] mx-auto mb-2" />
              <p className="text-sm text-[#8A9196]">Drag & drop or <span className="text-[#D4AF37]">browse</span></p>
              <p className="text-xs text-[#494F55] mt-1">Recommended 1600x900px, max 5MB</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Additional Images (up to 5)</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {additional.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-[#242B32]">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removeExtra(i)} className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-black/80"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          {additional.length < 5 && (
            <button
              onClick={() => { if (!uploading) extraRef.current?.click(); }}
              className="aspect-square rounded-lg border-2 border-dashed border-[#494F55]/50 flex items-center justify-center text-[#494F55] hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors disabled:opacity-50"
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
  const { register, watch, setValue } = useFormContext();
  const visibility = watch('visibility');
  return (
    <div className="space-y-5">
      <Field name="totalCapacity" label="Total Capacity" type="number" placeholder="500" validation={{ required: 'Capacity is required', min: { value: 1, message: 'Must be at least 1' } }} />
      <div className="space-y-3">
        <label className="flex items-center justify-between p-4 rounded-lg bg-[#171A1D] border border-[#262B2F] cursor-pointer hover:border-[#494F55]/50">
          <div>
            <p className="text-sm font-medium text-[#EDF0F1]">Event Visibility</p>
            <p className="text-xs text-[#8A9196]">Public events are searchable, private are invite-only</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setValue('visibility', 'public')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${visibility === 'public' ? 'bg-[#D4AF37] text-[#1E252B]' : 'bg-[#494F55]/30 text-[#8A9196]'}`}>Public</button>
            <button type="button" onClick={() => setValue('visibility', 'private')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${visibility === 'private' ? 'bg-[#D4AF37] text-[#1E252B]' : 'bg-[#494F55]/30 text-[#8A9196]'}`}>Private</button>
          </div>
        </label>
      </div>
    </div>
  );
};

const StepTickets = () => {
  const { control, register, watch, remove } = useFormContext();
  const { fields, append } = useFieldArray({ control, name: 'ticketTypes' });
  const ticketTypes = watch('ticketTypes') || [];

  const addTicket = () => append({ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '' });

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <div className="text-center py-8 text-sm text-[#8A9196]">No ticket types added yet. Click below to add one.</div>
      )}
      <AnimatePresence>
        {fields.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#D4AF37]">Ticket Type {i + 1}</span>
              {fields.length > 1 && (
                <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-md text-[#8A9196] hover:text-red-400 hover:bg-red-500/10 transition"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Name</label>
                <input {...register(`ticketTypes.${i}.name`, { required: true })} placeholder="VIP, General..." className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Price (GHS)</label>
                <input type="number" step="0.01" {...register(`ticketTypes.${i}.price`, { required: true, min: 0 })} placeholder="100" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Quantity</label>
                <input type="number" {...register(`ticketTypes.${i}.quantity`, { required: true, min: 1 })} placeholder="50" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea {...register(`ticketTypes.${i}.description`)} rows={2} placeholder="What's included..." className={inputCls} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Sale Start Date</label>
                <input type="date" {...register(`ticketTypes.${i}.saleStartDate`, { required: true })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sale End Date</label>
                <input type="date" {...register(`ticketTypes.${i}.saleEndDate`, { required: true })} className={inputCls} />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button type="button" onClick={addTicket} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#494F55]/40 text-sm font-medium text-[#8A9196] hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors">
        <Plus className="w-4 h-4" /> Add Another Ticket Type
      </button>
    </div>
  );
};

const StepReview = () => {
  const { watch } = useFormContext();
  const d = watch();
  const ghc = (n) => `₵${Number(n || 0).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Basic Info</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-[#8A9196]">Title</dt><dd className="text-[#EDF0F1]">{d.title || '—'}</dd></div>
          <div><dt className="text-xs text-[#8A9196]">Category</dt><dd className="text-[#EDF0F1]">{d.category || '—'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-[#8A9196]">Description</dt><dd className="text-[#EDF0F1] line-clamp-2">{d.description || '—'}</dd></div>
        </dl>
      </div>
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Location & Time</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-[#8A9196]">Venue</dt><dd className="text-[#EDF0F1]">{d.venue || '—'}</dd></div>
          <div><dt className="text-xs text-[#8A9196]">Location</dt><dd className="text-[#EDF0F1]">{[d.city, d.country].filter(Boolean).join(', ') || '—'}</dd></div>
          <div><dt className="text-xs text-[#8A9196]">Date</dt><dd className="text-[#EDF0F1]">{d.startDate || '—'} → {d.endDate || '—'}</dd></div>
          <div><dt className="text-xs text-[#8A9196]">Time</dt><dd className="text-[#EDF0F1]">{d.startTime || '—'} - {d.endTime || '—'}</dd></div>
        </dl>
      </div>
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Capacity & Settings</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div><dt className="text-xs text-[#8A9196]">Total Capacity</dt><dd className="text-[#EDF0F1]">{d.totalCapacity || '—'}</dd></div>
          <div><dt className="text-xs text-[#8A9196]">Visibility</dt><dd className="text-[#EDF0F1] capitalize">{d.visibility || '—'}</dd></div>
        </dl>
      </div>
      <div className="rounded-xl bg-[#242B32] border border-[#262B2F] p-5">
        <h3 className="text-sm font-semibold text-[#D4AF37] mb-3">Ticket Types ({(d.ticketTypes || []).length})</h3>
        <div className="space-y-2">
          {(d.ticketTypes || []).map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#171A1D]">
              <div>
                <p className="text-sm font-medium text-[#EDF0F1]">{t.name || `Ticket ${i + 1}`}</p>
                <p className="text-xs text-[#8A9196]">{t.quantity} available</p>
              </div>
              <span className="text-sm font-semibold text-[#D4AF37]">{ghc(t.price)}</span>
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
  const [loadingInit, setLoadingInit] = useState(!!eventId);

  const methods = useForm({
    defaultValues: initialValues || {
      title: '', description: '', category: '', tags: '',
      venue: '', address: '', city: '', country: '',
      startDate: '', endDate: '', startTime: '', endTime: '', dressCode: '',
      bannerImage: '', additionalImages: [],
      contactEmail: '', contactPhone: '',
      totalCapacity: '', visibility: 'public',
      ticketTypes: [{ name: '', price: '', quantity: '', description: '', saleStartDate: '', saleEndDate: '' }],
    },
  });
  const { handleSubmit, trigger, formState: { errors } } = methods;

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
      if (!valid) { toast.error('Please fill in all required fields'); return; }
    }
    if (step === 5) {
      const valid = await trigger('ticketTypes');
      if (!valid) { toast.error('Please complete at least one ticket type'); return; }
    }
    setStep((s) => Math.min(6, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async (data, status) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
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
          ? 'Event submitted for review. It will go live once an admin approves it.'
          : 'Event saved as draft',
      );
      navigate('/organizer/events');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) return <LoadingSpinner label="Loading event data..." className="py-20" />;

  const progress = (step / STEPS.length) * 100;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit((d) => submit(d, 'draft'))} className="space-y-6">
        {eventStatus === 'rejected' && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>This event was rejected by an admin. Make the requested changes, then submit it for review again.</span>
          </div>
        )}
        <PageHeader
          icon={CalendarDays}
          accent="gold"
          title={eventId ? 'Edit Event' : 'Create New Event'}
          subtitle="Complete all steps to publish your event."
          actions={
            <button type="button" onClick={() => navigate(-1)} className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#262B2F] transition sm:self-start">Cancel</button>
          }
        />

        {/* Progress */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${step >= s.id ? 'bg-[#D4AF37] text-[#1E252B]' : 'bg-[#494F55]/30 text-[#8A9196]'}`}>
                    {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${step >= s.id ? 'text-[#EDF0F1]' : 'text-[#8A9196]'}`}>{s.title}</span>
                </div>
                {s.id < STEPS.length && <div className={`flex-1 h-0.5 mx-2 ${step > s.id ? 'bg-[#D4AF37]' : 'bg-[#494F55]/30'}`} />}
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-[#494F55]/30 overflow-hidden">
            <div className="h-full bg-[#D4AF37] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 sm:p-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <h2 className="text-lg font-semibold text-[#EDF0F1] mb-5">{STEPS[step - 1].title}</h2>
              {step === 1 && <StepBasicInfo categories={categories} />}
              {step === 2 && <StepLocationTime />}
              {step === 3 && <StepMedia />}
              {step === 4 && <StepCapacity />}
              {step === 5 && <StepTickets />}
              {step === 6 && <StepReview />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={back} disabled={step === 1 || submitting} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] hover:bg-[#494F55]/30 disabled:opacity-30 disabled:cursor-not-allowed transition">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < 6 ? (
            <button type="button" onClick={next} disabled={submitting} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#D4AF37] text-[#1E252B] hover:bg-[#c4a030] disabled:opacity-60 transition">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8A9196] hover:text-[#EDF0F1] border border-[#494F55]/40 hover:bg-[#494F55]/20 disabled:opacity-60 transition">
                <Save className="w-4 h-4" /> {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="button" onClick={handleSubmit((d) => submit(d, 'published'))} disabled={submitting} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#D4AF37] text-[#1E252B] hover:bg-[#c4a030] disabled:opacity-60 transition">
                <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
