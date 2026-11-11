import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AuditLog,
  EnrichedHospital,
  EnrichedHospitalService,
  Hospital,
  HospitalService,
  NotificationItem,
  Referral,
  ReferralOption,
  ReferralResponse,
  Service,
  User,
} from '../types/models';
import { matchAndRankHospitals } from '../utils/matchingEngine';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  hospitals: Hospital[];
  services: Service[];
  hospitalServices: HospitalService[];
  referrals: Referral[];
  referralOptions: ReferralOption[];
  referralResponses: ReferralResponse[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'reliefledger_db.json');

export function hashPassword(password: string): string {
  const salt = 'reliefledger_static_demo_salt_v1';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const computed = hashPassword(password);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buildInitialSeed(): DatabaseSchema {
  const defaultPassHash = hashPassword('DemoPassword123!');

  const users: StoredUser[] = [
    {
      id: 'user-doc-1',
      uid: 'user-doc-1',
      name: 'Dr. Anitha Sharma',
      email: 'doctor.demo@reliefledger.example',
      passwordHash: defaultPassHash,
      role: 'REFERRING_DOCTOR',
      organization: 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)',
      specialtyOrTitle: 'Senior Referring Physician · Internal Medicine',
      phone: '+91-8192-221100 (Demo)',
      avatarUrl: '/src/assets/images/avatar_doctor_referrer_1794383297836.jpg',
      createdAt: hoursAgo(120),
    },
    {
      id: 'user-coord-1',
      uid: 'user-coord-1',
      name: 'Suresh Kumar',
      email: 'coordinator.demo@reliefledger.example',
      passwordHash: defaultPassHash,
      role: 'HOSPITAL_COORDINATOR',
      organization: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      specialtyOrTitle: 'Lead Receiving Hospital Coordinator',
      hospitalId: 'hosp-1',
      phone: '+91-8192-230101 (Demo)',
      avatarUrl: '/src/assets/images/avatar_hospital_coordinator_1794383298931.jpg',
      createdAt: hoursAgo(120),
    },
    {
      id: 'user-coord-2',
      uid: 'user-coord-2',
      name: 'Kavitha Rao',
      email: 'kavitha.demo@reliefledger.example',
      passwordHash: defaultPassHash,
      role: 'HOSPITAL_COORDINATOR',
      organization: 'Chigateri District Demo General Hospital (Fictional Demo)',
      specialtyOrTitle: 'Patient Flow & Referral Coordinator',
      hospitalId: 'hosp-2',
      phone: '+91-8192-240202 (Demo)',
      createdAt: hoursAgo(100),
    },
  ];

  const services: Service[] = [
    {
      id: 'svc-cardiology',
      name: 'Interventional Cardiology & Cath Lab',
      category: 'Cardiology',
      description: 'Acute coronary evaluation, echocardiography, and cardiac catheterization coordination.',
    },
    {
      id: 'svc-neurology',
      name: 'Acute Stroke & Neuro-Critical Care',
      category: 'Neurology',
      description: 'Neurological evaluation, thrombolysis readiness, and neuro-monitoring.',
    },
    {
      id: 'svc-orthopedics',
      name: 'Polytrauma & Orthopedic Fixation Surgery',
      category: 'Orthopedics',
      description: 'Complex fracture stabilization, joint trauma, and post-operative orthopedic care.',
    },
    {
      id: 'svc-emergency',
      name: '24/7 Emergency Stabilization & Triage',
      category: 'Emergency Services',
      description: 'High-acuity medical resuscitation, trauma bays, and rapid diagnostic stabilization.',
    },
    {
      id: 'svc-radiology',
      name: '3T MRI & Contrast CT Diagnostic Imaging',
      category: 'Radiology',
      description: 'Cross-sectional diagnostic imaging with radiologist reporting turnaround tracking.',
    },
    {
      id: 'svc-dialysis',
      name: 'Acute Hemodialysis & Renal Replacement',
      category: 'Dialysis',
      description: 'Inpatient and urgent outpatient hemodialysis stations with nephrology oversight.',
    },
    {
      id: 'svc-surgery',
      name: 'Laparoscopic & Acute General Surgery',
      category: 'General Surgery',
      description: 'Emergency abdominal surgery, surgical consults, and peri-operative care.',
    },
    {
      id: 'svc-pediatrics',
      name: 'Neonatal & Pediatric Intensive Care (NICU/PICU)',
      category: 'Pediatrics',
      description: 'Specialized pediatric acute care, neonatal respiratory support, and child referrals.',
    },
  ];

  const hospitals: Hospital[] = [
    {
      id: 'hosp-1',
      name: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      address: 'Hospital Road, PJ Extension, Davangere 577002, Karnataka',
      area: 'PJ Extension',
      distanceBand: '0–3 km (Central)',
      distanceKm: 1.6,
      contactInformation: 'Desk: +91-8192-230101 · Direct Ext 402 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-230199',
      coordinatorName: 'Suresh Kumar',
      coordinatorEmail: 'coordinator.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'ACCEPTING',
      specialties: ['Cardiology', 'Neurology', 'Emergency Services', 'Radiology', 'General Surgery', 'Pediatrics'],
      updatedAt: minutesAgo(11),
    },
    {
      id: 'hosp-2',
      name: 'Chigateri District Demo General Hospital (Fictional Demo)',
      address: 'MCC B Block Main Avenue, Davangere 577004, Karnataka',
      area: 'MCC B Block',
      distanceBand: '0–3 km (Central)',
      distanceKm: 2.4,
      contactInformation: 'Desk: +91-8192-240202 · Triage Ext 108 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-240299',
      coordinatorName: 'Kavitha Rao',
      coordinatorEmail: 'kavitha.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'LIMITED_REVIEW',
      specialties: ['Cardiology', 'Orthopedics', 'Emergency Services', 'Dialysis', 'General Surgery'],
      updatedAt: minutesAgo(26),
    },
    {
      id: 'hosp-3',
      name: 'SS Narayana Demo Heart & Multispecialty Institute (Fictional Demo)',
      address: 'Shamanur Road Medical Corridor, Davangere 577004, Karnataka',
      area: 'Shamanur Road',
      distanceBand: '3–6 km (Urban Ring)',
      distanceKm: 4.1,
      contactInformation: 'Desk: +91-8192-251300 · Cardiac Coord Ext 210 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-251399',
      coordinatorName: 'Dr. Naveen Murthy (Coord)',
      coordinatorEmail: 'naveen.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'ACCEPTING',
      specialties: ['Cardiology', 'Neurology', 'Radiology', 'Dialysis', 'Emergency Services'],
      updatedAt: minutesAgo(16),
    },
    {
      id: 'hosp-4',
      name: 'Vidyanagar Demo Clinical & Diagnostic Hospital (Fictional Demo)',
      address: '2nd Cross, Vidyanagar Main Road, Davangere 577005, Karnataka',
      area: 'Vidyanagar',
      distanceBand: '3–6 km (Urban Ring)',
      distanceKm: 3.5,
      contactInformation: 'Desk: +91-8192-262400 · Imaging Desk Ext 305 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-262499',
      coordinatorName: 'Ananya Hegde',
      coordinatorEmail: 'ananya.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'ACCEPTING',
      specialties: ['Radiology', 'Neurology', 'General Surgery', 'Pediatrics'],
      updatedAt: minutesAgo(19),
    },
    {
      id: 'hosp-5',
      name: 'Tungabhadra Demo Ortho & Trauma Centre (Fictional Demo)',
      address: 'PB Road, Nittuvalli Junction, Davangere 577002, Karnataka',
      area: 'Nittuvalli',
      distanceBand: '3–6 km (Urban Ring)',
      distanceKm: 4.8,
      contactInformation: 'Desk: +91-8192-273500 · Trauma Coord Ext 112 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-273599',
      coordinatorName: 'Ramesh Gowda',
      coordinatorEmail: 'ramesh.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'ACCEPTING',
      specialties: ['Orthopedics', 'Emergency Services', 'Radiology', 'General Surgery'],
      updatedAt: minutesAgo(34),
    },
    {
      id: 'hosp-6',
      name: 'Anjaneya Demo Children & Maternity Hospital (Fictional Demo)',
      address: 'Hadadi Road Sector 3, Davangere 577005, Karnataka',
      area: 'Hadadi Road',
      distanceBand: '3–6 km (Urban Ring)',
      distanceKm: 5.2,
      contactInformation: 'Desk: +91-8192-284600 · NICU Desk Ext 501 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-284699',
      coordinatorName: 'Meenakshi Kulkarni',
      coordinatorEmail: 'meenakshi.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'ACCEPTING',
      specialties: ['Pediatrics', 'Emergency Services', 'Radiology'],
      updatedAt: minutesAgo(42),
    },
    {
      id: 'hosp-7',
      name: 'Karnatak Central Demo Renal & Surgical Care (Fictional Demo)',
      address: 'Ring Road West, Kunduwada, Davangere 577006, Karnataka',
      area: 'Kunduwada',
      distanceBand: '6–12 km (Regional Corridor)',
      distanceKm: 7.4,
      contactInformation: 'Desk: +91-8192-295700 · Dialysis Unit Ext 204 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-295799',
      coordinatorName: 'Prakash Shetty',
      coordinatorEmail: 'prakash.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'LIMITED_REVIEW',
      specialties: ['Dialysis', 'General Surgery', 'Cardiology'],
      updatedAt: hoursAgo(29), // Intentionally stale (>24h) for stale record tracking
    },
    {
      id: 'hosp-8',
      name: 'Harihar Highway Demo Emergency Pavilion (Fictional Demo)',
      address: 'NH-48 Bypass Corridor, Amaravathi Colony, Davangere 577006, Karnataka',
      area: 'NH-48 Corridor',
      distanceBand: '6–12 km (Regional Corridor)',
      distanceKm: 9.6,
      contactInformation: 'Desk: +91-8192-299800 · Highway Triage Ext 101 (Fictional Demo)',
      emergencyDeskPhone: '+91-8192-299899',
      coordinatorName: 'Vikram Patil',
      coordinatorEmail: 'vikram.demo@reliefledger.example',
      activeStatus: true,
      referralAcceptance: 'NOT_ACCEPTING',
      specialties: ['Emergency Services', 'Orthopedics', 'General Surgery'],
      updatedAt: hoursAgo(36), // Intentionally stale
    },
  ];

  const hospitalServices: HospitalService[] = [
    // Hospital 1: Bapuji Regional Demo Medical Centre (Primary Coordinator's Hospital)
    {
      id: 'hs-101',
      hospitalId: 'hosp-1',
      serviceId: 'svc-cardiology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'On-call interventional cardiologist on-site; confirm ECG summary via referral desk before transfer.',
      updatedAt: minutesAgo(11),
      updatedBy: 'user-coord-1',
      updatedByName: 'Suresh Kumar',
    },
    {
      id: 'hs-102',
      hospitalId: 'hosp-1',
      serviceId: 'svc-neurology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'PENDING_REVIEW',
      operationalNotes: 'Neuro-stepdown bay has limited monitor slots; coordinator review required prior to dispatch.',
      updatedAt: minutesAgo(24),
      updatedBy: 'user-coord-1',
      updatedByName: 'Suresh Kumar',
    },
    {
      id: 'hs-103',
      hospitalId: 'hosp-1',
      serviceId: 'svc-emergency',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Emergency triage bays active. Direct phone confirmation required for high-acuity transfers.',
      updatedAt: minutesAgo(9),
      updatedBy: 'user-coord-1',
      updatedByName: 'Suresh Kumar',
    },
    {
      id: 'hs-104',
      hospitalId: 'hosp-1',
      serviceId: 'svc-radiology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: '3T MRI and 128-slice CT operational; contrast studies require recent serum creatinine.',
      updatedAt: minutesAgo(18),
      updatedBy: 'user-coord-1',
      updatedByName: 'Suresh Kumar',
    },
    {
      id: 'hs-105',
      hospitalId: 'hosp-1',
      serviceId: 'svc-surgery',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'OT-2 scheduled for afternoon cases; urgent surgical consults accepted.',
      updatedAt: minutesAgo(38),
      updatedBy: 'user-coord-1',
      updatedByName: 'Suresh Kumar',
    },
    {
      id: 'hs-106',
      hospitalId: 'hosp-1',
      serviceId: 'svc-pediatrics',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'UNAVAILABLE',
      referralAcceptance: 'PAUSED',
      operationalNotes: 'Pediatric step-down ward at full occupancy this shift; refer to Anjaneya Demo Children Hospital.',
      updatedAt: minutesAgo(31),
      updatedBy: 'user-coord-1',
      updatedByName: 'Suresh Kumar',
    },

    // Hospital 2: Chigateri District Demo General Hospital
    {
      id: 'hs-201',
      hospitalId: 'hosp-2',
      serviceId: 'svc-cardiology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'PENDING_REVIEW',
      operationalNotes: 'High outpatient volume; coordinator pre-approval required before patient dispatch.',
      updatedAt: minutesAgo(26),
      updatedBy: 'user-coord-2',
      updatedByName: 'Kavitha Rao',
    },
    {
      id: 'hs-202',
      hospitalId: 'hosp-2',
      serviceId: 'svc-orthopedics',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Orthopedic trauma team available; digital X-ray uploads reviewed within 15 mins.',
      updatedAt: minutesAgo(21),
      updatedBy: 'user-coord-2',
      updatedByName: 'Kavitha Rao',
    },
    {
      id: 'hs-203',
      hospitalId: 'hosp-2',
      serviceId: 'svc-dialysis',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'PENDING_REVIEW',
      operationalNotes: 'Evening shift has 1 reserve dialysis machine; call coordinator to verify slot.',
      updatedAt: minutesAgo(47),
      updatedBy: 'user-coord-2',
      updatedByName: 'Kavitha Rao',
    },
    {
      id: 'hs-204',
      hospitalId: 'hosp-2',
      serviceId: 'svc-emergency',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'District emergency department active with moderate wait times.',
      updatedAt: minutesAgo(15),
      updatedBy: 'user-coord-2',
      updatedByName: 'Kavitha Rao',
    },
    {
      id: 'hs-205',
      hospitalId: 'hosp-2',
      serviceId: 'svc-surgery',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'General surgery duty team accepting routine and priority referrals.',
      updatedAt: minutesAgo(52),
      updatedBy: 'user-coord-2',
      updatedByName: 'Kavitha Rao',
    },

    // Hospital 3: SS Narayana Demo Heart & Multispecialty Institute
    {
      id: 'hs-301',
      hospitalId: 'hosp-3',
      serviceId: 'svc-cardiology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Dual cath labs operational; accepting priority cardiac referrals across Davangere district.',
      updatedAt: minutesAgo(16),
      updatedBy: 'user-coord-1',
      updatedByName: 'Dr. Naveen Murthy (Coord)',
    },
    {
      id: 'hs-302',
      hospitalId: 'hosp-3',
      serviceId: 'svc-neurology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Stroke protocol active with CT perfusion and neuro-specialist coverage.',
      updatedAt: minutesAgo(14),
      updatedBy: 'user-coord-1',
      updatedByName: 'Dr. Naveen Murthy (Coord)',
    },
    {
      id: 'hs-303',
      hospitalId: 'hosp-3',
      serviceId: 'svc-radiology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'CT available immediately; routine MRI slots queued for late afternoon.',
      updatedAt: minutesAgo(33),
      updatedBy: 'user-coord-1',
      updatedByName: 'Dr. Naveen Murthy (Coord)',
    },
    {
      id: 'hs-304',
      hospitalId: 'hosp-3',
      serviceId: 'svc-dialysis',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Renal unit accepting acute and scheduled hemodialysis referrals.',
      updatedAt: minutesAgo(29),
      updatedBy: 'user-coord-1',
      updatedByName: 'Dr. Naveen Murthy (Coord)',
    },

    // Hospital 4: Vidyanagar Demo Clinical & Diagnostic Hospital
    {
      id: 'hs-401',
      hospitalId: 'hosp-4',
      serviceId: 'svc-radiology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Dedicated 3T MRI & Contrast CT referral desk with rapid 45-min reporting.',
      updatedAt: minutesAgo(19),
      updatedBy: 'user-coord-1',
      updatedByName: 'Ananya Hegde',
    },
    {
      id: 'hs-402',
      hospitalId: 'hosp-4',
      serviceId: 'svc-neurology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Outpatient and inpatient neuro-evaluation available; EEG lab open.',
      updatedAt: minutesAgo(41),
      updatedBy: 'user-coord-1',
      updatedByName: 'Ananya Hegde',
    },
    {
      id: 'hs-403',
      hospitalId: 'hosp-4',
      serviceId: 'svc-cardiology',
      serviceStatus: 'UNAVAILABLE',
      capacityStatus: 'UNAVAILABLE',
      referralAcceptance: 'PAUSED',
      operationalNotes: 'Non-invasive echo only today; interventional cath lab not offered at this campus.',
      updatedAt: minutesAgo(55),
      updatedBy: 'user-coord-1',
      updatedByName: 'Ananya Hegde',
    },

    // Hospital 5: Tungabhadra Demo Ortho & Trauma Centre
    {
      id: 'hs-501',
      hospitalId: 'hosp-5',
      serviceId: 'svc-orthopedics',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Two modular orthopedic OTs ready; accepting fracture and polytrauma referrals.',
      updatedAt: minutesAgo(22),
      updatedBy: 'user-coord-1',
      updatedByName: 'Ramesh Gowda',
    },
    {
      id: 'hs-502',
      hospitalId: 'hosp-5',
      serviceId: 'svc-emergency',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: '24/7 trauma stabilization bay open on PB Road.',
      updatedAt: minutesAgo(34),
      updatedBy: 'user-coord-1',
      updatedByName: 'Ramesh Gowda',
    },
    {
      id: 'hs-503',
      hospitalId: 'hosp-5',
      serviceId: 'svc-radiology',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'PENDING_REVIEW',
      operationalNotes: 'Trauma CT prioritized; outpatient imaging referrals require scheduling check.',
      updatedAt: minutesAgo(65),
      updatedBy: 'user-coord-1',
      updatedByName: 'Ramesh Gowda',
    },

    // Hospital 6: Anjaneya Demo Children & Maternity Hospital
    {
      id: 'hs-601',
      hospitalId: 'hosp-6',
      serviceId: 'svc-pediatrics',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'NICU and PICU step-down units accepting referrals; pediatric intensivist on duty.',
      updatedAt: minutesAgo(17),
      updatedBy: 'user-coord-1',
      updatedByName: 'Meenakshi Kulkarni',
    },
    {
      id: 'hs-602',
      hospitalId: 'hosp-6',
      serviceId: 'svc-emergency',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'ACCEPTING',
      operationalNotes: 'Pediatric emergency stabilization active.',
      updatedAt: minutesAgo(42),
      updatedBy: 'user-coord-1',
      updatedByName: 'Meenakshi Kulkarni',
    },

    // Hospital 7: Karnatak Central Demo Renal & Surgical Care (Stale timestamps > 24h)
    {
      id: 'hs-701',
      hospitalId: 'hosp-7',
      serviceId: 'svc-dialysis',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'UNCONFIRMED',
      referralAcceptance: 'PENDING_REVIEW',
      operationalNotes: 'Status not updated in last 24h; phone verification mandatory before referral.',
      updatedAt: hoursAgo(29),
      updatedBy: 'user-coord-1',
      updatedByName: 'Prakash Shetty',
    },
    {
      id: 'hs-702',
      hospitalId: 'hosp-7',
      serviceId: 'svc-surgery',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'PENDING_REVIEW',
      operationalNotes: 'Surgical ward status update overdue; call desk to confirm.',
      updatedAt: hoursAgo(31),
      updatedBy: 'user-coord-1',
      updatedByName: 'Prakash Shetty',
    },

    // Hospital 8: Harihar Highway Demo Emergency Pavilion (Paused / Stale)
    {
      id: 'hs-801',
      hospitalId: 'hosp-8',
      serviceId: 'svc-emergency',
      serviceStatus: 'AVAILABLE',
      capacityStatus: 'UNAVAILABLE',
      referralAcceptance: 'PAUSED',
      operationalNotes: 'Resuscitation bay undergoing scheduled oxygen manifold maintenance.',
      updatedAt: hoursAgo(36),
      updatedBy: 'user-coord-1',
      updatedByName: 'Vikram Patil',
    },
  ];

  const referrals: Referral[] = [
    {
      id: 'ref-1001',
      referralReference: 'RLH-2026-4081',
      createdBy: 'user-doc-1',
      createdByName: 'Dr. Anitha Sharma',
      referringClinic: 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)',
      requiredServiceId: 'svc-cardiology',
      requiredServiceName: 'Interventional Cardiology & Cath Lab',
      requiredServiceCategory: 'Cardiology',
      receivingHospitalId: 'hosp-1',
      receivingHospitalName: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      receivingHospitalArea: 'PJ Extension',
      receivingHospitalContact: 'Desk: +91-8192-230101 · Direct Ext 402 (Fictional Demo)',
      preferredArea: 'PJ Extension',
      urgencyLabel: 'URGENT_TRANSFER',
      operationalConstraints: 'Requires continuous cardiac telemetry monitoring on arrival; family arranging ambulance transport within 35 minutes.',
      coordinationNotes: 'Synthetic case: 58yo adult with new-onset chest discomfort and serial ECG ST-T changes requiring interventional cardiology evaluation.',
      syntheticPatientRef: 'SYN-DVG-4081',
      status: 'PENDING',
      createdAt: minutesAgo(22),
      updatedAt: minutesAgo(22),
    },
    {
      id: 'ref-1002',
      referralReference: 'RLH-2026-4079',
      createdBy: 'user-doc-1',
      createdByName: 'Dr. Anitha Sharma',
      referringClinic: 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)',
      requiredServiceId: 'svc-neurology',
      requiredServiceName: 'Acute Stroke & Neuro-Critical Care',
      requiredServiceCategory: 'Neurology',
      receivingHospitalId: 'hosp-1',
      receivingHospitalName: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      receivingHospitalArea: 'PJ Extension',
      receivingHospitalContact: 'Desk: +91-8192-230101 · Direct Ext 402 (Fictional Demo)',
      preferredArea: 'PJ Extension',
      urgencyLabel: 'PRIORITY',
      operationalConstraints: 'Needs immediate CT neuroimaging review and neuro-stepdown observation.',
      coordinationNotes: 'Synthetic case: Transient speech slurring and right-arm weakness onset 90 minutes ago.',
      syntheticPatientRef: 'SYN-DVG-4079',
      status: 'MORE_INFO_NEEDED',
      createdAt: minutesAgo(75),
      updatedAt: minutesAgo(40),
    },
    {
      id: 'ref-1003',
      referralReference: 'RLH-2026-4074',
      createdBy: 'user-doc-1',
      createdByName: 'Dr. Anitha Sharma',
      referringClinic: 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)',
      requiredServiceId: 'svc-pediatrics',
      requiredServiceName: 'Neonatal & Pediatric Intensive Care (NICU/PICU)',
      requiredServiceCategory: 'Pediatrics',
      receivingHospitalId: 'hosp-1',
      receivingHospitalName: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      receivingHospitalArea: 'PJ Extension',
      receivingHospitalContact: 'Desk: +91-8192-230101 · Direct Ext 402 (Fictional Demo)',
      preferredArea: 'All Davangere',
      urgencyLabel: 'PRIORITY',
      operationalConstraints: 'Requires pediatric high-flow nasal cannula support and monitoring.',
      coordinationNotes: 'Initial request sent to Bapuji Regional Demo Medical Centre prior to pediatric ward reaching capacity.',
      syntheticPatientRef: 'SYN-DVG-4074',
      status: 'DECLINED',
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(2),
    },
    {
      id: 'ref-1004',
      referralReference: 'RLH-2026-4068',
      createdBy: 'user-doc-1',
      createdByName: 'Dr. Anitha Sharma',
      referringClinic: 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)',
      requiredServiceId: 'svc-radiology',
      requiredServiceName: '3T MRI & Contrast CT Diagnostic Imaging',
      requiredServiceCategory: 'Radiology',
      receivingHospitalId: 'hosp-4',
      receivingHospitalName: 'Vidyanagar Demo Clinical & Diagnostic Hospital (Fictional Demo)',
      receivingHospitalArea: 'Vidyanagar',
      receivingHospitalContact: 'Desk: +91-8192-262400 · Imaging Desk Ext 305 (Fictional Demo)',
      preferredArea: 'Vidyanagar',
      urgencyLabel: 'ROUTINE',
      operationalConstraints: 'Outpatient contrast MRI lumbar spine; serum creatinine report attached at clinic.',
      coordinationNotes: 'Patient able to travel independently to Vidyanagar campus.',
      syntheticPatientRef: 'SYN-DVG-4068',
      status: 'ACCEPTED',
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(4),
    },
    {
      id: 'ref-1005',
      referralReference: 'RLH-2026-4062',
      createdBy: 'user-doc-1',
      createdByName: 'Dr. Anitha Sharma',
      referringClinic: 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)',
      requiredServiceId: 'svc-orthopedics',
      requiredServiceName: 'Polytrauma & Orthopedic Fixation Surgery',
      requiredServiceCategory: 'Orthopedics',
      receivingHospitalId: 'hosp-5',
      receivingHospitalName: 'Tungabhadra Demo Ortho & Trauma Centre (Fictional Demo)',
      receivingHospitalArea: 'Nittuvalli',
      receivingHospitalContact: 'Desk: +91-8192-273500 · Trauma Coord Ext 112 (Fictional Demo)',
      preferredArea: 'Nittuvalli',
      urgencyLabel: 'PRIORITY',
      operationalConstraints: 'Splinted distal tibia fracture requiring surgical fixation review.',
      coordinationNotes: 'Pre-op labs completed at referring clinic.',
      syntheticPatientRef: 'SYN-DVG-4062',
      status: 'ACCEPTED',
      createdAt: hoursAgo(8),
      updatedAt: hoursAgo(7),
    },
    {
      id: 'ref-1006',
      referralReference: 'RLH-2026-4085',
      createdBy: 'user-doc-1',
      createdByName: 'Dr. Anitha Sharma',
      referringClinic: 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)',
      requiredServiceId: 'svc-radiology',
      requiredServiceName: '3T MRI & Contrast CT Diagnostic Imaging',
      requiredServiceCategory: 'Radiology',
      receivingHospitalId: 'hosp-1',
      receivingHospitalName: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      receivingHospitalArea: 'PJ Extension',
      receivingHospitalContact: 'Desk: +91-8192-230101 · Direct Ext 402 (Fictional Demo)',
      preferredArea: 'PJ Extension',
      urgencyLabel: 'PRIORITY',
      operationalConstraints: 'Requires urgent abdominal contrast CT slot this afternoon.',
      coordinationNotes: 'Synthetic case: Suspected acute appendicitis vs ureteric calculus evaluation.',
      syntheticPatientRef: 'SYN-DVG-4085',
      status: 'PENDING',
      createdAt: minutesAgo(14),
      updatedAt: minutesAgo(14),
    },
  ];

  const referralOptions: ReferralOption[] = [
    {
      id: 'opt-1',
      referralId: 'ref-1001',
      hospitalId: 'hosp-1',
      hospitalName: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      hospitalArea: 'PJ Extension',
      distanceKm: 1.6,
      distanceBand: '0–3 km (Central)',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      matchReasons: 'Required service listed · Capacity available · Accepting referrals · Preferred area match (PJ Extension) · Updated 11 min ago',
      optionStatus: 'PRIMARY_SELECTED',
      updatedAt: minutesAgo(11),
    },
    {
      id: 'opt-2',
      referralId: 'ref-1001',
      hospitalId: 'hosp-3',
      hospitalName: 'SS Narayana Demo Heart & Multispecialty Institute (Fictional Demo)',
      hospitalArea: 'Shamanur Road',
      distanceKm: 4.1,
      distanceBand: '3–6 km (Urban Ring)',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      matchReasons: 'Required service listed · Capacity available · Accepting referrals · 4.1 km (Shamanur Road) · Updated 16 min ago',
      optionStatus: 'ALTERNATIVE_STANDBY',
      updatedAt: minutesAgo(16),
    },
    {
      id: 'opt-3',
      referralId: 'ref-1001',
      hospitalId: 'hosp-2',
      hospitalName: 'Chigateri District Demo General Hospital (Fictional Demo)',
      hospitalArea: 'MCC B Block',
      distanceKm: 2.4,
      distanceBand: '0–3 km (Central)',
      capacityStatus: 'LIMITED',
      referralAcceptance: 'PENDING_REVIEW',
      matchReasons: 'Required service listed · Capacity limited · Referral acceptance pending review · 2.4 km (MCC B Block) · Updated 26 min ago',
      optionStatus: 'ALTERNATIVE_STANDBY',
      updatedAt: minutesAgo(26),
    },
    {
      id: 'opt-4',
      referralId: 'ref-1003',
      hospitalId: 'hosp-6',
      hospitalName: 'Anjaneya Demo Children & Maternity Hospital (Fictional Demo)',
      hospitalArea: 'Hadadi Road',
      distanceKm: 5.2,
      distanceBand: '3–6 km (Urban Ring)',
      capacityStatus: 'AVAILABLE',
      referralAcceptance: 'ACCEPTING',
      matchReasons: 'Required service listed · Capacity available · Accepting referrals · 5.2 km (Hadadi Road) · Updated 17 min ago',
      optionStatus: 'ALTERNATIVE_STANDBY',
      updatedAt: minutesAgo(17),
    },
  ];

  const referralResponses: ReferralResponse[] = [
    {
      id: 'resp-1',
      referralId: 'ref-1002',
      hospitalId: 'hosp-1',
      hospitalName: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      responseStatus: 'MORE_INFO_NEEDED',
      responseNote: 'Please confirm baseline blood pressure, capillary glucose reading, and exact symptom onset clock time so our stroke resident can prepare the CT bay.',
      respondedBy: 'user-coord-1',
      respondedByName: 'Suresh Kumar',
      respondedAt: minutesAgo(40),
    },
    {
      id: 'resp-2',
      referralId: 'ref-1003',
      hospitalId: 'hosp-1',
      hospitalName: 'Bapuji Regional Demo Medical Centre (Fictional Demo)',
      responseStatus: 'DECLINED',
      responseNote: 'Pediatric intensive care step-down beds reached full occupancy 30 minutes ago. Recommend redirecting immediately to Anjaneya Demo Children & Maternity Hospital (Hadadi Road), which reports Available capacity.',
      respondedBy: 'user-coord-1',
      respondedByName: 'Suresh Kumar',
      respondedAt: hoursAgo(2),
    },
    {
      id: 'resp-3',
      referralId: 'ref-1004',
      hospitalId: 'hosp-4',
      hospitalName: 'Vidyanagar Demo Clinical & Diagnostic Hospital (Fictional Demo)',
      responseStatus: 'ACCEPTED',
      responseNote: '3T MRI slot reserved for 15:30 today. Please instruct patient to bring clinic referral slip and recent serum creatinine result to Imaging Desk B.',
      respondedBy: 'user-coord-1',
      respondedByName: 'Ananya Hegde',
      respondedAt: hoursAgo(4),
    },
    {
      id: 'resp-4',
      referralId: 'ref-1005',
      hospitalId: 'hosp-5',
      hospitalName: 'Tungabhadra Demo Ortho & Trauma Centre (Fictional Demo)',
      responseStatus: 'ACCEPTED',
      responseNote: 'Orthopedic trauma team has reviewed referral notes. Triage Bay 2 alerted; please call +91-8192-273500 Ext 112 upon ambulance departure.',
      respondedBy: 'user-coord-1',
      respondedByName: 'Ramesh Gowda',
      respondedAt: hoursAgo(7),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      actorId: 'user-coord-1',
      actorName: 'Suresh Kumar',
      actorRole: 'HOSPITAL_COORDINATOR',
      entityType: 'HOSPITAL_SERVICE',
      entityId: 'hs-101',
      hospitalId: 'hosp-1',
      action: 'Updated Service Capacity & Acceptance (Interventional Cardiology & Cath Lab)',
      oldValue: 'Capacity: LIMITED · Acceptance: PENDING_REVIEW',
      newValue: 'Capacity: AVAILABLE · Acceptance: ACCEPTING',
      timestamp: minutesAgo(11),
    },
    {
      id: 'aud-2',
      actorId: 'user-doc-1',
      actorName: 'Dr. Anitha Sharma',
      actorRole: 'REFERRING_DOCTOR',
      entityType: 'REFERRAL',
      entityId: 'ref-1001',
      hospitalId: 'hosp-1',
      action: 'Created Referral Request RLH-2026-4081',
      oldValue: 'None',
      newValue: 'Status: PENDING · Target: Bapuji Regional Demo Medical Centre',
      timestamp: minutesAgo(22),
    },
    {
      id: 'aud-3',
      actorId: 'user-coord-1',
      actorName: 'Suresh Kumar',
      actorRole: 'HOSPITAL_COORDINATOR',
      entityType: 'HOSPITAL_SERVICE',
      entityId: 'hs-106',
      hospitalId: 'hosp-1',
      action: 'Updated Service Capacity (Neonatal & Pediatric Intensive Care)',
      oldValue: 'Capacity: LIMITED · Acceptance: PENDING_REVIEW',
      newValue: 'Capacity: UNAVAILABLE · Acceptance: PAUSED',
      timestamp: minutesAgo(31),
    },
    {
      id: 'aud-4',
      actorId: 'user-coord-1',
      actorName: 'Suresh Kumar',
      actorRole: 'HOSPITAL_COORDINATOR',
      entityType: 'REFERRAL',
      entityId: 'ref-1002',
      hospitalId: 'hosp-1',
      action: 'Requested Additional Information on RLH-2026-4079',
      oldValue: 'Status: PENDING',
      newValue: 'Status: MORE_INFO_NEEDED',
      timestamp: minutesAgo(40),
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      recipientRole: 'HOSPITAL_COORDINATOR',
      recipientHospitalId: 'hosp-1',
      type: 'NEW_REFERRAL',
      title: 'Urgent Referral Received · RLH-2026-4081',
      message: 'Dr. Anitha Sharma submitted an Urgent Transfer request for Interventional Cardiology & Cath Lab (Ref: SYN-DVG-4081).',
      referralId: 'ref-1001',
      hospitalId: 'hosp-1',
      read: false,
      createdAt: minutesAgo(22),
    },
    {
      id: 'notif-2',
      recipientRole: 'REFERRING_DOCTOR',
      recipientUserId: 'user-doc-1',
      type: 'MORE_INFO_REQUESTED',
      title: 'Additional Information Requested · RLH-2026-4079',
      message: 'Coordinator Suresh Kumar (Bapuji Regional Demo Medical Centre) requested baseline vitals and exact onset time for Acute Stroke referral.',
      referralId: 'ref-1002',
      hospitalId: 'hosp-1',
      read: false,
      createdAt: minutesAgo(40),
    },
    {
      id: 'notif-3',
      recipientRole: 'REFERRING_DOCTOR',
      recipientUserId: 'user-doc-1',
      type: 'REFERRAL_DECLINED',
      title: 'Referral Declined · Alternative Options Ready (RLH-2026-4074)',
      message: 'Bapuji Regional Demo Medical Centre declined NICU/PICU referral due to ward capacity. 1 matched alternative hospital (Anjaneya Demo Children Hospital) is available.',
      referralId: 'ref-1003',
      hospitalId: 'hosp-1',
      read: false,
      createdAt: hoursAgo(2),
    },
    {
      id: 'notif-4',
      recipientRole: 'REFERRING_DOCTOR',
      recipientUserId: 'user-doc-1',
      type: 'REFERRAL_ACCEPTED',
      title: 'Referral Accepted · RLH-2026-4068',
      message: 'Vidyanagar Demo Clinical & Diagnostic Hospital accepted 3T MRI referral for synthetic case SYN-DVG-4068.',
      referralId: 'ref-1004',
      hospitalId: 'hosp-4',
      read: true,
      createdAt: hoursAgo(4),
    },
    {
      id: 'notif-5',
      recipientRole: 'REFERRING_DOCTOR',
      type: 'CAPACITY_UPDATED',
      title: 'Capacity Updated · Bapuji Regional Demo Medical Centre',
      message: 'Interventional Cardiology & Cath Lab reported capacity updated to AVAILABLE (Accepting Referrals).',
      hospitalId: 'hosp-1',
      read: true,
      createdAt: minutesAgo(11),
    },
  ];

  return {
    users,
    hospitals,
    services,
    hospitalServices,
    referrals,
    referralOptions,
    referralResponses,
    auditLogs,
    notifications,
  };
}

class ReliefLedgerDatabase {
  private state: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.state = JSON.parse(raw) as DatabaseSchema;
      } catch {
        this.state = buildInitialSeed();
        this.save();
      }
    } else {
      this.state = buildInitialSeed();
      this.save();
    }
  }

  public save(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf8');
  }

  public resetToDemoSeed(): DatabaseSchema {
    this.state = buildInitialSeed();
    this.save();
    return this.state;
  }

  public getData(): DatabaseSchema {
    return this.state;
  }

  public getEnrichedHospitalServices(hospitalId?: string): EnrichedHospitalService[] {
    const servicesMap = new Map(this.state.services.map((s) => [s.id, s]));
    const filtered = hospitalId
      ? this.state.hospitalServices.filter((hs) => hs.hospitalId === hospitalId)
      : this.state.hospitalServices;

    return filtered.map((hs) => {
      const svc = servicesMap.get(hs.serviceId);
      return {
        ...hs,
        serviceName: svc?.name || 'Medical Service',
        serviceCategory: svc?.category || 'General',
        serviceDescription: svc?.description || '',
      };
    });
  }

  public getEnrichedHospitals(): EnrichedHospital[] {
    const allEnrichedServices = this.getEnrichedHospitalServices();
    return this.state.hospitals.map((h) => ({
      ...h,
      services: allEnrichedServices.filter((hs) => hs.hospitalId === h.id),
    }));
  }

  public getEnrichedReferral(referralId: string): Referral | undefined {
    const ref = this.state.referrals.find((r) => r.id === referralId);
    if (!ref) return undefined;

    const existingOptions = this.state.referralOptions.filter((o) => o.referralId === ref.id);
    // Also dynamically compute up-to-date matched alternatives using the 3-step engine
    const matchedOutput = matchAndRankHospitals(
      this.state.hospitals,
      this.getEnrichedHospitalServices(),
      {
        requiredServiceId: ref.requiredServiceId,
        preferredArea: ref.preferredArea,
      }
    );

    const dynamicOptions: ReferralOption[] = matchedOutput.matched.map((m) => ({
      id: `opt-${ref.id}-${m.hospital.id}`,
      referralId: ref.id,
      hospitalId: m.hospital.id,
      hospitalName: m.hospital.name,
      hospitalArea: m.hospital.area,
      distanceKm: m.hospital.distanceKm,
      distanceBand: m.hospital.distanceBand,
      capacityStatus: m.hospitalService.capacityStatus,
      referralAcceptance: m.hospitalService.referralAcceptance,
      matchReasons: m.matchReasons,
      optionStatus:
        m.hospital.id === ref.receivingHospitalId ? 'PRIMARY_SELECTED' : 'ALTERNATIVE_STANDBY',
      updatedAt: m.hospitalService.updatedAt,
    }));

    const responses = this.state.referralResponses
      .filter((resp) => resp.referralId === ref.id)
      .sort((a, b) => new Date(a.respondedAt).getTime() - new Date(b.respondedAt).getTime());

    return {
      ...ref,
      options: dynamicOptions.length > 0 ? dynamicOptions : existingOptions,
      responses,
    };
  }
}

export const dbStore = new ReliefLedgerDatabase();
