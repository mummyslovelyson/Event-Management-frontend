import { motion } from 'framer-motion';
import {
  Target, Eye, Users, Ticket, CalendarCheck, Building2,
  Heart, ShieldCheck, Zap, Sparkles, MapPin, CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const mission = {
  icon: Target,
  title: 'Our Mission',
  desc: 'To make event discovery and self-ticketing effortless across Africa. We empower organizers to launch and sell tickets in minutes while giving attendees a reliable, instant checkout experience.',
};

const vision = {
  icon: Eye,
  title: 'Our Vision',
  desc: 'To be the home for live culture, concerts, nightlife, and community gatherings on the continent—connecting people with the moments that matter to them.',
};

const values = [
  {
    icon: Heart,
    title: 'Built for the Community',
    desc: 'Events bring people together. Whether it is 50 people at a workshop or 15,000 at a music festival, we build for real human connection.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified & Secure',
    desc: 'No fake tickets. Secure mobile money and card processing via Paystack, instant QR confirmation, and dedicated support for every order.',
  },
  {
    icon: Zap,
    title: 'Frictionless Ticketing',
    desc: 'Buy tickets in under 30 seconds without creating complicated accounts. Scan in at the venue doors smoothly with zero delays.',
  },
  {
    icon: Users,
    title: 'Organizer Friendly',
    desc: 'Transparent fees, fast payouts, real-time sales dashboards, and simple check-in tools that make running events stress-free.',
  },
];

const stats = [
  { icon: CalendarCheck, label: 'Events Hosted', value: '12,450+' },
  { icon: Ticket, label: 'Tickets Issued', value: '890,000+' },
  { icon: Users, label: 'Attendees Reached', value: '560,000+' },
  { icon: Building2, label: 'Cities Covered', value: '120+' },
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
              Connecting People Through <br className="hidden sm:block" />
              <span className="text-white">Live Experiences</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#949599] leading-relaxed">
              Tribes &amp; Cliqs is a self-service event ticketing platform built for creators, organizers, and event lovers across Africa.
            </p>
            <p className="mt-3 text-base text-[#949599] leading-relaxed">
              From concerts and festivals to conferences, workshops, and sports, our goal is simple: make it fast and easy to discover great events, buy authentic tickets, and fill rooms.
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
                className="rounded-2xl bg-[#1C232B] border border-[#262B2F] p-8"
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

      {/* ─── Stats ─── */}
      <section className="py-16 sm:py-20 bg-[#161D22] border-y border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1]">Our Impact in Numbers</h2>
            <p className="mt-2 text-sm text-[#949599]">Real events, real attendees, real communities.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-[#1C232B] border border-[#262B2F] p-6 text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-[#161D22] text-white flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-extrabold text-[#EFEFF1]">{s.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#949599]">{s.label}</p>
              </div>
            ))}
          </div>
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
