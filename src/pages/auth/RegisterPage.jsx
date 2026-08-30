import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Phone, Eye, EyeOff, Loader2,
  UserPlus, Building2, Check, Users, MapPin, Tag, Globe, AlignLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser } from '@/api/auth';
import Logo from '@/components/common/Logo';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('attendee');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    if (!agree) {
      toast.error('Please accept the terms to continue');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role,
        website: data.website,
      };
      if (role === 'organizer') {
        payload.organizationName = data.organizationName;
        payload.category = data.category;
        payload.city = data.city;
        payload.description = data.description;
        payload.websiteUrl = data.websiteUrl;
      }
      const res = await registerUser(payload);
      toast.success(
        res.data?.message || (data.phone
          ? `Verification code sent to your phone (${data.phone}) via SMS and email! Enter code to create account.`
          : `Verification code sent to your email (${data.email})! Enter code to create account.`),
        { duration: 6000 }
      );
      const regIdParam = res.data?.registrationId ? `&regId=${encodeURIComponent(res.data.registrationId)}` : '';
      const phoneParam = data.phone ? `&phone=${encodeURIComponent(data.phone)}` : '';
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}${phoneParam}${regIdParam}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full pl-10 pr-3 py-3 rounded-lg bg-[#1C232B] border text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none transition-colors ${
      errors[field] ? 'border-red-500/50 focus:border-red-500' : 'border-[#494F55]/40 focus:border-white/50'
    }`;

  return (
    <div className="min-h-screen bg-[#1C232B] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-xl"
      >
        <div className="rounded-2xl bg-[#161D22] border border-[#494F55]/40 shadow-2xl shadow-black/40 p-6 sm:p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo size="lg" showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-[#EFEFF1]">Create Account</h1>
            <p className="mt-1 text-sm text-[#949599]">Join the Tribes &amp; Cliqs community</p>
          </div>

          {/* Role tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#1C232B] border border-[#494F55]/30 mb-6">
            <button
              type="button"
              onClick={() => setRole('attendee')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition ${
                role === 'attendee' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'
              }`}
            >
              <Users className="w-4 h-4" /> I'm an Attendee
            </button>
            <button
              type="button"
              onClick={() => setRole('organizer')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition ${
                role === 'organizer' ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'
              }`}
            >
              <Building2 className="w-4 h-4" /> I'm an Organizer
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="text" {...register('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

            <AnimatePresence mode="popLayout">
              {role === 'organizer' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-[#494F55]/30 mb-2">
                    <p className="text-xs text-[#949599] leading-relaxed">
                      Organizer accounts require administrator review and approval before publishing events. Please provide accurate details.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Organization / Brand Name *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                      <input
                        type="text"
                        placeholder="e.g. AfroVibes Entertainment"
                        {...register('organizationName', { required: 'Organization name is required' })}
                        className={inputClass('organizationName')}
                      />
                    </div>
                    {errors.organizationName && <p className="mt-1 text-xs text-red-400">{errors.organizationName.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Event Category *</label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                        <select
                          {...register('category', { required: 'Please select a category' })}
                          className="w-full pl-10 pr-3 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] focus:outline-none focus:border-white/50 transition-colors"
                        >
                          <option value="Music & Concerts">Music &amp; Concerts</option>
                          <option value="Nightlife & Parties">Nightlife &amp; Parties</option>
                          <option value="Corporate & Conferences">Corporate &amp; Conferences</option>
                          <option value="Festivals & Cultural">Festivals &amp; Cultural</option>
                          <option value="Sports & Fitness">Sports &amp; Fitness</option>
                          <option value="Theatre & Arts">Theatre &amp; Arts</option>
                          <option value="Community & Lifestyle">Community &amp; Lifestyle</option>
                          <option value="Other">Other Events</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">City / Location *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                        <input
                          type="text"
                          placeholder="e.g. Accra, Kumasi, Lagos"
                          {...register('city', { required: 'City is required' })}
                          className={inputClass('city')}
                        />
                      </div>
                      {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Organization Bio / Summary</label>
                    <div className="relative">
                      <textarea
                        rows={2}
                        placeholder="Brief summary of your organization and the types of events you host..."
                        {...register('description')}
                        className="w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none focus:border-white/50 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Website or Social Link</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                      <input
                        type="text"
                        placeholder="https://instagram.com/yourhandle or website"
                        {...register('websiteUrl')}
                        className={inputClass('websiteUrl')}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">{role === 'organizer' ? 'Contact Person / Representative Name *' : 'Full Name *'}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                <input
                  type="text"
                  placeholder={role === 'organizer' ? 'Primary contact full name' : 'Full name'}
                  {...register('name', { required: 'Full name is required' })}
                  className={inputClass('name')}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="email"
                    placeholder="Email address"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                    })}
                    className={inputClass('email')}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    {...register('phone', { required: 'Phone number is required' })}
                    className={inputClass('phone')}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password', {
                      required: 'Password is required',
                      validate: {
                        length: (v) => v.length >= 8 || 'At least 8 characters',
                        letter: (v) => /[a-zA-Z]/.test(v) || 'Must include a letter',
                        number: (v) => /\d/.test(v) || 'Must include a number',
                      },
                    })}
                    className={inputClass('password')}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#494F55] hover:text-[#949599] transition">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (v) => v === password || 'Passwords do not match',
                    })}
                    className={inputClass('confirmPassword')}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#494F55] hover:text-[#949599] transition">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="w-4 h-4 rounded border-[#494F55] bg-[#1C232B] text-white focus:ring-white/30 mt-0.5"
              />
              <span className="text-xs text-[#949599] leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-white hover:underline">Terms of Service</Link> and{' '}
                <Link to="/privacy" className="text-white hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#494F55]/30" />
            <span className="text-xs text-[#494F55] uppercase tracking-wider">or sign up with</span>
            <div className="flex-1 h-px bg-[#494F55]/30" />
          </div>

          {/* Google Sign-up */}
          <GoogleAuthButton
            role={role}
            organizerData={{
              organizationName: watch('organizationName'),
              category: watch('category'),
              city: watch('city'),
              phone: watch('phone'),
            }}
            text={`Sign up as ${role === 'organizer' ? 'Organizer' : 'Attendee'} with Google`}
          />

          <p className="mt-6 text-center text-sm text-[#949599]">
            Already have an account?{' '}
            <Link to="/login" className="text-white font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
