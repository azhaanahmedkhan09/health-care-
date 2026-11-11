import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Compass,
  FilePlus2,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { AuditLog, Referral } from '../types/models';
import {
  FreshnessTimestamp,
  ReferralStatusIndicator,
  UrgencyIndicator,
} from '../components/StatusIndicators';
import { HospitalCard } from '../components/HospitalCard';

export const ReferrerDashboardPage: React.FC = () => {
  const {
    user,
    hospitals,
    services,
    navigate,
    setSelectedHospitalId,
    setSelectedReferralId,
    setPreselectedServiceId,
    setPreselectedHospitalId,
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    pendingReferrals: 0,
    acceptedReferrals: 0,
    declinedReferrals: 0,
    moreInfoReferrals: 0,
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [quickServiceFilter, setQuickServiceFilter] = useState<string>('svc-cardiology');
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      try {
        const res = await api.getReferrerDashboard();
        if (!active) return;
        setStats(res.stats);
        setReferrals(res.referrals);
        setRecentActivity(res.recentActivity);
      } catch (err) {
        console.error('Error loading referrer dashboard:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const quickFilteredHospitals = hospitals
    .filter((h) => {
      const matchesService =
        !quickServiceFilter ||
        quickServiceFilter === 'ALL' ||
        h.services.some((s) => s.serviceId === quickServiceFilter);
      const matchesQuery =
        !quickSearchQuery.trim() ||
        h.name.toLowerCase().includes(quickSearchQuery.toLowerCase()) ||
        h.area.toLowerCase().includes(quickSearchQuery.toLowerCase());
      return matchesService && matchesQuery;
    })
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Referring Clinic Coordination Console · {user?.organization}
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Referring Doctor Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('MATCHED_RESULTS')}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
            <span>Compare Hospital Matches</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('CREATE_REFERRAL')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Create Referral Request</span>
          </button>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <section aria-label="Referral Summary Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Referrals</p>
          <p className="text-3xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1">
            {loading ? '—' : stats.totalReferrals}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Active & historical Davangere requests
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pending & More Info</p>
          <p className="text-3xl font-display font-bold font-mono tabular-nums text-sky-700 mt-1">
            {loading ? '—' : stats.pendingReferrals + stats.moreInfoReferrals}
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono tabular-nums">
            {stats.pendingReferrals} awaiting review · {stats.moreInfoReferrals} need info
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Accepted Referrals</p>
          <p className="text-3xl font-display font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {loading ? '—' : stats.acceptedReferrals}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Coordinator confirmed service readiness
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Declined Referrals</p>
          <p className="text-3xl font-display font-bold font-mono tabular-nums text-red-700 mt-1">
            {loading ? '—' : stats.declinedReferrals}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Standby hospital options ready to review
          </p>
        </div>
      </section>

      {/* Full-Width Referral Status Overview Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Referral Status Overview
            </h2>
            <p className="text-xs text-slate-500">
              Select any referral to inspect its timeline, coordinator notes, or alternative hospitals
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('REFERRAL_TRACKING')}
            className="text-xs font-semibold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>View Full Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-5">Referral ID</th>
                <th className="py-3 px-4">Required Service</th>
                <th className="py-3 px-4">Receiving Hospital</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {referrals.map((ref) => (
                <tr
                  key={ref.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3 px-5 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    <div>{ref.referralReference}</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      Ref: {ref.syntheticPatientRef}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{ref.requiredServiceName}</div>
                    <div className="text-[11px] text-slate-500">{ref.requiredServiceCategory}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 max-w-[260px] truncate">
                      {ref.receivingHospitalName}
                    </div>
                    <div className="text-[11px] text-slate-500">{ref.receivingHospitalArea}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <UrgencyIndicator urgency={ref.urgencyLabel} />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <ReferralStatusIndicator status={ref.status} />
                  </td>
                  <td className="py-3 px-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReferralId(ref.id);
                        navigate('REFERRAL_TRACKING');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                    >
                      {ref.status === 'DECLINED' ? 'Review Alternatives' : 'Track Timeline'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Coordination Activity Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Recent Coordination Activity
            </h2>
            <p className="text-xs text-slate-500">
              Latest audit-logged referral and capacity transitions across Davangere
            </p>
          </div>
          <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentActivity.slice(0, 4).map((item) => (
            <div key={item.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-1">
                <span className="font-medium text-slate-700 truncate">{item.actorName}</span>
                <FreshnessTimestamp updatedAt={item.timestamp} />
              </div>
              <p className="text-xs font-semibold text-slate-900 line-clamp-1">{item.action}</p>
              <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums truncate">
                {item.newValue}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Hospital Search Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900">
              Quick Hospital Capacity Lookup (Davangere)
            </h2>
            <p className="text-xs text-slate-500">
              Preview service availability and reported capacity before initiating a referral
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="search"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Filter by hospital or area..."
                aria-label="Filter hospitals by name or area"
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>

            <select
              value={quickServiceFilter}
              onChange={(e) => setQuickServiceFilter(e.target.value)}
              aria-label="Select medical service for quick lookup"
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
            >
              <option value="ALL">All Medical Services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.category}: {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => navigate('HOSPITAL_SEARCH')}
              className="px-3.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Full Directory ({hospitals.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickFilteredHospitals.map((hosp) => (
            <HospitalCard
              key={hosp.id}
              hospital={hosp}
              highlightedServiceId={quickServiceFilter}
              onViewDetails={(id) => {
                setSelectedHospitalId(id);
                navigate('HOSPITAL_DETAILS');
              }}
              onSendReferral={(hospId, svcId) => {
                setPreselectedHospitalId(hospId);
                if (svcId) setPreselectedServiceId(svcId);
                navigate('CREATE_REFERRAL');
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
