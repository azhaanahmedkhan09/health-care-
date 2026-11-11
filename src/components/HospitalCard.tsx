import React from 'react';
import { ArrowRight, Building2, MapPin, Phone } from 'lucide-react';
import type { EnrichedHospital } from '../types/models';
import {
  AcceptanceIndicator,
  CapacityIndicator,
  FreshnessTimestamp,
} from './StatusIndicators';

interface HospitalCardProps {
  hospital: EnrichedHospital;
  highlightedServiceId?: string;
  onViewDetails: (hospitalId: string) => void;
  onSendReferral?: (hospitalId: string, serviceId?: string) => void;
  showSendReferral?: boolean;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  highlightedServiceId,
  onViewDetails,
  onSendReferral,
  showSendReferral = true,
}) => {
  const highlightedService =
    highlightedServiceId && highlightedServiceId !== 'ALL'
      ? hospital.services.find((s) => s.serviceId === highlightedServiceId)
      : undefined;

  const displayedServices = highlightedService
    ? [
        highlightedService,
        ...hospital.services
          .filter((s) => s.id !== highlightedService.id)
          .slice(0, 3),
      ]
    : hospital.services.slice(0, 4);

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between transition-colors hover:border-slate-300">
      <div>
        {/* Top Metadata Line (Unboxed text with middot separators) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
          <div className="flex items-center gap-1.5 font-mono tabular-nums">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>{hospital.area}, Davangere</span>
            <span aria-hidden="true">·</span>
            <span>{hospital.distanceKm.toFixed(1)} km</span>
            <span aria-hidden="true">·</span>
            <span>{hospital.distanceBand}</span>
          </div>
          <FreshnessTimestamp updatedAt={hospital.updatedAt} />
        </div>

        {/* Hospital Name */}
        <h3 className="text-base font-semibold text-slate-900 leading-snug mb-1">
          {hospital.name}
        </h3>
        <p className="text-xs text-slate-500 mb-3">{hospital.address}</p>

        {/* Hospital-level acceptance & contact */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5 border-y border-slate-100 text-xs text-slate-600 mb-4">
          <AcceptanceIndicator status={hospital.referralAcceptance} />
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="inline-flex items-center gap-1 text-slate-600 font-mono tabular-nums">
            <Phone className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
            <span>{hospital.emergencyDeskPhone}</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-slate-500">Coord: {hospital.coordinatorName}</span>
        </div>

        {/* Reported Service & Capacity Rows */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Reported Medical Services ({hospital.services.length})</span>
            <span>Reported Capacity</span>
          </div>

          {displayedServices.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">
              No active service records listed for this campus.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg bg-slate-50/60 px-3">
              {displayedServices.map((svc) => {
                const isTarget =
                  highlightedServiceId && svc.serviceId === highlightedServiceId;
                return (
                  <div
                    key={svc.id}
                    className={`py-2 flex items-center justify-between gap-3 ${
                      isTarget ? 'font-semibold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs truncate">{svc.serviceName}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {svc.serviceCategory} · <FreshnessTimestamp updatedAt={svc.updatedAt} />
                      </p>
                    </div>
                    <CapacityIndicator status={svc.capacityStatus} compact />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onViewDetails(hospital.id)}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
        >
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>View Details</span>
        </button>

        {showSendReferral && onSendReferral && (
          <button
            type="button"
            onClick={() =>
              onSendReferral(
                hospital.id,
                highlightedService?.serviceId || hospital.services[0]?.serviceId
              )
            }
            disabled={hospital.referralAcceptance === 'NOT_ACCEPTING'}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <span>Send Referral</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
};
