import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, Phone, Eye, EyeOff, Loader2,
  UserPlus, Building2, Users, MapPin, Tag, Globe, Check, AlertCircle,
  ArrowRight, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { registerUser } from '@/api/auth';
import Logo from '@/components/common/Logo';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('attendee');
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalSteps = role === 'organizer' ? 3 : 2;

  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm();
  const password = watch('password') || '';

  const handleNext = async () => {
    setErrorMessage('');
    let fieldsToValidate = [];
    if (step === 1) {
      if (role === 'attendee') {
        fieldsToValidate = ['name', 'email'];
      } else {
        fieldsToValidate = ['name', 'organizationName'];
      }
    } else if (step === 2 && role === 'organizer') {
      fieldsToValidate = ['category', 'city', 'websiteUrl', 'description'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data) => {
    setErrorMessage('');
    if (!agree) {
      setErrorMessage('Please accept the Terms of Service to continue');
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
        if (!data.organizationName?.trim() || !data.category?.trim() || !data.city?.trim() || !data.websiteUrl?.trim() || !data.description?.trim() || !data.phone?.trim()) {
          setErrorMessage('All organizer fields are mandatory: Organization Name, Category, City, Website/Social Link, Bio, and Phone.');
          toast.error('Please fill in all organizer fields');
          return;
        }
        payload.organizationName = data.organizationName.trim();
        payload.category = data.category.trim();
        payload.city = data.city.trim();
        payload.description = data.description.trim();
        payload.websiteUrl = data.websiteUrl.trim();
      }
      const res = await registerUser(payload);
      toast.success(
        res.data?.message || (data.phone
          ? `Verification code sent to ${data.phone} via SMS and email!`
          : `Verification code sent to ${data.email}!`),
        { duration: 6000 }
      );
      const regIdParam = res.data?.registrationId ? `&regId=${encodeURIComponent(res.data.registrationId)}` : '';
      const phoneParam = data.phone ? `&phone=${encodeURIComponent(data.phone)}` : '';
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}${phoneParam}${regIdParam}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page-root">
      <style>{`
        .register-page-root {
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
        .register-page-root .bg-ambient {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .register-page-root .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .register-page-root .ambient-orb-1 {
          width: 550px;
          height: 550px;
          background: #ffffff;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
        }
        .register-page-root .ambient-orb-2 {
          width: 460px;
          height: 460px;
          background: #b21414;
          bottom: -100px;
          right: 10%;
          opacity: 0.12;
        }

        /* Grid Pattern */
        .register-page-root .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: linear-gradient(#EFEFF1 1px, transparent 1px), linear-gradient(90deg, #EFEFF1 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* Circular Container - Expanded */
        .register-page-root .circle-container {
          position: relative;
          width: 570px;
          height: 570px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
        }

        .register-page-root .glass-circle {
          position: relative;
          width: 570px;
          height: 570px;
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
        }

        /* Inner Ring with Depth */
        .register-page-root .glass-circle::before {
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

        /* Form Container */
        .register-page-root .form-inner {
          position: relative;
          width: 310px;
          z-index: 20;
        }

        /* Titles */
        .register-page-root h1 {
          color: #EFEFF1;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: .5px;
          margin-bottom: 2px;
          text-align: center;
          text-shadow:
            1px 1px 2px rgba(0, 0, 0, 0.8),
            -1px -1px 1px rgba(255, 255, 255, 0.06);
        }

        .register-page-root .subtitle {
          text-align: center;
          color: #949599;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: .3px;
          margin-bottom: 10px;
        }

        /* Step Progress Indicator */
        .register-page-root .step-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 14px;
        }

        .register-page-root .step-bar {
          height: 3.5px;
          border-radius: 4px;
          background: #242B32;
          transition: all 0.3s ease;
        }

        .register-page-root .step-bar.active {
          width: 32px;
          background: #EFEFF1;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
        }

        .register-page-root .step-bar.inactive {
          width: 18px;
          background: #333C45;
        }

        .register-page-root .step-bar.completed {
          width: 18px;
          background: #b21414;
        }

        /* Role Switch Pills */
        .register-page-root .role-pills {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          padding: 3px;
          border-radius: 11px;
          background: #1C232B;
          border: 1px solid rgba(73, 79, 85, 0.35);
          box-shadow:
            inset 2px 2px 5px rgba(0, 0, 0, 0.45),
            inset -2px -2px 5px rgba(255, 255, 255, 0.02);
          margin-bottom: 14px;
        }

        .register-page-root .role-pill-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 4px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background .25s ease, color .25s ease, box-shadow .25s ease;
          background: transparent;
          color: #949599;
        }

        .register-page-root .role-pill-btn.active {
          background: #EFEFF1;
          color: #1C232B;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        /* Alert Notification Box */
        .register-page-root .alert-box {
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
        .register-page-root .input-box {
          position: relative;
          margin-bottom: 11px;
        }

        .register-page-root .input-box .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #949599;
          z-index: 2;
          pointer-events: none;
          transition: color .25s ease;
          display: flex;
          align-items: center;
        }

        .register-page-root .input-box input,
        .register-page-root .input-box select,
        .register-page-root .input-box textarea {
          width: 100%;
          height: 42px;
          padding: 0 14px 0 40px;
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

        .register-page-root .input-box input.has-eye {
          padding-right: 40px;
        }

        .register-page-root .input-box input::placeholder,
        .register-page-root .input-box textarea::placeholder {
          color: #494F55;
          font-weight: 400;
        }

        .register-page-root .input-box input:focus,
        .register-page-root .input-box select:focus,
        .register-page-root .input-box textarea:focus {
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow:
            inset 3px 3px 6px rgba(0, 0, 0, 0.6),
            inset -2px -2px 5px rgba(255, 255, 255, 0.05),
            0 0 0 1px rgba(255, 255, 255, 0.15);
        }

        .register-page-root .input-box input:focus + .input-icon,
        .register-page-root .input-box:focus-within .input-icon {
          color: #EFEFF1;
        }

        .register-page-root .input-box .toggle-eye {
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

        .register-page-root .input-box .toggle-eye:hover {
          color: #EFEFF1;
        }

        .register-page-root .field-error {
          font-size: 10px;
          color: #f87171;
          margin-top: -8px;
          margin-bottom: 8px;
          padding-left: 4px;
        }

        /* Terms Checkbox */
        .register-page-root .terms-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 6px 0 12px 2px;
          cursor: pointer;
          user-select: none;
        }

        .register-page-root .terms-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          background: #1C232B;
          border: 1px solid rgba(73, 79, 85, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          transition: background .2s ease, border-color .2s ease;
        }

        .register-page-root .terms-checkbox.checked {
          background: #b21414;
          border-color: #b21414;
        }

        .register-page-root .terms-text {
          font-size: 10.5px;
          color: #949599;
          line-height: 1.35;
        }

        .register-page-root .terms-text a {
          color: #EFEFF1;
          text-decoration: underline;
        }

        /* Action Buttons */
        .register-page-root .actions-row {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }

        .register-page-root .submit-btn {
          position: relative;
          width: 100%;
          height: 42px;
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

        .register-page-root .submit-btn::before {
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

        .register-page-root .submit-btn:hover:not(:disabled)::before {
          left: 130%;
        }

        .register-page-root .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: #CBD5E1;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
        }

        .register-page-root .submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }

        .register-page-root .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .register-page-root .back-step-btn {
          height: 42px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid rgba(73, 79, 85, 0.4);
          outline: none;
          border-radius: 11px;
          cursor: pointer;
          background: #1C232B;
          color: #949599;
          font-size: 13px;
          font-weight: 500;
          transition: color .2s ease, border-color .2s ease;
        }

        .register-page-root .back-step-btn:hover {
          color: #EFEFF1;
          border-color: rgba(255, 255, 255, 0.3);
        }

        /* Divider */
        .register-page-root .divider-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 10px 0;
        }
        .register-page-root .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(73, 79, 85, 0.35);
        }
        .register-page-root .divider-text {
          font-size: 10px;
          color: #494F55;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Footer Links */
        .register-page-root .footer-links {
          text-align: center;
          margin-top: 10px;
          font-size: 11.5px;
          color: #949599;
        }

        .register-page-root .footer-links a {
          color: #EFEFF1;
          font-weight: 600;
          text-decoration: none;
          transition: color .2s ease;
          margin-left: 3px;
        }

        .register-page-root .footer-links a:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        /* =========================================
           MOBILE RESPONSIVE VIEW (<640px)
           ========================================= */
        @media (max-width: 640px) {
          .register-page-root {
            padding: 20px 14px;
            align-items: center;
          }
          .register-page-root .circle-container {
            width: 100%;
            max-width: 420px;
            height: auto;
            min-height: auto;
          }
          .register-page-root .glass-circle {
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
          .register-page-root .glass-circle::before {
            border-radius: 22px;
            inset: 8px;
          }
          .register-page-root .form-inner {
            width: 100%;
          }
          .register-page-root h1 {
            font-size: 26px;
          }
          .register-page-root .subtitle {
            font-size: 11.5px;
            margin-bottom: 12px;
          }
          .register-page-root .input-box {
            margin-bottom: 12px;
          }
          .register-page-root .input-box input,
          .register-page-root .input-box select {
            height: 44px;
            font-size: 13.5px;
            padding-left: 42px;
          }
          .register-page-root .submit-btn,
          .register-page-root .back-step-btn {
            height: 44px;
            font-size: 13.5px;
          }
        }

        @media (max-width: 380px) {
          .register-page-root .glass-circle {
            padding: 24px 16px 20px;
            border-radius: 22px;
          }
          .register-page-root .glass-circle::before {
            border-radius: 18px;
            inset: 6px;
          }
          .register-page-root h1 {
            font-size: 23px;
          }
          .register-page-root .input-box input {
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

      {/* Grid Pattern Overlay */}
      <div className="grid-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="circle-container"
      >
        <div className="glass-circle">
          <div className="form-inner">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Honeypot */}
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

              <h1>Create Account</h1>
              <div className="subtitle">
                {step === 1 && (role === 'organizer' ? 'Organization basics' : 'Account details')}
                {step === 2 && (role === 'organizer' ? 'Organization profile' : 'Security & contact')}
                {step === 3 && 'Security & credentials'}
              </div>

              {/* Step Progress Bar */}
              <div className="step-progress">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`step-bar ${
                      step === i + 1 ? 'active' : step > i + 1 ? 'completed' : 'inactive'
                    }`}
                  />
                ))}
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="alert-box" role="alert">
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Animated Step Carousel */}
              <AnimatePresence mode="wait">
                {/* ================= STEP 1 ================= */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Role Selection Pills */}
                    <div className="role-pills">
                      <button
                        type="button"
                        onClick={() => { setRole('attendee'); setStep(1); }}
                        className={`role-pill-btn ${role === 'attendee' ? 'active' : ''}`}
                      >
                        <Users size={13} /> Attendee
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRole('organizer'); setStep(1); }}
                        className={`role-pill-btn ${role === 'organizer' ? 'active' : ''}`}
                      >
                        <Building2 size={13} /> Organizer
                      </button>
                    </div>

                    {/* Attendee Step 1 Fields */}
                    {role === 'attendee' ? (
                      <>
                        <div className="input-box">
                          <span className="input-icon"><User size={15} /></span>
                          <input
                            type="text"
                            placeholder="Full Name *"
                            autoComplete="name"
                            {...register('name', { required: 'Full name is required' })}
                          />
                        </div>
                        {errors.name && <div className="field-error">{errors.name.message}</div>}

                        <div className="input-box">
                          <span className="input-icon"><Mail size={15} /></span>
                          <input
                            type="email"
                            placeholder="Email address *"
                            autoComplete="email"
                            {...register('email', {
                              required: 'Email is required',
                              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }
                            })}
                          />
                        </div>
                        {errors.email && <div className="field-error">{errors.email.message}</div>}
                      </>
                    ) : (
                      /* Organizer Step 1 Fields */
                      <>
                        <div className="input-box">
                          <span className="input-icon"><User size={15} /></span>
                          <input
                            type="text"
                            placeholder="Contact Person Full Name *"
                            autoComplete="name"
                            {...register('name', { required: 'Contact name is required' })}
                          />
                        </div>
                        {errors.name && <div className="field-error">{errors.name.message}</div>}

                        <div className="input-box">
                          <span className="input-icon"><Building2 size={15} /></span>
                          <input
                            type="text"
                            placeholder="Organization / Brand Name *"
                            {...register('organizationName', { required: 'Organization name is required' })}
                          />
                        </div>
                        {errors.organizationName && <div className="field-error">{errors.organizationName.message}</div>}
                      </>
                    )}

                    {/* Step 1 Action */}
                    <button
                      type="button"
                      onClick={handleNext}
                      className="submit-btn"
                    >
                      <span>Continue</span>
                      <ArrowRight size={14} />
                    </button>

                    {/* Social Login option on Step 1 */}
                    <div className="divider-row">
                      <div className="divider-line" />
                      <span className="divider-text">or</span>
                      <div className="divider-line" />
                    </div>

                    <GoogleAuthButton
                      role={role}
                      organizerData={{
                        organizationName: watch('organizationName'),
                        category: watch('category'),
                        city: watch('city'),
                        phone: watch('phone'),
                      }}
                      text="Continue with Google"
                      className="!w-full !py-2 !text-xs !bg-[#1C232B] !border !border-[#494F55]/40 hover:!border-white/40 !rounded-xl shadow-none"
                    />
                  </motion.div>
                )}

                {/* ================= STEP 2 (ORGANIZER DETAILS) ================= */}
                {step === 2 && role === 'organizer' && (
                  <motion.div
                    key="step-2-organizer"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="input-box">
                      <span className="input-icon"><Tag size={15} /></span>
                      <select {...register('category', { required: 'Please select category' })}>
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

                    <div className="input-box">
                      <span className="input-icon"><MapPin size={15} /></span>
                      <input
                        type="text"
                        placeholder="City / Location *"
                        {...register('city', { required: 'City is required' })}
                      />
                    </div>
                    {errors.city && <div className="field-error">{errors.city.message}</div>}

                    <div className="input-box">
                      <span className="input-icon"><Globe size={15} /></span>
                      <input
                        type="text"
                        placeholder="Website or Social link *"
                        {...register('websiteUrl', { required: 'Website or social link is required' })}
                      />
                    </div>
                    {errors.websiteUrl && <div className="field-error">{errors.websiteUrl.message}</div>}

                    <div className="input-box" style={{ height: 'auto', minHeight: '68px', padding: '8px 12px' }}>
                      <textarea
                        placeholder="Organization Bio & Event Scope *"
                        rows={2}
                        className="w-full bg-transparent text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none resize-none"
                        {...register('description', {
                          required: 'Organization bio and event scope is required',
                          minLength: { value: 10, message: 'Please provide at least 10 characters' }
                        })}
                      />
                    </div>
                    {errors.description && <div className="field-error">{errors.description.message}</div>}

                    <div className="actions-row">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="back-step-btn"
                      >
                        <ArrowLeft size={14} /> Back
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="submit-btn"
                      >
                        <span>Next</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ================= FINAL STEP (CONTACT & CREDENTIALS) ================= */}
                {((step === 2 && role === 'attendee') || (step === 3 && role === 'organizer')) && (
                  <motion.div
                    key="step-final"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* For organizer on step 3, prompt for email since step 1 had org name */}
                    {role === 'organizer' && (
                      <>
                        <div className="input-box">
                          <span className="input-icon"><Mail size={15} /></span>
                          <input
                            type="email"
                            placeholder="Email address *"
                            autoComplete="email"
                            {...register('email', {
                              required: 'Email is required',
                              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }
                            })}
                          />
                        </div>
                        {errors.email && <div className="field-error">{errors.email.message}</div>}
                      </>
                    )}

                    <div className="input-box">
                      <span className="input-icon"><Phone size={15} /></span>
                      <input
                        type="tel"
                        placeholder="Phone number *"
                        autoComplete="tel"
                        {...register('phone', { required: 'Phone is required' })}
                      />
                    </div>
                    {errors.phone && <div className="field-error">{errors.phone.message}</div>}

                    <div className="input-box">
                      <span className="input-icon"><Lock size={15} /></span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="has-eye"
                        placeholder="Password (min 8 chars) *"
                        autoComplete="new-password"
                        {...register('password', {
                          required: 'Password is required',
                          validate: {
                            length: (v) => v.length >= 8 || 'Min 8 characters',
                            letter: (v) => /[a-zA-Z]/.test(v) || 'Needs a letter',
                            number: (v) => /\d/.test(v) || 'Needs a number',
                          },
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
                    {errors.password && <div className="field-error">{errors.password.message}</div>}

                    <div className="input-box">
                      <span className="input-icon"><Lock size={15} /></span>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        className="has-eye"
                        placeholder="Confirm password *"
                        autoComplete="new-password"
                        {...register('confirmPassword', {
                          required: 'Confirm password',
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
                    {errors.confirmPassword && <div className="field-error">{errors.confirmPassword.message}</div>}

                    {/* Terms Checkbox */}
                    <div
                      className="terms-row"
                      onClick={() => setAgree(!agree)}
                      role="checkbox"
                      aria-checked={agree}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setAgree(!agree);
                        }
                      }}
                    >
                      <div className={`terms-checkbox ${agree ? 'checked' : ''}`}>
                        {agree && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="terms-text">
                        I agree to the{' '}
                        <Link to="/terms" onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer">
                          Terms
                        </Link>{' '}
                        &amp;{' '}
                        <Link to="/privacy" onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer">
                          Privacy
                        </Link>
                      </span>
                    </div>

                    {/* Submit & Back Actions */}
                    <div className="actions-row">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="back-step-btn"
                        disabled={submitting}
                      >
                        <ArrowLeft size={14} /> Back
                      </button>
                      <button
                        type="submit"
                        id="registerSubmitBtn"
                        className="submit-btn"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={15} />
                            <span>Create</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer Links */}
              <div className="footer-links">
                Already have an account?{' '}
                <Link to="/login">Sign in</Link>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
