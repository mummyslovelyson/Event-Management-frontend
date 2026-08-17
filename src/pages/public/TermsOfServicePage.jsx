import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const LAST_UPDATED = 'August 17, 2025';

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using the Tribes & Cliqs platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, please do not use the Platform. These Terms apply to all visitors, attendees, organizers, and any other users of the Platform.`,
  },
  {
    title: '2. Description of Service',
    body: `Tribes & Cliqs is an online event discovery and self-ticketing platform that allows event organizers to create, publish, and sell tickets to their events, and allows attendees to discover and purchase tickets to those events. We act as an intermediary between organizers and attendees and are not the organizer of any event listed on the Platform.`,
  },
  {
    title: '3. Account Registration',
    body: `To access certain features, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update that information to keep it accurate. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately at ask@tribesandcliqs.app if you suspect unauthorized use.`,
  },
  {
    title: '4. User Roles',
    body: `The Platform supports three user roles: Attendees (who browse and purchase event tickets), Organizers (who create and manage events and ticket sales), and Admins (who manage the Platform). Each role has specific permissions and responsibilities. Organizer accounts require approval before events can be published.`,
  },
  {
    title: '5. Ticket Purchases',
    body: `All ticket purchases are processed through Paystack, our secure payment partner. By completing a purchase, you authorize Tribes & Cliqs to charge your selected payment method (Mobile Money — MTN, Telecel, AT — or card) for the total amount. Tickets are non-transferable unless explicitly permitted by the organizer. Once purchased, a QR-code e-ticket will be delivered to your registered email and available in your dashboard.`,
  },
  {
    title: '6. Organizer Responsibilities',
    body: `Event organizers are solely responsible for the accuracy of event listings, including dates, times, venues, and descriptions. Organizers must ensure their events comply with all applicable laws and regulations in Ghana and any other relevant jurisdiction. Tribes & Cliqs reserves the right to remove any event listing that violates these Terms or applicable law.`,
  },
  {
    title: '7. Prohibited Conduct',
    body: `You agree not to: (a) post false, misleading, or fraudulent event listings; (b) use the Platform for any unlawful purpose; (c) attempt to gain unauthorized access to any part of the Platform; (d) resell tickets at a markup without explicit organizer permission; (e) use automated tools to scrape, crawl, or interact with the Platform; (f) harass, threaten, or abuse other users or Platform staff.`,
  },
  {
    title: '8. Intellectual Property',
    body: `All content on the Platform — including logos, branding, design, and software — is the property of Tribes & Cliqs or its licensors and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our prior written consent.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by law, Tribes & Cliqs shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform. Our total liability to you for any claim arising from these Terms shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.`,
  },
  {
    title: '10. Termination',
    body: `We reserve the right to suspend or terminate your account at any time, with or without notice, if we determine that you have violated these Terms or that your continued use of the Platform poses a risk to other users or the Platform itself. Upon termination, your right to use the Platform ceases immediately.`,
  },
  {
    title: '11. Changes to Terms',
    body: `We may update these Terms from time to time. When we do, we will revise the "Last Updated" date at the top of this page and, where appropriate, notify you by email. Your continued use of the Platform after changes take effect constitutes your acceptance of the revised Terms.`,
  },
  {
    title: '12. Governing Law',
    body: `These Terms are governed by the laws of the Republic of Ghana. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.`,
  },
  {
    title: '13. Contact Us',
    body: `If you have any questions about these Terms, please contact us at ask@tribesandcliqs.app or write to us at Tribes & Cliqs, Accra, Ghana.`,
  },
];

export default function TermsOfServicePage() {
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
            <FileText className="w-6 h-6 text-[#949599]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#EFEFF1] tracking-tight">
            Terms of Service
          </h1>
          <p className="mt-3 text-[#949599] text-sm">
            Last updated: <span className="text-[#EFEFF1] font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="mt-4 text-[#949599] text-sm leading-relaxed max-w-xl mx-auto">
            Please read these Terms carefully before using the Tribes &amp; Cliqs platform.
            By using our service, you agree to be bound by these Terms.
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
