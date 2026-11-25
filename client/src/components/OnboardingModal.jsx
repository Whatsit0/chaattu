import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Shield,
  Smartphone,
  Gift,
  KeyRound
} from 'lucide-react';
import TermsModal from './TermsModal';
import LoginWaveBackground from './LoginWaveBackground';
import { getOrCreateDeviceToken, getClientDeviceInfo } from '../utils/device';
import chatticoLogo from '../assets/chattico-logo-dark.png';

// --- Cute, Delicate Celestial Line-Art Doodles ---
function CrescentMoonDoodle({ className = '' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M26 6C17.1634 6 10 13.1634 10 22C10 30.8366 17.1634 38 26 38C30.2 38 34.02 36.38 36.88 33.72C30.12 33.2 24.8 27.68 24.8 20.88C24.8 14.54 29.38 9.28 35.48 8.16C32.74 6.78 29.5 6 26 6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 18L35.2 20.8L38 22L35.2 23.2L34 26L32.8 23.2L30 22L32.8 20.8L34 18Z"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <circle cx="16" cy="14" r="1.1" fill="currentColor" />
      <circle cx="13" cy="28" r="1" fill="currentColor" />
      <circle cx="36" cy="11" r="0.9" fill="currentColor" />
    </svg>
  );
}

function StarDoodle({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.25"
      />
    </svg>
  );
}

function CloudDoodle({ className = '' }) {
  return (
    <svg viewBox="0 0 44 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M9 19H34C37.31 19 40 16.31 40 13C40 9.85 37.58 7.27 34.48 7.03C33.72 3.59 30.68 1 27 1C24.47 1 22.25 2.21 20.89 4.1C19.98 3.42 18.84 3 17.6 3C14.73 3 12.35 5.08 11.85 7.82C8.55 8.35 6 11.23 6 14.7C6 17.07 7.28 19 9 19Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 13C16 11.2 20 11.2 22 13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function OrbitDoodle({ className = '' }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse
        cx="18"
        cy="18"
        rx="15"
        ry="6"
        transform="rotate(-25 18 18)"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />
      <circle cx="28" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

export default function OnboardingModal({ onJoinSuccess, theme, onToggleTheme }) {
  // Authentication Flow Step: 1 = Unique ID & Password, 2 = Profile Details (New Users Only)
  const [step, setStep] = useState(1);

  // Step 1: Credentials
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Staged data for Step 2
  const [stagedHandle, setStagedHandle] = useState('');
  const [stagedPassword, setStagedPassword] = useState('');

  // Step 2: Profile Details
  const [realName, setRealName] = useState('');
  const [gender, setGender] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Focus tracking for liquid specular highlights
  const [handleFocused, setHandleFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [realNameFocused, setRealNameFocused] = useState(false);

  // State flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isWrongPassword, setIsWrongPassword] = useState(false);
  const [referredBy, setReferredBy] = useState('');
  const [waveColors, setWaveColors] = useState({
    hue: '#1D4ED8',
    glow: 'rgba(29, 78, 216, 0.55)',
    accent: '#3742E2'
  });

  const deviceToken = getOrCreateDeviceToken();
  const [savedHandle, setSavedHandle] = useState(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('chaattiko_saved_handle') : null;
  });

  // Check URL query parameters for referral link (?ref=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setReferredBy(ref.trim());
        try {
          sessionStorage.setItem('chaattiko_ref', ref.trim());
        } catch {}
      } else {
        try {
          const cached = sessionStorage.getItem('chaattiko_ref');
          if (cached) setReferredBy(cached);
        } catch {}
      }
    }
  }, []);

  // Handle Step 1 Submit: Check Unique ID & Password
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const cleanHandle = handle.trim();
    if (!cleanHandle) {
      setErrorMessage('Please enter your Unique ID.');
      setIsWrongPassword(false);
      return;
    }
    if (cleanHandle.length < 3 || cleanHandle.length > 20 || !/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
      setErrorMessage('Unique ID must be 3-20 letters, numbers, or underscores.');
      setIsWrongPassword(false);
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      setIsWrongPassword(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setIsWrongPassword(false);

    if (!socket.connected) {
      socket.connect();
    }

    const clientDeviceInfo = await getClientDeviceInfo();

    socket.emit('auth:step1', {
      handle: cleanHandle,
      password,
      deviceToken,
      clientDeviceInfo
    }, (res) => {
      setIsSubmitting(false);

      if (!res) {
        setErrorMessage('Unable to connect to Chaattiko server. Please try again.');
        return;
      }

      // Case A: Returning user
      if (res.exists) {
        if (res.success && res.user) {
          // Password verified! Save credentials and enter chat directly
          if (res.sessionToken) {
            localStorage.setItem('chaattiko_session_token', res.sessionToken);
          }
          localStorage.setItem('chaattiko_saved_handle', res.user.handle);
          onJoinSuccess(res.user);
        } else {
          // Wrong password
          setErrorMessage(res.reason || 'Incorrect password for this Unique ID');
          setIsWrongPassword(true);
        }
      } else {
        // Case B: New user
        if (res.success) {
          // Unique ID is available. Smoothly transition to Step 2!
          setStagedHandle(cleanHandle);
          setStagedPassword(password);
          setErrorMessage('');
          setIsWrongPassword(false);
          setStep(2);
        } else {
          setErrorMessage(res.reason || 'This Unique ID is not available.');
          setIsWrongPassword(false);
        }
      }
    });
  };

  // Handle Step 2 Submit: Complete Registration for New User
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!agreedTerms || !isHumanVerified || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    if (!socket.connected) {
      socket.connect();
    }

    const clientDeviceInfo = await getClientDeviceInfo();

    const payload = {
      handle: stagedHandle,
      password: stagedPassword,
      realName: realName.trim() || undefined,
      gender: gender || 'Prefer not to say',
      agreedTerms: true,
      deviceToken,
      clientDeviceInfo,
      referredBy: referredBy || undefined
    };

    socket.emit('user:join', payload, (response) => {
      setIsSubmitting(false);
      if (response && response.success && response.user) {
        if (response.sessionToken) {
          localStorage.setItem('chaattiko_session_token', response.sessionToken);
        }
        localStorage.setItem('chaattiko_saved_handle', response.user.handle);
        onJoinSuccess(response.user);
      } else {
        setErrorMessage(response?.message || 'Failed to complete registration.');
      }
    });
  };

  // Quick Action to Clear Incorrect Password & Create New Unique ID
  const handleCreateNewId = () => {
    setHandle('');
    setPassword('');
    setErrorMessage('');
    setIsWrongPassword(false);
  };

  // Quick Action to Select Saved Handle
  const handleUseSavedHandle = () => {
    if (savedHandle) {
      setHandle(savedHandle);
      setErrorMessage('');
      setIsWrongPassword(false);
    }
  };

  // Clear remembered handle
  const handleForgetSavedHandle = () => {
    localStorage.removeItem('chaattiko_saved_handle');
    localStorage.removeItem('chaattiko_session_token');
    setSavedHandle(null);
    setHandle('');
    setPassword('');
    setErrorMessage('');
    setIsWrongPassword(false);
  };

  return (
    <div
      style={{
        '--wave-hue': waveColors.hue,
        '--wave-glow': waveColors.glow,
        '--wave-accent': waveColors.accent
      }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black overflow-y-auto selection:bg-white/20 select-none"
    >
      {/* Continuous Wave Horizon Canvas (Unmounted immediately upon entering chat) */}
      <LoginWaveBackground onColorUpdate={setWaveColors} />

      {/* Top right subtle controls */}
      <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-20 flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white transition shadow-sm backdrop-blur-md"
          title="Toggle Light / Dark mode"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-neutral-300" />}
        </button>
      </div>

      {/* Centered Glassmorphism Card with Apple iOS Liquid Glass Effect & Celestial Line-Art Doodles */}
      <div
        style={{
          background: 'rgba(16, 18, 26, 0.78)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderRadius: '26px',
          border: '1px solid rgba(255, 255, 255, 0.20)',
          boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.25), 0 24px 65px rgba(0, 0, 0, 0.85)'
        }}
        className="w-[92vw] max-w-[430px] relative z-10 p-6 sm:p-8 my-auto transition-all duration-300 overflow-hidden"
      >
        {/* Delicate Corner Doodles */}
        <StarDoodle className="w-5 h-5 text-white/35 absolute top-3.5 left-4 animate-doodle-twinkle pointer-events-none" />
        <OrbitDoodle className="w-6 h-6 text-white/30 absolute top-3.5 right-4 animate-doodle-float pointer-events-none" />

        {/* Editorial Brand Header */}
        <div className="flex flex-col items-center text-center mb-5 relative">
          {/* Chaattiko Parrot Logo (Parrot Icon + "Chaattiko" Wordmark) Top-Center Above Welcome Text */}
          <div className="mb-2.5 transform hover:scale-105 transition-transform duration-300">
            <img
              src={chatticoLogo}
              alt="Chaattiko"
              className="w-auto h-20 sm:h-24 max-w-[210px] object-contain drop-shadow-[0_4px_24px_rgba(16,185,129,0.35)] mx-auto animate-fade-in"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 mb-2.5 text-[11px] text-neutral-300 font-mono tracking-wider backdrop-blur-md shadow-sm">
            <StarDoodle className="w-3 h-3 text-amber-300 animate-doodle-twinkle" />
            <span>{step === 1 ? 'CHAATTIKO // ENTRY' : 'CHAATTIKO // PROFILE'}</span>
          </div>

          {referredBy && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 mb-2.5 text-[11px] text-emerald-300 font-mono tracking-wide backdrop-blur-md shadow-sm">
              <Gift className="w-3.5 h-3.5 text-emerald-400" />
              <span>Invited by @{referredBy} ✨</span>
            </div>
          )}

          <div className="relative mb-1 flex items-center justify-center w-full">
            <CrescentMoonDoodle className="w-7 h-7 text-white/70 absolute left-1 top-0 animate-doodle-float hidden sm:block pointer-events-none" />
            <h1 className="text-2xl sm:text-[30px] font-serif italic text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] leading-tight">
              {step === 1 ? 'Welcome to Chaattiko' : 'Complete Profile'}
            </h1>
            <CloudDoodle className="w-8 h-5 text-white/50 absolute right-1 top-1 animate-doodle-drift hidden sm:block pointer-events-none" />
          </div>

          <p className="text-xs text-neutral-300/90 mt-1 font-sans font-normal leading-relaxed max-w-[320px]">
            {step === 1
              ? 'Where conversations flow freely. Enter your Unique ID & password to continue.'
              : 'Set up your private profile details and verify your humanity to enter.'}
          </p>
        </div>

        {/* Step Indicator Badge */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className={`px-2 py-0.5 rounded-md ${step === 1 ? 'bg-white/20 text-white font-bold' : 'bg-white/5 text-neutral-400'}`}>
              Step 1: ID & Password
            </span>
            <span className="text-neutral-500">→</span>
            <span className={`px-2 py-0.5 rounded-md ${step === 2 ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-400/40' : 'bg-white/5 text-neutral-400'}`}>
              Step 2: Profile
            </span>
          </div>
          {step === 2 && (
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrorMessage('');
                setIsWrongPassword(false);
              }}
              className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 font-mono transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-2 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            {/* If wrong password on existing account, render clear option to create new Unique ID */}
            {isWrongPassword && (
              <div className="pt-1 border-t border-rose-500/20 flex items-center justify-between">
                <span className="text-[11px] text-rose-200/80">Not your account?</span>
                <button
                  type="button"
                  onClick={handleCreateNewId}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition"
                >
                  Create New Unique ID
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 1: Unique ID & Password Screen (Shown to All Users)       */}
        {/* ============================================================== */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4 animate-fade-in">
            {/* Remembered / Saved Account Quick Connect Banner */}
            {savedHandle && savedHandle !== handle && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(20px) saturate(165%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(165%)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.20)'
                }}
                className="p-3 rounded-2xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-neutral-300">Previous Account:</span>
                  <span className="font-mono text-emerald-300 font-bold">@{savedHandle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseSavedHandle}
                    className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold transition text-[11px]"
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={handleForgetSavedHandle}
                    className="p-1 text-neutral-400 hover:text-white transition"
                    title="Switch / Forget ID"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Unique ID Input Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="handle" className="text-white font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Unique ID</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Chaattiko Handle</span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-300 font-mono text-sm z-10">
                  @
                </div>
                <input
                  id="handle"
                  type="text"
                  autoComplete="username"
                  spellCheck="false"
                  maxLength={20}
                  value={handle}
                  onFocus={() => setHandleFocused(true)}
                  onBlur={() => setHandleFocused(false)}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="Unique_ID"
                  style={{
                    background: handleFocused ? 'rgba(24, 28, 40, 0.88)' : 'rgba(16, 20, 30, 0.78)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: handleFocused
                      ? '1px solid rgba(255, 255, 255, 0.70)'
                      : '1px solid rgba(255, 255, 255, 0.22)',
                    boxShadow: handleFocused
                      ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.50), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 0 20px rgba(16, 185, 129, 0.35), 0 8px 32px rgba(0, 0, 0, 0.45)'
                      : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.35)',
                    color: '#FFFFFF'
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-2xl text-sm font-mono transition duration-200 focus:outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            {/* Password Input Field with Eye / EyeOff Toggle */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="password" className="text-white font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Password</span>
                </label>
                <span className="text-[10px] text-neutral-400 font-mono">Min 4 characters</span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 z-10">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret password"
                  style={{
                    background: passwordFocused ? 'rgba(24, 28, 40, 0.88)' : 'rgba(16, 20, 30, 0.78)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                    border: passwordFocused
                      ? '1px solid rgba(255, 255, 255, 0.70)'
                      : '1px solid rgba(255, 255, 255, 0.22)',
                    boxShadow: passwordFocused
                      ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.50), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 0 20px rgba(16, 185, 129, 0.35), 0 8px 32px rgba(0, 0, 0, 0.45)'
                      : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.35)',
                    color: '#FFFFFF'
                  }}
                  className="w-full pl-10 pr-11 py-3 rounded-2xl text-sm transition duration-200 focus:outline-none placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition z-10"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Used to secure your account across devices and returning logins.
              </p>
            </div>

            {/* Step 1 Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || !handle.trim() || !password}
              style={{
                background: handle.trim() && password && !isSubmitting
                  ? 'linear-gradient(135deg, #10B981, #06B6D4, #3B82F6)'
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: handle.trim() && password && !isSubmitting
                  ? 'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 10px 28px -4px rgba(16, 185, 129, 0.45)'
                  : 'none',
                borderTop: handle.trim() && password && !isSubmitting
                  ? '1px solid rgba(255, 255, 255, 0.45)'
                  : '1px solid transparent',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)'
              }}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition duration-200 ${
                handle.trim() && password && !isSubmitting
                  ? 'text-white hover:opacity-95 active:scale-[0.98] cursor-pointer'
                  : 'text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* STEP 2: Profile Details & Anti-Bot Check (New Users Only)     */}
        {/* ============================================================== */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4 animate-fade-in">
            {/* Staged Handle Confirmation Banner */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                backdropFilter: 'blur(20px) saturate(165%)',
                WebkitBackdropFilter: 'blur(20px) saturate(165%)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.20)'
              }}
              className="p-3 rounded-2xl flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-neutral-200">New Account:</span>
                <span className="font-mono text-emerald-300 font-bold">@{stagedHandle}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-neutral-300 hover:text-white underline transition"
              >
                Change ID
              </button>
            </div>

            {/* Private Real Name Field with matching Slightly Darker Frosted Glass Styling */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="realName" className="text-white font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Your Real Name</span>
                </label>
                <span className="text-[10px] text-neutral-400 font-mono">Private / Admin Only</span>
              </div>

              <input
                id="realName"
                type="text"
                autoComplete="name"
                maxLength={40}
                value={realName}
                onFocus={() => setRealNameFocused(true)}
                onBlur={() => setRealNameFocused(false)}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="e.g. John Doe (kept private)"
                style={{
                  background: realNameFocused ? 'rgba(24, 28, 40, 0.88)' : 'rgba(16, 20, 30, 0.78)',
                  backdropFilter: 'blur(28px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                  border: realNameFocused
                    ? '1px solid rgba(255, 255, 255, 0.70)'
                    : '1px solid rgba(255, 255, 255, 0.22)',
                  boxShadow: realNameFocused
                    ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.50), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 0 20px rgba(16, 185, 129, 0.35), 0 8px 32px rgba(0, 0, 0, 0.45)'
                    : 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.35)',
                  color: '#FFFFFF'
                }}
                className="w-full px-4 py-2.5 rounded-2xl text-xs font-sans transition duration-200 focus:outline-none placeholder:text-neutral-400"
              />
              <p className="text-[10px] text-neutral-300/80 leading-tight">
                🔒 Strictly hidden from public users. Only verified administrators see this for community safety and moderation.
              </p>
            </div>

            {/* Gender Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-medium">Gender</span>
                <span className="text-[10px] text-neutral-400">Optional</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Male', label: 'Male' },
                  { id: 'Female', label: 'Female' },
                  { id: 'Prefer not to say', label: 'Prefer not' }
                ].map((opt) => {
                  const isSelected = gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGender(isSelected ? '' : opt.id)}
                      style={{
                        backdropFilter: 'blur(20px) saturate(165%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(165%)',
                        background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.06)',
                        border: isSelected ? '1px solid rgba(255, 255, 255, 1)' : '1px solid rgba(255, 255, 255, 0.18)',
                        boxShadow: isSelected
                          ? '0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 0 #FFFFFF'
                          : 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
                        color: isSelected ? '#000000' : 'rgba(255, 255, 255, 0.85)'
                      }}
                      className="py-2 px-1 text-center text-xs rounded-xl transition flex items-center justify-center font-medium active:scale-95"
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mandatory Terms & Conditions Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded bg-black/40 border-white/20 text-white focus:ring-0 cursor-pointer accent-[var(--wave-hue)]"
                />
                <div className="text-xs text-neutral-300 leading-snug">
                  <span>I confirm that I am <strong>18 years of age or older</strong> and agree to the </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsModalOpen(true);
                    }}
                    className="text-white underline hover:opacity-80 font-medium inline-flex items-center gap-0.5"
                  >
                    Terms & Conditions
                  </button>
                  <span className="text-rose-400 ml-0.5">*</span>
                </div>
              </label>
            </div>

            {/* Anti-Bot Human Verification Check */}
            <div className="pt-1">
              <div
                onClick={() => setIsHumanVerified((prev) => !prev)}
                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none flex items-center justify-between ${
                  isHumanVerified
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-white/[0.04] border-white/15 text-neutral-300 hover:border-white/30 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs font-medium">
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all duration-200 ${
                      isHumanVerified
                        ? 'bg-emerald-500 border-emerald-300 text-neutral-950 scale-105'
                        : 'bg-white/10 border-white/20'
                    }`}
                  >
                    {isHumanVerified && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span>
                    {isHumanVerified ? 'Verified Human ✨' : 'Click to verify you are human ✨'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 opacity-80">
                  Anti-Bot Guard
                </span>
              </div>
            </div>

            {/* Primary Action Button (Chaattiko Emerald-to-Cyan Liquid Gradient) */}
            <button
              type="submit"
              disabled={!agreedTerms || !isHumanVerified || isSubmitting}
              style={{
                background: agreedTerms && isHumanVerified && !isSubmitting
                  ? 'linear-gradient(135deg, #10B981, #06B6D4, #3B82F6)'
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: agreedTerms && isHumanVerified && !isSubmitting
                  ? 'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 10px 28px -4px rgba(16, 185, 129, 0.45)'
                  : 'none',
                borderTop: agreedTerms && isHumanVerified && !isSubmitting
                  ? '1px solid rgba(255, 255, 255, 0.45)'
                  : '1px solid transparent',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)'
              }}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition duration-200 ${
                agreedTerms && isHumanVerified && !isSubmitting
                  ? 'text-white hover:opacity-95 active:scale-[0.98] cursor-pointer'
                  : 'text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Enter Chaattiko</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span
              style={{ backgroundColor: waveColors.hue }}
              className="w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-500"
            />
            {step === 1 ? 'Two-Step Security' : 'Verified Registration'}
          </span>
          <span className="text-neutral-500">Chaattiko v2.6</span>
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        onAccept={() => setAgreedTerms(true)}
      />
    </div>
  );
}
