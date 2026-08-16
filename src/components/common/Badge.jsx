const variants = {
  success: 'bg-emerald-500/10 text-emerald-400',
  error: 'bg-red-500/10 text-red-400',
  danger: 'bg-red-500/10 text-red-400',
  warning: 'bg-amber-500/10 text-amber-400',
  pending: 'bg-amber-500/10 text-amber-400',
  info: 'bg-blue-500/10 text-blue-400',
  neutral: 'bg-[#2A2F33] text-[#949599]',
  gold: 'bg-white/10 text-white',
  default: 'bg-[#2A2F33] text-[#949599]',
};

export default function Badge({ variant = 'default', children, icon: CustomIcon, size = 'md', dot = false, className = '' }) {
  const classes = variants[variant] || variants.default;

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizes[size]} ${classes} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />}
      {CustomIcon && <CustomIcon className="w-3.5 h-3.5 mr-1.5" />}
      {children}
    </span>
  );
}
