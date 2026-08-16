import { motion } from 'framer-motion';
import {
  CalendarDays, Users, UserCheck, UsersRound, CreditCard, ShoppingBag, Wallet,
  Ticket as TicketIcon, Bell, Search, Settings, ScrollText, FileText,
  Image as ImageIcon, MapPin, LifeBuoy, Layers, Megaphone, RotateCcw, Activity,
  MessageSquare,
} from 'lucide-react';

/*
 * Hand-drawn empty-state scenes. Each is a small line-doodle drawn in the
 * gold accent with a muted secondary tone, sketched in on mount (pathLength)
 * and floating gently. The scene is picked automatically from the icon the
 * caller passes in, so every empty state in the app gets a bespoke drawing.
 */
const GOLD = '#D4AF37';
const DIM = '#5A6166';

const TYPE_FROM_ICON = new Map([
  [CalendarDays, 'events'],
  [Users, 'people'],
  [UserCheck, 'people'],
  [UsersRound, 'people'],
  [CreditCard, 'orders'],
  [ShoppingBag, 'orders'],
  [RotateCcw, 'orders'],
  [Wallet, 'wallet'],
  [TicketIcon, 'tickets'],
  [Bell, 'notifications'],
  [Search, 'search'],
  [Settings, 'settings'],
  [ScrollText, 'generic'],
  [FileText, 'content'],
  [ImageIcon, 'content'],
  [MapPin, 'geo'],
  [LifeBuoy, 'support'],
  [Layers, 'categories'],
  [Megaphone, 'broadcast'],
  [MessageSquare, 'support'],
  [Activity, 'generic'],
]);

function Outline({ d, color = GOLD, width = 1.75, delay = 0, dash = null }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.9, delay, ease: 'easeOut' }}
    />
  );
}

function SoftFill({ d, color = GOLD }) {
  return <path d={d} fill={color} fillOpacity={0.08} stroke="none" />;
}

function Sparkle({ x, y, size = 5, delay = 0, color = GOLD }) {
  return (
    <motion.path
      d={`M ${x} ${y - size} L ${x + size * 0.3} ${y - size * 0.3} L ${x + size} ${y} L ${x + size * 0.3} ${y + size * 0.3} L ${x} ${y + size} L ${x - size * 0.3} ${y + size * 0.3} L ${x - size} ${y} L ${x - size * 0.3} ${y - size * 0.3} Z`}
      fill={color}
      stroke="none"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
      transition={{ duration: 2.6, repeat: Infinity, delay, ease: 'easeInOut' }}
      style={{ transformOrigin: `${x}px ${y}px` }}
    />
  );
}

const scenes = {
  events: (
    <>
      <SoftFill d="M79 47 A7 7 0 0 1 86 40 H116 A7 7 0 0 1 123 47 V90 A7 7 0 0 1 116 97 H86 A7 7 0 0 1 79 90 Z" />
      <Outline d="M79 40 H116 A7 7 0 0 1 123 47 V90 A7 7 0 0 1 116 97 H86 A7 7 0 0 1 79 90 V47 A7 7 0 0 1 79 40 Z M84 32 h4 v8 h-4 Z M114 32 h4 v8 h-4 Z M79 58 H123 M90 58 V97 M112 58 V97" />
      <circle cx="101" cy="73" r="3" fill={GOLD} stroke="none" />
      <Outline d="M152 34 h10 M157 29 v10" color={DIM} width={1.4} delay={0.5} />
      <circle cx="58" cy="56" r="2.5" fill={DIM} stroke="none" />
      <circle cx="153" cy="92" r="2" fill={DIM} stroke="none" />
      <Sparkle x={150} y={58} size={6} delay={1.2} />
    </>
  ),
  people: (
    <>
      <Outline d="M76 52 A9 9 0 1 0 94 52 A9 9 0 1 0 76 52 Z M68 92 C70 78 100 78 102 92" />
      <Outline d="M114 45 A7 7 0 1 0 128 45 A7 7 0 1 0 114 45 Z M112 84 C114 73 132 73 134 84" delay={0.25} />
      <Outline d="M147 58 V66 M143 62 H151" delay={0.45} />
      <Sparkle x={152} y={46} size={5} delay={1} />
      <circle cx="62" cy="58" r="2" fill={DIM} stroke="none" />
      <circle cx="140" cy="80" r="2.5" fill={DIM} stroke="none" />
    </>
  ),
  tickets: (
    <>
      <SoftFill d="M78 52 H122 A6 6 0 0 1 128 58 V74 A6 6 0 0 1 122 80 H78 A6 6 0 0 1 72 74 V58 A6 6 0 0 1 78 52 Z" />
      <Outline d="M78 52 H122 A6 6 0 0 1 128 58 V74 A6 6 0 0 1 122 80 H78 A6 6 0 0 1 72 74 V58 A6 6 0 0 1 78 52 Z M72 66 H78 M122 66 H128" />
      <Outline d="M100 52 V80" dash="2 4" color={DIM} width={1.4} delay={0.4} />
      <circle cx="88" cy="66" r="3" fill={GOLD} stroke="none" />
      <Outline d="M152 40 h10 M157 35 v10" color={DIM} width={1.4} delay={0.55} />
      <Sparkle x={147} y={62} size={6} delay={1.1} />
    </>
  ),
  orders: (
    <>
      <SoftFill d="M70 50 H130 A6 6 0 0 1 136 56 V92 A6 6 0 0 1 130 98 H70 A6 6 0 0 1 64 92 V56 A6 6 0 0 1 70 50 Z" />
      <Outline d="M70 50 H130 A6 6 0 0 1 136 56 V92 A6 6 0 0 1 130 98 H70 A6 6 0 0 1 64 92 V56 A6 6 0 0 1 70 50 Z M76 62 H100 M76 70 H96 M70 88 H136" />
      <Outline d="M140 58 A10 10 0 1 0 160 58 A10 10 0 1 0 140 58 Z" delay={0.3} />
      <Outline d="M146 58 A4 4 0 1 0 154 58 A4 4 0 1 0 146 58 Z" delay={0.5} color={DIM} width={1.4} />
      <Sparkle x={148} y={40} size={5} delay={1.1} />
    </>
  ),
  wallet: (
    <>
      <SoftFill d="M76 48 H124 A8 8 0 0 1 132 56 V80 A8 8 0 0 1 124 88 H76 A8 8 0 0 1 68 80 V56 A8 8 0 0 1 76 48 Z" />
      <Outline d="M76 48 H124 A8 8 0 0 1 132 56 V80 A8 8 0 0 1 124 88 H76 A8 8 0 0 1 68 80 V56 A8 8 0 0 1 76 48 Z M72 62 C90 71 110 71 128 62" />
      <Outline d="M142 54 H154 A4 4 0 0 1 158 58 V64 A4 4 0 0 1 154 68 H142 Z" delay={0.3} />
      <Outline d="M147 58 A3 3 0 1 0 153 58 A3 3 0 1 0 147 58 Z" delay={0.5} color={DIM} width={1.3} />
      <Sparkle x={146} y={40} size={5} delay={1.1} />
    </>
  ),
  notifications: (
    <>
      <SoftFill d="M100 40 C88 40 84 52 84 62 V72 H116 V62 C116 52 112 40 100 40 Z" />
      <Outline d="M100 40 C88 40 84 52 84 62 V72 H116 V62 C116 52 112 40 100 40 Z M94 78 H106" />
      <circle cx="100" cy="86" r="2.5" fill={GOLD} stroke="none" />
      <Sparkle x={126} y={44} size={6} delay={1} />
      <circle cx="76" cy="58" r="2" fill={DIM} stroke="none" />
      <circle cx="124" cy="72" r="2" fill={DIM} stroke="none" />
    </>
  ),
  search: (
    <>
      <SoftFill d="M76 46 H108 L120 58 V96 H76 Z" />
      <Outline d="M76 46 H108 L120 58 V96 H76 Z M108 46 V58 H120 M82 68 H106 M82 76 H102 M82 84 H98" />
      <Outline d="M120 70 A12 12 0 1 0 144 70 A12 12 0 1 0 120 70 Z M138 82 L150 94" delay={0.3} />
      <Sparkle x={156} y={56} size={5} delay={1.1} />
    </>
  ),
  settings: (
    <>
      <SoftFill d="M84 66 A16 16 0 1 0 116 66 A16 16 0 1 0 84 66 Z" />
      <Outline d="M84 66 A16 16 0 1 0 116 66 A16 16 0 1 0 84 66 Z M94 66 A6 6 0 1 0 106 66 A6 6 0 1 0 94 66 Z" />
      <Outline d="M100 44 V38 M100 94 V88 M78 66 H72 M128 66 H122 M84 50 L80 46 M116 82 L120 86 M116 50 L120 46 M84 82 L80 86" color={DIM} width={1.5} delay={0.35} />
      <Sparkle x={140} y={42} size={5} delay={1.1} />
    </>
  ),
  content: (
    <>
      <SoftFill d="M92 48 H122 A4 4 0 0 1 126 52 V78 A4 4 0 0 1 122 82 H96 A4 4 0 0 1 92 78 Z" />
      <Outline d="M96 44 H122 A4 4 0 0 1 126 48 V78 A4 4 0 0 1 122 82 H96 A4 4 0 0 1 92 78 V48 A4 4 0 0 1 96 44 Z M78 52 H108 A4 4 0 0 1 112 56 V86 A4 4 0 0 1 108 90 H78 A4 4 0 0 1 74 86 V56 A4 4 0 0 1 78 52 Z M80 64 H104 M80 72 H100 M80 80 H96" />
      <Outline d="M134 60 L148 46 M150 44 L146 48" color={DIM} width={1.5} delay={0.35} />
      <Sparkle x={140} y={80} size={5} delay={1.1} />
    </>
  ),
  categories: (
    <>
      <Outline d="M76 48 H94 A4 4 0 0 1 98 52 V70 A4 4 0 0 1 94 74 H76 A4 4 0 0 1 72 70 V52 A4 4 0 0 1 76 48 Z M108 48 H126 A4 4 0 0 1 130 52 V70 A4 4 0 0 1 126 74 H108 A4 4 0 0 1 104 70 V52 A4 4 0 0 1 108 48 Z M76 80 H94 A4 4 0 0 1 98 84 V102 A4 4 0 0 1 94 106 H76 A4 4 0 0 1 72 102 V84 A4 4 0 0 1 76 80 Z M108 80 H126 A4 4 0 0 1 130 84 V102 A4 4 0 0 1 126 106 H108 A4 4 0 0 1 104 102 V84 A4 4 0 0 1 108 80 Z" />
      <Sparkle x={101} y={77} size={5} delay={1} />
      <circle cx="101" cy="77" r="2" fill={DIM} stroke="none" />
      <circle cx="152" cy="56" r="2" fill={DIM} stroke="none" />
    </>
  ),
  broadcast: (
    <>
      <SoftFill d="M72 58 H96 L112 46 V84 L96 72 H72 Z" />
      <Outline d="M72 58 H96 L112 46 V84 L96 72 H72 Z M112 56 H120" />
      <Outline d="M126 54 A12 12 0 0 1 126 76 M134 48 A20 20 0 0 1 134 82" color={DIM} width={1.4} delay={0.35} />
      <Sparkle x={140} y={42} size={5} delay={1.1} />
      <circle cx="64" cy="70" r="2" fill={DIM} stroke="none" />
    </>
  ),
  support: (
    <>
      <SoftFill d="M82 66 A18 18 0 1 0 118 66 A18 18 0 1 0 82 66 Z" />
      <Outline d="M82 66 A18 18 0 1 0 118 66 A18 18 0 1 0 82 66 Z M93 66 A7 7 0 1 0 107 66 A7 7 0 1 0 93 66 Z M100 42 V90 M76 66 H124" />
      <Sparkle x={130} y={42} size={5} delay={1.1} />
      <circle cx="72" cy="88" r="2" fill={DIM} stroke="none" />
    </>
  ),
  geo: (
    <>
      <SoftFill d="M100 44 C86 44 78 52 78 62 C78 74 100 88 100 88 C100 88 122 74 122 62 C122 52 114 44 100 44 Z" />
      <Outline d="M100 44 C86 44 78 52 78 62 C78 74 100 88 100 88 C100 88 122 74 122 62 C122 52 114 44 100 44 Z M95.5 62 A4.5 4.5 0 1 0 104.5 62 A4.5 4.5 0 1 0 95.5 62 Z" />
      <Sparkle x={132} y={44} size={5} delay={1.1} />
      <circle cx="68" cy="60" r="2" fill={DIM} stroke="none" />
    </>
  ),
  generic: (
    <>
      <SoftFill d="M70 62 H130 L122 84 A6 6 0 0 1 116 88 H84 A6 6 0 0 1 78 84 Z" />
      <Outline d="M70 62 H130 L122 84 A6 6 0 0 1 116 88 H84 A6 6 0 0 1 78 84 Z M82 62 L88 72 H112 L118 62" />
      <Outline d="M90 44 H110 V58 H90 Z M90 44 L100 52 L110 44" delay={0.25} color={DIM} width={1.4} />
      <Sparkle x={140} y={46} size={5} delay={1.1} />
      <circle cx="62" cy="72" r="2" fill={DIM} stroke="none" />
    </>
  ),
};

function Scene({ type }) {
  return (
    <svg viewBox="0 0 200 132" className="w-44 h-28 shrink-0" fill="none" aria-hidden="true">
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {scenes[type] || scenes.generic}
      </motion.g>
    </svg>
  );
}

export default function EmptyState({ icon: Icon, title = 'Nothing here yet', description, action, actionLabel, className = '' }) {
  const type = Icon ? TYPE_FROM_ICON.get(Icon) : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center text-center py-14 px-4 ${className}`}
    >
      <Scene type={type} />
      <motion.h3
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="mt-4 text-lg font-semibold tracking-tight text-[#EDF0F1]"
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.35 }}
          className="mt-2 max-w-sm text-sm text-[#8A9196] leading-relaxed"
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.button
          onClick={action}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          whileHover={{ y: -1 }}
          className="mt-6 px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition-colors"
        >
          {actionLabel || 'Get Started'}
        </motion.button>
      )}
    </motion.div>
  );
}
