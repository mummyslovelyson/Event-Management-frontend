import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Ticket, Loader2, ArrowLeft, MailCheck, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { forgotPassword } from '@/api/auth';

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    setEmail(data.email);
    try {
      await forgotPassword({ email: data.email, website: data.website });
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset link. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C232B] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/5 blur-3xl" />
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
            <Link to="/" className="inline-flex items-center gap-2 mb-2">
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37] flex items-center justify-center shadow-lg">
                <Ticket className="w-6 h-6 text-[#1C232B]" strokeWidth={2.5} />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-[#EFEFF1]">Forgot Password?</h1>
            <p className="mt-1 text-sm text-[#949599]">
              {sent ? 'Check your email for the reset link' : 'Enter your email and we\'ll send you a reset link'}
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-5">
                <MailCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#EFEFF1]">Email Sent!</h3>
              <p className="mt-2 text-sm text-[#949599]">
                We've sent a password reset link to <span className="text-[#D4AF37] font-medium">{email}</span>.
                The link will expire in 1 hour.
              </p>
              <p className="mt-3 text-xs text-[#494F55]">Didn't receive it? Check your spam folder.</p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#D4AF37] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Try a different email
              </button>
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
                    placeholder="you@example.com"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                    })}
                    className={`w-full pl-10 pr-3 py-3 rounded-lg bg-[#1C232B] border text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none transition-colors ${
                      errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-[#494F55]/40 focus:border-[#D4AF37]/50'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Reset Link</>}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#949599] hover:text-[#D4AF37] transition">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
