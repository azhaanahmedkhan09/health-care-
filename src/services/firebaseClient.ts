import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
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

let connectionTested = false;

export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export async function signInWithGooglePopup() {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user && result.user.emailVerified) {
    const userPath = `users/${result.user.uid}`;
    try {
      await setDoc(
        doc(db, 'users', result.user.uid),
        {
          uid: result.user.uid,
          name: (result.user.displayName || 'Authorized Clinician').slice(0, 120),
          role: 'REFERRING_DOCTOR',
          organization: 'Davangere Regional Partner Clinic (Demo)',
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      // Only throw structured error if unexpected permission failure on verified account
      console.warn('Firestore user profile sync notice:', userPath, error);
    }
  }
  return result.user;
}

export async function signOutFirebase() {
  try {
    await signOut(auth);
  } catch {
    // Ignore sign out errors
  }
}

export async function syncAuditLogToFirestore(log: {
  id: string;
  entityType: 'HOSPITAL_SERVICE' | 'REFERRAL' | 'HOSPITAL';
  entityId: string;
  action: string;
  oldValue: string;
  newValue: string;
}) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const safeId = log.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const path = `audit_logs/${safeId}`;
  try {
    await setDoc(doc(db, 'audit_logs', safeId), {
      id: safeId,
      actorId: auth.currentUser.uid,
      entityType: log.entityType,
      entityId: log.entityId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128),
      action: log.action.slice(0, 120),
      oldValue: log.oldValue.slice(0, 500),
      newValue: log.newValue.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
