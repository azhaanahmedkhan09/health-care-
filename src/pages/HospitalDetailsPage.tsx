import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { AuditLog, EnrichedHospital } from '../types/models';
import {
  AcceptanceIndicator,
  CapacityIndicator,
  FreshnessTimestamp,
} from '../components/StatusIndicators';

export const HospitalDetailsPage: React.FC = () => {
  const {
    user,
    selectedHospitalId,
    hospitals,
    navigate,
    setPreselectedHospitalId,
    setPreselectedServiceId,
  } = useApp();

  const targetId = selectedHospitalId || hospitals[0]?.id || 'hosp-1';
  const [hospital, setHospital] = useState<EnrichedHospital | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchDetails() {
      setLoading(true);
      try {
        const res = await api.getHospitalById(targetId);
        if (!active) return;
        setHospital(res.hospital);
        setAuditHistory(res.auditHistory);
      } catch (err) {
        console.error('Error loading hospital details:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchDetails();
    return () => {
      active = false;
    };
  }, [targetId]);

  if (loading && !hospital) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
        Loading hospital profile and service catalogue...
      </div>
    );
  }

  const activeHospital = hospital || hospitals.find((h) => h.id === targetId);
  if (!activeHospital) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-900">Hospital record not found</p>
        <button
          type="button"
          onClick={() => navigate('HOSPITAL_SEARCH')}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
        >
          Return to Hospital Search
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('HOSPITAL_SEARCH')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Hospital Search</span>
        </button>

        {user?.role !== 'HOSPITAL_COORDINATOR' && (
          <button
            type="button"
            onClick={() => {
              setPreselectedHospitalId(activeHospital.id);
              if (activeHospital.services[0]) {
                setPreselectedServiceId(activeHospital.services[0].serviceId);
              }
              navigate('CREATE_REFERRAL');
            }}
            disabled={activeHospital.referralAcceptance === 'NOT_ACCEPTING'}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <span>Create Referral to This Hospital</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hospital Profile Summary Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <Building2 className="w-3.5 h-3.5 text-sky-700" />
            <span>{activeHospital.area}, Davangere</span>
            <span aria-hidden="true">·</span>
            <span>{activeHospital.distanceKm.toFixed(1)} km</span>
            <span aria-hidden="true">·</span>
            <span>{activeHospital.distanceBand}</span>
          </div>
          <FreshnessTimestamp updatedAt={activeHospital.updatedAt} />
        </div>

        <h1 className="text-2xl font-display font-bold text-slate-900 mb-1">
          {activeHospital.name}
        </h1>
        <p className="text-xs text-slate-600 flex items-center gap-1.5 mb-5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{activeHospital.address}</span>
        </p>

        {/* Grid of Operational Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <p className="text-[11px] text-slate-500 mb-1">Hospital Referral Acceptance</p>
            <AcceptanceIndicator status={activeHospital.referralAcceptance} />
            <p className="text-[11px] text-slate-500 mt-1">
              Active Status: {activeHospital.activeStatus ? 'Active Facility' : 'Inactive'}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <p className="text-[11px] text-slate-500 mb-1">Contact & Emergency Desk (Demo)</p>
            <p className="text-xs font-semibold text-slate-900 font-mono tabular-nums flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>{activeHospital.emergencyDeskPhone}</span>
            </p>
            <p className="text-[11px] text-slate-600 mt-1 truncate">
              {activeHospital.contactInformation}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
            <p className="text-[11px] text-slate-500 mb-1">Authorized Receiving Coordinator</p>
            <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>{activeHospital.coordinatorName}</span>
            </p>
            <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-mono">
              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{activeHospital.coordinatorEmail}</span>
            </p>
          </div>
        </div>

        {/* Specialties Line */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Listed Specialties:</span>
          <span>{activeHospital.specialties.join(' · ')}</span>
        </div>
      </section>

      {/* Mandatory Clinical Non-Guarantee Callout */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold">
            Distinction Between Reported Service Availability and Confirmed Admission
          </p>
          <p className="text-amber-800 mt-0.5">
            A service listed as <strong>Available</strong> or <strong>Limited</strong> indicates
            that the department is operational and reporting capacity at the stated timestamp. It
            does not guarantee an open inpatient bed, ICU monitor, or immediate clinical admission.
            Referring clinicians must submit a referral or call{' '}
            <span className="font-mono font-semibold">{activeHospital.emergencyDeskPhone}</span> to
            confirm readiness before patient transport.
          </p>
        </div>
      </div>

      {/* Service Catalogue Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Service Catalogue & Service-Specific Reported Capacity
            </h2>
            <p className="text-xs text-slate-500">
              Point-in-time status reported by {activeHospital.coordinatorName}
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {activeHospital.services.length} Services Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-5">Medical Service & Category</th>
                <th className="py-3 px-4">Service Status</th>
                <th className="py-3 px-4">Reported Capacity</th>
                <th className="py-3 px-4">Referral Acceptance</th>
                <th className="py-3 px-4">Operational Notes</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {activeHospital.services.map((svc) => (
                <tr key={svc.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900">{svc.serviceName}</div>
                    <div className="text-[11px] text-slate-500">{svc.serviceCategory}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        svc.serviceStatus === 'AVAILABLE' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {svc.serviceStatus === 'AVAILABLE' ? 'Service Listed' : 'Service Unavailable'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <CapacityIndicator status={svc.capacityStatus} />
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <AcceptanceIndicator status={svc.referralAcceptance} />
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-slate-600">
                    {svc.operationalNotes || 'No special constraints noted.'}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <FreshnessTimestamp updatedAt={svc.updatedAt} />
                    <div className="text-[11px] text-slate-400">by {svc.updatedByName}</div>
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {user?.role !== 'HOSPITAL_COORDINATOR' && (
                      <button
                        type="button"
                        disabled={
                          svc.serviceStatus === 'UNAVAILABLE' ||
                          svc.capacityStatus === 'UNAVAILABLE' ||
                          svc.referralAcceptance === 'PAUSED'
                        }
                        onClick={() => {
                          setPreselectedHospitalId(activeHospital.id);
                          setPreselectedServiceId(svc.serviceId);
                          navigate('CREATE_REFERRAL');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 rounded-md transition-colors"
                      >
                        Refer for Service
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Log History for This Hospital */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Recent Capacity & Coordination Audit Trail
            </h2>
            <p className="text-xs text-slate-500">
              Logged updates with actor identity, previous value, and new value
            </p>
          </div>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>

        {auditHistory.length === 0 ? (
          <p className="text-xs text-slate-500">No recent audit log entries for this hospital.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {auditHistory.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{log.action}</p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                    Previous: {log.oldValue} → New: {log.newValue}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <FreshnessTimestamp updatedAt={log.timestamp} />
                  <p className="text-[11px] text-slate-500">Actor: {log.actorName}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
