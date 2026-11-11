import type {
  AnalyticsSummary,
  AuditLog,
  CapacityStatus,
  EnrichedHospital,
  EnrichedHospitalService,
  HospitalAcceptanceStatus,
  MatchingEngineOutput,
  NotificationItem,
  Referral,
  ReferralOption,
  ReferralResponse,
  ReferralStatus,
  Service,
  ServiceAcceptanceStatus,
  ServiceStatus,
  UrgencyLabel,
  User,
  UserRole,
} from '../types/models';

const SESSION_TOKEN_KEY = 'rlh_session_token_v1';

let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data as T;
}

export const api = {
  // Authentication
  login: (payload: { email?: string; password?: string; demoRole?: UserRole }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organization?: string;
    specialtyOrTitle?: string;
    hospitalId?: string;
    phone?: string;
  }) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  firebaseSync: (payload: {
    uid: string;
    email: string;
    displayName?: string;
    role?: UserRole;
  }) =>
    request<{ user: User; token: string }>('/api/auth/firebase-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () => request<{ user: User }>('/api/auth/me'),

  // Services & Hospitals
  getServices: () => request<{ services: Service[] }>('/api/services'),

  getHospitals: (params?: {
    search?: string;
    area?: string;
    specialty?: string;
    serviceId?: string;
    capacityStatus?: string;
    referralAcceptance?: string;
    sortBy?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.set(k, v);
      });
    }
    const qs = query.toString();
    return request<{ hospitals: EnrichedHospital[] }>(`/api/hospitals${qs ? `?${qs}` : ''}`);
  },

  getHospitalById: (id: string) =>
    request<{ hospital: EnrichedHospital; auditHistory: AuditLog[] }>(`/api/hospitals/${id}`),

  updateHospitalProfile: (
    id: string,
    payload: {
      contactInformation?: string;
      emergencyDeskPhone?: string;
      referralAcceptance?: HospitalAcceptanceStatus;
      activeStatus?: boolean;
      coordinatorName?: string;
    }
  ) =>
    request<{ hospital: EnrichedHospital; auditLog: AuditLog }>(`/api/hospitals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getHospitalServices: (hospitalId: string) =>
    request<{ services: EnrichedHospitalService[] }>(`/api/hospitals/${hospitalId}/services`),

  addHospitalService: (
    hospitalId: string,
    payload: {
      serviceId: string;
      serviceStatus: ServiceStatus;
      capacityStatus: CapacityStatus;
      referralAcceptance: ServiceAcceptanceStatus;
      operationalNotes: string;
    }
  ) =>
    request<{ services: EnrichedHospitalService[]; auditLog: AuditLog }>(
      `/api/hospitals/${hospitalId}/services`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  updateHospitalService: (
    hospitalId: string,
    serviceId: string,
    payload: {
      serviceStatus?: ServiceStatus;
      capacityStatus?: CapacityStatus;
      referralAcceptance?: ServiceAcceptanceStatus;
      operationalNotes?: string;
    }
  ) =>
    request<{
      service: EnrichedHospitalService;
      services: EnrichedHospitalService[];
      auditLog: AuditLog;
    }>(`/api/hospitals/${hospitalId}/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  removeHospitalService: (hospitalId: string, serviceId: string) =>
    request<{ services: EnrichedHospitalService[]; auditLog: AuditLog }>(
      `/api/hospitals/${hospitalId}/services/${serviceId}`,
      {
        method: 'DELETE',
      }
    ),

  // Referrals & Matching
  matchHospitals: (payload: {
    requiredServiceId: string;
    preferredArea?: string;
    strictAreaFilter?: boolean;
  }) =>
    request<MatchingEngineOutput>('/api/referrals/match', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getReferrals: (params?: { hospitalId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.hospitalId) query.set('hospitalId', params.hospitalId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return request<{ referrals: Referral[] }>(`/api/referrals${qs ? `?${qs}` : ''}`);
  },

  createReferral: (payload: {
    requiredServiceId: string;
    receivingHospitalId: string;
    preferredArea: string;
    urgencyLabel: UrgencyLabel;
    referringClinic: string;
    operationalConstraints: string;
    coordinationNotes: string;
    syntheticPatientRef: string;
  }) =>
    request<{ referral: Referral; matchOutput: MatchingEngineOutput }>('/api/referrals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getReferralById: (id: string) => request<{ referral: Referral }>(`/api/referrals/${id}`),

  getReferralOptions: (id: string) =>
    request<{
      options: ReferralOption[];
      matched: MatchingEngineOutput['matched'];
      excluded: MatchingEngineOutput['excluded'];
    }>(`/api/referrals/${id}/options`),

  getReferralTimeline: (id: string) =>
    request<{
      referral: Referral;
      timeline: {
        id: string;
        type: string;
        status: ReferralStatus;
        title: string;
        description: string;
        actorName: string;
        timestamp: string;
      }[];
      auditEvents: AuditLog[];
    }>(`/api/referrals/${id}/timeline`),

  respondToReferral: (
    id: string,
    payload: { responseStatus: ReferralStatus; responseNote: string }
  ) =>
    request<{ referral: Referral; response: ReferralResponse; auditLog: AuditLog }>(
      `/api/referrals/${id}/responses`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  reassignReferral: (id: string, payload: { newHospitalId: string; note?: string }) =>
    request<{ referral: Referral }>(`/api/referrals/${id}/reassign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Dashboards, Notifications, Analytics
  getReferrerDashboard: () =>
    request<{
      stats: {
        totalReferrals: number;
        pendingReferrals: number;
        acceptedReferrals: number;
        declinedReferrals: number;
        moreInfoReferrals: number;
      };
      referrals: Referral[];
      recentActivity: AuditLog[];
    }>('/api/dashboard/referrer'),

  getCoordinatorDashboard: (hospitalId?: string) =>
    request<{
      hospital: EnrichedHospital;
      stats: {
        totalIncoming: number;
        pendingRequests: number;
        acceptedReferrals: number;
        declinedReferrals: number;
        moreInfoNeeded: number;
      };
      incomingReferrals: Referral[];
      services: EnrichedHospitalService[];
      recentUpdates: AuditLog[];
    }>(`/api/dashboard/coordinator${hospitalId ? `?hospitalId=${hospitalId}` : ''}`),

  getAnalytics: () => request<{ analytics: AnalyticsSummary }>('/api/analytics'),

  getNotifications: () => request<{ notifications: NotificationItem[] }>('/api/notifications'),

  markNotificationsRead: (payload: { id?: string; all?: boolean }) =>
    request<{ notifications: NotificationItem[] }>('/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAuditLogs: () => request<{ auditLogs: AuditLog[] }>('/api/audit-logs'),
};
