import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type {
  AuditLog,
  CapacityStatus,
  EnrichedHospital,
  EnrichedHospitalService,
  HospitalAcceptanceStatus,
  ServiceAcceptanceStatus,
  ServiceStatus,
} from '../types/models';
import {
  AcceptanceIndicator,
  CapacityIndicator,
  FreshnessTimestamp,
} from '../components/StatusIndicators';

export const ServiceCapacityManagementPage: React.FC = () => {
  const {
    user,
    hospitals,
    services: allCatalogServices,
    refreshCoreData,
    addToast,
    recordAuditToCloud,
  } = useApp();

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    user?.hospitalId || 'hosp-1'
  );
  const [hospital, setHospital] = useState<EnrichedHospital | null>(null);
  const [hospitalServices, setHospitalServices] = useState<EnrichedHospitalService[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditLog[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Hospital Profile Form State
  const [hospitalAcceptance, setHospitalAcceptance] =
    useState<HospitalAcceptanceStatus>('ACCEPTING');
  const [hospitalContact, setHospitalContact] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Add New Service Form State
  const [newServiceId, setNewServiceId] = useState<string>('');
  const [newCapacityStatus, setNewCapacityStatus] = useState<CapacityStatus>('AVAILABLE');
  const [newAcceptance, setNewAcceptance] = useState<ServiceAcceptanceStatus>('ACCEPTING');
  const [newNotes, setNewNotes] = useState<string>(
    'Specialist team on-site; call referral desk prior to transfer.'
  );
  const [addingService, setAddingService] = useState(false);

  const loadHospitalServicesAndAudit = useCallback(async () => {
    try {
      const res = await api.getHospitalById(selectedHospitalId);
      setHospital(res.hospital);
      setHospitalServices(res.hospital.services);
      setAuditHistory(res.auditHistory);
      setHospitalAcceptance(res.hospital.referralAcceptance);
      setHospitalContact(res.hospital.contactInformation);
    } catch (err) {
      console.error('Error loading hospital services:', err);
    }
  }, [selectedHospitalId]);

  useEffect(() => {
    loadHospitalServicesAndAudit();
  }, [loadHospitalServicesAndAudit]);

  const unlistedCatalogServices = allCatalogServices.filter(
    (cat) => !hospitalServices.some((hs) => hs.serviceId === cat.id)
  );

  useEffect(() => {
    if (unlistedCatalogServices.length > 0 && !newServiceId) {
      setNewServiceId(unlistedCatalogServices[0].id);
    }
  }, [unlistedCatalogServices, newServiceId]);

  const handleSaveHospitalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateHospitalProfile(selectedHospitalId, {
        referralAcceptance: hospitalAcceptance,
        contactInformation: hospitalContact,
      });
      await loadHospitalServicesAndAudit();
      await refreshCoreData();
      await recordAuditToCloud({
        id: res.auditLog.id,
        entityType: 'HOSPITAL',
        entityId: selectedHospitalId,
        action: res.auditLog.action,
        oldValue: res.auditLog.oldValue,
        newValue: res.auditLog.newValue,
      });

      addToast({
        type: 'success',
        title: 'Hospital Profile Updated',
        message: `${res.hospital.name} referral status saved and logged.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Unable to save hospital profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateServiceRecord = async (
    svc: EnrichedHospitalService,
    updates: {
      serviceStatus?: ServiceStatus;
      capacityStatus?: CapacityStatus;
      referralAcceptance?: ServiceAcceptanceStatus;
      operationalNotes?: string;
    }
  ) => {
    setSavingId(svc.id);
    try {
      const res = await api.updateHospitalService(selectedHospitalId, svc.serviceId, {
        serviceStatus: updates.serviceStatus ?? svc.serviceStatus,
        capacityStatus: updates.capacityStatus ?? svc.capacityStatus,
        referralAcceptance: updates.referralAcceptance ?? svc.referralAcceptance,
        operationalNotes: updates.operationalNotes ?? svc.operationalNotes,
      });

      await loadHospitalServicesAndAudit();
      await refreshCoreData();
      await recordAuditToCloud({
        id: res.auditLog.id,
        entityType: 'HOSPITAL_SERVICE',
        entityId: svc.id,
        action: res.auditLog.action,
        oldValue: res.auditLog.oldValue,
        newValue: res.auditLog.newValue,
      });

      addToast({
        type: 'success',
        title: `Updated ${svc.serviceName}`,
        message: `${res.auditLog.oldValue} → ${res.auditLog.newValue}`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Capacity Update Failed',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceId) return;
    setAddingService(true);
    try {
      const res = await api.addHospitalService(selectedHospitalId, {
        serviceId: newServiceId,
        serviceStatus: 'AVAILABLE',
        capacityStatus: newCapacityStatus,
        referralAcceptance: newAcceptance,
        operationalNotes: newNotes,
      });

      await loadHospitalServicesAndAudit();
      await refreshCoreData();
      await recordAuditToCloud({
        id: res.auditLog.id,
        entityType: 'HOSPITAL_SERVICE',
        entityId: selectedHospitalId,
        action: res.auditLog.action,
        oldValue: res.auditLog.oldValue,
        newValue: res.auditLog.newValue,
      });

      addToast({
        type: 'success',
        title: 'Medical Service Added',
        message: res.auditLog.action,
      });
      setNewServiceId('');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Could Not Add Service',
        message: err instanceof Error ? err.message : 'Please check selection.',
      });
    } finally {
      setAddingService(false);
    }
  };

  const handleRemoveService = async (svc: EnrichedHospitalService) => {
    setSavingId(svc.id);
    try {
      const res = await api.removeHospitalService(selectedHospitalId, svc.serviceId);
      await loadHospitalServicesAndAudit();
      await refreshCoreData();
      addToast({
        type: 'info',
        title: `Removed ${svc.serviceName}`,
        message: res.auditLog.action,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Removal Failed',
        message: err instanceof Error ? err.message : 'Unable to remove service.',
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Hospital Service Catalogue & Real-Time Capacity Controls · Audit-Logged
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Service & Capacity Management
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="manage-hosp-select" className="text-xs font-semibold text-slate-700">
            Managing Hospital:
          </label>
          <select
            id="manage-hosp-select"
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-900"
          >
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.area})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hospital-Level Acceptance & Contact Settings */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-display font-bold text-slate-900 mb-1">
          Facility-Wide Referral Acceptance & Desk Contact
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Configure overall hospital referral status and direct coordination contact information for{' '}
          <strong>{hospital?.name}</strong>
        </p>

        <form
          onSubmit={handleSaveHospitalProfile}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
        >
          <div className="md:col-span-4">
            <label
              htmlFor="hosp-overall-acceptance"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Hospital Referral Acceptance
            </label>
            <select
              id="hosp-overall-acceptance"
              value={hospitalAcceptance}
              onChange={(e) =>
                setHospitalAcceptance(e.target.value as HospitalAcceptanceStatus)
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ACCEPTING">Accepting Referrals</option>
              <option value="LIMITED_REVIEW">Limited — Coordinator Review Required</option>
              <option value="NOT_ACCEPTING">Not Accepting Referrals (Paused)</option>
            </select>
          </div>

          <div className="md:col-span-5">
            <label
              htmlFor="hosp-desk-contact"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Coordination Desk Contact Details
            </label>
            <input
              id="hosp-desk-contact"
              type="text"
              value={hospitalContact}
              onChange={(e) => setHospitalContact(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Saving...' : 'Save Facility Profile'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Active Services & Capacity Management Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Departmental Services & Capacity Status ({hospitalServices.length})
            </h2>
            <p className="text-xs text-slate-500">
              Select Available, Limited, Unconfirmed, or Unavailable. Every update automatically
              records timestamp, user, previous value, and new value.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {hospitalServices.map((svc) => (
            <ServiceEditorRow
              key={svc.id}
              service={svc}
              isSaving={savingId === svc.id}
              onSave={(updates) => handleUpdateServiceRecord(svc, updates)}
              onRemove={() => handleRemoveService(svc)}
            />
          ))}
        </div>
      </section>

      {/* Add Service to Hospital Catalogue */}
      {unlistedCatalogServices.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-display font-bold text-slate-900 mb-1">
            Add Medical Service to Hospital Catalogue
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Register an additional specialty service for {hospital?.name}
          </p>

          <form
            onSubmit={handleAddService}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end"
          >
            <div className="lg:col-span-4">
              <label
                htmlFor="add-svc-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Medical Service
              </label>
              <select
                id="add-svc-select"
                value={newServiceId}
                onChange={(e) => setNewServiceId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {unlistedCatalogServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.category} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="add-svc-cap"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Initial Capacity
              </label>
              <select
                id="add-svc-cap"
                value={newCapacityStatus}
                onChange={(e) => setNewCapacityStatus(e.target.value as CapacityStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="AVAILABLE">Available</option>
                <option value="LIMITED">Limited</option>
                <option value="UNCONFIRMED">Unconfirmed</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="add-svc-acc"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Acceptance
              </label>
              <select
                id="add-svc-acc"
                value={newAcceptance}
                onChange={(e) =>
                  setNewAcceptance(e.target.value as ServiceAcceptanceStatus)
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="ACCEPTING">Accepting</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="add-svc-notes"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Operational Note
              </label>
              <input
                id="add-svc-notes"
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={addingService}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingService ? 'Adding...' : 'Add Service'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Immutable Audit Log Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Capacity & Service Update Audit Log
            </h2>
            <p className="text-xs text-slate-500">
              Automatically records updated timestamp, authorized user, previous value, and new
              value
            </p>
          </div>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Authorized User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Previous Value</th>
                <th className="py-3 px-4">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {auditHistory.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums">
                    <FreshnessTimestamp updatedAt={log.timestamp} />
                    <div className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{log.actorName}</div>
                    <div className="text-[11px] text-slate-500">{log.actorRole}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{log.action}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {log.oldValue}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-900">
                    {log.newValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const ServiceEditorRow: React.FC<{
  service: EnrichedHospitalService;
  isSaving: boolean;
  onSave: (updates: {
    serviceStatus?: ServiceStatus;
    capacityStatus?: CapacityStatus;
    referralAcceptance?: ServiceAcceptanceStatus;
    operationalNotes?: string;
  }) => void;
  onRemove: () => void;
}> = ({ service, isSaving, onSave, onRemove }) => {
  const [capacity, setCapacity] = useState<CapacityStatus>(service.capacityStatus);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(service.serviceStatus);
  const [acceptance, setAcceptance] = useState<ServiceAcceptanceStatus>(
    service.referralAcceptance
  );
  const [notes, setNotes] = useState<string>(service.operationalNotes || '');

  useEffect(() => {
    setCapacity(service.capacityStatus);
    setServiceStatus(service.serviceStatus);
    setAcceptance(service.referralAcceptance);
    setNotes(service.operationalNotes || '');
  }, [service]);

  const capacities: { value: CapacityStatus; label: string }[] = [
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'LIMITED', label: 'Limited' },
    { value: 'UNCONFIRMED', label: 'Unconfirmed' },
    { value: 'UNAVAILABLE', label: 'Unavailable' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-display font-bold text-slate-900">
              {service.serviceName}
            </h3>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-600">{service.serviceCategory}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Last updated by {service.updatedByName} · <FreshnessTimestamp updatedAt={service.updatedAt} />
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CapacityIndicator status={capacity} />
          <span className="text-slate-300">·</span>
          <AcceptanceIndicator status={acceptance} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
        {/* Capacity Quick-Select Buttons */}
        <div className="lg:col-span-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Reported Capacity Status
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {capacities.map((c) => {
              const active = capacity === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setCapacity(c.value);
                    const nextServiceStatus: ServiceStatus =
                      c.value === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
                    const nextAcceptance: ServiceAcceptanceStatus =
                      c.value === 'UNAVAILABLE'
                        ? 'PAUSED'
                        : c.value === 'LIMITED'
                          ? 'PENDING_REVIEW'
                          : 'ACCEPTING';
                    setServiceStatus(nextServiceStatus);
                    setAcceptance(nextAcceptance);
                    onSave({
                      capacityStatus: c.value,
                      serviceStatus: nextServiceStatus,
                      referralAcceptance: nextAcceptance,
                      operationalNotes: notes,
                    });
                  }}
                  disabled={isSaving}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Referral Acceptance Dropdown */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Referral Acceptance
          </label>
          <select
            value={acceptance}
            onChange={(e) => {
              const nextAcc = e.target.value as ServiceAcceptanceStatus;
              setAcceptance(nextAcc);
            }}
            aria-label={`Referral acceptance for ${service.serviceName}`}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ACCEPTING">Accepting Referrals</option>
            <option value="PENDING_REVIEW">Coordinator Review Required</option>
            <option value="PAUSED">Referrals Paused</option>
          </select>
        </div>

        {/* Operational Notes */}
        <div className="lg:col-span-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Operational Notes for Referring Clinics
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label={`Operational notes for ${service.serviceName}`}
              placeholder="Add shift constraints or instructions..."
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                onSave({
                  serviceStatus,
                  capacityStatus: capacity,
                  referralAcceptance: acceptance,
                  operationalNotes: notes,
                })
              }
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg whitespace-nowrap shrink-0 inline-flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onRemove}
              aria-label={`Remove ${service.serviceName}`}
              title="Remove service from hospital catalogue"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
