import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, ShieldCheck, Scale, CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = '1st day of February 2023';

const sections = [
  {
    num: '1',
    title: 'USAGE / ELIGIBILITY',
    paragraphs: [
      'You will use this site in a manner consistent with any, and all, applicable laws, legislation, rules and regulations. If you violate any restrictions in these terms, you agree to indemnify TRIBESANDCLIQS for any losses, costs or damages, including reasonable legal fees, incurred by TRIBESANDCLIQS in relation to, or arising out of, such a breach.',
    ],
  },
  {
    num: '2',
    title: 'ACCEPTANCE OF TERMS',
    paragraphs: [
      'These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity (“you” or “your” or “user”) and TRIBESANDCLIQS LTD (“TRIBESANDCLIQS”, “we”, “us” or “our”), concerning your access to and use of the website and mobile applications. You agree that by accessing the Site and or use the application, you have read, understood, and agree to be bound by the terms and conditions and Privacy Policy incorporated. IF YOU DO NOT AGREE WITH ALL OF THESE TOU, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.',
      'By accepting these conditions, you also agree and understand that ours is a platform for event listings and ticket sales, and you agree to release us from any liability that may arise as a result of an event organized by a registered organizer on the platform.',
      'In these Terms, “you” and “your” refer to the individual or entity that uses the Site, or Services. “We”, “us”, or “our” refer to TRIBESANDCLIQS. In addition, in these Terms, unless the context requires otherwise, words in one gender include all genders and words in the singular include the plural and vice-versa.',
    ],
  },
  {
    num: '3',
    title: 'ABOUT TRIBESANDCLIQS SERVICES',
    paragraphs: [
      'TRIBESANDCLIQS is an online self-ticketing platform that allows you to easily curate events and give your visitors with the best booking experience possible. We assist individuals in sharing, discovering, and participating in activities that link their interests and enliven their lives. Our ultimate objective is to unite people from all walks of life via live experiences, from festivals and corporate events to fundraisers, concerts, personal event invitations and everything in between.',
      'We hope to become your go-to place for curating and purchasing online tickets for any event. We attempt to make the planning and purchasing process as simple and straightforward as possible. We are also committed to staying on the cutting edge of technology, always upgrading and developing our platform to give our clients with the greatest possible experience.',
    ],
  },
  {
    num: '4',
    title: 'ACCEPTABLE USES',
    lead: 'By registering your event on the Website, you agree that you are solely responsible for any and all acts and omissions that occur while you use the Website, and you agree not to engage in unacceptable use of the Website. TRIBESANDCLIQS reserves the right to permanently remove your content, your event listing and or your account from TRIBESANDCLIQS, for any reason and to take any legal action that is otherwise necessary to enforce this Agreement. This includes unacceptable use of the Service, violations of this Agreement, or violation of the terms of services of our payment processors.',
    paragraphs: [
      'TRIBESANDCLIQS has sole discretion over what is deemed acceptable or unacceptable use. Your content must be genuine, honest and not fraudulent. You may not use the Website to post content (including photos, logos, videos and copy) or engage in any conduct that is fraudulent, offensive, illegal, harmful, or inappropriate for general audiences and further agree that you will not:',
    ],
    items: [
      'Behave in an abusive manner to any other user of the Website;',
      'Violate any venue or Event Organizer’s rules at events or violate any applicable third-party terms of service (for instance, when using our mobile applications);',
      'Contact or invite contact with other users of the Website for any reason other than the purpose for which you received the user’s contact information;',
      'Use the Buyer’s personal data for any reason other than the delivery of tickets unless otherwise agreed to by the Buyer;',
      'Breach or circumvent any laws, third party rights or the Additional Terms and Conditions;',
      'Post false, inaccurate, misleading, defamatory or libellous content;',
      'Fail to fulfill your contractual obligations regarding the sale or purchase of a ticket;',
      'Use our trademarks without our prior written permission;',
      'Copy, reproduce, reverse engineer, modify, create derivative works from, distribute or publicly display any content (except for your information) or software from the Website or our Service without our prior express written permission and the appropriate third party, as applicable;',
      'Use any robot, spider, scraper or other automated means to access the Website or our Service for any purpose without our express written permission;',
      'Take any action that imposes or may impose (to be determined in our sole discretion) an unreasonable or disproportionately large load on our infrastructure;',
      'Interfere or attempt to interfere with the proper working of the Website or our Service or any activities conducted on or with the Website or our Service;',
      'Bypass our robot exclusion headers, robots.txt rules or any other measures we may use to prevent or restrict access to the Website or our Service; or',
      'Do anything else that we determine, in our sole reasonable discretion, misuses the Website or our Service or otherwise negatively impacts our marketplace.',
    ],
    prohibitedCategories: [
      'Lotteries, auctions and games of chance;',
      'Adult content or sexually related services, including escort services or Pornography;',
      'Illegal services or illicit substances;',
      'Travel and transportation services; or',
      'High risk businesses or services.',
    ],
    closing:
      'TRIBESANDCLIQS monitors the Website\'s content and takes every effort to ensure that it conforms with the terms of this Agreement. TRIBESANDCLIQS offers event organizers a ticketing and registration platform via which they may sell tickets to their own events. The Website may not be used to resell or sell tickets to any event that you are not the owner or organizer of. You may not use the Website to sell tangible items or merchandise unless it is in connection with an event hosted on the Website.',
  },
  {
    num: '5',
    title: 'EMAIL RULES',
    lead: 'If you use email through the website to communicate, you represent and agree that:',
    items: [
      'You have the right and authority to send emails to the addresses on your recipient list and such addresses were gathered in accordance with email marketing regulations in the recipient’s country of residence;',
      'Your emails are not sent in violation of any privacy policy under which the recipient emails were gathered;',
      'You will use email in compliance with all applicable local, state, provincial, national and other laws, rules and regulations, including those relating to spam and email;',
      'You will only use email, through the Website, to advertise, promote and/or manage a bona fide event listed on the Service;',
      'Your use of email and the content of your emails complies with this Agreement (including Unacceptable Use rules);',
      'You will not use false or misleading headers or deceptive subject lines in your emails;',
      'You will respond immediately and in accordance with instructions to any email sent to you by TRIBESANDCLIQS requesting you to modify a consumer’s email preferences; and',
      'You will provide an accessible and unconditional unsubscribe link for inclusion in every email where one is required, and you will not send any emails to any recipient who has unsubscribed from your mailing list.',
    ],
    closing:
      'If you violate any of these rules regarding use of email, or if your use results in excessive bounce rates or complaints, TRIBESANDCLIQS may limit or suspend your access to email provided through the Website.',
  },
  {
    num: '6',
    title: 'EXCLUSION OF LIABILITY FOR EXTERNAL LINKS',
    paragraphs: [
      'The Website may provide links to external Internet sites. TRIBESANDCLIQS hereby declares explicitly that it has no influence on the layout or content of linked pages and dissociates itself expressly from all contents of all linked pages of third parties. TRIBESANDCLIQS shall not be liable for the use or content of Internet sites that link to this site or which are linked from it. Our privacy and cookie notice do not apply to any collection and processing of your personal data on or through such external sites.',
    ],
  },
  {
    num: '7',
    title: 'INTELLECTUAL PROPERTY',
    paragraphs: [
      'Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the “Content”) and the trademarks, service marks, and logos contained therein (the “Marks”) are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights and unfair competition laws of Ghana, foreign jurisdictions, and international conventions.',
      'The Content and the Marks are provided on the Site “AS IS” for your information and personal use only. Except as expressly provided in these Terms of Use, no part of the Site and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.',
      'Provided that you are eligible to use the Site, you are granted a limited license to access and use the Site and to download or print a copy of any portion of the Content to which you have properly gained access solely for your personal, non-commercial use. We reserve all rights not expressly granted to you in and to the Site, the Content, and the Marks.',
    ],
  },
  {
    num: '8',
    title: 'YOUR REPRESENTATIONS',
    lead: 'By using the Site, you represent and warrant that:',
    items: [
      '(1) All registration information you submit will be true, accurate, current, and complete;',
      '(2) You will maintain the accuracy of such information and promptly update such registration information as necessary;',
      '(3) You have the legal capacity and you agree to comply with these Terms of Use;',
      '(4) You are not under the age of 18;',
      '(5) You are not a minor in the jurisdiction of which you reside, or if a minor, you have received parental permission to use the Site;',
      '(6) You will not access the Site through automated or non-human means, whether through a bot, script, or otherwise;',
      '(7) You will not use the Site for any illegal or unauthorized purpose; and',
      '(8) Your use of the Site will not violate any applicable law or regulation.',
    ],
    closing:
      'If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Site (or any portion thereof).',
  },
  {
    num: '9',
    title: 'ACCURACY, COMPLETENESS AND TIMELINESS OF INFORMATION',
    paragraphs: [
      'We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions without consulting primary, more accurate, more complete or timelier sources of information. Any reliance on the material on this site is at your own risk.',
      'This site may contain certain historical information. Historical information, necessarily, is not current and is provided for your reference only. We reserve the right to modify the contents of this site at any time, but we have no obligation to update any information on our site. You agree that it is your responsibility to monitor changes to our site, including these Terms of Service and the Privacy Policy.',
    ],
  },
  {
    num: '10',
    title: 'SCOPE OF OFFERINGS',
    paragraphs: [
      'TRIBESANDCLIQS may periodically make improvements, add, change, and/or update the information and documents on the Website without notice. TRIBESANDCLIQS assumes no liability or responsibility whatsoever for any errors or omissions, including technical inaccuracies and typographical errors, in the content of the Website. Information we publish on the Website may contain references or cross references to certain TRIBESANDCLIQS products, programs, or services that are unannounced or only available in Ghana. Such references do not imply that TRIBESANDCLIQS intends to announce or make available such products, programs, or services in any other jurisdiction.',
    ],
  },
  {
    num: '11',
    title: 'TERM OF SALE',
    paragraphs: [
      'Each ticket purchased by Buyer is a license to attend a specific event granted by the Event Organizer. ALL SALES ARE FINAL; NO REFUNDS OR EXCHANGES. Tickets sold through the Website grant a revocable license to the Buyer that may be revoked at any time for any reason without compensation. Resale or attempted resale of any ticket issued hereunder at a price higher than the face value appearing thereon is grounds for seizure and cancellation without compensation.',
      'The Buyer assumes all risk or danger incidental to the attraction, whether occurring prior to, during, or subsequent to, the actual attraction. The terms of sale of each ticket issued pursuant to a Transaction initiated on the Website are subject to any and all terms imposed by the applicable Event Organizer. In order to be admitted to an event, each Buyer must present the original ticket in its original, undamaged, unaltered form, to the applicable venue at the appropriate time.',
      'Entry may be refused for various reasons, including misconduct, failure to comply with any safety and health policies required by the venue where you will attend any event, intoxication, etc., as determined by the Event Organizer (in its sole discretion). If you are refused entry for any such reason, you shall not be eligible for any refund or compensation from TRIBESANDCLIQS.',
    ],
  },
  {
    num: '12',
    title: 'FEES & MODE OF PAYMENT',
    paragraphs: [
      'You agree to pay all fees in accordance with the fee descriptions published by TRIBESANDCLIQS on the Website and any other fees applicable to a Transaction. Fees are subject to change without prior notice at any time, so you should review the fees each time you use the Website. Payments of transactions on the site can be done with the use of MOBILE MONEY, DEBIT OR CREDIT CARD, PAYPAL, and/or SWIPE.',
      'Notwithstanding anything to the contrary herein, in the event of any refunds of Transactions by an Event Organizer (or the cancellation of any events associated with such Transactions) and/or any Force Majeure event, you agree that TRIBESANDCLIQS shall be entitled to retain any fees charged by TRIBESANDCLIQS in connection with its processing and facilitation of any such Transactions.',
    ],
  },
  {
    num: '13',
    title: 'NO WARRANTIES / LIMITATION OF LIABILITY / INDEMNIFICATION / ASSUMPTION OF RISK / DISCLAIMER',
    paragraphs: [
      'ALL TRIBESANDCLIQS SERVICES, INCLUDING THE INFORMATION, CONTENT, THE SERVICE AND MATERIALS MADE AVAILABLE BY THIRD PARTY SERVICE PROVIDERS ARE PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED. TRIBESANDCLIQS DISCLAIMS ALL WARRANTIES IN CONNECTION THEREWITH, INCLUDING, WITHOUT LIMITATION, ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'IN NO EVENT SHALL TRIBESANDCLIQS BE LIABLE FOR ANY SPECIAL, INDIRECT, CONSEQUENTIAL, INCIDENTAL DAMAGES OR SIMILAR DAMAGES, OR DAMAGES FOR LOST PROFITS, LOST REVENUE, OR LOSS OF DATA OR ITS USE, ARISING OUT OF OR RELATING TO THE TRIBESANDCLIQS WEBSITE OR OTHERWISE, WHETHER IN CONTRACT OR TORT, INCLUDING NEGLIGENCE, STATUTORY OR OTHERWISE.',
      'IN THE EVENT TRIBESANDCLIQS IS LIABLE FOR ANY DAMAGES ARISING IN CONNECTION WITH THE WEBSITE OR OTHERWISE, SUCH LIABILITY SHALL BE LIMITED TO DIRECT DAMAGES NOT TO EXCEED THE FEES ACTUALLY RECEIVED BY TRIBESANDCLIQS FOR THE AFFECTED TRANSACTIONS.',
      'TRIBESANDCLIQS DISCLAIMS ANY AND ALL LIABILITY FOR THE ACTS, OMISSIONS OR CONDUCT OF ANY THIRD PARTIES IN CONNECTION WITH OR RELATED TO ANY TRANSACTION OR YOUR USE OF THE WEBSITE OR THE SERVICE. ATTENDING ANY EVENT FOR WHICH TICKETS MAY BE PURCHASED ON OR THROUGH THE WEBSITE IS A POTENTIALLY DANGEROUS ACTIVITY AND INVOLVES THE RISK OF SERIOUS INJURY, DISABILITY, DEATH, AND/OR PROPERTY DAMAGE.',
      'YOU FURTHER ACKNOWLEDGE THAT YOU ARE AWARE OF THE HIGHLY CONTAGIOUS NATURE OF BACTERIAL AND VIRAL DISEASES, INCLUDING COVID-19, AND AGREE TO ACCEPT AND ASSUME ALL RISKS ARISING FROM ATTENDING EVENTS, WHETHER CAUSED BY THE ORDINARY NEGLIGENCE OF TRIBESANDCLIQS OR OTHERWISE. YOU EXPRESSLY WAIVE AND RELEASE ANY AND ALL CLAIMS AGAINST TRIBESANDCLIQS AND ITS OFFICERS, EMPLOYEES, AGENTS, AND AFFILIATES.',
      'YOU AGREE TO INDEMNIFY AND HOLD HARMLESS TRIBESANDCLIQS FROM AND AGAINST ANY LOSSES, COSTS, PAYMENTS, DAMAGES, LIABILITIES AND EXPENSES (INCLUDING REASONABLE ATTORNEY’S FEES) ARISING OUT OF YOUR BREACH OF THESE TERMS, USE OF THE SERVICE, OR ATTENDANCE AT ANY EVENT.',
    ],
  },
  {
    num: '14',
    title: 'CLAIMS OF COPYRIGHT INFRINGEMENT (DMCA)',
    paragraphs: [
      'Under the Digital Millennium Copyright Act of 1998 (the “DMCA”), if you believe in good faith that any content on the Website infringes your copyright, you may send us a notice requesting that the content be removed. The notice must include:',
    ],
    items: [
      '(a) Your (or your agent’s) physical or electronic signature;',
      '(b) Identification of the copyrighted work claimed to have been infringed;',
      '(c) Identification of the content claimed to be infringing and reasonably sufficient location information;',
      '(d) Your name, address, telephone number, and email address;',
      '(e) A statement that you have a good faith belief that the use is not authorized; and',
      '(f) A statement under penalty of perjury that the information is accurate and you are authorized to act on behalf of the copyright owner.',
    ],
    closing:
      'Notices and counter-notices should be sent to: ask@tribesandcliqs.com. There can be penalties for false claims under the DMCA.',
  },
  {
    num: '15',
    title: 'FORCE MAJEURE',
    paragraphs: [
      'We shall not be deemed in default or otherwise liable under this Agreement due to our inability to perform our obligations by reason of any act of God, fire, earthquake, substantial snowstorm, flood, epidemic, pandemic, accident, explosion, casualty, strike, lockout, labor controversy, riot, civil disturbance, act of public enemy, embargo, war, any law ordinance or regulation, legal order, or any failure or delay of transportation, power, or communications system beyond our control.',
    ],
  },
  {
    num: '16',
    title: 'CHANGES',
    paragraphs: [
      'If TRIBESANDCLIQS decides to change these general terms and conditions, we will post the changed terms and conditions on the Website. You are advised to regularly check whether they have changed. Existing contracts will not be affected by such changes.',
    ],
  },
  {
    num: '17',
    title: 'GOVERNING LAW AND JURISDICTION',
    paragraphs: [
      'This general terms and conditions in relation to the use of the site is hereby governed by, and constructed and enforced in accordance with the laws of Ghana. The competent courts in Ghana shall have the exclusive jurisdiction to resolve any dispute between you and TRIBESANDCLIQS.',
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#141A20] text-[#EFEFF1]">
      {/* Top Banner */}
      <div className="bg-[#1C232B] border-b border-[#262F38] py-3 px-4 text-xs text-[#949599]">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>TRIBESANDCLIQS LIMITED Governance &amp; User Agreement</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Republic of Ghana</span>
            <span>•</span>
            <span>Global Operations</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#1C232B] to-[#141A20] border-b border-[#262F38] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#262F38] border border-[#3A4552] mb-6 shadow-xl"
          >
            <Scale className="w-8 h-8 text-[#D92626]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase"
          >
            Terms &amp; Conditions
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
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-1">
                  Binding Legal Agreement — Please Read Carefully
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  These Terms of Service govern your access to and use of TRIBESANDCLIQS services, content, and mobile applications. By accessing, browsing, or using the Site or Services, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service and our Privacy Policy.
                </p>
                <p className="text-xs font-semibold text-white mt-2">
                  IF YOU DO NOT AGREE TO THESE TERMS, DO NOT USE ANY PORTION OF THE SITE OR SERVICES.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Company Registration Card */}
        <section className="bg-[#1C232B] border border-[#262F38] rounded-2xl p-6 sm:p-8 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#D92626]">
            Company Information &amp; Official Notice
          </p>
          <h2 className="text-xl font-extrabold text-white">TRIBESANDCLIQS LIMITED</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Registered under the laws of the Republic of Ghana. Operating online via{' '}
            <a href="https://www.tribesandcliqs.app" className="text-[#D92626] font-semibold hover:underline" target="_blank" rel="noreferrer">
              www.tribesandcliqs.app
            </a>{' '}
            and associated web &amp; mobile platforms.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 pt-2 text-xs text-zinc-300">
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
              <a href="mailto:ask@tribesandcliqs.com" className="hover:text-white underline font-semibold">
                ask@tribesandcliqs.com
              </a>
            </div>
          </div>
        </section>

        {/* 17 Numbered Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.num}
              id={`section-${section.num}`}
              className="bg-[#1C232B] border border-[#262F38] rounded-2xl p-6 sm:p-8 space-y-4 scroll-mt-24 shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-[#262F38] pb-4">
                <span className="w-8 h-8 rounded-lg bg-[#D92626]/10 border border-[#D92626]/30 text-[#D92626] font-extrabold flex items-center justify-center text-sm">
                  {section.num}
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

              {/* Paragraphs */}
              {section.paragraphs && (
                <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              )}

              {/* Items */}
              {section.items && (
                <ul className="space-y-2 pt-1">
                  {section.items.map((item, iIdx) => (
                    <li key={iIdx} className="text-xs sm:text-sm text-zinc-300 flex items-start gap-2.5 leading-relaxed">
                      <span className="text-[#D92626] font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Prohibited Categories if present */}
              {section.prohibitedCategories && (
                <div className="bg-[#141A20] border border-red-500/20 rounded-xl p-4 mt-3 space-y-2">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    Expressly Prohibited Activities &amp; Services:
                  </p>
                  <ul className="space-y-1.5">
                    {section.prohibitedCategories.map((cat, cIdx) => (
                      <li key={cIdx} className="text-xs text-zinc-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span>{cat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {section.closing && (
                <p className="text-sm text-zinc-400 leading-relaxed pt-2 border-t border-[#262F38]">
                  {section.closing}
                </p>
              )}
            </section>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="bg-[#1C232B] border border-[#262F38] rounded-2xl p-6 text-center space-y-4">
          <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
          <h4 className="text-base font-bold text-white">Questions or Notices regarding these Terms?</h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Contact TRIBESANDCLIQS legal and support team at{' '}
            <a href="mailto:ask@tribesandcliqs.com" className="text-[#D92626] font-semibold underline">
              ask@tribesandcliqs.com
            </a>{' '}
            or call <span className="text-white font-medium">+233 574 555559</span>.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/privacy"
              className="px-4 py-2 rounded-xl bg-[#262F38] text-xs font-semibold text-white hover:bg-[#323D48] transition-colors"
            >
              Privacy Policy
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
