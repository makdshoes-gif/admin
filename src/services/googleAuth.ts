import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

// Import Firebase config
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

// Initialize Firebase if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// In-memory token cache (and sessionStorage backup)
let cachedToken: string | null = sessionStorage.getItem('makd_google_access_token');

export interface GoogleAuthState {
  isAuthenticated: boolean;
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  accessToken: string | null;
}

/**
 * Sign in with Google using popup and request required Workspace / Sheets scopes
 */
export async function signInWithGoogle(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  REQUIRED_SCOPES.forEach((scope) => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'consent' });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('No se pudo obtener el token de acceso de Google.');
    }

    cachedToken = token;
    sessionStorage.setItem('makd_google_access_token', token);

    return {
      user: result.user,
      accessToken: token,
    };
  } catch (error: any) {
    console.error('Error during Google Sign-in:', error);
    throw error;
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  if (cachedToken) return cachedToken;
  const saved = sessionStorage.getItem('makd_google_access_token');
  if (saved) {
    cachedToken = saved;
    return saved;
  }
  return null;
}

/**
 * Save access token manually
 */
export function setAccessToken(token: string) {
  cachedToken = token;
  sessionStorage.setItem('makd_google_access_token', token);
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle(): Promise<void> {
  cachedToken = null;
  sessionStorage.removeItem('makd_google_access_token');
  await signOut(auth);
}

/**
 * Listen to auth state changes
 */
export function onGoogleAuthStateChanged(callback: (state: GoogleAuthState) => void) {
  return onAuthStateChanged(auth, (user) => {
    const token = getAccessToken();
    if (user && token) {
      callback({
        isAuthenticated: true,
        user: {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        },
        accessToken: token,
      });
    } else {
      callback({
        isAuthenticated: false,
        user: null,
        accessToken: null,
      });
    }
  });
}
