import React from 'react';
import { X, ShieldAlert, CheckCircle2, UserCheck, Eye } from 'lucide-react';

export default function TermsModal({ isOpen, onClose, onAccept }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-[92vw] max-w-lg glass-panel rounded-2xl p-5 sm:p-8 shadow-2xl relative border dark:border-white/10 border-neutral-200 max-h-[85dvh] flex flex-col dark:bg-black/85 bg-white text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b dark:border-white/10 border-neutral-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200">
              <ShieldAlert className="w-5 h-5 dark:text-neutral-300 text-neutral-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide font-mono dark:text-white text-neutral-900">
                Chaattiko Terms & Conditions
              </h2>
              <p className="text-xs dark:text-neutral-400 text-neutral-500">Platform Usage Agreement & Safety Standards</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg dark:text-neutral-400 text-neutral-500 hover:dark:text-white hover:text-black hover:bg-neutral-100 dark:hover:bg-white/5 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-2 text-sm dark:text-neutral-300 text-neutral-700 leading-relaxed font-normal">
          {/* Section 1: Age Requirement */}
          <div className="p-4 rounded-xl dark:bg-white/[0.02] bg-neutral-50 border dark:border-white/5 border-neutral-200 space-y-1.5">
            <div className="flex items-center gap-2 font-medium dark:text-white text-neutral-900">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>1. Age Requirement</span>
            </div>
            <p className="text-xs dark:text-neutral-400 text-neutral-600">
              Users must be <strong>18 years of age or older</strong> to use Chaattiko. Access by minors is strictly prohibited.
            </p>
          </div>

          {/* Section 2: Community Standards */}
          <div className="p-4 rounded-xl dark:bg-white/[0.02] bg-neutral-50 border dark:border-white/5 border-neutral-200 space-y-1.5">
            <div className="flex items-center gap-2 font-medium dark:text-white text-neutral-900">
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
              <span>2. Community Standards</span>
            </div>
            <p className="text-xs dark:text-neutral-400 text-neutral-600">
              Users must communicate respectfully. Harassment, abuse, and spam are strictly prohibited. Violators are subject to immediate termination and permanent suspension.
            </p>
          </div>

          {/* Section 3: Moderation & Privacy Notice */}
          <div className="p-4 rounded-xl dark:bg-white/[0.02] bg-neutral-50 border dark:border-white/5 border-neutral-200 space-y-1.5">
            <div className="flex items-center gap-2 font-medium dark:text-white text-neutral-900">
              <Eye className="w-4 h-4 text-amber-500" />
              <span>3. Moderation & Privacy Notice</span>
            </div>
            <p className="text-xs dark:text-neutral-400 text-neutral-600">
              To maintain platform safety, chat activity along with basic device information and approximate IP-based location are subject to administrative moderation. Public chat history expires after 24 hours, while administrators retain access to monitor active sessions and logs for safety and abuse prevention.
            </p>
          </div>

          <p className="text-[11px] dark:text-neutral-500 text-neutral-400 italic text-center pt-2">
            By entering Chaattiko, you acknowledge and agree to abide by these terms.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t dark:border-white/10 border-neutral-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black transition"
          >
            Close
          </button>
          {onAccept && (
            <button
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="px-5 py-2 text-xs font-semibold dark:bg-white dark:text-black bg-neutral-900 text-white rounded-lg hover:opacity-90 transition shadow-glow"
            >
              I Understand & Agree
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
