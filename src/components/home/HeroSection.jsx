import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HERO_IMAGE = 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';

export default function HeroSection() {
  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden border-b border-[#262B2F]">
      {/* Background Image & Scrim */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={HERO_IMAGE}
          alt="Live concert crowd enjoying music event"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] via-[#1C232B]/85 to-[#1C232B]/70" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#EFEFF1] leading-[1.12]"
        >
          Find Your Tribe. <br />
          <span className="text-white">Book the Moment.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mt-5 text-base sm:text-lg text-[#CBD5E1] max-w-2xl mx-auto leading-relaxed"
        >
          Discover verified concerts, music festivals, parties, conferences, and community gatherings across Africa.
          Buy tickets in seconds with Mobile Money or host and sell out your own event.
        </motion.p>

        {/* Quick CTA Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
        >
          <Link
            to="/explore"
            className="px-6 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-lg active:scale-95"
          >
            Explore Events
          </Link>
          <Link
            to="/register"
            className="px-6 py-3 rounded-xl bg-[#161D22] border border-[#262B2F] text-sm font-semibold text-[#EFEFF1] hover:bg-[#1D2124] hover:border-white/30 transition shadow-sm active:scale-95"
          >
            Host an Event
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
