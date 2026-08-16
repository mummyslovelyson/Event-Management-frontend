import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/api/axios';

// All prices are stored in GHS. The USD toggle is a display-only conversion
// using the exchange rate set by the admin (system_settings.usd_rate).
const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('tc_currency') || 'GHS');
  const [rate, setRate] = useState(15); // GHS per 1 USD

  useEffect(() => {
    let active = true;
    api
      .get('/public/settings')
      .then((res) => {
        if (!active) return;
        const s = res.data?.settings;
        if (s && Number(s.usdRate) > 0) setRate(Number(s.usdRate));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const toggle = useCallback(() => {
    setCurrency((prev) => {
      const next = prev === 'USD' ? 'GHS' : 'USD';
      localStorage.setItem('tc_currency', next);
      return next;
    });
  }, []);

  const format = useCallback(
    (n, opts = {}) => {
      const num = Number(n || 0);
      const { compact = false, decimals } = opts;

      if (currency === 'USD') {
        const v = num / (rate > 0 ? rate : 1);
        if (compact) {
          if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
          if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
        }
        const max = decimals ?? 2;
        return `$${v.toLocaleString('en-US', { minimumFractionDigits: Math.min(max, 2), maximumFractionDigits: max })}`;
      }

      if (compact) {
        if (num >= 1e6) return `₵${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `₵${(num / 1e3).toFixed(1)}K`;
      }
      const max = decimals ?? 2;
      return `₵${num.toLocaleString('en-GH', { minimumFractionDigits: Math.min(max, 2), maximumFractionDigits: max })}`;
    },
    [currency, rate],
  );

  const value = useMemo(() => ({ currency, rate, toggle, format }), [currency, rate, toggle, format]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
