import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { User, Check, X, Loader2, ArrowRight, Sparkles, Sun, Moon, Shield, Info, Smartphone } from 'lucide-react';
import TermsModal from './TermsModal';
import LoginWaveBackground from './LoginWaveBackground';
import { getOrCreateDeviceToken, getClientDeviceInfo } from '../utils/device';

export default function OnboardingModal({ onJoinSuccess, theme, onToggleTheme }) {
  const [handle, setHandle] = useState('');
  const [realName, setRealName] = useState('');
  const [gender, setGender] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Segmented Mode Tab: 'signup' (Choose Handle) or 'signin' (Device Session)
  const [activeTab, setActiveTab] = useState('signup');

  // Validation states
  const [checking, setChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [waveColors, setWaveColors] = useState({
    hue: '#6C3CE9',
    glow: 'rgba(108, 60, 233, 0.45)',
    accent: '#4F46E5'
  });

  const debounceTimeout = useRef(null);
  const deviceToken = getOrCreateDeviceToken();
  const savedHandle = typeof localStorage !== 'undefined' ? localStorage.getItem('chaattiko_saved_handle') : null;

  // Real-time handle check via socket or REST
  useEffect(() => {
    const trimmed = handle.trim();
    if (!trimmed) {
      setIsAvailable(null);
      setStatusMessage('');
      setChecking(false);
      return;
    }

    if (trimmed.length < 3) {
      setIsAvailable(false);
      setStatusMessage('Handle must be at least 3 characters.');
      setChecking(false);
      return;
    }

    if (trimmed.length > 20) {
      setIsAvailable(false);
      setStatusMessage('Handle maximum length is 20 characters.');
      setChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setIsAvailable(false);
      setStatusMessage('Only letters, numbers, and underscores allowed.');
      setChecking(false);
      return;
    }

    setChecking(true);
    setStatusMessage('Checking availability...');

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-handle?handle=${encodeURIComponent(trimmed)}&deviceToken=${encodeURIComponent(deviceToken)}`);
        const data = await res.json();
        setChecking(false);
        if (data.available) {
          setIsAvailable(true);
          setStatusMessage('Username is available');
        } else {
          setIsAvailable(false);
          setStatusMessage(data.reason || 'Username is unavailable');
        }
      } catch (err) {
        // Fallback: socket check
        socket.connect();
        socket.emit('check:handle', { handle: trimmed, deviceToken }, (response) => {
          setChecking(false);
          if (response.available) {
            setIsAvailable(true);
            setStatusMessage('Username is available');
          } else {
            setIsAvailable(false);
            setStatusMessage(response.reason || 'Username is unavailable');
          }
        });
      }
    }, 300);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [handle, deviceToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAvailable || checking || !agreedTerms || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    if (!socket.connected) {
      socket.connect();
    }

    const clientDeviceInfo = await getClientDeviceInfo();

    const payload = {
      handle: handle.trim(),
      realName: realName.trim() || undefined,
      gender: gender || 'Prefer not to say',
      agreedTerms: true,
      deviceToken,
      clientDeviceInfo
    };

    socket.emit('user:join', payload, (response) => {
      setIsSubmitting(false);
      if (response.success) {
        // Save local handle for quick display
        localStorage.setItem('chaattiko_saved_handle', response.user.handle);
        onJoinSuccess(response.user);
      } else {
        setErrorMessage(response.message || 'Failed to enter Chaattiko.');
      }
    });
  };

  const handleQuickReconnect = async () => {
    if (!savedHandle) return;
    setHandle(savedHandle);
    setActiveTab('signup');
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

      {/* Centered Glassmorphism Card (Dark frosted glass: rgba(24, 24, 28, 0.72) with 24px blur) */}
      <div
        style={{
          background: 'rgba(24, 24, 28, 0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `0 24px 70px -15px rgba(0, 0, 0, 0.9), 0 0 45px ${waveColors.glow}`
        }}
        className="w-[92vw] max-w-[420px] relative z-10 p-6 sm:p-8 my-auto transition-all duration-300"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div
            style={{
              boxShadow: `0 0 25px ${waveColors.glow}`,
              borderColor: 'rgba(255, 255, 255, 0.15)'
            }}
            className="w-13 h-13 rounded-2xl bg-white/[0.06] border flex items-center justify-center mb-3 transition-colors duration-300"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.12em] text-white font-syncopate uppercase">
            Chaattiko
          </h1>
          <p className="text-xs text-neutral-400 mt-1.5 font-normal tracking-wide">
            Real-time. Device-locked. 24h Ephemeral.
          </p>
        </div>

        {/* Segmented Mode Tabs: [ Sign Up / New Handle ] | [ Sign In / Device ] */}
        <div className="mb-5 p-1 rounded-2xl bg-white/[0.06] border border-white/[0.08] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('signup')}
            className={`py-2 px-3 text-xs font-offside rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signin')}
            className={`py-2 px-3 text-xs font-offside rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              activeTab === 'signin'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Device Sign In</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <X className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* --- SIGN IN TAB (Existing Device Status) --- */}
        {activeTab === 'signin' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-white">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Device Authentication Active</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Chaattiko binds your account permanently to this device's secure browser token. You never need a password.
              </p>
              {savedHandle ? (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Previous Handle:</span>
                  <span className="font-mono text-emerald-400 font-bold">@{savedHandle}</span>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/10 text-[11px] text-neutral-400">
                  No previous handle saved on this device. Create one below to begin!
                </div>
              )}
            </div>

            {savedHandle ? (
              <button
                type="button"
                onClick={handleQuickReconnect}
                style={{
                  background: `linear-gradient(135deg, ${waveColors.hue}, ${waveColors.accent})`,
                  boxShadow: `0 10px 28px -4px ${waveColors.glow}`
                }}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 border-t border-white/30 hover:opacity-95 active:scale-[0.98] transition duration-200 cursor-pointer"
              >
                <span>Continue as @{savedHandle}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                style={{
                  background: `linear-gradient(135deg, ${waveColors.hue}, ${waveColors.accent})`,
                  boxShadow: `0 10px 28px -4px ${waveColors.glow}`
                }}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 border-t border-white/30 hover:opacity-95 active:scale-[0.98] transition duration-200 cursor-pointer"
              >
                <span>Choose Unique Handle</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          /* --- SIGN UP TAB (Choose Unique Handle Form) --- */
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
            {/* Unique Handle Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="handle" className="text-neutral-200 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Choose Unique Handle</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Device-Locked</span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400 font-mono text-sm">
                  @
                </div>
                <input
                  id="handle"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  maxLength={20}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="Batman"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderColor: isAvailable === true 
                      ? 'rgba(16, 185, 129, 0.6)' 
                      : isAvailable === false 
                      ? 'rgba(244, 63, 94, 0.6)' 
                      : 'rgba(255, 255, 255, 0.12)'
                  }}
                  className="w-full pl-8 pr-10 py-3 rounded-2xl text-sm text-white placeholder:text-neutral-500 font-mono transition focus:outline-none focus:ring-1 focus:ring-[var(--wave-hue)]"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                  {checking && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
                  {!checking && isAvailable === true && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                  {!checking && isAvailable === false && (
                    <X className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>

              {/* Availability feedback */}
              {statusMessage && (
                <p className={`text-[11px] flex items-center gap-1.5 font-medium ${
                  isAvailable === true 
                    ? 'text-emerald-400' 
                    : isAvailable === false 
                    ? 'text-rose-400' 
                    : 'text-neutral-400'
                }`}>
                  {statusMessage}
                </p>
              )}
            </div>

            {/* Private Real Name Field (Admin-Only Visibility for Safety) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="realName" className="text-neutral-200 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-neutral-400" />
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
                onChange={(e) => setRealName(e.target.value)}
                placeholder="e.g. John Doe (kept private)"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
                className="w-full px-4 py-2.5 rounded-2xl text-xs text-white placeholder:text-neutral-500 font-sans transition focus:outline-none focus:ring-1 focus:ring-[var(--wave-hue)]"
              />
              <p className="text-[10px] text-neutral-400 leading-tight">
                🔒 Strictly hidden from public users. Only verified administrators see this for community safety and moderation.
              </p>
            </div>

            {/* Optional Gender Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-200 font-medium">Gender</span>
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
                      className={`py-2 px-1 text-center text-xs rounded-xl border transition flex items-center justify-center font-medium ${
                        isSelected
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-white/[0.04] border-white/10 text-neutral-300 hover:text-white hover:bg-white/[0.08]'
                      }`}
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

            {/* Primary Action Button (Synchronized with dynamic wave gradient & glow) */}
            <button
              type="submit"
              disabled={!isAvailable || checking || !agreedTerms || isSubmitting}
              style={{
                background: isAvailable && agreedTerms && !checking && !isSubmitting
                  ? `linear-gradient(135deg, ${waveColors.hue}, ${waveColors.accent})`
                  : 'rgba(255, 255, 255, 0.08)',
                boxShadow: isAvailable && agreedTerms && !checking && !isSubmitting
                  ? `0 10px 28px -4px ${waveColors.glow}`
                  : 'none'
              }}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-t border-white/25 transition duration-200 ${
                isAvailable && agreedTerms && !checking && !isSubmitting
                  ? 'text-white hover:opacity-95 active:scale-[0.98] cursor-pointer'
                  : 'text-neutral-500 cursor-not-allowed border-transparent'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Device...</span>
                </>
              ) : (
                <>
                  <span>Enter Chaattiko</span>
                  <ArrowRight className="w-4 h-4" />
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
            Permanent Device ID
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
