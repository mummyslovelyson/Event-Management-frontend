import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ShieldCheck, KeyRound, Mail, AlertCircle } from 'lucide-react';
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
  const [errorMessage, setErrorMessage] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      email: initialEmail,
      code: initialCode,
    },
  });
  const password = watch('password') || '';

  // Password strength calculation
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (password.length === 0) {
      return { width: '0%', color: '#494F55', label: 'Weak', labelColor: '#949599' };
    }
    if (score <= 1) {
      return { width: '25%', color: '#e74c3c', label: 'Weak', labelColor: '#f87171' };
    }
    if (score === 2) {
      return { width: '50%', color: '#f39c12', label: 'Fair', labelColor: '#fbbf24' };
    }
    if (score === 3) {
      return { width: '75%', color: '#38bdf8', label: 'Good', labelColor: '#38bdf8' };
    }
    return { width: '100%', color: '#34d399', label: 'Strong', labelColor: '#34d399' };
  }, [password]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    setErrorMessage('');
    if (data.password !== data.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setSubmitting(false);
      return;
    }
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
      toast.success('Password updated successfully! Redirecting...', { duration: 4000 });
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not reset password. Invalid or expired code.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reset-page-root">
      <style>{`
        .reset-page-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #1C232B;
          color: #EFEFF1;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        /* Ambient Glow Background */
        .reset-page-root .bg-ambient {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .reset-page-root .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .reset-page-root .ambient-orb-1 {
          width: 500px;
          height: 500px;
          background: #ffffff;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
        }
        .reset-page-root .ambient-orb-2 {
          width: 400px;
          height: 400px;
          background: #b21414;
          bottom: -80px;
          right: 15%;
          opacity: 0.12;
        }

        /* Grid Pattern */
        .reset-page-root .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: linear-gradient(#EFEFF1 1px, transparent 1px), linear-gradient(90deg, #EFEFF1 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Circular Container */
        .reset-page-root .circle-container {
          position: relative;
          width: 530px;
          height: 530px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }

        /* Neumorphic Glass Circle using Project Colors */
        .reset-page-root .glass-circle {
          position: relative;
          width: 530px;
          height: 530px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #161D22;
          box-shadow:
            -18px -18px 40px rgba(255, 255, 255, 0.035),
            24px 24px 50px rgba(0, 0, 0, 0.75),
            inset -1px -1px 1px rgba(255, 255, 255, 0.08),
            inset 1px 1px 1px rgba(0, 0, 0, 0.6);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        /* Inner Ring with Depth */
        .reset-page-root .glass-circle::before {
          content: "";
          position: absolute;
          inset: 14px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow:
            inset 4px 4px 12px rgba(0, 0, 0, 0.45),
            inset -3px -3px 8px rgba(255, 255, 255, 0.03);
          pointer-events: none;
        }

        /* Form Structure */
        .reset-page-root .reset-form {
          position: relative;
          width: 300px;
          z-index: 20;
        }

        /* Titles */
        .reset-page-root .reset-form h1 {
          color: #EFEFF1;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: .5px;
          margin-bottom: 2px;
          text-align: center;
          text-shadow:
            1px 1px 2px rgba(0, 0, 0, 0.8),
            -1px -1px 1px rgba(255, 255, 255, 0.06);
        }

        .reset-page-root .reset-form .subtitle {
          text-align: center;
          color: #949599;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .3px;
          margin-bottom: 4px;
        }

        .reset-page-root .reset-form .desc-text {
          text-align: center;
          color: #949599;
          font-size: 11px;
          line-height: 1.35;
          margin-bottom: 12px;
          padding: 0 4px;
        }

        /* Alert Notification Box */
        .reset-page-root .alert-box {
          border-radius: 10px;
          padding: 7px 10px;
          font-size: 11px;
          text-align: center;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          line-height: 1.35;
          animation: alertFadeIn 0.3s ease;
        }
        .reset-page-root .alert-box.error {
          background: rgba(161, 15, 15, 0.15);
          border: 1px solid rgba(161, 15, 15, 0.35);
          color: #fca5a5;
        }
        .reset-page-root .alert-box.success {
          background: rgba(43, 122, 75, 0.15);
          border: 1px solid rgba(43, 122, 75, 0.35);
          color: #86efac;
        }

        @keyframes alertFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Recessed Neumorphic Input Box */
        .reset-page-root .input-box {
          position: relative;
          margin-bottom: 10px;
        }

        .reset-page-root .input-box .input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #949599;
          z-index: 2;
          pointer-events: none;
          transition: color .25s ease;
          display: flex;
          align-items: center;
        }

        .reset-page-root .input-box input {
          width: 100%;
          height: 40px;
          padding: 0 15px 0 42px;
          border: 1px solid rgba(73, 79, 85, 0.35);
          outline: none;
          background: #1C232B;
          color: #EFEFF1;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: .2px;
          border-radius: 11px;
          box-shadow:
            inset 3px 3px 6px rgba(0, 0, 0, 0.45),
            inset -2px -2px 5px rgba(255, 255, 255, 0.03);
          transition: box-shadow .3s ease, border-color .3s ease;
        }

        .reset-page-root .input-box input.has-eye {
          padding-right: 40px;
        }

        .reset-page-root .input-box input::placeholder {
          color: #494F55;
          font-weight: 400;
        }

        .reset-page-root .input-box input:focus {
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow:
            inset 3px 3px 6px rgba(0, 0, 0, 0.6),
            inset -2px -2px 5px rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .reset-page-root .input-box input:focus + .input-icon,
        .reset-page-root .input-box:focus-within .input-icon {
          color: #EFEFF1;
        }

        .reset-page-root .input-box .toggle-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #949599;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color .25s ease;
          z-index: 5;
        }

        .reset-page-root .input-box .toggle-eye:hover {
          color: #EFEFF1;
        }

        /* Password Strength Bar */
        .reset-page-root .strength-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: -4px 0 10px 2px;
        }

        .reset-page-root .strength-bar {
          flex: 1;
          height: 3.5px;
          background: #242B32;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .reset-page-root .strength-fill {
          height: 100%;
          transition: width 0.3s ease, background 0.3s ease;
          border-radius: 4px;
        }

        .reset-page-root .strength-text {
          font-size: 10.5px;
          font-weight: 500;
          min-width: 46px;
          text-align: right;
        }

        /* Submit Button */
        .reset-page-root .submit-btn {
          position: relative;
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 6px auto 0;
          overflow: hidden;
          border: none;
          outline: none;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: .8px;
          text-transform: uppercase;
          color: #1C232B;
          background: #EFEFF1;
          box-shadow:
            0 4px 14px rgba(0, 0, 0, 0.3),
            -4px -4px 10px rgba(255, 255, 255, 0.05),
            4px 4px 10px rgba(0, 0, 0, 0.4);
          transition: color .3s ease, background .3s ease, box-shadow .3s ease, transform .2s ease;
        }

        .reset-page-root .submit-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(115deg, transparent, rgba(255, 255, 255, 0.6), transparent);
          transform: skewX(-20deg);
          transition: left .6s ease;
        }

        .reset-page-root .submit-btn:hover:not(:disabled)::before {
          left: 130%;
        }

        .reset-page-root .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #CBD5E1;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
        }

        .reset-page-root .submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .reset-page-root .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Back to Login Link */
        .reset-page-root .back-btn-box {
          text-align: center;
          margin-top: 14px;
        }

        .reset-page-root .back-btn-box a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #949599;
          font-size: 12px;
          font-weight: 500;
          text-decoration: none;
          transition: transform .2s ease, color .2s ease;
        }

        .reset-page-root .back-btn-box a:hover {
          color: #EFEFF1;
          transform: translateX(-3px);
        }

        /* Responsive */
        @media (max-width: 640px) {
          .reset-page-root {
            padding: 20px 14px;
            align-items: center;
          }
          .reset-page-root .circle-container {
            width: 100%;
            max-width: 420px;
            height: auto;
            min-height: auto;
          }
          .reset-page-root .glass-circle {
            width: 100%;
            max-width: 420px;
            height: auto;
            min-height: auto;
            border-radius: 28px;
            padding: 30px 22px 24px;
            box-shadow:
              -10px -10px 24px rgba(255, 255, 255, 0.025),
              16px 16px 36px rgba(0, 0, 0, 0.7);
          }
          .reset-page-root .glass-circle::before {
            border-radius: 22px;
            inset: 8px;
          }
          .reset-page-root .reset-form {
            width: 100%;
          }
          .reset-page-root .reset-form h1 {
            font-size: 26px;
          }
          .reset-page-root .reset-form .subtitle {
            font-size: 11.5px;
            margin-bottom: 6px;
          }
          .reset-page-root .reset-form .desc-text {
            font-size: 11px;
            margin-bottom: 12px;
          }
          .reset-page-root .input-box {
            margin-bottom: 12px;
          }
          .reset-page-root .input-box input {
            height: 42px;
            font-size: 13px;
            padding-left: 40px;
          }
          .reset-page-root .input-box .input-icon {
            left: 14px;
          }
          .reset-page-root .submit-btn {
            height: 44px;
            font-size: 13.5px;
            margin-top: 8px;
          }
          .reset-page-root .back-btn-box {
            margin-top: 14px;
          }
        }

        @media (max-width: 380px) {
          .reset-page-root .glass-circle {
            padding: 24px 16px 20px;
            border-radius: 22px;
          }
          .reset-page-root .glass-circle::before {
            border-radius: 18px;
            inset: 6px;
          }
          .reset-page-root .reset-form h1 {
            font-size: 23px;
          }
          .reset-page-root .input-box input {
            font-size: 12.5px;
            padding-left: 36px;
          }
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="bg-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>

      {/* Subtle grid overlay */}
      <div className="grid-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="circle-container"
      >
        <div className="glass-circle">
          <form className="reset-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <input
              type="text"
              {...register('website')}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ display: 'none' }}
            />

            {/* Logo Emblem on Top */}
            <div className="flex justify-center mb-2">
              <Logo size="md" showText={false} asLink={false} />
            </div>

            <h1>Reset</h1>
            <div className="subtitle">Set a new password</div>
            <p className="desc-text">
              Must be at least 8 characters long with numbers or symbols.
            </p>

            {errorMessage && (
              <div className="alert-box error" role="alert">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}
            {success && (
              <div className="alert-box success" role="status">
                <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
                <span>Password updated! Redirecting...</span>
              </div>
            )}

            {/* Email (hidden if provided, otherwise prompt) */}
            {!initialEmail ? (
              <div className="input-box">
                <span className="input-icon">
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  placeholder="Your email address"
                  autoComplete="email"
                  {...register('email', { required: 'Email is required' })}
                />
              </div>
            ) : (
              <input type="hidden" {...register('email')} />
            )}

            {/* 6-Digit Code */}
            <div className="input-box">
              <span className="input-icon">
                <KeyRound size={15} />
              </span>
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit reset code"
                autoComplete="one-time-code"
                {...register('code', {
                  required: '6-digit code is required',
                  minLength: { value: 6, message: 'Code must be 6 digits' }
                })}
              />
            </div>

            {/* New Password */}
            <div className="input-box">
              <span className="input-icon">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="has-eye"
                placeholder="New password"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' }
                })}
              />
              <button
                type="button"
                className="toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Strength Meter */}
            <div className="strength-wrapper">
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{ width: strength.width, background: strength.color }}
                />
              </div>
              <span
                className="strength-text"
                style={{ color: strength.labelColor }}
              >
                {strength.label}
              </span>
            </div>

            {/* Confirm Password */}
            <div className="input-box">
              <span className="input-icon">
                <ShieldCheck size={15} />
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="has-eye"
                placeholder="Confirm password"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Confirm password is required',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
              <button
                type="button"
                className="toggle-eye"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Update Password Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>

            {/* Back to Login */}
            <div className="back-btn-box">
              <Link to="/login">
                <ArrowLeft size={13} /> Back to Login
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
