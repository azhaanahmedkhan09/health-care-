import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  FilePlus2,
  MessageSquareWarning,
  Settings2,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { NotificationItem } from '../types/models';
import { FreshnessTimestamp } from '../components/StatusIndicators';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    refreshCoreData,
    navigate,
    setSelectedReferralId,
    setSelectedHospitalId,
    addToast,
  } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD'>('ALL');

  const displayed = notifications.filter((n) => (filterType === 'UNREAD' ? !n.read : true));

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead({ all: true });
      await refreshCoreData();
      addToast({
        type: 'info',
        title: 'All notifications marked as read',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenNotificationTarget = async (notif: NotificationItem) => {
    if (!notif.read) {
      await api.markNotificationsRead({ id: notif.id });
      await refreshCoreData();
    }
    if (notif.referralId) {
      setSelectedReferralId(notif.referralId);
      navigate('REFERRAL_TRACKING');
    } else if (notif.hospitalId) {
      setSelectedHospitalId(notif.hospitalId);
      navigate('HOSPITAL_DETAILS');
    }
  };

  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'NEW_REFERRAL':
        return <FilePlus2 className="w-4 h-4 text-sky-600 shrink-0" />;
      case 'REFERRAL_ACCEPTED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'REFERRAL_DECLINED':
        return <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
      case 'MORE_INFO_REQUESTED':
        return <MessageSquareWarning className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'CAPACITY_UPDATED':
      default:
        return <Settings2 className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-sky-700 mb-1">
            Real-Time Referral & Capacity Alerts · Davangere Coordination Network
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            Coordination Notifications
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('UNREAD')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'UNREAD'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread ({notifications.filter((n) => !n.read).length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Bell className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-900">No notifications in this view</p>
          <p className="text-xs text-slate-500">
            New referrals, coordinator responses, and capacity updates will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
          {displayed.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                notif.read ? 'bg-white' : 'bg-sky-50/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{renderIcon(notif.type)}</div>
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900">{notif.title}</span>
                    {!notif.read && (
                      <span className="font-mono text-[11px] font-bold text-sky-700">
                        · UNREAD
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                  <div className="mt-1.5">
                    <FreshnessTimestamp updatedAt={notif.createdAt} />
                  </div>
                </div>
              </div>

              {(notif.referralId || notif.hospitalId) && (
                <button
                  type="button"
                  onClick={() => handleOpenNotificationTarget(notif)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 self-start sm:self-center"
                >
                  {notif.referralId ? 'View Referral Timeline' : 'View Hospital Profile'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
