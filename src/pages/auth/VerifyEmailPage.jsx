import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ticket, Loader2, CheckCircle2, XCircle, ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyEmail } from '@/api/auth';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await verifyEmail({ token });
        if (!cancelled) setStatus('success');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          toast.error(err.response?.data?.message || 'Verification failed. The link may have expired.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

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
            <h1 className="text-2xl font-bold text-[#EFEFF1]">Verify Your Email</h1>
            <p className="mt-1 text-sm text-[#949599]">Confirm your email address to activate your account</p>
          </div>

          <div className="text-center py-6">
            {status === 'verifying' && (
              <div>
                <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mx-auto mb-5">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <p className="text-sm text-[#949599]">Verifying your email…</p>
              </div>
            )}

            {status === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-[#EFEFF1]">Email Verified!</h3>
                <p className="mt-2 text-sm text-[#949599]">
                  Your email has been verified. You can now sign in to your account.
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] transition"
                >
                  Sign In
                </Link>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-5">
                  <XCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-[#EFEFF1]">Verification Failed</h3>
                <p className="mt-2 text-sm text-[#949599]">
                  {token
                    ? 'This link is invalid or has expired. Request a new one or try signing in.'
                    : 'No verification token was found in the link. Please use the link from your email.'}
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-[#494F55]/50 text-[#EFEFF1] text-sm font-medium hover:border-[#D4AF37]/50 transition"
                >
                  <Mail className="w-4 h-4" /> Go to Sign In
                </Link>
              </motion.div>
            )}
          </div>

          <div className="mt-4 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-[#949599] hover:text-[#D4AF37] transition">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
