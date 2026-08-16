import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, CreditCard, Shield, Palette, Save, Upload, Lock, LogOut,
  Facebook, Twitter, Instagram, Linkedin, Globe, Check, Smartphone, Eye, EyeOff,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getOrganizationProfile, updateOrganizationProfile,
  getPaymentAccount, updatePaymentAccount,
  changePassword, getActiveSessions, revokeSession,
  getBranding, updateBranding,
} from '@/api/organizer';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import PageHeader from '@/components/common/PageHeader';

const inputCls = 'w-full px-4 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition';

const labelCls = 'block text-xs font-medium text-[#949599] mb-1.5 uppercase tracking-wider';

const TABS = [
  { key: 'profile', label: 'Organization Profile', icon: Building2 },
  { key: 'payment', label: 'Payment Account', icon: CreditCard },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'branding', label: 'Branding', icon: Palette },
];

export default function OrganizerSettingsPage() {
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile
  const [profile, setProfile] = useState({ name: '', description: '', website: '', facebook: '', twitter: '', instagram: '', linkedin: '' });
  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const logoInput = useRef(null);
  const bannerInput = useRef(null);

  // Payment
  const [payment, setPayment] = useState({ bankName: '', accountNumber: '', accountName: '', mobileMoney: '', payoutMethod: 'bank' });

  // Security
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [sessions, setSessions] = useState([]);
  const [changingPw, setChangingPw] = useState(false);

  // Branding
  const [branding, setBranding] = useState({ primaryColor: '#EFEFF1', tagline: '', about: '' });

  const fetchTabData = useCallback(async (activeTab) => {
    setLoading(true);
    try {
      if (activeTab === 'profile') {
        const res = await getOrganizationProfile();
        const d = res.data?.organization || res.data || {};
        setProfile({
          name: d.name || '', description: d.description || '', website: d.website || '',
          facebook: d.facebook || '', twitter: d.twitter || '', instagram: d.instagram || '', linkedin: d.linkedin || '',
        });
        setLogoPreview(d.logoUrl || '');
        setBannerPreview(d.bannerUrl || '');
      } else if (activeTab === 'payment') {
        const res = await getPaymentAccount();
        const d = res.data?.paymentAccount || res.data || {};
        setPayment({
          bankName: d.bankName || '', accountNumber: d.accountNumber || '', accountName: d.accountName || '',
          mobileMoney: d.mobileMoney || d.momoNumber || '', payoutMethod: d.payoutMethod || 'bank',
        });
      } else if (activeTab === 'security') {
        const res = await getActiveSessions();
        const d = res.data?.sessions || res.data || [];
        setSessions(Array.isArray(d) ? d : d.sessions || d.data || []);
      } else if (activeTab === 'branding') {
        const res = await getBranding();
        const d = res.data?.branding || res.data || {};
        setBranding({ primaryColor: d.primaryColor || '#EFEFF1', tagline: d.tagline || '', about: d.about || '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTabData(tab); }, [fetchTabData, tab]);

  const handleFile = (e, setPreview) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await updateOrganizationProfile({ ...profile, logoUrl: logoPreview, bannerUrl: bannerPreview });
      toast.success('Organization profile saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await updatePaymentAccount(payment);
      toast.success('Payment account saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save payment account');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePw = async (e) => {
    e?.preventDefault();
    if (!pwForm.current || !pwForm.new) { toast.error('Fill all password fields'); return; }
    if (pwForm.new !== pwForm.confirm) { toast.error('New passwords do not match'); return; }
    if (pwForm.new.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/[a-zA-Z]/.test(pwForm.new) || !/\d/.test(pwForm.new)) {
      toast.error('Password must include at least one letter and one number');
      return;
    }
    setChangingPw(true);
    try {
      await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.new });
      toast.success('Password changed successfully');
      setPwForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await revokeSession(id);
      toast.success('Session revoked');
      setSessions((s) => s.filter((x) => x.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke session');
    }
  };

  const saveBranding = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await updateBranding(branding);
      toast.success('Branding saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Settings}
        accent="slate"
        title="Settings"
        subtitle="Manage your organization, payment, security, and branding."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#262B2F]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === key ? 'text-white' : 'text-[#949599] hover:text-[#EFEFF1]'}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading settings..." className="py-20" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Organization Profile */}
            {tab === 'profile' && (
              <form onSubmit={saveProfile} className="space-y-5 max-w-3xl">
                {/* Logo + Banner uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className={labelCls}>Logo</label>
                    <button
                      type="button"
                      onClick={() => logoInput.current?.click()}
                      className="w-full aspect-square rounded-xl bg-[#171A1D] border border-dashed border-[#494F55]/50 hover:border-white/40 flex items-center justify-center overflow-hidden transition group"
                    >
                      {logoPreview ? (
                        <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[#949599] group-hover:text-white transition">
                          <Upload className="w-6 h-6" />
                          <span className="text-xs">Upload logo</span>
                        </div>
                      )}
                    </button>
                    <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, setLogoPreview)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Banner</label>
                    <button
                      type="button"
                      onClick={() => bannerInput.current?.click()}
                      className="w-full h-40 sm:h-44 rounded-xl bg-[#171A1D] border border-dashed border-[#494F55]/50 hover:border-white/40 flex items-center justify-center overflow-hidden transition group"
                    >
                      {bannerPreview ? (
                        <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[#949599] group-hover:text-white transition">
                          <Upload className="w-6 h-6" />
                          <span className="text-xs">Upload banner (1200×400 recommended)</span>
                        </div>
                      )}
                    </button>
                    <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, setBannerPreview)} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Organization Name</label>
                  <input value={profile.name} onChange={(e) => setProfile((f) => ({ ...f, name: e.target.value }))} placeholder="Your organization" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea value={profile.description} onChange={(e) => setProfile((f) => ({ ...f, description: e.target.value }))} rows={4} placeholder="Tell people about your organization..." className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                    <input value={profile.website} onChange={(e) => setProfile((f) => ({ ...f, website: e.target.value }))} placeholder="https://yourorg.com" className={`${inputCls} pl-10`} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Social Links</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SocialInput icon={Facebook} value={profile.facebook} onChange={(v) => setProfile((f) => ({ ...f, facebook: v }))} placeholder="Facebook URL" />
                    <SocialInput icon={Twitter} value={profile.twitter} onChange={(v) => setProfile((f) => ({ ...f, twitter: v }))} placeholder="Twitter / X URL" />
                    <SocialInput icon={Instagram} value={profile.instagram} onChange={(v) => setProfile((f) => ({ ...f, instagram: v }))} placeholder="Instagram URL" />
                    <SocialInput icon={Linkedin} value={profile.linkedin} onChange={(v) => setProfile((f) => ({ ...f, linkedin: v }))} placeholder="LinkedIn URL" />
                  </div>
                </div>

                <SaveButton onClick={saveProfile} saving={saving} />
              </form>
            )}

            {/* Payment Account */}
            {tab === 'payment' && (
              <form onSubmit={savePayment} className="space-y-5 max-w-2xl">
                <div>
                  <label className={labelCls}>Preferred Payout Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'bank', label: 'Bank Transfer', icon: Building2 },
                      { value: 'momo', label: 'Mobile Money', icon: Smartphone },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPayment((p) => ({ ...p, payoutMethod: opt.value }))}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium transition ${
                            payment.payoutMethod === opt.value
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-[#1C232B] border-[#494F55]/40 text-[#949599] hover:border-[#494F55]/60'
                          }`}
                        >
                          <Icon className="w-4 h-4" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input value={payment.bankName} onChange={(e) => setPayment((p) => ({ ...p, bankName: e.target.value }))} placeholder="GCB Bank, Stanbic..." className={inputCls} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input value={payment.accountNumber} onChange={(e) => setPayment((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="0123456789012" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Account Name</label>
                    <input value={payment.accountName} onChange={(e) => setPayment((p) => ({ ...p, accountName: e.target.value }))} placeholder="John Doe" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Mobile Money Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
                    <input value={payment.mobileMoney} onChange={(e) => setPayment((p) => ({ ...p, mobileMoney: e.target.value }))} placeholder="024 xxx xxxx" className={`${inputCls} pl-10`} />
                  </div>
                </div>

                <SaveButton onClick={savePayment} saving={saving} />
              </form>
            )}

            {/* Security */}
            {tab === 'security' && (
              <div className="space-y-6 max-w-2xl">
                {/* Change password */}
                <form onSubmit={handleChangePw} className="space-y-4">
                  <h2 className="text-base font-semibold text-[#EFEFF1] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-white" /> Change Password
                  </h2>
                  {[
                    { key: 'current', label: 'Current Password' },
                    { key: 'new', label: 'New Password' },
                    { key: 'confirm', label: 'Confirm New Password' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <div className="relative">
                        <input
                          type={showPw[key] ? 'text' : 'password'}
                          value={pwForm[key]}
                          onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder="••••••••"
                          className={`${inputCls} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949599] hover:text-[#EFEFF1] transition"
                        >
                          {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <SaveButton onClick={handleChangePw} saving={changingPw} label="Update Password" />
                </form>

                {/* Active sessions */}
                <div className="pt-4 border-t border-[#262B2F]">
                  <h2 className="text-base font-semibold text-[#EFEFF1] mb-3">Active Sessions</h2>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-[#949599] py-4">No active sessions found.</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-lg bg-[#171A1D] border border-[#262B2F] p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#494F55]/30 text-[#949599] flex items-center justify-center shrink-0">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#EFEFF1] truncate">
                                {s.device || s.browser || 'Device'} · {s.location || 'Unknown location'}
                              </p>
                              <p className="text-xs text-[#949599]">
                                {s.lastActive ? `Active ${new Date(s.lastActive).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                                {s.current && <span className="ml-2"><Badge variant="success" size="sm">This device</Badge></span>}
                              </p>
                            </div>
                          </div>
                          {!s.current && (
                            <button
                              onClick={() => handleRevokeSession(s.id)}
                              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#949599] border border-[#262B2F] hover:text-red-400 hover:border-red-500/30 transition"
                            >
                              <LogOut className="w-3.5 h-3.5" /> Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Branding */}
            {tab === 'branding' && (
              <form onSubmit={saveBranding} className="space-y-5 max-w-2xl">
                <div>
                  <label className={labelCls}>Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                      className="w-14 h-11 rounded-lg border border-[#494F55]/40 bg-[#1C232B] cursor-pointer p-1"
                    />
                    <input
                      value={branding.primaryColor}
                      onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                      placeholder="#EFEFF1"
                      className={`${inputCls} max-w-[160px] font-mono`}
                    />
                    <div className="flex items-center gap-1.5 text-xs text-[#949599]">
                      <div className="w-5 h-5 rounded border border-[#494F55]/40" style={{ backgroundColor: branding.primaryColor }} />
                      Preview
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Tagline</label>
                  <input value={branding.tagline} onChange={(e) => setBranding((b) => ({ ...b, tagline: e.target.value }))} placeholder="Unforgettable events, every time" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>About Text</label>
                  <textarea value={branding.about} onChange={(e) => setBranding((b) => ({ ...b, about: e.target.value }))} rows={5} placeholder="Tell your brand story..." className={`${inputCls} resize-none`} />
                </div>

                {/* Live preview card */}
                <div className="rounded-xl border border-[#262B2F] overflow-hidden">
                  <div className="h-20" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}40, #1C232B)` }} />
                  <div className="p-5 bg-[#171A1D]">
                    <p className="text-xs uppercase tracking-wider text-[#949599]">Preview</p>
                    <h3 className="mt-1 text-lg font-bold text-[#EFEFF1]">Your Organization</h3>
                    {branding.tagline && <p className="text-sm font-medium" style={{ color: branding.primaryColor }}>{branding.tagline}</p>}
                    {branding.about && <p className="mt-2 text-sm text-[#949599] line-clamp-2">{branding.about}</p>}
                  </div>
                </div>

                <SaveButton onClick={saveBranding} saving={saving} />
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function SocialInput({ icon: Icon, value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-10`}
      />
    </div>
  );
}

function SaveButton({ onClick, saving, label = 'Save Changes' }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onClick}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] disabled:opacity-60 transition-colors"
      >
        {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : label}
      </button>
    </div>
  );
}
