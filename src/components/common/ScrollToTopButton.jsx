import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

/**
 * Floating "scroll to top" button shown on public pages once the user
 * scrolls down. Styled to match the gold reading bar (ScrollProgressBar):
 * same #EFEFF1 gold, soft glow, and a bottom-right placement that never
 * collides with the fixed navbar.
 */
export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setVisible(window.scrollY > 400);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-to-top"
          onClick={scrollToTop}
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-[60] w-11 h-11 rounded-full bg-gradient-to-br from-white via-[#e8c75e] to-white text-[#1C232B] flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.45)] hover:bg-[#CBD5E1] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,175,55,0.6)] transition-all"
        >
          <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
