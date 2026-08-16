import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, siblingCount = 1 }) {
  if (!totalPages || totalPages <= 1) return null;

  const range = [];
  const left = Math.max(2, currentPage - siblingCount);
  const right = Math.min(totalPages - 1, currentPage + siblingCount);

  range.push(1);
  if (left > 2) range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < totalPages - 1) range.push('...');
  if (totalPages > 1) range.push(totalPages);

  const go = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) onPageChange(page);
  };

  const btnBase =
    'min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center select-none';

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => go(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${btnBase} text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] disabled:opacity-30 disabled:cursor-not-allowed border border-[#262B2F]`}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </motion.button>

      {range.map((item, idx) =>
        item === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-[#5A6166] text-sm">
            …
          </span>
        ) : (
          <motion.button
            key={item}
            whileTap={{ scale: 0.92 }}
            onClick={() => go(item)}
            className={`${btnBase} border ${
              item === currentPage
                ? 'bg-[#D4AF37] text-[#1C232B] border-[#D4AF37]'
                : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] border-[#262B2F]'
            }`}
          >
            {item}
          </motion.button>
        )
      )}

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => go(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${btnBase} text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] disabled:opacity-30 disabled:cursor-not-allowed border border-[#262B2F]`}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </motion.button>
    </nav>
  );
}
