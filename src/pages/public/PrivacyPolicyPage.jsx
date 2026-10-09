import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Phone, MapPin, AlertCircle, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = '1st day of February 2023';

const sections = [
  {
    id: 'info-we-collect',
    number: '1',
    title: 'INFORMATION WE COLLECT AND OBTAIN',
    lead: 'We obtain personal information about you from a variety of sources. This includes personal information you provide to us directly, information we obtain from other sources, and information we gather through automated means.',
    subsections: [
      {
        subtitle: 'Information you provide to us',
        intro: 'When you visit to use the website or participate in certain services, seek access to certain content or features, or directly correspond with us, we may collect certain types of information from you:',
        items: [
          'Contact information (such as name, postal address, email address and telephone and/or mobile numbers);',
          'Your payment information, when needed to facilitate certain transactions;',
          'Reviews, comments, and/or surveys on our media blog; and',
          'Other information you may provide to us when you fill a form, such as through our “Contact Us” feature.',
        ],
      },
      {
        subtitle: 'Information obtained from other sources',
        intro: 'We may obtain personal information about you in connection with the Services from publicly and commercially available sources and from our affiliates and/or business partners (such as advertising networks or social networking services), including:',
        items: [
          'Demographic data (such as gender, age range, educational level, household income range, number of children in household, ethnicity to the extent permitted);',
          'Purchasing data, including information about advertisements you have seen or acted upon and information about your interaction with advertisers’ products and services;',
          'Occupational data (such as profession, position, title, industry; and business address);',
        ],
      },
      {
        subtitle: 'Information Collected by Automated Means through Our Services',
        intro: 'We may gather by automated means (such as cookies, web beacons, web server logs, JavaScript and other similar technologies) certain information through our Services:',
        items: [
          'Your Internet Protocol (IP) address;',
          'Device information, including unique identifiers and connection information, including mobile device advertising IDs (e.g., Apple’s IDFA or Google’s AAID) and the means of internet connection (e.g., WiFi connection, ISP) that can identify the physical location of such devices, in accordance with applicable law;',
          'Your device type and settings, software used, browser type and operating system;',
          'Websites or other services you visited before and after visiting the Services (referring URL);',
          'Web pages and advertisements you view and links you click on within, and what search queries you may have run on, the Services (clickstream);',
          'Viewing behavior, including the content you view, how long you view content, the quality of the service you receive, and advertisements you have been shown or interacted with;',
          'Dates and times you access or use the Services;',
          'Location information, including the city, state and zip code associated with your IP Address, information derived through WiFi triangulation, and precise location information from GPS-based functionality on your mobile apps, with your consent;',
          'Your phone number and mobile carrier details in connection with our mobile app.',
        ],
      },
    ],
  },
  {
    id: 'cookies',
    number: '2',
    title: 'COOKIES AND SIMILAR TECHNOLOGIES',
    paragraphs: [
      'Cookies are small files that we or others send to and store on or with your computer so that your computer, browser, mobile app or other application can be recognized as unique the next time you access, visit, use or otherwise take advantage of the Services or other media. Cookies may also reflect demographic data pertaining to you or other data linked to information you submit. One use or consequence of cookies is to enable you to receive customized ads, alerts, content, services or information. You are always free to decline any cookies we use by adjusting the settings of your browser, as your browser may permit; however, some products, services or features might not be available or operate properly if cookies are not enabled. Some of our advertisers and third-party service providers may also utilize their own cookies.',
      'In addition, we, our service providers and others sometimes use data-gathering mechanisms on the Services, including without limitation “web beacons”, “clear GIFs”, “pixels” and/or “tags”. These perform statistical and administrative functions, such as measuring site and page traffic, verifying advertising paths, better understanding user interests and activity, gathering related information (such as information relating to a particular browser, device or IP address) and positioning images, and typically do so without detracting from your online experience. Such mechanisms are not necessarily designed to collect Personal Information. In addition, if you have provided your email address, we might use a non-human unreadable form (or “hash”) of your email address to deliver, or facilitate delivery of, relevant advertisements and information to you on or by way of the Services or on or by way of other websites or media, including, for example, popular social media sites and features.',
    ],
  },
  {
    id: 'how-we-use',
    number: '3',
    title: 'HOW WE USE THE INFORMATION WE OBTAIN',
    lead: 'We, or service providers acting on our behalf, may use the information collected from and about you to:',
    items: [
      'Provide our services, including authorizing a purchase, or completing a transaction that you requested;',
      'Send promotional materials as well as running social media Ads, alerts regarding available offers and other communications, including text/SMS messages if you provided your mobile number and opted in to receive such messages;',
      'Communicate about, and administer participation in, special events, promotions, programs, offers, surveys, contests and market research;',
      'Respond to inquiries from you and other third-parties, including inquiries from law enforcement agencies;',
      'Anonymize or de-identify personal information to provide third parties with aggregated data reports showing anonymized information and other non-personal information;',
      'Provide technical support;',
      'Generate suggestions about the type of content you may enjoy;',
      'Supplement your personal information collected directly from you and/or from automated means with additional information from publicly and commercially available sources, and/or information from our affiliates and our business partners;',
      'Associate your browser and/or device with other browsers or devices you use for the purpose of providing relevant and easier access to content, advertising across browsers and devices, and other operational/business purposes;',
      'Operate, evaluate and improve our business (including developing, enhancing, analyzing and improving our Services; managing our communications; reviewing and processing employment applications, performing data and statistical analytics; and performing accounting, auditing and other internal functions);',
      'Protect against, identify and prevent fraud and other unlawful activity, claims and other liabilities;',
      'Comply with and enforce applicable legal requirements, relevant industry standards, contractual obligations and our terms of service and other policies; and',
      'In other ways for which we provide specific notice at the time of collection.',
    ],
  },
  {
    id: 'disclosure',
    number: '4',
    title: 'DISCLOSURE OF YOUR PERSONAL INFORMATION',
    lead: 'We may disclose your personal information to selected third parties, including:',
    items: [
      'Third party service providers who perform services on our behalf, such as providers of IT and email distribution services, who may use your personal information for the purposes mentioned above;',
      'Advisors such as accountants, lawyers, and consultants;',
      'In the event that we sell or buy any business or assets, the prospective seller or buyer of such business or assets (and their respective advisers), who may use the personal information in connection with the sale or purchase;',
      'If TRIBESANDCLIQS or substantially all of its assets are acquired by a third party, to the relevant third party (and its advisers) who may use the data in connection with the acquisition;',
      'Analytics providers that assist us in the improvement and optimization of our Websites;',
      'Law enforcement agencies or other third parties for legal compliance purposes.',
    ],
    closing:
      'We may also disclose your personal information to third parties if we are under a duty to disclose or share your personal information in order to comply with any legal obligation, or in order to enforce or apply our Website Terms of Use, our Terms and Conditions and other agreements, or to protect the rights, property, or safety of TRIBESANDCLIQS, our customers, or others. This includes exchanging information with other companies and organizations for the purposes of fraud detection and protection and credit risk reduction.',
  },
  {
    id: 'hold-and-protect',
    number: '5',
    title: 'HOW WE HOLD AND PROTECT YOUR PERSONAL INFORMATION',
    lead: 'How we keep your personal information secure:',
    paragraphs: [
      'We will take all steps reasonably necessary to ensure that your personal information is treated securely and in accordance with this privacy policy.',
      'All information you provide to us is stored on our secure servers. Any payment transactions will be carried out by third parties over encrypted connections using SSL technology. Where we have given you (or where you have chosen) a password or API key which enables you to access certain parts of our site, or you have invited team members to access parts of our site or apps, you are responsible for keeping this password or API key confidential. We ask you not to share a password or API key with anyone.',
      'Unfortunately, the transmission of information via the internet is not completely secure. Although we will do our best to protect your personal information, we cannot guarantee the security of your data transmitted to our site and any transmission is at your own risk. Once we have received your information, we will use strict procedures and security features to try to prevent unauthorized access.',
    ],
  },
  {
    id: 'retention',
    number: '6',
    title: 'OUR RETENTION OF YOUR PERSONAL INFORMATION',
    paragraphs: [
      'The periods for which we keep your information depend on why your information was collected and what we use it for. We will not keep your personal information for longer than necessary other than for our business purposes or for legal requirements.',
    ],
  },
  {
    id: 'rights',
    number: '7',
    title: 'WHAT ARE YOUR RIGHTS TO YOUR DATA?',
    lead: 'All Your Personal Information we collect will always belong to you. However, we are a collector and a processor of Your Personal Information. That implies on us obligations to respect your rights to Personal Information and facilitate the exercise of your rights thereto. In order to use any of your rights at any time please contact us and we will facilitate the exercise of your rights free of charge. We will inform you on the actions taken by us under your request as soon as practically possible, but in any case, not later than in 30 (thirty) calendar days.',
    rightsList: [
      {
        name: 'Right to access',
        desc: 'You may obtain from us the confirmation as to whether or not personal data concerning you is being processed and get an access to such personal data. You are entitled to view, amend, or delete the personal information that we hold. Email your request to our data protection office at ask@tribesandcliqs.com and we will work with you to remove any of your personal data we may have.',
      },
      {
        name: 'Right to rectify',
        desc: 'Right to rectify your inaccurate Personal Information and to have incomplete personal data completed, including by means of providing a supplementary statement.',
      },
      {
        name: 'Right to erase',
        desc: 'Right to erase your Personal Information. Please note that a request to erase your Personal Information will also terminate your account on the Site. We will automatically and without undue delay erase your Personal Information when it is no longer necessary in relation to the purposes for which it was collected or otherwise processed.',
      },
      {
        name: 'Right to restrict processing',
        desc: 'Right to restrict processing of your Personal Information.',
      },
      {
        name: 'Right to data portability',
        desc: 'You may obtain from us the personal data concerning you and which you have provided to us and transmit it to another Personal Information Controller.',
      },
      {
        name: 'Right to object',
        desc: 'Right to object to processing of Your Personal Information.',
      },
      {
        name: 'Right to withdraw consent',
        desc: 'Right to withdraw your consent to the usage of your Personal Information at any time.',
      },
      {
        name: 'Right to lodge a complaint',
        desc: 'We take privacy concerns seriously. If you believe that we have not complied with this Privacy Policy with respect to your Personal Information, you may contact our respective Data Protection Office. We will investigate your complaint promptly and will reply you within 30 (thirty) calendar days.',
      },
    ],
  },
  {
    id: 'analytics',
    number: '8',
    title: 'ANALYTICS',
    paragraphs: [
      'When someone visits the website, we use a third-party service, Google Analytics, to collect standard internet log information and details of visitor behavior patterns. We do this to track things such as the number of visitors to the various parts of the site and interactions with the site. This information is processed in a way which does not identify anyone. We do not make and do not allow Google to make, any attempt to find out the identities of visitors to our website.',
    ],
  },
  {
    id: 'securing-privacy',
    number: '9',
    title: 'SECURING PRIVACY',
    paragraphs: [
      'To transfer data between our websites, our applications and backends, communication is encrypted using the SSL (Secure Socket Layer) encryption. We protect the systems and processing by a series of technical and organizational measures. These include data encryption, pseudonymization and anonymization, logical and physical access restriction and control, firewalls and recovery systems, and integrity testing. Our employees are regularly trained in the sensitive handling of personal data and are obliged to observe data secrecy in accordance with legal requirements.',
    ],
  },
  {
    id: 'minors',
    number: '10',
    title: 'MINORS',
    paragraphs: [
      'We do not knowingly gather or otherwise process personal data of minors under the age of 16. If we notice that one of our users/visitors is a minor we’ll immediately take steps to remove their information. If you believe we have processed or still hold information on minors, please send us an email at ask@tribesandcliqs.com and we’ll remove it A.S.A.P.',
    ],
  },
  {
    id: 'changes',
    number: '11',
    title: 'CHANGES IN THE PRIVACY STATEMENT',
    paragraphs: [
      'The effective date at the top of this page indicates when this Privacy Statement was last revised. We will notify you before any material change takes effect so that you have time to review the changes. Any change is effective when we post the revised Privacy Statement. Your use of the Services following these changes means that you accept the revised Privacy Statement.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#141A20] text-[#EFEFF1]">
      {/* Top Notice Header */}
      <div className="bg-[#1C232B] border-b border-[#262F38] py-3 px-4 text-xs text-[#949599]">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TRIBESANDCLIQS LIMITED Data Protection Governance</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Ghana Data Protection Act (Act 843)</span>
            <span>•</span>
            <span>EU GDPR Compliant</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#1C232B] to-[#141A20] border-b border-[#262F38] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#262F38] border border-[#3A4552] mb-6 shadow-xl"
          >
            <ShieldCheck className="w-8 h-8 text-[#D92626]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase"
          >
            Privacy Policy
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 text-sm font-semibold tracking-wide text-zinc-400"
          >
            TRIBESANDCLIQS LIMITED • Effective Date:{' '}
            <span className="text-white font-bold">{EFFECTIVE_DATE}</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 bg-[#1C232B]/90 border border-amber-500/30 rounded-2xl p-5 text-left text-sm text-zinc-300 leading-relaxed shadow-lg max-w-3xl mx-auto"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-1">
                  Please Read The Following Carefully
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  THIS STATEMENT PROVIDES GENERAL INFORMATION ABOUT THE PRIVACY STATEMENT OF THIS WEBSITE AND ITS RELATED APP. IF YOU ARE UNDER 18 YEARS OF AGE, PLEASE BE SURE TO READ THIS PRIVACY STATEMENT WITH YOUR PARENTS OR GUARDIAN AND ASK THEM QUESTIONS ABOUT WHAT YOU DO NOT UNDERSTAND.
                </p>
                <p className="text-xs font-semibold text-white mt-2">
                  YOUR USE OF THIS SERVICE CONSTITUTES ACCEPTANCE BY YOU OF THIS PRIVACY STATEMENT.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Preamble & Commitments */}
        <section className="bg-[#1C232B] border border-[#262F38] rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-extrabold text-white">Our Privacy Commitment</h2>
          <p className="text-zinc-300 text-sm leading-relaxed">
            <strong>TRIBESANDCLIQS LIMITED</strong> (collectively, “TRIBESANDCLIQS”, “we”, “our” and “us”.) has created this privacy statement (“Statement”) in order to demonstrate its firm commitment to the privacy of the details that you provide to us when using <a href="https://www.tribesandcliqs.app" className="text-[#D92626] font-semibold hover:underline" target="_blank" rel="noreferrer">www.tribesandcliqs.app</a> (“collectively “the website”), as the data controller for the purposes of Ghana’s Data Protection Act, and the EU General Data Protection Regulation (GDPR).
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            At TRIBESANDCLIQS, we are committed to maintaining the trust and confidence of all visitors to our website. In particular, we want you to know that the website is not in the business of selling, renting or trading email lists with other companies and businesses for marketing purposes.
          </p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            We believe your business is no one else’s. Your Privacy is important to you and to us. So, we’ll protect the information you share with us. To protect your privacy, TRIBESANDCLIQS follows different principles in accordance with worldwide practices for customer privacy and data protection:
          </p>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#141A20] border border-[#2B3540] rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                We won’t sell or give away your name, mail address, phone number, email address or any other information to anyone.
              </p>
            </div>
            <div className="bg-[#141A20] border border-[#2B3540] rounded-xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                We’ll use state-of-the-art security measures to protect your information from unauthorized users.
              </p>
            </div>
          </div>

          <p className="text-zinc-300 text-sm leading-relaxed pt-2">
            Therefore, to provide you with our services we need (and sometimes are obliged by the law) to collect your personal data. This Privacy Policy informs Users (“You”) of our policies regarding the processing of Personal Information we receive from Users of the website.
          </p>
        </section>

        {/* Data Controller Contact Card */}
        <section className="bg-gradient-to-r from-[#1C232B] via-[#212A34] to-[#1C232B] border border-[#2B3540] rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#D92626] mb-2">
            Data Controller &amp; Official Representative
          </p>
          <h3 className="text-lg font-bold text-white mb-4">TRIBESANDCLIQS LIMITED</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-zinc-300">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <span>7l Police Post Lane, Stadium Rd. Amasaman - Accra | Ghana</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <a href="tel:+233574555559" className="hover:text-white transition-colors">
                +233 574 555559
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
              <a href="mailto:ask@tribesandcliqs.com" className="hover:text-white transition-colors underline font-semibold">
                ask@tribesandcliqs.com
              </a>
            </div>
          </div>
        </section>

        {/* Numbered Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="bg-[#1C232B] border border-[#262F38] rounded-2xl p-6 sm:p-8 space-y-4 scroll-mt-24 shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-[#262F38] pb-4">
                <span className="w-8 h-8 rounded-lg bg-[#D92626]/10 border border-[#D92626]/30 text-[#D92626] font-extrabold flex items-center justify-center text-sm">
                  {section.number}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide uppercase">
                  {section.title}
                </h3>
              </div>

              {section.lead && (
                <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                  {section.lead}
                </p>
              )}

              {/* Subsections (for Section 1) */}
              {section.subsections && (
                <div className="space-y-6 pt-2">
                  {section.subsections.map((sub, sIdx) => (
                    <div key={sIdx} className="bg-[#141A20] border border-[#262F38] rounded-xl p-5 space-y-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D92626]" />
                        {sub.subtitle}
                      </h4>
                      {sub.intro && (
                        <p className="text-xs text-zinc-400 leading-relaxed">{sub.intro}</p>
                      )}
                      <ul className="space-y-2 pt-1">
                        {sub.items.map((item, iIdx) => (
                          <li key={iIdx} className="text-xs text-zinc-300 flex items-start gap-2.5 leading-relaxed">
                            <span className="text-[#D92626] font-bold mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Simple Paragraphs */}
              {section.paragraphs && (
                <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              )}

              {/* Bullet Items list */}
              {section.items && (
                <ul className="space-y-2.5 pt-1">
                  {section.items.map((item, iIdx) => (
                    <li key={iIdx} className="text-xs sm:text-sm text-zinc-300 flex items-start gap-3 leading-relaxed">
                      <span className="text-[#D92626] font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Rights list cards for Section 7 */}
              {section.rightsList && (
                <div className="grid sm:grid-cols-2 gap-3.5 pt-3">
                  {section.rightsList.map((r, rIdx) => (
                    <div
                      key={rIdx}
                      className="bg-[#141A20] border border-[#2B3540] rounded-xl p-4 space-y-1.5 hover:border-[#3E4A57] transition-colors"
                    >
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {r.name}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{r.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.closing && (
                <p className="text-sm text-zinc-300 leading-relaxed pt-2 border-t border-[#262F38]">
                  {section.closing}
                </p>
              )}
            </section>
          ))}
        </div>

        {/* Footer Navigation Box */}
        <div className="bg-[#1C232B] border border-[#262F38] rounded-2xl p-6 text-center space-y-4">
          <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
          <h4 className="text-base font-bold text-white">Questions about our Privacy Policy?</h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Our Data Protection Office is dedicated to keeping your information safe. Reach out to us at{' '}
            <a href="mailto:ask@tribesandcliqs.com" className="text-[#D92626] font-semibold underline">
              ask@tribesandcliqs.com
            </a>{' '}
            or call <span className="text-white font-medium">+233 574 555559</span>.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/terms"
              className="px-4 py-2 rounded-xl bg-[#262F38] text-xs font-semibold text-white hover:bg-[#323D48] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/refund"
              className="px-4 py-2 rounded-xl bg-[#262F38] text-xs font-semibold text-white hover:bg-[#323D48] transition-colors"
            >
              Refund Policy
            </Link>
            <Link
              to="/cookies"
              className="px-4 py-2 rounded-xl bg-[#262F38] text-xs font-semibold text-white hover:bg-[#323D48] transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
