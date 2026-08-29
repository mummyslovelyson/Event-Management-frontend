import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, CheckCircle2, XCircle, ArrowLeft, Mail,
  Phone, RefreshCw, KeyRound, Edit2, Check, ArrowRight,
  ShieldCheck, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyEmail, resendVerification } from '@/api/auth';
import Logo from '@/components/common/Logo';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token');
  const emailParam = searchParams.get('email') || '';
  const phoneParam = searchParams.get('phone') || '';
  const regIdParam = searchParams.get('regId') || '';

  const [channel, setChannel] = useState(phoneParam && !emailParam ? 'sms' : 'email'); // 'email' | 'sms'
  const [email, setEmail] = useState(emailParam);
  const [phone, setPhone] = useState(phoneParam);
  const [registrationId, setRegistrationId] = useState(regIdParam);
  const [isEditingContact, setIsEditingContact] = useState(!emailParam && !phoneParam && !tokenParam);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState(tokenParam ? 'verifying_token' : 'idle'); // 'idle' | 'verifying_token' | 'verifying_otp' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef([]);

  // Auto-verify if a direct link token is provided in the URL
  useEffect(() => {
    if (!tokenParam) return;
    let cancelled = false;
    (async () => {
      setStatus('verifying_token');
      try {
        await verifyEmail({ token: tokenParam });
        if (!cancelled) {
          setStatus('success');
          toast.success('Account verified successfully! 🎉');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          const msg = err.response?.data?.message || 'Verification link expired or invalid.';
          setErrorMessage(msg);
          toast.error(msg);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [tokenParam]);

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input box
  useEffect(() => {
    if (!tokenParam && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [tokenParam, channel]);

  const handleOtpChange = (index, val) => {
    const numeric = val.replace(/\D/g, '');
    if (!numeric) {
      const next = [...otp];
      next[index] = '';
      setOtp(next);
      return;
    }

    if (numeric.length > 1) {
      const digits = numeric.slice(0, 6).split('');
      const next = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) next[index + i] = d;
      });
      setOtp(next);
      const nextFocus = Math.min(index + digits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      if (next.every((d) => d !== '')) {
        submitOtp(next.join(''));
      }
      return;
    }

    const next = [...otp];
    next[index] = numeric;
    setOtp(next);

    if (index < 5 && numeric) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && numeric && next.every((d) => d !== '')) {
      submitOtp(next.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const next = [...otp];
        next[index - 1] = '';
        setOtp(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const digits = pasted.split('');
    const next = ['', '', '', '', '', ''];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);

    const focusIdx = Math.min(digits.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (digits.length === 6) {
      submitOtp(pasted);
    }
  };

  const submitOtp = async (codeToVerify) => {
    const code = codeToVerify || otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit verification code');
      return;
    }

    if (channel === 'email' && !email) {
      toast.error('Please enter your email address');
      setIsEditingContact(true);
      return;
    }
    if (channel === 'sms' && !phone) {
      toast.error('Please enter your phone number');
      setIsEditingContact(true);
      return;
    }

    setStatus('verifying_otp');
    setErrorMessage('');
    try {
      const payload = { otp: code };
      if (channel === 'email' || email) payload.email = email.trim();
      if (channel === 'sms' || phone) payload.phone = phone.trim();
      if (registrationId) payload.registrationId = registrationId.trim();

      const res = await verifyEmail(payload);
      setStatus('success');
      toast.success(res.data?.message || 'Account verified and created successfully! 🎉');
    } catch (err) {
      setStatus('idle');
      const msg = err.response?.data?.message || 'Invalid or expired verification code';
      setErrorMessage(msg);
      toast.error(msg);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async (targetChannel = channel) => {
    if (targetChannel === 'email' && (!email || !email.includes('@'))) {
      toast.error('Please enter a valid email address');
      setIsEditingContact(true);
      return;
    }
    if (targetChannel === 'sms' && (!phone || phone.length < 7)) {
      toast.error('Please enter a valid phone number');
      setIsEditingContact(true);
      return;
    }
    if (cooldown > 0) return;

    setResending(true);
    try {
      await resendVerification({
        email: email?.trim(),
        phone: phone?.trim(),
        registrationId: registrationId?.trim() || undefined,
        channel: targetChannel,
      });
      toast.success(
        targetChannel === 'sms'
          ? `Verification code sent via SMS to ${phone}`
          : `Verification code sent to ${email}`
      );
      setCooldown(60);
      setErrorMessage('');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C232B] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl bg-[#161D22] border border-[#494F55]/40 shadow-2xl shadow-black/40 p-6 sm:p-8">
          {/* Logo Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo size="lg" showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-[#EFEFF1]">
              {status === 'success' ? 'Account Verified' : 'Verify Your Account'}
            </h1>
            <p className="mt-1 text-sm text-[#949599]">
              {status === 'success'
                ? 'Your account is activated and ready to use'
                : 'Enter the 6-digit code sent to your email or phone'}
            </p>
          </div>

          {/* Direct Link Token Verifying State */}
          {status === 'verifying_token' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-5">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <p className="text-sm text-[#949599]">Verifying your email link…</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#EFEFF1]">Awesome! You’re Verified</h3>
              <p className="mt-2 text-sm text-[#949599]">
                Your account is confirmed. You can now sign in to browse events and manage tickets.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition shadow-lg shadow-white/5"
              >
                Sign In to Your Account <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}

          {/* Error with Link State */}
          {status === 'error' && tokenParam && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-[#EFEFF1]">Link Expired</h3>
              <p className="mt-2 text-sm text-[#949599]">
                {errorMessage || 'This link has expired or has already been used. You can enter your 6-digit OTP code below.'}
              </p>
              <button
                onClick={() => {
                  setStatus('idle');
                  setIsEditingContact(true);
                }}
                className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-[#494F55]/50 text-[#EFEFF1] text-sm font-medium hover:border-white/40 transition"
              >
                <KeyRound className="w-4 h-4" /> Enter 6-Digit Code Instead
              </button>
            </motion.div>
          )}

          {/* OTP Input Form (Idle / Verifying OTP) */}
          {(status === 'idle' || status === 'verifying_otp') && (
            <div>
              {/* Delivery Alert Banner */}
              <div className="mb-4 p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#CBD5E1] space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verification Code Dispatched</span>
                </div>
                <p className="text-[#949599] leading-relaxed text-[11px]">
                  {phone && email
                    ? `A 6-digit verification code was sent via SMS to ${phone} and Email to ${email}. Enter the code below.`
                    : phone
                    ? `A 6-digit verification code was sent via SMS to ${phone}. Enter the code below.`
                    : `A 6-digit verification code was sent to ${email || 'your email'}. Enter the code below.`}
                </p>
              </div>

              {/* Channel Tabs (Email vs SMS) */}
              <div className="flex rounded-xl bg-[#13171B] p-1 mb-5 border border-[#494F55]/20">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
                    channel === 'email'
                      ? 'bg-[#242B32] text-white shadow-sm'
                      : 'text-[#949599] hover:text-[#EFEFF1]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email Code
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${
                    channel === 'sms'
                      ? 'bg-[#242B32] text-white shadow-sm'
                      : 'text-[#949599] hover:text-[#EFEFF1]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> SMS (Phone)
                </button>
              </div>

              {/* Target contact badge / editor */}
              <div className="mb-6 p-3 rounded-xl bg-[#1E252B] border border-[#494F55]/30">
                {isEditingContact ? (
                  <div className="flex items-center gap-2">
                    {channel === 'email' ? (
                      <Mail className="w-4 h-4 text-[#949599] shrink-0" />
                    ) : (
                      <Phone className="w-4 h-4 text-[#949599] shrink-0" />
                    )}
                    {channel === 'email' ? (
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="bg-transparent text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none flex-1"
                        autoFocus
                      />
                    ) : (
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +233 24 123 4567"
                        className="bg-transparent text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none flex-1"
                        autoFocus
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      disabled={channel === 'email' ? !email : !phone}
                      className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-40"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-[#EFEFF1] truncate">
                      {channel === 'email' ? (
                        <Mail className="w-4 h-4 text-[#949599] shrink-0" />
                      ) : (
                        <Phone className="w-4 h-4 text-[#949599] shrink-0" />
                      )}
                      <span className="truncate font-medium">
                        {channel === 'email'
                          ? email || 'No email provided'
                          : phone || 'No phone number provided'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(true)}
                      className="text-xs text-[#949599] hover:text-white flex items-center gap-1 transition ml-2 shrink-0"
                    >
                      <Edit2 className="w-3 h-3" /> Change
                    </button>
                  </div>
                )}
              </div>

              {/* 6-Digit OTP Boxes */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-[#949599] mb-3 text-center uppercase tracking-wider">
                  6-Digit Verification Code
                </label>
                <div className="flex items-center justify-between gap-2 sm:gap-2.5">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      disabled={status === 'verifying_otp'}
                      className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-[#1C232B] border transition-all focus:outline-none ${
                        digit
                          ? 'border-white text-white shadow-sm shadow-white/10'
                          : 'border-[#494F55]/40 text-[#EFEFF1] focus:border-white/60 focus:ring-1 focus:ring-white/30'
                      }`}
                    />
                  ))}
                </div>
                {errorMessage && (
                  <p className="mt-2 text-xs text-red-400 text-center">{errorMessage}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => submitOtp()}
                disabled={status === 'verifying_otp' || otp.some((d) => !d)}
                className="w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-white/5"
              >
                {status === 'verifying_otp' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code…
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>

              {/* Resend Options (SMS / Email) */}
              <div className="mt-6 pt-5 border-t border-[#494F55]/20">
                <p className="text-xs text-[#949599] text-center mb-3">Didn’t receive the code?</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleResend('email')}
                    disabled={resending || cooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:underline disabled:no-underline disabled:text-[#494F55] transition"
                  >
                    <Mail className="w-3 h-3" />
                    {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Email'}
                  </button>

                  <span className="text-[#494F55] text-xs">•</span>

                  <button
                    type="button"
                    onClick={() => handleResend('sms')}
                    disabled={resending || cooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:underline disabled:no-underline disabled:text-[#494F55] transition"
                  >
                    <MessageSquare className="w-3 h-3" />
                    {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend via SMS'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-[#949599] hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
