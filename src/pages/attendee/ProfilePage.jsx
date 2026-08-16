import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, Shield, CreditCard, Bell, Camera, Save, Lock, Mail, Phone, MapPin,
  Calendar, FileText, Check, Smartphone, Plus, Trash2, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getProfile, updateProfile, updatePassword, uploadAvatar,
} from '@/api/users';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const TABS = [
  { value: 'personal', label: 'Personal Info', icon: User },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'payments', label: 'Payment Methods', icon: CreditCard },
  { value: 'notifications', label: 'Notifications', icon: Bell },
];

const containerStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemFade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('personal');
  const [profile, setProfile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getProfile();
        const data = res.data?.user ?? res.data ?? user;
        setProfile(data);
      } catch (err) {
        // Fall back to context user
        setProfile(user);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setAvatarUploading(true);
    try {
      const res = await uploadAvatar(file);
      const avatarUrl = res.data?.avatar ?? res.data?.avatarUrl ?? res.data;
      setProfile((p) => ({ ...p, avatar: avatarUrl }));
      if (setUser) setUser({ ...user, avatar: avatarUrl });
      toast.success('Avatar updated');
    } catch (err) {
      toast.error('Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading || !profile) {
    return <LoadingSpinner size="lg" label="Loading profile..." className="py-24" />;
  }

  const initials = (profile.name || profile.email || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show" className="space-y-6">
      {/* Profile header */}
      <motion.div variants={itemFade} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#171A1D] via-[#1C232B] to-[#242B32] border border-[#262B2F]">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#D4AF37] flex items-center justify-center text-[#1C232B] text-3xl font-bold ring-2 ring-[#D4AF37]/30">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#1C232B] border border-[#494F55]/40 flex items-center justify-center text-[#D4AF37] hover:bg-[#242B32] disabled:opacity-50 transition"
              title="Upload avatar"
            >
              {avatarUploading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h1 className="text-2xl font-bold text-[#EFEFF1] truncate">{profile.name || 'User'}</h1>
            <p className="text-sm text-[#949599] truncate">{profile.email}</p>
            <div className="mt-3 flex items-center justify-center sm:justify-start gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-semibold">
                <Check className="w-3.5 h-3.5" /> Attendee
              </span>
              {profile.createdAt && (
                <span className="text-xs text-[#494F55] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemFade} className="flex gap-2 flex-wrap border-b border-[#262B2F] pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.value ? 'text-[#D4AF37]' : 'text-[#949599] hover:text-[#EFEFF1]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {tab === t.value && (
                <motion.div
                  layoutId="profileTab"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-[#D4AF37]"
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'personal' && <PersonalInfoTab profile={profile} setProfile={setProfile} />}
          {tab === 'security' && <SecurityTab profile={profile} />}
          {tab === 'payments' && <PaymentMethodsTab profile={profile} />}
          {tab === 'notifications' && <NotificationSettingsTab profile={profile} setProfile={setProfile} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ============== Personal Info Tab ============== */
function PersonalInfoTab({ profile, setProfile }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    location: profile.location || '',
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await updateProfile(form);
      const updated = res.data?.user ?? res.data ?? { ...profile, ...form };
      setProfile(updated);
      if (setUser) setUser({ ...user, ...updated });
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field icon={User} label="Full Name">
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field icon={Mail} label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field icon={Phone} label="Phone">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 234 567 8900"
            className={inputClass}
          />
        </Field>
        <Field icon={MapPin} label="Location">
          <input
            type="text"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="City, Country"
            className={inputClass}
          />
        </Field>
        <Field icon={Calendar} label="Date of Birth">
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field icon={FileText} label="Bio">
        <textarea
          value={form.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          rows={4}
          placeholder="Tell us a bit about yourself..."
          className={`${inputClass} resize-none`}
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

/* ============== Security Tab ============== */
function SecurityTab() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [twoFA, setTwoFA] = useState(false);

  const handleChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!form.current || !form.next || !form.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (form.next.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (!/[a-zA-Z]/.test(form.next) || !/\d/.test(form.next)) {
      toast.error('New password must include at least one letter and one number');
      return;
    }
    if (form.next !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await updatePassword({ currentPassword: form.current, newPassword: form.next });
      toast.success('Password updated successfully');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Change password */}
      <form onSubmit={handlePasswordSubmit} className="space-y-5">
        <div>
          <h3 className="text-base font-semibold text-[#EFEFF1]">Change Password</h3>
          <p className="text-sm text-[#949599] mt-0.5">Update your password to keep your account secure.</p>
        </div>
        <Field icon={Lock} label="Current Password">
          <div className="relative">
            <input
              type={show.current ? 'text' : 'password'}
              value={form.current}
              onChange={(e) => handleChange('current', e.target.value)}
              className={inputClass}
            />
            <button type="button" onClick={() => setShow((s) => ({ ...s, current: !s.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949599] hover:text-[#EFEFF1]">
              {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field icon={Lock} label="New Password">
            <div className="relative">
              <input
                type={show.next ? 'text' : 'password'}
                value={form.next}
                onChange={(e) => handleChange('next', e.target.value)}
                className={inputClass}
              />
              <button type="button" onClick={() => setShow((s) => ({ ...s, next: !s.next }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949599] hover:text-[#EFEFF1]">
                {show.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field icon={Lock} label="Confirm Password">
            <div className="relative">
              <input
                type={show.confirm ? 'text' : 'password'}
                value={form.confirm}
                onChange={(e) => handleChange('confirm', e.target.value)}
                className={inputClass}
              />
              <button type="button" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949599] hover:text-[#EFEFF1]">
                {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition">
            <Lock className="w-4 h-4" />
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* 2FA */}
      <div className="pt-6 border-t border-[#262B2F]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#494F55]/30 text-[#949599] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#EFEFF1]">Two-Factor Authentication</h3>
              <p className="text-sm text-[#949599]">Add an extra layer of security to your account.</p>
            </div>
          </div>
          <ToggleSwitch checked={twoFA} onChange={(v) => { setTwoFA(v); toast.info(v ? '2FA setup coming soon' : '2FA disabled'); }} />
        </div>
        {!twoFA && (
          <p className="mt-3 text-xs text-[#494F55] pl-13">
            Protect your account with an authenticator app. We recommend enabling 2FA for better security.
          </p>
        )}
      </div>
    </div>
  );
}

/* ============== Payment Methods Tab ============== */
function PaymentMethodsTab({ profile }) {
  const [cards, setCards] = useState(profile.paymentMethods || profile.cards || []);
  const [adding, setAdding] = useState(false);

  const handleAdd = () => {
    setAdding(true);
    setTimeout(() => {
      setAdding(false);
      toast.info('Payment method integration coming soon');
    }, 500);
  };

  const handleRemove = (idx) => {
    setCards((prev) => prev.filter((_, i) => i !== idx));
    toast.success('Payment method removed');
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#EFEFF1]">Saved Payment Methods</h3>
          <p className="text-sm text-[#949599] mt-0.5">Manage your saved cards for faster checkout.</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition"
        >
          <Plus className="w-4 h-4" />
          {adding ? 'Adding...' : 'Add Payment Method'}
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-10 text-center">
          <div className="w-14 h-14 rounded-xl bg-[#242B32] flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-[#494F55]" />
          </div>
          <p className="text-sm font-medium text-[#EFEFF1]">No payment methods saved</p>
          <p className="text-xs text-[#949599] mt-1">Add a card to speed up your checkout process.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card, idx) => (
            <div key={idx} className="flex items-center gap-4 rounded-xl bg-[#171A1D] border border-[#262B2F] p-4">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#EFEFF1]">
                  {card.brand || 'Card'} •••• {card.last4 || '****'}
                </p>
                <p className="text-xs text-[#949599]">Expires {card.expiryMonth || '**'}/{card.expiryYear || '****'}</p>
              </div>
              {card.isDefault && (
                <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-semibold uppercase">Default</span>
              )}
              <button
                onClick={() => handleRemove(idx)}
                className="w-8 h-8 rounded-lg text-[#949599] hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============== Notification Settings Tab ============== */
function NotificationSettingsTab({ profile, setProfile }) {
  const [settings, setSettings] = useState({
    emailTicketConfirmations: profile.notificationSettings?.emailTicketConfirmations ?? true,
    emailEventReminders: profile.notificationSettings?.emailEventReminders ?? true,
    emailPromotions: profile.notificationSettings?.emailPromotions ?? false,
    smsTicketConfirmations: profile.notificationSettings?.smsTicketConfirmations ?? false,
    smsEventReminders: profile.notificationSettings?.smsEventReminders ?? false,
    pushTicketConfirmations: profile.notificationSettings?.pushTicketConfirmations ?? true,
    pushEventReminders: profile.notificationSettings?.pushEventReminders ?? true,
    pushPromotions: profile.notificationSettings?.pushPromotions ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({ notificationSettings: settings });
      const updated = res.data?.user ?? res.data ?? { ...profile, notificationSettings: settings };
      setProfile(updated);
      toast.success('Notification settings saved');
    } catch (err) {
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    {
      title: 'Ticket Confirmations',
      icon: Check,
      keys: ['emailTicketConfirmations', 'smsTicketConfirmations', 'pushTicketConfirmations'],
    },
    {
      title: 'Event Reminders',
      icon: Calendar,
      keys: ['emailEventReminders', 'smsEventReminders', 'pushEventReminders'],
    },
    {
      title: 'Promotions & Offers',
      icon: Mail,
      keys: ['emailPromotions', 'pushPromotions'],
    },
  ];

  const channelLabel = { email: 'Email', sms: 'SMS', push: 'Push' };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-semibold text-[#EFEFF1]">Notification Settings</h3>
        <p className="text-sm text-[#949599] mt-0.5">Choose how you want to be notified.</p>
      </div>

      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.title} className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-4 h-4 text-[#D4AF37]" />
              <h4 className="text-sm font-semibold text-[#EFEFF1]">{group.title}</h4>
            </div>
            <div className="space-y-3">
              {group.keys.map((key) => {
                const channel = key.startsWith('email') ? 'email' : key.startsWith('sms') ? 'sms' : 'push';
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {channel === 'email' && <Mail className="w-4 h-4 text-[#494F55]" />}
                      {channel === 'sms' && <Smartphone className="w-4 h-4 text-[#494F55]" />}
                      {channel === 'push' && <Bell className="w-4 h-4 text-[#494F55]" />}
                      <span className="text-sm text-[#949599]">{channelLabel[channel]}</span>
                    </div>
                    <ToggleSwitch checked={settings[key]} onChange={() => handleToggle(key)} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#1C232B] text-sm font-semibold hover:bg-[#c4a030] disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

/* ============== Shared UI ============== */
const inputClass =
  'w-full px-3 py-2.5 rounded-lg bg-[#1C232B] border border-[#494F55]/40 text-sm text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition';

function Field({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#949599] mb-2">
        <Icon className="w-3.5 h-3.5 text-[#494F55]" />
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-[#D4AF37]' : 'bg-[#494F55]/50'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
