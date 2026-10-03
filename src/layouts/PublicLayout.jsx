import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, LogIn, UserPlus, Twitter, Instagram, Facebook, Linkedin,
  LayoutDashboard, User, LogOut, Ticket as TicketIcon, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ScrollProgressBar from '@/components/common/ScrollProgressBar';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import CurrencyToggle from '@/components/common/CurrencyToggle';
import Logo from '@/components/common/Logo';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/resale', label: 'Resale' },
  { to: '/become-organizer', label: 'For Organizers' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const profileRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const dashHref =
    user?.role === 'admin' ? '/admin/dashboard'
    : user?.role === 'organizer' ? '/organizer/dashboard'
    : '/attendee/dashboard';

  const initials = (user?.name || user?.email || 'U').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#1C232B] text-[#EFEFF1] flex flex-col">
      {/* Scroll reading bar — sits above the fixed navbar on every public page */}
      <ScrollProgressBar />

      {/* Scroll-to-top button — floats bottom-right after scrolling down */}
      <ScrollToTopButton />

      {/* ─── Navbar ─── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#171A1D]/95 backdrop-blur-lg border-b border-[#494F55]/40 shadow-xl shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-3">

            {/* Logo */}
            <Logo size="md" />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `group px-4 py-2 rounded-lg text-[13px] font-medium transition-colors duration-200 ${
                      isActive ? 'text-[#EFEFF1]' : 'text-[#949599] hover:text-[#EFEFF1]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <span className="relative">
                      {label}
                      <span
                        className={`absolute -bottom-1 left-0 right-0 h-px bg-white origin-left transition-transform duration-300 ease-out ${
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-2.5">
              <CurrencyToggle />
              {isAuthenticated ? (
                <>
                  <Link
                    to={dashHref}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#1C232B] text-[13px] font-bold tracking-wide hover:bg-[#CBD5E1] transition shadow-sm"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>

                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setProfileOpen((v) => !v)}
                      aria-label="User account menu"
                      className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg border border-[#3A4045] hover:border-white/40 hover:bg-[#262B2F] transition cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2A2F33] to-[#1D2124] border border-[#3A4045] flex items-center justify-center text-[#C4C9CC] text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <span className="text-xs font-semibold text-[#EFEFF1] max-w-[100px] truncate">{user?.name || 'Account'}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#949599]" />
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 rounded-xl bg-[#171A1D] border border-[#262B2F] shadow-2xl shadow-black/60 py-1.5 overflow-hidden z-50"
                        >
                          <div className="px-4 py-2.5 border-b border-[#262B2F]">
                            <p className="text-xs font-bold text-[#EFEFF1] truncate">{user?.name || 'User'}</p>
                            <p className="text-[11px] text-[#949599] truncate">{user?.email}</p>
                            <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-semibold text-[#949599] bg-white/5 capitalize">
                              {user?.role || 'Attendee'}
                            </span>
                          </div>
                          <Link
                            to={dashHref}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-[#CBD5E1] hover:text-white hover:bg-[#262B2F] transition"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" /> My Dashboard
                          </Link>
                          {user?.role === 'attendee' && (
                            <Link
                              to="/attendee/tickets"
                              className="flex items-center gap-2 px-4 py-2 text-xs text-[#CBD5E1] hover:text-white hover:bg-[#262B2F] transition"
                            >
                              <TicketIcon className="w-3.5 h-3.5" /> My Tickets
                            </Link>
                          )}
                          <Link
                            to={user?.role === 'organizer' ? '/organizer/settings' : user?.role === 'admin' ? '/admin/settings' : '/attendee/profile'}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-[#CBD5E1] hover:text-white hover:bg-[#262B2F] transition"
                          >
                            <User className="w-3.5 h-3.5" /> Profile &amp; Settings
                          </Link>
                          <div className="border-t border-[#262B2F] mt-1 pt-1">
                            <button
                              onClick={() => { setProfileOpen(false); logout(); }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" /> Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/20 transition"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-white text-[#1C232B] text-[13px] font-bold tracking-wide hover:bg-[#CBD5E1] hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </Link>
                </>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-3 rounded-lg text-[#EFEFF1] hover:bg-[#494F55]/30 transition"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-[#171A1D] backdrop-blur-xl border-t border-[#262B2F] px-4 pb-5 pt-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav className="space-y-1 mb-4">
              {navLinks.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition ${
                      isActive ? 'text-[#EFEFF1] bg-[#494F55]/20' : 'text-[#949599] hover:text-[#EFEFF1] hover:bg-[#494F55]/20'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="pt-3 border-t border-[#262B2F] space-y-2">
              <CurrencyToggle className="w-full justify-center" />
              {isAuthenticated ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1C232B] border border-[#262B2F]">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#EFEFF1] truncate">{user?.name || user?.email}</p>
                      <p className="text-[10px] text-[#949599] capitalize">{user?.role || 'Attendee'}</p>
                    </div>
                  </div>
                  <Link
                    to={dashHref}
                    className="block w-full text-center px-4 py-2.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold"
                  >
                    My Dashboard
                  </Link>
                  {user?.role === 'attendee' && (
                    <Link
                      to="/attendee/tickets"
                      className="block w-full text-center px-4 py-2 rounded-xl border border-[#262B2F] text-xs text-[#CBD5E1] hover:border-white/30"
                    >
                      My Tickets
                    </Link>
                  )}
                  <button
                    onClick={() => { setMobileOpen(false); logout(); }}
                    className="block w-full text-center px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Link to="/login" className="block w-full text-center px-4 py-3 rounded-xl border border-[#494F55]/50 text-[#EFEFF1] text-sm font-medium hover:border-white/40 transition">
                    Sign In
                  </Link>
                  <Link to="/register" className="block w-full text-center px-4 py-3 rounded-xl bg-white text-[#1C232B] text-sm font-bold">
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Page content — padded so content starts below fixed navbar */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-[#171A1D] border-t border-[#262B2F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="mb-4">
                <Logo size="md" />
              </div>
              <p className="text-sm text-[#949599] leading-relaxed max-w-xs">
                The trusted ticketing platform for concerts, festivals, nightlife, conferences, and community experiences across Africa.
              </p>
              <div className="flex items-center gap-3 mt-5">
                {[
                  { icon: Twitter,   label: 'Twitter',   href: '#' },
                  { icon: Instagram, label: 'Instagram', href: '#' },
                  { icon: Facebook,  label: 'Facebook',  href: '#' },
                  { icon: Linkedin,  label: 'LinkedIn',  href: '#' },
                ].map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-10 h-10 rounded-lg bg-[#1C232B] border border-[#494F55]/40 flex items-center justify-center text-[#949599] hover:text-white hover:border-white/40 transition"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Company', links: [['About Us', '/about'], ['Contact', '/contact'], ['Careers', '#'], ['Blog', '#']] },
              { title: 'Product', links: [['Explore Events', '/explore'], ['Resale Marketplace', '/resale'], ['FAQ', '/faq'], ['Pricing', '/pricing']] },
              { title: 'Legal', links: [['Terms of Service', '/terms'], ['Privacy Policy', '/privacy'], ['Cookie Policy', '/cookies'], ['Refund Policy', '/refund']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-xs font-semibold text-[#EFEFF1] uppercase tracking-widest mb-4">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map(([label, href]) => (
                    <li key={label}>
              <Link to={href} className="text-sm text-[#949599] hover:text-white hover:underline underline-offset-4 decoration-white/30 transition py-1.5 inline-block">
                {label}
              </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-[#262B2F] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[#494F55]">© {new Date().getFullYear()} Tribes &amp; Cliqs. All rights reserved.</p>
            <p className="text-xs text-[#949599]">Live events, real connections.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
