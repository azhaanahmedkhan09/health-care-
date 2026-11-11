import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MessageSquareWarning,
  Settings2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type {
  AuditLog,
  EnrichedHospital,
  EnrichedHospitalService,
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

export const CoordinatorDashboardPage: React.FC = () => {
  const {
    user,
    hospitals,
    navigate,
    setSelectedReferralId,
    refreshCoreData,
    addToast,
    recordAuditToCloud,
  } = useApp();

  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    user?.hospitalId || 'hosp-1'
  );
  const [hospital, setHospital] = useState<EnrichedHospital | null>(null);
  const [stats, setStats] = useState({
    totalIncoming: 0,
    pendingRequests: 0,
    acceptedReferrals: 0,
    declinedReferrals: 0,
    moreInfoNeeded: 0,
  });
  const [incomingReferrals, setIncomingReferrals] = useState<Referral[]>([]);
  const [services, setServices] = useState<EnrichedHospitalService[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state for responding to an incoming referral
  const [activeReferralForAction, setActiveReferralForAction] = useState<Referral | null>(null);
  const [actionStatus, setActionStatus] = useState<ReferralStatus>('ACCEPTED');
  const [actionNote, setActionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadCoordinatorData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCoordinatorDashboard(selectedHospitalId);
      setHospital(res.hospital);
      setStats(res.stats);
      setIncomingReferrals(res.incomingReferrals);
      setServices(res.services);
      setRecentUpdates(res.recentUpdates);
    } catch (err) {
      console.error('Failed to load coordinator dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedHospitalId]);

  useEffect(() => {
    loadCoordinatorData();
  }, [loadCoordinatorData]);

  const openActionModal = (ref: Referral, statusPreset: ReferralStatus) => {
    setActiveReferralForAction(ref);
    setActionStatus(statusPreset);
    if (statusPreset === 'ACCEPTED') {
      setActionNote(
        `Department capacity confirmed for ${ref.requiredServiceName}. Please contact receiving desk (${ref.receivingHospitalContact}) prior to patient dispatch.`
      );
    } else if (statusPreset === 'DECLINED') {
      setActionNote(
        `Unable to accept ${ref.requiredServiceName} referral at this time due to acute ward occupancy. Please review matched alternative hospitals in Davangere.`
      );
    } else {
      setActionNote(
        `Please provide latest vital signs, baseline lab results, and estimated transport arrival time for ${ref.syntheticPatientRef}.`
      );
    }
  };

  const handleConfirmResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReferralForAction) return;
    setSubmittingAction(true);
    try {
      const res = await api.respondToReferral(activeReferralForAction.id, {
        responseStatus: actionStatus,
        responseNote: actionNote,
      });

      await loadCoordinatorData();
      await refreshCoreData();
      await recordAuditToCloud({
        id: res.auditLog.id,
        entityType: 'REFERRAL',
        entityId: activeReferralForAction.id,
        action: res.auditLog.action,
        oldValue: res.auditLog.oldValue,
        newValue: res.auditLog.newValue,
      });

      addToast({
        type: 'success',
        title: `Referral ${activeReferralForAction.referralReference} Updated`,
        message: `Marked as ${actionStatus.replace(/_/g, ' ')}. Referring doctor notified.`,
      });
      setActiveReferralForAction(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to submit response',
        message: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="min-w-0">
          <p className="text-xs font-medium text-sky-700 mb-1 truncate">
            Receiving Hospital Operations Console · {hospital?.name || user?.organization}
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Hospital Coordinator Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <label htmlFor="coord-hosp-select" className="text-xs font-medium text-slate-600 whitespace-nowrap">
              Facility:
            </label>
            <select
              id="coord-hosp-select"
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-800 max-w-[240px] truncate"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => navigate('SERVICE_CAPACITY_MANAGEMENT')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Manage Services & Capacity</span>
          </button>
        </div>
      </div>

      {/* 5 Coordinator Summary KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Incoming</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1">
            {loading ? '—' : stats.totalIncoming}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">All routed requests</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Requests</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-sky-700 mt-1">
            {loading ? '—' : stats.pendingRequests}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting coordinator action</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Accepted Referrals</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {loading ? '—' : stats.acceptedReferrals}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Confirmed for transfer</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Declined Referrals</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-red-700 mt-1">
            {loading ? '—' : stats.declinedReferrals}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Redirected to alternatives</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500">More Info Needed</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-amber-700 mt-1">
            {loading ? '—' : stats.moreInfoNeeded}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting clinic clarification</p>
        </div>
      </section>

      {/* Incoming Referral Management Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Incoming Referral Management Queue
            </h2>
            <p className="text-xs text-slate-500">
              Accept, decline, or request additional clinical information for incoming referrals
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {incomingReferrals.length} Referrals for {hospital?.name}
          </span>
        </div>

        {incomingReferrals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No incoming referrals currently routed to this hospital facility.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-3">Referral & Patient ID</th>
                  <th className="py-3 px-2.5">Referring Clinic</th>
                  <th className="py-3 px-2.5">Required Service & Notes</th>
                  <th className="py-3 px-2.5">Urgency</th>
                  <th className="py-3 px-2.5">Status</th>
                  <th className="py-3 px-3 text-right">Coordinator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {incomingReferrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-slate-900">{ref.referralReference}</div>
                      <div className="text-[11px] text-slate-500">
                        Ref: {ref.syntheticPatientRef}
                      </div>
                      <FreshnessTimestamp updatedAt={ref.createdAt} />
                    </td>
                    <td className="py-3 px-2.5">
                      <div className="font-semibold text-slate-900 whitespace-nowrap">{ref.createdByName}</div>
                      <div className="text-[11px] text-slate-500 max-w-[135px] truncate">
                        {ref.referringClinic}
                      </div>
                    </td>
                    <td className="py-3 px-2.5 max-w-[180px]">
                      <div className="font-semibold text-slate-900 truncate">{ref.requiredServiceName}</div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {ref.coordinationNotes || ref.operationalConstraints}
                      </p>
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <UrgencyIndicator urgency={ref.urgencyLabel} />
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      <ReferralStatusIndicator status={ref.status} />
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openActionModal(ref, 'ACCEPTED')}
                          className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Accept</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openActionModal(ref, 'MORE_INFO_NEEDED')}
                          className="px-2 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <MessageSquareWarning className="w-3 h-3" />
                          <span>More Info</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openActionModal(ref, 'DECLINED')}
                          className="px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Decline</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReferralId(ref.id);
                            navigate('REFERRAL_TRACKING');
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                        >
                          Timeline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Current Service Capacity & Recent Updates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Current Service Capacity Overview */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-display font-bold text-slate-900">
                Current Reported Service Capacity
              </h2>
              <p className="text-xs text-slate-500">
                Live status visible to referring doctors in Davangere
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('SERVICE_CAPACITY_MANAGEMENT')}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              Edit Capacity →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">{svc.serviceName}</p>
                  <p className="text-[11px] text-slate-500">
                    {svc.serviceCategory} · <FreshnessTimestamp updatedAt={svc.updatedAt} />
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <CapacityIndicator status={svc.capacityStatus} compact />
                  <span className="text-slate-300">·</span>
                  <AcceptanceIndicator status={svc.referralAcceptance} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right 5 Cols: Recent Audit Updates */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-slate-900">
              Recent Facility Audit Log
            </h2>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {recentUpdates.slice(0, 6).map((log) => (
              <div key={log.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                  <span className="font-medium text-slate-700">{log.actorName}</span>
                  <FreshnessTimestamp updatedAt={log.timestamp} />
                </div>
                <p className="font-semibold text-slate-900">{log.action}</p>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5 truncate">
                  {log.oldValue} → {log.newValue}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Response Confirmation Modal */}
      {activeReferralForAction && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-response-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-mono text-sky-700 font-semibold">
                  REFERRAL COORDINATION RESPONSE
                </p>
                <h3
                  id="modal-response-title"
                  className="text-lg font-display font-bold text-slate-900"
                >
                  Respond to {activeReferralForAction.referralReference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReferralForAction(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Required Service:</strong> {activeReferralForAction.requiredServiceName}
              </p>
              <p>
                <strong>Referring Clinic:</strong> {activeReferralForAction.referringClinic} (
                {activeReferralForAction.createdByName})
              </p>
              <p>
                <strong>Synthetic Patient ID:</strong>{' '}
                <span className="font-mono">{activeReferralForAction.syntheticPatientRef}</span>
              </p>
            </div>

            <form onSubmit={handleConfirmResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Coordinator Decision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionStatus('ACCEPTED')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      actionStatus === 'ACCEPTED'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Accept Referral
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionStatus('MORE_INFO_NEEDED')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      actionStatus === 'MORE_INFO_NEEDED'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Request Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionStatus('DECLINED')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      actionStatus === 'DECLINED'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Decline
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="coordinator-response-note"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Official Coordinator Response Note *
                </label>
                <textarea
                  id="coordinator-response-note"
                  rows={3}
                  required
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReferralForAction(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  {submittingAction ? 'Saving Response...' : 'Confirm & Notify Referrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
