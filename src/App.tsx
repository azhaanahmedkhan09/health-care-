/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { ReferrerDashboardPage } from './pages/ReferrerDashboardPage';
import { HospitalSearchPage } from './pages/HospitalSearchPage';
import { HospitalDetailsPage } from './pages/HospitalDetailsPage';
import { CreateReferralPage } from './pages/CreateReferralPage';
import { MatchedHospitalsPage } from './pages/MatchedHospitalsPage';
import { CoordinatorDashboardPage } from './pages/CoordinatorDashboardPage';
import { ServiceCapacityManagementPage } from './pages/ServiceCapacityManagementPage';
import { ReferralTrackingPage } from './pages/ReferralTrackingPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

const ToastOverlay: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900 text-white border border-slate-700 rounded-xl p-4 shadow-lg flex items-start justify-between gap-3 text-xs"
        >
          <div className="flex items-start gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-white">{toast.title}</p>
              {toast.message && <p className="text-slate-300 mt-0.5">{toast.message}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

const MainRouter: React.FC = () => {
  const { user, loadingAuth, screen } = useApp();

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-xs text-slate-500">
        Initializing ReliefLedger Health coordination platform...
      </div>
    );
  }

  if (screen === 'LANDING') {
    return <LandingPage />;
  }

  if (screen === 'LOGIN' || !user) {
    return <AuthPage />;
  }

  // Enforce role-based access control on role-specific screens
  const renderProtectedScreen = () => {
    switch (screen) {
      case 'REFERRER_DASHBOARD':
        return user.role === 'HOSPITAL_COORDINATOR' ? (
          <CoordinatorDashboardPage />
        ) : (
          <ReferrerDashboardPage />
        );
      case 'COORDINATOR_DASHBOARD':
        return user.role === 'REFERRING_DOCTOR' ? (
          <ReferrerDashboardPage />
        ) : (
          <CoordinatorDashboardPage />
        );
      case 'SERVICE_CAPACITY_MANAGEMENT':
        return user.role === 'HOSPITAL_COORDINATOR' ? (
          <ServiceCapacityManagementPage />
        ) : (
          <ReferrerDashboardPage />
        );
      case 'CREATE_REFERRAL':
        return user.role === 'REFERRING_DOCTOR' ? (
          <CreateReferralPage />
        ) : (
          <CoordinatorDashboardPage />
        );
      case 'HOSPITAL_SEARCH':
        return <HospitalSearchPage />;
      case 'HOSPITAL_DETAILS':
        return <HospitalDetailsPage />;
      case 'MATCHED_RESULTS':
        return <MatchedHospitalsPage />;
      case 'REFERRAL_TRACKING':
        return <ReferralTrackingPage />;
      case 'NOTIFICATIONS':
        return <NotificationsPage />;
      case 'ANALYTICS':
        return <AnalyticsPage />;
      default:
        return user.role === 'HOSPITAL_COORDINATOR' ? (
          <CoordinatorDashboardPage />
        ) : (
          <ReferrerDashboardPage />
        );
    }
  };

  return <WorkspaceLayout>{renderProtectedScreen()}</WorkspaceLayout>;
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
      <ToastOverlay />
    </AppProvider>
  );
}
