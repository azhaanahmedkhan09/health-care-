import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { matchAndRankHospitals, validateReferralInput } from '../utils/matchingEngine';
import type { Referral, UrgencyLabel } from '../types/models';
import {
  AcceptanceIndicator,
  CapacityIndicator,
  FreshnessTimestamp,
} from '../components/StatusIndicators';

export const CreateReferralPage: React.FC = () => {
  const {
    user,
    hospitals,
    services,
    preselectedServiceId,
    preselectedHospitalId,
    preselectedArea,
    setPreselectedServiceId,
    setPreselectedHospitalId,
    setPreselectedArea,
    setSelectedReferralId,
    navigate,
    refreshCoreData,
    addToast,
    recordAuditToCloud,
  } = useApp();

  const [requiredServiceId, setRequiredServiceId] = useState(
    preselectedServiceId || 'svc-cardiology'
  );
  const [preferredArea, setPreferredArea] = useState(preselectedArea || 'All Davangere');
  const [urgencyLabel, setUrgencyLabel] = useState<UrgencyLabel>('PRIORITY');
  const [referringClinic, setReferringClinic] = useState(
    user?.organization || 'Davangere Community Polyclinic — PJ Extension (Fictional Demo)'
  );
  const [operationalConstraints, setOperationalConstraints] = useState(
    'Requires telemetry monitoring on arrival; patient accompanied by clinic transfer summary.'
  );
  const [coordinationNotes, setCoordinationNotes] = useState(
    'Synthetic demo case: Requesting specialist evaluation and diagnostic confirmation.'
  );
  const [syntheticPatientRef, setSyntheticPatientRef] = useState(() => {
    const code = Math.floor(1000 + Math.random() * 8999);
    return `SYN-DVG-${code}`;
  });
  const [receivingHospitalId, setReceivingHospitalId] = useState(
    preselectedHospitalId || 'hosp-1'
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdReferral, setCreatedReferral] = useState<Referral | null>(null);

  const distinctAreas = useMemo(() => {
    return ['All Davangere', ...Array.from(new Set(hospitals.map((h) => h.area)))];
  }, [hospitals]);

  // Compute live 3-step matched hospitals for the selected service & area
  const matchingResult = useMemo(() => {
    const allServices = hospitals.flatMap((h) => h.services);
    return matchAndRankHospitals(hospitals, allServices, {
      requiredServiceId,
      preferredArea,
    });
  }, [hospitals, requiredServiceId, preferredArea]);

  // Keep receivingHospitalId synced with top matched option if current selection isn't in matched list
  useEffect(() => {
    if (matchingResult.matched.length > 0) {
      const stillValid = matchingResult.matched.some(
        (m) => m.hospital.id === receivingHospitalId
      );
      if (!stillValid) {
        setReceivingHospitalId(matchingResult.matched[0].hospital.id);
      }
    }
  }, [matchingResult.matched, receivingHospitalId]);

  const handleGenerateNewSyntheticRef = () => {
    const code = Math.floor(1000 + Math.random() * 8999);
    setSyntheticPatientRef(`SYN-DVG-${code}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const validation = validateReferralInput({
      requiredServiceId,
      receivingHospitalId,
      preferredArea,
      urgencyLabel,
      referringClinic,
      operationalConstraints,
      coordinationNotes,
      syntheticPatientRef,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createReferral({
        requiredServiceId,
        receivingHospitalId,
        preferredArea,
        urgencyLabel,
        referringClinic,
        operationalConstraints,
        coordinationNotes,
        syntheticPatientRef,
      });

      setCreatedReferral(res.referral);
      await refreshCoreData();
      await recordAuditToCloud({
        id: `aud-${Date.now()}`,
        entityType: 'REFERRAL',
        entityId: res.referral.id,
        action: `Created Referral ${res.referral.referralReference}`,
        oldValue: 'None',
        newValue: `Status: PENDING · Hospital: ${res.referral.receivingHospitalName}`,
      });

      addToast({
        type: 'success',
        title: `Referral ${res.referral.referralReference} Submitted`,
        message: `Routed to ${res.referral.receivingHospitalName} coordinator inbox.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Referral Submission Failed',
        message: err instanceof Error ? err.message : 'Please check all required fields.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (createdReferral) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-mono font-semibold text-emerald-700">
              REFERRAL REQUEST SAVED & ROUTED
            </p>
            <h1 className="text-2xl font-display font-bold text-slate-900 mt-0.5">
              Referral {createdReferral.referralReference} Dispatched
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Your referral request has been persisted to the database and placed in the incoming
              coordination queue for <strong>{createdReferral.receivingHospitalName}</strong>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <p className="text-slate-500">Unique Referral ID</p>
            <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
              {createdReferral.referralReference}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Synthetic Patient Reference</p>
            <p className="font-mono font-semibold text-slate-900 text-sm mt-0.5">
              {createdReferral.syntheticPatientRef}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Required Medical Service</p>
            <p className="font-semibold text-slate-900 mt-0.5">
              {createdReferral.requiredServiceName}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Receiving Hospital</p>
            <p className="font-semibold text-slate-900 mt-0.5">
              {createdReferral.receivingHospitalName}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
          <p className="font-semibold">Next Coordination Step</p>
          <p className="mt-0.5">
            Contact the receiving hospital desk ({createdReferral.receivingHospitalContact}) to
            confirm clinical handover details while the coordinator reviews your request. You can
            also switch to the <strong>Demo Coordinator</strong> role in the sidebar to accept or
            decline this request live.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              setCreatedReferral(null);
              handleGenerateNewSyntheticRef();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
          >
            Create Another Referral
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('REFERRER_DASHBOARD')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
            >
              Return to Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedReferralId(createdReferral.id);
                navigate('REFERRAL_TRACKING');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5"
            >
              <span>Track Referral Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Structured Referral Coordination Request · Minimal Data Collection
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Create Hospital Referral Request
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setPreselectedServiceId(requiredServiceId);
            setPreselectedArea(preferredArea);
            navigate('MATCHED_RESULTS');
          }}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Compass className="w-3.5 h-3.5 text-sky-700" />
          <span>Inspect Full 3-Step Match Results</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Referral Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Required Medical Service */}
            <div>
              <label
                htmlFor="ref-service"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Required Medical Service *
              </label>
              <select
                id="ref-service"
                value={requiredServiceId}
                onChange={(e) => setRequiredServiceId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.category} — {svc.name}
                  </option>
                ))}
              </select>
              {fieldErrors.requiredServiceId && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.requiredServiceId}</p>
              )}
            </div>

            {/* Preferred Location / Area */}
            <div>
              <label
                htmlFor="ref-area"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Preferred Location (Davangere) *
              </label>
              <select
                id="ref-area"
                value={preferredArea}
                onChange={(e) => setPreferredArea(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                {distinctAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              {fieldErrors.preferredArea && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.preferredArea}</p>
              )}
            </div>
          </div>

          {/* Urgency Category & Synthetic Patient Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ref-urgency"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Referral Urgency Category *
              </label>
              <select
                id="ref-urgency"
                value={urgencyLabel}
                onChange={(e) => setUrgencyLabel(e.target.value as UrgencyLabel)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
              >
                <option value="ROUTINE">Routine Coordination</option>
                <option value="PRIORITY">Priority Same-Day Evaluation</option>
                <option value="URGENT_TRANSFER">Urgent Inter-Facility Transfer</option>
              </select>
              {fieldErrors.urgencyLabel && (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.urgencyLabel}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="ref-patient-id"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Synthetic Patient Reference ID *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateNewSyntheticRef}
                  className="text-[11px] text-sky-700 hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate ID</span>
                </button>
              </div>
              <input
                id="ref-patient-id"
                type="text"
                required
                value={syntheticPatientRef}
                onChange={(e) => setSyntheticPatientRef(e.target.value)}
                placeholder="e.g., SYN-DVG-4082"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
              {fieldErrors.syntheticPatientRef ? (
                <p className="text-[11px] text-red-600 mt-1">{fieldErrors.syntheticPatientRef}</p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">
                  Do not enter patient names, Aadhaar numbers, or personal phone numbers.
                </p>
              )}
            </div>
          </div>

          {/* Referring Clinic */}
          <div>
            <label
              htmlFor="ref-clinic"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Referring Clinic / Facility *
            </label>
            <input
              id="ref-clinic"
              type="text"
              required
              value={referringClinic}
              onChange={(e) => setReferringClinic(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
            {fieldErrors.referringClinic && (
              <p className="text-[11px] text-red-600 mt-1">{fieldErrors.referringClinic}</p>
            )}
          </div>

          {/* Receiving Hospital Selection */}
          <div>
            <label
              htmlFor="ref-hospital"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Target Receiving Hospital (Ranked by 3-Step Matching Engine) *
            </label>
            <select
              id="ref-hospital"
              value={receivingHospitalId}
              onChange={(e) => setReceivingHospitalId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
            >
              {matchingResult.matched.map((m) => (
                <option key={m.hospital.id} value={m.hospital.id}>
                  #{m.rankOrder} {m.hospital.name} — Capacity: {m.hospitalService.capacityStatus} (
                  {m.freshnessLabel})
                </option>
              ))}
              {matchingResult.matched.length === 0 &&
                hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.area})
                  </option>
                ))}
            </select>
            {fieldErrors.receivingHospitalId && (
              <p className="text-[11px] text-red-600 mt-1">{fieldErrors.receivingHospitalId}</p>
            )}
          </div>

          {/* Operational Constraints */}
          <div>
            <label
              htmlFor="ref-constraints"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Operational & Transport Constraints
            </label>
            <input
              id="ref-constraints"
              type="text"
              value={operationalConstraints}
              onChange={(e) => setOperationalConstraints(e.target.value)}
              placeholder="e.g., Requires oxygen support in transit, ambulance ETA 25 mins"
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* Additional Coordination Notes */}
          <div>
            <label
              htmlFor="ref-notes"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Additional Clinical Handover & Coordination Notes
            </label>
            <textarea
              id="ref-notes"
              rows={3}
              value={coordinationNotes}
              onChange={(e) => setCoordinationNotes(e.target.value)}
              placeholder="Summarize relevant vitals, diagnostic findings, or reason for referral (no personally identifiable details)..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
              <span>Submission notifies the receiving hospital coordinator immediately.</span>
            </span>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting Referral...' : 'Submit Referral Request'}</span>
            </button>
          </div>
        </form>

        {/* Right 5 Cols: Live Matched Receiving Hospital Preview */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-display font-bold text-slate-900">
                Matched Receiving Options ({matchingResult.matched.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Live explainable ranking for selected service
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreselectedServiceId(requiredServiceId);
                setPreselectedArea(preferredArea);
                navigate('MATCHED_RESULTS');
              }}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              See Excluded ({matchingResult.excluded.length})
            </button>
          </div>

          <div className="space-y-3">
            {matchingResult.matched.map((item) => {
              const isSelected = item.hospital.id === receivingHospitalId;
              return (
                <div
                  key={item.hospital.id}
                  onClick={() => {
                    setReceivingHospitalId(item.hospital.id);
                    setPreselectedHospitalId(item.hospital.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setReceivingHospitalId(item.hospital.id);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-1">
                    <span className="font-mono font-semibold text-slate-700">
                      Option #{item.rankOrder} · {item.hospital.area} ({item.hospital.distanceKm} km)
                    </span>
                    <FreshnessTimestamp updatedAt={item.hospitalService.updatedAt} />
                  </div>

                  <p className="text-xs font-semibold text-slate-900 mb-2">
                    {item.hospital.name}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <CapacityIndicator status={item.hospitalService.capacityStatus} compact />
                    <span className="text-slate-300">·</span>
                    <AcceptanceIndicator status={item.hospitalService.referralAcceptance} />
                  </div>

                  <p className="text-[11px] text-slate-600 bg-slate-100/80 rounded px-2.5 py-1.5">
                    {item.matchReasons}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
