import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/common/Logo';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [statusError, setStatusError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setStatusError('');
    try {
      const user = await adminLogin(data.email, data.password, data.website);
      if (!['admin', 'system_admin', 'superadmin', 'staff'].includes(user.role)) {
        const errMsg = 'Access denied. Admin credentials required.';
        setStatusError(errMsg);
        toast.error(errMsg);
        return;
      }
      toast.success(`Welcome back, ${user.name || 'Administrator'}!`, { duration: 4000 });
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const msg = err.friendlyMessage || err.response?.data?.message || 'Invalid admin credentials';
      setStatusError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <style>{`
        .admin-login-wrapper {
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
        .admin-login-wrapper .bg-ambient {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .admin-login-wrapper .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .admin-login-wrapper .ambient-orb-1 {
          width: 500px;
          height: 500px;
          background: #ffffff;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
        }
        .admin-login-wrapper .ambient-orb-2 {
          width: 400px;
          height: 400px;
          background: #b21414;
          bottom: -80px;
          right: 15%;
          opacity: 0.12;
        }

        /* Grid Pattern */
        .admin-login-wrapper .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: linear-gradient(#EFEFF1 1px, transparent 1px), linear-gradient(90deg, #EFEFF1 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Circular Container */
        .admin-login-wrapper .circle-container {
          position: relative;
          width: 530px;
          height: 530px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }

        /* Neumorphic Glass Circle using Project Colors */
        .admin-login-wrapper .glass-circle {
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
        .admin-login-wrapper .glass-circle::before {
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
        .admin-login-wrapper .login-form {
          position: relative;
          width: 300px;
          z-index: 20;
        }

        /* Titles */
        .admin-login-wrapper .login-form h1 {
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

        .admin-login-wrapper .login-form .subtitle {
          text-align: center;
          color: #949599;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .3px;
          margin-bottom: 22px;
        }

        /* Alert Notification Box */
        .admin-login-wrapper .alert-box {
          background: rgba(161, 15, 15, 0.15);
          border: 1px solid rgba(161, 15, 15, 0.35);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 11.5px;
          text-align: center;
          margin-bottom: 14px;
          color: #fca5a5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          line-height: 1.35;
          animation: alertFadeIn 0.3s ease;
        }

        @keyframes alertFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Recessed Neumorphic Input Box */
        .admin-login-wrapper .input-box {
          position: relative;
          margin-bottom: 16px;
        }

        .admin-login-wrapper .input-box .input-icon {
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

        .admin-login-wrapper .input-box input {
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

        .admin-login-wrapper .input-box input.has-eye {
          padding-right: 44px;
        }

        .admin-login-wrapper .input-box input::placeholder {
          color: #494F55;
          font-weight: 400;
        }

        .admin-login-wrapper .input-box input:focus {
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow:
            inset 3px 3px 6px rgba(0, 0, 0, 0.6),
            inset -2px -2px 5px rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .admin-login-wrapper .input-box input:focus + .input-icon,
        .admin-login-wrapper .input-box:focus-within .input-icon {
          color: #EFEFF1;
        }

        .admin-login-wrapper .input-box .toggle-eye {
          position: absolute;
          right: 14px;
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

        .admin-login-wrapper .input-box .toggle-eye:hover {
          color: #EFEFF1;
        }

        .admin-login-wrapper .field-error {
          font-size: 11px;
          color: #f87171;
          margin-top: -10px;
          margin-bottom: 12px;
          padding-left: 4px;
        }

        /* Remember Me Row (Without Forgot Password) */
        .admin-login-wrapper .options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: -2px;
          margin-bottom: 22px;
        }

        .admin-login-wrapper .remember {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: #949599;
          cursor: pointer;
          user-select: none;
        }

        /* Neumorphic Capsule Switch */
        .admin-login-wrapper .switch {
          position: relative;
          width: 34px;
          height: 19px;
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

        .admin-login-wrapper .switch::after {
          content: "";
          position: absolute;
          top: 2px;
          left: 2px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #494F55;
          box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
          transition: left .25s cubic-bezier(0.4, 0, 0.2, 1), background .25s ease;
        }

        .admin-login-wrapper .switch.on {
          border-color: rgba(178, 20, 20, 0.5);
          background: #242B32;
        }

        .admin-login-wrapper .switch.on::after {
          left: 17px;
          background: #b21414;
        }

        /* Submit Button */
        .admin-login-wrapper .submit-btn {
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
          font-size: 14.5px;
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

        /* Sheen sweep animation */
        .admin-login-wrapper .submit-btn::before {
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

        .admin-login-wrapper .submit-btn:hover:not(:disabled)::before {
          left: 130%;
        }

        .admin-login-wrapper .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #CBD5E1;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
        }

        .admin-login-wrapper .submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .admin-login-wrapper .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Bottom Link */
        .admin-login-wrapper .footer-link {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #949599;
        }

        .admin-login-wrapper .footer-link a {
          color: #EFEFF1;
          font-weight: 600;
          text-decoration: none;
          transition: color .2s ease;
          margin-left: 4px;
        }

        .admin-login-wrapper .footer-link a:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        /* Responsive Breakpoints */
        @media (max-width: 640px) {
          .admin-login-wrapper {
            padding: 20px 14px;
            align-items: center;
          }
          .admin-login-wrapper .circle-container {
            width: 100%;
            max-width: 420px;
            height: auto;
            min-height: auto;
          }
          .admin-login-wrapper .glass-circle {
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
          .admin-login-wrapper .glass-circle::before {
            border-radius: 22px;
            inset: 8px;
          }
          .admin-login-wrapper .login-form {
            width: 100%;
          }
          .admin-login-wrapper .login-form h1 {
            font-size: 26px;
          }
          .admin-login-wrapper .login-form .subtitle {
            font-size: 11.5px;
            margin-bottom: 16px;
          }
          .admin-login-wrapper .input-box {
            margin-bottom: 14px;
          }
          .admin-login-wrapper .input-box input {
            height: 44px;
            font-size: 13.5px;
            padding-left: 42px;
          }
          .admin-login-wrapper .input-box .input-icon {
            left: 14px;
          }
          .admin-login-wrapper .options-row {
            margin-bottom: 18px;
          }
          .admin-login-wrapper .remember {
            font-size: 11.5px;
          }
          .admin-login-wrapper .submit-btn {
            height: 44px;
            font-size: 13.5px;
          }
          .admin-login-wrapper .footer-link {
            margin-top: 16px;
          }
        }

        @media (max-width: 380px) {
          .admin-login-wrapper .glass-circle {
            padding: 24px 16px 20px;
            border-radius: 22px;
          }
          .admin-login-wrapper .glass-circle::before {
            border-radius: 18px;
            inset: 6px;
          }
          .admin-login-wrapper .login-form h1 {
            font-size: 23px;
          }
          .admin-login-wrapper .input-box input {
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

      {/* Grid pattern */}
      <div className="grid-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="circle-container"
      >
        <div className="glass-circle">
          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Honeypot for bot filtering */}
            <input
              type="text"
              {...register('website')}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ display: 'none' }}
            />

            {/* Logo Emblem on Top */}
            <div className="flex justify-center mb-3">
              <Logo size="md" showText={false} asLink={false} />
            </div>

            {/* Heading & Subtitle */}
            <h1>Login</h1>
            <div className="subtitle">Sign in to your account</div>

            {/* Status Alert */}
            {statusError && (
              <div className="alert-box" role="alert">
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{statusError}</span>
              </div>
            )}

            {/* Username / Email Input */}
            <div className="input-box">
              <span className="input-icon">
                <Mail size={16} />
              </span>
              <input
                type="email"
                id="adminEmail"
                placeholder="Username or email"
                autoComplete="username"
                {...register('email', {
                  required: 'Email or username is required',
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

            {/* Password Input with Visibility Toggle */}
            <div className="input-box">
              <span className="input-icon">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="adminPassword"
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
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <div className="field-error">{errors.password.message}</div>
            )}

            {/* Remember Me & Secure Portal Indicator (No Forgot Password) */}
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="adminSignInBtn"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            {/* Footer Back to User Login */}
            <div className="footer-link">
              Not an admin?{' '}
              <Link to="/login">User Login</Link>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
