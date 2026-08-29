import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/common/Logo';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      const user = await login(data.email, data.password, data.website);
      toast.success(`Welcome back, ${user.name || user.email}! 👋`, { duration: 4000 });
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
      toast.error(err.friendlyMessage || err.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#1C232B] flex items-center justify-center px-4 py-12">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/10 blur-3xl" />
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
            <h1 className="text-2xl font-bold text-[#EFEFF1]">Welcome Back</h1>
            <p className="mt-1 text-sm text-[#949599]">Sign in to your Tribes &amp; Cliqs account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="text" {...register('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                <input
                  type="email"
                  placeholder="Email address"
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#949599]">Password</label>
                <Link to="/forgot-password" className="text-xs text-white hover:underline">Forgot Password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required', minLength: { value: 10, message: 'Min 10 characters' } })}
                  className={`w-full pl-10 pr-10 py-3 rounded-lg bg-[#1C232B] border text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none transition-colors ${
                    errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-[#494F55]/40 focus:border-white/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#494F55] hover:text-[#949599] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <><LogIn className="w-4 h-4" /> Sign In</>}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#494F55]/30" />
            <span className="text-xs text-[#494F55] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#494F55]/30" />
          </div>

          {/* Social login */}
          <GoogleAuthButton text="Continue with Google" />

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-[#949599]">
            Don't have an account?{' '}
            <Link to="/register" className="text-white font-semibold hover:underline">Sign up</Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-[#494F55] flex items-center justify-center gap-1">
          <Info className="w-3.5 h-3.5 shrink-0" /> Admin?{' '}
          <Link to="/admin-login" className="text-white font-semibold hover:underline">Use the separate admin portal</Link>
        </p>
      </motion.div>
    </div>
  );
}
