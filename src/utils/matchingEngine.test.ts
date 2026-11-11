import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAnalyticsMetrics,
  formatFreshness,
  matchAndRankHospitals,
  validateReferralInput,
} from './matchingEngine';
import type { EnrichedHospitalService, Hospital } from '../types/models';

const NOW = new Date('2026-11-11T08:00:00.000Z').getTime();

const mockHospitals: Hospital[] = [
  {
    id: 'hosp-available',
    name: 'Bapuji Regional Demo Medical Centre',
    address: 'PJ Extension, Davangere',
    area: 'PJ Extension',
    distanceBand: '0–3 km (Central)',
    distanceKm: 1.8,
    contactInformation: '+91-8192-230101 (Demo)',
    emergencyDeskPhone: '+91-8192-230199',
    coordinatorName: 'Suresh Kumar',
    coordinatorEmail: 'coordinator@bapujidemo.org',
    activeStatus: true,
    referralAcceptance: 'ACCEPTING',
    specialties: ['Cardiology', 'Emergency Services'],
    updatedAt: new Date(NOW - 10 * 60000).toISOString(),
  },
  {
    id: 'hosp-limited',
    name: 'Chigateri Demo District General Hospital',
    address: 'MCC B Block, Davangere',
    area: 'MCC B Block',
    distanceBand: '3–6 km (Urban Ring)',
    distanceKm: 3.4,
    contactInformation: '+91-8192-240202 (Demo)',
    emergencyDeskPhone: '+91-8192-240299',
    coordinatorName: 'Kavitha Rao',
    coordinatorEmail: 'coordinator@chigateridemo.org',
    activeStatus: true,
    referralAcceptance: 'LIMITED_REVIEW',
    specialties: ['Cardiology', 'Dialysis'],
    updatedAt: new Date(NOW - 25 * 60000).toISOString(),
  },
  {
    id: 'hosp-no-service',
    name: 'Tungabhadra Demo Ortho & Trauma Institute',
    address: 'Shamanur Road, Davangere',
    area: 'Shamanur Road',
    distanceBand: '3–6 km (Urban Ring)',
    distanceKm: 4.2,
    contactInformation: '+91-8192-250303 (Demo)',
    emergencyDeskPhone: '+91-8192-250399',
    coordinatorName: 'Ramesh Gowda',
    coordinatorEmail: 'coordinator@tungabhadrademo.org',
    activeStatus: true,
    referralAcceptance: 'ACCEPTING',
    specialties: ['Orthopedics'],
    updatedAt: new Date(NOW - 40 * 60000).toISOString(),
  },
  {
    id: 'hosp-unavailable-cap',
    name: 'Vidyanagar Demo Multispecialty Hospital',
    address: 'Vidyanagar, Davangere',
    area: 'Vidyanagar',
    distanceBand: '0–3 km (Central)',
    distanceKm: 2.5,
    contactInformation: '+91-8192-260404 (Demo)',
    emergencyDeskPhone: '+91-8192-260499',
    coordinatorName: 'Ananya Hegde',
    coordinatorEmail: 'coordinator@vidyanagardemo.org',
    activeStatus: true,
    referralAcceptance: 'ACCEPTING',
    specialties: ['Cardiology'],
    updatedAt: new Date(NOW - 15 * 60000).toISOString(),
  },
];

const mockServices: EnrichedHospitalService[] = [
  {
    id: 'hs-1',
    hospitalId: 'hosp-available',
    serviceId: 'svc-cardiology',
    serviceName: 'Interventional Cardiology & Cath Lab',
    serviceCategory: 'Cardiology',
    serviceDescription: 'Cardiac catheterization and acute coronary evaluation',
    serviceStatus: 'AVAILABLE',
    capacityStatus: 'AVAILABLE',
    referralAcceptance: 'ACCEPTING',
    operationalNotes: 'Cath lab crew on-site; call desk prior to dispatch.',
    updatedAt: new Date(NOW - 12 * 60000).toISOString(),
    updatedBy: 'user-coord-1',
    updatedByName: 'Suresh Kumar',
  },
  {
    id: 'hs-2',
    hospitalId: 'hosp-limited',
    serviceId: 'svc-cardiology',
    serviceName: 'Interventional Cardiology & Cath Lab',
    serviceCategory: 'Cardiology',
    serviceDescription: 'Cardiac catheterization and acute coronary evaluation',
    serviceStatus: 'AVAILABLE',
    capacityStatus: 'LIMITED',
    referralAcceptance: 'PENDING_REVIEW',
    operationalNotes: '1 monitored step-down slot pending discharge.',
    updatedAt: new Date(NOW - 25 * 60000).toISOString(),
    updatedBy: 'user-coord-2',
    updatedByName: 'Kavitha Rao',
  },
  {
    id: 'hs-3',
    hospitalId: 'hosp-unavailable-cap',
    serviceId: 'svc-cardiology',
    serviceName: 'Interventional Cardiology & Cath Lab',
    serviceCategory: 'Cardiology',
    serviceDescription: 'Cardiac catheterization and acute coronary evaluation',
    serviceStatus: 'AVAILABLE',
    capacityStatus: 'UNAVAILABLE',
    referralAcceptance: 'PAUSED',
    operationalNotes: 'Equipment calibration until 18:00.',
    updatedAt: new Date(NOW - 15 * 60000).toISOString(),
    updatedBy: 'user-coord-3',
    updatedByName: 'Ananya Hegde',
  },
];

test('Step 1, 2, 3 matching engine filters unavailable services and orders explainably', () => {
  const result = matchAndRankHospitals(
    mockHospitals,
    mockServices,
    { requiredServiceId: 'svc-cardiology', preferredArea: 'All Davangere' },
    NOW
  );

  // 2 matched hospitals (Available first, Limited second)
  assert.equal(result.matched.length, 2);
  assert.equal(result.matched[0].hospital.id, 'hosp-available');
  assert.equal(result.matched[0].rankOrder, 1);
  assert.ok(result.matched[0].matchReasons.includes('Required service listed'));
  assert.ok(result.matched[0].matchReasons.includes('Capacity available'));
  assert.ok(result.matched[0].matchReasons.includes('Accepting referrals'));
  assert.ok(result.matched[0].matchReasons.includes('Updated 12 min ago'));

  assert.equal(result.matched[1].hospital.id, 'hosp-limited');
  assert.equal(result.matched[1].rankOrder, 2);
  assert.ok(result.matched[1].matchReasons.includes('Capacity limited'));
  assert.ok(result.matched[1].matchReasons.includes('Referral acceptance pending review'));

  // 2 excluded hospitals (1 missing service in Step 1, 1 unavailable capacity in Step 2)
  assert.equal(result.excluded.length, 2);
  const step1Excluded = result.excluded.find((e) => e.hospital.id === 'hosp-no-service');
  assert.ok(step1Excluded);
  assert.equal(step1Excluded.exclusionStep, 'STEP_1_HARD_FILTER');

  const step2Excluded = result.excluded.find((e) => e.hospital.id === 'hosp-unavailable-cap');
  assert.ok(step2Excluded);
  assert.equal(step2Excluded.exclusionStep, 'STEP_2_OPERATIONAL_STATUS');
});

test('formatFreshness accurately flags stale records (> 24 hours)', () => {
  const fresh = formatFreshness(new Date(NOW - 20 * 60000).toISOString(), NOW);
  assert.equal(fresh.label, 'Updated 20 min ago');
  assert.equal(fresh.isFresh, true);
  assert.equal(fresh.isStale, false);

  const stale = formatFreshness(new Date(NOW - 30 * 3600 * 1000).toISOString(), NOW);
  assert.equal(stale.isStale, true);
  assert.ok(stale.label.includes('Stale'));
});

test('validateReferralInput rejects missing fields and non-synthetic patient identifiers', () => {
  const invalid = validateReferralInput({
    requiredServiceId: '',
    receivingHospitalId: '',
    preferredArea: '',
    referringClinic: 'A',
    syntheticPatientRef: 'John Doe (Real Name!)',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.requiredServiceId);
  assert.ok(invalid.errors.syntheticPatientRef);

  const valid = validateReferralInput({
    requiredServiceId: 'svc-cardiology',
    receivingHospitalId: 'hosp-available',
    preferredArea: 'PJ Extension',
    urgencyLabel: 'URGENT_TRANSFER',
    referringClinic: 'Davangere Heart & Family Clinic (Demo)',
    syntheticPatientRef: 'SYN-DVG-8841',
  });
  assert.equal(valid.valid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('computeAnalyticsMetrics calculates rates and stale record counts accurately', () => {
  const metrics = computeAnalyticsMetrics(
    [
      {
        id: 'ref-1',
        referralReference: 'RLH-2026-101',
        createdBy: 'u1',
        createdByName: 'Dr. Anitha Sharma',
        referringClinic: 'Demo Clinic',
        requiredServiceId: 'svc-cardiology',
        requiredServiceName: 'Cardiology',
        requiredServiceCategory: 'Cardiology',
        receivingHospitalId: 'hosp-available',
        receivingHospitalName: 'Bapuji Demo',
        receivingHospitalArea: 'PJ Extension',
        receivingHospitalContact: '123',
        preferredArea: 'PJ Extension',
        urgencyLabel: 'PRIORITY',
        operationalConstraints: '',
        coordinationNotes: '',
        syntheticPatientRef: 'SYN-DVG-1001',
        status: 'ACCEPTED',
        createdAt: new Date(NOW - 60 * 60000).toISOString(),
        updatedAt: new Date(NOW - 45 * 60000).toISOString(),
      },
      {
        id: 'ref-2',
        referralReference: 'RLH-2026-102',
        createdBy: 'u1',
        createdByName: 'Dr. Anitha Sharma',
        referringClinic: 'Demo Clinic',
        requiredServiceId: 'svc-cardiology',
        requiredServiceName: 'Cardiology',
        requiredServiceCategory: 'Cardiology',
        receivingHospitalId: 'hosp-limited',
        receivingHospitalName: 'Chigateri Demo',
        receivingHospitalArea: 'MCC B Block',
        receivingHospitalContact: '123',
        preferredArea: 'MCC B Block',
        urgencyLabel: 'ROUTINE',
        operationalConstraints: '',
        coordinationNotes: '',
        syntheticPatientRef: 'SYN-DVG-1002',
        status: 'DECLINED',
        createdAt: new Date(NOW - 50 * 60000).toISOString(),
        updatedAt: new Date(NOW - 30 * 60000).toISOString(),
      },
    ],
    [
      {
        id: 'resp-1',
        referralId: 'ref-1',
        hospitalId: 'hosp-available',
        hospitalName: 'Bapuji Demo',
        responseStatus: 'ACCEPTED',
        responseNote: 'Confirmed slot',
        respondedBy: 'u2',
        respondedByName: 'Suresh Kumar',
        respondedAt: new Date(NOW - 45 * 60000).toISOString(),
      },
    ],
    mockServices,
    [{ id: 'svc-cardiology', name: 'Cardiology', category: 'Cardiology', description: 'Heart' }],
    NOW
  );

  assert.equal(metrics.totalReferrals, 2);
  assert.equal(metrics.acceptedCount, 1);
  assert.equal(metrics.declinedCount, 1);
  assert.equal(metrics.acceptanceRate, 50);
  assert.equal(metrics.declineRate, 50);
  assert.equal(metrics.averageResponseTimeMinutes, 15);
});
