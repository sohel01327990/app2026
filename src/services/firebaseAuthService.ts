import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { getActiveFirebaseConfig, isFirebaseExplicitlyDisconnected } from '../firebase/config';
import { User } from '../types';

export interface FirebaseAuthResult {
  success: boolean;
  uid?: string;
  error?: string;
  code?: string;
  instructions?: string;
}

/**
 * Explains Firebase Auth error codes in clear Bengali & English with exact fix steps.
 */
export function getFirebaseAuthErrorMessage(code: string, projectId: string = 'myapps-2026'): { error: string; instructions: string } {
  switch (code) {
    case 'auth/operation-not-allowed':
      return {
        error: "Firebase Authentication 'Email/Password' provider is not enabled.",
        instructions: `Go to Firebase Console: https://console.firebase.google.com/project/${projectId}/authentication/providers -> Select 'Email/Password' -> Enable it and click 'Save'. Then retry.`,
      };
    case 'auth/email-already-in-use':
      return {
        error: 'This email is already registered in Firebase Authentication.',
        instructions: 'The user account already exists in Firebase Auth. The user can log in directly using this email and password.',
      };
    case 'auth/weak-password':
      return {
        error: 'Password is too weak (must be at least 6 or 8 characters).',
        instructions: 'Use a stronger password with at least 8 alphanumeric characters.',
      };
    case 'auth/invalid-email':
      return {
        error: 'Invalid email address format.',
        instructions: 'Provide a valid email address (e.g., username@domain.com).',
      };
    case 'auth/configuration-not-found':
      return {
        error: 'Firebase Authentication has not been initialized (Get Started) in this project.',
        instructions: `Go to Firebase Console: https://console.firebase.google.com/project/${projectId}/authentication -> Click 'Get Started'.`,
      };
    case 'auth/network-request-failed':
      return {
        error: 'Network connection to Firebase server failed.',
        instructions: 'Check your internet connection or verify Firebase service status.',
      };
    case 'auth/project-not-found':
      return {
        error: 'Firebase project was not found.',
        instructions: 'Verify Firebase configuration and Project ID.',
      };
    default:
      return {
        error: `Firebase Auth Error [${code || 'Unknown'}]`,
        instructions: 'Check Firebase Console > Authentication > Sign-in method configuration.',
      };
  }
}

/**
 * Registers an operator user into Firebase Authentication using a secondary Firebase app
 * so that the currently active operator or admin is NOT signed out or replaced.
 */
export async function registerUserInFirebaseAuth(
  email: string,
  password?: string,
  displayName?: string
): Promise<FirebaseAuthResult> {
  if (isFirebaseExplicitlyDisconnected()) {
    return {
      success: false,
      code: 'disconnected',
      error: 'Firebase Cloud connection is disconnected (Offline Mode).',
      instructions: 'Reconnect to Firebase from the Backup & Cloud Sync module.',
    };
  }

  const config = getActiveFirebaseConfig();
  const projectId = config.projectId || 'myapps-2026';
  const tempAppName = `AuthReg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let tempApp: any = null;

  try {
    tempApp = initializeApp(config, tempAppName);
    const tempAuth = getAuth(tempApp);

    const safePassword = password && password.length >= 6 ? password : 'Admin1234Password';
    const userCred = await createUserWithEmailAndPassword(tempAuth, email.trim(), safePassword);

    const uid = userCred.user.uid;

    if (displayName) {
      try {
        await updateProfile(userCred.user, { displayName: displayName.trim() });
      } catch (profileErr) {
        console.warn('Could not update profile display name:', profileErr);
      }
    }

    // Sign out from the temporary auth session
    try {
      await signOut(tempAuth);
    } catch (e) {}

    return {
      success: true,
      uid,
    };
  } catch (err: any) {
    const code = err?.code || 'unknown_error';
    const detail = getFirebaseAuthErrorMessage(code, projectId);
    console.warn(`[FirebaseAuthService] Registration error (${code}):`, err?.message);

    return {
      success: false,
      code,
      error: detail.error,
      instructions: detail.instructions,
    };
  } finally {
    if (tempApp) {
      try {
        await deleteApp(tempApp);
      } catch (e) {}
    }
  }
}

/**
 * Batch sync or check existing users against Firebase Auth.
 */
export async function syncUsersWithFirebaseAuth(
  users: User[]
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  alreadyRegistered: number;
  results: { user: User; result: FirebaseAuthResult }[];
}> {
  const results: { user: User; result: FirebaseAuthResult }[] = [];
  let succeeded = 0;
  let failed = 0;
  let alreadyRegistered = 0;

  for (const u of users) {
    const emailToUse = u.email && u.email.includes('@') ? u.email : `${u.username}@allnoor.com`;
    const res = await registerUserInFirebaseAuth(emailToUse, u.password || 'Admin1234Password', u.name);

    if (res.success) {
      succeeded++;
    } else if (res.code === 'auth/email-already-in-use') {
      alreadyRegistered++;
    } else {
      failed++;
    }

    results.push({ user: u, result: res });
  }

  return {
    total: users.length,
    succeeded,
    failed,
    alreadyRegistered,
    results,
  };
}
