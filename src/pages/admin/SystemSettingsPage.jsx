import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, CreditCard, Mail, Smartphone, Shield, Receipt,
  Save, Eye, EyeOff, Send, CheckCircle2, AlertCircle, RefreshCw, Copy, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSettings, updateSettings, sendTestEmail, sendTestSms, getSmsBalance, testPaystack,
} from '@/api/admin';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: Smartphone },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'tax', label: 'Tax', icon: Receipt },
];

const DB_KEYS = {
  general: {
    platformName: 'platform_name',
    currency: 'currency',
    usdRate: 'usd_rate',
    timezone: 'timezone',
    supportEmail: 'support_email',
    logoUrl: 'logo_url',
    maintenanceMode: 'maintenance_mode',
    maintenanceMessage: 'maintenance_message',
  },
  payment: {
    paystackSecretKey: 'paystack_secret_key',
    paystackPublicKey: 'paystack_public_key',
    commissionRate: 'commission_pct',
    webhookUrl: 'webhook_url',
  },
  email: {
    provider: 'email_provider',
    smtpHost: 'smtp_host',
    smtpPort: 'smtp_port',
    smtpUsername: 'smtp_username',
    smtpPassword: 'smtp_password',
    resendApiKey: 'resend_api_key',
    fromEmail: 'from_email',
    fromName: 'from_name',
  },
  sms: { apiKey: 'smsonlinegh_api_key', senderId: 'sms_sender_id' },
  security: {
    jwtExpiry: 'jwt_expires_in',
    maxLoginAttempts: 'max_login_attempts',
    sessionTimeout: 'session_timeout',
    emailVerification: 'email_verification',
    twoFactor: 'two_factor_enabled',
    ipWhitelist: 'ip_whitelist_enabled',
  },
  tax: { vatRate: 'vat_percent', applyTo: 'vat_apply_to', taxId: 'tax_id', inclusive: 'vat_inclusive' },
};

const NUMERIC_KEYS = new Set(['commission_pct', 'smtp_port', 'jwt_expires_in', 'max_login_attempts', 'session_timeout', 'vat_percent']);
const BOOLEAN_KEYS = new Set(['maintenance_mode', 'email_verification', 'two_factor_enabled', 'ip_whitelist_enabled', 'vat_inclusive']);

function fromDb(raw = {}) {
  const out = {};
  for (const [group, map] of Object.entries(DB_KEYS)) {
    out[group] = {};
    for (const [pageKey, dbKey] of Object.entries(map)) {
      const val = raw[dbKey];
      if (val === undefined || val === null) continue;
      let v = val;
      if (dbKey === 'jwt_expires_in') {
        const daysMatch = String(val).match(/^(\d+(?:\.\d+)?)\s*d$/i);
        v = daysMatch ? Math.round(Number(daysMatch[1]) * 24) : Number(val) || 0;
      } else if (NUMERIC_KEYS.has(dbKey)) {
        v = Number(val) || 0;
      } else if (BOOLEAN_KEYS.has(dbKey)) {
        v = val === true || val === 1 || String(val).toLowerCase() === 'true';
      }
      out[group][pageKey] = v;
    }
  }
  return out;
}

function toDb(grouped = {}) {
  const out = {};
  for (const [group, map] of Object.entries(DB_KEYS)) {
    for (const [pageKey, dbKey] of Object.entries(map)) {
      const val = grouped[group]?.[pageKey];
      if (val === undefined || val === null) continue;
      let v = val;
      if (typeof val === 'boolean') v = val ? 'true' : 'false';
      else if (typeof val === 'number') v = String(val);
      out[dbKey] = v;
    }
  }
  return out;
}

export default function SystemSettingsPage() {
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  // Live tester state
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testPhoneNum, setTestPhoneNum] = useState('');
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [smsBalance, setSmsBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [verifyingPaystack, setVerifyingPaystack] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      const raw = res.data?.settings || res.data || {};
      setSettings(fromDb(raw));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSmsBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      const res = await getSmsBalance();
      setSmsBalance(res.data?.balance ?? 0);
    } catch {
      setSmsBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (tab === 'sms') {
      fetchSmsBalance();
    }
  }, [tab, fetchSmsBalance]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ settings: toDb(settings) });
      toast.success(`${tabs.find((t) => t.key === tab)?.label} settings saved & applied`);
      if (tab === 'sms') fetchSmsBalance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => {
    setSettings((s) => ({ ...s, [tab]: { ...(s[tab] || {}), [key]: value } }));
  };

  const toggleSecret = (key) => setShowSecrets((s) => ({ ...s, [key]: !s[key] }));

  // Test Email Handler
  const handleTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmailAddr.trim()) {
      toast.error('Please enter an email address for the test');
      return;
    }
    setSendingTestEmail(true);
    try {
      const res = await sendTestEmail({ targetEmail: testEmailAddr.trim() });
      toast.success(res.data?.message || 'Test email sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Test SMS Handler
  const handleTestSms = async (e) => {
    e.preventDefault();
    if (!testPhoneNum.trim()) {
      toast.error('Please enter a phone number for the test');
      return;
    }
    setSendingTestSms(true);
    try {
      const res = await sendTestSms({ targetPhone: testPhoneNum.trim() });
      toast.success(res.data?.message || 'Test SMS dispatched successfully!');
      fetchSmsBalance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch test SMS');
    } finally {
      setSendingTestSms(false);
    }
  };

  // Verify Paystack Handler
  const handleVerifyPaystack = async () => {
    setVerifyingPaystack(true);
    try {
      const res = await testPaystack();
      toast.success(res.data?.message || 'Paystack connection verified!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Paystack verification failed');
    } finally {
      setVerifyingPaystack(false);
    }
  };

  const copyWebhook = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        accent="slate"
        title="System Settings"
        subtitle="Configure platform defaults, gateways, authentication channels, and tax rules."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-[#171A1D] border border-[#262B2F] p-3 space-y-1.5 lg:sticky lg:top-20 shadow-sm">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === key ? 'bg-white text-[#1C232B] font-bold shadow-sm' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-[#171A1D] border border-[#262B2F] p-6 sm:p-8 shadow-sm">
            {loading ? (
              <LoadingSpinner label="Loading settings..." className="py-16" />
            ) : (
              <>
                {/* ─── GENERAL TAB ─── */}
                {tab === 'general' && (
                  <div className="space-y-6">
                    <SectionTitle icon={Settings} title="General Settings" desc="Platform branding, default currency, timezones, and maintenance mode." />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Platform Name</label>
                        <input className={inputCls} value={settings.general?.platformName || settings.platformName || ''} onChange={(e) => update('platformName', e.target.value)} placeholder="Tribes & Cliqs" />
                      </div>
                      <div>
                        <label className={labelCls}>Currency</label>
                        <select className={inputCls} value={settings.general?.currency || settings.currency || 'GHS'} onChange={(e) => update('currency', e.target.value)}>
                          <option value="GHS">GHS (GH₵)</option>
                          <option value="USD">USD ($)</option>
                          <option value="NGN">NGN (₦)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>USD Exchange Rate (GHS per $1)</label>
                        <input type="number" step="0.01" min="0.01" className={inputCls} value={settings.general?.usdRate ?? settings.usdRate ?? 15} onChange={(e) => update('usdRate', parseFloat(e.target.value))} />
                        <p className="mt-1 text-xs text-[#949599]">Used to convert GHS ticket amounts into USD for international display.</p>
                      </div>
                      <div>
                        <label className={labelCls}>Timezone</label>
                        <select className={inputCls} value={settings.general?.timezone || settings.timezone || 'Africa/Accra'} onChange={(e) => update('timezone', e.target.value)}>
                          <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                          <option value="Africa/Lagos">Africa/Lagos (WAT, GMT+1)</option>
                          <option value="UTC">UTC (Universal)</option>
                          <option value="Europe/London">Europe/London</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Support Email</label>
                        <input className={inputCls} value={settings.general?.supportEmail || settings.supportEmail || ''} onChange={(e) => update('supportEmail', e.target.value)} placeholder="support@tribesandcliqs.com" />
                      </div>
                      <div>
                        <label className={labelCls}>Platform Logo URL</label>
                        <input className={inputCls} value={settings.general?.logoUrl || settings.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} placeholder="/assets/images/logo.png" />
                      </div>
                    </div>

                    {/* Maintenance Mode Card */}
                    <div className="rounded-2xl bg-[#14171A] border border-[#262B2F] p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#EFEFF1]">Maintenance Mode</h4>
                            {settings.general?.maintenanceMode ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                Active • Public Access Blocked
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Live • Public Access Normal
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[#949599]">
                            When active, public visitors will see a maintenance notice. Admins can still sign in and access backend dashboards.
                          </p>
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => update('maintenanceMode', !settings.general?.maintenanceMode)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              settings.general?.maintenanceMode ? 'bg-amber-500' : 'bg-[#262B2F]'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                settings.general?.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {settings.general?.maintenanceMode && (
                        <div className="pt-3 border-t border-[#262B2F] space-y-2">
                          <label className={labelCls}>Custom Maintenance Message</label>
                          <textarea
                            rows={2}
                            className={inputCls}
                            value={settings.general?.maintenanceMessage || ''}
                            onChange={(e) => update('maintenanceMessage', e.target.value)}
                            placeholder="We are currently performing scheduled maintenance to upgrade system performance. We'll be back shortly!"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── PAYMENT TAB ─── */}
                {tab === 'payment' && (
                  <div className="space-y-6">
                    <SectionTitle icon={CreditCard} title="Payment Gateway Settings" desc="Paystack API keys, commission percentage, and webhook endpoints." />
                    
                    <SecretInput
                      label="Paystack Secret Key"
                      value={settings.payment?.paystackSecretKey || ''}
                      show={showSecrets.paystackSecretKey}
                      onToggle={() => toggleSecret('paystackSecretKey')}
                      onChange={(v) => update('paystackSecretKey', v)}
                      placeholder="sk_live_••••••••••••"
                    />

                    <SecretInput
                      label="Paystack Public Key"
                      value={settings.payment?.paystackPublicKey || ''}
                      show={showSecrets.paystackPublicKey}
                      onToggle={() => toggleSecret('paystackPublicKey')}
                      onChange={(v) => update('paystackPublicKey', v)}
                      placeholder="pk_live_••••••••••••"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Platform Commission Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          className={inputCls}
                          value={settings.payment?.commissionRate ?? settings.commissionRate ?? 5}
                          onChange={(e) => update('commissionRate', parseFloat(e.target.value))}
                        />
                        <p className="mt-1 text-xs text-[#949599]">Percentage deducted from organizer ticket sales.</p>
                      </div>
                      <div>
                        <label className={labelCls}>Webhook URL</label>
                        <div className="relative">
                          <input
                            className={`${inputCls} pr-10`}
                            value={settings.payment?.webhookUrl || `${window.location.origin}/api/orders/verify-payment`}
                            onChange={(e) => update('webhookUrl', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => copyWebhook(settings.payment?.webhookUrl || `${window.location.origin}/api/orders/verify-payment`)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#949599] hover:text-white transition"
                            title="Copy Webhook URL"
                          >
                            {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-[#949599]">Set this in your Paystack dashboard under Settings → Webhooks.</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#262B2F]">
                      <button
                        type="button"
                        onClick={handleVerifyPaystack}
                        disabled={verifyingPaystack}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242B32] border border-[#494F55]/40 text-sm font-semibold text-[#EFEFF1] hover:bg-[#2C353E] hover:text-white transition disabled:opacity-50"
                      >
                        {verifyingPaystack ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        Verify Paystack Connection
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── EMAIL TAB ─── */}
                {tab === 'email' && (
                  <div className="space-y-6">
                    <SectionTitle icon={Mail} title="Email Service Provider" desc="Configure SMTP or Resend API to deliver transaction receipts and OTP verification." />
                    
                    <div>
                      <label className={labelCls}>Provider</label>
                      <select className={inputCls} value={settings.email?.provider || 'resend'} onChange={(e) => update('provider', e.target.value)}>
                        <option value="resend">Resend API (Recommended)</option>
                        <option value="smtp">Custom SMTP Server</option>
                      </select>
                    </div>

                    {settings.email?.provider === 'smtp' ? (
                      <div className="space-y-4">
                        <div>
                          <label className={labelCls}>SMTP Host</label>
                          <input className={inputCls} value={settings.email?.smtpHost || ''} onChange={(e) => update('smtpHost', e.target.value)} placeholder="smtp.gmail.com" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>SMTP Port</label>
                            <input type="number" className={inputCls} value={settings.email?.smtpPort || 587} onChange={(e) => update('smtpPort', parseInt(e.target.value))} />
                          </div>
                          <div>
                            <label className={labelCls}>SMTP Username</label>
                            <input className={inputCls} value={settings.email?.smtpUsername || ''} onChange={(e) => update('smtpUsername', e.target.value)} placeholder="user@domain.com" />
                          </div>
                        </div>
                        <SecretInput
                          label="SMTP Password"
                          value={settings.email?.smtpPassword || ''}
                          show={showSecrets.smtpPassword}
                          onToggle={() => toggleSecret('smtpPassword')}
                          onChange={(v) => update('smtpPassword', v)}
                          placeholder="••••••••••••"
                        />
                      </div>
                    ) : (
                      <SecretInput
                        label="Resend API Key"
                        value={settings.email?.resendApiKey || ''}
                        show={showSecrets.resendApiKey}
                        onToggle={() => toggleSecret('resendApiKey')}
                        onChange={(v) => update('resendApiKey', v)}
                        placeholder="re_••••••••••••"
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>From Email</label>
                        <input className={inputCls} value={settings.email?.fromEmail || ''} onChange={(e) => update('fromEmail', e.target.value)} placeholder="noreply@tribesandcliqs.com" />
                      </div>
                      <div>
                        <label className={labelCls}>From Name</label>
                        <input className={inputCls} value={settings.email?.fromName || ''} onChange={(e) => update('fromName', e.target.value)} placeholder="Tribes & Cliqs" />
                      </div>
                    </div>

                    {/* Email Live Tester Box */}
                    <div className="rounded-2xl bg-[#14171A] border border-[#262B2F] p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">Send Test Email</h4>
                      <p className="text-xs text-[#949599]">Verify that your email credentials can successfully deliver an email right now.</p>
                      <form onSubmit={handleTestEmail} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email"
                          value={testEmailAddr}
                          onChange={(e) => setTestEmailAddr(e.target.value)}
                          placeholder="admin@tribesandcliqs.com"
                          className="flex-1 px-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50"
                        />
                        <button
                          type="submit"
                          disabled={sendingTestEmail}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50"
                        >
                          {sendingTestEmail ? <LoadingSpinner size="sm" /> : <><Send className="w-3.5 h-3.5" /> Dispatch Test</>}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ─── SMS TAB ─── */}
                {tab === 'sms' && (
                  <div className="space-y-6">
                    <SectionTitle icon={Smartphone} title="SMS Gateway (SMSOnlineGH)" desc="Manage your SMS API credentials, approved Sender ID, and live credits balance." />
                    
                    {/* Live SMS Balance Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#14171A] border border-[#262B2F]">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#949599]">SMSOnlineGH Live Balance</span>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-extrabold text-white">
                            {smsBalance !== null ? `${smsBalance} Credits` : 'Loading...'}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Gateway Active
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={fetchSmsBalance}
                        disabled={loadingBalance}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#262B2F] text-xs font-medium text-[#CBD5E1] hover:text-white transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingBalance ? 'animate-spin' : ''}`} /> Refresh Balance
                      </button>
                    </div>

                    <SecretInput
                      label="SMSOnlineGH API Key"
                      value={settings.sms?.apiKey || ''}
                      show={showSecrets.smsApiKey}
                      onToggle={() => toggleSecret('smsApiKey')}
                      onChange={(v) => update('apiKey', v)}
                      placeholder="••••••••••••••••••••••••••••••••"
                    />

                    <div>
                      <label className={labelCls}>Sender ID (Max 11 Alphanumeric Characters)</label>
                      <input
                        className={inputCls}
                        value={settings.sms?.senderId || ''}
                        onChange={(e) => update('senderId', e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11))}
                        placeholder="TribesCliq"
                        maxLength={11}
                      />
                      <p className="mt-1 text-xs text-[#949599]">
                        Must match your approved Sender ID on SMSOnlineGH dashboard. Letters and digits only (no spaces or &).
                      </p>
                    </div>

                    {/* SMS Live Tester Box */}
                    <div className="rounded-2xl bg-[#14171A] border border-[#262B2F] p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#CBD5E1]">Send Test SMS</h4>
                      <p className="text-xs text-[#949599]">Send a test verification SMS to verify phone delivery in real-time.</p>
                      <form onSubmit={handleTestSms} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="tel"
                          value={testPhoneNum}
                          onChange={(e) => setTestPhoneNum(e.target.value)}
                          placeholder="024XXXXXXX or +233XXXXXXXXX"
                          className="flex-1 px-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50"
                        />
                        <button
                          type="submit"
                          disabled={sendingTestSms}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition disabled:opacity-50"
                        >
                          {sendingTestSms ? <LoadingSpinner size="sm" /> : <><Send className="w-3.5 h-3.5" /> Dispatch Test</>}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ─── SECURITY TAB ─── */}
                {tab === 'security' && (
                  <div className="space-y-6">
                    <SectionTitle icon={Shield} title="Security & Authentication" desc="Session lifespans, brute force protection, and account verification rules." />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>JWT Expiry (Hours)</label>
                        <input type="number" min="1" max="720" className={inputCls} value={settings.security?.jwtExpiry ?? 24} onChange={(e) => update('jwtExpiry', parseInt(e.target.value) || 24)} />
                      </div>
                      <div>
                        <label className={labelCls}>Max Login Attempts</label>
                        <input type="number" min="3" max="20" className={inputCls} value={settings.security?.maxLoginAttempts ?? 5} onChange={(e) => update('maxLoginAttempts', parseInt(e.target.value) || 5)} />
                      </div>
                      <div>
                        <label className={labelCls}>Session Timeout (Minutes)</label>
                        <input type="number" min="5" max="1440" className={inputCls} value={settings.security?.sessionTimeout ?? 30} onChange={(e) => update('sessionTimeout', parseInt(e.target.value) || 30)} />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <ToggleRow
                        label="Require Account Verification"
                        desc="Users must verify via 6-digit OTP (SMS / Email) before their account is activated"
                        value={settings.security?.emailVerification ?? true}
                        onChange={(v) => update('emailVerification', v)}
                      />
                      <ToggleRow
                        label="Two-Factor Authentication (2FA)"
                        desc="Require an OTP prompt for all administrative sign-ins"
                        value={settings.security?.twoFactor ?? false}
                        onChange={(v) => update('twoFactor', v)}
                      />
                      <ToggleRow
                        label="Admin IP Whitelisting"
                        desc="Restrict dashboard access strictly to authorized corporate IP ranges"
                        value={settings.security?.ipWhitelist ?? false}
                        onChange={(v) => update('ipWhitelist', v)}
                      />
                    </div>
                  </div>
                )}

                {/* ─── TAX TAB ─── */}
                {tab === 'tax' && (
                  <div className="space-y-6">
                    <SectionTitle icon={Receipt} title="Tax & Compliance" desc="Set VAT percentages and tax identification numbers for regulatory billing." />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>VAT Rate (%)</label>
                        <input type="number" step="0.1" min="0" max="50" className={inputCls} value={settings.tax?.vatRate ?? 15} onChange={(e) => update('vatRate', parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className={labelCls}>Apply VAT To</label>
                        <select className={inputCls} value={settings.tax?.applyTo || 'all'} onChange={(e) => update('applyTo', e.target.value)}>
                          <option value="all">All Ticket Orders & Services</option>
                          <option value="tickets">Ticket Orders Only</option>
                          <option value="services">Organizer Service Fees Only</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Tax Identification Number (TIN / GRA)</label>
                        <input className={inputCls} value={settings.tax?.taxId || ''} onChange={(e) => update('taxId', e.target.value)} placeholder="GHA-000000000-0" />
                      </div>
                    </div>

                    <div className="pt-2">
                      <ToggleRow
                        label="Include VAT in Display Price"
                        desc="Show attendee ticket prices as VAT-inclusive rather than adding tax at final checkout"
                        value={settings.tax?.inclusive ?? false}
                        onChange={(v) => update('inclusive', v)}
                      />
                    </div>
                  </div>
                )}

                {/* Save button bar */}
                <div className="mt-8 pt-6 border-t border-[#494F55]/20 flex items-center justify-between">
                  <p className="text-xs text-[#949599]">
                    Changes take effect immediately across all platform endpoints.
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /> Save {tabs.find((t) => t.key === tab)?.label} Settings</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-center gap-3.5 pb-5 border-b border-[#494F55]/20">
      <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-base font-bold text-[#EFEFF1]">{title}</h2>
        <p className="text-xs text-[#949599] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-[#14171A] border border-[#262B2F]">
      <div className="pr-4">
        <p className="text-sm font-semibold text-[#EFEFF1]">{label}</p>
        <p className="text-xs text-[#949599] mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-white' : 'bg-[#262B2F]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#1C232B] transition-transform ${value ? 'translate-x-5 bg-[#1C232B]' : 'bg-[#949599]'}`}
        />
      </button>
    </div>
  );
}

function SecretInput({ label, value, show, onToggle, onChange, placeholder }) {
  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition pr-10';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5';
  const displayValue = show ? value : (value ? '••••••••••••••••••••••••••••••••' : '');
  
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-[#949599] hover:text-white transition"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
