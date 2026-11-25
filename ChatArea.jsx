import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Menu, 
  Clock, 
  Sparkles, 
  Radio, 
  Star,
  ShieldBan,
  Sun,
  Moon,
  AlertTriangle,
  Smile,
  Shuffle,
  Info,
  PanelLeft,
  RotateCw,
  SkipForward,
  Users,
  Reply,
  X
} from 'lucide-react';
import { socket } from '../socket';
import MemeStickerPicker from './MemeStickerPicker';
import HeroSandDissolve from './HeroSandDissolve';

const POP_EMOJIS = ['❤️', '😂', '🔥', '😮', '👏', '🚀'];

export default function ChatArea({
  currentUser,
  activeTarget, // null = lounge, or string = handle
  targetUserObj,
  messages,
  onSendMessage,
  onOpenMobileSidebar,
  typingUsers = [],
  theme,
  onToggleTheme,
  isFavorite = false,
  isBlocked = false,
  isBlockedByTarget = false,
  isMobile = false,
  isSplitView = false,
  onToggleFavorite,
  onToggleBlock,
  onRandomStranger,
  onOpenAbout,
  reactions = {}, // messageId -> [ { emoji, count } ]
  userReactions = {}, // messageId -> user's active emoji
  onToggleReaction,
  hasStartedChat = false,
  onChatInitiated,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
  isRandomChat = false,
  onSkipStranger,
  isSyncing = false,
  onManualSync
}) {
  const [inputText, setInputText] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [isDissolving, setIsDissolving] = useState(false);
  // Replying state (Instagram / WhatsApp style quoting)
  const [replyingTo, setReplyingTo] = useState(null);
  // Touch swipe state
  const touchStartRef = useRef(null);
  const inputRef = useRef(null);
  // Hero is displayed centered in the public chat area on load until user interacts
  const [heroDismissed, setHeroDismissed] = useState(hasStartedChat);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (hasStartedChat && !heroDismissed && !isDissolving) {
      setIsDissolving(true);
    }
  }, [hasStartedChat, heroDismissed, isDissolving]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers, heroDismissed]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    socket.emit('typing:start', { targetUser: activeTarget });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { targetUser: activeTarget });
    }, 1500);
  };

  const triggerDissolveAndProceed = () => {
    if (!heroDismissed) {
      setIsDissolving(true);
    }
  };

  const handleInitiateReply = (msg) => {
    setReplyingTo({
      id: msg.id,
      sender: msg.sender,
      content: msg.content
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (isBlocked) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (!heroDismissed) {
      triggerDissolveAndProceed();
      if (onChatInitiated) onChatInitiated();
    }

    onSendMessage(trimmed, replyingTo);
    setInputText('');
    setReplyingTo(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing:stop', { targetUser: activeTarget });
  };

  const handleSendSticker = (stickerTag) => {
    if (isBlocked) return;
    if (!heroDismissed) {
      triggerDissolveAndProceed();
      if (onChatInitiated) onChatInitiated();
    }
    onSendMessage(stickerTag, replyingTo);
    setShowStickerPicker(false);
    setReplyingTo(null);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeTypers = typingUsers.filter((u) => u !== currentUser.handle);
  const isPartnerOnline = targetUserObj ? targetUserObj.isOnline : false;

  // Render sticker if message has sticker format [genz:id:emoji:label:sub] or [sticker:...]
  const renderMessageContent = (content) => {
    const genzMatch = content.match(/^\[genz:([a-z0-9_]+):([^:]+):([^:]+):([^\]]+)\]$/i);
    if (genzMatch) {
      const [, , emoji, label, sub] = genzMatch;
      return (
        <div className="inline-flex items-center gap-3 py-1 px-1 select-none">
          <span className="text-3xl animate-bounce drop-shadow-md">{emoji}</span>
          <div className="flex flex-col">
            <span className="font-offside text-xs font-bold tracking-wider dark:text-white text-neutral-900 leading-tight">
              {label}
            </span>
            <span className="font-electrolize text-[9px] opacity-70 tracking-widest uppercase dark:text-emerald-400 text-emerald-600">
              {sub}
            </span>
          </div>
        </div>
      );
    }

    const legacyStickerMatch = content.match(/^\[sticker:([a-z0-9_]+):([^:]+):([^\]]+)\]$/i);
    if (legacyStickerMatch) {
      const [, , emoji, text] = legacyStickerMatch;
      return (
        <div className="flex items-center gap-2.5 py-1 px-1">
          <span className="text-3xl animate-bounce">{emoji}</span>
          <span className="font-offside text-xs font-bold tracking-wide uppercase dark:text-emerald-400 text-emerald-600">
            {text}
          </span>
        </div>
      );
    }
    return content;
  };

  return (
    <main className="flex-1 flex flex-col h-full min-h-0 w-full dark:bg-black/60 bg-neutral-50/70 backdrop-blur-md relative min-w-0 transition-colors duration-200 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 border-b dark:border-white/10 border-neutral-200 flex items-center justify-between dark:bg-black/80 bg-white/90 backdrop-blur-2xl z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Top-Left 'Friends' Button (visible whenever sidebar is in drawer/overlay mode or collapsed) */}
          {!isSplitView && (
            <button
              onClick={onOpenMobileSidebar}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-satin-obsidian hover:bg-satin-charcoal border border-satin-slate/30 text-white font-offside text-xs font-semibold shadow-sm active:scale-95 transition shrink-0"
              aria-label="Open Friends and Rooms"
              title="Friends & Rooms"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Friends</span>
            </button>
          )}

          {/* Chat Partner / Public Room Indicator */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 flex items-center justify-center dark:text-white text-neutral-900 shrink-0 shadow-sm relative">
              {activeTarget ? (
                <>
                  <span className="font-offside font-bold text-xs">
                    {activeTarget.charAt(0).toUpperCase()}
                  </span>
                  {isPartnerOnline ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 dark:ring-black ring-white animate-pulse"></span>
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-neutral-400 ring-2 dark:ring-black ring-white"></span>
                  )}
                </>
              ) : (
                <Radio className="w-4 h-4 text-emerald-500" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <h2 className="text-xs sm:text-sm font-bold dark:text-white text-neutral-900 truncate font-offside">
                  {activeTarget ? `@${activeTarget}` : 'Public Room'}
                </h2>
                {targetUserObj?.gender === 'Male' && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/20 font-sans font-medium">
                    Male
                  </span>
                )}
                {targetUserObj?.gender === 'Female' && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 font-sans font-medium">
                    Female
                  </span>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] dark:text-neutral-400 text-neutral-500 truncate flex items-center gap-1.5 font-electrolize">
                {activeTarget ? (
                  isPartnerOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-emerald-500 font-medium">Online · Direct Session</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                      <span>Offline · Saved 24h</span>
                    </>
                  )
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Campus Public Broadcast</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Dedicated SKIP Button for Random Stranger Chats */}
          {isRandomChat && activeTarget && (
            <button
              onClick={onSkipStranger}
              title="Skip this stranger and match with someone new"
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-orange-500/20 hover:from-rose-500/30 hover:to-orange-500/30 border border-rose-500/30 text-rose-400 font-offside text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <SkipForward className="w-3.5 h-3.5 text-rose-400" />
              <span>Skip ⏭️</span>
            </button>
          )}

          {/* Random Stranger Quick Button */}
          <button
            onClick={() => {
              if (onRandomStranger) onRandomStranger();
              triggerDissolveAndProceed();
            }}
            title="Chat with a Random Stranger"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl dark:bg-satin-obsidian bg-neutral-100 hover:dark:bg-emerald-500/20 hover:bg-emerald-50 border dark:border-satin-slate/30 border-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-offside flex items-center gap-1.5 transition"
          >
            <Shuffle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Random</span>
          </button>

          {/* Manual Refresh / Sync Button */}
          <button
            onClick={onManualSync}
            title="Refresh & Sync Latest Messages & Online Status"
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl dark:bg-satin-obsidian bg-neutral-100 hover:dark:bg-white/10 hover:bg-neutral-200 border dark:border-satin-slate/30 border-neutral-200 text-neutral-600 dark:text-neutral-300 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 text-satin-denim ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* 1-on-1 Chat Controls ONLY (Favorite and Block) */}
          {activeTarget && (
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/5 p-1 rounded-xl border dark:border-white/10 border-neutral-200">
              <button
                onClick={onToggleFavorite}
                title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                className={`p-1.5 rounded-lg text-xs font-offside flex items-center gap-1 transition ${
                  isFavorite
                    ? 'text-amber-500 bg-amber-500/10 dark:bg-amber-400/20 font-semibold'
                    : 'text-neutral-500 hover:text-amber-500'
                }`}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span className="hidden md:inline">{isFavorite ? 'Starred' : 'Favorite'}</span>
              </button>

              <button
                onClick={onToggleBlock}
                title={isBlocked ? 'Unblock user' : 'Block user'}
                className={`p-1.5 rounded-lg text-xs font-offside flex items-center gap-1 transition ${
                  isBlocked
                    ? 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 font-semibold'
                    : 'text-neutral-500 hover:text-rose-500'
                }`}
              >
                <ShieldBan className="w-4 h-4" />
                <span className="hidden md:inline">{isBlocked ? 'Blocked' : 'Block'}</span>
              </button>
            </div>
          )}

          {/* How to Use / About Chaattiko Info Card Trigger */}
          <button
            onClick={onOpenAbout}
            title="How to Use & About Chaattiko"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition flex items-center gap-1.5 text-xs font-offside"
          >
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Info</span>
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            className="p-2 rounded-xl dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
          </button>

          {/* 24h Ephemeral Notice Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full dark:bg-white/[0.03] bg-neutral-100 border dark:border-white/10 border-neutral-200 text-[11px] dark:text-neutral-400 text-neutral-600 font-electrolize">
            <Clock className="w-3 h-3 text-neutral-400" />
            <span>24h TTL</span>
          </div>
        </div>
      </header>

      {/* Blocked User Warning Banner (When current user blocked activeTarget) */}
      {isBlocked && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-rose-500 font-offside">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>You have blocked <strong>@{activeTarget}</strong>. Messages from this user are hidden.</span>
          </div>
          <button
            onClick={onToggleBlock}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-medium transition"
          >
            Unblock
          </button>
        </div>
      )}

      {/* Block Status Notification in Chat (When current user is blocked by target) */}
      {isBlockedByTarget && !isBlocked && (
        <div className="bg-satin-charcoal/30 border-b border-satin-slate/30 px-4 py-3 flex items-center justify-center text-xs text-satin-taupe font-offside text-center">
          <ShieldBan className="w-4 h-4 mr-2 text-satin-slate shrink-0" />
          <span>You have been blocked by this user. Messages cannot be sent.</span>
        </div>
      )}

      {/* Hero "Chaattiko" Sand-to-Space Particle Dissolve Overlay (Tap-Anywhere Trigger) */}
      {!heroDismissed && (
        <HeroSandDissolve
          theme={theme}
          dissolving={isDissolving}
          onComplete={() => {
            setHeroDismissed(true);
            setIsDissolving(false);
          }}
          onQuickStart={() => {
            triggerDissolveAndProceed();
            if (onChatInitiated) onChatInitiated();
          }}
        />
      )}

      {/* Message Feed */}
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 ${!heroDismissed && !isDissolving ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity duration-500'}`}>
        {/* Top Info Banner */}
        <div className="max-w-md mx-auto my-2 p-3 rounded-2xl glass-panel-subtle text-center text-xs dark:text-neutral-400 text-neutral-600 space-y-1">
          <div className="flex items-center justify-center gap-1.5 font-medium dark:text-neutral-300 text-neutral-700 font-electrolize">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Persistent 24-Hour Ephemeral Chat</span>
          </div>
          <p className="text-[11px] dark:text-neutral-500 text-neutral-500 leading-normal font-sans">
            Messages remain securely saved for 24 hours. Double-tap to react (one reaction per member)!
          </p>
        </div>

        {/* Messages List */}
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 dark:text-neutral-500 text-neutral-400">
            <div className="w-12 h-12 rounded-2xl dark:bg-white/[0.02] bg-neutral-100 border dark:border-white/5 border-neutral-200 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-xs font-offside">No messages in this channel yet.</p>
            <p className="text-[11px] text-neutral-400 mt-1 font-sans">
              {activeTarget ? `Say hello to @${activeTarget}! Messages stay saved for 24h.` : 'Start the conversation in the Public Room!'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.toLowerCase() === currentUser.handle.toLowerCase();
            const msgReactions = reactions[msg.id] || [];
            const myCurrentReaction = userReactions[msg.id] || null;

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender handle & time */}
                <div className="flex items-center gap-2 mb-1 px-1">
                  {!isMe && (
                    <span className="text-[11px] font-offside dark:text-neutral-400 text-neutral-600 font-medium">
                      @{msg.sender}
                    </span>
                  )}
                  <span className="text-[10px] dark:text-neutral-600 text-neutral-400 font-electrolize">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {/* Frosted Glass Message Bubble */}
                <div
                  onTouchStart={(e) => {
                    touchStartRef.current = {
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (!touchStartRef.current) return;
                    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
                    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
                    touchStartRef.current = null;
                    // Horizontal swipe of > 45px with minimal vertical deviation triggers reply
                    if (Math.abs(deltaX) > 45 && deltaY < 40) {
                      handleInitiateReply(msg);
                    }
                  }}
                  onDoubleClick={() => {
                    if (onToggleReaction) onToggleReaction(msg.id, '❤️');
                  }}
                  title="Double-tap to react ❤️ · Swipe or click reply icon to quote"
                  className={`max-w-[85%] sm:max-w-lg rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words transition shadow-sm relative select-text cursor-pointer group/bubble ${
                    isMe
                      ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-normal rounded-tr-sm'
                      : 'glass-panel dark:text-neutral-100 text-neutral-800 rounded-tl-sm border dark:border-white/10 border-neutral-200 font-normal'
                  }`}
                >
                  {/* WhatsApp / Instagram Quoted Reply Preview */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-xl border-l-4 text-xs font-sans select-none flex flex-col gap-0.5 ${
                        isMe
                          ? 'bg-black/10 dark:bg-black/15 border-emerald-500 text-neutral-800 dark:text-neutral-800'
                          : 'bg-white/10 dark:bg-white/5 border-emerald-400 dark:text-neutral-300 text-neutral-700'
                      }`}
                    >
                      <div className="font-bold text-[11px] font-offside text-emerald-500 truncate">
                        @{msg.replyTo.sender}
                      </div>
                      <div className="text-[11px] truncate opacity-85">
                        {msg.replyTo.content}
                      </div>
                    </div>
                  )}

                  {renderMessageContent(msg.content)}

                  {/* Reply Button on Hover (Desktop & Tablet) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInitiateReply(msg);
                    }}
                    title="Reply to this message"
                    className={`absolute -top-3.5 ${
                      isMe ? '-left-8' : '-right-8'
                    } p-1.5 rounded-full dark:bg-black/90 bg-white/95 border dark:border-white/15 border-neutral-300 shadow-md opacity-0 group-hover:opacity-100 transition hover:scale-110 active:scale-95`}
                  >
                    <Reply className="w-3.5 h-3.5 text-emerald-500" />
                  </button>

                  {/* Pop Reaction Emoji Picker on Hover (Single-Selection Toggle) */}
                  {hoveredMessageId === msg.id && (
                    <div
                      className={`absolute -top-8 ${
                        isMe ? 'right-0' : 'left-0'
                      } z-20 flex items-center gap-1 px-2 py-1 rounded-full dark:bg-black/95 bg-white/95 border dark:border-white/15 border-neutral-300 shadow-xl backdrop-blur-md animate-fade-in`}
                    >
                      {POP_EMOJIS.map((emoji) => {
                        const isMyPick = myCurrentReaction === emoji;
                        return (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleReaction) onToggleReaction(msg.id, emoji);
                            }}
                            title={isMyPick ? `Remove ${emoji}` : `React with ${emoji}`}
                            className={`transition-all text-xs p-1 rounded-full ${
                              isMyPick 
                                ? 'scale-125 bg-emerald-500/20 ring-1 ring-emerald-500' 
                                : 'hover:scale-130 active:scale-95'
                            }`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reaction Badges (Aggregated) */}
                {msgReactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {msgReactions.map((r, idx) => {
                      const isMyPick = myCurrentReaction === r.emoji;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (onToggleReaction) onToggleReaction(msg.id, r.emoji);
                          }}
                          title={isMyPick ? 'Click to remove reaction' : `React with ${r.emoji}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-electrolize border shadow-sm transition active:scale-95 ${
                            isMyPick
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30'
                              : 'dark:bg-white/10 bg-neutral-200 dark:border-white/10 border-neutral-300 dark:text-neutral-200 text-neutral-800'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          {r.count > 1 && <span className="text-[9px] opacity-80">{r.count}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing status */}
        {activeTypers.length > 0 && (
          <div className="flex items-center gap-2 text-xs dark:text-neutral-400 text-neutral-500 italic font-electrolize animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
            <span>
              {activeTypers.length === 1
                ? `@${activeTypers[0]} is typing...`
                : 'Multiple members are typing...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Gen-Z Expressive Sticker Picker Overlay */}
      <MemeStickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleSendSticker}
      />

      {/* Message Input Bar (Fixed at bottom, keyboard resilient) */}
      <div className="p-2.5 sm:p-4 dark:bg-black/90 bg-white/90 backdrop-blur-2xl border-t dark:border-white/10 border-neutral-200 shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {/* WhatsApp / Instagram Reply Preview Bar */}
        {replyingTo && (
          <div className="max-w-4xl mx-auto mb-2 p-2.5 rounded-2xl dark:bg-white/[0.05] bg-neutral-100 border-l-4 border-emerald-500 border dark:border-white/10 border-neutral-200 flex items-center justify-between text-xs animate-fade-in shadow-sm">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="font-bold font-offside text-emerald-500 text-[11px] truncate">
                Replying to @{replyingTo.sender}
              </span>
              <span className="text-[11px] dark:text-neutral-300 text-neutral-600 truncate font-sans">
                {replyingTo.content}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-200 dark:hover:bg-white/10 transition shrink-0"
              title="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isBlocked || isBlockedByTarget ? (
          <div className="max-w-4xl mx-auto py-2.5 text-center text-xs text-rose-500 font-offside">
            {isBlocked
              ? 'Messaging is disabled while this user is blocked. Unblock them to resume conversation.'
              : 'You have been blocked by this user. Messages cannot be sent.'}
          </div>
        ) : (
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-2 relative">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onFocus={triggerDissolveAndProceed}
                maxLength={2000}
                placeholder={
                  replyingTo
                    ? `Reply to @${replyingTo.sender}...`
                    : activeTarget
                    ? `Message @${activeTarget}...`
                    : 'Broadcast to Public Room...'
                }
                className="w-full pl-3.5 pr-11 py-2.5 sm:py-3 rounded-2xl glass-input text-xs sm:text-sm placeholder:text-neutral-400 font-sans focus:outline-none"
              />

              {/* Gen-Z Sticker Button inside input */}
              <button
                type="button"
                onClick={() => setShowStickerPicker((prev) => !prev)}
                title="Send a Gen-Z / Expressive Badge"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-emerald-500 transition"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 sm:p-3 rounded-2xl transition flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] ${
                inputText.trim()
                  ? 'dark:bg-white dark:text-black bg-neutral-900 text-white hover:opacity-90 shadow-sm cursor-pointer'
                  : 'dark:bg-white/5 bg-neutral-200 dark:text-neutral-600 text-neutral-400 cursor-not-allowed border dark:border-white/5 border-neutral-200'
              }`}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
