import React, { useState } from 'react';
import { usePOS, validatePasswordFormat } from '../../context/POSContext';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Building2,
  KeyRound,
  UserPlus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  X,
} from 'lucide-react';

export const LoginPortal: React.FC = () => {
  const {
    login,
    registerUser,
    settings,
    recoverySession,
    requestPasswordRecoveryOtp,
    verifyOtpAndResetPassword,
    cancelRecoverySession,
  } = usePOS();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals for Forgot Password and Create New Account
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Forgot Password / OTP State
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [recoverNewPass, setRecoverNewPass] = useState('');
  const [recoverConfirmPass, setRecoverConfirmPass] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);

  // Register Account State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // 2-minute OTP countdown timer
  React.useEffect(() => {
    if (!recoverySession) return;
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((recoverySession.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [recoverySession]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = login(identifier, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    }, 250);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverSuccess('');
    const res = requestPasswordRecoveryOtp(recoverIdentifier);
    if (res.success && res.session) {
      setRecoverSuccess(res.message);
      setSecondsRemaining(120);
    } else {
      setRecoverError(res.message);
    }
  };

  const handleVerifyOtpAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverSuccess('');

    if (secondsRemaining <= 0) {
      setRecoverError('The OTP period (2 minutes) has expired! Please request a new OTP.');
      return;
    }
    if (enteredOtp.length !== 6) {
      setRecoverError('Please enter the 6-digit OTP code.');
      return;
    }
    if (recoverNewPass !== recoverConfirmPass) {
      setRecoverError('New password and confirm password do not match.');
      return;
    }
    const check = validatePasswordFormat(recoverNewPass);
    if (!check.valid) {
      setRecoverError(check.message || 'Password must be 8-16 characters containing letters and numbers.');
      return;
    }

    const res = verifyOtpAndResetPassword(enteredOtp, recoverNewPass);
    if (res.success) {
      setRecoverSuccess(res.message);
      setTimeout(() => {
        setShowForgotModal(false);
        setEnteredOtp('');
        setRecoverNewPass('');
        setRecoverConfirmPass('');
      }, 1200);
    } else {
      setRecoverError(res.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regUsername.trim()) {
      setRegError('Please provide a username.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Password and confirm password do not match.');
      return;
    }
    const check = validatePasswordFormat(regPassword);
    if (!check.valid) {
      setRegError(check.message || 'Password must be 8-16 characters containing letters and numbers.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await registerUser(regName, regUsername, regEmail, regPhone, regPassword);
      if (res.success) {
        setRegSuccess(res.message);
        setIdentifier(regUsername);
        setPassword(regPassword);
        setTimeout(() => {
          setShowRegisterModal(false);
          setRegName('');
          setRegUsername('');
          setRegEmail('');
          setRegPhone('');
          setRegPassword('');
          setRegConfirmPassword('');
        }, 1500);
      } else {
        setRegError(res.message);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const bgImage = settings.loginBgUrl;

  return (
    <div
      className="min-h-screen bg-[#FEFAF3] text-slate-800 flex flex-col justify-between font-sans selection:bg-[#C49A45]/20 selection:text-[#C49A45] relative bg-cover bg-center bg-no-repeat transition-all duration-300"
      style={bgImage ? { backgroundImage: `url("${bgImage}")` } : undefined}
    >
      {/* Dynamic Overlay when shop background image is active */}
      {bgImage && (
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />
      )}

      {/* Main Center Area: Logo, Store Name, and Login Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto relative z-10">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-[#EADBCE] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Brand Identity */}
          <div className="text-center space-y-2 pb-1">
            <div className="w-16 h-16 rounded-2xl bg-[#C49A45]/10 border border-[#C49A45]/30 flex items-center justify-center text-[#C49A45] mx-auto shadow-xs overflow-hidden">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-9 h-9" />
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {settings.businessName}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Enter your User ID and Password to sign in
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* User ID Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                User ID / Username / Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter User ID or email..."
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#C49A45] focus:ring-1 focus:ring-[#C49A45] transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Password *
                </label>
                {/* Requirement: Forgot Password option visible on first page! */}
                <button
                  type="button"
                  onClick={() => {
                    setRecoverIdentifier(identifier);
                    setRecoverError('');
                    setRecoverSuccess('');
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-bold text-[#C49A45] hover:text-[#a88235] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#C49A45] focus:ring-1 focus:ring-[#C49A45] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] active:bg-[#a88235] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Options: Forgot Password & Create Account directly accessible */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <button
              type="button"
              onClick={() => {
                setRecoverIdentifier(identifier);
                setRecoverError('');
                setRecoverSuccess('');
                setShowForgotModal(true);
              }}
              className="font-bold text-[#C49A45] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Forgot Password?</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRegError('');
                setRegSuccess('');
                setShowRegisterModal(true);
              }}
              className="font-bold text-slate-700 hover:text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#C49A45]" />
              <span>Create an Account</span>
            </button>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="text-center py-3 text-xs text-slate-500 border-t border-[#EADBCE]/80 bg-[#FEFAF3]">
        {settings.businessName} &middot; Secure Point of Sale & ERP System
      </footer>

      {/* ========================================================= */}
      {/* MODAL: FORGOT PASSWORD & OTP RESET (2 MINUTES TIMER)       */}
      {/* ========================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C49A45]/15 text-[#C49A45] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Password Recovery (OTP)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  cancelRecoverySession();
                  setShowForgotModal(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoverError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{recoverError}</span>
              </div>
            )}
            {recoverSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{recoverSuccess}</span>
              </div>
            )}

            {!recoverySession ? (
              /* Step 1: Request OTP */
              <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Enter your registered <strong>Mobile Number</strong> or <strong>Email Address</strong>. A <strong>6-digit OTP code</strong> will be dispatched with a validity of <strong>2 minutes</strong>.
                </p>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Mobile Number or Email *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01700000000 or admin@allnoor.com"
                    value={recoverIdentifier}
                    onChange={(e) => setRecoverIdentifier(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send 2-Minute Recovery OTP</span>
                </button>
              </form>
            ) : (
              /* Step 2: Verify OTP and set New Password (8-16 chars, letters and numbers) */
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-4 text-xs">
                {/* 2-minute timer card */}
                <div className={`p-3.5 rounded-2xl border text-xs ${
                  secondsRemaining <= 0
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-[#FEFAF3] border-[#C49A45]/40 text-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#C49A45]" />
                      <span>{secondsRemaining <= 0 ? 'OTP Expired' : 'Time Remaining:'}</span>
                    </span>
                    <span className="font-mono font-bold text-sm bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {formatTimer(secondsRemaining)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the 6-digit code received. (Simulated OTP: <strong className="font-mono text-[#C49A45]">{recoverySession.otp}</strong>)
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    6-Digit OTP Code *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="e.g. 123456"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-3 py-2 text-center text-lg font-mono font-bold tracking-widest rounded-xl bg-[#FEFAF3] border border-slate-300 text-[#C49A45] focus:bg-white focus:outline-none focus:border-[#C49A45]"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                  <strong>Password Rule:</strong> Password must be between <strong>8 and 16 characters</strong> and contain both <strong>letters and numbers</strong>.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="8-16 chars & digits"
                      value={recoverNewPass}
                      onChange={(e) => setRecoverNewPass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={recoverConfirmPass}
                      onChange={(e) => setRecoverConfirmPass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleSendOtp(e)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                  >
                    Resend
                  </button>
                  <button
                    type="submit"
                    disabled={secondsRemaining <= 0 || enteredOtp.length !== 6}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reset & Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE A NEW ACCOUNT                               */}
      {/* ========================================================= */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EADBCE] shadow-2xl p-6 text-slate-900 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C49A45]/15 text-[#C49A45] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Create a New Operator Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{regError}</span>
              </div>
            )}
            {regSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Username / User ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cashier_john"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+880 1..."
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="user@store.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FEFAF3] border border-[#C49A45]/30 text-slate-700 text-[11px] leading-relaxed">
                Password must be <strong>8 to 16 characters</strong> containing both <strong>letters and numbers</strong>.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="8-16 letters & numbers"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FEFAF3] border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-[#C49A45] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 py-2.5 rounded-xl bg-[#C49A45] hover:bg-[#b58c38] text-white font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isRegistering ? 'Registering with Firebase...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
