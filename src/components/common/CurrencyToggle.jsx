import { useCurrency } from '@/context/CurrencyContext';

export default function CurrencyToggle({ className = '' }) {
  const { currency, toggle } = useCurrency();

  return (
    <button
      type="button"
      onClick={toggle}
      title="Switch between GHS and USD display"
      aria-label="Switch currency"
      className={`inline-flex items-center rounded-lg border border-[#262B2F] bg-[#171A1D] overflow-hidden shrink-0 ${className}`}
    >
      <span
        className={`flex-1 text-center px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          currency === 'GHS' ? 'bg-[#D4AF37] text-[#1E252B]' : 'text-[#8A9196] hover:text-[#EDF0F1]'
        }`}
      >
        ₵
      </span>
      <span
        className={`flex-1 text-center px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          currency === 'USD' ? 'bg-[#D4AF37] text-[#1E252B]' : 'text-[#8A9196] hover:text-[#EDF0F1]'
        }`}
      >
        $
      </span>
    </button>
  );
}
