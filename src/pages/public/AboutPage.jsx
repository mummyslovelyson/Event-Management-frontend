import { motion } from 'framer-motion';
import {
  Target, Eye, Users, Heart, ShieldCheck, Zap, Sparkles, MapPin, CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const mission = {
  icon: Target,
  title: 'Our Purpose',
  desc: 'To make finding and ticketing live events simple, safe, and transparent across Ghana and Africa. We give creators fast self-service tools to publish events and get paid directly, while fans get authentic tickets they can trust.',
};

const vision = {
  icon: Eye,
  title: 'What We Are Building',
  desc: 'The most reliable home for live experiences in Africa—from underground DJ sets and community meetups to stadium music festivals and conferences.',
};

const values = [
  {
    icon: Heart,
    title: 'Rooted in Culture & Community',
    desc: 'Live events are about bringing people together. We build tools that make it easy for creators to pack rooms and for friends to share unforgettable nights.',
  },
  {
    icon: ShieldCheck,
    title: '100% Genuine Tickets',
    desc: 'No duplicate codes, no scalping scams. Every purchase generates a unique encrypted QR code backed by secure MoMo and Card payments via Paystack.',
  },
  {
    icon: Zap,
    title: 'Fast & Simple',
    desc: 'Buy tickets in under 30 seconds without jumping through hoops. Walk into the venue with a fast gate scan on your phone.',
  },
  {
    icon: Users,
    title: 'Built for Event Creators',
    desc: 'Clear pricing, same-day or fast event payouts, live attendee lists, and a reliable scanner that works even with spotty internet.',
  },
];

export default function AboutPage() {
  return (
    <div className="bg-[#1C232B] text-[#EFEFF1]">
      {/* ─── Hero ─── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20 border-b border-[#262B2F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161D22] border border-[#494F55]/60 text-white text-xs font-semibold uppercase tracking-widest mb-6">
              About Tribes &amp; Cliqs
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#EFEFF1] leading-tight tracking-tight">
              Live Events &amp; Tickets, <br className="hidden sm:block" />
              <span className="text-white">Made Simple for Africa</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#949599] leading-relaxed">
              Tribes &amp; Cliqs is a modern event discovery and ticketing platform built for creators, organizers, and event lovers.
            </p>
            <p className="mt-3 text-base text-[#949599] leading-relaxed">
              We started with a clear goal: remove the frustration of buying tickets, eliminate fake passes, and give event hosts a straightforward way to sell out their events and withdraw their earnings via Mobile Money or Bank.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Mission & Vision ─── */}
      <section className="py-16 sm:py-20 bg-[#161D22] border-b border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[mission, vision].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-[#1C232B] border border-[#262B2F] p-5 sm:p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-[#161D22] border border-[#262B2F] text-white flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-[#EFEFF1]">{item.title}</h2>
                <p className="mt-3 text-sm text-[#949599] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Core Values ─── */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">What Matters to Us</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">What Drives Our Work</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl bg-[#161D22] border border-[#262B2F] p-6 hover:border-white/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1C232B] border border-[#262B2F] text-white flex items-center justify-center mb-4">
                <v.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#EFEFF1]">{v.title}</h3>
              <p className="mt-2 text-sm text-[#949599] leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Call to Action ─── */}
      <section className="py-16 sm:py-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Ready to Experience More?</h2>
        <p className="mt-3 text-sm text-[#949599] leading-relaxed max-w-lg mx-auto">
          Whether you want to find your next favorite concert or set up ticketing for an upcoming event, we've got you covered.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/explore" className="px-6 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition">
            Explore Events
          </Link>
          <Link to="/register" className="px-6 py-3 rounded-xl bg-[#161D22] border border-[#494F55]/60 text-[#EFEFF1] text-sm font-bold hover:border-white/40 hover:text-white transition">
            Create an Event
          </Link>
        </div>
      </section>
    </div>
  );
}
