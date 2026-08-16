import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Thin gold reading bar pinned to the top of the viewport.
 *
 * Uses a plain scroll listener (rAF-throttled) rather than framer's
 * native ScrollTimeline path: framer caches the timeline per container
 * at module level, and a timeline created while the document isn't yet
 * scrollable reports `null` forever — leaving the bar stuck at 0%.
 * A JS listener is deterministic and matches the hero parallax.
 *
 * The fill tracks scroll with a spring (slight lag for a tactile feel)
 * and fades in after the first few percent so the top of a page stays
 * clean. Never intercepts clicks.
 */
export default function ScrollProgressBar() {
  const progress = useMotionValue(0);
  const scaleX = useSpring(progress, { stiffness: 160, damping: 30, restDelta: 0.001 });
  const opacity = useTransform(progress, [0, 0.04, 1], [0, 1, 1]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      progress.set(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
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
  }, [progress]);

  return (
    <div className="fixed top-0 inset-x-0 h-[3px] z-[60] pointer-events-none bg-[#D4AF37]/10">
      <motion.div
        style={{ scaleX, opacity }}
        className="h-full origin-left bg-gradient-to-r from-[#D4AF37] via-[#e8c75e] to-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.7)]"
      />
    </div>
  );
}
