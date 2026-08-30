import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, MailCheck, Send, KeyRound, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { forgotPassword } from '@/api/auth';
import Logo from '@/components/common/Logo';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    setEmail(data.email);
    try {
      const res = await forgotPassword({ email: data.email, website: data.website });
      setSent(true);
      toast.success(res.data?.message || '6-digit password reset code sent via Email & SMS!', { duration: 6000 });
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }, 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset code. Please check your email/phone.');
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-[#EFEFF1]">Reset Your Password</h1>
            <p className="mt-1 text-sm text-[#949599]">
              {sent ? 'Check your email and SMS for your 6-digit code' : 'Enter your registered email address to receive your 6-digit reset code'}
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-4 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <MailCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#EFEFF1]">Reset Code Dispatched!</h3>
              <p className="text-sm text-[#949599]">
                We sent a 6-digit code to <span className="text-white font-medium">{email}</span> and your verified phone number via SMS.
              </p>
              <p className="text-xs text-amber-400">The code expires in 15 minutes.</p>

              <div className="pt-2">
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" /> Enter 6-Digit Code Now
                </Link>
              </div>

              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#949599] hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Try a different email
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="text" {...register('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                    })}
                    className={`w-full pl-10 pr-3 py-3 rounded-lg bg-[#1C232B] border text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none transition-colors ${
                      errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-[#494F55]/40 focus:border-white/50'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending Code...</> : <><Send className="w-4 h-4" /> Send 6-Digit Reset Code</>}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#949599] hover:text-white transition">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
