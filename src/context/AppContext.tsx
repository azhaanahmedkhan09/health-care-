import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  EnrichedHospital,
  NotificationItem,
  Referral,
  Service,
  User,
  UserRole,
} from '../types/models';
import { api, getAuthToken, setAuthToken } from '../services/api';
import {
  signOutFirebase,
  syncAuditLogToFirestore,
  testFirestoreConnection,
} from '../services/firebaseClient';

export type ScreenName =
  | 'LANDING'
  | 'LOGIN'
  | 'REFERRER_DASHBOARD'
  | 'HOSPITAL_SEARCH'
  | 'HOSPITAL_DETAILS'
  | 'CREATE_REFERRAL'
  | 'MATCHED_RESULTS'
  | 'COORDINATOR_DASHBOARD'
  | 'SERVICE_CAPACITY_MANAGEMENT'
  | 'REFERRAL_TRACKING'
  | 'NOTIFICATIONS'
  | 'ANALYTICS';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface AppContextValue {
  user: User | null;
  loadingAuth: boolean;
  screen: ScreenName;
  navigate: (nextScreen: ScreenName) => void;
  hospitals: EnrichedHospital[];
  services: Service[];
  referrals: Referral[];
  notifications: NotificationItem[];
  selectedHospitalId: string | null;
  setSelectedHospitalId: (id: string | null) => void;
  selectedReferralId: string | null;
  setSelectedReferralId: (id: string | null) => void;
  preselectedServiceId: string;
  setPreselectedServiceId: (id: string) => void;
  preselectedHospitalId: string;
  setPreselectedHospitalId: (id: string) => void;
  preselectedArea: string;
  setPreselectedArea: (area: string) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  loginWithDemo: (role: UserRole) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerAccount: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organization?: string;
    specialtyOrTitle?: string;
    hospitalId?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshCoreData: () => Promise<void>;
  recordAuditToCloud: (log: {
    id: string;
    entityType: 'HOSPITAL_SERVICE' | 'REFERRAL' | 'HOSPITAL';
    entityId: string;
    action: string;
    oldValue: string;
    newValue: string;
  }) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const SCREEN_STORAGE_KEY = 'rlh_active_screen_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [screen, setScreen] = useState<ScreenName>(() => {
    try {
      const saved = window.sessionStorage.getItem(SCREEN_STORAGE_KEY) as ScreenName | null;
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return 'LANDING';
  });

  const [hospitals, setHospitals] = useState<EnrichedHospital[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>('hosp-1');
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>('ref-1001');
  const [preselectedServiceId, setPreselectedServiceId] = useState<string>('svc-cardiology');
  const [preselectedHospitalId, setPreselectedHospitalId] = useState<string>('hosp-1');
  const [preselectedArea, setPreselectedArea] = useState<string>('All Davangere');

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const navigate = useCallback((nextScreen: ScreenName) => {
    setScreen(nextScreen);
    try {
      window.sessionStorage.setItem(SCREEN_STORAGE_KEY, nextScreen);
    } catch {
      // Ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts([{ ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshCoreData = useCallback(async () => {
    try {
      const [hospRes, svcRes] = await Promise.all([api.getHospitals(), api.getServices()]);
      setHospitals(hospRes.hospitals);
      setServices(svcRes.services);

      if (getAuthToken()) {
        const [refRes, notifRes] = await Promise.all([
          api.getReferrals(),
          api.getNotifications(),
        ]);
        setReferrals(refRes.referrals);
        setNotifications(notifRes.notifications);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Validate connection to Firestore on boot per firebase-integration-rpc skill
    testFirestoreConnection();

    // 2. Restore session if token exists or ?autostart=1 is passed
    async function initSession() {
      try {
        const params = new URLSearchParams(window.location.search);
        const autostart = params.get('autostart');
        const existingToken = getAuthToken();

        const [hospRes, svcRes] = await Promise.all([api.getHospitals(), api.getServices()]);
        setHospitals(hospRes.hospitals);
        setServices(svcRes.services);

        if (existingToken) {
          const { user: currentUser } = await api.getCurrentUser();
          setUser(currentUser);
          const [refRes, notifRes] = await Promise.all([
            api.getReferrals(),
            api.getNotifications(),
          ]);
          setReferrals(refRes.referrals);
          setNotifications(notifRes.notifications);
        } else if (autostart === '1') {
          const { user: demoUser, token } = await api.login({ demoRole: 'REFERRING_DOCTOR' });
          setAuthToken(token);
          setUser(demoUser);
          const [refRes, notifRes] = await Promise.all([
            api.getReferrals(),
            api.getNotifications(),
          ]);
          setReferrals(refRes.referrals);
          setNotifications(notifRes.notifications);
          navigate('REFERRER_DASHBOARD');
        }
      } catch {
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoadingAuth(false);
      }
    }

    initSession();
  }, [navigate]);

  const loginWithDemo = useCallback(
    async (role: UserRole) => {
      const { user: loggedInUser, token } = await api.login({ demoRole: role });
      setAuthToken(token);
      setUser(loggedInUser);
      await refreshCoreData();
      const targetScreen: ScreenName =
        loggedInUser.role === 'HOSPITAL_COORDINATOR'
          ? 'COORDINATOR_DASHBOARD'
          : 'REFERRER_DASHBOARD';
      navigate(targetScreen);
      addToast({
        type: 'success',
        title: `Signed in as ${loggedInUser.name}`,
        message:
          loggedInUser.role === 'HOSPITAL_COORDINATOR'
            ? `Receiving Hospital Coordinator · ${loggedInUser.organization}`
            : `Referring Physician · ${loggedInUser.organization}`,
      });
    },
    [addToast, navigate, refreshCoreData]
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      const { user: loggedInUser, token } = await api.login({ email, password });
      setAuthToken(token);
      setUser(loggedInUser);
      await refreshCoreData();
      navigate(
        loggedInUser.role === 'HOSPITAL_COORDINATOR'
          ? 'COORDINATOR_DASHBOARD'
          : 'REFERRER_DASHBOARD'
      );
      addToast({
        type: 'success',
        title: `Welcome back, ${loggedInUser.name}`,
        message: loggedInUser.organization,
      });
    },
    [addToast, navigate, refreshCoreData]
  );

  const registerAccount = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      organization?: string;
      specialtyOrTitle?: string;
      hospitalId?: string;
      phone?: string;
    }) => {
      const { user: newUser, token } = await api.register(payload);
      setAuthToken(token);
      setUser(newUser);
      await refreshCoreData();
      navigate(
        newUser.role === 'HOSPITAL_COORDINATOR' ? 'COORDINATOR_DASHBOARD' : 'REFERRER_DASHBOARD'
      );
      addToast({
        type: 'success',
        title: 'Account registered',
        message: `Signed in as ${newUser.name} (${newUser.role === 'HOSPITAL_COORDINATOR' ? 'Hospital Coordinator' : 'Referring Doctor'})`,
      });
    },
    [addToast, navigate, refreshCoreData]
  );

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await signOutFirebase();
    navigate('LANDING');
    addToast({
      type: 'info',
      title: 'Signed out',
      message: 'Your session has been securely closed.',
    });
  }, [addToast, navigate]);

  const recordAuditToCloud = useCallback(
    async (log: {
      id: string;
      entityType: 'HOSPITAL_SERVICE' | 'REFERRAL' | 'HOSPITAL';
      entityId: string;
      action: string;
      oldValue: string;
      newValue: string;
    }) => {
      try {
        await syncAuditLogToFirestore(log);
      } catch (err) {
        console.warn('Firestore audit sync notice:', err);
      }
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        user,
        loadingAuth,
        screen,
        navigate,
        hospitals,
        services,
        referrals,
        notifications,
        selectedHospitalId,
        setSelectedHospitalId,
        selectedReferralId,
        setSelectedReferralId,
        preselectedServiceId,
        setPreselectedServiceId,
        preselectedHospitalId,
        setPreselectedHospitalId,
        preselectedArea,
        setPreselectedArea,
        toasts,
        addToast,
        dismissToast,
        loginWithDemo,
        loginWithCredentials,
        registerAccount,
        logout,
        refreshCoreData,
        recordAuditToCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
