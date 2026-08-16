import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({
  size = 'md',
  showText = true,
  subtitle = 'LIVING THE MOMENT',
  href = '/',
  className = '',
  asLink = true,
}) {
  const sizeClasses = {
    sm: {
      img: 'w-8 h-8 rounded-lg',
      title: 'text-[13px] font-bold tracking-wide',
      subtitle: 'text-[9px] tracking-[0.15em]',
      gap: 'gap-2',
    },
    md: {
      img: 'w-10 h-10 rounded-xl',
      title: 'text-[15px] font-bold tracking-wide',
      subtitle: 'text-[9px] tracking-[0.2em]',
      gap: 'gap-3',
    },
    lg: {
      img: 'w-12 h-12 rounded-xl',
      title: 'text-lg font-bold tracking-wide',
      subtitle: 'text-[10px] tracking-[0.22em]',
      gap: 'gap-3.5',
    },
    xl: {
      img: 'w-16 h-16 rounded-2xl shadow-xl shadow-black/40',
      title: 'text-2xl font-black tracking-wider',
      subtitle: 'text-xs tracking-[0.25em]',
      gap: 'gap-4',
    },
  }[size] || {
    img: 'w-10 h-10 rounded-xl',
    title: 'text-[15px] font-bold tracking-wide',
    subtitle: 'text-[9px] tracking-[0.2em]',
    gap: 'gap-3',
  };

  const content = (
    <div className={`inline-flex items-center ${sizeClasses.gap} group ${className}`}>
      <img
        src="/assets/images/Logo.jpeg"
        alt="Tribes & Cliqs"
        className={`${sizeClasses.img} object-cover ring-1 ring-[#494F55]/40 group-hover:ring-[#D4AF37]/60 group-hover:scale-105 transition-all duration-300 shadow-md`}
      />
      {showText && (
        <div className="flex flex-col leading-tight text-left">
          <span className={`${sizeClasses.title} text-[#EFEFF1] group-hover:text-white transition-colors`}>
            TRIBES<span className="text-[#949599]">&amp;</span>CLIQS
          </span>
          {subtitle && (
            <span className={`${sizeClasses.subtitle} text-[#949599] uppercase font-medium`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink && href) {
    return (
      <Link to={href} className="inline-flex focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
