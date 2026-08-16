import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  HelpCircle, ChevronDown, Search, MessageSquare, Ticket,
  CreditCard, Users, ShieldCheck, Mail, Sparkles,
} from 'lucide-react';

const categories = [
  {
    id: 'general',
    label: 'General',
    icon: HelpCircle,
    faqs: [
      { q: 'What is Tribes & Cliqs?', a: 'Tribes & Cliqs is an event ticketing platform that allows you to discover, book, and host events across Africa. Whether you\'re looking for concerts, conferences, or workshops, we make it easy to find and attend events you\'ll love.' },
      { q: 'How do I create an account?', a: 'Click "Register" in the top navigation, choose whether you\'re an attendee or organizer, fill in your details, and you\'re ready to go. It\'s free to sign up.' },
      { q: 'Is Tribes & Cliqs free to use?', a: 'Browsing and creating an account is completely free. Organizers pay a subscription fee based on their plan, and a small processing fee applies to ticket purchases.' },
      { q: 'Which countries do you operate in?', a: 'We currently operate in over 120 cities across Africa, with a focus on Ghana, Nigeria, Kenya, and South Africa. We\'re expanding rapidly!' },
    ],
  },
  {
    id: 'tickets',
    label: 'Tickets & Purchases',
    icon: Ticket,
    faqs: [
      { q: 'How do I buy tickets?', a: 'Find an event you\'re interested in, go to the Tickets tab, select your ticket type and quantity, choose a payment method, and complete your purchase. You\'ll receive an e-ticket instantly.' },
      { q: 'What payment methods do you accept?', a: 'We accept Paystack, Mobile Money (MTN, Vodafone, AirtelTigo), and all major credit/debit cards (Visa, Mastercard).' },
      { q: 'Can I get a refund on my ticket?', a: 'Refund policies vary by event and are set by the organizer. Check the event page for the specific refund policy. If you have an issue, contact the organizer or our support team.' },
      { q: 'How do I use a coupon code?', a: 'During checkout, enter your coupon code in the "Coupon Code" field and click "Apply." The discount will be automatically applied to your total.' },
      { q: 'Can I transfer my ticket to someone else?', a: 'Yes, most tickets can be transferred. Go to your attendee dashboard, select the ticket, and use the transfer option. Some events may restrict transfers.' },
    ],
  },
  {
    id: 'organizers',
    label: 'For Organizers',
    icon: Users,
    faqs: [
      { q: 'How do I create an event?', a: 'Register as an organizer, then go to your dashboard and click "Create Event." Fill in the event details, add ticket types, and publish when ready.' },
      { q: 'How much does it cost to host an event?', a: 'We offer three plans: Starter (free), Professional ($49/mo), and Enterprise ($199/mo). A small processing fee also applies per ticket sold.' },
      { q: 'When do I get paid for my ticket sales?', a: 'Payouts are processed within 2-3 business days after the event concludes. You can track your balance and request withdrawals from your wallet.' },
      { q: 'Can I manage my attendees?', a: 'Yes! Your dashboard includes tools to view attendee lists, export data, manage check-ins, and communicate with your attendees.' },
      { q: 'Can I offer different ticket types?', a: 'Absolutely. You can create VIP, VVIP, General, Early Bird, and any custom ticket type with different prices and quantities.' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & Security',
    icon: CreditCard,
    faqs: [
      { q: 'Is my payment information secure?', a: 'Yes. We use Paystack, a PCI-DSS compliant payment gateway, to process all transactions. We never store your card details on our servers.' },
      { q: 'What happens if a payment fails?', a: 'If a payment fails, you\'ll be notified immediately and can try again with a different payment method. No charge will be made for failed transactions.' },
      { q: 'Do you store my credit card information?', a: 'No. All payment processing is handled by our secure payment partners. We never see or store your full card details.' },
      { q: 'How are disputes handled?', a: 'If you have a dispute about a charge, contact our support team with your order details. We\'ll investigate and work with the payment provider to resolve it.' },
    ],
  },
  {
    id: 'account',
    label: 'Account & Privacy',
    icon: ShieldCheck,
    faqs: [
      { q: 'How do I reset my password?', a: 'Click "Login," then "Forgot Password." Enter your email and we\'ll send you a reset link. Follow the link to set a new password.' },
      { q: 'How do I delete my account?', a: 'Go to your account settings and select "Delete Account." Note that this action is permanent and cannot be undone. Active tickets may be affected.' },
      { q: 'How is my personal data used?', a: 'We use your data to provide and improve our services. We never sell your personal information to third parties. Read our Privacy Policy for full details.' },
      { q: 'Can I change my account type?', a: 'Attendees can upgrade to an organizer account at any time from their settings. Contact support if you need assistance with this transition.' },
    ],
  },
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const activeFaqCategory = categories.find((c) => c.id === activeCategory);
  const filteredFaqs = search
    ? categories
        .flatMap((c) => c.faqs.map((f) => ({ ...f, category: c.label })))
        .filter(
          (f) =>
            f.q.toLowerCase().includes(search.toLowerCase()) ||
            f.a.toLowerCase().includes(search.toLowerCase())
        )
    : activeFaqCategory.faqs;

  return (
    <>
      {/* Hero */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" /> Help Center
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-[#EFEFF1]">Frequently Asked Questions</h1>
            <p className="mt-4 text-lg text-[#949599]">
              Find quick answers to common questions. Can't find what you're looking for?{' '}
              <Link to="/contact" className="text-[#D4AF37] hover:underline">Contact us</Link>.
            </p>

            {/* Search */}
            <div className="mt-8 relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#494F55]" />
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder:text-[#494F55] focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category tabs */}
      {!search && (
        <section className="pb-4">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setOpenFaq(null); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                    activeCategory === cat.id
                      ? 'bg-[#D4AF37] text-[#1C232B]'
                      : 'bg-[#171A1D] border border-[#262B2F] text-[#949599] hover:text-[#EFEFF1] hover:border-[#494F55]'
                  }`}
                >
                  <cat.icon className="w-4 h-4" /> {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs accordion */}
      <section className="py-8 sm:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[#171A1D] border border-[#262B2F] flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-[#494F55]" />
              </div>
              <h3 className="text-lg font-semibold text-[#EFEFF1]">No results found</h3>
              <p className="mt-2 text-sm text-[#949599]">Try a different search term or browse by category.</p>
              <button onClick={() => setSearch('')} className="mt-4 px-4 py-2 rounded-lg border border-[#494F55]/40 text-sm text-[#EFEFF1] hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition">
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, i) => {
                const key = search ? `${faq.category}-${i}` : `${activeCategory}-${i}`;
                const isOpen = openFaq === key;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
                    className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left"
                    >
                      <div className="min-w-0 pr-4">
                        {search && (
                          <span className="block text-xs text-[#D4AF37] mb-1">{faq.category}</span>
                        )}
                        <span className="text-sm font-semibold text-[#EFEFF1]">{faq.q}</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-[#949599] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="px-5 pb-4 text-sm text-[#949599] leading-relaxed">{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Still need help CTA */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl bg-gradient-to-br from-[#D4AF37]/15 to-[#171A1D] border border-[#D4AF37]/30 p-8 text-center overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#D4AF37]/10 blur-2xl" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-[#EFEFF1]">Still Have Questions?</h2>
              <p className="mt-2 text-sm text-[#949599]">Our support team is here to help you 24/7.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] transition">
                  <Mail className="w-4 h-4" /> Contact Support
                </Link>
                <a href="mailto:support@tribescliqs.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#494F55] text-[#EFEFF1] text-sm font-semibold hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition">
                  <Sparkles className="w-4 h-4" /> support@tribescliqs.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
