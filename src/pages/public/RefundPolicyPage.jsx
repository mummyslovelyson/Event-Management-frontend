import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, ShieldAlert, CheckCircle2, Clock, AlertTriangle, FileText,
  Search, ExternalLink, HelpCircle, UserCheck, CalendarX, CreditCard,
  Copy, Check, ArrowRight, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { REFUND_POLICY_CIRCUMSTANCES } from '@/constants/refundPolicy';

const LAST_UPDATED = 'October 9, 2026';

const STATUTORY_CIRCUMSTANCES = [
  {
    clause: 1,
    id: '1_ORGANIZER_AUTHORIZED',
    title: 'Organizer Authorized Refunds',
    subtitle: 'Explicit Consent',
    description: 'Event Organizer has authorized refunds.',
    details: 'When an event organizer confirms or issues refund instructions via their organizer portal or written communication, TRIBESANDCLIQS executes the reversal to the original payment method.',
    icon: UserCheck,
    tag: 'Consent Granted',
    variant: 'emerald',
  },
  {
    clause: 2,
    id: '2_EVENT_CANCELLED',
    title: 'Event Cancellation',
    subtitle: 'Event Status Changed',
    description: 'Event Organizer has cancelled the event.',
    details: 'If an organizer marks their event as cancelled or fails to hold the event on the scheduled date, TRIBESANDCLIQS is granted full authority to initiate batch refunds for all ticket holders.',
    icon: CalendarX,
    tag: 'Automatic Reversal',
    variant: 'amber',
  },
  {
    clause: 3,
    id: '3_POTENTIAL_CHARGEBACK',
    title: 'Imminent Chargeback Risk',
    subtitle: 'Financial Dispute Risk',
    description: 'TRIBESANDCLIQS believes that the Transaction will result in a chargeback.',
    details: 'To protect payment gateway standing and minimize bank penalties, transactions identified as high-risk for banking reversals may be proactively refunded by TRIBESANDCLIQS.',
    icon: CreditCard,
    tag: 'Risk Mitigation',
    variant: 'rose',
  },
  {
    clause: 4,
    id: '4_TRANSACTION_ERROR_DUPLICATE',
    title: 'Transaction Error or Duplicate',
    subtitle: 'Technical / Gateway Error',
    description: 'TRIBESANDCLIQS believes that the Transaction was made in error, e.g. duplicate Transaction.',
    details: 'Verified duplicate charges or systemic payment anomalies are refunded immediately to prevent accidental double-billing of attendees.',
    icon: RotateCcw,
    tag: 'Technical Correction',
    variant: 'sky',
  },
  {
    clause: 5,
    id: '5_BUYER_CIRCUMSTANCES_UNRESPONSIVE_ORGANIZER',
    title: 'Buyer Circumstances & 1-Day Organizer SLA',
    subtitle: '24-Hour Review Window',
    description: 'TRIBESANDCLIQS believes the refund should be made due to Buyer’s circumstances and there has been no response from the Event Organizer within 1 day of refund request.',
    details: 'When a buyer submits a refund request citing valid circumstances, the Event Organizer is given a strict 1-day (24-hour) window to authorize or respond. If the organizer fails to respond within 1 day, TRIBESANDCLIQS reserves the legal right to approve and disburse the refund.',
    icon: Clock,
    tag: '1-Day Response Rule',
    variant: 'amber',
  },
  {
    clause: 6,
    id: '6_FRAUDULENT_TRANSACTION',
    title: 'Fraudulent Payment & Identity Theft',
    subtitle: 'Security Threat',
    description: 'TRIBESANDCLIQS believes the Transaction was fraudulent, e.g. because of identity theft, stolen credit cards.',
    details: 'Any transaction linked to unauthorized payment methods, stolen mobile money wallets, or identity theft will be voided and refunded to prevent financial crime.',
    icon: ShieldAlert,
    tag: 'Anti-Fraud Protection',
    variant: 'rose',
  },
  {
    clause: 7,
    id: '7_LOCATION_OBFUSCATION_PROXY',
    title: 'Location Obfuscation & Proxy Usage',
    subtitle: 'Integrity Violation',
    description: 'Event Organizer created or used a proxy or other means to obfuscate their real location.',
    details: 'Organizers utilizing anonymizing VPNs, proxy networks, or fraudulent geolocation headers to misrepresent origin are subject to event suspension and automatic refund of collected attendee funds.',
    icon: AlertTriangle,
    tag: 'Identity & Geo-Audit',
    variant: 'purple',
  },
  {
    clause: 8,
    id: '8_EVENT_FRAUD_REPORTS',
    title: 'Prior Event Fraud Notifications',
    subtitle: 'Incident Alerts',
    description: 'TRIBESANDCLIQS has already been contacted about fraudulent Transactions from the Event Organizer’s event.',
    details: 'If multiple consumer alerts or bank fraud warnings indicate an ongoing scam or unauthorized charges originating from the event listing, refunds will be issued to protect patrons.',
    icon: AlertTriangle,
    tag: 'Patron Safeguard',
    variant: 'rose',
  },
  {
    clause: 9,
    id: '9_TERMS_OR_PAYMENT_NON_COMPLIANCE',
    title: 'Terms of Service & Payment Provider Breach',
    subtitle: 'Regulatory Non-Compliance',
    description: 'The Event Organizer’s event does not comply with the terms of this Agreement and/or the Terms of Service of the Credit Card Processing (Payment Provider) of the event.',
    details: 'Violations of payment aggregator underwriting terms (e.g., Paystack acceptable use guidelines) or TRIBESANDCLIQS Platform terms grant the right to refund affected ticket sales.',
    icon: FileText,
    tag: 'Compliance Enforcement',
    variant: 'indigo',
  },
  {
    clause: 10,
    id: '10_EVENT_SUSPECTED_FRAUDULENT',
    title: 'Suspected Fraudulent Event',
    subtitle: 'Consumer Protection',
    description: 'TRIBESANDCLIQS believes the event is fraudulent, either due to consumer reports or other information.',
    details: 'Where investigative findings or customer reports establish reasonable suspicion that an event will not occur or is deceptive, TRIBESANDCLIQS has full authority to refund tickets.',
    icon: ShieldAlert,
    tag: 'Safety Intervention',
    variant: 'rose',
  },
];

const GENERAL_SECTIONS = [
  {
    title: 'Overview & Marketplace Relationship',
    content: 'TRIBESANDCLIQS operates as an event discovery and ticketing platform connecting event organizers and attendees. Event Organizers using the Service agree to grant TRIBESANDCLIQS the right to make refunds on their event upon the occurrence of any of the ten statutory circumstances outlined in this agreement.',
  },
  {
    title: 'The 1-Day (24 Hours) Organizer Response SLA',
    content: 'In situations involving Buyer circumstances (Clause 5), organizers are notified electronically upon submission of a refund request. Organizers maintain a strict 24-hour (1 calendar day) period to either approve the request or present legitimate justification for decline. If no response is submitted within 24 hours, TRIBESANDCLIQS is authorized to intervene and execute the refund.',
  },
  {
    title: 'Disbursement & Reversal Methods',
    content: 'Approved refunds are returned to the original payment method used during checkout — including Mobile Money (MTN MoMo, Telecel Cash, AT Money) and debit/credit cards (Visa, Mastercard) via our payment gateway processor (Paystack). Transaction reflection times typically span 24 to 72 business hours depending on telecom networks and issuing banks.',
  },
  {
    title: 'Organizer Liability & Platform Settlement',
    content: 'Organizers acknowledge that funds refunded under any of the 10 statutory conditions will be deducted from their pending wallet balance or reclaimed from upcoming payouts. Any chargeback fees, fines, or gateway surcharges resulting from unauthorized organizer conduct will be billed to the organizer.',
  },
];

export default function RefundPolicyPage() {
  const [activeTab, setActiveTab] = useState('clauses');
  const [search, setSearch] = useState('');
  const [copiedClause, setCopiedClause] = useState(null);

  const filteredClauses = STATUTORY_CIRCUMSTANCES.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.details.toLowerCase().includes(q) ||
      String(c.clause).includes(q)
    );
  });

  const handleCopyCitation = (c) => {
    const citation = `TRIBESANDCLIQS Refund Policy Clause ${c.clause}: "${c.description}"`;
    navigator.clipboard.writeText(citation);
    setCopiedClause(c.clause);
    toast.success(`Copied Clause ${c.clause} citation to clipboard`);
    setTimeout(() => setCopiedClause(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0E1216] text-[#EFEFF1]">
      {/* ─── HERO HEADER ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#141920] to-[#0E1216] border-b border-[#262B2F]/60 py-20 px-4 sm:px-6">
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-emerald-500/10 to-transparent blur-3xl rounded-full" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181E24] border border-[#262B2F] text-xs font-semibold text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            Official Platform Terms &amp; Conditions
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            TRIBESANDCLIQS LIMITED <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              REFUND &amp; CANCELLATION POLICY
            </span>
          </h1>

          <p className="text-base text-[#949599] max-w-2xl mx-auto leading-relaxed">
            Event Organizers using the Service agree to grant <strong className="text-white">TRIBESANDCLIQS</strong> the right to make refunds on their event upon the occurrence of any of the ten statutory circumstances listed below.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-[#949599]">
            <span className="flex items-center gap-1.5 bg-[#14181C] px-3 py-1.5 rounded-lg border border-[#262B2F]">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Effective Date: {LAST_UPDATED}
            </span>
            <span className="flex items-center gap-1.5 bg-[#14181C] px-3 py-1.5 rounded-lg border border-[#262B2F]">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              10 Legally Binding Clauses
            </span>
            <span className="flex items-center gap-1.5 bg-[#14181C] px-3 py-1.5 rounded-lg border border-[#262B2F]">
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              1-Day Organizer Review SLA
            </span>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-[#262B2F]">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#14181C] border border-[#262B2F]">
            <button
              onClick={() => setActiveTab('clauses')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'clauses'
                  ? 'bg-amber-400 text-[#0E1216] shadow-sm'
                  : 'text-[#949599] hover:text-white'
              }`}
            >
              10 Policy Circumstances
            </button>
            <button
              onClick={() => setActiveTab('sla')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'sla'
                  ? 'bg-amber-400 text-[#0E1216] shadow-sm'
                  : 'text-[#949599] hover:text-white'
              }`}
            >
              1-Day Response SLA
            </button>
            <button
              onClick={() => setActiveTab('provisions')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'provisions'
                  ? 'bg-amber-400 text-[#0E1216] shadow-sm'
                  : 'text-[#949599] hover:text-white'
              }`}
            >
              General Terms
            </button>
          </div>

          {activeTab === 'clauses' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#949599] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search policy clauses..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#14181C] border border-[#262B2F] text-xs text-white placeholder-[#949599] focus:outline-none focus:border-amber-400/50 transition"
              />
            </div>
          )}
        </div>

        {/* ─── TAB 1: 10 POLICY CIRCUMSTANCES ─── */}
        {activeTab === 'clauses' && (
          <div className="space-y-6">
            <div className="bg-[#14181C] border border-amber-400/20 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-xs leading-relaxed space-y-1">
                <h3 className="font-bold text-white text-sm">Organizer Contractual Agreement</h3>
                <p className="text-[#949599]">
                  By publishing events and selling tickets on TRIBESANDCLIQS, all Event Organizers grant the Platform irrevocable authority to disburse refunds under any of the 10 circumstances below without requiring further organizer consent.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClauses.map((c) => {
                const IconComponent = c.icon;
                const isCopied = copiedClause === c.clause;
                return (
                  <motion.div
                    key={c.clause}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group rounded-2xl bg-[#14181C] border border-[#262B2F] p-5 hover:border-amber-400/30 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center font-bold text-xs text-amber-400 font-mono">
                            #{c.clause}
                          </span>
                          <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md bg-[#1D232A] text-[#949599] border border-[#262B2F]">
                            {c.tag}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyCitation(c)}
                          title="Copy legal citation"
                          className="p-1.5 rounded-lg text-[#949599] hover:text-white hover:bg-[#1C232B] transition"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                          {c.title}
                        </h4>
                        <p className="text-xs font-medium text-amber-400/90 mt-1 italic">
                          "{c.description}"
                        </p>
                      </div>

                      <p className="text-xs text-[#949599] leading-relaxed">
                        {c.details}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#262B2F]/60 flex items-center justify-between text-[11px] text-[#949599]">
                      <span className="font-mono">Clause {c.clause} of 10</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enforceable
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredClauses.length === 0 && (
              <div className="text-center py-12 text-[#949599] text-sm">
                No policy circumstances match your search term.
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: 1-DAY RESPONSE SLA ─── */}
        {activeTab === 'sla' && (
          <div className="space-y-8">
            <div className="rounded-2xl bg-[#14181C] border border-[#262B2F] p-6 sm:p-8 space-y-6">
              <div className="max-w-2xl">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Clause 5 Deep Dive</span>
                <h3 className="text-2xl font-extrabold text-white mt-1">The 1-Day (24 Hours) Response Standard</h3>
                <p className="text-sm text-[#949599] mt-2 leading-relaxed">
                  To protect attendees from being left unanswered, TRIBESANDCLIQS enforces a strict 24-hour SLA when an attendee files a refund request.
                </p>
              </div>

              {/* Timeline graphic */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-xl bg-[#181E24] border border-[#262B2F] space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center font-bold text-sky-400 text-xs">
                    01
                  </div>
                  <h4 className="font-bold text-white text-sm">Request Submitted</h4>
                  <p className="text-xs text-[#949599] leading-relaxed">
                    Buyer requests refund under qualifying circumstances from My Bookings. Organizer receives automated email and dashboard notification.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#181E24] border border-amber-400/30 space-y-2 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center font-bold text-amber-400 text-xs">
                    02
                  </div>
                  <h4 className="font-bold text-white text-sm">24-Hour Organizer Window</h4>
                  <p className="text-xs text-[#949599] leading-relaxed">
                    Organizer reviews the request and either authorizes it or submits a justified decline before the countdown expires.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#181E24] border border-emerald-500/30 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs">
                    03
                  </div>
                  <h4 className="font-bold text-white text-sm">Resolution or Platform Reversal</h4>
                  <p className="text-xs text-[#949599] leading-relaxed">
                    If authorized, funds revert immediately. If no organizer response occurs within 1 day, TRIBESANDCLIQS auto-processes the refund under Clause 5.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#14181C] border border-[#262B2F] p-6 space-y-3">
              <h4 className="text-sm font-bold text-white">How Organizers Can Avoid Automatic Interventions</h4>
              <ul className="text-xs text-[#949599] space-y-2 list-disc pl-5">
                <li>Check the <strong className="text-white">Orders &amp; Refunds</strong> section of your Organizer Dashboard daily.</li>
                <li>Set up notifications to receive email and in-app alerts whenever a buyer submits a refund claim.</li>
                <li>Provide prompt written justifications if an attendee does not meet your event's specific refund terms.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ─── TAB 3: GENERAL PROVISIONS ─── */}
        {activeTab === 'provisions' && (
          <div className="space-y-6">
            {GENERAL_SECTIONS.map((sec, i) => (
              <div key={i} className="rounded-2xl bg-[#14181C] border border-[#262B2F] p-6 space-y-2">
                <h3 className="text-base font-bold text-white">{sec.title}</h3>
                <p className="text-xs text-[#949599] leading-relaxed">{sec.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* ─── BOTTOM HELP CTA ─── */}
        <div className="rounded-3xl bg-gradient-to-r from-[#171D24] via-[#14181C] to-[#171D24] border border-[#262B2F] p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1E252D] border border-[#262B2F] text-amber-400 mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Questions or Need Dispute Assistance?</h3>
            <p className="text-xs text-[#949599] max-w-md mx-auto mt-1">
              Our trust &amp; safety dispute team reviews all complex circumstances to guarantee fair treatment for attendees and organizers alike.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/contact"
              className="px-5 py-2.5 rounded-xl bg-amber-400 text-[#0E1216] text-xs font-bold hover:bg-amber-300 transition shadow-sm"
            >
              Contact Dispute Support
            </Link>
            <Link
              to="/attendee/bookings"
              className="px-5 py-2.5 rounded-xl bg-[#1C232B] text-white border border-[#262B2F] text-xs font-bold hover:bg-[#252E38] transition"
            >
              View My Bookings
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
