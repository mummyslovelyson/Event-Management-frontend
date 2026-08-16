import { motion } from 'framer-motion';
import {
  Target, Eye, Users, Ticket, CalendarCheck, Building2,
  Sparkles, Heart, ShieldCheck, Zap, Linkedin, Twitter, Github,
} from 'lucide-react';

const mission = {
  icon: Target,
  title: 'Our Mission',
  desc: 'To democratize event experiences across Africa by making it effortless for anyone to discover, book, and host unforgettable events. We connect passionate communities with the experiences they love.',
};

const vision = {
  icon: Eye,
  title: 'Our Vision',
  desc: 'To be the leading event ticketing platform on the continent, empowering organizers of all sizes and bringing millions of people together through shared experiences.',
};

const values = [
  { icon: Heart, title: 'Community First', desc: 'Every event is a gathering of a tribe. We build for the people who make events special.' },
  { icon: ShieldCheck, title: 'Trust & Security', desc: 'Secure payments, verified organizers, and transparent transactions — every time.' },
  { icon: Zap, title: 'Seamless Experience', desc: 'From discovery to attendance, we obsess over making every step frictionless.' },
  { icon: Sparkles, title: 'Excellence', desc: 'We hold ourselves to the highest standard in everything we ship.' },
];

const team = [
  { name: 'Kwame Mensah', role: 'Founder & CEO', initials: 'KM', bio: '15+ years building tech products for African markets.' },
  { name: 'Amara Okafor', role: 'Head of Product', initials: 'AO', bio: 'Passionate about delightful user experiences.' },
  { name: 'David Asare', role: 'CTO', initials: 'DA', bio: 'Systems architect with a love for scale and reliability.' },
  { name: 'Zainab Mohammed', role: 'Head of Growth', initials: 'ZM', bio: 'Connecting communities with the events they love.' },
];

const stats = [
  { icon: CalendarCheck, label: 'Events Hosted', value: '12,450+' },
  { icon: Ticket, label: 'Tickets Sold', value: '890K+' },
  { icon: Users, label: 'Happy Attendees', value: '560K+' },
  { icon: Building2, label: 'Cities', value: '120+' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Our Story
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-[#EDF0F1] leading-tight">
              Bringing People Together, <br className="hidden sm:block" />
              <span className="text-[#D4AF37]">One Event at a Time</span>
            </h1>
            <p className="mt-5 text-lg text-[#8A9196] leading-relaxed">
              Tribes & Cliqs is an online self-ticketing platform that allows you to curate events seamlessly
              and provide your guests with the ultimate booking experience.
            </p>
            <p className="mt-4 text-lg text-[#8A9196] leading-relaxed">
              We help people share, discover, and participate in events that connect your passions and stimulate their
              lives. From festivals and corporate events to fundraisers, concerts, and anything in between, our ultimate
              goal is uniting people from all walks of life through live experiences.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20 bg-[#171A1D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[mission, vision].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="rounded-2xl bg-[#1E252B] border border-[#262B2F] p-8"
              >
                <div className="w-14 h-14 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mb-5">
                  <item.icon className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-[#EDF0F1]">{item.title}</h2>
                <p className="mt-3 text-sm text-[#8A9196] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">What drives us</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EDF0F1]">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-6 hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mb-4">
                  <v.icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#EDF0F1]">{v.title}</h3>
                <p className="mt-2 text-sm text-[#8A9196] leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 sm:py-20 bg-[#171A1D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#EDF0F1]">Our Impact</h2>
            <p className="mt-2 text-sm text-[#8A9196]">Real numbers, real experiences.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="rounded-xl bg-[#1E252B] border border-[#262B2F] p-5 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-bold text-[#EDF0F1]">{s.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#8A9196]">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">The people behind it</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EDF0F1]">Meet Our Team</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-6 text-center hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/5 text-[#D4AF37] text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {member.initials}
                </div>
                <h3 className="text-sm font-semibold text-[#EDF0F1]">{member.name}</h3>
                <p className="text-xs text-[#D4AF37] mt-0.5">{member.role}</p>
                <p className="mt-3 text-xs text-[#8A9196] leading-relaxed">{member.bio}</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  {[Linkedin, Twitter, Github].map((Icon, idx) => (
                    <button key={idx} className="w-8 h-8 rounded-lg bg-[#1E252B] border border-[#262B2F] flex items-center justify-center text-[#8A9196] hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition">
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-[#171A1D]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#EDF0F1]">Join Our Community</h2>
          <p className="mt-3 text-sm text-[#8A9196]">
            Whether you're looking to attend events or host your own, we'd love to have you.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href="/explore" className="px-6 py-3 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition">
              Explore Events
            </a>
            <a href="/register" className="px-6 py-3 rounded-lg border border-[#494F55] text-[#EDF0F1] text-sm font-semibold hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition">
              Become an Organizer
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
