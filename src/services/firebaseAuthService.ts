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
        error: "Firebase Authentication-এ 'Email/Password' Provider এনাবল (সক্রিয়) করা নেই।",
        instructions: `Firebase Console-এ যান: https://console.firebase.google.com/project/${projectId}/authentication/providers -> 'Email/Password' নির্বাচন করুন -> 'Enable' অন করে 'Save' বাটনে ক্লিক করুন। তারপর পুনরায় চেষ্টা করুন।`,
      };
    case 'auth/email-already-in-use':
      return {
        error: 'এই ইমেইলটি ইতিমধ্যে Firebase Authentication-এ রেজিস্টার করা আছে।',
        instructions: 'ইউজারটি পূর্বে Firebase Auth-এ যুক্ত হয়েছে। ব্যবহারকারী এই ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি লগইন করতে পারবেন।',
      };
    case 'auth/weak-password':
      return {
        error: 'পাসওয়ার্ডটি খুব দুর্বল (কমপক্ষে ৬ বা ৮ অক্ষরের হতে হবে)।',
        instructions: 'পাসওয়ার্ডে অন্তত একটি অক্ষর ও সংখ্যা সহ কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।',
      };
    case 'auth/invalid-email':
      return {
        error: 'ইমেইল অ্যাড্রেস সঠিক নয়।',
        instructions: 'একটি বৈধ ইমেইল (যেমন: username@domain.com) প্রদান করুন।',
      };
    case 'auth/configuration-not-found':
      return {
        error: 'Firebase Authentication প্রজেক্টে শুরু (Get Started) করা হয়নি।',
        instructions: `Firebase Console-এ যান: https://console.firebase.google.com/project/${projectId}/authentication -> 'Get Started' এ ক্লিক করুন।`,
      };
    case 'auth/network-request-failed':
      return {
        error: 'ইন্টারনেট বা ফায়ারবেস সার্ভার সংযোগ ব্যর্থ হয়েছে।',
        instructions: 'আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন অথবা ফায়ারবেস স্ট্যাটাস চেক করুন।',
      };
    case 'auth/project-not-found':
      return {
        error: 'Firebase প্রজেক্ট পাওয়া যায়নি।',
        instructions: 'Firebase কনফিগারেশন এবং Project ID সঠিক কিনা যাচাই করুন।',
      };
    default:
      return {
        error: `Firebase Auth Error [${code || 'Unknown'}]`,
        instructions: 'Firebase Console-এ Authentication > Sign-in method সঠিকভাবে কনফিগার করা হয়েছে কিনা দেখুন।',
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
      error: 'Firebase Cloud সংযোগ বিচ্ছিন্ন রয়েছে (Offline Mode)।',
      instructions: 'Backup & Cloud Sync মডিউল থেকে Firebase পুনরায় সংযুক্ত করুন।',
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
