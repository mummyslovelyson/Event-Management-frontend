import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, ShieldCheck, Mail, Clock } from 'lucide-react';
import Logo from '@/components/common/Logo';

export default function MaintenancePage({ message = '' } = {}) {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/maintenance`);
      const data = await res.json();
      if (!data.maintenance) {
        window.location.reload();
      } else {
        setTimeout(() => setChecking(false), 500);
      }
    } catch {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C232B] text-[#EFEFF1] flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Top logo */}
      <div className="pt-6">
        <Logo size="lg" asLink={false} />
      </div>

      {/* Center card */}
      <div className="max-w-lg w-full rounded-3xl bg-[#161D22] border border-[#262B2F] p-8 sm:p-10 text-center shadow-2xl relative z-10 my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-3">
          Scheduled Maintenance
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1] tracking-tight">
          We'll Be Right Back
        </h1>

        <p className="mt-4 text-sm sm:text-base text-[#949599] leading-relaxed">
          {message || 'We are currently performing routine upgrades and improvements to ensure the best ticketing experience for you.'}
        </p>

        <div className="mt-8 pt-6 border-t border-[#262B2F] flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-md active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Status...' : 'Check If We\'re Back'}
          </button>
        </div>
      </div>

      {/* Footer & Admin Bypass */}
      <div className="text-center text-xs text-[#949599] pb-4 space-y-2 relative z-10">
        <p className="flex items-center justify-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Need urgent assistance? Contact{' '}
          <a href="mailto:support@tribesandcliqs.com" className="text-white hover:underline">
            support@tribesandcliqs.com
          </a>
        </p>
        <div className="pt-2">
          <Link
            to="/admin-login"
            className="inline-flex items-center gap-1 text-[11px] text-[#494F55] hover:text-[#949599] transition"
          >
            <ShieldCheck className="w-3 h-3" /> Staff / Admin Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
