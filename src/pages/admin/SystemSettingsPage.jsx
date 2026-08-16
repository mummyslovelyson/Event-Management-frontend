import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, CreditCard, Mail, Smartphone, Shield, Receipt,
  Save, Eye, EyeOff, Send, CheckCircle2, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSettings, updateSettings } from '@/api/admin';
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

// Maps the page's grouped camelCase shape to the backend's flat snake_case
// setting keys (and back). The backend stores system_settings as a flat
// key → value table, so we convert in both directions on load / save.
const DB_KEYS = {
  general: {
    platformName: 'platform_name',
    currency: 'currency',
    usdRate: 'usd_rate',
    timezone: 'timezone',
    supportEmail: 'support_email',
    logoUrl: 'logo_url',
    maintenanceMode: 'maintenance_mode',
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
  sms: { apiKey: 'sms_api_key', senderId: 'sms_sender_id' },
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

// Backend (flat snake_case) → page state (grouped camelCase)
function fromDb(raw = {}) {
  const out = {};
  for (const [group, map] of Object.entries(DB_KEYS)) {
    out[group] = {};
    for (const [pageKey, dbKey] of Object.entries(map)) {
      const val = raw[dbKey];
      if (val === undefined || val === null) continue;
      let v = val;
      if (dbKey === 'jwt_expires_in') {
        // Seed value is stored as e.g. "7d"; the page works in hours.
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

// Page state (grouped camelCase) → backend (flat snake_case)
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

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ settings: toDb(settings) });
      toast.success(`${tabs.find((t) => t.key === tab)?.label} settings saved`);
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

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/ transition';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Settings}
        accent="slate"
        title="System Settings"
        subtitle="Defaults, payment keys, and the channels we use to reach users."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-3 space-y-1 lg:sticky lg:top-20">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === key ? 'bg-white text-[#1C232B]' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#242B32]'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-6">
            {loading ? (
              <LoadingSpinner label="Loading settings..." className="py-16" />
            ) : (
              <>
                {tab === 'general' && (
                  <div className="space-y-5">
                    <SectionTitle icon={Settings} title="General Settings" desc="Site name, currency, timezone, and support contact." />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className={labelCls}>Platform Name</label><input className={inputCls} value={settings.general?.platformName || settings.platformName || ''} onChange={(e) => update('platformName', e.target.value)} placeholder="Tribes & Cliqs" /></div>
                      <div><label className={labelCls}>Currency</label><select className={inputCls} value={settings.general?.currency || settings.currency || 'GHS'} onChange={(e) => update('currency', e.target.value)}><option value="GHS">GHS (₵)</option><option value="USD">USD ($)</option></select></div>
                      <div><label className={labelCls}>USD Exchange Rate (GHS per $1)</label><input type="number" step="0.01" min="0.01" className={inputCls} value={settings.general?.usdRate ?? settings.usdRate ?? 15} onChange={(e) => update('usdRate', parseFloat(e.target.value))} /><p className="mt-1 text-xs text-[#494F55]">Used to convert GHS amounts into USD for display. All prices are stored in GHS.</p></div>
                      <div><label className={labelCls}>Timezone</label><select className={inputCls} value={settings.general?.timezone || settings.timezone || 'Africa/Accra'} onChange={(e) => update('timezone', e.target.value)}><option value="Africa/Accra">Africa/Accra</option><option value="UTC">UTC</option><option value="Europe/London">Europe/London</option></select></div>
                      <div><label className={labelCls}>Support Email</label><input className={inputCls} value={settings.general?.supportEmail || settings.supportEmail || ''} onChange={(e) => update('supportEmail', e.target.value)} placeholder="support@tribescliqs.com" /></div>
                    </div>
                    <div><label className={labelCls}>Logo URL</label><input className={inputCls} value={settings.general?.logoUrl || settings.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} placeholder="https://..." /></div>
                    <ToggleRow label="Maintenance Mode" desc="Temporarily disable access to the platform" value={settings.general?.maintenanceMode ?? settings.maintenanceMode ?? false} onChange={(v) => update('maintenanceMode', v)} />
                  </div>
                )}

                {tab === 'payment' && (
                  <div className="space-y-5">
                    <SectionTitle icon={CreditCard} title="Payment Settings" desc="Paystack keys and the cut we keep per sale." />
                    <SecretInput label="Paystack Secret Key" value={settings.payment?.paystackSecretKey || ''} show={showSecrets.paystackSecretKey} onToggle={() => toggleSecret('paystackSecretKey')} onChange={(v) => update('paystackSecretKey', v)} placeholder="sk_live_••••••••" />
                    <SecretInput label="Paystack Public Key" value={settings.payment?.paystackPublicKey || ''} show={showSecrets.paystackPublicKey} onToggle={() => toggleSecret('paystackPublicKey')} onChange={(v) => update('paystackPublicKey', v)} placeholder="pk_live_••••••••" />
                    <div><label className={labelCls}>Commission Rate (%)</label><input type="number" step="0.1" className={inputCls} value={settings.payment?.commissionRate ?? settings.commissionRate ?? 5} onChange={(e) => update('commissionRate', parseFloat(e.target.value))} /></div>
                    <div><label className={labelCls}>Webhook URL</label><input className={inputCls} value={settings.payment?.webhookUrl || ''} onChange={(e) => update('webhookUrl', e.target.value)} placeholder="https://api.tribescliqs.com/api/orders/verify-payment" /><p className="mt-1 text-xs text-[#494F55]">Set this URL in the Paystack dashboard so successful charges notify this server.</p></div>
                  </div>
                )}

                {tab === 'email' && (
                  <div className="space-y-5">
                    <SectionTitle icon={Mail} title="Email Settings" desc="Which provider sends your emails." />
                    <div><label className={labelCls}>Provider</label><select className={inputCls} value={settings.email?.provider || 'resend'} onChange={(e) => update('provider', e.target.value)}><option value="resend">Resend</option><option value="smtp">SMTP</option></select></div>
                    {settings.email?.provider === 'smtp' ? (
                      <>
                        <div><label className={labelCls}>SMTP Host</label><input className={inputCls} value={settings.email?.smtpHost || ''} onChange={(e) => update('smtpHost', e.target.value)} placeholder="smtp.gmail.com" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelCls}>SMTP Port</label><input type="number" className={inputCls} value={settings.email?.smtpPort || 587} onChange={(e) => update('smtpPort', parseInt(e.target.value))} /></div>
                          <div><label className={labelCls}>SMTP Username</label><input className={inputCls} value={settings.email?.smtpUsername || ''} onChange={(e) => update('smtpUsername', e.target.value)} /></div>
                        </div>
                        <SecretInput label="SMTP Password" value={settings.email?.smtpPassword || ''} show={showSecrets.smtpPassword} onToggle={() => toggleSecret('smtpPassword')} onChange={(v) => update('smtpPassword', v)} placeholder="••••••••" />
                      </>
                    ) : (
                      <SecretInput label="Resend API Key" value={settings.email?.resendApiKey || ''} show={showSecrets.resendApiKey} onToggle={() => toggleSecret('resendApiKey')} onChange={(v) => update('resendApiKey', v)} placeholder="re_••••••••" />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>From Email</label><input className={inputCls} value={settings.email?.fromEmail || ''} onChange={(e) => update('fromEmail', e.target.value)} placeholder="noreply@tribescliqs.com" /></div>
                      <div><label className={labelCls}>From Name</label><input className={inputCls} value={settings.email?.fromName || ''} onChange={(e) => update('fromName', e.target.value)} placeholder="Tribes & Cliqs" /></div>
                    </div>
                    <button disabled title="Coming Soon" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-sm font-medium text-[#949599] cursor-not-allowed opacity-60">
                      <Send className="w-4 h-4" /> Send Test Email
                    </button>
                  </div>
                )}

                {tab === 'sms' && (
                  <div className="space-y-5">
                    <SectionTitle icon={Smartphone} title="SMS Settings" desc="SMSOnlineGH key and the sender name users see." />
                    <SecretInput label="SMSOnlineGH API Key" value={settings.sms?.apiKey || ''} show={showSecrets.smsApiKey} onToggle={() => toggleSecret('smsApiKey')} onChange={(v) => update('apiKey', v)} placeholder="••••••••••••" />
                    <div><label className={labelCls}>Sender ID</label><input className={inputCls} value={settings.sms?.senderId || ''} onChange={(e) => update('senderId', e.target.value)} placeholder="TRIBES" maxLength={11} /></div>
                    <button disabled title="Coming Soon" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-sm font-medium text-[#949599] cursor-not-allowed opacity-60">
                      <Send className="w-4 h-4" /> Send Test SMS
                    </button>
                  </div>
                )}

                {tab === 'security' && (
                  <div className="space-y-5">
                    <SectionTitle icon={Shield} title="Security Settings" desc="Login rules, attempts, and session limits." />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className={labelCls}>JWT Expiry (hours)</label><input type="number" className={inputCls} value={settings.security?.jwtExpiry ?? 24} onChange={(e) => update('jwtExpiry', parseInt(e.target.value))} /></div>
                      <div><label className={labelCls}>Max Login Attempts</label><input type="number" className={inputCls} value={settings.security?.maxLoginAttempts ?? 5} onChange={(e) => update('maxLoginAttempts', parseInt(e.target.value))} /></div>
                      <div><label className={labelCls}>Session Timeout (minutes)</label><input type="number" className={inputCls} value={settings.security?.sessionTimeout ?? 30} onChange={(e) => update('sessionTimeout', parseInt(e.target.value))} /></div>
                    </div>
                    <ToggleRow label="Email Verification" desc="Require email verification for new accounts" value={settings.security?.emailVerification ?? true} onChange={(v) => update('emailVerification', v)} />
                    <ToggleRow label="Two-Factor Authentication" desc="Enable 2FA for admin accounts" value={settings.security?.twoFactor ?? false} onChange={(v) => update('twoFactor', v)} />
                    <ToggleRow label="IP Whitelisting" desc="Restrict admin access to specific IPs" value={settings.security?.ipWhitelist ?? false} onChange={(v) => update('ipWhitelist', v)} />
                  </div>
                )}

                {tab === 'tax' && (
                  <div className="space-y-5">
                    <SectionTitle icon={Receipt} title="Tax Settings" desc="VAT rate and which transactions it applies to." />
                    <div><label className={labelCls}>VAT Rate (%)</label><input type="number" step="0.1" className={inputCls} value={settings.tax?.vatRate ?? 12.5} onChange={(e) => update('vatRate', parseFloat(e.target.value))} /></div>
                    <div><label className={labelCls}>Apply VAT To</label><select className={inputCls} value={settings.tax?.applyTo || 'all'} onChange={(e) => update('applyTo', e.target.value)}><option value="all">All Transactions</option><option value="tickets">Tickets Only</option><option value="services">Services Only</option></select></div>
                    <div><label className={labelCls}>Tax ID Number</label><input className={inputCls} value={settings.tax?.taxId || ''} onChange={(e) => update('taxId', e.target.value)} placeholder="GHA-000-000-000" /></div>
                    <ToggleRow label="Include VAT in Price" desc="Show prices as VAT-inclusive" value={settings.tax?.inclusive ?? false} onChange={(v) => update('inclusive', v)} />
                  </div>
                )}

                {/* Save button */}
                <div className="mt-6 pt-5 border-t border-[#494F55]/20 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition disabled:opacity-50"
                  >
                    {saving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /> Save Settings</>}
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
    <div className="flex items-center gap-3 pb-4 border-b border-[#494F55]/20">
      <div className="w-10 h-10 rounded-lg bg-white/ text-white flex items-center justify-center"><Icon className="w-5 h-5" /></div>
      <div><h2 className="text-base font-semibold text-[#EFEFF1]">{title}</h2><p className="text-xs text-[#949599]">{desc}</p></div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#1C232B]/50 border border-[#494F55]/20">
      <div><p className="text-sm font-medium text-[#EFEFF1]">{label}</p><p className="text-xs text-[#949599]">{desc}</p></div>
      <button onClick={() => onChange(!value)} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-white' : 'bg-[#494F55]/40'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function SecretInput({ label, value, show, onToggle, onChange, placeholder }) {
  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/ transition pr-10';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-[#949599] mb-1.5';
  const displayValue = show ? value : (value ? '••••••••••••••••' : '');
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input type="text" value={displayValue} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
        <button onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#949599] hover:text-[#EFEFF1] transition">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
