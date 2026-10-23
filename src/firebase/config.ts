import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

import { getAnalytics, isSupported } from 'firebase/analytics';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
const customDbId = (firebaseConfig as any).firestoreDatabaseId;

let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  }, (customDbId && customDbId !== '(default)') ? customDbId : undefined);
} catch {
  firestoreInstance = (customDbId && customDbId !== '(default)') ? getFirestore(app, customDbId) : getFirestore(app);
}
export const db = firestoreInstance;

let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}
export { analytics };

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const STORAGE_KEY_DISCONNECTED = 'FIREBASE_CLOUD_DISCONNECTED';
const STORAGE_KEY_CUSTOM_CONFIG = 'FIREBASE_CUSTOM_CONFIG';

export function isFirebaseExplicitlyDisconnected(): boolean {
  return localStorage.getItem(STORAGE_KEY_DISCONNECTED) === 'true';
}

export function disconnectFirebase(): void {
  localStorage.setItem(STORAGE_KEY_DISCONNECTED, 'true');
}

export function saveCustomFirebaseConfig(config: any): void {
  localStorage.setItem(STORAGE_KEY_CUSTOM_CONFIG, JSON.stringify(config));
  localStorage.removeItem(STORAGE_KEY_DISCONNECTED);
}

export function clearCustomFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_CUSTOM_CONFIG);
  localStorage.removeItem(STORAGE_KEY_DISCONNECTED);
}

export function getActiveFirebaseConfig(): any {
  const custom = localStorage.getItem(STORAGE_KEY_CUSTOM_CONFIG);
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch (e) {
      // fallback
    }
  }
  return firebaseConfig;
}

export async function testConnection(): Promise<boolean> {
  if (isFirebaseExplicitlyDisconnected()) {
    return false;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const checkPromise = getDocFromServer(doc(db, 'test', 'connection')).then(() => true).catch(() => true);
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(navigator.onLine), 2000));
    return await Promise.race([checkPromise, timeoutPromise]);
  } catch {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}
