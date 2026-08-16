import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Check, X, Sparkles, Rocket, Crown, Building2, Ticket,
  Users, BarChart3, Mail, Percent, Headphones, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import api from '@/api/axios';

const tiers = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Rocket,
    price: 0,
    period: 'forever',
    tagline: 'Perfect for first-time organizers',
    accent: false,
    features: [
      { text: 'Up to 5 events per month', included: true },
      { text: 'Up to 100 tickets per event', included: true },
      { text: 'Basic analytics dashboard', included: true },
      { text: 'Email notifications', included: true },
      { text: 'Standard support', included: true },
      { text: 'Custom branding', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started Free',
  },
  {
    id: 'pro',
    name: 'Professional',
    icon: Crown,
    price: 49,
    period: 'per month',
    tagline: 'For growing event businesses',
    accent: true,
    badge: 'Most Popular',
    features: [
      { text: 'Unlimited events', included: true },
      { text: 'Up to 1,000 tickets per event', included: true },
      { text: 'Advanced analytics & reports', included: true },
      { text: 'Email + SMS notifications', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Coupon codes & promotions', included: true },
      { text: 'Priority support', included: true },
      { text: 'Dedicated account manager', included: false },
    ],
    cta: 'Start 14-Day Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Building2,
    price: 199,
    period: 'per month',
    tagline: 'For large-scale organizers',
    accent: false,
    features: [
      { text: 'Everything in Professional', included: true },
      { text: 'Unlimited tickets per event', included: true },
      { text: 'Team collaboration tools', included: true },
      { text: 'API access & integrations', included: true },
      { text: 'White-label solution', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: '24/7 priority support', included: true },
      { text: 'Custom contracts & SLAs', included: true },
    ],
    cta: 'Contact Sales',
  },
];

const includedFeatures = [
  { icon: Ticket, title: 'Flexible Ticketing', desc: 'VIP, VVIP, General, Early Bird — create any ticket type you need.' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track sales, attendance, and revenue with detailed dashboards.' },
  { icon: Users, title: 'Attendee Management', desc: 'Export attendee lists, manage check-ins, and communicate with guests.' },
  { icon: Percent, title: 'Promotions', desc: 'Create coupon codes and discount campaigns to boost sales.' },
  { icon: Mail, title: 'Marketing Tools', desc: 'Email campaigns and social sharing to reach more attendees.' },
  { icon: Headphones, title: 'Dedicated Support', desc: 'Get help when you need it from our event experts.' },
];

const faqs = [
  { q: 'Can I change plans anytime?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and we prorate the difference.' },
  { q: 'Are there any hidden fees?', a: 'No hidden fees. A small payment processing fee applies per transaction, which is standard across all payment gateways.' },
  { q: 'Do you offer refunds?', a: 'We offer a 14-day money-back guarantee on all paid plans, no questions asked.' },
  { q: 'What payment methods do you accept?', a: 'We accept Paystack, Mobile Money, and all major credit/debit cards.' },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [subscribing, setSubscribing] = useState(null);

  const handleSubscribe = async (tierId) => {
    setSubscribing(tierId);
    try {
      if (tierId === 'enterprise') {
        await api.post('/contact', { subject: 'Enterprise Plan Inquiry', message: 'Interested in the Enterprise plan.' });
        toast.success('Our sales team will contact you shortly!');
      } else {
        await api.post('/subscriptions', { plan: tierId, billingCycle });
        toast.success('Subscription started! Redirecting...');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not process request. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  const displayPrice = (tier) => {
    if (tier.price === 0) return 0;
    return billingCycle === 'yearly' ? Math.round(tier.price * 12 * 0.8) : tier.price;
  };

  return (
    <>
      {/* Hero */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> For Organizers
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-[#EFEFF1]">Simple, Transparent Pricing</h1>
            <p className="mt-4 text-lg text-[#949599]">
              Choose the plan that fits your needs. No hidden fees, cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-lg bg-[#171A1D] border border-[#494F55]/40">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${billingCycle === 'monthly' ? 'bg-[#D4AF37] text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-[#D4AF37] text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
              >
                Yearly <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">20% off</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`relative rounded-2xl p-6 border transition-all ${
                  tier.accent
                    ? 'bg-gradient-to-b from-[#D4AF37]/10 to-[#171A1D] border-[#D4AF37]/40 shadow-xl shadow-[#D4AF37]/5'
                    : 'bg-[#171A1D] border-[#262B2F] hover:border-[#494F55]/50'
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#D4AF37] text-[#1C232B] text-xs font-bold uppercase tracking-wider">
                    {tier.badge}
                  </span>
                )}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tier.accent ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#494F55]/30 text-[#949599]'}`}>
                  <tier.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#EFEFF1]">{tier.name}</h3>
                <p className="text-sm text-[#949599] mt-1">{tier.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#EFEFF1]">${displayPrice(tier)}</span>
                  <span className="text-sm text-[#949599]">
                    {tier.price === 0 ? 'forever' : billingCycle === 'yearly' ? '/year' : '/month'}
                  </span>
                </div>

                <button
                  onClick={() => handleSubscribe(tier.id)}
                  disabled={subscribing === tier.id}
                  className={`mt-6 w-full py-3 rounded-lg text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 ${
                    tier.accent
                      ? 'bg-[#D4AF37] text-[#1C232B] hover:bg-[#c4a030]'
                      : 'border border-[#494F55]/40 text-[#EFEFF1] hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                  }`}
                >
                  {subscribing === tier.id ? <LoadingSpinner size="sm" /> : tier.cta}
                </button>

                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-[#494F55] shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? 'text-[#949599]' : 'text-[#494F55]'}>{f.text}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Included features */}
      <section className="py-16 bg-[#171A1D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">Everything included</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Powerful Tools for Every Plan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {includedFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="rounded-xl bg-[#1C232B] border border-[#262B2F] p-5"
              >
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-[#EFEFF1]">{f.title}</h3>
                <p className="mt-1.5 text-sm text-[#949599] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing FAQs */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">Good to know</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Pricing FAQs</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5"
              >
                <h3 className="text-sm font-semibold text-[#EFEFF1]">{faq.q}</h3>
                <p className="mt-2 text-sm text-[#949599] leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#171A1D]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex w-14 h-14 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] items-center justify-center mb-4">
            <Zap className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#EFEFF1]">Ready to Start Hosting?</h2>
          <p className="mt-3 text-sm text-[#949599]">Join thousands of organizers creating unforgettable events with Tribes & Cliqs.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="px-6 py-3 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] transition">
              Create an Account
            </Link>
            <Link to="/contact" className="px-6 py-3 rounded-lg border border-[#494F55] text-[#EFEFF1] text-sm font-semibold hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
