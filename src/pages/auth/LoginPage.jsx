import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/common/Logo';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setErrorMessage('');
    try {
      const user = await login(data.email, data.password, data.website);
      toast.success(`Welcome back, ${user.name || user.email}!`, { duration: 4000 });
      const from = location.state?.from?.pathname;
      if (from && !from.startsWith('/admin')) {
        navigate(from, { replace: true });
      } else if (['admin', 'system_admin', 'superadmin', 'staff'].includes(user.role)) {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'organizer') {
        navigate('/organizer/dashboard', { replace: true });
      } else {
        navigate('/attendee/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.response?.data?.isAdminPortalRedirect) {
        toast.error(err.response.data.message || 'Admin accounts must log in via the Admin Portal', { duration: 5000 });
        navigate('/admin-login');
        return;
      }
      if (err.response?.data?.requiresVerification) {
        toast.error(err.response.data.message || 'Please verify your account first', { duration: 6000 });
        const emailParam = encodeURIComponent(err.response.data.email || data.email || '');
        const phoneParam = err.response.data.phone ? `&phone=${encodeURIComponent(err.response.data.phone)}` : '';
        navigate(`/verify-email?email=${emailParam}${phoneParam}`);
        return;
      }
      const msg = err.friendlyMessage || err.response?.data?.message || 'Invalid email or password';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="login-page-root">
      <style>{`
        .login-page-root {
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
        .login-page-root .bg-ambient {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .login-page-root .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .login-page-root .ambient-orb-1 {
          width: 520px;
          height: 520px;
          background: #ffffff;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
        }
        .login-page-root .ambient-orb-2 {
          width: 440px;
          height: 440px;
          background: #b21414;
          bottom: -100px;
          right: 12%;
          opacity: 0.12;
        }

        /* Grid Pattern */
        .login-page-root .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: linear-gradient(#EFEFF1 1px, transparent 1px), linear-gradient(90deg, #EFEFF1 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Circular Container */
        .login-page-root .circle-container {
          position: relative;
          width: 550px;
          height: 550px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }

        /* Neumorphic Glass Circle using Project Colors */
        .login-page-root .glass-circle {
          position: relative;
          width: 550px;
          height: 550px;
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
        .login-page-root .glass-circle::before {
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
        .login-page-root .login-form {
          position: relative;
          width: 300px;
          z-index: 20;
        }

        /* Titles */
        .login-page-root .login-form h1 {
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

        .login-page-root .login-form .subtitle {
          text-align: center;
          color: #949599;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .3px;
          margin-bottom: 14px;
        }

        /* Alert Notification Box */
        .login-page-root .alert-box {
          background: rgba(161, 15, 15, 0.15);
          border: 1px solid rgba(161, 15, 15, 0.35);
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 11px;
          text-align: center;
          margin-bottom: 10px;
          color: #fca5a5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          line-height: 1.3;
          animation: alertFadeIn 0.3s ease;
        }

        @keyframes alertFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Recessed Neumorphic Input Box */
        .login-page-root .input-box {
          position: relative;
          margin-bottom: 11px;
        }

        .login-page-root .input-box .input-icon {
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

        .login-page-root .input-box input {
          width: 100%;
          height: 42px;
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

        .login-page-root .input-box input.has-eye {
          padding-right: 42px;
        }

        .login-page-root .input-box input::placeholder {
          color: #494F55;
          font-weight: 400;
        }

        .login-page-root .input-box input:focus {
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow:
            inset 3px 3px 6px rgba(0, 0, 0, 0.6),
            inset -2px -2px 5px rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .login-page-root .input-box input:focus + .input-icon,
        .login-page-root .input-box:focus-within .input-icon {
          color: #EFEFF1;
        }

        .login-page-root .input-box .toggle-eye {
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

        .login-page-root .input-box .toggle-eye:hover {
          color: #EFEFF1;
        }

        .login-page-root .field-error {
          font-size: 10.5px;
          color: #f87171;
          margin-top: -8px;
          margin-bottom: 8px;
          padding-left: 4px;
        }

        /* Remember Me & Forgot Password Row */
        .login-page-root .options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1px;
          margin-bottom: 14px;
        }

        .login-page-root .remember {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #949599;
          cursor: pointer;
          user-select: none;
        }

        /* Neumorphic Capsule Switch */
        .login-page-root .switch {
          position: relative;
          width: 32px;
          height: 18px;
          border-radius: 20px;
          background: #1C232B;
          border: 1px solid rgba(73, 79, 85, 0.35);
          box-shadow:
            inset 3px 3px 6px rgba(0, 0, 0, 0.5),
            inset -2px -2px 4px rgba(255, 255, 255, 0.04);
          cursor: pointer;
          flex-shrink: 0;
          transition: background .25s ease, border-color .25s ease;
        }

        .login-page-root .switch::after {
          content: "";
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #494F55;
          box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
          transition: left .25s cubic-bezier(0.4, 0, 0.2, 1), background .25s ease;
        }

        .login-page-root .switch.on {
          border-color: rgba(178, 20, 20, 0.5);
          background: #242B32;
        }

        .login-page-root .switch.on::after {
          left: 16px;
          background: #b21414;
        }

        .login-page-root .forgot-link {
          font-size: 11.5px;
          color: #949599;
          text-decoration: none;
          transition: color .2s ease;
        }

        .login-page-root .forgot-link:hover {
          color: #EFEFF1;
          text-decoration: underline;
        }

        /* Submit Button */
        .login-page-root .submit-btn {
          position: relative;
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 auto;
          overflow: hidden;
          border: none;
          outline: none;
          border-radius: 11px;
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

        .login-page-root .submit-btn::before {
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

        .login-page-root .submit-btn:hover:not(:disabled)::before {
          left: 130%;
        }

        .login-page-root .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #CBD5E1;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
        }

        .login-page-root .submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .login-page-root .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Divider */
        .login-page-root .divider-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 10px 0;
        }
        .login-page-root .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(73, 79, 85, 0.35);
        }
        .login-page-root .divider-text {
          font-size: 10px;
          color: #494F55;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Footer Links */
        .login-page-root .footer-links {
          text-align: center;
          margin-top: 10px;
          font-size: 11.5px;
          color: #949599;
        }

        .login-page-root .footer-links a.signup-link {
          color: #EFEFF1;
          font-weight: 600;
          text-decoration: none;
          transition: color .2s ease;
          margin-left: 3px;
        }

        .login-page-root .footer-links a.signup-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .login-page-root .admin-portal-link {
          text-align: center;
          margin-top: 4px;
          font-size: 10.5px;
          color: #494F55;
        }

        .login-page-root .admin-portal-link a {
          color: #949599;
          text-decoration: none;
          transition: color .2s ease;
          margin-left: 3px;
        }

        .login-page-root .admin-portal-link a:hover {
          color: #EFEFF1;
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .login-page-root {
            padding: 20px 14px;
            align-items: center;
          }
          .login-page-root .circle-container {
            width: 100%;
            max-width: 420px;
            height: auto;
            min-height: auto;
          }
          .login-page-root .glass-circle {
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
          .login-page-root .glass-circle::before {
            border-radius: 22px;
            inset: 8px;
          }
          .login-page-root .login-form {
            width: 100%;
          }
          .login-page-root .login-form h1 {
            font-size: 26px;
          }
          .login-page-root .login-form .subtitle {
            font-size: 11.5px;
            margin-bottom: 14px;
          }
          .login-page-root .input-box {
            margin-bottom: 12px;
          }
          .login-page-root .input-box input {
            height: 44px;
            font-size: 13.5px;
            padding-left: 42px;
          }
          .login-page-root .input-box .input-icon {
            left: 14px;
          }
          .login-page-root .options-row {
            margin-bottom: 14px;
          }
          .login-page-root .remember,
          .login-page-root .forgot-link {
            font-size: 11.5px;
          }
          .login-page-root .submit-btn {
            height: 44px;
            font-size: 13.5px;
          }
          .login-page-root .divider-row {
            margin: 10px 0;
          }
          .login-page-root .footer-links {
            margin-top: 12px;
            font-size: 11.5px;
          }
        }

        @media (max-width: 380px) {
          .login-page-root .glass-circle {
            padding: 24px 16px 20px;
            border-radius: 22px;
          }
          .login-page-root .glass-circle::before {
            border-radius: 18px;
            inset: 6px;
          }
          .login-page-root .login-form h1 {
            font-size: 23px;
          }
          .login-page-root .input-box input {
            font-size: 12.5px;
            padding-left: 38px;
          }
        }
      `}</style>

      {/* Ambient Background Orbs */}
      <div className="bg-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>

      {/* Subtle Grid Overlay */}
      <div className="grid-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="circle-container"
      >
        <div className="glass-circle">
          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Bot Honeypot */}
            <input
              type="text"
              {...register('website')}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ display: 'none' }}
            />

            {/* Logo Emblem */}
            <div className="flex justify-center mb-1.5">
              <Logo size="md" showText={false} asLink={false} />
            </div>

            {/* Title & Subtitle */}
            <h1>Login</h1>
            <div className="subtitle">Sign in to your account</div>

            {/* Error Notification Box */}
            {errorMessage && (
              <div className="alert-box" role="alert">
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email / Username Input */}
            <div className="input-box">
              <span className="input-icon">
                <Mail size={15} />
              </span>
              <input
                type="email"
                id="loginEmail"
                placeholder="Username or email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Enter a valid email'
                  }
                })}
              />
            </div>
            {errors.email && (
              <div className="field-error">{errors.email.message}</div>
            )}

            {/* Password Input with Eye Toggle */}
            <div className="input-box">
              <span className="input-icon">
                <Lock size={15} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="loginPassword"
                className="has-eye"
                placeholder="Password"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' }
                })}
              />
              <button
                type="button"
                className="toggle-eye"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <div className="field-error">{errors.password.message}</div>
            )}

            {/* Remember Me & Forgot Password Row */}
            <div className="options-row">
              <div
                className="remember"
                onClick={() => setRememberMe(!rememberMe)}
                role="checkbox"
                aria-checked={rememberMe}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setRememberMe(!rememberMe);
                  }
                }}
              >
                <div className={`switch ${rememberMe ? 'on' : ''}`} />
                <span>Remember me</span>
              </div>

              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              id="loginSubmitBtn"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="divider-row">
              <div className="divider-line" />
              <span className="divider-text">or</span>
              <div className="divider-line" />
            </div>

            {/* Google Authentication */}
            <GoogleAuthButton
              text="Continue with Google"
              className="!w-full !py-2 !text-xs !bg-[#1C232B] !border !border-[#494F55]/40 hover:!border-white/40 !rounded-xl shadow-none"
            />

            {/* Footer Registration Link */}
            <div className="footer-links">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="signup-link">Sign up</Link>
            </div>

            {/* Admin Portal Link */}
            <div className="admin-portal-link">
              Admin?{' '}
              <Link to="/admin-login">Go to Admin Portal</Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
