/**
 * TRIBESANDCLIQS LIMITED REFUND/CANCELLATION POLICY CONSTANTS
 * 
 * Statutory Grounds under which TRIBESANDCLIQS is granted the right to make refunds
 * on behalf of event organizers.
 */

export const REFUND_POLICY_CIRCUMSTANCES = [
  {
    id: '1_ORGANIZER_AUTHORIZED',
    clauseNumber: 1,
    title: 'Organizer Authorized Refund',
    shortTitle: 'Organizer Authorized',
    description: 'Event Organizer has authorized refunds',
    initiatedBy: ['organizer', 'admin'],
    category: 'Organizer Consent',
    badgeVariant: 'success',
  },
  {
    id: '2_EVENT_CANCELLED',
    clauseNumber: 2,
    title: 'Event Cancelled by Organizer',
    shortTitle: 'Event Cancelled',
    description: 'Event Organizer has cancelled the event',
    initiatedBy: ['organizer', 'admin', 'system'],
    category: 'Event Status',
    badgeVariant: 'warning',
  },
  {
    id: '3_POTENTIAL_CHARGEBACK',
    clauseNumber: 3,
    title: 'Imminent Chargeback Risk',
    shortTitle: 'Chargeback Risk',
    description: 'TRIBESANDCLIQS believes that the Transaction will result in a chargeback',
    initiatedBy: ['admin', 'system'],
    category: 'Financial Protection',
    badgeVariant: 'error',
  },
  {
    id: '4_TRANSACTION_ERROR_DUPLICATE',
    clauseNumber: 4,
    title: 'Transaction Error / Duplicate Charge',
    shortTitle: 'Duplicate / Error',
    description: 'TRIBESANDCLIQS believes that the Transaction was made in error, e.g. duplicate Transaction',
    initiatedBy: ['buyer', 'admin', 'system'],
    category: 'Payment Error',
    badgeVariant: 'info',
  },
  {
    id: '5_BUYER_CIRCUMSTANCES_UNRESPONSIVE_ORGANIZER',
    clauseNumber: 5,
    title: 'Buyer Circumstances & Organizer Unresponsive (>1 Day)',
    shortTitle: 'Organizer Unresponsive (1 Day)',
    description: 'TRIBESANDCLIQS believes the refund should be made due to Buyer’s circumstances and there has been no response from the Event Organizer within 1 day of refund request',
    initiatedBy: ['admin', 'system'],
    category: 'SLA Intervention',
    badgeVariant: 'warning',
  },
  {
    id: '6_FRAUDULENT_TRANSACTION',
    clauseNumber: 6,
    title: 'Fraudulent Transaction / Stolen Card / Identity Theft',
    shortTitle: 'Payment Fraud',
    description: 'TRIBESANDCLIQS believes the Transaction was fraudulent, e.g. because of identity theft, stolen credit cards',
    initiatedBy: ['admin'],
    category: 'Fraud Protection',
    badgeVariant: 'error',
  },
  {
    id: '7_LOCATION_OBFUSCATION_PROXY',
    clauseNumber: 7,
    title: 'Organizer Location Obfuscation / Proxy Usage',
    shortTitle: 'Location Obfuscation',
    description: 'Event Organizer created or used a proxy or other means to obfuscate their real location',
    initiatedBy: ['admin'],
    category: 'Trust & Safety',
    badgeVariant: 'error',
  },
  {
    id: '8_EVENT_FRAUD_REPORTS',
    clauseNumber: 8,
    title: 'Prior Fraud Reports from Event',
    shortTitle: 'Event Fraud Reports',
    description: 'TRIBESANDCLIQS has already been contacted about fraudulent Transactions from the Event Organizer’s event',
    initiatedBy: ['admin'],
    category: 'Trust & Safety',
    badgeVariant: 'error',
  },
  {
    id: '9_TERMS_OR_PAYMENT_NON_COMPLIANCE',
    clauseNumber: 9,
    title: 'Terms of Agreement / Payment Provider Breach',
    shortTitle: 'Terms Breach',
    description: 'The Event Organizer’s event does not comply with the terms of this Agreement and/or the Terms of Service of the Credit Card Processing (Payment Provider) of the event',
    initiatedBy: ['admin'],
    category: 'Compliance',
    badgeVariant: 'error',
  },
  {
    id: '10_EVENT_SUSPECTED_FRAUDULENT',
    clauseNumber: 10,
    title: 'Suspected Fraudulent Event (Consumer Reports)',
    shortTitle: 'Fraudulent Event',
    description: 'TRIBESANDCLIQS believes the event is fraudulent, either due to consumer reports or other information',
    initiatedBy: ['admin'],
    category: 'Trust & Safety',
    badgeVariant: 'error',
  },
];

export const getPolicyClause = (idOrNumber) => {
  if (!idOrNumber) return null;
  const num = parseInt(idOrNumber, 10);
  return REFUND_POLICY_CIRCUMSTANCES.find(
    (c) => c.id === idOrNumber || c.clauseNumber === num || c.id.startsWith(`${num}_`),
  ) || null;
};

export const getPolicyTitle = (idOrNumber) => {
  const clause = getPolicyClause(idOrNumber);
  return clause ? `Clause ${clause.clauseNumber}: ${clause.shortTitle}` : 'General Refund';
};

export const formatPolicyCitation = (idOrNumber) => {
  const clause = getPolicyClause(idOrNumber);
  if (!clause) return 'TRIBESANDCLIQS Refund Policy';
  return `TRIBESANDCLIQS Refund Policy Clause ${clause.clauseNumber} ("${clause.description}")`;
};
