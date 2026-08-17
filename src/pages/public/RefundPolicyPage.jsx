import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

const LAST_UPDATED = 'August 17, 2025';

const sections = [
  {
    title: '1. Overview',
    body: `This Refund Policy applies to all ticket purchases made on the Tribes & Cliqs platform ("Platform"). Because Tribes & Cliqs acts as a marketplace between event organizers and attendees, refund eligibility depends primarily on the organizer's refund settings for their specific event. Please review the refund terms on each event's listing page before completing your purchase.`,
  },
  {
    title: '2. Organizer-Set Refund Policies',
    body: `Each event organizer may configure their own refund window (e.g., refunds allowed up to 48 hours before the event, or no refunds). The refund terms applicable to your ticket will be clearly displayed on the event's checkout page before you pay. By completing your purchase, you acknowledge and agree to the organizer's refund policy for that event.`,
  },
  {
    title: '3. When You May Be Eligible for a Refund',
    body: `You may be eligible for a full refund in the following circumstances: (a) The event is cancelled by the organizer; (b) The event is postponed and you do not wish to attend the new date; (c) Your refund request is submitted within the organizer's stated refund window; (d) There is a verified technical error that resulted in a duplicate charge. In all other cases, refunds are at the discretion of the event organizer.`,
  },
  {
    title: '4. How to Request a Refund',
    body: `To request a refund: (1) Log in to your Tribes & Cliqs account; (2) Go to My Bookings or My Tickets; (3) Select the booking and click "Request Refund"; (4) Provide the reason for your refund request. Our support team will review your request and respond within 3–5 business days. Alternatively, you can contact us directly at ask@tribesandcliqs.app with your booking reference number.`,
  },
  {
    title: '5. Refund Processing',
    body: `Approved refunds will be returned to your original payment method — Mobile Money (MTN, Telecel, AT) or bank card — via Paystack, our payment processor. Refunds typically take 5–10 business days to appear in your account after approval, depending on your network or bank. Platform fees (if any) are non-refundable unless the refund is due to a cancelled event or a Platform error.`,
  },
  {
    title: '6. Cancelled or Postponed Events',
    body: `If an event is cancelled by the organizer, all attendees will receive a full refund automatically, including any applicable Platform fees. If an event is postponed, attendees will be notified and given the option to either keep their ticket for the new date or request a full refund within 7 days of the postponement announcement.`,
  },
  {
    title: '7. Non-Refundable Situations',
    body: `Refunds will generally not be issued in the following situations: (a) You are unable to attend the event due to personal reasons and the organizer's refund window has closed; (b) You attended the event (fully or partially); (c) The event took place as described and no technical error occurred; (d) The ticket was purchased through a third-party reseller (not directly through Tribes & Cliqs).`,
  },
  {
    title: '8. Chargebacks',
    body: `If you initiate a chargeback with your bank or mobile money provider without first contacting us, your account may be suspended pending investigation. We encourage you to reach out to our support team first — we are committed to resolving disputes fairly and quickly.`,
  },
  {
    title: '9. Contact & Disputes',
    body: `For any refund-related questions or disputes, please contact us at ask@tribesandcliqs.app. Include your full name, email address registered on the Platform, and your booking reference number. We aim to resolve all disputes within 5 business days.`,
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#1C232B] text-[#EFEFF1]">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#171A1D] border-b border-[#262B2F] py-16 px-4"
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1C232B] border border-[#494F55]/40 mb-5">
            <RotateCcw className="w-6 h-6 text-[#949599]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#EFEFF1] tracking-tight">
            Refund Policy
          </h1>
          <p className="mt-3 text-[#949599] text-sm">
            Last updated: <span className="text-[#EFEFF1] font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="mt-4 text-[#949599] text-sm leading-relaxed max-w-xl mx-auto">
            We want every experience on Tribes &amp; Cliqs to be seamless. Here's how
            refunds work when things don't go as planned.
          </p>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <div className="space-y-10">
          {sections.map((s, i) => (
            <motion.section
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <h2 className="text-lg font-bold text-[#EFEFF1] mb-3">{s.title}</h2>
              <p className="text-[#949599] text-sm leading-relaxed">{s.body}</p>
            </motion.section>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-12 rounded-2xl bg-[#171A1D] border border-[#262B2F] p-8 text-center"
        >
          <h3 className="text-base font-bold text-[#EFEFF1] mb-2">Need help with a refund?</h3>
          <p className="text-sm text-[#949599] mb-5">
            Our support team is ready to assist you. Reach out and we'll sort it out.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition"
          >
            Contact Support
          </Link>
        </motion.div>

        <div className="mt-10 pt-8 border-t border-[#262B2F] text-center">
          <p className="text-xs text-[#494F55]">
            © {new Date().getFullYear()} Tribes &amp; Cliqs · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
