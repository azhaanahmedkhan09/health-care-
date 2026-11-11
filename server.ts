import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { dbStore, hashPassword, verifyPassword } from './src/server/database.ts';
import type { StoredUser } from './src/server/database.ts';
import {
  computeAnalyticsMetrics,
  matchAndRankHospitals,
  validateReferralInput,
} from './src/utils/matchingEngine.ts';
import type {
  CapacityStatus,
  HospitalAcceptanceStatus,
  ReferralOption,
  ReferralStatus,
  ServiceAcceptanceStatus,
  ServiceStatus,
  UrgencyLabel,
  User,
  UserRole,
} from './src/types/models.ts';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Simple HMAC-signed token management for session security
const TOKEN_SECRET = process.env.SESSION_SECRET || 'reliefledger_health_secure_hmac_secret_2026';

function signSessionToken(user: User): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifySessionToken(token: string): { id: string; role: UserRole; hospitalId?: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function sanitizeUser(u: StoredUser): User {
  const { passwordHash: _unused, ...safeUser } = u;
  return safeUser;
}

interface AuthenticatedRequest extends Request {
  currentUser?: User;
}

function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = verifySessionToken(token);
    if (verified) {
      const found = dbStore.getData().users.find((u) => u.id === verified.id);
      if (found) {
        req.currentUser = sanitizeUser(found);
      }
    }
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

function requireRole(role: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (req.currentUser.role !== role) {
      res.status(403).json({
        error: `Access denied. This action requires the ${role === 'REFERRING_DOCTOR' ? 'Referring Clinic / Doctor' : 'Receiving Hospital Coordinator'} role.`,
      });
      return;
    }
    next();
  };
}

app.use(attachUser);

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password, demoRole } = req.body as {
      email?: string;
      password?: string;
      demoRole?: UserRole;
    };

    const data = dbStore.getData();

    if (demoRole) {
      const demoUser =
        demoRole === 'HOSPITAL_COORDINATOR'
          ? data.users.find((u) => u.email === 'coordinator.demo@reliefledger.example')
          : data.users.find((u) => u.email === 'doctor.demo@reliefledger.example');

      if (!demoUser) {
        res.status(404).json({ error: 'Demo account not found.' });
        return;
      }
      const clean = sanitizeUser(demoUser);
      const token = signSessionToken(clean);
      res.json({ user: clean, token });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = data.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password. Try the demo login buttons below.' });
      return;
    }

    const clean = sanitizeUser(user);
    const token = signSessionToken(clean);
    res.json({ user: clean, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication service failed.' });
  }
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, role, organization, specialtyOrTitle, hospitalId, phone } =
      req.body as {
        name?: string;
        email?: string;
        password?: string;
        role?: UserRole;
        organization?: string;
        specialtyOrTitle?: string;
        hospitalId?: string;
        phone?: string;
      };

    if (!name || name.trim().length < 2) {
      res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'A valid professional email address is required.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (role !== 'REFERRING_DOCTOR' && role !== 'HOSPITAL_COORDINATOR') {
      res.status(400).json({ error: 'Please select a valid user role.' });
      return;
    }

    const data = dbStore.getData();
    const normalizedEmail = email.trim().toLowerCase();
    if (data.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const assignedHospitalId =
      role === 'HOSPITAL_COORDINATOR' ? hospitalId || 'hosp-1' : undefined;
    const matchedHospital = assignedHospitalId
      ? data.hospitals.find((h) => h.id === assignedHospitalId)
      : undefined;

    const newUserId = `user-${Date.now()}`;
    const newUser: StoredUser = {
      id: newUserId,
      uid: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role,
      organization:
        organization?.trim() ||
        (role === 'HOSPITAL_COORDINATOR'
          ? matchedHospital?.name || 'Bapuji Regional Demo Medical Centre (Fictional Demo)'
          : 'Davangere Regional Partner Clinic (Fictional Demo)'),
      specialtyOrTitle:
        specialtyOrTitle?.trim() ||
        (role === 'HOSPITAL_COORDINATOR' ? 'Receiving Hospital Coordinator' : 'Referring Physician'),
      hospitalId: assignedHospitalId,
      phone: phone?.trim() || '+91-8192-229900 (Demo)',
      avatarUrl:
        role === 'HOSPITAL_COORDINATOR'
          ? '/src/assets/images/avatar_hospital_coordinator_1794383298931.jpg'
          : '/src/assets/images/avatar_doctor_referrer_1794383297836.jpg',
      createdAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    dbStore.save();

    const clean = sanitizeUser(newUser);
    const token = signSessionToken(clean);
    res.status(201).json({ user: clean, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/firebase-sync', (req: Request, res: Response) => {
  try {
    const { uid, email, displayName, role } = req.body as {
      uid?: string;
      email?: string;
      displayName?: string;
      role?: UserRole;
    };

    if (!uid || !email) {
      res.status(400).json({ error: 'Firebase UID and email are required.' });
      return;
    }

    const data = dbStore.getData();
    let user = data.users.find(
      (u) => u.uid === uid || u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      const selectedRole: UserRole = role === 'HOSPITAL_COORDINATOR' ? 'HOSPITAL_COORDINATOR' : 'REFERRING_DOCTOR';
      user = {
        id: uid,
        uid,
        name: displayName || email.split('@')[0],
        email: email.toLowerCase(),
        passwordHash: hashPassword(crypto.randomUUID()),
        role: selectedRole,
        organization:
          selectedRole === 'HOSPITAL_COORDINATOR'
            ? 'Bapuji Regional Demo Medical Centre (Fictional Demo)'
            : 'Davangere Regional Partner Clinic (Fictional Demo)',
        specialtyOrTitle:
          selectedRole === 'HOSPITAL_COORDINATOR'
            ? 'Receiving Hospital Coordinator'
            : 'Referring Physician',
        hospitalId: selectedRole === 'HOSPITAL_COORDINATOR' ? 'hosp-1' : undefined,
        phone: '+91-8192-221100 (Demo)',
        avatarUrl:
          selectedRole === 'HOSPITAL_COORDINATOR'
            ? '/src/assets/images/avatar_hospital_coordinator_1794383298931.jpg'
            : '/src/assets/images/avatar_doctor_referrer_1794383297836.jpg',
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      dbStore.save();
    }

    const clean = sanitizeUser(user);
    const token = signSessionToken(clean);
    res.json({ user: clean, token });
  } catch (error) {
    console.error('Firebase sync error:', error);
    res.status(500).json({ error: 'Failed to synchronize Firebase account.' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.currentUser });
});

// ============================================================================
// SERVICES & HOSPITALS ENDPOINTS
// ============================================================================

app.get('/api/services', (_req: Request, res: Response) => {
  res.json({ services: dbStore.getData().services });
});

app.get('/api/hospitals', (req: Request, res: Response) => {
  try {
    const {
      search,
      area,
      specialty,
      serviceId,
      capacityStatus,
      referralAcceptance,
      sortBy,
    } = req.query as Record<string, string | undefined>;

    let hospitals = dbStore.getEnrichedHospitals();

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      hospitals = hospitals.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.area.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          h.specialties.some((s) => s.toLowerCase().includes(q)) ||
          h.services.some((svc) => svc.serviceName.toLowerCase().includes(q))
      );
    }

    if (area && area !== 'ALL') {
      hospitals = hospitals.filter((h) => h.area.toLowerCase() === area.toLowerCase());
    }

    if (specialty && specialty !== 'ALL') {
      hospitals = hospitals.filter(
        (h) =>
          h.specialties.some((s) => s.toLowerCase() === specialty.toLowerCase()) ||
          h.services.some((svc) => svc.serviceCategory.toLowerCase() === specialty.toLowerCase())
      );
    }

    if (serviceId && serviceId !== 'ALL') {
      hospitals = hospitals.filter((h) =>
        h.services.some((svc) => svc.serviceId === serviceId)
      );
    }

    if (capacityStatus && capacityStatus !== 'ALL') {
      hospitals = hospitals.filter((h) => {
        if (serviceId && serviceId !== 'ALL') {
          return h.services.some(
            (svc) => svc.serviceId === serviceId && svc.capacityStatus === capacityStatus
          );
        }
        return h.services.some((svc) => svc.capacityStatus === capacityStatus);
      });
    }

    if (referralAcceptance && referralAcceptance !== 'ALL') {
      hospitals = hospitals.filter((h) => h.referralAcceptance === referralAcceptance);
    }

    if (sortBy === 'distance') {
      hospitals.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'freshness') {
      hospitals.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } else if (sortBy === 'name') {
      hospitals.sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({ hospitals });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ error: 'Failed to load hospital records.' });
  }
});

app.get('/api/hospitals/:id', (req: Request, res: Response) => {
  const hospital = dbStore
    .getEnrichedHospitals()
    .find((h) => h.id === req.params.id);

  if (!hospital) {
    res.status(404).json({ error: 'Hospital not found.' });
    return;
  }

  const auditHistory = dbStore
    .getData()
    .auditLogs.filter((log) => log.hospitalId === hospital.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  res.json({ hospital, auditHistory });
});

app.patch(
  '/api/hospitals/:id',
  requireRole('HOSPITAL_COORDINATOR'),
  (req: AuthenticatedRequest, res: Response) => {
    const data = dbStore.getData();
    const hospital = data.hospitals.find((h) => h.id === req.params.id);
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    const { contactInformation, emergencyDeskPhone, referralAcceptance, activeStatus, coordinatorName } =
      req.body as {
        contactInformation?: string;
        emergencyDeskPhone?: string;
        referralAcceptance?: HospitalAcceptanceStatus;
        activeStatus?: boolean;
        coordinatorName?: string;
      };

    const oldSummary = `Acceptance: ${hospital.referralAcceptance} · Active: ${hospital.activeStatus}`;

    if (typeof contactInformation === 'string' && contactInformation.trim()) {
      hospital.contactInformation = contactInformation.trim();
    }
    if (typeof emergencyDeskPhone === 'string' && emergencyDeskPhone.trim()) {
      hospital.emergencyDeskPhone = emergencyDeskPhone.trim();
    }
    if (
      referralAcceptance &&
      ['ACCEPTING', 'LIMITED_REVIEW', 'NOT_ACCEPTING'].includes(referralAcceptance)
    ) {
      hospital.referralAcceptance = referralAcceptance;
    }
    if (typeof activeStatus === 'boolean') {
      hospital.activeStatus = activeStatus;
    }
    if (typeof coordinatorName === 'string' && coordinatorName.trim()) {
      hospital.coordinatorName = coordinatorName.trim();
    }
    hospital.updatedAt = new Date().toISOString();

    const newSummary = `Acceptance: ${hospital.referralAcceptance} · Active: ${hospital.activeStatus}`;
    const auditEntry = {
      id: `aud-${Date.now()}`,
      actorId: req.currentUser!.id,
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      entityType: 'HOSPITAL' as const,
      entityId: hospital.id,
      hospitalId: hospital.id,
      action: `Updated Hospital Profile (${hospital.name})`,
      oldValue: oldSummary,
      newValue: newSummary,
      timestamp: hospital.updatedAt,
    };
    data.auditLogs.unshift(auditEntry);
    dbStore.save();

    res.json({
      hospital: dbStore.getEnrichedHospitals().find((h) => h.id === hospital.id),
      auditLog: auditEntry,
    });
  }
);

app.get('/api/hospitals/:id/services', (req: Request, res: Response) => {
  const services = dbStore.getEnrichedHospitalServices(req.params.id);
  res.json({ services });
});

app.post(
  '/api/hospitals/:id/services',
  requireRole('HOSPITAL_COORDINATOR'),
  (req: AuthenticatedRequest, res: Response) => {
    const data = dbStore.getData();
    const hospital = data.hospitals.find((h) => h.id === req.params.id);
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    const { serviceId, serviceStatus, capacityStatus, referralAcceptance, operationalNotes } =
      req.body as {
        serviceId?: string;
        serviceStatus?: ServiceStatus;
        capacityStatus?: CapacityStatus;
        referralAcceptance?: ServiceAcceptanceStatus;
        operationalNotes?: string;
      };

    const serviceCatalogItem = data.services.find((s) => s.id === serviceId);
    if (!serviceCatalogItem) {
      res.status(400).json({ error: 'Valid medical service must be selected.' });
      return;
    }

    const existing = data.hospitalServices.find(
      (hs) => hs.hospitalId === hospital.id && hs.serviceId === serviceId
    );
    if (existing) {
      res.status(409).json({
        error: `${serviceCatalogItem.name} is already listed for this hospital. Edit the existing service record instead.`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newHs = {
      id: `hs-${Date.now()}`,
      hospitalId: hospital.id,
      serviceId: serviceCatalogItem.id,
      serviceStatus: serviceStatus || ('AVAILABLE' as ServiceStatus),
      capacityStatus: capacityStatus || ('AVAILABLE' as CapacityStatus),
      referralAcceptance: referralAcceptance || ('ACCEPTING' as ServiceAcceptanceStatus),
      operationalNotes: operationalNotes?.trim() || 'Added by hospital coordinator.',
      updatedAt: nowIso,
      updatedBy: req.currentUser!.id,
      updatedByName: req.currentUser!.name,
    };

    data.hospitalServices.push(newHs);
    if (!hospital.specialties.includes(serviceCatalogItem.category)) {
      hospital.specialties.push(serviceCatalogItem.category);
    }
    hospital.updatedAt = nowIso;

    const auditEntry = {
      id: `aud-${Date.now()}`,
      actorId: req.currentUser!.id,
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      entityType: 'HOSPITAL_SERVICE' as const,
      entityId: newHs.id,
      hospitalId: hospital.id,
      action: `Added Service (${serviceCatalogItem.name})`,
      oldValue: 'Not Listed',
      newValue: `Service: ${newHs.serviceStatus} · Capacity: ${newHs.capacityStatus} · Acceptance: ${newHs.referralAcceptance}`,
      timestamp: nowIso,
    };
    data.auditLogs.unshift(auditEntry);
    dbStore.save();

    res.status(201).json({
      services: dbStore.getEnrichedHospitalServices(hospital.id),
      auditLog: auditEntry,
    });
  }
);

app.patch(
  '/api/hospitals/:id/services/:serviceId',
  requireRole('HOSPITAL_COORDINATOR'),
  (req: AuthenticatedRequest, res: Response) => {
    const data = dbStore.getData();
    const hospital = data.hospitals.find((h) => h.id === req.params.id);
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    const hs = data.hospitalServices.find(
      (item) =>
        item.hospitalId === hospital.id &&
        (item.serviceId === req.params.serviceId || item.id === req.params.serviceId)
    );
    if (!hs) {
      res.status(404).json({ error: 'Hospital service record not found.' });
      return;
    }

    const svcMeta = data.services.find((s) => s.id === hs.serviceId);
    const oldSummary = `Service: ${hs.serviceStatus} · Capacity: ${hs.capacityStatus} · Acceptance: ${hs.referralAcceptance}`;

    const { serviceStatus, capacityStatus, referralAcceptance, operationalNotes } = req.body as {
      serviceStatus?: ServiceStatus;
      capacityStatus?: CapacityStatus;
      referralAcceptance?: ServiceAcceptanceStatus;
      operationalNotes?: string;
    };

    if (serviceStatus && ['AVAILABLE', 'UNAVAILABLE'].includes(serviceStatus)) {
      hs.serviceStatus = serviceStatus;
    }
    if (
      capacityStatus &&
      ['AVAILABLE', 'LIMITED', 'UNCONFIRMED', 'UNAVAILABLE'].includes(capacityStatus)
    ) {
      hs.capacityStatus = capacityStatus;
    }
    if (
      referralAcceptance &&
      ['ACCEPTING', 'PENDING_REVIEW', 'PAUSED'].includes(referralAcceptance)
    ) {
      hs.referralAcceptance = referralAcceptance;
    }
    if (typeof operationalNotes === 'string') {
      hs.operationalNotes = operationalNotes.trim();
    }

    const nowIso = new Date().toISOString();
    hs.updatedAt = nowIso;
    hs.updatedBy = req.currentUser!.id;
    hs.updatedByName = req.currentUser!.name;
    hospital.updatedAt = nowIso;

    const newSummary = `Service: ${hs.serviceStatus} · Capacity: ${hs.capacityStatus} · Acceptance: ${hs.referralAcceptance}`;

    const auditEntry = {
      id: `aud-${Date.now()}`,
      actorId: req.currentUser!.id,
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      entityType: 'HOSPITAL_SERVICE' as const,
      entityId: hs.id,
      hospitalId: hospital.id,
      action: `Updated Capacity & Status (${svcMeta?.name || hs.serviceId})`,
      oldValue: oldSummary,
      newValue: newSummary,
      timestamp: nowIso,
    };
    data.auditLogs.unshift(auditEntry);

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientRole: 'REFERRING_DOCTOR',
      type: 'CAPACITY_UPDATED',
      title: `Capacity Updated · ${hospital.name}`,
      message: `${svcMeta?.name || 'Service'} updated to Capacity: ${hs.capacityStatus} (${hs.referralAcceptance}) by ${req.currentUser!.name}.`,
      hospitalId: hospital.id,
      read: false,
      createdAt: nowIso,
    });

    dbStore.save();

    res.json({
      service: dbStore
        .getEnrichedHospitalServices(hospital.id)
        .find((item) => item.id === hs.id),
      services: dbStore.getEnrichedHospitalServices(hospital.id),
      auditLog: auditEntry,
    });
  }
);

app.delete(
  '/api/hospitals/:id/services/:serviceId',
  requireRole('HOSPITAL_COORDINATOR'),
  (req: AuthenticatedRequest, res: Response) => {
    const data = dbStore.getData();
    const idx = data.hospitalServices.findIndex(
      (item) =>
        item.hospitalId === req.params.id &&
        (item.serviceId === req.params.serviceId || item.id === req.params.serviceId)
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Service not found on hospital profile.' });
      return;
    }

    const removed = data.hospitalServices[idx];
    const svcMeta = data.services.find((s) => s.id === removed.serviceId);
    data.hospitalServices.splice(idx, 1);

    const nowIso = new Date().toISOString();
    const auditEntry = {
      id: `aud-${Date.now()}`,
      actorId: req.currentUser!.id,
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      entityType: 'HOSPITAL_SERVICE' as const,
      entityId: removed.id,
      hospitalId: req.params.id,
      action: `Removed Service (${svcMeta?.name || removed.serviceId})`,
      oldValue: `Capacity: ${removed.capacityStatus}`,
      newValue: 'Removed from Hospital Catalogue',
      timestamp: nowIso,
    };
    data.auditLogs.unshift(auditEntry);
    dbStore.save();

    res.json({
      services: dbStore.getEnrichedHospitalServices(req.params.id),
      auditLog: auditEntry,
    });
  }
);

// ============================================================================
// MATCHING & REFERRALS ENDPOINTS
// ============================================================================

app.post('/api/referrals/match', (req: Request, res: Response) => {
  const { requiredServiceId, preferredArea, strictAreaFilter } = req.body as {
    requiredServiceId?: string;
    preferredArea?: string;
    strictAreaFilter?: boolean;
  };

  if (!requiredServiceId) {
    res.status(400).json({ error: 'Required medical service ID is required for matching.' });
    return;
  }

  const output = matchAndRankHospitals(
    dbStore.getData().hospitals,
    dbStore.getEnrichedHospitalServices(),
    {
      requiredServiceId,
      preferredArea,
      strictAreaFilter: Boolean(strictAreaFilter),
    }
  );

  res.json(output);
});

app.get('/api/referrals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = dbStore.getData();
  const { hospitalId, status } = req.query as { hospitalId?: string; status?: string };

  let list = data.referrals.map((r) => dbStore.getEnrichedReferral(r.id)!);

  if (hospitalId) {
    list = list.filter((r) => r.receivingHospitalId === hospitalId);
  }
  if (status && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ referrals: list });
});

app.post(
  '/api/referrals',
  requireRole('REFERRING_DOCTOR'),
  (req: AuthenticatedRequest, res: Response) => {
    const input = req.body as {
      requiredServiceId?: string;
      receivingHospitalId?: string;
      preferredArea?: string;
      urgencyLabel?: UrgencyLabel;
      referringClinic?: string;
      operationalConstraints?: string;
      coordinationNotes?: string;
      syntheticPatientRef?: string;
    };

    const validation = validateReferralInput(input);
    if (!validation.valid) {
      res.status(400).json({
        error: Object.values(validation.errors)[0] || 'Invalid referral form submission.',
        fieldErrors: validation.errors,
      });
      return;
    }

    const data = dbStore.getData();
    const service = data.services.find((s) => s.id === input.requiredServiceId);
    const hospital = data.hospitals.find((h) => h.id === input.receivingHospitalId);

    if (!service || !hospital) {
      res.status(400).json({ error: 'Selected medical service or receiving hospital not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const randomSuffix = Math.floor(4100 + Math.random() * 5800);
    const referralId = `ref-${Date.now()}`;
    const referralReference = `RLH-2026-${randomSuffix}`;

    const newReferral = {
      id: referralId,
      referralReference,
      createdBy: req.currentUser!.id,
      createdByName: req.currentUser!.name,
      referringClinic: input.referringClinic!.trim(),
      requiredServiceId: service.id,
      requiredServiceName: service.name,
      requiredServiceCategory: service.category,
      receivingHospitalId: hospital.id,
      receivingHospitalName: hospital.name,
      receivingHospitalArea: hospital.area,
      receivingHospitalContact: hospital.contactInformation,
      preferredArea: input.preferredArea!.trim(),
      urgencyLabel: input.urgencyLabel!,
      operationalConstraints: input.operationalConstraints?.trim() || 'Standard clinical transfer protocol.',
      coordinationNotes: input.coordinationNotes?.trim() || '',
      syntheticPatientRef: input.syntheticPatientRef!.trim().toUpperCase(),
      status: 'PENDING' as ReferralStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    data.referrals.unshift(newReferral);

    // Compute and store matched options
    const matchOutput = matchAndRankHospitals(
      data.hospitals,
      dbStore.getEnrichedHospitalServices(),
      {
        requiredServiceId: service.id,
        preferredArea: input.preferredArea,
      }
    );

    const options: ReferralOption[] = matchOutput.matched.map((m, idx) => ({
      id: `opt-${Date.now()}-${idx}`,
      referralId: newReferral.id,
      hospitalId: m.hospital.id,
      hospitalName: m.hospital.name,
      hospitalArea: m.hospital.area,
      distanceKm: m.hospital.distanceKm,
      distanceBand: m.hospital.distanceBand,
      capacityStatus: m.hospitalService.capacityStatus,
      referralAcceptance: m.hospitalService.referralAcceptance,
      matchReasons: m.matchReasons,
      optionStatus:
        m.hospital.id === hospital.id ? 'PRIMARY_SELECTED' : 'ALTERNATIVE_STANDBY',
      updatedAt: m.hospitalService.updatedAt,
    }));

    data.referralOptions.push(...options);

    // Create audit log
    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: req.currentUser!.id,
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      entityType: 'REFERRAL',
      entityId: newReferral.id,
      hospitalId: hospital.id,
      action: `Created Referral ${referralReference} (${service.name})`,
      oldValue: 'None',
      newValue: `Status: PENDING · Target: ${hospital.name}`,
      timestamp: nowIso,
    });

    // Notify receiving hospital coordinator
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientRole: 'HOSPITAL_COORDINATOR',
      recipientHospitalId: hospital.id,
      type: 'NEW_REFERRAL',
      title: `New Referral Request · ${referralReference}`,
      message: `${req.currentUser!.name} (${newReferral.referringClinic}) requested ${service.name} for synthetic ref ${newReferral.syntheticPatientRef}.`,
      referralId: newReferral.id,
      hospitalId: hospital.id,
      read: false,
      createdAt: nowIso,
    });

    dbStore.save();

    res.status(201).json({
      referral: dbStore.getEnrichedReferral(newReferral.id),
      matchOutput,
    });
  }
);

app.get('/api/referrals/:id', requireAuth, (req: Request, res: Response) => {
  const enriched = dbStore.getEnrichedReferral(req.params.id);
  if (!enriched) {
    res.status(404).json({ error: 'Referral not found.' });
    return;
  }
  res.json({ referral: enriched });
});

app.get('/api/referrals/:id/options', requireAuth, (req: Request, res: Response) => {
  const enriched = dbStore.getEnrichedReferral(req.params.id);
  if (!enriched) {
    res.status(404).json({ error: 'Referral not found.' });
    return;
  }
  const matchOutput = matchAndRankHospitals(
    dbStore.getData().hospitals,
    dbStore.getEnrichedHospitalServices(),
    {
      requiredServiceId: enriched.requiredServiceId,
      preferredArea: enriched.preferredArea,
    }
  );
  res.json({
    options: enriched.options || [],
    matched: matchOutput.matched,
    excluded: matchOutput.excluded,
  });
});

app.get('/api/referrals/:id/timeline', requireAuth, (req: Request, res: Response) => {
  const enriched = dbStore.getEnrichedReferral(req.params.id);
  if (!enriched) {
    res.status(404).json({ error: 'Referral not found.' });
    return;
  }

  const data = dbStore.getData();
  const auditEvents = data.auditLogs.filter((a) => a.entityId === enriched.id);

  const timeline = [
    {
      id: `tl-create-${enriched.id}`,
      type: 'CREATED',
      status: 'PENDING',
      title: `Referral ${enriched.referralReference} Created`,
      description: `Submitted by ${enriched.createdByName} (${enriched.referringClinic}) for ${enriched.requiredServiceName} → ${enriched.receivingHospitalName}.`,
      actorName: enriched.createdByName,
      timestamp: enriched.createdAt,
    },
    ...(enriched.responses || []).map((resp) => ({
      id: resp.id,
      type: 'RESPONSE',
      status: resp.responseStatus,
      title:
        resp.responseStatus === 'ACCEPTED'
          ? `Referral Accepted by ${resp.hospitalName}`
          : resp.responseStatus === 'DECLINED'
            ? `Referral Declined by ${resp.hospitalName}`
            : resp.responseStatus === 'MORE_INFO_NEEDED'
              ? `Additional Information Requested by ${resp.hospitalName}`
              : `Coordination Update on ${enriched.referralReference}`,
      description: resp.responseNote,
      actorName: resp.respondedByName,
      timestamp: resp.respondedAt,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json({ referral: enriched, timeline, auditEvents });
});

app.post(
  '/api/referrals/:id/responses',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const data = dbStore.getData();
    const referral = data.referrals.find((r) => r.id === req.params.id);
    if (!referral) {
      res.status(404).json({ error: 'Referral not found.' });
      return;
    }

    const { responseStatus, responseNote } = req.body as {
      responseStatus?: ReferralStatus;
      responseNote?: string;
    };

    if (
      !responseStatus ||
      !['ACCEPTED', 'DECLINED', 'MORE_INFO_NEEDED', 'PENDING'].includes(responseStatus)
    ) {
      res.status(400).json({ error: 'Valid response status is required.' });
      return;
    }

    if (!responseNote || responseNote.trim().length < 3) {
      res.status(400).json({
        error: 'Please provide a clear coordination note (minimum 3 characters).',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const previousStatus = referral.status;
    referral.status = responseStatus;
    referral.updatedAt = nowIso;

    const hospital = data.hospitals.find((h) => h.id === referral.receivingHospitalId);

    const newResponse = {
      id: `resp-${Date.now()}`,
      referralId: referral.id,
      hospitalId: referral.receivingHospitalId,
      hospitalName: hospital?.name || referral.receivingHospitalName,
      responseStatus,
      responseNote: responseNote.trim(),
      respondedBy: req.currentUser!.id,
      respondedByName: req.currentUser!.name,
      respondedAt: nowIso,
    };

    data.referralResponses.push(newResponse);

    const auditEntry = {
      id: `aud-${Date.now()}`,
      actorId: req.currentUser!.id,
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      entityType: 'REFERRAL' as const,
      entityId: referral.id,
      hospitalId: referral.receivingHospitalId,
      action: `Referral ${referral.referralReference} Response: ${responseStatus}`,
      oldValue: `Status: ${previousStatus}`,
      newValue: `Status: ${responseStatus} · Note: ${responseNote.trim().slice(0, 120)}`,
      timestamp: nowIso,
    };
    data.auditLogs.unshift(auditEntry);

    const notifType =
      responseStatus === 'ACCEPTED'
        ? 'REFERRAL_ACCEPTED'
        : responseStatus === 'DECLINED'
          ? 'REFERRAL_DECLINED'
          : responseStatus === 'MORE_INFO_NEEDED'
            ? 'MORE_INFO_REQUESTED'
            : 'STATUS_CHANGED';

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientRole:
        req.currentUser!.role === 'HOSPITAL_COORDINATOR'
          ? 'REFERRING_DOCTOR'
          : 'HOSPITAL_COORDINATOR',
      recipientUserId:
        req.currentUser!.role === 'HOSPITAL_COORDINATOR' ? referral.createdBy : undefined,
      recipientHospitalId:
        req.currentUser!.role === 'REFERRING_DOCTOR' ? referral.receivingHospitalId : undefined,
      type: notifType,
      title: `Referral ${responseStatus.replace(/_/g, ' ')} · ${referral.referralReference}`,
      message: `${req.currentUser!.name}: "${responseNote.trim()}"`,
      referralId: referral.id,
      hospitalId: referral.receivingHospitalId,
      read: false,
      createdAt: nowIso,
    });

    dbStore.save();

    res.status(201).json({
      referral: dbStore.getEnrichedReferral(referral.id),
      response: newResponse,
      auditLog: auditEntry,
    });
  }
);

app.post(
  '/api/referrals/:id/reassign',
  requireRole('REFERRING_DOCTOR'),
  (req: AuthenticatedRequest, res: Response) => {
    const data = dbStore.getData();
    const referral = data.referrals.find((r) => r.id === req.params.id);
    if (!referral) {
      res.status(404).json({ error: 'Referral not found.' });
      return;
    }

    const { newHospitalId, note } = req.body as { newHospitalId?: string; note?: string };
    const newHospital = data.hospitals.find((h) => h.id === newHospitalId);
    if (!newHospital) {
      res.status(400).json({ error: 'Selected alternative hospital not found.' });
      return;
    }

    const oldHospitalName = referral.receivingHospitalName;
    const oldStatus = referral.status;
    const nowIso = new Date().toISOString();

    referral.receivingHospitalId = newHospital.id;
    referral.receivingHospitalName = newHospital.name;
    referral.receivingHospitalArea = newHospital.area;
    referral.receivingHospitalContact = newHospital.contactInformation;
    referral.status = 'PENDING';
    referral.updatedAt = nowIso;

    data.referralResponses.push({
      id: `resp-${Date.now()}`,
      referralId: referral.id,
      hospitalId: newHospital.id,
      hospitalName: newHospital.name,
      responseStatus: 'PENDING',
      responseNote:
        note?.trim() ||
        `Redirected referral from ${oldHospitalName} to ${newHospital.name} using matched alternative workflow.`,
      respondedBy: req.currentUser!.id,
      respondedByName: req.currentUser!.name,
      respondedAt: nowIso,
    });

    data.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actorId: req.currentUser!.id,
      actorName: req.currentUser!.name,
      actorRole: req.currentUser!.role,
      entityType: 'REFERRAL',
      entityId: referral.id,
      hospitalId: newHospital.id,
      action: `Redirected Referral ${referral.referralReference} to Alternative Hospital`,
      oldValue: `Hospital: ${oldHospitalName} · Status: ${oldStatus}`,
      newValue: `Hospital: ${newHospital.name} · Status: PENDING`,
      timestamp: nowIso,
    });

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientRole: 'HOSPITAL_COORDINATOR',
      recipientHospitalId: newHospital.id,
      type: 'NEW_REFERRAL',
      title: `Redirected Referral Received · ${referral.referralReference}`,
      message: `${req.currentUser!.name} redirected ${referral.requiredServiceName} request (${referral.syntheticPatientRef}) to ${newHospital.name}.`,
      referralId: referral.id,
      hospitalId: newHospital.id,
      read: false,
      createdAt: nowIso,
    });

    dbStore.save();

    res.json({ referral: dbStore.getEnrichedReferral(referral.id) });
  }
);

// ============================================================================
// DASHBOARD, NOTIFICATIONS, AUDIT LOGS & ANALYTICS ENDPOINTS
// ============================================================================

app.get('/api/dashboard/referrer', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const data = dbStore.getData();
  const referrals = data.referrals
    .map((r) => dbStore.getEnrichedReferral(r.id)!)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    totalReferrals: referrals.length,
    pendingReferrals: referrals.filter((r) => r.status === 'PENDING').length,
    acceptedReferrals: referrals.filter((r) => r.status === 'ACCEPTED').length,
    declinedReferrals: referrals.filter((r) => r.status === 'DECLINED').length,
    moreInfoReferrals: referrals.filter((r) => r.status === 'MORE_INFO_NEEDED').length,
  };

  const recentActivity = data.auditLogs.slice(0, 10);
  res.json({ stats, referrals, recentActivity });
});

app.get('/api/dashboard/coordinator', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = dbStore.getData();
  const hospitalId =
    (req.query.hospitalId as string) || req.currentUser?.hospitalId || 'hosp-1';

  const hospital = dbStore.getEnrichedHospitals().find((h) => h.id === hospitalId);
  const incomingReferrals = data.referrals
    .filter((r) => r.receivingHospitalId === hospitalId)
    .map((r) => dbStore.getEnrichedReferral(r.id)!)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    totalIncoming: incomingReferrals.length,
    pendingRequests: incomingReferrals.filter((r) => r.status === 'PENDING').length,
    acceptedReferrals: incomingReferrals.filter((r) => r.status === 'ACCEPTED').length,
    declinedReferrals: incomingReferrals.filter((r) => r.status === 'DECLINED').length,
    moreInfoNeeded: incomingReferrals.filter((r) => r.status === 'MORE_INFO_NEEDED').length,
  };

  const recentUpdates = data.auditLogs
    .filter((log) => !log.hospitalId || log.hospitalId === hospitalId)
    .slice(0, 12);

  res.json({
    hospital,
    stats,
    incomingReferrals,
    services: dbStore.getEnrichedHospitalServices(hospitalId),
    recentUpdates,
  });
});

app.get('/api/analytics', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  const data = dbStore.getData();
  const metrics = computeAnalyticsMetrics(
    data.referrals,
    data.referralResponses,
    dbStore.getEnrichedHospitalServices(),
    data.services
  );
  res.json({ analytics: metrics });
});

app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = dbStore.getData();
  const role = req.currentUser!.role;
  const filtered = data.notifications.filter((n) => !n.recipientRole || n.recipientRole === role);
  res.json({ notifications: filtered });
});

app.post('/api/notifications/mark-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id, all } = req.body as { id?: string; all?: boolean };
  const data = dbStore.getData();
  const role = req.currentUser!.role;

  for (const notif of data.notifications) {
    if (all && (!notif.recipientRole || notif.recipientRole === role)) {
      notif.read = true;
    } else if (id && notif.id === id) {
      notif.read = true;
    }
  }
  dbStore.save();
  const filtered = data.notifications.filter((n) => !n.recipientRole || n.recipientRole === role);
  res.json({ notifications: filtered });
});

app.get('/api/audit-logs', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ auditLogs: dbStore.getData().auditLogs.slice(0, 40) });
});

// ============================================================================
// SERVER INITIALIZATION (VITE MIDDLEWARE IN DEV / STATIC DIST IN PROD)
// ============================================================================

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReliefLedger Health Server listening on http://localhost:${PORT}`);
  });
}

startServer();
