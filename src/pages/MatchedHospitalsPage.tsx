import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Filter,
  Info,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { matchAndRankHospitals } from '../utils/matchingEngine';
import {
  AcceptanceIndicator,
  CapacityIndicator,
  FreshnessTimestamp,
} from '../components/StatusIndicators';

export const MatchedHospitalsPage: React.FC = () => {
  const {
    user,
    hospitals,
    services,
    preselectedServiceId,
    preselectedArea,
    setPreselectedServiceId,
    setPreselectedHospitalId,
    setPreselectedArea,
    setSelectedHospitalId,
    navigate,
  } = useApp();

  const [serviceId, setServiceId] = useState(preselectedServiceId || 'svc-cardiology');
  const [area, setArea] = useState(preselectedArea || 'All Davangere');
  const [strictAreaFilter, setStrictAreaFilter] = useState(false);

  const distinctAreas = useMemo(() => {
    return ['All Davangere', ...Array.from(new Set(hospitals.map((h) => h.area)))];
  }, [hospitals]);

  const selectedService = services.find((s) => s.id === serviceId) || services[0];

  const matchingOutput = useMemo(() => {
    const allServices = hospitals.flatMap((h) => h.services);
    return matchAndRankHospitals(hospitals, allServices, {
      requiredServiceId: serviceId,
      preferredArea: area,
      strictAreaFilter,
    });
  }, [hospitals, serviceId, area, strictAreaFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Transparent 3-Step Hospital Referral Matching · Zero Black-Box Scoring
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Matched Hospital Results & Explainable Ordering
          </h1>
        </div>
      </div>

      {/* Matching Criteria Control Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="match-service"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Step 1 Criterion: Required Medical Service
            </label>
            <select
              id="match-service"
              value={serviceId}
              onChange={(e) => {
                setServiceId(e.target.value);
                setPreselectedServiceId(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.category} — {svc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="match-area"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Step 1 Criterion: Search Area in Davangere
            </label>
            <select
              id="match-area"
              value={area}
              onChange={(e) => {
                setArea(e.target.value);
                setPreselectedArea(e.target.value);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
            >
              {distinctAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={strictAreaFilter}
                onChange={(e) => setStrictAreaFilter(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
              <span>Hard-exclude outside selected area</span>
            </label>
          </div>
        </div>

        {/* 3-Step Pipeline Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <p className="font-mono font-semibold text-slate-900 mb-0.5">
              Step 1: Hard Filters
            </p>
            <p className="text-slate-600">
              Requires active facility status, <strong>{selectedService?.name}</strong> listed in
              catalogue, and search region compliance.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <p className="font-mono font-semibold text-slate-900 mb-0.5">
              Step 2: Operational Status
            </p>
            <p className="text-slate-600">
              Separates reported capacity from referral acceptance. Explicitly unavailable or paused
              services are excluded from active matches.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
            <p className="font-mono font-semibold text-slate-900 mb-0.5">
              Step 3: Explainable Ordering
            </p>
            <p className="text-slate-600">
              Ordered by Service Match → Reported Capacity → Referral Acceptance → Distance Band →
              Information Freshness.
            </p>
          </div>
        </div>
      </section>

      {/* Matched Results List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Potentially Available Matched Hospitals ({matchingOutput.matched.length})
            </span>
          </h2>
          <span className="text-xs text-slate-500">
            Ordered transparently · Never claims clinical superiority
          </span>
        </div>

        {matchingOutput.matched.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              No active hospitals currently report available or limited capacity for{' '}
              {selectedService?.name}
            </p>
            <p className="text-xs text-slate-500">
              Try disabling the strict area filter or inspect the excluded hospitals list below.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matchingOutput.matched.map((item) => (
              <article
                key={item.hospital.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Top Rank & Metadata Line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span className="font-bold text-sky-700">
                        Match Option #{item.rankOrder}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.hospital.area}, Davangere</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {item.hospital.distanceKm.toFixed(1)} km ({item.hospital.distanceBand})
                      </span>
                      <span aria-hidden="true">·</span>
                      <FreshnessTimestamp updatedAt={item.hospitalService.updatedAt} />
                    </div>

                    {/* Hospital Title */}
                    <h3 className="text-lg font-display font-bold text-slate-900">
                      {item.hospital.name}
                    </h3>

                    {/* Separate Display of Reported Capacity & Referral Acceptance */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">Reported Capacity:</span>
                        <CapacityIndicator status={item.hospitalService.capacityStatus} />
                      </div>
                      <span className="text-slate-300" aria-hidden="true">
                        |
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">Referral Acceptance:</span>
                        <AcceptanceIndicator status={item.hospitalService.referralAcceptance} />
                      </div>
                      <span className="text-slate-300" aria-hidden="true">
                        |
                      </span>
                      <span className="text-xs text-slate-600 font-mono">
                        {item.hospital.emergencyDeskPhone}
                      </span>
                    </div>

                    {/* Mandatory Explainable Match String */}
                    <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800">
                      <span className="font-semibold text-slate-900 mr-1.5">
                        Why this hospital appears:
                      </span>
                      <span className="font-medium">{item.matchReasons}</span>
                    </div>

                    {item.hospitalService.operationalNotes && (
                      <p className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Coordinator Note:</strong> {item.hospitalService.operationalNotes}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHospitalId(item.hospital.id);
                        navigate('HOSPITAL_DETAILS');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>View Hospital Details</span>
                    </button>

                    {user?.role !== 'HOSPITAL_COORDINATOR' && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreselectedHospitalId(item.hospital.id);
                          setPreselectedServiceId(serviceId);
                          navigate('CREATE_REFERRAL');
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <span>Select & Create Referral</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Excluded Hospitals Section (Demonstrates Step 1 & Step 2 Filtering Clearly) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span>
                Hospitals Excluded by Step 1 & Step 2 Filters ({matchingOutput.excluded.length})
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Shown for full audit transparency so clinicians understand why certain regional
              hospitals are omitted from active recommendations
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {matchingOutput.excluded.map((ex) => (
            <div
              key={ex.hospital.id}
              className="p-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold text-slate-900">{ex.hospital.name}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{ex.hospital.area}</span>
                </div>
                <p className="text-slate-600 mt-1 pl-6">{ex.exclusionReason}</p>
              </div>

              <div className="pl-6 sm:pl-0 flex items-center gap-3 shrink-0">
                <span className="font-mono text-[11px] text-slate-500">
                  {ex.exclusionStep === 'STEP_1_HARD_FILTER'
                    ? 'Filtered at Step 1 (Hard Filter)'
                    : 'Filtered at Step 2 (Operational Status)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHospitalId(ex.hospital.id);
                    navigate('HOSPITAL_DETAILS');
                  }}
                  className="text-xs font-semibold text-sky-700 hover:underline"
                >
                  Inspect Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Non-Guarantee Footer Reminder */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-slate-700 shrink-0" />
        <span>
          <strong>Ranking Disclaimer:</strong> Ordering reflects operational alignment with your
          filter criteria (service listing, reported capacity, acceptance status, proximity, and
          record freshness). It never represents a clinical quality rating or a guarantee of bed
          availability.
        </span>
      </div>
    </div>
  );
};
