import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, KeyRound, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { resetPassword } from '@/api/auth';
import Logo from '@/components/common/Logo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialCode = searchParams.get('code') || initialToken;
  const initialEmail = searchParams.get('email') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      email: initialEmail,
      code: initialCode,
    },
  });
  const password = watch('password');

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        email: data.email,
        code: data.code,
        token: data.code,
        password: data.password,
        website: data.website,
      };
      await resetPassword(payload);
      setSuccess(true);
      toast.success('🎉 Password reset successfully! You can now log in.', { duration: 5000 });
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset password. Invalid or expired 6-digit code.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full pl-10 pr-10 py-3 rounded-lg bg-[#1C232B] border text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none transition-colors ${
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
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl bg-[#161D22] border border-[#494F55]/40 shadow-2xl shadow-black/40 p-6 sm:p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo size="lg" showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-[#EFEFF1]">Create New Password</h1>
            <p className="mt-1 text-sm text-[#949599]">Enter your 6-digit reset code and your new password</p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#EFEFF1]">Password Reset Complete!</h3>
              <p className="text-sm text-[#949599]">
                Your account password has been updated. Redirecting you to sign in...
              </p>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Redirecting to Login
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="text" {...register('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="email"
                    placeholder="name@domain.com"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">6-Digit Reset Code (from SMS / Email)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    {...register('code', {
                      required: '6-digit reset code is required',
                      minLength: { value: 6, message: 'Code must be 6 digits' },
                    })}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-base font-mono tracking-widest text-[#EFEFF1] placeholder:text-[#494F55] placeholder:tracking-normal focus:outline-none focus:border-white/50 transition-colors"
                  />
                </div>
                {errors.code && <p className="mt-1 text-xs text-red-400">{errors.code.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">New Password</label>
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Confirm New Password</label>
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

              {/* Password strength hint */}
              <div className="rounded-lg bg-[#1C232B] border border-[#494F55]/30 p-3">
                <p className="text-xs text-[#949599] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Use at least 8 characters with letters and numbers.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating Password...</> : 'Save & Update Password'}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#949599] hover:text-white transition">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
