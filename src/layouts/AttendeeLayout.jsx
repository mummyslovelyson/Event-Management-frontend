import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Compass, Ticket as TicketIcon, CalendarCheck, Bookmark,
  Bell, Star, User, Menu, X, LogOut, Search, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import CurrencyToggle from '@/components/common/CurrencyToggle';

const navGroups = [
  {
    title: 'Overview',
    items: [{ to: '/attendee/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Discover',
    items: [{ to: '/attendee/explore', label: 'Explore Events', icon: Compass }],
  },
  {
    title: 'Tickets',
    items: [
      { to: '/attendee/tickets', label: 'My Tickets', icon: TicketIcon },
      { to: '/attendee/bookings', label: 'My Bookings', icon: CalendarCheck },
    ],
  },
  {
    title: 'Saved',
    items: [
      { to: '/attendee/favorites', label: 'Favorites', icon: Bookmark },
      { to: '/attendee/reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/attendee/notifications', label: 'Notifications', icon: Bell },
      { to: '/attendee/profile', label: 'Profile', icon: User },
    ],
  },
];

const flatNav = navGroups.flatMap((g) => g.items);

export default function AttendeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => { setSidebarOpen(false); setProfileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = (user?.name || user?.email || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const pageLabel = flatNav.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#111417] text-[#EFEFF1]">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[#171A1D] border-r border-[#262B2F] flex-col z-40">
        <SidebarContent user={user} initials={initials} />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'tween', duration: 0.2 }} className="fixed inset-y-0 left-0 w-64 bg-[#171A1D] border-r border-[#262B2F] flex flex-col z-50 lg:hidden">
              <SidebarContent user={user} initials={initials} onNavigate={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-[#111417]/90 backdrop-blur-md border-b border-[#262B2F]">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-[#EFEFF1] hover:bg-[#262B2F] transition">
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-baseline gap-2 min-w-0">
                <span className="text-xs text-[#6B7278]">Attendee</span>
                <span className="text-[#3A4045]">/</span>
                <span className="text-sm font-medium text-[#EFEFF1] truncate">{pageLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-[#171A1D] border border-[#262B2F] focus-within:border-[#3A4045] transition">
                <Search className="w-4 h-4 text-[#6B7278]" />
                <input type="text" placeholder="Search…" className="w-44 bg-transparent text-sm text-[#EFEFF1] placeholder-[#6B7278] focus:outline-none" />
              </label>

              <CurrencyToggle />

              <Link to="/attendee/notifications" className="relative p-2 rounded-lg text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4AF37] rounded-full ring-2 ring-[#111417]" />
              </Link>

              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2.5 p-1 pr-2 rounded-lg hover:bg-[#262B2F] transition">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2A2F33] to-[#1D2124] border border-[#3A4045] flex items-center justify-center text-[#C4C9CC] text-xs font-semibold">{initials}</div>
                  <span className="hidden sm:block text-sm text-[#EFEFF1] max-w-[120px] truncate">{user?.name || 'User'}</span>
                  <ChevronDown className="w-4 h-4 text-[#6B7278]" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-60 rounded-xl bg-[#171A1D] border border-[#262B2F] shadow-xl shadow-black/40 py-1.5 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#262B2F]">
                        <p className="text-sm font-medium text-[#EFEFF1] truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-[#949599] truncate">{user?.email}</p>
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-[#D4AF37] bg-[#D4AF37]/10">Attendee</span>
                      </div>
                      <Link to="/attendee/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition">
                        <User className="w-4 h-4" /> My Profile
                      </Link>
                      <Link to="/attendee/tickets" className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#949599] hover:text-[#EFEFF1] hover:bg-[#262B2F] transition">
                        <TicketIcon className="w-4 h-4" /> My Tickets
                      </Link>
                      <div className="border-t border-[#262B2F] mt-1 pt-1">
                        <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#949599] hover:text-red-300 hover:bg-red-500/10 transition">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ user, initials, onNavigate }) {
  return (
    <>
      <div className="flex items-center justify-between h-14 px-4 border-b border-[#262B2F] shrink-0">
        <Link to="/attendee/dashboard" className="flex items-center gap-2.5 group">
          <img src="/assets/images/Logo copy.jpeg" alt="" className="w-8 h-8 rounded-lg object-cover ring-1 ring-[#3A4045] group-hover:ring-[#D4AF37]/60 transition" />
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold tracking-tight text-[#EFEFF1]">Attendee</span>
            <span className="text-[10px] text-[#6B7278]">Tribes &amp; Cliqs</span>
          </div>
        </Link>
        {onNavigate && <button onClick={onNavigate} className="lg:hidden p-1 text-[#949599]"><X className="w-5 h-5" /></button>}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2.5 mb-1.5 text-[11px] font-medium text-[#5A6166]">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-all ${
                      isActive
                        ? 'text-[#EFEFF1] bg-[#262B2F]'
                        : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#1D2124]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-[1.5px] ${isActive ? 'text-[#D4AF37]' : 'text-[#6B7278] group-hover:text-[#949599]'}`} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[#262B2F] shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2A2F33] to-[#1D2124] border border-[#3A4045] flex items-center justify-center text-[#C4C9CC] text-xs font-semibold shrink-0">{initials}</div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#EFEFF1] truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-[#6B7278] truncate">Attendee</p>
          </div>
        </div>
      </div>
    </>
  );
}
