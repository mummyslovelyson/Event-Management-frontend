import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Animates the displayed value from 0 to its final number when it looks
// numeric ("₵1,234.50", "1,234", "12.5%"). Non-numeric values render as-is.
function useCountUp(raw) {
  const ref = useRef(null);
  const rawRef = useRef(raw);
  rawRef.current = raw;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = String(rawRef.current ?? '').match(/^([₵$€£])?([\d,]+(?:\.\d+)?)(%)?$/);
    if (!m) {
      el.textContent = String(rawRef.current ?? '');
      return;
    }
    const prefix = m[1] || '';
    const suffix = m[3] || '';
    const decimals = (m[2].split('.')[1] || '').length;
    const target = parseFloat(m[2].replace(/,/g, ''));
    if (Number.isNaN(target)) {
      el.textContent = String(rawRef.current ?? '');
      return;
    }
    const start = performance.now();
    const duration = 850;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = `${prefix}${val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return ref;
}

export default function StatCard({ icon: Icon, label, value, trend, trendLabel, accent = false }) {
  const isPositive = typeof trend === 'number' ? trend >= 0 : true;
  const valueRef = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className={`relative rounded-xl p-5 border ${
        accent
          ? 'bg-gradient-to-br from-[#1A1D20] to-[#15181A] border-[#D4AF37]/25'
          : 'bg-[#171A1D] border-[#262B2F] hover:border-[#3A4045] transition-colors'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-[#949599] leading-snug">{label}</p>
        {Icon && <Icon className={`shrink-0 w-4 h-4 ${accent ? 'text-[#D4AF37]' : 'text-[#5A6166]'}`} />}
      </div>
      <p
        ref={valueRef}
        className={`mt-2 text-[30px] font-semibold tracking-tight leading-none tabular-nums ${
          accent ? 'text-[#D4AF37]' : 'text-[#EFEFF1]'
        }`}
      >
        {value}
      </p>
      {(typeof trend === 'number' || trendLabel) && (
        <div className="mt-3 flex items-center gap-1.5">
          {typeof trend === 'number' && (
            <span className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isPositive ? '+' : ''}
              {trend}%
            </span>
          )}
          {trendLabel && <span className="text-xs text-[#5A6166]">{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
