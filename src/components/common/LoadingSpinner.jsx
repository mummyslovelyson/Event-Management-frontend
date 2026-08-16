import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', label, fullScreen = false, className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizes[size]} text-[#D4AF37] animate-spin`} />
      {label && <p className="text-sm text-[#949599]">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C232B]">
        {content}
      </div>
    );
  }

  return content;
}
