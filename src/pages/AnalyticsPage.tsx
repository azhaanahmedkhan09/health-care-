import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import type { AnalyticsSummary } from '../types/models';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setAnalytics(res.analytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !analytics) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
        Computing prototype referral coordination metrics...
      </div>
    );
  }

  if (!analytics) return null;

  const filteredDistribution =
    selectedCategoryFilter === 'ALL'
      ? analytics.serviceDistribution
      : analytics.serviceDistribution.filter((d) => d.category === selectedCategoryFilter);

  const maxServiceTotal = Math.max(
    1,
    ...analytics.serviceDistribution.map((d) => d.total)
  );

  const totalCap = Math.max(1, analytics.totalServiceRecordsCount);
  const availPct = Math.round((analytics.capacityBreakdown.available / totalCap) * 100);
  const limPct = Math.round((analytics.capacityBreakdown.limited / totalCap) * 100);
  const unconfPct = Math.round((analytics.capacityBreakdown.unconfirmed / totalCap) * 100);
  const unavailPct = Math.max(0, 100 - availPct - limPct - unconfPct);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Regional Referral Coordination Telemetry · Fictional Davangere Demonstration Data
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Analytics & Operational Freshness Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recalculate Live Metrics</span>
        </button>
      </div>

      {/* 6 Primary Prototype Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Referrals</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analytics.totalReferrals}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Demo requests logged</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Acceptance Rate</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {analytics.acceptanceRate}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {analytics.acceptedCount} accepted requests
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Decline Rate</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-red-700 mt-1">
            {analytics.declineRate}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {analytics.declinedCount} declined (with alternatives)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Pending Requests</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-sky-700 mt-1">
            {analytics.pendingCount + analytics.moreInfoCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {analytics.pendingCount} pending · {analytics.moreInfoCount} info needed
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Avg Response Time</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900 mt-1">
            {analytics.averageResponseTimeMinutes} min
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Coordinator turnaround</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Stale Service Records</p>
          <p className="text-2xl font-display font-bold font-mono tabular-nums text-amber-700 mt-1">
            {analytics.staleServiceRecordsCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            Older than 24h (of {analytics.totalServiceRecordsCount})
          </p>
        </div>
      </section>

      {/* Interactive Service-Wise Referral Distribution Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-700" />
                <span>Service-Wise Referral Distribution (Demo Data)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Breakdown of referrals by medical specialty and coordinator response outcome
              </p>
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              aria-label="Filter chart by medical specialty"
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All 8 Service Categories</option>
              {analytics.serviceDistribution.map((s) => (
                <option key={s.serviceId} value={s.category}>
                  {s.category}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {filteredDistribution.map((item) => {
              const barWidthPct = Math.max(8, Math.round((item.total / maxServiceTotal) * 100));
              return (
                <div key={item.serviceId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      {item.category} — <span className="font-normal text-slate-600">{item.serviceName}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {item.total} {item.total === 1 ? 'referral' : 'referrals'}
                    </span>
                  </div>

                  {/* Interactive Visual Bar */}
                  <div className="w-full h-3 bg-slate-100 rounded-md overflow-hidden flex">
                    <div
                      className="bg-sky-700 h-full transition-opacity"
                      style={{ width: `${barWidthPct}%` }}
                      title={`${item.total} total referrals`}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono tabular-nums">
                    <span className="text-emerald-700">Accepted: {item.accepted}</span>
                    <span>·</span>
                    <span className="text-sky-700">Pending: {item.pending}</span>
                    <span>·</span>
                    <span className="text-amber-700">More Info: {item.moreInfo}</span>
                    <span>·</span>
                    <span className="text-red-700">Declined: {item.declined}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right 5 Cols: Regional Hospital Capacity Breakdown & Stale Records Notice */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-display font-bold text-slate-900">
              Regional Service Capacity Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Distribution across {analytics.totalServiceRecordsCount} listed hospital service
              records in Davangere
            </p>

            {/* Stacked Progress Bar */}
            <div className="w-full h-4 rounded-lg overflow-hidden flex border border-slate-200">
              <div
                className="bg-emerald-600 h-full"
                style={{ width: `${availPct}%` }}
                title={`Available: ${analytics.capacityBreakdown.available}`}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${limPct}%` }}
                title={`Limited: ${analytics.capacityBreakdown.limited}`}
              />
              <div
                className="bg-slate-400 h-full"
                style={{ width: `${unconfPct}%` }}
                title={`Unconfirmed: ${analytics.capacityBreakdown.unconfirmed}`}
              />
              <div
                className="bg-red-600 h-full"
                style={{ width: `${unavailPct}%` }}
                title={`Unavailable: ${analytics.capacityBreakdown.unavailable}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono tabular-nums">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <p className="text-emerald-700 font-semibold">Available</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {analytics.capacityBreakdown.available} ({availPct}%)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <p className="text-amber-700 font-semibold">Limited Capacity</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {analytics.capacityBreakdown.limited} ({limPct}%)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <p className="text-slate-600 font-semibold">Unconfirmed</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {analytics.capacityBreakdown.unconfirmed} ({unconfPct}%)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                <p className="text-red-700 font-semibold">Unavailable</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">
                  {analytics.capacityBreakdown.unavailable} ({unavailPct}%)
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Information Freshness & Stale Record Monitoring</span>
            </div>
            <p className="text-amber-900 leading-relaxed">
              Currently <strong>{analytics.staleServiceRecordsCount}</strong> hospital service
              records have not been updated within the past 24 hours. ReliefLedger Health
              automatically deprioritizes stale records in the 3-step matching engine and prompts
              referring clinics to verify by phone.
            </p>
            <p className="text-[11px] text-amber-800 flex items-center gap-1 pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>All analytics above represent fictional Davangere demonstration data.</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
