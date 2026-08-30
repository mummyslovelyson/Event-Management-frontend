import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';

import PublicLayout from '@/layouts/PublicLayout';
import AttendeeLayout from '@/layouts/AttendeeLayout';
import OrganizerLayout from '@/layouts/OrganizerLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import ChatbotWidget from '@/components/chat/ChatbotWidget';

// Public pages
import HomePage from '@/pages/public/HomePage';
import PaymentCallbackPage from '@/pages/public/PaymentCallbackPage';
import ExplorePage from '@/pages/public/ExplorePage';
import EventDetailPage from '@/pages/public/EventDetailPage';
import AboutPage from '@/pages/public/AboutPage';
import ContactPage from '@/pages/public/ContactPage';
import FAQPage from '@/pages/public/FAQPage';
import MaintenancePage from '@/pages/public/MaintenancePage';
import TermsOfServicePage from '@/pages/public/TermsOfServicePage';
import PrivacyPolicyPage from '@/pages/public/PrivacyPolicyPage';
import CookiePolicyPage from '@/pages/public/CookiePolicyPage';
import RefundPolicyPage from '@/pages/public/RefundPolicyPage';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage';
import AdminLoginPage from '@/pages/auth/AdminLoginPage';

// Attendee pages
import AttendeeDashboard from '@/pages/attendee/AttendeeDashboard';
import ExploreEventsPage from '@/pages/attendee/ExploreEventsPage';
import MyTicketsPage from '@/pages/attendee/MyTicketsPage';
import MyBookingsPage from '@/pages/attendee/MyBookingsPage';
import FavoritesPage from '@/pages/attendee/FavoritesPage';
import NotificationsPage from '@/pages/attendee/NotificationsPage';
import ReviewsPage from '@/pages/attendee/ReviewsPage';
import ProfilePage from '@/pages/attendee/ProfilePage';

// Organizer pages
import OrganizerDashboard from '@/pages/organizer/OrganizerDashboard';
import EventsPage from '@/pages/organizer/EventsPage';
import CreateEventPage from '@/pages/organizer/CreateEventPage';
import EditEventPage from '@/pages/organizer/EditEventPage';
import TicketManagementPage from '@/pages/organizer/TicketManagementPage';
import OrdersPage from '@/pages/organizer/OrdersPage';
import CheckInPage from '@/pages/organizer/CheckInPage';
import AttendeesPage from '@/pages/organizer/AttendeesPage';
import PromotionsPage from '@/pages/organizer/PromotionsPage';
import ReportsPage from '@/pages/organizer/ReportsPage';
import MarketingPage from '@/pages/organizer/MarketingPage';
import TeamPage from '@/pages/organizer/TeamPage';
import WalletPage from '@/pages/organizer/WalletPage';
import OrganizerSettingsPage from '@/pages/organizer/OrganizerSettingsPage';
import OrganizerCategoriesPage from '@/pages/organizer/OrganizerCategoriesPage';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UserManagementPage from '@/pages/admin/UserManagementPage';
import OrganizerApprovalsPage from '@/pages/admin/OrganizerApprovalsPage';
import EventManagementPage from '@/pages/admin/EventManagementPage';
import CategoriesPage from '@/pages/admin/CategoriesPage';
import PaymentManagementPage from '@/pages/admin/PaymentManagementPage';
import PlatformReportsPage from '@/pages/admin/PlatformReportsPage';
import ContentManagementPage from '@/pages/admin/ContentManagementPage';
import NotificationCenterPage from '@/pages/admin/NotificationCenterPage';
import SupportPage from '@/pages/admin/SupportPage';
import UserSupportPage from '@/pages/attendee/SupportPage';
import SystemSettingsPage from '@/pages/admin/SystemSettingsPage';
import AuditLogsPage from '@/pages/admin/AuditLogsPage';
import AITrainingPage from '@/pages/admin/AITrainingPage';

function MaintenanceWrapper() {
  const [maintenance, setMaintenance] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>('');
  const auth = useAuth() as { user?: { role?: string } | null } | null;
  const user = auth?.user;
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/maintenance`);
        const data = await res.json();
        setMaintenance(!!data.maintenance);
        setMessage(data.message || '');
      } catch {
        setMaintenance(false);
      }
    };
    check();
    const interval = setInterval(check, 45000);
    return () => clearInterval(interval);
  }, []);

  if (maintenance === null) return null;

  // If maintenance is active, allow admins and admin login portal through
  const isAdmin = user?.role === 'admin';
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/admin-login';

  if (maintenance && !isAdmin && !isAdminRoute) {
    return <MaintenancePage message={message} />;
  }

  return <AppRoutes />;
}

function AppRoutes() {
  return (
    <Routes>
          {/* ── Public ── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/refund" element={<RefundPolicyPage />} />
          </Route>

          {/* ── Payment (standalone, no layout wrapper — Paystack redirects here) ── */}
          <Route path="/payment/callback" element={<PaymentCallbackPage />} />

          {/* ── Auth (standalone, no layout wrapper) ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/maintenance" element={<MaintenancePage message="" />} />

          {/* ── Attendee dashboard ── */}
          <Route
            element={
              <ProtectedRoute roles={['attendee']}>
                <AttendeeLayout />
              </ProtectedRoute>
            }
          >
            {/* /attendee redirects to /attendee/dashboard */}
            <Route path="/attendee" element={<Navigate to="/attendee/dashboard" replace />} />
            <Route path="/attendee/dashboard" element={<AttendeeDashboard />} />
            <Route path="/attendee/explore" element={<ExploreEventsPage />} />
            <Route path="/attendee/tickets" element={<MyTicketsPage />} />
            <Route path="/attendee/bookings" element={<MyBookingsPage />} />
            <Route path="/attendee/favorites" element={<FavoritesPage />} />
            <Route path="/attendee/notifications" element={<NotificationsPage />} />
            <Route path="/attendee/reviews" element={<ReviewsPage />} />
            <Route path="/attendee/profile" element={<ProfilePage />} />
            <Route path="/attendee/support" element={<UserSupportPage />} />
            <Route path="/attendee/support/:id" element={<UserSupportPage />} />
          </Route>

          {/* ── Organizer dashboard ── */}
          <Route
            element={
              <ProtectedRoute roles={['organizer']}>
                <OrganizerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/organizer" element={<Navigate to="/organizer/dashboard" replace />} />
            <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
            <Route path="/organizer/events" element={<EventsPage />} />
            <Route path="/organizer/events/create" element={<CreateEventPage />} />
            <Route path="/organizer/events/:id/edit" element={<EditEventPage />} />
            <Route path="/organizer/tickets" element={<TicketManagementPage />} />
            <Route path="/organizer/orders" element={<OrdersPage />} />
            <Route path="/organizer/check-in" element={<CheckInPage />} />
            <Route path="/organizer/attendees" element={<AttendeesPage />} />
            <Route path="/organizer/promotions" element={<PromotionsPage />} />
            <Route path="/organizer/reports" element={<ReportsPage />} />
            <Route path="/organizer/marketing" element={<MarketingPage />} />
            <Route path="/organizer/team" element={<TeamPage />} />
            <Route path="/organizer/wallet" element={<WalletPage />} />
            <Route path="/organizer/support" element={<UserSupportPage />} />
            <Route path="/organizer/categories" element={<OrganizerCategoriesPage />} />
            <Route path="/organizer/settings" element={<OrganizerSettingsPage />} />
          </Route>

          {/* ── Admin dashboard ── */}
          <Route
            element={
              <ProtectedRoute roles={['admin', 'system_admin', 'superadmin', 'staff']} redirectTo="/admin-login">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/organizer-approvals" element={<OrganizerApprovalsPage />} />
            <Route path="/admin/events" element={<EventManagementPage />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/payments" element={<PaymentManagementPage />} />
            <Route path="/admin/reports" element={<PlatformReportsPage />} />
            <Route path="/admin/content" element={<ContentManagementPage />} />
            <Route path="/admin/notifications" element={<NotificationCenterPage />} />
            <Route path="/admin/support" element={<SupportPage />} />
            <Route path="/admin/ai-training" element={<AITrainingPage />} />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute roles={['system_admin', 'superadmin']} redirectTo="/admin/dashboard">
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute roles={['system_admin', 'superadmin']} redirectTo="/admin/dashboard">
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <BrowserRouter>
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#242B32',
              color: '#F2F4F5',
              border: '1px solid rgba(73,79,85,0.5)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#EFEFF1', secondary: '#1E252B' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#1E252B' } },
          }}
        />
        <MaintenanceWrapper />
        <ChatbotWidget />
      </BrowserRouter>
      </CurrencyProvider>
    </AuthProvider>
  );
}
