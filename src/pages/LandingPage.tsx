import React from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LandingPage: React.FC = () => {
  const { user, navigate, loginWithDemo } = useApp();

  const handlePrimaryStart = () => {
    if (user) {
      navigate(
        user.role === 'HOSPITAL_COORDINATOR' ? 'COORDINATOR_DASHBOARD' : 'REFERRER_DASHBOARD'
      );
    } else {
      navigate('LOGIN');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 Zones Separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-slate-200 bg-white sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          ReliefLedger Health
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          aria-label="Landing Navigation"
        >
          <a
            href="#how-it-works"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Capabilities
          </a>
          <a
            href="#benefits"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Regional Network
          </a>
          <a
            href="#safety"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Privacy & Safety
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryStart}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {user ? 'Open Workspace' : 'Get Started'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="px-6 lg:px-12 py-12 lg:py-20 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-700 mb-3">
                Davangere Regional Healthcare Coordination Prototype · Fictional Demo Dataset
              </p>

              <h1 className="font-display font-bold text-slate-900 text-4xl sm:text-5xl leading-[1.12] tracking-tight mb-5">
                Smarter Hospital Referrals. Clearer Coordination.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-xl">
                ReliefLedger Health connects referring clinics, physicians, and receiving hospital
                coordinators with transparent service availability, reported department capacity,
                information freshness timestamps, and explainable hospital alternatives—so declined
                or delayed referrals never force you to restart your search from scratch.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrimaryStart}
                  className="px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => loginWithDemo('REFERRING_DOCTOR')}
                  className="px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Stethoscope className="w-4 h-4 text-sky-700" aria-hidden="true" />
                  <span>Demo: Referring Doctor</span>
                </button>

                <button
                  type="button"
                  onClick={() => loginWithDemo('HOSPITAL_COORDINATOR')}
                  className="px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Building2 className="w-4 h-4 text-sky-700" aria-hidden="true" />
                  <span>Demo: Hospital Coordinator</span>
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Clinical Disclaimer: ReliefLedger Health supports administrative referral
                coordination. It does not guarantee hospital admission, bed availability, or
                clinical suitability.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
              <img
                src="/src/assets/images/hero_referral_coordination_1794383295727.jpg"
                alt="Clinicians and hospital coordinators reviewing referral capacity in a modern coordination center"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent flex flex-col justify-end p-6 text-white">
                <p className="text-xs font-mono tabular-nums text-sky-300 mb-1">
                  LIVE COORDINATION SNAPSHOT · DAVANGERE NETWORK (DEMO)
                </p>
                <p className="text-sm font-semibold">
                  Required service listed · Capacity available · Accepting referrals · Updated 11 min ago
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Transparent, rule-based hospital matching with full response audit history.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Operational Summary Strip Below Hero */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-slate-200">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 mb-1">Fictional Network Scope</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
              8 Campuses
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Across Central, Urban Ring & Highway Corridors in Davangere
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 mb-1">Medical Service Catalogue</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
              8 Specialties
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Cardiology · Neurology · Ortho · Emergency · Radiology · Dialysis · Surgery · Pediatrics
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 mb-1">Matching Transparency</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
              3-Step Rules
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Hard filters, separate operational status, and explainable ranking reasons
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-xs text-slate-500 mb-1">Patient Data Minimization</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
              Synthetic IDs
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Zero unnecessary patient PII stored during initial referral routing
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-slate-50 border-y border-slate-200 py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-sky-700 mb-2">Workflow Architecture</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
              How ReliefLedger Health Coordinates Referrals Without Dead Ends
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Traditional phone-tree referrals fail when a hospital lacks the required sub-service,
              reaches shift capacity, or relies on stale directory listings. Our 3-step coordination
              loop keeps both sides synchronized.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono tabular-nums font-semibold text-sky-700 mb-2">
                01. Hard Filters & Freshness Verification
              </p>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Verify Service Listing & Timestamp Age
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Search across Davangere facilities by required medical service, area, and reported
                capacity. Every service record displays the exact minute or hour it was last updated
                and flags records older than 24 hours as stale.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono tabular-nums font-semibold text-sky-700 mb-2">
                02. Explainable Hospital Matching
              </p>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Separate Capacity from Referral Acceptance
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unavailable services are filtered out automatically. Remaining hospitals are ordered
                transparently by reported capacity, coordinator acceptance status, distance band, and
                freshness—never by opaque black-box scores.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono tabular-nums font-semibold text-sky-700 mb-2">
                03. Closed-Loop Response & Instant Redirection
              </p>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                Track Responses & Pivot to Alternatives
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receiving hospital coordinators accept, decline, or request additional clinical
                details with a single action. If a request is declined due to sudden ward occupancy,
                referring doctors immediately redirect to pre-matched standby hospitals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features & Benefits Bento Grid */}
      <section id="features" className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900 text-white rounded-2xl p-8">
            <div>
              <p className="text-xs font-mono text-sky-400 mb-2">
                ROLE-ISOLATED CLINICAL WORKSPACES
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-4">
                Built for Both Sides of the Referral Desk
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Referring physicians and receiving hospital coordinators have distinct operational
                priorities. ReliefLedger Health provides dedicated, role-protected views backed by a
                single shared database and immutable audit log.
              </p>

              <div id="benefits" className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-sky-400" aria-hidden="true" />
                    <span>For Referring Clinics & Doctors</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Compare reported capacity and acceptance before calling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Submit structured referrals using synthetic patient IDs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Switch to standby matched hospitals in one click if declined</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" aria-hidden="true" />
                    <span>For Receiving Hospital Coordinators</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Publish Available, Limited, Unconfirmed, or Unavailable status</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Accept, decline, or request additional vitals/labs with notes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Automatic audit logging of actor, timestamp, old & new values</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                Try the live end-to-end Davangere workflow across both roles
              </span>
              <button
                type="button"
                onClick={() => navigate('LOGIN')}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
              >
                Explore Demo Accounts
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
            <img
              src="/src/assets/images/davangere_regional_network_1794383297031.jpg"
              alt="Fictional regional multi-specialty hospital campus in Davangere"
              referrerPolicy="no-referrer"
              className="w-full h-56 object-cover border-b border-slate-200"
            />
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-sky-700 mb-1">
                  Regional Demonstration Dataset
                </p>
                <h3 className="text-lg font-display font-bold text-slate-900 mb-2">
                  Davangere, Karnataka Coordination Sandbox
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Includes 8 fictional hospitals across PJ Extension, MCC B Block, Shamanur Road,
                  Vidyanagar, Nittuvalli, Hadadi Road, and Kunduwada—complete with live capacity
                  variations, fresh and stale timestamps, and pre-populated referral timelines.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-sky-700" />
                  <span>Explainable Ranking</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-700" />
                  <span>Freshness Tracking</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Safety Section */}
      <section id="safety" className="bg-slate-50 border-t border-slate-200 py-14 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck className="w-6 h-6 text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900">
                  Healthcare Safety, Non-Guarantee & Data Privacy Boundaries
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory operational guardrails enforced throughout ReliefLedger Health
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed">
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  1. No Clinical Guarantee or Triage Replacement
                </p>
                <p>
                  ReliefLedger Health is an administrative referral coordination tool, not a
                  clinical decision support system. It never diagnoses patients, recommends medical
                  treatments, or replaces emergency dispatch services.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  2. Reported Capacity vs. Confirmed Admission
                </p>
                <p>
                  Reported service availability and capacity reflect point-in-time coordinator
                  updates. They never guarantee bed assignment, immediate admission, or clinical
                  suitability. Users are always directed to contact the receiving hospital desk.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  3. Synthetic Identifiers & Fictional Demo Scope
                </p>
                <p>
                  Referrals use synthetic reference codes (e.g., <code className="font-mono">SYN-DVG-4081</code>)
                  to practice strict data minimization. All hospitals, coordinators, phone numbers,
                  and clinical scenarios in this prototype represent fictional demonstration data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-6 lg:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-700" aria-hidden="true" />
            <span className="font-display font-bold text-slate-900">ReliefLedger Health</span>
            <span aria-hidden="true">·</span>
            <span>Hospital Referral Coordination Platform (Fictional Demo)</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="hover:text-slate-900">
              How It Works
            </a>
            <a href="#features" className="hover:text-slate-900">
              Capabilities
            </a>
            <a href="#safety" className="hover:text-slate-900">
              Safety & Privacy
            </a>
            <button
              type="button"
              onClick={handlePrimaryStart}
              className="font-semibold text-sky-700 hover:text-sky-800"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
