import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageSquareWarning,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type {
  CapacityStatus,
  HospitalAcceptanceStatus,
  ReferralStatus,
  ServiceAcceptanceStatus,
  UrgencyLabel,
} from '../types/models';
import { formatFreshness } from '../utils/matchingEngine';

export const CapacityIndicator: React.FC<{
  status: CapacityStatus;
  compact?: boolean;
}> = ({ status, compact = false }) => {
  switch (status) {
    case 'AVAILABLE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>{compact ? 'Available' : 'Capacity Available'}</span>
        </span>
      );
    case 'LIMITED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
          <span>{compact ? 'Limited' : 'Capacity Limited'}</span>
        </span>
      );
    case 'UNCONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <span>{compact ? 'Unconfirmed' : 'Capacity Unconfirmed'}</span>
        </span>
      );
    case 'UNAVAILABLE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0">
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
          <span>{compact ? 'Unavailable' : 'Capacity Unavailable'}</span>
        </span>
      );
  }
};

export const AcceptanceIndicator: React.FC<{
  status: HospitalAcceptanceStatus | ServiceAcceptanceStatus;
}> = ({ status }) => {
  if (status === 'ACCEPTING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>Accepting Referrals</span>
      </span>
    );
  }
  if (status === 'LIMITED_REVIEW' || status === 'PENDING_REVIEW') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>Coordinator Review Required</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap shrink-0">
      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
      <span>Not Accepting Referrals</span>
    </span>
  );
};

export const ReferralStatusIndicator: React.FC<{ status: ReferralStatus }> = ({ status }) => {
  switch (status) {
    case 'ACCEPTED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>Accepted</span>
        </span>
      );
    case 'DECLINED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0">
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
          <span>Declined</span>
        </span>
      );
    case 'MORE_INFO_NEEDED':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap shrink-0">
          <MessageSquareWarning className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
          <span>More Info Needed</span>
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" aria-hidden="true" />
          <span>Pending Review</span>
        </span>
      );
  }
};

export const UrgencyIndicator: React.FC<{ urgency: UrgencyLabel }> = ({ urgency }) => {
  if (urgency === 'URGENT_TRANSFER') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0">
        <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" aria-hidden="true" />
        <span>Urgent Transfer</span>
      </span>
    );
  }
  if (urgency === 'PRIORITY') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>Priority</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
      <span>Routine</span>
    </span>
  );
};

export const FreshnessTimestamp: React.FC<{ updatedAt: string }> = ({ updatedAt }) => {
  const freshness = formatFreshness(updatedAt);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums whitespace-nowrap shrink-0 ${
        freshness.isStale ? 'text-amber-700 font-medium' : 'text-slate-500'
      }`}
      title={`Last updated at ${new Date(updatedAt).toLocaleString()}`}
    >
      <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{freshness.label}</span>
    </span>
  );
};
