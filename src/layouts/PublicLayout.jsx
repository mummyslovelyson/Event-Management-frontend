import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ScrollProgressBar from '@/components/common/ScrollProgressBar';
import ScrollToTopButton from '@/components/common/ScrollToTopButton';
import CurrencyToggle from '@/components/common/CurrencyToggle';
import Logo from '@/components/common/Logo';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/explore', label: 'Explore' },
  { to: '/about', label: 'About' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const dashHref =
    user?.role === 'admin' ? '/admin/dashboard'
    : user?.role === 'organizer' ? '/organizer/dashboard'
    : '/attendee/dashboard';

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
                        className={`absolute -bottom-1 left-0 right-0 h-px bg-[#D4AF37] origin-left transition-transform duration-300 ease-out ${
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                      />
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-2">
              <CurrencyToggle />
              {isAuthenticated ? (
                <Link
                  to={dashHref}
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#1C232B] text-[13px] font-bold tracking-wide hover:bg-[#c4a030] hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  My Dashboard
                </Link>
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
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#D4AF37] text-[#1C232B] text-[13px] font-bold tracking-wide hover:bg-[#c4a030] hover:-translate-y-0.5 transition-all shadow-sm"
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
              className="md:hidden p-2 rounded-lg text-[#EFEFF1] hover:bg-[#494F55]/30 transition"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden bg-[#171A1D]/98 backdrop-blur-xl border-t border-[#262B2F] px-4 pb-5 pt-3">
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
                <Link to={dashHref} className="block w-full text-center px-4 py-3 rounded-xl bg-[#D4AF37] text-[#1C232B] text-sm font-bold">
                  My Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="block w-full text-center px-4 py-3 rounded-xl border border-[#494F55]/50 text-[#EFEFF1] text-sm font-medium hover:border-[#D4AF37]/50 transition">
                    Sign In
                  </Link>
                  <Link to="/register" className="block w-full text-center px-4 py-3 rounded-xl bg-[#D4AF37] text-[#1C232B] text-sm font-bold">
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
                Discover, create, and manage unforgettable events. Your gateway to live experiences across Africa and beyond.
              </p>
              <div className="flex items-center gap-3 mt-5">
                {['Twitter', 'Instagram', 'Facebook', 'LinkedIn'].map((s) => (
                  <a key={s} href="#" className="w-8 h-8 rounded-lg bg-[#1C232B] border border-[#494F55]/40 flex items-center justify-center text-[#949599] hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition text-[10px] font-bold">
                    {s[0]}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Company', links: [['About Us', '/about'], ['Contact', '/contact'], ['Careers', '#'], ['Blog', '#']] },
              { title: 'Product', links: [['Explore Events', '/explore'], ['Pricing', '/pricing'], ['FAQ', '/faq'], ['How It Works', '#']] },
              { title: 'Legal', links: [['Terms of Service', '#'], ['Privacy Policy', '#'], ['Cookie Policy', '#'], ['Refund Policy', '#']] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-xs font-semibold text-[#EFEFF1] uppercase tracking-widest mb-4">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map(([label, href]) => (
                    <li key={label}>
              <Link to={href} className="text-sm text-[#949599] hover:text-[#D4AF37] hover:underline underline-offset-4 decoration-[#D4AF37]/50 transition">
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
            <p className="text-xs text-[#494F55]">Where Every Event Is a Success</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
