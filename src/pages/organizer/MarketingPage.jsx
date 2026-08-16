import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, MessageSquare, Bell, Send, Calendar, Users, CheckCircle2,
  AlertCircle, Eye, Megaphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrganizerEvents } from '@/api/events';
import { getMarketingCampaigns, createMarketingCampaign } from '@/api/organizer';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition';

const TABS = [
  { key: 'email', label: 'Email Campaign', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'push', label: 'Push Notifications', icon: Bell },
];

const SMS_LIMIT = 160;

export default function MarketingPage() {
  const [tab, setTab] = useState('email');
  const [events, setEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Email form
  const [emailForm, setEmailForm] = useState({ eventId: '', subject: '', message: '', audience: 'all', ticketType: '' });
  // SMS form
  const [smsForm, setSmsForm] = useState({ eventId: '', message: '', audience: 'all', ticketType: '' });
  // Push form
  const [pushForm, setPushForm] = useState({ title: '', message: '', audience: 'all', ticketType: '' });

  useEffect(() => {
    getOrganizerEvents({ limit: 100 })
      .then((res) => {
        const payload = res.data;
        setEvents(Array.isArray(payload) ? payload : payload.events || payload.data || []);
      })
      .catch(() => setEvents([]));
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await getMarketingCampaigns();
      const payload = res.data;
      setCampaigns(Array.isArray(payload) ? payload : payload.campaigns || payload.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const audienceOptions = [
    { value: 'all', label: 'All Attendees' },
    { value: 'ticket_type', label: 'Specific Ticket Type' },
    { value: 'checked_in', label: 'Checked-in Attendees' },
    { value: 'not_arrived', label: 'Not Arrived' },
  ];

  const buildPayload = (type, form) => {
    const base = {
      type,
      eventId: form.eventId || null,
      audience: form.audience,
      ticketType: form.audience === 'ticket_type' ? form.ticketType : null,
    };
    if (type === 'email') return { ...base, subject: form.subject, message: form.message };
    if (type === 'sms') return { ...base, message: form.message };
    return { ...base, title: form.title, message: form.message };
  };

  const handleSend = async (type) => {
    const form = type === 'email' ? emailForm : type === 'sms' ? smsForm : pushForm;
    if (type === 'email' && (!form.subject || !form.message)) { toast.error('Subject and message are required'); return; }
    if (type === 'sms' && !form.message) { toast.error('Message is required'); return; }
    if (type === 'push' && (!form.title || !form.message)) { toast.error('Title and message are required'); return; }
    if (form.audience === 'ticket_type' && !form.ticketType) { toast.error('Select a ticket type'); return; }

    setSending(true);
    const t = toast.loading('Sending campaign...');
    try {
      await createMarketingCampaign(buildPayload(type, form));
      toast.success(`${TABS.find((x) => x.key === type).label} sent successfully`, { id: t });
      if (type === 'email') setEmailForm({ eventId: '', subject: '', message: '', audience: 'all', ticketType: '' });
      if (type === 'sms') setSmsForm({ eventId: '', message: '', audience: 'all', ticketType: '' });
      if (type === 'push') setPushForm({ title: '', message: '', audience: 'all', ticketType: '' });
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send campaign', { id: t });
    } finally {
      setSending(false);
    }
  };

  const smsCount = SMS_LIMIT - (smsForm.message?.length || 0);
  const emailCharCount = emailForm.message?.length || 0;

  const campaignTypeVariant = (type) => {
    if (type === 'email') return { v: 'info', label: 'Email', Icon: Mail };
    if (type === 'sms') return { v: 'gold', label: 'SMS', Icon: MessageSquare };
    return { v: 'warning', label: 'Push', Icon: Bell };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Megaphone}
        accent="rose"
        title="Marketing"
        subtitle="Reach your audience with targeted campaigns across channels."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#262B2F]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === key ? 'text-[#D4AF37]' : 'text-[#8A9196] hover:text-[#EDF0F1]'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#D4AF37]" />}
          </button>
        ))}
      </div>

      {/* Campaign composer + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Composer */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#EDF0F1]">
            {(() => { const I = TABS.find((x) => x.key === tab).icon; return <I className="w-5 h-5 text-[#D4AF37]" />; })()}
            {TABS.find((x) => x.key === tab).label}
          </div>

          {/* Event selector (email + sms) */}
          {(tab === 'email' || tab === 'sms') && (
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Event (optional)</label>
              <select
                value={tab === 'email' ? emailForm.eventId : smsForm.eventId}
                onChange={(e) => tab === 'email'
                  ? setEmailForm((f) => ({ ...f, eventId: e.target.value }))
                  : setSmsForm((f) => ({ ...f, eventId: e.target.value }))}
                className={inputCls}
              >
                <option value="">All events</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
          )}

          {/* Push title */}
          {tab === 'push' && (
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Notification Title</label>
              <input
                value={pushForm.title}
                onChange={(e) => setPushForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Special announcement!"
                maxLength={80}
                className={inputCls}
              />
            </div>
          )}

          {/* Email subject */}
          {tab === 'email' && (
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Subject</label>
              <input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Your event is coming up!"
                maxLength={120}
                className={inputCls}
              />
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Message</label>
            <textarea
              value={tab === 'email' ? emailForm.message : tab === 'sms' ? smsForm.message : pushForm.message}
              onChange={(e) => {
                const val = e.target.value;
                if (tab === 'email') setEmailForm((f) => ({ ...f, message: val }));
                else if (tab === 'sms') setSmsForm((f) => ({ ...f, message: val }));
                else setPushForm((f) => ({ ...f, message: val }));
              }}
              rows={tab === 'sms' ? 4 : 6}
              maxLength={tab === 'sms' ? SMS_LIMIT : undefined}
              placeholder={tab === 'sms' ? 'Your SMS message (max 160 chars)...' : 'Write your message...'}
              className={`${inputCls} resize-none`}
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-[#494F55]">
                {tab === 'email' && `${emailCharCount} characters`}
                {tab === 'sms' && `${smsForm.message?.length || 0}/${SMS_LIMIT} characters`}
                {tab === 'push' && `${pushForm.message?.length || 0} characters`}
              </span>
              {tab === 'sms' && (
                <span className={smsCount < 20 ? 'text-amber-400' : 'text-[#8A9196]'}>
                  {smsCount} left
                </span>
              )}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Audience</label>
            <select
              value={tab === 'email' ? emailForm.audience : tab === 'sms' ? smsForm.audience : pushForm.audience}
              onChange={(e) => {
                const val = e.target.value;
                if (tab === 'email') setEmailForm((f) => ({ ...f, audience: val, ticketType: '' }));
                else if (tab === 'sms') setSmsForm((f) => ({ ...f, audience: val, ticketType: '' }));
                else setPushForm((f) => ({ ...f, audience: val, ticketType: '' }));
              }}
              className={inputCls}
            >
              {audienceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Ticket type if specific */}
          {((tab === 'email' && emailForm.audience === 'ticket_type') ||
            (tab === 'sms' && smsForm.audience === 'ticket_type') ||
            (tab === 'push' && pushForm.audience === 'ticket_type')) && (
            <div>
              <label className="block text-xs font-medium text-[#8A9196] mb-1.5 uppercase tracking-wider">Ticket Type</label>
              <input
                value={tab === 'email' ? emailForm.ticketType : tab === 'sms' ? smsForm.ticketType : pushForm.ticketType}
                onChange={(e) => {
                  const val = e.target.value;
                  if (tab === 'email') setEmailForm((f) => ({ ...f, ticketType: val }));
                  else if (tab === 'sms') setSmsForm((f) => ({ ...f, ticketType: val }));
                  else setPushForm((f) => ({ ...f, ticketType: val }));
                }}
                placeholder="VIP, General..."
                className={inputCls}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleSend(tab)}
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-60 transition-colors"
            >
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Campaign'}
            </button>
            {tab === 'email' && (
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8A9196] border border-[#494F55]/40 hover:text-[#EDF0F1] hover:bg-[#494F55]/20 transition"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
            )}
          </div>
        </div>

        {/* Preview pane */}
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#8A9196] mb-3">Preview</p>
          {tab === 'email' ? (
            <div className="rounded-lg bg-[#1E252B] border border-[#262B2F] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#262B2F]">
                <p className="text-xs text-[#8A9196]">From: Tribes & Cliqs &lt;noreply@tribesandcliqs.com&gt;</p>
                <p className="text-sm font-semibold text-[#EDF0F1] mt-1">{emailForm.subject || '(no subject)'}</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-[#EDF0F1] whitespace-pre-wrap leading-relaxed min-h-[120px]">
                  {emailForm.message || 'Your email content will appear here...'}
                </p>
              </div>
            </div>
          ) : tab === 'sms' ? (
            <div className="space-y-3">
              <div className="max-w-[280px] rounded-2xl rounded-bl-sm bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-4 py-3">
                <p className="text-sm text-[#EDF0F1] leading-relaxed">{smsForm.message || 'SMS preview...'}</p>
                <p className="text-[10px] text-[#8A9196] mt-1.5 text-right">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#8A9196]">
                <AlertCircle className="w-3.5 h-3.5" /> {smsForm.message?.length || 0}/160 chars · {Math.ceil((smsForm.message?.length || 0) / 160) || 1} SMS
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-[#1E252B] border border-[#262B2F] p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37] flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-[#1E252B]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#EDF0F1]">{pushForm.title || 'Notification Title'}</p>
                  <p className="text-sm text-[#8A9196] mt-0.5">{pushForm.message || 'Notification message...'}</p>
                  <p className="text-[10px] text-[#494F55] mt-1">Tribes & Cliqs · now</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign History */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#EDF0F1]">Campaign History</h2>
        {loadingCampaigns ? (
          <LoadingSpinner label="Loading campaigns..." className="py-12" />
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
            <EmptyState icon={Megaphone} title="No campaigns yet" description="Your sent campaigns will appear here." className="py-12" />
          </div>
        ) : (
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Audience</th>
                  <th className="px-4 py-3 font-medium text-right">Audience Size</th>
                  <th className="px-4 py-3 font-medium">Sent Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262B2F]/70">
                {campaigns.map((c) => {
                  const meta = campaignTypeVariant(c.type || c.channel);
                  return (
                    <tr key={c.id} className="hover:bg-[#1D2124] transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <meta.Icon className="w-4 h-4 text-[#8A9196]" />
                          <span className="text-[#EDF0F1] font-medium">{meta.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#8A9196] max-w-[160px] truncate">{c.eventTitle || c.event?.title || 'All events'}</td>
                      <td className="px-4 py-3 text-[#8A9196] capitalize">{(c.audience || 'all').replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right text-[#EDF0F1] font-medium">{c.audienceSize ?? c.recipients ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#8A9196] whitespace-nowrap">
                        {c.sentAt || c.createdAt ? new Date(c.sentAt || c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.status === 'sent' || c.status === 'delivered' ? 'success' : c.status === 'failed' ? 'error' : 'pending'} size="sm" dot>
                          {c.status || 'pending'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
