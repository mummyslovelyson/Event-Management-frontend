import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';

import PublicLayout from '@/layouts/PublicLayout';
import AttendeeLayout from '@/layouts/AttendeeLayout';
import OrganizerLayout from '@/layouts/OrganizerLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import ErrorBoundary from '@/components/common/ErrorBoundary';

// ─── Fast Route Fallback Skeleton ───
function PageLoadingFallback() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#1C232B] text-[#EFEFF1]">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
      </div>
      <p className="mt-4 text-xs font-medium text-[#949599] tracking-wider uppercase">Loading...</p>
    </div>
  );
}

// ─── Lazy Loaded Public Pages ───
const HomePage = lazy(() => import('@/pages/public/HomePage'));
const PaymentCallbackPage = lazy(() => import('@/pages/public/PaymentCallbackPage'));
const ExplorePage = lazy(() => import('@/pages/public/ExplorePage'));
const EventDetailPage = lazy(() => import('@/pages/public/EventDetailPage'));
const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
const ContactPage = lazy(() => import('@/pages/public/ContactPage'));
const FAQPage = lazy(() => import('@/pages/public/FAQPage'));
const MaintenancePage = lazy(() => import('@/pages/public/MaintenancePage'));
const TermsOfServicePage = lazy(() => import('@/pages/public/TermsOfServicePage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/public/PrivacyPolicyPage'));
const CookiePolicyPage = lazy(() => import('@/pages/public/CookiePolicyPage'));
const RefundPolicyPage = lazy(() => import('@/pages/public/RefundPolicyPage'));
const VerifyTicketPage = lazy(() => import('@/pages/public/VerifyTicketPage'));
const OrganizerProfilePage = lazy(() => import('@/pages/public/OrganizerProfilePage'));
const ResaleMarketplacePage = lazy(() => import('@/pages/public/ResaleMarketplacePage'));
const BecomeOrganizerPage = lazy(() => import('@/pages/public/BecomeOrganizerPage'));

// ─── Lazy Loaded Auth Pages ───
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage'));
const AdminLoginPage = lazy(() => import('@/pages/auth/AdminLoginPage'));

// ─── Lazy Loaded Attendee Pages ───
const AttendeeDashboard = lazy(() => import('@/pages/attendee/AttendeeDashboard'));
const ExploreEventsPage = lazy(() => import('@/pages/attendee/ExploreEventsPage'));
const MyTicketsPage = lazy(() => import('@/pages/attendee/MyTicketsPage'));
const MyBookingsPage = lazy(() => import('@/pages/attendee/MyBookingsPage'));
const FavoritesPage = lazy(() => import('@/pages/attendee/FavoritesPage'));
const NotificationsPage = lazy(() => import('@/pages/attendee/NotificationsPage'));
const ReviewsPage = lazy(() => import('@/pages/attendee/ReviewsPage'));
const ProfilePage = lazy(() => import('@/pages/attendee/ProfilePage'));
const UserSupportPage = lazy(() => import('@/pages/attendee/SupportPage'));

// ─── Lazy Loaded Organizer Pages ───
const OrganizerDashboard = lazy(() => import('@/pages/organizer/OrganizerDashboard'));
const EventsPage = lazy(() => import('@/pages/organizer/EventsPage'));
const CreateEventPage = lazy(() => import('@/pages/organizer/CreateEventPage'));
const EditEventPage = lazy(() => import('@/pages/organizer/EditEventPage'));
const TicketManagementPage = lazy(() => import('@/pages/organizer/TicketManagementPage'));
const OrdersPage = lazy(() => import('@/pages/organizer/OrdersPage'));
const CheckInPage = lazy(() => import('@/pages/organizer/CheckInPage'));
const AttendeesPage = lazy(() => import('@/pages/organizer/AttendeesPage'));
const PromotionsPage = lazy(() => import('@/pages/organizer/PromotionsPage'));
const ReportsPage = lazy(() => import('@/pages/organizer/ReportsPage'));
const MarketingPage = lazy(() => import('@/pages/organizer/MarketingPage'));
const TeamPage = lazy(() => import('@/pages/organizer/TeamPage'));
const OrganizerPaymentsPage = lazy(() => import('@/pages/organizer/OrganizerPaymentsPage'));
const OrganizerSettingsPage = lazy(() => import('@/pages/organizer/OrganizerSettingsPage'));
const OrganizerCategoriesPage = lazy(() => import('@/pages/organizer/OrganizerCategoriesPage'));
const OrganizerNotificationsPage = lazy(() => import('@/pages/organizer/OrganizerNotificationsPage'));

// ─── Lazy Loaded Admin Pages ───
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const UserManagementPage = lazy(() => import('@/pages/admin/UserManagementPage'));
const OrganizerApprovalsPage = lazy(() => import('@/pages/admin/OrganizerApprovalsPage'));
const EventManagementPage = lazy(() => import('@/pages/admin/EventManagementPage'));
const CategoriesPage = lazy(() => import('@/pages/admin/CategoriesPage'));
const PaymentManagementPage = lazy(() => import('@/pages/admin/PaymentManagementPage'));
const PlatformReportsPage = lazy(() => import('@/pages/admin/PlatformReportsPage'));
const ContentManagementPage = lazy(() => import('@/pages/admin/ContentManagementPage'));
const MobileAppManagementPage = lazy(() => import('@/pages/admin/MobileAppManagementPage'));
const NotificationCenterPage = lazy(() => import('@/pages/admin/NotificationCenterPage'));
const SupportPage = lazy(() => import('@/pages/admin/SupportPage'));
const SystemSettingsPage = lazy(() => import('@/pages/admin/SystemSettingsPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));
const AITrainingPage = lazy(() => import('@/pages/admin/AITrainingPage'));

// ─── Lazy Loaded Chatbot / Voice Assistant ───
const ChatbotWidget = lazy(() => import('@/components/chat/ChatbotWidget'));

function MaintenanceWrapper() {
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const auth = useAuth() as { user?: { role?: string } | null } | null;
  const user = auth?.user;
  const location = useLocation();

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/public/maintenance`);
        const data = await res.json();
        if (data && typeof data.maintenance === 'boolean') {
          setMaintenance(data.maintenance);
          setMessage(data.message || '');
        }
      } catch {
        // Fail open if network check drops
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

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
    <Suspense fallback={<PageLoadingFallback />}>
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
          <Route path="/verify" element={<VerifyTicketPage />} />
          <Route path="/verify/:code" element={<VerifyTicketPage />} />
          <Route path="/verify-ticket" element={<VerifyTicketPage />} />
          <Route path="/verify-ticket/:code" element={<VerifyTicketPage />} />
          <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
          <Route path="/organizer/:id" element={<OrganizerProfilePage />} />
          <Route path="/become-organizer" element={<BecomeOrganizerPage />} />
          <Route path="/apply-organizer" element={<BecomeOrganizerPage />} />
          <Route path="/resale" element={<ResaleMarketplacePage />} />
          <Route path="/marketplace" element={<ResaleMarketplacePage />} />
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
          <Route path="/organizer/analytics" element={<ReportsPage />} />
          <Route path="/organizer/notifications" element={<OrganizerNotificationsPage />} />
          <Route path="/organizer/marketing" element={<MarketingPage />} />
          <Route path="/organizer/team" element={<TeamPage />} />
          <Route path="/organizer/payments" element={<OrganizerPaymentsPage />} />
          <Route path="/organizer/wallet" element={<OrganizerPaymentsPage />} />
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
          <Route path="/admin/organizers" element={<OrganizerApprovalsPage />} />
          <Route path="/admin/organizer-approvals" element={<OrganizerApprovalsPage />} />
          <Route path="/admin/events" element={<EventManagementPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/payments" element={<PaymentManagementPage />} />
          <Route path="/admin/reports" element={<PlatformReportsPage />} />
          <Route path="/admin/content" element={<ContentManagementPage />} />
          <Route path="/admin/mobile-app" element={<MobileAppManagementPage />} />
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
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Unhandled Promise Rejection]', event.reason);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  return (
    <ErrorBoundary>
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
            <Suspense fallback={null}>
              <ChatbotWidget />
            </Suspense>
          </BrowserRouter>
        </CurrencyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
