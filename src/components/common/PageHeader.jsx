// Editorial page header used across the admin and organizer portals.
// Brand-wide, every section uses the same gold accent so the UI stays
// unified (the accent prop is kept for compatibility but always resolves
// to gold).
import { motion } from 'framer-motion';

const GOLD = '#D4AF37';

const ACCENTS = {
  gold: GOLD,
  blue: GOLD,
  emerald: GOLD,
  violet: GOLD,
  teal: GOLD,
  rose: GOLD,
  sky: GOLD,
  amber: GOLD,
  slate: GOLD,
};

export default function PageHeader({ title, subtitle, count, icon: Icon, accent = 'gold', actions }) {
  const color = ACCENTS[accent] || ACCENTS.gold;

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div className="flex items-start gap-3.5 min-w-0">
        {Icon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            whileHover={{ scale: 1.08, rotate: 4 }}
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-default"
            style={{ backgroundColor: `${color}1F`, color }}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
        )}
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
            className="flex items-center gap-2.5"
          >
            <h1 className="text-xl font-semibold tracking-tight text-[#EDF0F1] truncate">{title}</h1>
            {count !== undefined && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.15 }}
                className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium text-[#8A9196] bg-[#262B2F]"
              >
                {count.toLocaleString()}
              </motion.span>
            )}
          </motion.div>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.3 }}
              className="mt-1 text-sm text-[#8A9196]"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
