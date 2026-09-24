import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, AlertTriangle, Megaphone, Image as ImageIcon, Plus, Pencil,
  Trash2, Eye, EyeOff, CheckCircle2, ShieldAlert, RefreshCw, Save,
  ExternalLink, Layers, ArrowUpRight, HelpCircle, Phone, Mail, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getMobileAppConfig,
  updateMobileAppSettings,
  createMobileAppBanner,
  updateMobileAppBanner,
  deleteMobileAppBanner,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import PageHeader from '@/components/common/PageHeader';

export default function MobileAppManagementPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('banners'); // 'banners' | 'maintenance' | 'announcement'
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({
    mobile_maintenance_mode: 'false',
    mobile_maintenance_message: 'We are currently performing scheduled maintenance on the mobile app. Please check back shortly.',
    mobile_min_version: '1.0.0',
    mobile_support_email: 'support@tribesandcliqs.com',
    mobile_support_phone: '+233 55 123 4567',
    mobile_announcement_enabled: 'false',
    mobile_announcement_text: '',
    mobile_announcement_type: 'info',
    mobile_announcement_link: '',
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // Banner Modal
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_type: 'none',
    link_target: '',
    is_active: true,
    sort_order: 0,
  });
  const [savingBanner, setSavingBanner] = useState(false);

  // Delete banner confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingBanner, setDeletingBanner] = useState(false);

  // Live preview active banner index
  const [previewBannerIndex, setPreviewBannerIndex] = useState(0);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMobileAppConfig();
      if (res.data) {
        setBanners(res.data.banners || []);
        if (res.data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...res.data.settings,
          }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load mobile app configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveSettings = async (overrideSettings = null) => {
    setSavingSettings(true);
    try {
      const payload = overrideSettings || settings;
      await updateMobileAppSettings(payload);
      toast.success('Mobile settings updated successfully');
      await fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const nextVal = settings.mobile_maintenance_mode === 'true' ? 'false' : 'true';
    const nextSettings = { ...settings, mobile_maintenance_mode: nextVal };
    setSettings(nextSettings);
    await handleSaveSettings(nextSettings);
  };

  const handleToggleAnnouncement = async () => {
    const nextVal = settings.mobile_announcement_enabled === 'true' ? 'false' : 'true';
    const nextSettings = { ...settings, mobile_announcement_enabled: nextVal };
    setSettings(nextSettings);
    await handleSaveSettings(nextSettings);
  };

  const openAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      subtitle: '',
      image_url: '',
      link_type: 'none',
      link_target: '',
      is_active: true,
      sort_order: banners.length,
    });
    setShowBannerModal(true);
  };

  const openEditBanner = (b) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      image_url: b.image_url || '',
      link_type: b.link_type || 'none',
      link_target: b.link_target || '',
      is_active: !!b.is_active,
      sort_order: b.sort_order ?? 0,
    });
    setShowBannerModal(true);
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      toast.error('Please enter a banner title');
      return;
    }
    setSavingBanner(true);
    try {
      if (editingBanner) {
        await updateMobileAppBanner(editingBanner.id, bannerForm);
        toast.success('Banner updated successfully');
      } else {
        await createMobileAppBanner(bannerForm);
        toast.success('Banner created successfully');
      }
      setShowBannerModal(false);
      await fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteTarget) return;
    setDeletingBanner(true);
    try {
      await deleteMobileAppBanner(deleteTarget.id);
      toast.success('Banner deleted');
      setDeleteTarget(null);
      await fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete banner');
    } finally {
      setDeletingBanner(false);
    }
  };

  const handleToggleBannerActive = async (b) => {
    try {
      await updateMobileAppBanner(b.id, { is_active: !b.is_active });
      toast.success(b.is_active ? 'Banner deactivated' : 'Banner activated');
      await fetchConfig();
    } catch {
      toast.error('Failed to toggle banner status');
    }
  };

  const isMaintenanceOn = settings.mobile_maintenance_mode === 'true';
  const isAnnouncementOn = settings.mobile_announcement_enabled === 'true';
  const activeBanners = banners.filter((b) => b.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mobile App Remote Control"
        subtitle="Manage promotional banners, broadcast announcements, and app maintenance mode for the iOS/Android mobile app."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={fetchConfig}
              className="px-3 py-2 text-sm text-gray-300 hover:text-white bg-[#242B32] hover:bg-[#2E363E] border border-[#2E363E] rounded-xl flex items-center gap-2 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={openAddBanner}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-xl flex items-center gap-2 transition shadow-lg shadow-accent/20"
            >
              <Plus className="w-4 h-4" />
              New Banner
            </button>
          </div>
        }
      />

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Maintenance Mode Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isMaintenanceOn 
            ? 'bg-amber-950/20 border-amber-500/40 text-amber-200' 
            : 'bg-[#1C232B] border-[#2E363E] text-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isMaintenanceOn ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {isMaintenanceOn ? <ShieldAlert className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">App Status</p>
                <h4 className="text-base font-bold text-white">
                  {isMaintenanceOn ? 'Under Maintenance' : 'Operational'}
                </h4>
              </div>
            </div>
            <button
              onClick={handleToggleMaintenance}
              disabled={savingSettings}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition ${
                isMaintenanceOn
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-[#2E363E] text-gray-300 hover:text-white hover:bg-[#38424c]'
              }`}
            >
              {isMaintenanceOn ? 'Resume App' : 'Lock App'}
            </button>
          </div>
        </div>

        {/* Active Banners */}
        <div className="p-4 rounded-2xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Active Banners</p>
              <h4 className="text-base font-bold text-white">
                {activeBanners.length} <span className="text-xs text-gray-500 font-normal">/ {banners.length} total</span>
              </h4>
            </div>
          </div>
          <Badge variant={activeBanners.length > 0 ? 'success' : 'default'}>
            {activeBanners.length > 0 ? 'Live in App' : 'No Carousel'}
          </Badge>
        </div>

        {/* Global Announcement */}
        <div className="p-4 rounded-2xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isAnnouncementOn ? 'bg-purple-500/10 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">In-App Alert</p>
              <h4 className="text-base font-bold text-white">
                {isAnnouncementOn ? 'Broadcasting' : 'Disabled'}
              </h4>
            </div>
          </div>
          <button
            onClick={handleToggleAnnouncement}
            disabled={savingSettings}
            className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition ${
              isAnnouncementOn
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
                : 'bg-[#2E363E] text-gray-400 hover:text-white hover:bg-[#38424c]'
            }`}
          >
            {isAnnouncementOn ? 'Turn Off' : 'Turn On'}
          </button>
        </div>

        {/* Min Version */}
        <div className="p-4 rounded-2xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Min App Version</p>
              <h4 className="text-base font-bold text-white font-mono">
                v{settings.mobile_min_version || '1.0.0'}
              </h4>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 bg-[#242B32] px-2 py-1 rounded-md border border-[#2E363E]">
            Enforced
          </span>
        </div>
      </div>

      {/* Main Grid: Management Tabs (Left 2 cols) & Live Phone Preview (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tabs & Forms */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-[#2E363E] pb-2">
            {[
              { id: 'banners', label: 'Promotional Banners', icon: ImageIcon, badge: banners.length },
              { id: 'announcement', label: 'In-App Announcement', icon: Megaphone, badge: isAnnouncementOn ? 'Active' : null },
              { id: 'maintenance', label: 'Maintenance & App Rules', icon: ShieldAlert, badge: isMaintenanceOn ? 'ON' : null },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'text-gray-400 hover:text-white hover:bg-[#242B32]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#2E363E] text-gray-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: Promotional Banners */}
          {activeTab === 'banners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Hero Carousel Banners</h3>
                  <p className="text-xs text-gray-400">
                    These banners cycle automatically at the top of the mobile home screen.
                  </p>
                </div>
                <button
                  onClick={openAddBanner}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#242B32] hover:bg-[#2E363E] border border-[#2E363E] rounded-lg flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Banner
                </button>
              </div>

              {banners.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#1C232B] border border-[#2E363E] text-center">
                  <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-white mb-1">No mobile banners configured</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                    Create your first promotional banner to engage mobile users with highlighted festivals, tickets, and flash sales.
                  </p>
                  <button
                    onClick={openAddBanner}
                    className="px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Banner
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {banners.map((b) => (
                    <div
                      key={b.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        b.is_active ? 'bg-[#1C232B] border-[#2E363E]' : 'bg-[#161D22] border-[#242B32] opacity-75'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        {/* Thumbnail */}
                        <div className="w-24 h-16 rounded-xl bg-[#242B32] overflow-hidden flex-shrink-0 border border-[#2E363E] flex items-center justify-center relative">
                          {b.image_url ? (
                            <img
                              src={b.image_url}
                              alt={b.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#242B32] to-[#1C232B] flex items-center justify-center text-gray-500">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 px-1 py-0.2 rounded text-gray-300 font-mono">
                            #{b.sort_order}
                          </span>
                        </div>

                        {/* Details */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-white">{b.title}</h4>
                            <Badge variant={b.is_active ? 'success' : 'default'}>
                              {b.is_active ? 'Active' : 'Draft'}
                            </Badge>
                          </div>
                          {b.subtitle && (
                            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{b.subtitle}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                            {b.link_type && b.link_type !== 'none' ? (
                              <span className="flex items-center gap-1 text-sky-400">
                                <ArrowUpRight className="w-3 h-3" />
                                Links to: {b.link_type} {b.link_target ? `(${b.link_target})` : ''}
                              </span>
                            ) : (
                              <span>No click action</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleToggleBannerActive(b)}
                          className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition ${
                            b.is_active
                              ? 'text-gray-400 hover:text-amber-400 hover:bg-[#242B32]'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={b.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {b.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEditBanner(b)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#242B32] rounded-xl transition"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: In-App Announcement */}
          {activeTab === 'announcement' && (
            <div className="p-6 rounded-2xl bg-[#1C232B] border border-[#2E363E] space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Global In-App Announcement Bar</h3>
                  <p className="text-xs text-gray-400">
                    Display an urgent flash alert banner directly at the top of the mobile interface.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.mobile_announcement_enabled === 'true'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mobile_announcement_enabled: e.target.checked ? 'true' : 'false',
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2E363E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Announcement Banner Text
                  </label>
                  <textarea
                    rows={2}
                    value={settings.mobile_announcement_text || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, mobile_announcement_text: e.target.value })
                    }
                    placeholder="e.g. 🎉 Flash Ticket Discount! Use promo code CLIQS20 today at checkout."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Visual Tone / Style
                    </label>
                    <select
                      value={settings.mobile_announcement_type || 'info'}
                      onChange={(e) =>
                        setSettings({ ...settings, mobile_announcement_type: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="info">Info (Slate / Charcoal)</option>
                      <option value="success">Success (Emerald Green)</option>
                      <option value="warning">Warning (Amber Orange)</option>
                      <option value="danger">Urgent / Alert (Crimson Red)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Action Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={settings.mobile_announcement_link || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, mobile_announcement_link: e.target.value })
                      }
                      placeholder="e.g. /explore or https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2E363E] flex justify-end">
                <button
                  onClick={() => handleSaveSettings()}
                  disabled={savingSettings}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl flex items-center gap-2 transition shadow-lg shadow-accent/20"
                >
                  <Save className="w-4 h-4" />
                  {savingSettings ? 'Saving...' : 'Save In-App Announcement'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Maintenance & App Rules */}
          {activeTab === 'maintenance' && (
            <div className="p-6 rounded-2xl bg-[#1C232B] border border-[#2E363E] space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#2E363E]">
                <div>
                  <h3 className="text-base font-semibold text-white">Mobile Maintenance Screen</h3>
                  <p className="text-xs text-gray-400">
                    When active, all mobile users will see a full-screen maintenance overlay blocking access until maintenance completes.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.mobile_maintenance_mode === 'true'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mobile_maintenance_mode: e.target.checked ? 'true' : 'false',
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2E363E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Maintenance Notice Message
                  </label>
                  <textarea
                    rows={3}
                    value={settings.mobile_maintenance_message || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, mobile_maintenance_message: e.target.value })
                    }
                    placeholder="We are currently upgrading server systems to serve you better..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Minimum App Version
                    </label>
                    <input
                      type="text"
                      value={settings.mobile_min_version || '1.0.0'}
                      onChange={(e) =>
                        setSettings({ ...settings, mobile_min_version: e.target.value })
                      }
                      placeholder="1.0.0"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm font-mono focus:outline-none focus:border-accent"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Users below this version are prompted to update.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.mobile_support_email || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, mobile_support_email: e.target.value })
                      }
                      placeholder="support@tribesandcliqs.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Support Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={settings.mobile_support_phone || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, mobile_support_phone: e.target.value })
                      }
                      placeholder="+233 55 123 4567"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#2E363E] flex justify-end">
                <button
                  onClick={() => handleSaveSettings()}
                  disabled={savingSettings}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl flex items-center gap-2 transition shadow-lg shadow-accent/20"
                >
                  <Save className="w-4 h-4" />
                  {savingSettings ? 'Saving...' : 'Save Maintenance Settings'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Mobile Mockup / Simulator */}
        <div className="lg:col-span-4 sticky top-6">
          <div className="p-4 rounded-3xl bg-[#161D22] border border-[#2E363E] shadow-2xl space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-accent" />
                Live Mobile Preview
              </span>
              <span className="text-[10px] bg-[#242B32] border border-[#2E363E] text-gray-400 px-2 py-0.5 rounded-full">
                Real-Time
              </span>
            </div>

            {/* Mobile Device Frame */}
            <div className="w-full max-w-[280px] mx-auto h-[540px] bg-[#1C232B] rounded-[36px] border-4 border-[#2E363E] shadow-2xl overflow-hidden flex flex-col relative select-none">
              {/* Dynamic Island / Notch */}
              <div className="h-6 bg-[#161D22] flex items-center justify-center relative flex-shrink-0">
                <div className="w-16 h-3 bg-[#242B32] rounded-full"></div>
              </div>

              {/* Status bar */}
              <div className="px-4 py-1 flex items-center justify-between text-[9px] text-gray-400">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-3 h-2 border border-gray-400 rounded-sm"></div>
                </div>
              </div>

              {/* Content viewport */}
              <div className="flex-1 overflow-y-auto flex flex-col relative bg-[#1C232B]">
                {/* Condition 1: Maintenance Mode is ON */}
                {isMaintenanceOn ? (
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-[#161D22]/90">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">Scheduled Maintenance</h5>
                    <p className="text-[10px] text-gray-400 leading-relaxed mb-4 px-2">
                      {settings.mobile_maintenance_message || 'Under maintenance'}
                    </p>
                    <div className="w-full space-y-2">
                      <div className="py-1.5 px-3 bg-[#242B32] rounded-lg text-[9px] text-gray-300 font-mono">
                        {settings.mobile_support_email}
                      </div>
                      <div className="py-2 bg-amber-500 text-black font-semibold rounded-lg text-[10px]">
                        Retry Connection
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Condition 2: Regular App Flow */
                  <div className="flex-1 flex flex-col">
                    {/* In-App Announcement Bar Preview */}
                    {isAnnouncementOn && settings.mobile_announcement_text && (
                      <div className={`px-3 py-2 text-[9px] flex items-center gap-1.5 border-b font-medium ${
                        settings.mobile_announcement_type === 'danger'
                          ? 'bg-red-950/80 text-red-200 border-red-900/50'
                          : settings.mobile_announcement_type === 'warning'
                          ? 'bg-amber-950/80 text-amber-200 border-amber-900/50'
                          : settings.mobile_announcement_type === 'success'
                          ? 'bg-emerald-950/80 text-emerald-200 border-emerald-900/50'
                          : 'bg-[#242B32] text-gray-200 border-[#2E363E]'
                      }`}>
                        <Megaphone className="w-3 h-3 flex-shrink-0" />
                        <span className="line-clamp-2">{settings.mobile_announcement_text}</span>
                      </div>
                    )}

                    {/* App Header */}
                    <div className="p-3 border-b border-[#2E363E]/60 flex items-center justify-between">
                      <span className="text-xs font-bold tracking-tight text-white">CLIQS</span>
                      <div className="w-6 h-6 rounded-full bg-[#242B32] border border-[#2E363E] flex items-center justify-center text-[10px] text-gray-300">
                        👤
                      </div>
                    </div>

                    {/* Banner Carousel Hero Preview */}
                    <div className="p-3 space-y-2">
                      <div className="text-[10px] font-semibold text-gray-400">Featured Events</div>
                      {activeBanners.length > 0 ? (
                        <div className="relative rounded-2xl overflow-hidden bg-[#242B32] border border-[#2E363E] h-28 group">
                          {activeBanners[previewBannerIndex % activeBanners.length]?.image_url ? (
                            <img
                              src={activeBanners[previewBannerIndex % activeBanners.length]?.image_url}
                              alt="banner"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-accent/40 to-[#242B32] flex items-center justify-center">
                              <Sparkles className="w-6 h-6 text-white/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 flex flex-col justify-end">
                            <h6 className="text-[11px] font-bold text-white line-clamp-1">
                              {activeBanners[previewBannerIndex % activeBanners.length]?.title}
                            </h6>
                            <p className="text-[9px] text-gray-300 line-clamp-1">
                              {activeBanners[previewBannerIndex % activeBanners.length]?.subtitle}
                            </p>
                          </div>

                          {/* Navigation dots */}
                          {activeBanners.length > 1 && (
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setPreviewBannerIndex((prev) =>
                                    prev === 0 ? activeBanners.length - 1 : prev - 1
                                  )
                                }
                                className="w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                              >
                                <ChevronLeft className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setPreviewBannerIndex((prev) => (prev + 1) % activeBanners.length)
                                }
                                className="w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#2E363E] p-4 text-center">
                          <span className="text-[9px] text-gray-500">No active banners live</span>
                        </div>
                      )}
                    </div>

                    {/* App Feed Mock Content */}
                    <div className="p-3 space-y-2">
                      <div className="text-[10px] font-semibold text-gray-400">Trending Now</div>
                      <div className="space-y-1.5">
                        {[1, 2].map((i) => (
                          <div key={i} className="p-2 rounded-xl bg-[#242B32]/70 border border-[#2E363E]/40 flex gap-2">
                            <div className="w-10 h-10 rounded-lg bg-[#161D22]"></div>
                            <div className="flex-1 space-y-1">
                              <div className="h-2.5 bg-[#2E363E] rounded w-3/4"></div>
                              <div className="h-2 bg-[#2E363E]/60 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom bar indicator */}
              <div className="h-4 bg-[#161D22] flex items-center justify-center">
                <div className="w-20 h-1 bg-gray-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Create / Edit Modal */}
      <Modal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        title={editingBanner ? 'Edit Mobile Banner' : 'Create Mobile Banner'}
      >
        <form onSubmit={handleSaveBanner} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Banner Headline <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={bannerForm.title}
              onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
              placeholder="e.g. Accra Music Festival 2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Subtitle / Caption
            </label>
            <input
              type="text"
              value={bannerForm.subtitle}
              onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
              placeholder="e.g. Early Bird 30% Off ending this Sunday!"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Banner Image URL
            </label>
            <input
              type="url"
              value={bannerForm.image_url}
              onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
            />
            <p className="text-[11px] text-gray-500 mt-1">Recommended ratio: 16:9 or 2:1 landscape.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Click Action Type
              </label>
              <select
                value={bannerForm.link_type}
                onChange={(e) => setBannerForm({ ...bannerForm, link_type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
              >
                <option value="none">None (Display Only)</option>
                <option value="event">Open Event by ID</option>
                <option value="category">Browse Category</option>
                <option value="external">External Web Link</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Link Target / ID
              </label>
              <input
                type="text"
                value={bannerForm.link_target}
                onChange={(e) => setBannerForm({ ...bannerForm, link_target: e.target.value })}
                placeholder={bannerForm.link_type === 'event' ? 'e.g. 14' : bannerForm.link_type === 'category' ? 'Music' : 'URL or Target'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={bannerForm.sort_order}
                onChange={(e) => setBannerForm({ ...bannerForm, sort_order: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bannerForm.is_active}
                  onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#2E363E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
              <span className="text-xs text-gray-300 font-medium">
                {bannerForm.is_active ? 'Active in Carousel' : 'Inactive / Draft'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2E363E] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowBannerModal(false)}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-[#242B32] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingBanner}
              className="px-5 py-2 text-sm font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl"
            >
              {savingBanner ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Mobile Banner"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to remove the banner <strong className="text-white">"{deleteTarget?.title}"</strong>? It will no longer appear on the mobile carousel.
          </p>
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-[#242B32] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteBanner}
              disabled={deletingBanner}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl"
            >
              {deletingBanner ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
