import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signInWithRedirect, getRedirectResult,
} from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCDJhySkTFz2E613-bLXeGs_bHwS_RUVHQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tribes-aand-cliqs.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tribes-aand-cliqs',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tribes-aand-cliqs.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '493987932876',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:493987932876:web:b4c2b4e415474c01337069',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-HVGEZ5M2GS',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let app = null;
let auth = null;
let analytics = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    // Initialize analytics if supported in the current environment
    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Firebase] Initialization error:', err.message);
  }
}

export { app, auth, analytics, googleProvider };

export async function signInWithGoogleViaFirebase() {
  if (!auth || !googleProvider) {
    throw new Error(
      'Firebase is not initialized. Please verify your Firebase project credentials.',
    );
  }

  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    idToken,
    credential: idToken,
    email: user.email,
    name: user.displayName,
    photoURL: user.photoURL,
    uid: user.uid,
  };
}

export async function signInWithGoogleViaRedirect() {
  if (!auth || !googleProvider) {
    throw new Error('Firebase is not initialized.');
  }
  return signInWithRedirect(auth, googleProvider);
}

export async function checkFirebaseRedirectResult() {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    const user = result.user;
    const idToken = await user.getIdToken();
    return {
      idToken,
      credential: idToken,
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL,
      uid: user.uid,
    };
  } catch (err) {
    console.warn('[Firebase] Redirect result check error:', err.message);
    return null;
  }
}

export default app;
