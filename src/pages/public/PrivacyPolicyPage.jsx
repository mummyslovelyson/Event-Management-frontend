import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

const LAST_UPDATED = 'August 17, 2025';

const sections = [
  {
    title: '1. Introduction',
    body: `Tribes & Cliqs ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform. By accessing the Platform, you consent to the practices described in this policy.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect information you provide directly — such as your name, email address, phone number, and payment details when you register or purchase tickets. We also automatically collect usage data including your IP address, browser type, device information, pages visited, and referral URLs. When you make a payment, transaction details are processed by Paystack on our behalf.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your information to: (a) create and manage your account; (b) process ticket purchases and send QR e-tickets; (c) send transactional emails (booking confirmations, reminders); (d) send marketing communications if you have opted in; (e) improve the Platform and user experience; (f) detect and prevent fraud or unauthorized activity; (g) comply with legal obligations.`,
  },
  {
    title: '4. Sharing Your Information',
    body: `We do not sell your personal data. We may share your information with: (a) Event Organizers — your name and email are shared with the organizer of events you attend for check-in and communication purposes; (b) Service Providers — such as Paystack (payments) and email delivery services, who are contractually required to keep your data secure; (c) Legal Authorities — when required by law, court order, or to protect the rights and safety of our users.`,
  },
  {
    title: '5. Cookies & Tracking Technologies',
    body: `We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyze Platform usage. You can control cookies through your browser settings. See our Cookie Policy for full details.`,
  },
  {
    title: '6. Data Retention',
    body: `We retain your personal data for as long as your account is active or as needed to provide you services. If you delete your account, we will delete or anonymize your data within 30 days, except where retention is required by law (e.g., financial records).`,
  },
  {
    title: '7. Security',
    body: `We implement industry-standard security measures — including TLS encryption in transit, hashed passwords, and access controls — to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: '8. Your Rights',
    body: `You have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data (subject to legal obligations); withdraw consent for marketing communications at any time; lodge a complaint with the relevant data protection authority in your jurisdiction. To exercise these rights, contact us at ask@tribesandcliqs.app.`,
  },
  {
    title: '9. Third-Party Links',
    body: `Our Platform may contain links to third-party websites. We are not responsible for the privacy practices of those sites. We encourage you to review the privacy policies of any third-party sites you visit.`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `The Platform is not directed to individuals under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us and we will delete it promptly.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy periodically. When we make material changes, we will notify you by email or through a notice on the Platform. Your continued use after changes take effect constitutes acceptance.`,
  },
  {
    title: '12. Contact Us',
    body: `For privacy-related questions or requests, contact our team at ask@tribesandcliqs.app or write to Tribes & Cliqs, Accra, Ghana.`,
  },
];

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="w-6 h-6 text-[#949599]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#EFEFF1] tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-[#949599] text-sm">
            Last updated: <span className="text-[#EFEFF1] font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="mt-4 text-[#949599] text-sm leading-relaxed max-w-xl mx-auto">
            Your privacy matters to us. This policy explains what data we collect,
            why we collect it, and how we keep it safe.
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

        <div className="mt-14 pt-8 border-t border-[#262B2F] text-center">
          <p className="text-xs text-[#494F55]">
            © {new Date().getFullYear()} Tribes &amp; Cliqs · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
