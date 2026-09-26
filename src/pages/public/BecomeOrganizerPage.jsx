import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, CheckCircle2, Building2, Globe, MapPin, Phone,
  Mail, ArrowRight, Sparkles, RefreshCw, AlertCircle, XCircle,
  Clock, Share2, Ticket, BarChart3, Users, DollarSign,
  UploadCloud, ExternalLink, Lock, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { applyOrganizer, getOrganizerApplicationStatus } from '@/api/users';
import { register as registerApi } from '@/api/auth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CATEGORIES = [
  'Music & Concerts',
  'Nightlife & Parties',
  'Arts & Culture',
  'Festivals & Carnivals',
  'Tech & Business',
  'Sports & Fitness',
  'Food & Drinks',
  'Fashion & Lifestyle',
  'Community & Charity',
  'Other',
];

export default function BecomeOrganizerPage() {
  useDocumentTitle('Become an Event Organizer | Tribes & Cliqs');
  const { user, isAuthenticated, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [appStatus, setAppStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    organizationName: '',
    logoUrl: '',
    description: '',
    phone: '',
    email: '',
    password: '',
    location: '',
    website: '',
    category: 'Music & Concerts',
    socialTwitter: '',
    socialInstagram: '',
    socialLinkedin: '',
    socialFacebook: '',
  });

  // Prepopulate form if user is logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        organizationName: user.organization_name || user.organizationName || prev.organizationName || '',
      }));
    }
  }, [user]);

  // Fetch organizer application status
  const fetchStatus = async () => {
    if (!isAuthenticated) return;
    setLoadingStatus(true);
    try {
      const res = await getOrganizerApplicationStatus();
      if (res.data) {
        setAppStatus(res.data);
        if (res.data.organizationName) {
          setFormData((prev) => ({
            ...prev,
            organizationName: res.data.organizationName || prev.organizationName,
            description: res.data.description || prev.description,
            logoUrl: res.data.logoUrl || prev.logoUrl,
            website: res.data.website || prev.website,
            location: res.data.city || res.data.location || prev.location,
            category: res.data.category || prev.category,
          }));
        }
      }
    } catch {
      // Non-fatal if not yet an organizer
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [isAuthenticated]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      await fetchStatus();
      toast.success('Application status refreshed');
    } catch {
      toast.error('Unable to refresh status at this time');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.organizationName.trim()) {
      toast.error('Please enter your Company or Organization Name');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please provide a brief description of your organization');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Please enter a contact phone number');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Please specify your city or location');
      return;
    }

    const socialMedia = {
      twitter: formData.socialTwitter.trim(),
      instagram: formData.socialInstagram.trim(),
      linkedin: formData.socialLinkedin.trim(),
      facebook: formData.socialFacebook.trim(),
    };

    setSubmitting(true);
    try {
      if (isAuthenticated) {
        // Authenticated user applying to become organizer
        const payload = {
          organizationName: formData.organizationName.trim(),
          logoUrl: formData.logoUrl.trim() || null,
          description: formData.description.trim(),
          phone: formData.phone.trim(),
          location: formData.location.trim(),
          city: formData.location.trim(),
          website: formData.website.trim() || null,
          category: formData.category,
          socialMedia,
        };

        const res = await applyOrganizer(payload);
        toast.success(res.data?.message || 'Organizer application submitted successfully!');
        await refreshProfile();
        await fetchStatus();
      } else {
        // Unauthenticated guest creating account & applying
        if (!formData.email.trim() || !formData.password.trim()) {
          toast.error('Please enter your email and choose a secure password');
          setSubmitting(false);
          return;
        }

        const payload = {
          name: formData.organizationName.trim(),
          organizationName: formData.organizationName.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone.trim(),
          city: formData.location.trim(),
          location: formData.location.trim(),
          category: formData.category,
          websiteUrl: formData.website.trim() || 'https://tribesandcliqs.com',
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim() || null,
          role: 'organizer',
          socialMedia,
        };

        const res = await registerApi(payload);
        toast.success(
          res.data?.message || 'Organizer account registered! Please check your email to verify your account.',
          { duration: 6000 }
        );
        navigate(`/verify-email?email=${encodeURIComponent(formData.email)}&regId=${encodeURIComponent(res.data?.registrationId || '')}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit organizer application');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine current organizer verification state
  const isOrganizerRole = user?.role === 'organizer' || appStatus?.role === 'organizer';
  const isApproved = user?.is_approved || appStatus?.is_approved || user?.isApproved || appStatus?.isApproved;
  const isRejected = user?.status === 'rejected' || appStatus?.status === 'rejected';
  const isSuspended = user?.status === 'suspended' || appStatus?.status === 'suspended';
  const isPending = isOrganizerRole && !isApproved && !isRejected && !isSuspended;

  return (
    <div className="min-h-screen bg-[#111417] text-[#EFEFF1] py-12 px-4 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-white/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto space-y-10">
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verified Event Organizer Program
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Host Exceptional Events on <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">Tribes &amp; Cliqs</span>
          </h1>
          <p className="text-sm sm:text-base text-[#949599] leading-relaxed">
            Sell tickets effortlessly, reach thousands of passionate event lovers, get instant mobile money &amp; bank payouts, and earn your official <strong>Verified Organizer Badge</strong>.
          </p>
        </div>

        {/* Status Callout Banners if User Has Already Applied */}
        {isAuthenticated && (
          <AnimatePresence mode="wait">
            {isApproved && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-[#171A1D] border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">You are a Verified Organizer</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <ShieldCheck className="w-3 h-3" /> Verified Badge Active
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-200/80 mt-1">
                      Your organizer account is in good standing. You have full access to publish events, create ticket tiers, manage orders, and track payouts.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to="/organizer/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#111417] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-md"
                  >
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}

            {isPending && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-[#171A1D] border border-amber-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Application Pending Verification</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Pending Admin Review
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-200/80 mt-1">
                      Our operations board is currently reviewing your organization details. You will automatically receive an <strong>Email and SMS alert</strong> as soon as your account is approved.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleRefreshStatus}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#111417] text-sm font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Checking...' : 'Check Status'}
                  </button>
                  <Link
                    to="/organizer/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#262B2F] text-white text-sm font-semibold hover:bg-[#3A4045] transition"
                  >
                    View Status Page
                  </Link>
                </div>
              </motion.div>
            )}

            {isRejected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-gradient-to-r from-red-950/40 via-red-900/30 to-[#171A1D] border border-red-500/30 shadow-xl space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Application Not Approved</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                        Rejected
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-red-200/90 mt-1">
                      Reason: <strong className="text-white">{appStatus?.suspendReason || user?.suspend_reason || 'Application did not meet verification criteria.'}</strong>
                    </p>
                    <p className="text-xs text-[#949599] mt-2">
                      You can update your organization profile details below and submit an appeal/re-application.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {isSuspended && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-rose-900/30 to-[#171A1D] border border-rose-500/30 shadow-xl flex items-start gap-4"
              >
                <AlertCircle className="w-8 h-8 text-rose-400 shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-white">Organizer Account Suspended</h3>
                  <p className="text-xs sm:text-sm text-rose-200/90 mt-1">
                    Your organizer privileges have been suspended. Reason: <strong className="text-white">{appStatus?.suspendReason || user?.suspend_reason || 'Policy violation.'}</strong>
                  </p>
                  <p className="text-xs text-[#949599] mt-2">
                    Please contact our support team at <a href="mailto:support@tribesandcliqs.com" className="text-white underline">support@tribesandcliqs.com</a> to appeal this decision.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#171A1D] border border-[#262B2F] hover:border-white/30 transition">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Verified Badge</h4>
            <p className="text-xs text-[#949599] mt-1 leading-relaxed">
              Build instant trust with attendees with a verified checkmark displayed on all your events and profile.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#171A1D] border border-[#262B2F] hover:border-white/30 transition">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-3">
              <Ticket className="w-5 h-5 text-blue-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Ticket Tiers &amp; Seating</h4>
            <p className="text-xs text-[#949599] mt-1 leading-relaxed">
              Create Early Bird, VIP, Tables, and General Admission with promo codes, seat maps, and group discounts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#171A1D] border border-[#262B2F] hover:border-white/30 transition">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Direct Payouts</h4>
            <p className="text-xs text-[#949599] mt-1 leading-relaxed">
              Automated mobile money (MTN, Telecel, AT) and direct bank deposits for ticket revenue.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#171A1D] border border-[#262B2F] hover:border-white/30 transition">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="text-sm font-bold text-white">13 Dashboard Modules</h4>
            <p className="text-xs text-[#949599] mt-1 leading-relaxed">
              QR Check-in scanner, attendee management, orders, real-time analytics, promotions, team roles, and settings.
            </p>
          </div>
        </div>

        {/* Application Form Card */}
        {(!isApproved || isRejected) && (
          <div className="rounded-3xl bg-[#171A1D] border border-[#262B2F] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="border-b border-[#262B2F] pb-6 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {isRejected ? 'Update & Re-submit Organizer Application' : 'Organizer Application Form'}
              </h2>
              <p className="text-xs sm:text-sm text-[#949599] mt-1">
                Fill in your brand profile accurately. Our compliance team verifies organizer identity to maintain platform safety.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Organization Profile Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white" />
                  1. Organization &amp; Brand Profile
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      Company / Organizer Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="organizationName"
                      required
                      placeholder="e.g. Echo House, AfroFuture, Groove Nation"
                      value={formData.organizationName}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      Primary Event Category <span className="text-rose-400">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white focus:outline-none focus:border-white transition"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#1C232B] text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Logo URL with Live Preview */}
                <div>
                  <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                    Brand Logo URL
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#1C232B] border border-[#3A4045] flex items-center justify-center overflow-hidden shrink-0">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = ''; }}
                        />
                      ) : (
                        <UploadCloud className="w-6 h-6 text-[#6B7278]" />
                      )}
                    </div>
                    <input
                      type="url"
                      name="logoUrl"
                      placeholder="https://example.com/logo.png"
                      value={formData.logoUrl}
                      onChange={handleChange}
                      className="flex-1 h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>
                  <p className="text-[11px] text-[#6B7278] mt-1.5">
                    Square PNG or JPG recommended (minimum 200x200px).
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                    Organization Description &amp; Event Scope <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    placeholder="Tell us about the events you produce, your target audience, past experience, and what makes your experiences special..."
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full p-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Contact & Location */}
              <div className="space-y-6 pt-6 border-t border-[#262B2F]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-white" />
                  2. Contact &amp; Operating Location
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      Operating City / Location <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      required
                      placeholder="e.g. Accra, Ghana or Lagos, Nigeria"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      Contact Phone (MoMo / WhatsApp) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="+233 24 123 4567"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                        Official Email <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="events@yourbrand.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                        Account Password <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        required
                        placeholder="At least 8 characters"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Online Presence & Social Media */}
              <div className="space-y-6 pt-6 border-t border-[#262B2F]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-white" />
                  3. Online Presence &amp; Social Links
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                    Official Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    placeholder="https://www.yourorganization.com"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      Instagram Handle / URL
                    </label>
                    <input
                      type="text"
                      name="socialInstagram"
                      placeholder="@yourbrand or instagram.com/..."
                      value={formData.socialInstagram}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      Twitter / X Handle / URL
                    </label>
                    <input
                      type="text"
                      name="socialTwitter"
                      placeholder="@yourbrand or x.com/..."
                      value={formData.socialTwitter}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      LinkedIn Page URL
                    </label>
                    <input
                      type="text"
                      name="socialLinkedin"
                      placeholder="linkedin.com/company/..."
                      value={formData.socialLinkedin}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#EFEFF1] mb-2">
                      Facebook Page URL
                    </label>
                    <input
                      type="text"
                      name="socialFacebook"
                      placeholder="facebook.com/..."
                      value={formData.socialFacebook}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-xl bg-[#1C232B] border border-[#3A4045] text-sm text-white placeholder-[#6B7278] focus:outline-none focus:border-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-6 border-t border-[#262B2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#949599]">
                  By submitting, you agree to our Organizer Terms of Service and Event Ticketing Guidelines.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#111417] text-sm font-extrabold hover:bg-[#CBD5E1] transition disabled:opacity-50 shadow-xl shadow-white/5 cursor-pointer shrink-0"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    <>
                      {isRejected ? 'Re-submit Application' : 'Submit Application'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Attendee Callout if not logged in */}
        {!isAuthenticated && (
          <div className="p-6 rounded-2xl bg-[#171A1D] border border-[#262B2F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h4 className="text-sm font-bold text-white">Already have an attendee account?</h4>
              <p className="text-xs text-[#949599] mt-0.5">
                Sign in to quickly upgrade your existing account to an event organizer without creating a new password.
              </p>
            </div>
            <Link
              to="/login?from=/become-organizer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#262B2F] text-white text-xs font-semibold hover:bg-[#3A4045] transition shrink-0"
            >
              Sign In to Apply
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
