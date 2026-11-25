import React, { useState } from 'react';
import { socket } from '../socket';
import { MessageSquarePlus, X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose, currentUser }) {
  const [type, setType] = useState('Suggestion'); // 'Suggestion' | 'Bug Report' | 'Safety Concern'
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorNotice('');

    socket.emit('feedback:submit', { type, message: message.trim() }, (res) => {
      setIsSubmitting(false);
      if (res?.success) {
        setSuccessNotice(true);
        setMessage('');
        setTimeout(() => {
          setSuccessNotice(false);
          onClose();
        }, 1800);
      } else {
        setErrorNotice(res?.message || 'Failed to submit feedback.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-[92vw] max-w-[420px] max-h-[85dvh] overflow-y-auto glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl relative border dark:border-white/10 border-neutral-200 dark:bg-black/85 bg-white text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b dark:border-white/10 border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200">
              <MessageSquarePlus className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-mono dark:text-white text-neutral-900">
                Send Direct Feedback
              </h2>
              <p className="text-[11px] dark:text-neutral-400 text-neutral-500">
                Private channel to Chaattiko administrators
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg dark:text-neutral-400 text-neutral-500 hover:dark:text-white hover:text-black transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successNotice ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-bounce" />
            <h3 className="text-sm font-semibold font-mono dark:text-white text-neutral-900">Feedback Submitted</h3>
            <p className="text-xs dark:text-neutral-400 text-neutral-500 max-w-xs">
              Thank you! Your report has been dispatched securely to the moderation team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorNotice && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-neutral-300 text-neutral-700">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Suggestion', label: 'Suggestion' },
                  { id: 'Bug Report', label: 'Bug Report' },
                  { id: 'Safety Concern', label: 'Safety / Abuse' }
                ].map((cat) => {
                  const isSelected = type === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setType(cat.id)}
                      className={`py-2 px-1 text-center text-xs rounded-xl border transition font-medium ${
                        isSelected
                          ? 'dark:bg-white dark:text-black bg-neutral-900 text-white dark:border-white border-neutral-900 shadow-sm'
                          : 'dark:bg-white/[0.02] bg-neutral-100 dark:border-white/10 border-neutral-200 dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium dark:text-neutral-300 text-neutral-700">Your Message</label>
              <textarea
                rows={4}
                maxLength={1000}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your suggestion, bug, or safety report in detail..."
                className="w-full p-3 rounded-xl glass-input text-xs dark:text-white text-neutral-900 placeholder:text-neutral-400 resize-none font-sans"
              />
              <div className="flex justify-between text-[10px] dark:text-neutral-500 text-neutral-400 font-mono">
                <span>Sending as: @{currentUser?.handle || 'Anonymous'}</span>
                <span>{message.length}/1000</span>
              </div>
            </div>

            <p className="text-[11px] dark:text-neutral-500 text-neutral-400 leading-normal">
              🔒 This message is private and readable <strong>only by the Admin Dashboard</strong>. Regular users will never see your submission.
            </p>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || isSubmitting}
                className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  message.trim() && !isSubmitting
                    ? 'dark:bg-white dark:text-black bg-neutral-900 text-white hover:opacity-90 shadow-sm cursor-pointer'
                    : 'dark:bg-white/10 bg-neutral-200 dark:text-neutral-500 text-neutral-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span>Send to Admin</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
