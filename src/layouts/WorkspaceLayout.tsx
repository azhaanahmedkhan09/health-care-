import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Compass,
  FilePlus2,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp, type ScreenName } from '../context/AppContext';

const SCREEN_LABELS: Record<ScreenName, string> = {
  LANDING: 'Platform Overview',
  LOGIN: 'Authentication',
  REFERRER_DASHBOARD: 'Referrer Dashboard',
  HOSPITAL_SEARCH: 'Hospital Search & Capacity Directory',
  HOSPITAL_DETAILS: 'Hospital Profile & Service Catalogue',
  CREATE_REFERRAL: 'Create Referral Request',
  MATCHED_RESULTS: 'Matched Hospital Results',
  COORDINATOR_DASHBOARD: 'Hospital Coordinator Dashboard',
  SERVICE_CAPACITY_MANAGEMENT: 'Service & Capacity Management',
  REFERRAL_TRACKING: 'Referral Tracking & Timeline',
  NOTIFICATIONS: 'Coordination Notifications',
  ANALYTICS: 'Prototype Analytics Dashboard',
};

export const WorkspaceLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    screen,
    navigate,
    notifications,
    logout,
    loginWithDemo,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const isCoordinator = user?.role === 'HOSPITAL_COORDINATOR';

  const navItems: {
    id: ScreenName;
    label: string;
    icon: React.FC<{ className?: string }>;
    badgeCount?: number;
  }[] = isCoordinator
    ? [
        {
          id: 'COORDINATOR_DASHBOARD',
          label: 'Coordinator Dashboard',
          icon: LayoutDashboard,
        },
        {
          id: 'SERVICE_CAPACITY_MANAGEMENT',
          label: 'Service & Capacity',
          icon: Settings2,
        },
        {
          id: 'REFERRAL_TRACKING',
          label: 'Referral Timeline',
          icon: ClipboardList,
        },
        {
          id: 'HOSPITAL_SEARCH',
          label: 'Regional Directory',
          icon: Building2,
        },
        {
          id: 'NOTIFICATIONS',
          label: 'Notifications',
          icon: Bell,
          badgeCount: unreadCount,
        },
        {
          id: 'ANALYTICS',
          label: 'Analytics',
          icon: BarChart3,
        },
      ]
    : [
        {
          id: 'REFERRER_DASHBOARD',
          label: 'Referrer Dashboard',
          icon: LayoutDashboard,
        },
        {
          id: 'HOSPITAL_SEARCH',
          label: 'Hospital Search',
          icon: Search,
        },
        {
          id: 'CREATE_REFERRAL',
          label: 'Create Referral',
          icon: FilePlus2,
        },
        {
          id: 'MATCHED_RESULTS',
          label: 'Matched Hospitals',
          icon: Compass,
        },
        {
          id: 'REFERRAL_TRACKING',
          label: 'Referral Tracking',
          icon: ClipboardList,
        },
        {
          id: 'NOTIFICATIONS',
          label: 'Notifications',
          icon: Bell,
          badgeCount: unreadCount,
        },
        {
          id: 'ANALYTICS',
          label: 'Analytics',
          icon: BarChart3,
        },
      ];

  const handleQuickRoleSwitch = async () => {
    if (!user || switchingRole) return;
    setSwitchingRole(true);
    try {
      const targetRole =
        user.role === 'REFERRING_DOCTOR' ? 'HOSPITAL_COORDINATOR' : 'REFERRING_DOCTOR';
      await loginWithDemo(targetRole);
    } finally {
      setSwitchingRole(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-slate-900 text-slate-100 border-r border-slate-800 justify-between">
        <div>
          {/* Brand Header */}
          <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('LANDING')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shrink-0">
                <Activity className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap">
                ReliefLedger Health
              </span>
            </button>
          </div>

          {/* Active User Card */}
          {user && (
            <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-sky-400 shrink-0">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-sky-400 truncate">
                    {user.role === 'HOSPITAL_COORDINATOR'
                      ? 'Receiving Coordinator'
                      : 'Referring Doctor'}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate" title={user.organization}>
                {user.organization}
              </p>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1" aria-label="Workspace Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                    <span className="font-mono tabular-nums text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Demo Role Switcher & Sign Out */}
        <div className="p-4 border-t border-slate-800 space-y-2.5">
          <div className="p-3 rounded-lg bg-slate-800/70 border border-slate-700/70">
            <p className="text-[11px] font-medium text-slate-300 mb-2">
              Hackathon Evaluation Mode
            </p>
            <button
              type="button"
              onClick={handleQuickRoleSwitch}
              disabled={switchingRole}
              className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <GitCompareArrows className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {isCoordinator ? 'Switch to Referring Doctor' : 'Switch to Coordinator'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, 1-2 Actions on Right */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200"
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="font-semibold text-slate-900 hidden sm:inline">
                {isCoordinator ? 'Receiving Coordinator Workspace' : 'Referring Clinic Workspace'}
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-700 truncate">
                {SCREEN_LABELS[screen]}
              </span>
              <span aria-hidden="true" className="hidden md:inline">
                ·
              </span>
              <span className="hidden md:inline text-slate-500">
                Davangere Region (Fictional Demo Data)
              </span>
            </div>
          </div>

          {/* Right Actions (Max 2 controls) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => navigate('NOTIFICATIONS')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Bell className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Alerts ({unreadCount})</span>
            </button>

            {isCoordinator ? (
              <button
                type="button"
                onClick={() => navigate('SERVICE_CAPACITY_MANAGEMENT')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Settings2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Update Capacity</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('CREATE_REFERRAL')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Create Referral</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Slide-Over Menu */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="w-72 max-w-[85vw] bg-slate-900 text-white h-full flex flex-col justify-between p-4">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <span className="font-display font-bold text-base">ReliefLedger Health</span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="mt-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = screen === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigate(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium ${
                          isActive
                            ? 'bg-sky-600 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </span>
                        {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                          <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-semibold">
                            {item.badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={handleQuickRoleSwitch}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-900 bg-sky-400 rounded-lg inline-flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>
                    {isCoordinator ? 'Switch to Referring Doctor' : 'Switch to Coordinator'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-lg inline-flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 px-4 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        {/* Mandatory Clinical Safety & Demonstration Notice Footer */}
        <footer className="bg-white border-t border-slate-200 px-4 lg:px-8 py-3.5 text-xs text-slate-500">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" aria-hidden="true" />
              <span>
                <strong>Clinical Safety Notice:</strong> Reported service availability and capacity do not guarantee hospital admission, bed assignment, or clinical suitability. Always confirm directly with the receiving hospital desk before patient transfer.
              </span>
            </p>
            <span className="text-slate-400 whitespace-nowrap shrink-0">
              Davangere Regional Prototype · Fictional Demo Dataset
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
