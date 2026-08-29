import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { googleLogin } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';

export default function GoogleAuthButton({
  role = 'attendee',
  organizerData = {},
  text = 'Continue with Google',
  className = '',
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleResponse = async (credentialOrToken) => {
    setLoading(true);
    try {
      const payload = {
        role,
        ...(typeof credentialOrToken === 'string'
          ? { credential: credentialOrToken }
          : credentialOrToken),
        ...(role === 'organizer' && {
          organizationName: organizerData.organizationName,
          category: organizerData.category,
          city: organizerData.city,
          phone: organizerData.phone,
        }),
      };

      const res = await googleLogin(payload);
      const { token, user, pendingApproval, message } = res.data;

      if (token && user) {
        login(user, token);
      }

      if (pendingApproval) {
        toast.success(message || 'Google account created! Pending admin review.');
        navigate('/login', {
          state: { message: 'Your organizer account has been created via Google and is pending approval.' },
        });
      } else {
        toast.success(message || 'Welcome back!');
        if (onSuccess) {
          onSuccess(user);
        } else {
          const from = location.state?.from?.pathname;
          if (from) {
            navigate(from, { replace: true });
          } else if (user?.role === 'organizer') {
            navigate('/organizer/dashboard');
          } else {
            navigate('/attendee/dashboard');
          }
        }
      }
    } catch (err) {
      console.error('[GoogleAuthButton]', err);
      toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateGoogleSignIn = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // If Google Identity Services SDK is available on window
    if (window.google?.accounts?.id && clientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              handleGoogleResponse(response.credential);
            }
          },
        });
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If One Tap is skipped or blocked, fallback to token client / interactive popup
            fallbackOAuthPopup(clientId);
          }
        });
        return;
      } catch (err) {
        console.warn('[GoogleAuth] One-Tap prompt error:', err);
      }
    }

    // Standard OAuth2 Popup fallback or simulated demo flow if no client ID set
    fallbackOAuthPopup(clientId);
  };

  const fallbackOAuthPopup = (clientId) => {
    if (clientId) {
      const redirectUri = window.location.origin;
      const scope = encodeURIComponent('openid email profile');
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        clientId,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&response_type=token%20id_token&scope=${scope}&nonce=${Date.now()}`;

      const popup = window.open(url, 'google_oauth', 'width=500,height=600');
      const interval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(interval);
            return;
          }
          const hash = popup.location?.hash;
          if (hash && hash.includes('id_token=')) {
            clearInterval(interval);
            popup.close();
            const params = new URLSearchParams(hash.substring(1));
            const idToken = params.get('id_token');
            const accessToken = params.get('access_token');
            handleGoogleResponse({ idToken, accessToken });
          }
        } catch {
          // Cross-origin access block while popup is on google.com
        }
      }, 500);
    } else {
      // Graceful local demo prompt when client ID is not yet configured in .env
      promptDemoGoogleSignIn();
    }
  };

  const promptDemoGoogleSignIn = () => {
    const email = window.prompt('Enter your Google email for demo sign-in (e.g. user@gmail.com):');
    if (!email || !email.includes('@')) {
      if (email) toast.error('Please enter a valid email address');
      return;
    }
    const name = email.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    // Create a mock Google JWT credential token with valid base64 payload
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: `google_uid_${Math.abs(email.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0))}`,
        email: email.toLowerCase().trim(),
        name: formattedName,
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        email_verified: true,
      }),
    );
    const mockToken = `${header}.${payload}.mockSignature`;
    handleGoogleResponse(mockToken);
  };

  // Load Google Identity Services script if not already present
  useEffect(() => {
    if (document.getElementById('google-gsi-client')) return;
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  return (
    <motion.button
      type="button"
      onClick={handleInitiateGoogleSignIn}
      disabled={loading}
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm font-medium text-[#EFEFF1] hover:text-white hover:border-white/40 hover:bg-[#222B35] transition-all shadow-sm active:scale-95 disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-white" />
      ) : (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )}
      <span>{loading ? 'Connecting with Google...' : text}</span>
    </motion.button>
  );
}
