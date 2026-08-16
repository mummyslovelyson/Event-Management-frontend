import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';

import PublicLayout from '@/layouts/PublicLayout';
import AttendeeLayout from '@/layouts/AttendeeLayout';
import OrganizerLayout from '@/layouts/OrganizerLayout';
import AdminLayout from '@/layouts/AdminLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

// Public pages
import HomePage from '@/pages/public/HomePage';
import PaymentCallbackPage from '@/pages/public/PaymentCallbackPage';
import ExplorePage from '@/pages/public/ExplorePage';
import EventDetailPage from '@/pages/public/EventDetailPage';
import AboutPage from '@/pages/public/AboutPage';
import ContactPage from '@/pages/public/ContactPage';
import PricingPage from '@/pages/public/PricingPage';
import FAQPage from '@/pages/public/FAQPage';

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
import SystemSettingsPage from '@/pages/admin/SystemSettingsPage';
import AuditLogsPage from '@/pages/admin/AuditLogsPage';

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
        <Routes>
          {/* ── Public ── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/faq" element={<FAQPage />} />
          </Route>

          {/* ── Payment (standalone, no layout wrapper — Paystack redirects here) ── */}
          <Route path="/payment/callback" element={<PaymentCallbackPage />} />

          {/* ── Auth (standalone, no layout wrapper) ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          {/* Admin login is completely hidden from public — no link to it anywhere on the site */}
          <Route path="/admin-login" element={<AdminLoginPage />} />

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
            <Route path="/organizer/settings" element={<OrganizerSettingsPage />} />
          </Route>

          {/* ── Admin dashboard ── */}
          <Route
            element={
              <ProtectedRoute roles={['admin']} redirectTo="/admin-login">
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
            <Route path="/admin/settings" element={<SystemSettingsPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* ── Catch-all ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </CurrencyProvider>
    </AuthProvider>
  );
}
