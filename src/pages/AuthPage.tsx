import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { UserRole } from '../types/models';
import { signInWithGooglePopup } from '../services/firebaseClient';
import { api, setAuthToken } from '../services/api';

export const AuthPage: React.FC = () => {
  const {
    navigate,
    hospitals,
    loginWithDemo,
    loginWithCredentials,
    registerAccount,
    refreshCoreData,
    addToast,
  } = useApp();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  const [role, setRole] = useState<UserRole>('REFERRING_DOCTOR');
  const [email, setEmail] = useState('doctor.demo@reliefledger.example');
  const [password, setPassword] = useState('DemoPassword123!');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [hospitalId, setHospitalId] = useState('hosp-1');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccessEmail, setResetSuccessEmail] = useState<string | null>(null);

  const handleRolePresetChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setError(null);
    if (mode === 'LOGIN') {
      if (nextRole === 'HOSPITAL_COORDINATOR') {
        setEmail('coordinator.demo@reliefledger.example');
        setPassword('DemoPassword123!');
      } else {
        setEmail('doctor.demo@reliefledger.example');
        setPassword('DemoPassword123!');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'FORGOT') {
      if (!email || !email.includes('@')) {
        setError('Please enter a valid professional email address.');
        return;
      }
      setResetSuccessEmail(email.trim());
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'LOGIN') {
        await loginWithCredentials(email, password);
      } else {
        await registerAccount({
          name,
          email,
          password,
          role,
          organization:
            organization ||
            (role === 'HOSPITAL_COORDINATOR'
              ? hospitals.find((h) => h.id === hospitalId)?.name
              : 'Davangere Regional Partner Clinic (Demo)'),
          hospitalId: role === 'HOSPITAL_COORDINATOR' ? hospitalId : undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoQuickLogin = async (demoRole: UserRole) => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithDemo(demoRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const fbUser = await signInWithGooglePopup();
      if (fbUser && fbUser.email) {
        const { token } = await api.firebaseSync({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || undefined,
          role,
        });
        setAuthToken(token);
        await refreshCoreData();
        window.location.reload();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Google Sign-In notice: ${err.message}. You can use the 1-click Demo Login buttons below for instant evaluation.`
          : 'Google Sign-In could not complete.'
      );
      addToast({
        type: 'info',
        title: 'Use Demo Login for Instant Evaluation',
        message: 'Click Demo Referring Doctor or Demo Hospital Coordinator below.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="px-6 lg:px-12 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('LANDING')}
          className="inline-flex items-center gap-2 text-sm font-display font-bold text-slate-900 hover:text-sky-700 transition-colors"
        >
          <Activity className="w-4 h-4 text-sky-700" aria-hidden="true" />
          <span>ReliefLedger Health</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('LANDING')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Overview</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Instant Demo Evaluation Card */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 lg:p-7 border border-slate-800">
            <p className="text-xs font-mono text-sky-400 mb-2">
              HACKATHON DEMO ACCOUNTS
            </p>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              One-Click Role Demonstration
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Select either pre-configured Davangere demonstration account to test the complete
              referral workflow, or use the credentials form. Both roles share the same live
              persistent database.
            </p>

            <div className="space-y-3">
              {/* Demo Account 1: Referring Doctor */}
              <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700">
                <div className="flex items-center gap-3 mb-2.5">
                  <img
                    src="/src/assets/images/avatar_doctor_referrer_1794383297836.jpg"
                    alt="Dr. Anitha Sharma"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-slate-600 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Dr. Anitha Sharma (Demo)
                    </p>
                    <p className="text-[11px] text-sky-400">
                      Role A · Referring Clinic / Doctor
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 mb-3">
                  Davangere Community Polyclinic (PJ Extension). Search hospitals, compare
                  capacity, submit referrals, and review alternatives.
                </p>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoQuickLogin('REFERRING_DOCTOR')}
                  className="w-full py-2 px-3 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign In as Demo Referring Doctor</span>
                </button>
              </div>

              {/* Demo Account 2: Receiving Hospital Coordinator */}
              <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700">
                <div className="flex items-center gap-3 mb-2.5">
                  <img
                    src="/src/assets/images/avatar_hospital_coordinator_1794383298931.jpg"
                    alt="Suresh Kumar"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-slate-600 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Suresh Kumar (Demo)
                    </p>
                    <p className="text-[11px] text-emerald-400">
                      Role B · Receiving Hospital Coordinator
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 mb-3">
                  Bapuji Regional Demo Medical Centre. Manage service capacity, accept or decline
                  incoming referrals, and maintain audit logs.
                </p>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoQuickLogin('HOSPITAL_COORDINATOR')}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign In as Demo Coordinator</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Standard Login / Registration / Forgot Password Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 lg:p-8">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                  setResetSuccessEmail(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'LOGIN'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setError(null);
                  setResetSuccessEmail(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'REGISTER'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('FORGOT');
                  setError(null);
                  setResetSuccessEmail(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'FORGOT'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reset Password
              </button>
            </div>

            <h1 className="text-xl font-display font-bold text-slate-900 mb-1">
              {mode === 'LOGIN'
                ? 'Authorized Healthcare Sign In'
                : mode === 'REGISTER'
                  ? 'Register Referral Coordination Account'
                  : 'Password Recovery Request'}
            </h1>
            <p className="text-xs text-slate-500 mb-6">
              {mode === 'LOGIN'
                ? 'Select your operational role and enter your credentials.'
                : mode === 'REGISTER'
                  ? 'Create a role-specific demo profile for Davangere referral coordination.'
                  : 'Enter your registered email address to receive password reset instructions.'}
            </p>

            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
              >
                {error}
              </div>
            )}

            {resetSuccessEmail && mode === 'FORGOT' && (
              <div
                role="status"
                className="mb-5 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1"
              >
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password Reset Instructions Dispatched (Demo)</span>
                </p>
                <p>
                  A recovery link for <strong className="font-mono">{resetSuccessEmail}</strong> has
                  been logged. For immediate demo access, use password{' '}
                  <code className="font-mono font-semibold">DemoPassword123!</code> or the one-click
                  demo buttons.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              {mode !== 'FORGOT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select User Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleRolePresetChange('REFERRING_DOCTOR')}
                      className={`p-3 rounded-lg border text-left transition-colors flex items-start gap-2.5 ${
                        role === 'REFERRING_DOCTOR'
                          ? 'border-sky-600 bg-sky-50/70 text-slate-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Stethoscope className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          Referring Clinic / Doctor
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Search capacity & send referrals
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRolePresetChange('HOSPITAL_COORDINATOR')}
                      className={`p-3 rounded-lg border text-left transition-colors flex items-start gap-2.5 ${
                        role === 'HOSPITAL_COORDINATOR'
                          ? 'border-sky-600 bg-sky-50/70 text-slate-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          Hospital Coordinator
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Manage capacity & incoming requests
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {mode === 'REGISTER' && (
                <>
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Full Name & Credentials
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Dr. Rajeshwari Hegde"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  {role === 'HOSPITAL_COORDINATOR' ? (
                    <div>
                      <label
                        htmlFor="auth-hospital"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Assigned Receiving Hospital (Davangere Demo)
                      </label>
                      <select
                        id="auth-hospital"
                        value={hospitalId}
                        onChange={(e) => setHospitalId(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-600"
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} ({h.area})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="auth-org"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Referring Clinic / Practice Name
                      </label>
                      <input
                        id="auth-org"
                        type="text"
                        required
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="e.g., PJ Extension Family & Cardiac Clinic (Demo)"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Professional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@clinic.example"
                    className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              {mode !== 'FORGOT' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Password
                    </label>
                    {mode === 'LOGIN' && (
                      <button
                        type="button"
                        onClick={() => setMode('FORGOT')}
                        className="text-xs text-sky-700 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                {mode === 'LOGIN' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{submitting ? 'Signing In...' : 'Sign In to Workspace'}</span>
                  </>
                ) : mode === 'REGISTER' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{submitting ? 'Creating Account...' : 'Create Account & Continue'}</span>
                  </>
                ) : (
                  <span>Send Recovery Instructions</span>
                )}
              </button>
            </form>

            {mode !== 'FORGOT' && (
              <div className="mt-5 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="w-full py-2 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
                >
                  <span>Continue with Google (Firebase Auth)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-700" />
          <span>
            Role-based access control enabled · Fictional Davangere healthcare demonstration
          </span>
        </span>
      </footer>
    </div>
  );
};
