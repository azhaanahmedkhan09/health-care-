import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  GitBranch,
  MessageSquarePlus,
  Phone,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type {
  MatchedHospitalResult,
  Referral,
  ReferralStatus,
} from '../types/models';
import {
  AcceptanceIndicator,
  CapacityIndicator,
  FreshnessTimestamp,
  ReferralStatusIndicator,
  UrgencyIndicator,
} from '../components/StatusIndicators';

export const ReferralTrackingPage: React.FC = () => {
  const {
    user,
    referrals,
    selectedReferralId,
    setSelectedReferralId,
    refreshCoreData,
    addToast,
    recordAuditToCloud,
  } = useApp();

  const activeId = selectedReferralId || referrals[0]?.id || 'ref-1001';
  const [activeReferral, setActiveReferral] = useState<Referral | null>(null);
  const [timeline, setTimeline] = useState<
    {
      id: string;
      type: string;
      status: ReferralStatus;
      title: string;
      description: string;
      actorName: string;
      timestamp: string;
    }[]
  >([]);
  const [matchedAlternatives, setMatchedAlternatives] = useState<MatchedHospitalResult[]>([]);
  const [loading, setLoading] = useState(true);

  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<ReferralStatus>('PENDING');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [reassigningHospitalId, setReassigningHospitalId] = useState<string | null>(null);

  const loadTimelineAndOptions = useCallback(async () => {
    setLoading(true);
    try {
      const [tlRes, optRes] = await Promise.all([
        api.getReferralTimeline(activeId),
        api.getReferralOptions(activeId),
      ]);
      setActiveReferral(tlRes.referral);
      setTimeline(tlRes.timeline);
      setMatchedAlternatives(optRes.matched);
      if (user?.role === 'HOSPITAL_COORDINATOR') {
        setFollowUpStatus('ACCEPTED');
      } else {
        setFollowUpStatus('PENDING');
      }
    } catch (err) {
      console.error('Error loading referral timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [activeId, user?.role]);

  useEffect(() => {
    loadTimelineAndOptions();
  }, [loadTimelineAndOptions]);

  const handlePostFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReferral || !followUpNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await api.respondToReferral(activeReferral.id, {
        responseStatus: followUpStatus,
        responseNote: followUpNote.trim(),
      });
      setFollowUpNote('');
      await loadTimelineAndOptions();
      await refreshCoreData();
      await recordAuditToCloud({
        id: res.auditLog.id,
        entityType: 'REFERRAL',
        entityId: activeReferral.id,
        action: res.auditLog.action,
        oldValue: res.auditLog.oldValue,
        newValue: res.auditLog.newValue,
      });

      addToast({
        type: 'success',
        title: `Updated ${activeReferral.referralReference}`,
        message: 'Timeline and referral status updated.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Please enter a valid note.',
      });
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleRedirectToAlternative = async (targetHospitalId: string, hospitalName: string) => {
    if (!activeReferral) return;
    setReassigningHospitalId(targetHospitalId);
    try {
      await api.reassignReferral(activeReferral.id, {
        newHospitalId: targetHospitalId,
        note: `Redirected referral from ${activeReferral.receivingHospitalName} to ${hospitalName} after reviewing matched alternative hospital capacity.`,
      });
      await loadTimelineAndOptions();
      await refreshCoreData();
      addToast({
        type: 'success',
        title: `Redirected to ${hospitalName}`,
        message: `${activeReferral.referralReference} is now Pending at ${hospitalName}.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Redirection Failed',
        message: err instanceof Error ? err.message : 'Unable to redirect referral.',
      });
    } finally {
      setReassigningHospitalId(null);
    }
  };

  const getNextCoordinationStep = (ref: Referral): string => {
    switch (ref.status) {
      case 'ACCEPTED':
        return `Coordinator at ${ref.receivingHospitalName} has confirmed service readiness. Contact receiving desk (${ref.receivingHospitalContact}) prior to ambulance/patient departure.`;
      case 'DECLINED':
        return `${ref.receivingHospitalName} declined this request due to operational constraints. Review the pre-matched alternative hospitals below and redirect the referral in one click without restarting your search.`;
      case 'MORE_INFO_NEEDED':
        return `Coordinator at ${ref.receivingHospitalName} requested additional clinical or operational details. Submit the requested clarification below to resume review.`;
      case 'PENDING':
      default:
        return `Awaiting review by receiving coordinator at ${ref.receivingHospitalName}. For urgent transfers, call ${ref.receivingHospitalContact} directly.`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Closed-Loop Referral Status Timeline & Alternative Hospital Redirection
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Referral Tracking & Response History
          </h1>
        </div>

        {/* Referral Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="select-tracked-referral" className="text-xs font-semibold text-slate-700">
            Select Referral:
          </label>
          <select
            id="select-tracked-referral"
            value={activeId}
            onChange={(e) => setSelectedReferralId(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-semibold text-slate-900"
          >
            {referrals.map((r) => (
              <option key={r.id} value={r.id}>
                {r.referralReference} · {r.requiredServiceCategory} ({r.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !activeReferral ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          Loading referral timeline...
        </div>
      ) : activeReferral ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 Cols: All Referrals List Sidebar */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xs font-semibold text-slate-700">
                All Tracked Referrals ({referrals.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {referrals.map((ref) => {
                const isSelected = ref.id === activeReferral.id;
                return (
                  <button
                    key={ref.id}
                    type="button"
                    onClick={() => setSelectedReferralId(ref.id)}
                    className={`w-full p-4 text-left transition-colors block ${
                      isSelected ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {ref.referralReference}
                      </span>
                      <ReferralStatusIndicator status={ref.status} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {ref.requiredServiceName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      → {ref.receivingHospitalName}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                      <span>Ref: {ref.syntheticPatientRef}</span>
                      <FreshnessTimestamp updatedAt={ref.updatedAt} />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right 8 Cols: Detailed Referral Card, Step Progression, Timeline & Alternatives */}
          <div className="lg:col-span-8 space-y-6">
            {/* Summary Detail Card */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums mb-1">
                    <span className="font-bold text-slate-900">
                      {activeReferral.referralReference}
                    </span>
                    <span>·</span>
                    <span>Patient Ref: {activeReferral.syntheticPatientRef}</span>
                    <span>·</span>
                    <span>
                      Requested {new Date(activeReferral.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-display font-bold text-slate-900">
                    {activeReferral.requiredServiceName}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <UrgencyIndicator urgency={activeReferral.urgencyLabel} />
                  <span className="text-slate-300">·</span>
                  <ReferralStatusIndicator status={activeReferral.status} />
                </div>
              </div>

              {/* Status Progression Bar: Pending -> Accepted / Declined / More Information Needed */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500 mb-3">
                  REFERRAL WORKFLOW PROGRESSION
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900">1. Request Dispatched</p>
                      <p className="text-[11px] text-slate-500">
                        {activeReferral.referringClinic}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900">2. Coordinator Review</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[160px]">
                        {activeReferral.receivingHospitalName}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-center gap-2.5">
                    <div>
                      <p className="text-[11px] text-slate-500">3. Current Outcome</p>
                      <ReferralStatusIndicator status={activeReferral.status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Referral Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-lg border border-slate-200/80">
                  <p className="text-slate-500 mb-0.5">Referring Clinic & Clinician</p>
                  <p className="font-semibold text-slate-900">{activeReferral.createdByName}</p>
                  <p className="text-slate-600 mt-0.5">{activeReferral.referringClinic}</p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80">
                  <p className="text-slate-500 mb-0.5">Receiving Hospital & Contact</p>
                  <p className="font-semibold text-slate-900">
                    {activeReferral.receivingHospitalName}
                  </p>
                  <p className="text-slate-600 font-mono mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-sky-700" />
                    <span>{activeReferral.receivingHospitalContact}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80">
                  <p className="text-slate-500 mb-0.5">Operational Constraints</p>
                  <p className="text-slate-800">{activeReferral.operationalConstraints}</p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200/80">
                  <p className="text-slate-500 mb-0.5">Clinical Coordination Notes</p>
                  <p className="text-slate-800">
                    {activeReferral.coordinationNotes || 'None provided.'}
                  </p>
                </div>
              </div>

              {/* Next Coordination Step Banner */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950">
                <p className="font-semibold mb-0.5">Recommended Next Coordination Step</p>
                <p>{getNextCoordinationStep(activeReferral)}</p>
              </div>
            </section>

            {/* Alternative Hospitals Panel (Highlighted When Declined, Always Accessible) */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-sky-700" />
                    <span>
                      Alternative Matched Hospitals for {activeReferral.requiredServiceName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeReferral.status === 'DECLINED'
                      ? 'This referral was declined. Select a pre-matched alternative hospital below to redirect immediately without restarting your search.'
                      : 'Pre-computed standby hospitals in Davangere ordered by transparent 3-step matching.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {matchedAlternatives
                  .filter((m) => m.hospital.id !== activeReferral.receivingHospitalId)
                  .map((alt) => (
                    <div
                      key={alt.hospital.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 font-mono text-slate-500">
                          <span className="font-semibold text-sky-700">
                            Standby Match #{alt.rankOrder}
                          </span>
                          <span>·</span>
                          <span>
                            {alt.hospital.area} ({alt.hospital.distanceKm.toFixed(1)} km)
                          </span>
                          <span>·</span>
                          <FreshnessTimestamp updatedAt={alt.hospitalService.updatedAt} />
                        </div>
                        <p className="text-sm font-bold text-slate-900">{alt.hospital.name}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <CapacityIndicator status={alt.hospitalService.capacityStatus} compact />
                          <span className="text-slate-300">·</span>
                          <AcceptanceIndicator status={alt.hospitalService.referralAcceptance} />
                        </div>
                        <p className="text-[11px] text-slate-600">{alt.matchReasons}</p>
                      </div>

                      {user?.role === 'REFERRING_DOCTOR' && (
                        <button
                          type="button"
                          disabled={reassigningHospitalId === alt.hospital.id}
                          onClick={() =>
                            handleRedirectToAlternative(alt.hospital.id, alt.hospital.name)
                          }
                          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <span>
                            {reassigningHospitalId === alt.hospital.id
                              ? 'Redirecting...'
                              : 'Redirect Referral Here'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </section>

            {/* Chronological Timeline & Response Form */}
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-sky-700" />
                  <span>Referral Response & Coordination Timeline</span>
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {timeline.length} Events Logged
                </span>
              </div>

              <div className="space-y-4">
                {timeline.map((event, idx) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-slate-700">
                        Step {idx + 1} · {event.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <ReferralStatusIndicator status={event.status} />
                        <span className="text-slate-300">·</span>
                        <FreshnessTimestamp updatedAt={event.timestamp} />
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{event.description}</p>
                    <p className="text-[11px] text-slate-500">
                      Logged by <strong>{event.actorName}</strong> at{' '}
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add Coordination Response / Clarification Form */}
              <form
                onSubmit={handlePostFollowUp}
                className="pt-4 border-t border-slate-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label
                    htmlFor="timeline-response-note"
                    className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-sky-700" />
                    <span>
                      {user?.role === 'HOSPITAL_COORDINATOR'
                        ? 'Post Coordinator Decision & Response Note'
                        : 'Provide Additional Clinical Clarification / Follow-Up Note'}
                    </span>
                  </label>

                  <select
                    value={followUpStatus}
                    onChange={(e) => setFollowUpStatus(e.target.value as ReferralStatus)}
                    aria-label="Select updated referral status"
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    <option value="ACCEPTED">Status: Accepted</option>
                    <option value="MORE_INFO_NEEDED">Status: More Info Needed</option>
                    <option value="DECLINED">Status: Declined</option>
                    <option value="PENDING">Status: Pending Review</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="timeline-response-note"
                    type="text"
                    required
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="Enter response note, clinical vitals update, or transfer confirmation..."
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingNote ? 'Posting...' : 'Record Update'}</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
};
