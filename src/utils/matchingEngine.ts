import type {
  AnalyticsSummary,
  CapacityStatus,
  EnrichedHospitalService,
  ExcludedHospitalResult,
  Hospital,
  MatchedHospitalResult,
  MatchingEngineOutput,
  Referral,
  ReferralResponse,
  Service,
  ServiceAcceptanceStatus,
  UrgencyLabel,
} from '../types/models';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const FRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export function formatFreshness(updatedAtIso: string, nowMs: number = Date.now()): {
  label: string;
  ageMinutes: number;
  isFresh: boolean;
  isStale: boolean;
} {
  const updatedMs = new Date(updatedAtIso).getTime();
  if (Number.isNaN(updatedMs)) {
    return {
      label: 'Timestamp unverified',
      ageMinutes: 99999,
      isFresh: false,
      isStale: true,
    };
  }

  const diffMs = Math.max(0, nowMs - updatedMs);
  const ageMinutes = Math.round(diffMs / 60000);
  const isFresh = diffMs <= FRESH_THRESHOLD_MS;
  const isStale = diffMs > STALE_THRESHOLD_MS;

  if (ageMinutes < 1) {
    return { label: 'Updated just now', ageMinutes: 0, isFresh: true, isStale: false };
  }
  if (ageMinutes < 60) {
    return {
      label: `Updated ${ageMinutes} min ago`,
      ageMinutes,
      isFresh,
      isStale,
    };
  }
  const hours = Math.floor(ageMinutes / 60);
  if (hours < 24) {
    return {
      label: `Updated ${hours}h ago`,
      ageMinutes,
      isFresh,
      isStale,
    };
  }
  const days = Math.floor(hours / 24);
  return {
    label: `Updated ${days}d ago (Stale)`,
    ageMinutes,
    isFresh: false,
    isStale: true,
  };
}

function getCapacityRank(status: CapacityStatus): number {
  switch (status) {
    case 'AVAILABLE':
      return 1;
    case 'LIMITED':
      return 2;
    case 'UNCONFIRMED':
      return 3;
    case 'UNAVAILABLE':
      return 4;
  }
}

function getAcceptanceRank(
  serviceAcceptance: ServiceAcceptanceStatus,
  hospitalAcceptance: Hospital['referralAcceptance']
): number {
  if (hospitalAcceptance === 'NOT_ACCEPTING' || serviceAcceptance === 'PAUSED') {
    return 4;
  }
  if (serviceAcceptance === 'ACCEPTING' && hospitalAcceptance === 'ACCEPTING') {
    return 1;
  }
  if (serviceAcceptance === 'ACCEPTING' && hospitalAcceptance === 'LIMITED_REVIEW') {
    return 2;
  }
  return 3;
}

export function formatCapacityPhrase(status: CapacityStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Capacity available';
    case 'LIMITED':
      return 'Capacity limited';
    case 'UNCONFIRMED':
      return 'Capacity unconfirmed';
    case 'UNAVAILABLE':
      return 'Capacity unavailable';
  }
}

export function formatAcceptancePhrase(
  serviceAcceptance: ServiceAcceptanceStatus,
  hospitalAcceptance: Hospital['referralAcceptance']
): string {
  if (hospitalAcceptance === 'NOT_ACCEPTING' || serviceAcceptance === 'PAUSED') {
    return 'Referrals paused';
  }
  if (serviceAcceptance === 'PENDING_REVIEW' || hospitalAcceptance === 'LIMITED_REVIEW') {
    return 'Referral acceptance pending review';
  }
  return 'Accepting referrals';
}

export interface MatchingCriteria {
  requiredServiceId: string;
  preferredArea?: string; // Empty or 'All Davangere' matches all areas in Davangere
  strictAreaFilter?: boolean; // If true, Step 1 hard filters by area
}

/**
 * Transparent 3-Step Hospital Referral Matching Process:
 * Step 1: Hard filters (Active hospital, Required service listed, Selected search area)
 * Step 2: Operational status (Exclude explicitly unavailable services / paused hospital acceptance)
 * Step 3: Explainable ordering (Service match, Reported capacity, Referral acceptance, Distance band, Freshness)
 */
export function matchAndRankHospitals(
  hospitals: Hospital[],
  hospitalServices: EnrichedHospitalService[],
  criteria: MatchingCriteria,
  nowMs: number = Date.now()
): MatchingEngineOutput {
  const matched: MatchedHospitalResult[] = [];
  const excluded: ExcludedHospitalResult[] = [];

  const normalizedArea = (criteria.preferredArea || '').trim().toLowerCase();
  const hasSpecificArea =
    Boolean(normalizedArea) &&
    normalizedArea !== 'all' &&
    normalizedArea !== 'all davangere' &&
    normalizedArea !== 'davangere (all areas)';

  for (const hospital of hospitals) {
    // Step 1A: Hospital must be active
    if (!hospital.activeStatus) {
      excluded.push({
        hospital,
        exclusionStep: 'STEP_1_HARD_FILTER',
        exclusionReason: 'Hospital profile is currently inactive for referral coordination',
      });
      continue;
    }

    // Step 1B: Required service must be listed at this hospital
    const serviceRecord = hospitalServices.find(
      (hs) => hs.hospitalId === hospital.id && hs.serviceId === criteria.requiredServiceId
    );

    if (!serviceRecord) {
      excluded.push({
        hospital,
        exclusionStep: 'STEP_1_HARD_FILTER',
        exclusionReason: 'Required medical service is not listed in hospital catalogue',
      });
      continue;
    }

    // Step 1C: Search area check (if strictAreaFilter is enabled)
    const isAreaExactMatch =
      !hasSpecificArea ||
      hospital.area.toLowerCase().includes(normalizedArea) ||
      hospital.address.toLowerCase().includes(normalizedArea);

    if (criteria.strictAreaFilter && hasSpecificArea && !isAreaExactMatch) {
      excluded.push({
        hospital,
        exclusionStep: 'STEP_1_HARD_FILTER',
        exclusionReason: `Outside selected search area (${criteria.preferredArea})`,
      });
      continue;
    }

    // Step 2: Operational status — Exclude explicitly unavailable services or hospitals not accepting referrals
    if (serviceRecord.serviceStatus === 'UNAVAILABLE') {
      excluded.push({
        hospital,
        exclusionStep: 'STEP_2_OPERATIONAL_STATUS',
        exclusionReason: `${serviceRecord.serviceName} is explicitly marked Unavailable`,
        capacityStatus: serviceRecord.capacityStatus,
        serviceStatus: serviceRecord.serviceStatus,
      });
      continue;
    }

    if (serviceRecord.capacityStatus === 'UNAVAILABLE') {
      excluded.push({
        hospital,
        exclusionStep: 'STEP_2_OPERATIONAL_STATUS',
        exclusionReason: `Reported capacity for ${serviceRecord.serviceName} is currently Unavailable`,
        capacityStatus: serviceRecord.capacityStatus,
        serviceStatus: serviceRecord.serviceStatus,
      });
      continue;
    }

    if (hospital.referralAcceptance === 'NOT_ACCEPTING' || serviceRecord.referralAcceptance === 'PAUSED') {
      excluded.push({
        hospital,
        exclusionStep: 'STEP_2_OPERATIONAL_STATUS',
        exclusionReason: 'Hospital or service department has temporarily paused incoming referrals',
        capacityStatus: serviceRecord.capacityStatus,
        serviceStatus: serviceRecord.serviceStatus,
      });
      continue;
    }

    const freshness = formatFreshness(serviceRecord.updatedAt, nowMs);

    // Build transparent, human-readable explainable reason string
    const reasonParts: string[] = [
      'Required service listed',
      formatCapacityPhrase(serviceRecord.capacityStatus),
      formatAcceptancePhrase(serviceRecord.referralAcceptance, hospital.referralAcceptance),
      hasSpecificArea && isAreaExactMatch
        ? `Preferred area match (${hospital.area})`
        : `${hospital.distanceKm.toFixed(1)} km (${hospital.area})`,
      freshness.label,
    ];

    matched.push({
      hospital,
      hospitalService: serviceRecord,
      matchReasons: reasonParts.join(' · '),
      isAreaExactMatch,
      isFresh: freshness.isFresh,
      isStale: freshness.isStale,
      freshnessLabel: freshness.label,
      rankOrder: 0,
    });
  }

  // Step 3: Explainable ordering
  matched.sort((a, b) => {
    // 1. Reported capacity (AVAILABLE > LIMITED > UNCONFIRMED)
    const capDiff =
      getCapacityRank(a.hospitalService.capacityStatus) -
      getCapacityRank(b.hospitalService.capacityStatus);
    if (capDiff !== 0) return capDiff;

    // 2. Referral acceptance (ACCEPTING > PENDING_REVIEW)
    const accDiff =
      getAcceptanceRank(a.hospitalService.referralAcceptance, a.hospital.referralAcceptance) -
      getAcceptanceRank(b.hospitalService.referralAcceptance, b.hospital.referralAcceptance);
    if (accDiff !== 0) return accDiff;

    // 3. Preferred area match (when preferredArea is provided)
    if (a.isAreaExactMatch !== b.isAreaExactMatch) {
      return a.isAreaExactMatch ? -1 : 1;
    }

    // 4. Freshness of information (non-stale before stale)
    if (a.isStale !== b.isStale) {
      return a.isStale ? 1 : -1;
    }

    // 5. Distance band / km
    if (Math.abs(a.hospital.distanceKm - b.hospital.distanceKm) > 0.5) {
      return a.hospital.distanceKm - b.hospital.distanceKm;
    }

    // 6. Most recent timestamp tie-breaker
    return (
      new Date(b.hospitalService.updatedAt).getTime() -
      new Date(a.hospitalService.updatedAt).getTime()
    );
  });

  matched.forEach((item, index) => {
    item.rankOrder = index + 1;
  });

  return { matched, excluded };
}

export interface CreateReferralInput {
  requiredServiceId: string;
  receivingHospitalId: string;
  preferredArea: string;
  urgencyLabel: UrgencyLabel;
  referringClinic: string;
  operationalConstraints?: string;
  coordinationNotes?: string;
  syntheticPatientRef: string;
}

export function validateReferralInput(input: Partial<CreateReferralInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.requiredServiceId || !input.requiredServiceId.trim()) {
    errors.requiredServiceId = 'Required medical service must be selected.';
  }
  if (!input.receivingHospitalId || !input.receivingHospitalId.trim()) {
    errors.receivingHospitalId = 'Please select a receiving hospital option.';
  }
  if (!input.preferredArea || !input.preferredArea.trim()) {
    errors.preferredArea = 'Preferred coordination area in Davangere is required.';
  }
  if (
    !input.urgencyLabel ||
    !['ROUTINE', 'PRIORITY', 'URGENT_TRANSFER'].includes(input.urgencyLabel)
  ) {
    errors.urgencyLabel = 'Valid referral urgency category is required.';
  }
  if (!input.referringClinic || input.referringClinic.trim().length < 3) {
    errors.referringClinic = 'Referring clinic name is required (min 3 characters).';
  }
  if (!input.syntheticPatientRef || !input.syntheticPatientRef.trim()) {
    errors.syntheticPatientRef = 'Synthetic patient reference ID is required.';
  } else if (!/^[A-Za-z0-9_-]{4,32}$/.test(input.syntheticPatientRef.trim())) {
    errors.syntheticPatientRef =
      'Use a synthetic reference code (4–32 alphanumeric/hyphen characters, e.g., SYN-DVG-4082). Do not enter patient names.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function computeAnalyticsMetrics(
  referrals: Referral[],
  responses: ReferralResponse[],
  hospitalServices: EnrichedHospitalService[],
  services: Service[],
  nowMs: number = Date.now()
): AnalyticsSummary {
  const totalReferrals = referrals.length;
  const acceptedCount = referrals.filter((r) => r.status === 'ACCEPTED').length;
  const declinedCount = referrals.filter((r) => r.status === 'DECLINED').length;
  const pendingCount = referrals.filter((r) => r.status === 'PENDING').length;
  const moreInfoCount = referrals.filter((r) => r.status === 'MORE_INFO_NEEDED').length;

  const acceptanceRate =
    totalReferrals > 0 ? Math.round((acceptedCount / totalReferrals) * 1000) / 10 : 0;
  const declineRate =
    totalReferrals > 0 ? Math.round((declinedCount / totalReferrals) * 1000) / 10 : 0;

  // Compute average response time in minutes across referrals that have at least one response
  const responseTimesMinutes: number[] = [];
  for (const ref of referrals) {
    const refResponses = responses.filter((resp) => resp.referralId === ref.id);
    if (refResponses.length > 0) {
      const earliestResponse = refResponses.reduce((earliest, current) =>
        new Date(current.respondedAt).getTime() < new Date(earliest.respondedAt).getTime()
          ? current
          : earliest
      );
      const createdMs = new Date(ref.createdAt).getTime();
      const respondedMs = new Date(earliestResponse.respondedAt).getTime();
      if (!Number.isNaN(createdMs) && !Number.isNaN(respondedMs) && respondedMs >= createdMs) {
        responseTimesMinutes.push(Math.round((respondedMs - createdMs) / 60000));
      }
    }
  }

  const averageResponseTimeMinutes =
    responseTimesMinutes.length > 0
      ? Math.round(
          responseTimesMinutes.reduce((acc, val) => acc + val, 0) / responseTimesMinutes.length
        )
      : 18;

  const staleServiceRecordsCount = hospitalServices.filter(
    (hs) => formatFreshness(hs.updatedAt, nowMs).isStale
  ).length;

  const serviceDistribution = services.map((svc) => {
    const svcRefs = referrals.filter((r) => r.requiredServiceId === svc.id);
    return {
      serviceId: svc.id,
      serviceName: svc.name,
      category: svc.category,
      total: svcRefs.length,
      accepted: svcRefs.filter((r) => r.status === 'ACCEPTED').length,
      declined: svcRefs.filter((r) => r.status === 'DECLINED').length,
      pending: svcRefs.filter((r) => r.status === 'PENDING').length,
      moreInfo: svcRefs.filter((r) => r.status === 'MORE_INFO_NEEDED').length,
    };
  });

  const capacityBreakdown = {
    available: hospitalServices.filter((hs) => hs.capacityStatus === 'AVAILABLE').length,
    limited: hospitalServices.filter((hs) => hs.capacityStatus === 'LIMITED').length,
    unconfirmed: hospitalServices.filter((hs) => hs.capacityStatus === 'UNCONFIRMED').length,
    unavailable: hospitalServices.filter((hs) => hs.capacityStatus === 'UNAVAILABLE').length,
  };

  return {
    totalReferrals,
    acceptedCount,
    declinedCount,
    pendingCount,
    moreInfoCount,
    acceptanceRate,
    declineRate,
    averageResponseTimeMinutes,
    staleServiceRecordsCount,
    totalServiceRecordsCount: hospitalServices.length,
    serviceDistribution,
    capacityBreakdown,
  };
}
