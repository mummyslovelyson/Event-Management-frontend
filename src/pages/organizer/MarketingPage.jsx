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

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 transition';

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
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        accent="rose"
        title="Marketing"
        subtitle="Reach your audience with targeted campaigns across channels."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/[0.08] rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              tab === key
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Campaign composer + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Composer */}
        <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            {(() => { const I = TABS.find((x) => x.key === tab).icon; return <I className="w-4 h-4 text-neutral-400" />; })()}
            {TABS.find((x) => x.key === tab).label}
          </div>

          {/* Event selector (email + sms) */}
          {(tab === 'email' || tab === 'sms') && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Event (optional)</label>
              <select
                value={tab === 'email' ? emailForm.eventId : smsForm.eventId}
                onChange={(e) => tab === 'email'
                  ? setEmailForm((f) => ({ ...f, eventId: e.target.value }))
                  : setSmsForm((f) => ({ ...f, eventId: e.target.value }))}
                className={`${inputCls} bg-[#121620]`}
              >
                <option value="">All events</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </div>
          )}

          {/* Push title */}
          {tab === 'push' && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Notification Title</label>
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
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Subject</label>
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
            <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Message</label>
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
            <div className="mt-1 flex justify-between text-[11px]">
              <span className="text-neutral-500">
                {tab === 'email' && `${emailCharCount} characters`}
                {tab === 'sms' && `${smsForm.message?.length || 0}/${SMS_LIMIT} characters`}
                {tab === 'push' && `${pushForm.message?.length || 0} characters`}
              </span>
              {tab === 'sms' && (
                <span className={smsCount < 20 ? 'text-amber-400 font-medium' : 'text-neutral-400'}>
                  {smsCount} left
                </span>
              )}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Audience</label>
            <select
              value={tab === 'email' ? emailForm.audience : tab === 'sms' ? smsForm.audience : pushForm.audience}
              onChange={(e) => {
                const val = e.target.value;
                if (tab === 'email') setEmailForm((f) => ({ ...f, audience: val, ticketType: '' }));
                else if (tab === 'sms') setSmsForm((f) => ({ ...f, audience: val, ticketType: '' }));
                else setPushForm((f) => ({ ...f, audience: val, ticketType: '' }));
              }}
              className={`${inputCls} bg-[#121620]`}
            >
              {audienceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Ticket type if specific */}
          {((tab === 'email' && emailForm.audience === 'ticket_type') ||
            (tab === 'sms' && smsForm.audience === 'ticket_type') ||
            (tab === 'push' && pushForm.audience === 'ticket_type')) && (
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wider">Ticket Type</label>
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 disabled:opacity-60 transition"
            >
              <Send className="w-3.5 h-3.5" /> {sending ? 'Sending...' : 'Send Campaign'}
            </button>
            {tab === 'email' && (
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-300 border border-white/[0.08] bg-white/[0.02] hover:text-white hover:bg-white/[0.06] transition"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            )}
          </div>
        </div>

        {/* Preview pane */}
        <div className="rounded-2xl bg-[#121620] border border-white/[0.08] p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-3">Live Preview</p>
          {tab === 'email' ? (
            <div className="rounded-xl bg-[#0b0e14] border border-white/[0.08] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <p className="text-[11px] text-neutral-400">From: Tribes & Cliqs &lt;noreply@tribesandcliqs.com&gt;</p>
                <p className="text-xs font-semibold text-white mt-1">{emailForm.subject || '(no subject)'}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed min-h-[140px]">
                  {emailForm.message || 'Your email content will appear here...'}
                </p>
              </div>
            </div>
          ) : tab === 'sms' ? (
            <div className="space-y-3">
              <div className="max-w-[280px] rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/[0.1] px-4 py-3">
                <p className="text-xs text-white leading-relaxed">{smsForm.message || 'SMS preview...'}</p>
                <p className="text-[10px] text-neutral-500 mt-1.5 text-right">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <AlertCircle className="w-3.5 h-3.5" /> {smsForm.message?.length || 0}/160 chars · {Math.ceil((smsForm.message?.length || 0) / 160) || 1} SMS
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#0b0e14] border border-white/[0.08] p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white">{pushForm.title || 'Notification Title'}</p>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{pushForm.message || 'Notification message...'}</p>
                  <p className="text-[10px] text-neutral-500 mt-1.5">Tribes & Cliqs · now</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign History */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Campaign History</h2>
        {loadingCampaigns ? (
          <LoadingSpinner label="Loading campaigns..." className="py-12" />
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl bg-[#121620] border border-white/[0.08]">
            <EmptyState icon={Megaphone} title="No campaigns yet" description="Your sent campaigns will appear here." className="py-12" />
          </div>
        ) : (
          <div className="rounded-2xl bg-[#121620] border border-white/[0.08] overflow-hidden overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] font-medium text-neutral-400 border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Audience</th>
                  <th className="px-4 py-3 font-medium text-right">Audience Size</th>
                  <th className="px-4 py-3 font-medium">Sent Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {campaigns.map((c) => {
                  const meta = campaignTypeVariant(c.type || c.channel);
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <meta.Icon className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-white font-medium">{meta.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-300 max-w-[160px] truncate">{c.eventTitle || c.event?.title || 'All events'}</td>
                      <td className="px-4 py-3 text-neutral-400 capitalize">{(c.audience || 'all').replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{c.audienceSize ?? c.recipients ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
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
