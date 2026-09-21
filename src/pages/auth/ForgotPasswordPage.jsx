import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { forgotPassword } from '@/api/auth';
import Logo from '@/components/common/Logo';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await forgotPassword({ email: data.email, website: data.website });
      setSent(true);
      toast.success(res.data?.message || 'Password reset link sent! Check your inbox.', { duration: 5000 });
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }, 1800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not send reset link. Please verify your email.';
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
          font-size: 32px;
          font-weight: 700;
          letter-spacing: .5px;
          margin-bottom: 3px;
          text-align: center;
          text-shadow:
            1px 1px 2px rgba(0, 0, 0, 0.8),
            -1px -1px 1px rgba(255, 255, 255, 0.06);
        }

        .reset-page-root .reset-form .subtitle {
          text-align: center;
          color: #949599;
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: .3px;
          margin-bottom: 8px;
        }

        .reset-page-root .reset-form .desc-text {
          text-align: center;
          color: #949599;
          font-size: 11.5px;
          line-height: 1.4;
          margin-bottom: 18px;
          padding: 0 6px;
        }

        /* Alert Notification Box */
        .reset-page-root .alert-box {
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 11.5px;
          text-align: center;
          margin-bottom: 14px;
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
          margin-bottom: 18px;
        }

        .reset-page-root .input-box .input-icon {
          position: absolute;
          left: 16px;
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
          height: 46px;
          padding: 0 16px 0 45px;
          border: 1px solid rgba(73, 79, 85, 0.35);
          outline: none;
          background: #1C232B;
          color: #EFEFF1;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: .2px;
          border-radius: 12px;
          box-shadow:
            inset 4px 4px 8px rgba(0, 0, 0, 0.45),
            inset -3px -3px 6px rgba(255, 255, 255, 0.03);
          transition: box-shadow .3s ease, border-color .3s ease, transform .3s ease;
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

        .reset-page-root .field-error {
          font-size: 11px;
          color: #f87171;
          margin-top: -12px;
          margin-bottom: 12px;
          padding-left: 4px;
        }

        /* Submit Button */
        .reset-page-root .submit-btn {
          position: relative;
          width: 100%;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 auto;
          overflow: hidden;
          border: none;
          outline: none;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
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
          margin-top: 18px;
        }

        .reset-page-root .back-btn-box a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #949599;
          font-size: 12.5px;
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
            padding: 32px 22px 26px;
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
            margin-bottom: 14px;
            line-height: 1.4;
          }
          .reset-page-root .input-box {
            margin-bottom: 14px;
          }
          .reset-page-root .input-box input {
            height: 44px;
            font-size: 13.5px;
            padding-left: 42px;
          }
          .reset-page-root .input-box .input-icon {
            left: 14px;
          }
          .reset-page-root .submit-btn {
            height: 44px;
            font-size: 13.5px;
          }
          .reset-page-root .back-btn-box {
            margin-top: 16px;
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
            padding-left: 38px;
          }
        }
      `}</style>

      {/* Ambient background glows */}
      <div className="bg-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>

      {/* Subtle grid pattern */}
      <div className="grid-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="circle-container"
      >
        <div className="glass-circle">
          <form className="reset-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Honeypot */}
            <input
              type="text"
              {...register('website')}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ display: 'none' }}
            />

            {/* Logo Emblem on Top */}
            <div className="flex justify-center mb-2.5">
              <Logo size="md" showText={false} asLink={false} />
            </div>

            {/* Title & Subtitles matching reference image */}
            <h1>Reset</h1>
            <div className="subtitle">Recover your credentials</div>
            <p className="desc-text">
              Enter the email linked to your account and we&apos;ll send you a password recovery link.
            </p>

            {/* Alert Message */}
            {errorMessage && (
              <div className="alert-box error" role="alert">
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}
            {sent && (
              <div className="alert-box success" role="status">
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                <span>Reset code dispatched! Redirecting...</span>
              </div>
            )}

            {/* Email Input */}
            <div className="input-box">
              <span className="input-icon">
                <Mail size={16} />
              </span>
              <input
                type="email"
                id="resetEmail"
                placeholder="Enter your email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Enter a valid email address'
                  }
                })}
              />
            </div>
            {errors.email && (
              <div className="field-error">{errors.email.message}</div>
            )}

            {/* Send Reset Link Button */}
            <button
              type="submit"
              id="sendResetBtn"
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            {/* Back to Login Link */}
            <div className="back-btn-box">
              <Link to="/login">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
