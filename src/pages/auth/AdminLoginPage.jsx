import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      const user = await adminLogin(data.email, data.password, data.website);
      if (user.role !== 'admin') {
        toast.error('Access denied. Admin credentials required.');
        return;
      }
      toast.success('Welcome to the Administration Portal');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid admin credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#1E252B] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#D4AF37]/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/3 blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#F2F4F5 1px, transparent 1px), linear-gradient(90deg, #F2F4F5 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl bg-[#161D22] border border-[#494F55]/40 shadow-2xl shadow-black/50 p-6 sm:p-8">
          {/* Shield icon */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/5 items-center justify-center mb-4 border border-[#D4AF37]/30">
              <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-[#F2F4F5] tracking-tight">Administration Portal</h1>
            <p className="mt-1.5 text-sm text-[#7D8387]">Tribes & Cliqs Admin</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="text" {...register('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7D8387] mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                <input
                  type="email"
                  placeholder="admin@tribesandcliqs.com"
                  autoComplete="username"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                  })}
                  className={`w-full pl-10 pr-3 py-3 rounded-lg bg-[#1E252B] border text-sm text-[#F2F4F5] placeholder:text-[#494F55] focus:outline-none transition-colors ${
                    errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-[#494F55]/40 focus:border-[#D4AF37]/50'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7D8387] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                  className={`w-full pl-10 pr-10 py-3 rounded-lg bg-[#1E252B] border text-sm text-[#F2F4F5] placeholder:text-[#494F55] focus:outline-none transition-colors ${
                    errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-[#494F55]/40 focus:border-[#D4AF37]/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#494F55] hover:text-[#7D8387] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : <><ShieldCheck className="w-4 h-4" /> Secure Admin Login</>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#7D8387]">
            Not an admin?{' '}
            <Link to="/login" className="text-[#D4AF37] font-semibold hover:underline">Back to regular login</Link>
          </p>
        </div>

        {/* Restricted area notice */}
        <div className="mt-5 rounded-xl bg-[#1E252B]/60 border border-[#494F55]/30 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
          <p className="text-xs text-[#7D8387] leading-relaxed">
            This is a restricted area. Unauthorized access is prohibited. All activities are monitored and logged.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
