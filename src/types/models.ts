export type UserRole = 'REFERRING_DOCTOR' | 'HOSPITAL_COORDINATOR';

export type ServiceStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type CapacityStatus = 'AVAILABLE' | 'LIMITED' | 'UNCONFIRMED' | 'UNAVAILABLE';
export type HospitalAcceptanceStatus = 'ACCEPTING' | 'LIMITED_REVIEW' | 'NOT_ACCEPTING';
export type ServiceAcceptanceStatus = 'ACCEPTING' | 'PENDING_REVIEW' | 'PAUSED';
export type UrgencyLabel = 'ROUTINE' | 'PRIORITY' | 'URGENT_TRANSFER';
export type ReferralStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'MORE_INFO_NEEDED';

export interface User {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  specialtyOrTitle: string;
  hospitalId?: string;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  area: string;
  distanceBand: '0–3 km (Central)' | '3–6 km (Urban Ring)' | '6–12 km (Regional Corridor)';
  distanceKm: number;
  contactInformation: string;
  emergencyDeskPhone: string;
  coordinatorName: string;
  coordinatorEmail: string;
  activeStatus: boolean;
  referralAcceptance: HospitalAcceptanceStatus;
  specialties: string[];
  updatedAt: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface HospitalService {
  id: string;
  hospitalId: string;
  serviceId: string;
  serviceStatus: ServiceStatus;
  capacityStatus: CapacityStatus;
  referralAcceptance: ServiceAcceptanceStatus;
  operationalNotes: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

export interface EnrichedHospitalService extends HospitalService {
  serviceName: string;
  serviceCategory: string;
  serviceDescription: string;
}

export interface EnrichedHospital extends Hospital {
  services: EnrichedHospitalService[];
}

export interface ReferralOption {
  id: string;
  referralId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalArea: string;
  distanceKm: number;
  distanceBand: string;
  capacityStatus: CapacityStatus;
  referralAcceptance: ServiceAcceptanceStatus;
  matchReasons: string;
  optionStatus: 'PRIMARY_SELECTED' | 'ALTERNATIVE_STANDBY' | 'REVIEWED';
  updatedAt: string;
}

export interface ReferralResponse {
  id: string;
  referralId: string;
  hospitalId: string;
  hospitalName: string;
  responseStatus: ReferralStatus;
  responseNote: string;
  respondedBy: string;
  respondedByName: string;
  respondedAt: string;
}

export interface Referral {
  id: string;
  referralReference: string;
  createdBy: string;
  createdByName: string;
  referringClinic: string;
  requiredServiceId: string;
  requiredServiceName: string;
  requiredServiceCategory: string;
  receivingHospitalId: string;
  receivingHospitalName: string;
  receivingHospitalArea: string;
   receivingHospitalContact: string;
  preferredArea: string;
  urgencyLabel: UrgencyLabel;
  operationalConstraints: string;
  coordinationNotes: string;
  syntheticPatientRef: string;
  status: ReferralStatus;
  createdAt: string;
  updatedAt: string;
  options?: ReferralOption[];
  responses?: ReferralResponse[];
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  entityType: 'HOSPITAL_SERVICE' | 'REFERRAL' | 'HOSPITAL';
  entityId: string;
  hospitalId?: string;
  action: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  recipientRole?: UserRole;
  recipientUserId?: string;
  recipientHospitalId?: string;
  type:
    | 'NEW_REFERRAL'
    | 'REFERRAL_ACCEPTED'
    | 'REFERRAL_DECLINED'
    | 'MORE_INFO_REQUESTED'
    | 'CAPACITY_UPDATED'
    | 'STATUS_CHANGED';
  title: string;
  message: string;
  referralId?: string;
  hospitalId?: string;
  read: boolean;
  createdAt: string;
}

export interface MatchedHospitalResult {
  hospital: Hospital;
  hospitalService: EnrichedHospitalService;
  matchReasons: string;
  isAreaExactMatch: boolean;
  isFresh: boolean;
  isStale: boolean;
  freshnessLabel: string;
  rankOrder: number;
}

export interface ExcludedHospitalResult {
  hospital: Hospital;
  exclusionStep: 'STEP_1_HARD_FILTER' | 'STEP_2_OPERATIONAL_STATUS';
  exclusionReason: string;
  capacityStatus?: CapacityStatus;
  serviceStatus?: ServiceStatus;
}

export interface MatchingEngineOutput {
  matched: MatchedHospitalResult[];
  excluded: ExcludedHospitalResult[];
}

export interface AnalyticsSummary {
  totalReferrals: number;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
  moreInfoCount: number;
  acceptanceRate: number;
  declineRate: number;
  averageResponseTimeMinutes: number;
  staleServiceRecordsCount: number;
  totalServiceRecordsCount: number;
  serviceDistribution: {
    serviceId: string;
    serviceName: string;
    category: string;
    total: number;
    accepted: number;
    declined: number;
    pending: number;
    moreInfo: number;
  }[];
  capacityBreakdown: {
    available: number;
    limited: number;
    unconfirmed: number;
    unavailable: number;
  };
}
