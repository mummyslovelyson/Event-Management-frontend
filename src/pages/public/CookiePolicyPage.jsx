import { motion } from 'framer-motion';
import { Cookie } from 'lucide-react';

const LAST_UPDATED = 'August 17, 2025';

const sections = [
  {
    title: '1. What Are Cookies?',
    body: `Cookies are small text files that are stored on your device (computer, tablet, or phone) when you visit a website. They allow the website to recognize your device and remember certain information about your visit — such as your preferences and login status — to make future visits faster and more convenient.`,
  },
  {
    title: '2. How We Use Cookies',
    body: `Tribes & Cliqs uses cookies to ensure the Platform functions correctly, to improve your experience, and to understand how visitors use our site. We use both session cookies (which expire when you close your browser) and persistent cookies (which remain on your device for a set period).`,
  },
  {
    title: '3. Types of Cookies We Use',
    body: `Strictly Necessary Cookies: These are essential for the Platform to work. They enable core features like authentication and checkout. You cannot opt out of these. Functional Cookies: These remember your preferences (e.g., currency selection, language) to personalize your experience. Analytics Cookies: We use these to understand how visitors interact with the Platform — pages visited, time on site, and errors encountered — so we can improve it. These cookies collect data in an aggregated, anonymous form. Marketing Cookies: If you have opted in to marketing communications, these cookies help us show you relevant content and measure campaign performance.`,
  },
  {
    title: '4. Third-Party Cookies',
    body: `Some cookies on our Platform are placed by third-party services we use, including: Paystack (payment processing), analytics providers, and social media platforms if you use social login. These third parties have their own privacy and cookie policies, and we do not control how they use the information they collect.`,
  },
  {
    title: '5. Managing Cookies',
    body: `You can control and manage cookies through your browser settings. Most browsers allow you to refuse cookies, delete existing cookies, or alert you when cookies are being set. Please note that disabling strictly necessary cookies may prevent some parts of the Platform from working correctly. For detailed guidance on managing cookies, visit your browser's help pages (Chrome, Firefox, Safari, Edge).`,
  },
  {
    title: '6. Cookie Consent',
    body: `When you first visit the Platform, we will ask for your consent to use non-essential cookies. You can change your preferences at any time by clearing your browser cookies and revisiting the Platform.`,
  },
  {
    title: '7. Updates to This Policy',
    body: `We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our practices. We will notify you of significant changes via the Platform or by email.`,
  },
  {
    title: '8. Contact Us',
    body: `If you have questions about our use of cookies, please contact us at ask@tribesandcliqs.app or write to Tribes & Cliqs, Accra, Ghana.`,
  },
];

export default function CookiePolicyPage() {
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
            <Cookie className="w-6 h-6 text-[#949599]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#EFEFF1] tracking-tight">
            Cookie Policy
          </h1>
          <p className="mt-3 text-[#949599] text-sm">
            Last updated: <span className="text-[#EFEFF1] font-medium">{LAST_UPDATED}</span>
          </p>
          <p className="mt-4 text-[#949599] text-sm leading-relaxed max-w-xl mx-auto">
            This policy explains what cookies are, which ones we use on the
            Tribes &amp; Cliqs platform, and how you can manage them.
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
