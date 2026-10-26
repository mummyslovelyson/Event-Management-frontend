import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, CalendarDays, Layers, CreditCard, BarChart3,
  FileText, Bell, LifeBuoy, Settings, ScrollText, Menu, X, LogOut,
  Search, ChevronDown, UserCheck, AlertTriangle, Globe, BookOpen, CheckCircle, ExternalLink,
  Trash2, Check, Smartphone, QrCode, Sparkles, SlidersHorizontal, Moon, Sun, Ticket,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAdminNotifications, markAdminNotificationsRead, deleteAdminNotification } from '@/api/admin';
import CurrencyToggle from '@/components/common/CurrencyToggle';

const mainNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/reports', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/organizers', label: 'Organizers', icon: UserCheck },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/organizer/tickets', label: 'Tickets & Passes', icon: Ticket },
  { to: '/admin/categories', label: 'Categories', icon: Layers },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell, hasBadge: true },
  { to: '/admin/check-in', label: 'Gate Check-In', icon: QrCode },
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/mobile-app', label: 'Mobile App', icon: Smartphone },
  { to: '/admin/ai-training', label: 'Cliqs Bot Training', icon: BookOpen },
];

const secondaryNav = [
  { to: '/admin/settings', label: 'Settings', icon: Settings, systemAdminOnly: true },
  { to: '/admin/support', label: 'Help Center', icon: LifeBuoy },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, systemAdminOnly: true },
  { to: '/', label: 'Public Website', icon: Globe },
];

export default function AdminLayout() {
  const { user, logout, isSystemAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const filterNav = (list) => list.filter((i) => !i.systemAdminOnly || isSystemAdmin);
  const visibleMainNav = filterNav(mainNav);
  const visibleSecondaryNav = filterNav(secondaryNav);

  const fetchNotifs = async () => {
    try {
      const res = await getAdminNotifications({ limit: 6 });
      const items = res.data?.notifications || (Array.isArray(res.data) ? res.data : []);
      setNotifications(items);
      setUnreadCount(Number(res.data?.unreadCount ?? items.filter((n) => !n.is_read).length));
    } catch {
      // ignore
    }
  };

  const checkMaintenance = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/maintenance`);
      const data = await res.json();
      setIsMaintenance(!!data.maintenance);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkMaintenance();
    fetchNotifs();
    const maintInterval = setInterval(checkMaintenance, 45000);
    const notifInterval = setInterval(fetchNotifs, 25000);
    return () => {
      clearInterval(maintInterval);
      clearInterval(notifInterval);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    setNotifOpen(false);
    fetchNotifs();
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAdminNotificationsRead('all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markAdminNotificationsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleDeleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteAdminNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const getNotifMeta = (type) => {
    if (['payment', 'withdrawal', 'refund'].includes(type)) {
      return { Icon: CreditCard, badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    if (type === 'account') {
      return { Icon: UserCheck, badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
    if (['ticket', 'price_change', 'update'].includes(type)) {
      return { Icon: CalendarDays, badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    }
    if (type === 'support') {
      return { Icon: LifeBuoy, badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    return { Icon: Bell, badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30' };
  };

  const handleLogout = () => { logout(); navigate('/admin-login'); };

  const initials = (user?.name || user?.email || 'A').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const allNav = [...visibleMainNav, ...visibleSecondaryNav];
  const pageLabel = allNav.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))?.label || 'Dashboard';
  const roleLabel = isSystemAdmin ? 'System Administrator' : 'Operations Admin';

  return (
    <div className="min-h-screen bg-[#0b0e17] text-[#E4E7EB] font-sans antialiased selection:bg-purple-500/30 selection:text-white">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[#111424] border-r border-white/[0.06] flex-col z-40 shadow-xl shadow-black/20">
        <SidebarContent
          mainNav={visibleMainNav}
          secondaryNav={visibleSecondaryNav}
          unreadCount={unreadCount}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile Sidebar Drawer ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-[min(270px,85vw)] bg-[#111424] border-r border-white/[0.08] flex-col z-50 lg:hidden shadow-2xl"
            >
              <SidebarContent
                mainNav={visibleMainNav}
                secondaryNav={visibleSecondaryNav}
                unreadCount={unreadCount}
                onNavigate={() => setSidebarOpen(false)}
                onLogout={handleLogout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        {/* Maintenance Banner */}
        {isMaintenance && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs font-semibold text-amber-300 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate">Maintenance Mode is Active — Public visitors cannot access the site.</span>
            </div>
            {isSystemAdmin && (
              <Link
                to="/admin/settings"
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition underline shrink-0"
              >
                Turn Off in Settings &rarr;
              </Link>
            )}
          </div>
        )}

        {/* ── Topbar (Inspired by VALUE Analytics top header) ── */}
        <header className="sticky top-0 z-30 bg-[#0b0e17]/85 backdrop-blur-xl border-b border-white/[0.06] transition-all">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Left: Mobile hamburger + Title + "Overview v" pill */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {pageLabel}
                </h1>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#171b2d] border border-white/[0.08] text-xs font-medium text-white/70 hover:text-white hover:border-violet-500/40 transition cursor-pointer">
                  <span>Overview</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                </div>
              </div>
            </div>

            {/* Right: Search + Currency + Notifications + Profile Chip */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Pill (matching reference "Q Search") */}
              <div className="hidden md:flex items-center gap-2 px-3.5 h-9 rounded-xl bg-[#171b2d] border border-white/[0.08] focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all w-48 lg:w-60">
                <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none"
                />
              </div>

              <CurrencyToggle />

              {/* Notification Bell with red dot */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notifications"
                  className="relative p-2.5 rounded-xl bg-[#171b2d] border border-white/[0.08] text-white/70 hover:text-white hover:border-violet-500/40 hover:bg-[#1d2238] transition"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0b0e17] animate-pulse" />
                  )}
                </button>

                {/* Notification Dropdown Preview */}
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#15192c] border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden z-50 backdrop-blur-xl"
                    >
                      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-[#111424]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">Live Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.05]">
                        {notifications.length === 0 ? (
                          <div className="py-10 px-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2 text-white/50">
                              <Bell className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-semibold text-white">No notifications</p>
                            <p className="text-[11px] text-white/40 mt-0.5">Live platform alerts will appear here.</p>
                          </div>
                        ) : (
                          notifications.map((n) => {
                            const { Icon: TypeIcon, badgeClass } = getNotifMeta(n.type);
                            return (
                              <div
                                key={n.id}
                                onClick={() => {
                                  if (!n.is_read) handleMarkOneRead(n.id);
                                  if (n.link) {
                                    setNotifOpen(false);
                                    navigate(n.link);
                                  }
                                }}
                                className={`group relative p-3.5 transition flex items-start gap-3 cursor-pointer hover:bg-white/[0.04] ${
                                  !n.is_read ? 'bg-violet-500/[0.06]' : 'opacity-85'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badgeClass}`}>
                                  <TypeIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                                      {!n.is_read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                      )}
                                    </div>
                                    <span className="text-[10px] text-white/40 shrink-0 font-medium">
                                      {formatTimeAgo(n.created_at || n.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/60 line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.04]">
                                    {n.link ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-violet-400 group-hover:underline font-medium">
                                        View details <ExternalLink className="w-3 h-3" />
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-white/40 capitalize">{n.type || 'Platform'}</span>
                                    )}
                                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                      {!n.is_read && (
                                        <button
                                          type="button"
                                          title="Mark as read"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkOneRead(n.id);
                                          }}
                                          className="p-1 rounded text-white/50 hover:text-emerald-300 hover:bg-emerald-500/10 transition"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        title="Dismiss alert"
                                        onClick={(e) => handleDeleteNotif(e, n.id)}
                                        className="p-1 rounded text-white/50 hover:text-red-400 hover:bg-red-500/10 transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="p-2.5 border-t border-white/[0.08] text-center bg-[#111424]">
                        <Link
                          to="/admin/notifications"
                          onClick={() => setNotifOpen(false)}
                          className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition"
                        >
                          View All in Notification Center &rarr;
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Chip (Inspired by "Malena Bayer v" in reference) */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-[#171b2d] border border-white/[0.08] hover:border-violet-500/40 hover:bg-[#1d2238] transition"
                >
                <div className="w-7 h-7 rounded-lg bg-white/10 text-white text-[11px] font-semibold flex items-center justify-center">
                  {initials}
                </div>
                  <span className="hidden sm:block text-xs font-semibold text-white/90 max-w-[110px] truncate">
                    {user?.name || 'Administrator'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#15192c] border border-white/[0.1] shadow-2xl shadow-black/80 py-2 overflow-hidden z-50 backdrop-blur-xl"
                    >
                      <div className="px-4 py-3 border-b border-white/[0.08]">
                        <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">{user?.email}</p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSystemAdmin ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-white/10 text-white'
                        }`}>
                          {roleLabel}
                        </span>
                      </div>
                      <div className="py-1">
                        {isSystemAdmin && (
                          <Link
                            to="/admin/settings"
                            className="flex items-center gap-2.5 px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.04] transition"
                          >
                            <Settings className="w-4 h-4 text-white/50" /> System Settings
                          </Link>
                        )}
                        <Link
                          to="/"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.04] transition"
                        >
                          <Globe className="w-4 h-4 text-white/50" /> Public Website
                        </Link>
                        <Link
                          to="/admin/check-in"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.04] transition"
                        >
                          <QrCode className="w-4 h-4 text-white/50" /> Gate Scanner
                        </Link>
                      </div>
                      <div className="border-t border-white/[0.08] mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.04] transition"
                        >
                          <LogOut className="w-4 h-4 text-white/50" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Dashboard Content ── */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ mainNav, secondaryNav, unreadCount, onNavigate, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand Logo Header (Inspired by "VALUE ANALYTICS" in reference image) */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-white/[0.06] shrink-0">
        <Link to="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#1C232B] border border-white/10 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform">
            <img
              src="/assets/images/Logo.jpeg"
              alt="Logo"
              className="w-full h-full object-cover rounded-[10px]"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide text-white">
              CLIQS
            </span>
            <span className="text-[9px] font-medium uppercase tracking-widest text-white/50">
              Admin
            </span>
          </div>
        </Link>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {/* Main Section */}
        <div className="space-y-1">
          {mainNav.map(({ to, label, icon: Icon, end, hasBadge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-white/45 group-hover:text-violet-400'
                      }`}
                    />
                    <span className="truncate">{label}</span>
                  </div>
                  {/* Red notification dot matching the reference image */}
                  {hasBadge && unreadCount > 0 && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-white ring-2 ring-violet-500' : 'bg-red-500 ring-2 ring-[#111424]'
                      } animate-pulse`}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* System & Support Section */}
        <div className="pt-2 border-t border-white/[0.06] space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
            System
          </div>
          {secondaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-violet-400'}`} />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          <button
            onClick={() => {
              if (onNavigate) onNavigate();
              onLogout();
            }}
                  className="w-full group flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/[0.04] transition-all text-left"
          >
            <LogOut className="w-4 h-4 shrink-0 text-white/40 group-hover:text-white" />
            <span className="truncate">Log out</span>
          </button>
        </div>
      </div>

      {/* Sidebar Footer (Status indicators / theme dots inspired by reference image) */}
      <div className="p-3.5 border-t border-white/[0.06] bg-[#0c0f1c]/50 shrink-0">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-white/60">Live Production</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white/60 cursor-pointer hover:scale-110 transition" title="Primary" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/30 cursor-pointer hover:scale-110 transition" title="Secondary" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15 cursor-pointer hover:scale-110 transition" title="Tertiary" />
          </div>
        </div>
      </div>
    </div>
  );
}
