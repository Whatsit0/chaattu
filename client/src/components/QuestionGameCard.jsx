import React, { useState } from 'react';
import { Sparkles, MessageCircle, FastForward, CheckCircle2, Lock, Send } from 'lucide-react';
import { socket } from '../socket';

export default function QuestionGameCard({
  game,
  currentUser,
  activeTarget
}) {
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const myHandle = currentUser?.handle?.toLowerCase();
  const playerA = game.playerA || 'Player 1';
  const playerB = game.playerB || activeTarget || 'Player 2';

  const isPlayerA = playerA.toLowerCase() === myHandle;
  const isPlayerB = playerB.toLowerCase() === myHandle;

  const mySubmitted = Boolean(game.answers && Object.keys(game.answers).some(k => k.toLowerCase() === myHandle));
  const otherPlayerName = isPlayerA ? playerB : playerA;
  const otherSubmitted = game.submittedUsers
    ? game.submittedUsers.some(u => u.toLowerCase() !== myHandle)
    : false;

  const hasVotedSkip = Boolean(game.skips && game.skips.some(u => u.toLowerCase() === myHandle));
  const skipCount = game.skips ? game.skips.length : 0;

  const handleSubmitAnswer = (e) => {
    if (e) e.preventDefault();
    const trimmed = answerInput.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    socket.emit('game:question_answer', {
      gameId: game.gameId,
      messageId: game.messageId,
      answer: trimmed,
      targetUser: activeTarget
    }, () => {
      setIsSubmitting(false);
      setAnswerInput('');
    });
  };

  const handleSkipQuestion = (e) => {
    if (e) e.preventDefault();
    if (hasVotedSkip) return;

    socket.emit('game:question_skip', {
      gameId: game.gameId,
      messageId: game.messageId,
      targetUser: activeTarget
    });
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(20, 24, 38, 0.98), rgba(12, 14, 24, 0.96))',
        border: '1.5px solid rgba(147, 51, 234, 0.45)',
        boxShadow: '0 16px 40px -10px rgba(147, 51, 234, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
      }}
      className="w-[290px] sm:w-[350px] p-4 sm:p-5 rounded-3xl select-none text-left transition-all relative overflow-hidden my-1"
    >
      {/* Decorative top accent glow */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-sm shadow-md">
            🧊
          </div>
          <div>
            <div className="text-xs font-bold font-offside tracking-wide text-white flex items-center gap-1.5">
              <span>Ice Breaker</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                DUAL PROMPT
              </span>
            </div>
            <div className="text-[10px] font-mono text-neutral-400">
              {game.category ? `${game.category} edition` : 'Truth game'}
            </div>
          </div>
        </div>

        {/* Question tag */}
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-purple-200">
          Prompt
        </span>
      </div>

      {/* Question Text in Prominent Typography */}
      <div className="my-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
        <p className="font-serif italic font-semibold text-sm sm:text-base text-white leading-snug drop-shadow-sm">
          "{game.questionText}"
        </p>
      </div>

      {/* Status Indicators */}
      <div className="mb-3 space-y-1.5 text-xs font-mono">
        {/* Answer status */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 text-[11px]">
          <span className="flex items-center gap-1.5 text-neutral-300">
            {mySubmitted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            <span>You: {mySubmitted ? 'Answer locked 🔒' : 'Not submitted'}</span>
          </span>

          <span className="flex items-center gap-1.5 text-neutral-400">
            {otherSubmitted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">@{otherPlayerName} ready</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-neutral-500" />
                <span>@{otherPlayerName} waiting</span>
              </>
            )}
          </span>
        </div>

        {/* Skip notification if anyone voted to skip */}
        {skipCount > 0 && (
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[10px] flex items-center justify-between">
            <span>⚠️ 1 skip vote recorded (1/2)</span>
            <span className="opacity-80">Both must skip</span>
          </div>
        )}
      </div>

      {/* Action / Input Area */}
      {!mySubmitted ? (
        <form onSubmit={handleSubmitAnswer} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              maxLength={200}
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Type your secret answer here..."
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.20)',
                color: '#FFFFFF'
              }}
              className="w-full pl-3 pr-9 py-2.5 rounded-xl text-xs font-sans transition focus:outline-none focus:border-purple-400 placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={!answerInput.trim() || isSubmitting}
              className={`absolute inset-y-1 right-1 px-2.5 rounded-lg flex items-center justify-center transition ${
                answerInput.trim() && !isSubmitting
                  ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-95'
                  : 'text-neutral-500 cursor-not-allowed opacity-50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="submit"
              disabled={!answerInput.trim() || isSubmitting}
              className={`flex-1 py-2 px-3 rounded-xl font-offside text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                answerInput.trim() && !isSubmitting
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-md active:scale-95 cursor-pointer'
                  : 'bg-white/5 text-neutral-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Submit Answer</span>
            </button>

            <button
              type="button"
              onClick={handleSkipQuestion}
              disabled={hasVotedSkip}
              className={`py-2 px-3 rounded-xl border text-xs font-offside transition flex items-center gap-1 ${
                hasVotedSkip
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 opacity-60 cursor-default'
                  : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/10 text-neutral-300 active:scale-95 cursor-pointer'
              }`}
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>{hasVotedSkip ? 'Voted Skip' : 'Skip'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-center">
            <p className="text-xs text-purple-200 font-sans font-medium flex items-center justify-center gap-1.5">
              <span>Your answer is locked 🔒</span>
            </p>
            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
              Answers reveal automatically once @{otherPlayerName} submits!
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSkipQuestion}
              disabled={hasVotedSkip}
              className={`py-1.5 px-3 rounded-xl border text-[11px] font-offside transition flex items-center gap-1 ${
                hasVotedSkip
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 opacity-60 cursor-default'
                  : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/10 text-neutral-300 active:scale-95 cursor-pointer'
              }`}
            >
              <FastForward className="w-3 h-3" />
              <span>{hasVotedSkip ? 'Skip Voted' : 'Vote to Skip'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders Revealed Answers message in the chat stream:
 * Format: <userId>/answer=<their answer>
 */
export function renderRevealedAnswersCard(content) {
  const match = content.match(/^\[icebreaker:answers:@([^/]+)\/answer=([^|]+)\|@([^/]+)\/answer=([^:]+):(.*)\]$/);
  if (!match) return null;

  const [, userA, answerA, userB, answerB, questionText] = match;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(28, 20, 48, 0.98), rgba(16, 12, 32, 0.96))',
        border: '1.5px solid rgba(236, 72, 153, 0.5)',
        boxShadow: '0 16px 40px -10px rgba(236, 72, 153, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
      }}
      className="p-4 sm:p-5 rounded-3xl select-none text-left min-w-[280px] max-w-[420px] shadow-2xl relative overflow-hidden my-1"
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-pink-500/20">
        <span className="text-[10px] font-mono tracking-widest text-pink-300 font-bold uppercase flex items-center gap-1.5">
          <span>✨ ICE BREAKER REVEAL</span>
        </span>
        <span className="text-[9px] font-mono text-purple-300">Both Answered</span>
      </div>

      {/* The Question */}
      <div className="mb-3 text-xs text-neutral-300 font-serif italic">
        "{questionText}"
      </div>

      {/* Answers Display in exact <userId>/answer=<their answer> format */}
      <div className="space-y-2">
        <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-purple-300 font-bold">
            @{userA}/answer=
          </div>
          <div className="text-xs text-white font-sans font-medium pl-2 border-l-2 border-purple-400">
            {answerA}
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 space-y-1">
          <div className="text-[10px] font-mono text-pink-300 font-bold">
            @{userB}/answer=
          </div>
          <div className="text-xs text-white font-sans font-medium pl-2 border-l-2 border-pink-400">
            {answerB}
          </div>
        </div>
      </div>
    </div>
  );
}
