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
  Gamepad2,
  Palette,
  X,
  ArrowDown
} from 'lucide-react';
import { socket } from '../socket';
import MemeStickerPicker from './MemeStickerPicker';
import HeroSandDissolve from './HeroSandDissolve';
import MiniGamesMenu from './MiniGamesMenu';
import CoinDiceOverlay from './CoinDiceOverlay';
import BouncePaddleGame from './BouncePaddleGame';
import PrivateThemePickerModal, { OUTFIT_DEFAULTS } from './PrivateThemePickerModal';
import QuestionGameCard, { renderRevealedAnswersCard } from './QuestionGameCard';
import { UserTierBadge } from './MemberDirectory';
import { renderUserAvatar } from './ProfileAvatarPickerModal';
import WhatsAppDoodleBackground from './WhatsAppDoodleBackground';

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

  // Live Synchronized Mini-Games States
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [activeGameData, setActiveGameData] = useState(null);
  const [isBounceGameOpen, setIsBounceGameOpen] = useState(false);
  const [partnerGameMilestone, setPartnerGameMilestone] = useState(null);

  // Private Theme Pack State & Live Sync
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [privateThemeConfig, setPrivateThemeConfig] = useState(null);

  const applyThemeToHtml = (cfg) => {
    if (cfg && cfg.outfit) {
      const pat = cfg.pattern === 'auto'
        ? (OUTFIT_DEFAULTS[cfg.outfit]?.pattern || 'woven')
        : (cfg.pattern || 'woven');
      document.documentElement.setAttribute('data-style', cfg.outfit);
      document.documentElement.setAttribute('data-card', cfg.cardStyle || 'glass');
      document.documentElement.setAttribute('data-pat', pat);
      if (cfg.mode === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (cfg.mode === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } else {
      document.documentElement.removeAttribute('data-style');
      document.documentElement.removeAttribute('data-card');
      document.documentElement.removeAttribute('data-pat');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Sync private theme when activeTarget changes
  useEffect(() => {
    if (!activeTarget) {
      setPrivateThemeConfig(null);
      applyThemeToHtml(null);
      return;
    }

    // Fetch theme for this private chat room
    socket.emit('private:theme_get', { targetUser: activeTarget }, (serverTheme) => {
      setPrivateThemeConfig(serverTheme || null);
      applyThemeToHtml(serverTheme || null);
    });

    const handleThemeSync = ({ targetUser, themeConfig }) => {
      if (activeTarget && targetUser && targetUser.toLowerCase() === activeTarget.toLowerCase()) {
        setPrivateThemeConfig(themeConfig || null);
        applyThemeToHtml(themeConfig || null);
      }
    };

    socket.on('private:theme_sync', handleThemeSync);
    return () => {
      socket.off('private:theme_sync', handleThemeSync);
      applyThemeToHtml(null);
    };
  }, [activeTarget, theme]);

  const handleApplyPrivateTheme = (newConfig) => {
    setPrivateThemeConfig(newConfig);
    applyThemeToHtml(newConfig);
    socket.emit('private:theme_change', {
      targetUser: activeTarget,
      themeConfig: newConfig
    });
  };

  const handleResetPrivateTheme = () => {
    setPrivateThemeConfig(null);
    applyThemeToHtml(null);
    socket.emit('private:theme_reset', {
      targetUser: activeTarget
    });
  };

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevActiveTargetRef = useRef(activeTarget);
  const typingTimeoutRef = useRef(null);

  // Unread messages & floating button state (specifically for Public Chat)
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isPublicChat = !activeTarget;

  // Real-time scroll listener: tracks distance from bottom and auto-hides button
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 100; // 80px - 120px range
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceFromBottom <= threshold;

    isAtBottomRef.current = isNearBottom;

    // Auto-hide button and reset unread count when user scrolls back to the bottom
    if (isNearBottom) {
      setShowScrollBottomBtn(false);
      setUnreadCount(0);
    }
  };

  // Smoothly scrolls to the bottom on clicking the floating down button
  const handleScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottomBtn(false);
    setUnreadCount(0);
    isAtBottomRef.current = true;
  };

  // Listen to live synchronized game events
  useEffect(() => {
    const handleCoinResult = (data) => {
      // Show the flipping animation ONLY to the user who initiated it
      if (data?.initiatedBy && currentUser?.handle && data.initiatedBy.toLowerCase() === currentUser.handle.toLowerCase()) {
        setActiveGameData(data);
      }
    };

    const handleDiceResult = (data) => {
      // Show the rolling animation ONLY to the user who initiated it
      if (data?.initiatedBy && currentUser?.handle && data.initiatedBy.toLowerCase() === currentUser.handle.toLowerCase()) {
        setActiveGameData(data);
      }
    };

    const handleBallScoreUpdate = (data) => {
      if (data.player && currentUser?.handle && data.player.toLowerCase() !== currentUser.handle.toLowerCase()) {
        setPartnerGameMilestone(data);
        setTimeout(() => {
          setPartnerGameMilestone(null);
        }, 5000);
      }
    };

    socket.on('game:coin_toss_result', handleCoinResult);
    socket.on('game:dice_roll_result', handleDiceResult);
    socket.on('game:ball_score_update', handleBallScoreUpdate);

    return () => {
      socket.off('game:coin_toss_result', handleCoinResult);
      socket.off('game:dice_roll_result', handleDiceResult);
      socket.off('game:ball_score_update', handleBallScoreUpdate);
    };
  }, [currentUser?.handle]);

  const handleSelectGame = (gameId) => {
    if (gameId === 'coin_toss') {
      socket.emit('game:coin_toss', { targetUser: activeTarget });
    } else if (gameId === 'questions_game') {
      socket.emit('game:question_start', { targetUser: activeTarget });
    } else if (gameId === 'bounce_paddle') {
      setIsBounceGameOpen(true);
    } else if (gameId === 'tic_tac_toe') {
      socket.emit('game:xo_start', { targetUser: activeTarget });
    }
  };

  const handleXOMove = (gameId, messageId, cellIndex) => {
    socket.emit('game:xo_move', {
      gameId,
      messageId,
      cellIndex,
      targetUser: activeTarget
    });
  };

  const handleReplayGame = () => {
    if (!activeGameData) return;
    if (activeGameData.game === 'coin_toss') {
      socket.emit('game:coin_toss', { targetUser: activeTarget });
    } else if (activeGameData.game === 'dice_roll') {
      socket.emit('game:dice_roll', { targetUser: activeTarget });
    }
  };

  useEffect(() => {
    if (hasStartedChat && !heroDismissed && !isDissolving) {
      setIsDissolving(true);
    }
  }, [hasStartedChat, heroDismissed, isDissolving]);

  // Conditional auto-scroll: preserves user's scroll position when scrolled up in Public Chat
  useEffect(() => {
    // A. Channel switch (switching between Public Chat and Private Chats)
    if (prevActiveTargetRef.current !== activeTarget) {
      prevActiveTargetRef.current = activeTarget;
      prevMessagesLengthRef.current = messages.length;
      isAtBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      return;
    }

    const prevLen = prevMessagesLengthRef.current;
    const newLen = messages.length;
    const hasNewMessages = newLen > prevLen;
    prevMessagesLengthRef.current = newLen;

    // B. If no new messages were added (e.g. reaction toggle, reaction count change)
    if (!hasNewMessages) {
      if (isAtBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // C. New message arrived
    const latestMsg = messages[messages.length - 1];
    const isMe = latestMsg && latestMsg.sender && currentUser &&
      latestMsg.sender.toLowerCase() === currentUser.handle.toLowerCase();

    if (isPublicChat) {
      if (isMe) {
        // Current user sent a message -> scroll to bottom
        isAtBottomRef.current = true;
        setShowScrollBottomBtn(false);
        setUnreadCount(0);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Incoming message from another user in Public Chat
        if (isAtBottomRef.current) {
          // User is at the bottom -> auto-scroll smoothly
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          // User has scrolled UP -> DO NOT auto-scroll!
          // Preserve their exact scroll position & display the floating down-arrow button
          setShowScrollBottomBtn(true);
          setUnreadCount((prev) => prev + (newLen - prevLen));
        }
      }
    } else {
      // Private chat: standard smooth scroll if at bottom or sent by me
      if (isAtBottomRef.current || isMe) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setShowScrollBottomBtn(true);
        setUnreadCount((prev) => prev + (newLen - prevLen));
      }
    }
  }, [messages, currentUser, activeTarget, isPublicChat]);

  // Respect scroll position for typing indicators & hero dissolve
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [typingUsers, heroDismissed]);

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

  // Render sticker or custom game result card if message has special format
  const renderXOGameCard = (game) => {
    const myHandle = currentUser?.handle?.toLowerCase();
    const isPlayerX = myHandle === game.playerX?.toLowerCase();
    const isPlayerO = game.playerO && myHandle === game.playerO?.toLowerCase();

    const isMyTurn =
      game.status === 'ACTIVE' &&
      ((isPlayerX && game.turn?.toLowerCase() === myHandle) ||
        (isPlayerO && game.turn?.toLowerCase() === myHandle) ||
        (!game.playerO && !isPlayerX && (game.turn === 'WAITING_FOR_O' || game.turn?.toLowerCase() !== game.playerX?.toLowerCase())));

    let statusText = '';
    let statusClass = 'text-neutral-400';

    if (game.status === 'ACTIVE') {
      if (isMyTurn) {
        statusText = '✨ Your turn! Pick a square';
        statusClass = isPlayerX ? 'text-cyan-300 font-bold animate-pulse' : 'text-rose-300 font-bold animate-pulse';
      } else if (!game.playerO) {
        statusText = 'Waiting for opponent to play O...';
        statusClass = 'text-amber-300';
      } else {
        statusText = `Waiting for @${game.turn}...`;
        statusClass = 'text-neutral-400';
      }
    } else if (game.status === 'WON') {
      const winnerName = game.winner === 'X' ? game.playerX : game.playerO;
      statusText = `🏆 @${winnerName} Won!`;
      statusClass = game.winner === 'X' ? 'text-cyan-300 font-bold' : 'text-rose-300 font-bold';
    } else if (game.status === 'DRAW') {
      statusText = "🤝 Game Draw!";
      statusClass = 'text-amber-300 font-bold';
    }

    return (
      <div
        className="w-[280px] sm:w-[320px] p-4 rounded-3xl select-none text-left transition-all shadow-2xl relative overflow-hidden"
        style={{
          background: 'rgba(18, 20, 30, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 16px 40px rgba(0, 0, 0, 0.65)'
        }}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-rose-500 flex items-center justify-center text-xs font-black shadow-md text-white font-mono">
              XO
            </div>
            <div>
              <div className="text-xs font-bold font-offside tracking-wide text-white leading-tight">
                XO Duel
              </div>
              <div className="text-[9px] font-mono text-neutral-400">
                Turn-based 3x3
              </div>
            </div>
          </div>

          {/* Players badges */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-full border ${
                game.turn?.toLowerCase() === game.playerX?.toLowerCase() && game.status === 'ACTIVE'
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200 ring-1 ring-cyan-400/40'
                  : 'bg-white/5 border-white/10 text-neutral-400'
              }`}
            >
              <strong className="text-cyan-400 font-black">X:</strong> @{game.playerX}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full border ${
                game.turn?.toLowerCase() === game.playerO?.toLowerCase() && game.status === 'ACTIVE'
                  ? 'bg-rose-500/20 border-rose-400/60 text-rose-200 ring-1 ring-rose-400/40'
                  : 'bg-white/5 border-white/10 text-neutral-400'
              }`}
            >
              <strong className="text-rose-400 font-black">O:</strong> {game.playerO ? `@${game.playerO}` : 'Waiting'}
            </span>
          </div>
        </div>

        {/* Turn / Outcome Banner */}
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-center">
          <p className={`text-xs font-mono tracking-wide ${statusClass}`}>
            {statusText}
          </p>
        </div>

        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/10">
          {game.board.map((cell, idx) => {
            const isWinningCell = game.winningLine && game.winningLine.includes(idx);
            const canClick = isMyTurn && cell === null;

            return (
              <button
                key={idx}
                type="button"
                disabled={!canClick}
                onClick={(e) => {
                  e.stopPropagation();
                  handleXOMove(game.gameId, game.messageId, idx);
                }}
                className={`h-16 sm:h-18 rounded-xl flex items-center justify-center font-mono font-black text-2xl sm:text-3xl transition-all duration-150 select-none relative ${
                  cell === null
                    ? canClick
                      ? 'bg-white/[0.06] hover:bg-white/[0.14] hover:scale-105 active:scale-95 border border-white/15 cursor-pointer ring-0 hover:ring-2 hover:ring-purple-400/50'
                      : 'bg-white/[0.02] border border-white/5 cursor-not-allowed opacity-50'
                    : isWinningCell
                    ? 'bg-gradient-to-br from-amber-500/30 via-pink-500/30 to-purple-600/40 border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-105 animate-pulse'
                    : 'bg-white/[0.08] border border-white/15'
                }`}
              >
                {cell === 'X' && (
                  <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)] animate-scale-in">
                    ✕
                  </span>
                )}
                {cell === 'O' && (
                  <span className="text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-scale-in">
                    ◯
                  </span>
                )}
                {cell === null && canClick && (
                  <span className="text-white/20 text-xs font-sans group-hover:opacity-100">
                    tap
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Rematch button when completed */}
        {game.status !== 'ACTIVE' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              socket.emit('game:xo_start', { targetUser: activeTarget });
            }}
            className="w-full mt-3 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-rose-500/20 hover:from-cyan-500/30 hover:to-rose-500/30 border border-purple-500/35 text-xs text-white font-offside tracking-wide flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>New XO Match</span>
          </button>
        )}
      </div>
    );
  };

  const renderMessageContent = (content) => {
    // 0.1 Interactive In-Chat Ice Breaker Question Game Card
    if (content && content.startsWith('[game:question:')) {
      try {
        const rawJson = content.slice(15, -1);
        const game = JSON.parse(rawJson);
        return (
          <QuestionGameCard
            game={game}
            currentUser={currentUser}
            activeTarget={activeTarget}
          />
        );
      } catch (e) {
        console.error('Failed to parse Question game content:', e);
      }
    }

    // 0.2 Ice Breaker Revealed Answers Message (<userId>/answer=<their answer>)
    if (content && content.startsWith('[icebreaker:answers:')) {
      return renderRevealedAnswersCard(content);
    }

    // 0. Interactive In-Chat Tic-Tac-Toe (XO) Game Message
    if (content && content.startsWith('[game:xo:')) {
      try {
        const rawJson = content.slice(9, -1);
        const game = JSON.parse(rawJson);
        return renderXOGameCard(game);
      } catch (e) {
        console.error('Failed to parse XO game content:', e);
      }
    }
    // 1. Coin Toss Game Message
    const coinMatch = content.match(/^\[game:coin_toss:(HEADS|TAILS):([^\]]+)\]$/i);
    if (coinMatch) {
      const [, result, sender] = coinMatch;
      return (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-500/15 to-black/60 border border-amber-400/40 shadow-xl select-none min-w-[220px] text-left">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-amber-400/20">
            <span className="text-[10px] font-mono tracking-widest text-amber-300 font-bold uppercase flex items-center gap-1.5">
              <span>🪙 COIN TOSS</span>
            </span>
            <span className="text-[9px] font-mono text-neutral-400">@{sender}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl shadow-md border border-amber-200">
              🪙
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-mono">OUTCOME</div>
              <div className="text-lg font-black font-mono tracking-wider text-amber-200 drop-shadow">
                {result}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 2. Dice Roll Game Message (With special celebratory highlight for 6)
    const diceMatch = content.match(/^\[game:dice_roll:([1-6]):([^\]]+)\]$/i);
    if (diceMatch) {
      const [, result, sender] = diceMatch;
      const isSix = result === '6';
      return (
        <div className={`p-3.5 rounded-2xl select-none min-w-[220px] text-left transition-all ${
          isSix
            ? 'bg-gradient-to-br from-amber-500/30 via-pink-500/25 to-purple-600/40 border-2 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
            : 'bg-gradient-to-br from-purple-500/20 via-indigo-500/15 to-black/60 border border-purple-400/40 shadow-xl'
        }`}>
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
            <span className={`text-[10px] font-mono tracking-widest font-bold uppercase flex items-center gap-1.5 ${
              isSix ? 'text-amber-300 animate-pulse' : 'text-purple-300'
            }`}>
              <span>🎲 {isSix ? '🌟 CRITICAL SIX!' : 'DICE ROLL'}</span>
            </span>
            <span className="text-[9px] font-mono text-neutral-400">@{sender}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-mono font-bold shadow-md border ${
              isSix
                ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-black border-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-purple-300'
            }`}>
              {result}
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {isSix ? 'MAXIMUM ROLL' : 'NUMBER ROLLED'}
              </div>
              <div className={`text-base font-bold font-mono tracking-wider ${
                isSix ? 'text-amber-200' : 'text-white'
              }`}>
                {isSix ? 'LUCKY 6!' : `Rolled a ${result}`}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. Bounce Paddle Game Message (Milestones & Scores)
    const ballMatch = content.match(/^\[game:ball_score:(\d+):([^:]+):([^\]]+)\]$/i);
    if (ballMatch) {
      const [, score, status, sender] = ballMatch;
      const isMilestone = status === '100_MILESTONE';
      return (
        <div className={`p-3.5 rounded-2xl select-none min-w-[230px] text-left transition-all ${
          isMilestone
            ? 'bg-gradient-to-br from-purple-500/30 via-pink-500/25 to-indigo-600/40 border-2 border-purple-400 shadow-[0_0_22px_rgba(168,85,247,0.45)]'
            : 'bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-black/60 border border-indigo-400/35 shadow-xl'
        }`}>
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
            <span className="text-[10px] font-mono tracking-widest text-purple-300 font-bold uppercase flex items-center gap-1.5">
              <span>🎾 2D BOUNCE PADDLE</span>
            </span>
            <span className="text-[9px] font-mono text-neutral-400">@{sender}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shadow-md border border-purple-300">
              {isMilestone ? '🏆' : '🎾'}
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {isMilestone ? '100-PT MILESTONE!' : 'GAME RESULT'}
              </div>
              <div className="text-base font-bold font-mono tracking-wide text-white">
                <span className="text-purple-300 font-mono text-lg">{score}</span> Points
              </div>
            </div>
          </div>
        </div>
      );
    }

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
    <main className={`flex-1 flex flex-col h-full min-h-0 w-full dark:bg-black/60 bg-neutral-50/70 backdrop-blur-md relative min-w-0 transition-colors duration-200 overflow-hidden ${privateThemeConfig?.outfit ? 'theme-styled-chat' : ''}`}>
      {/* Dynamic Background Pattern when Theme Pack is Active */}
      {privateThemeConfig?.outfit && (
        <div className="theme-pattern" />
      )}
      {/* WhatsApp-Style Cute & Whimsical Doodle Wallpaper with Center Icon-Only Logo */}
      {!privateThemeConfig?.outfit && (
        <WhatsAppDoodleBackground theme={theme} />
      )}

      {/* Top Header */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 border-b dark:border-white/10 border-neutral-200 flex items-center justify-between dark:bg-black/80 bg-white/90 backdrop-blur-2xl z-10 shrink-0 relative">
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
            {activeTarget ? (
              <div className="relative shrink-0">
                {renderUserAvatar(targetUserObj?.avatar, activeTarget, 'w-8 h-8 sm:w-9 sm:h-9 text-base')}
                {/* Profile Grade Badge (Bottom-Left Corner) */}
                <UserTierBadge tier={targetUserObj?.tier} />
                {isPartnerOnline ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 dark:ring-black ring-white animate-pulse"></span>
                ) : (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-neutral-400 ring-2 dark:ring-black ring-white"></span>
                )}
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200 flex items-center justify-center dark:text-white text-neutral-900 shrink-0 shadow-sm relative">
                <Radio className="w-4 h-4 text-emerald-500" />
              </div>
            )}

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

          {/* 1-on-1 Chat Controls ONLY (Theme, Favorite and Block) */}
          {activeTarget && (
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-white/5 p-1 rounded-xl border dark:border-white/10 border-neutral-200">
              <button
                onClick={() => setShowThemePicker(true)}
                title="Private Chat Theme Pack (Live Synced)"
                className={`p-1.5 rounded-lg text-xs font-offside flex items-center gap-1 transition ${
                  privateThemeConfig?.outfit
                    ? 'text-purple-400 bg-purple-500/20 font-semibold shadow-sm'
                    : 'text-neutral-500 hover:text-purple-400'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span className="hidden md:inline">Theme</span>
                {privateThemeConfig?.outfit && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                )}
              </button>

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

      {/* Floating Down-Arrow Button for Public Chat New Messages */}
      {isPublicChat && showScrollBottomBtn && (
        <button
          type="button"
          onClick={handleScrollToBottom}
          title="Scroll to latest messages"
          aria-label="Scroll to latest messages"
          className="absolute top-16 sm:top-20 right-4 sm:right-6 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full dark:bg-black/85 bg-white/90 backdrop-blur-2xl border dark:border-white/15 border-neutral-300 text-neutral-200 dark:text-neutral-100 shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-offside cursor-pointer animate-fade-in group"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 group-hover:bg-emerald-500/30 transition">
            <ArrowDown className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
          </div>
          <span className="hidden sm:inline text-[11px] font-sans text-neutral-300">
            New Messages
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 min-w-[18px] text-center rounded-full bg-emerald-500 text-black text-[10px] font-mono font-bold shadow-sm animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Message Feed */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative z-[1] ${!heroDismissed && !isDissolving ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity duration-500'}`}
      >
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

                {/* Frosted Glass Message Bubble (Medium-dark gray for Sent, Warm dark cream for Received, Custom Game Card for Games) */}
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
                  className={`max-w-[88%] sm:max-w-lg transition relative select-text cursor-pointer group/bubble ${
                    msg.content.startsWith('[game:') || msg.content.startsWith('[icebreaker:')
                      ? ''
                      : `rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm ${
                          isMe ? 'rounded-tr-sm font-normal' : 'rounded-tl-sm font-normal'
                        } ${
                          privateThemeConfig?.outfit
                            ? (isMe ? 'themed-msg-me' : 'themed-msg-them')
                            : ''
                        }`
                  }`}
                  style={
                    msg.content.startsWith('[game:') || msg.content.startsWith('[icebreaker:') || privateThemeConfig?.outfit
                      ? {}
                      : isMe
                      ? {
                          background: '#3A3D45',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                        }
                      : {
                          background: '#0D3B66',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)'
                        }
                  }
                >
                  {/* WhatsApp / Instagram Quoted Reply Preview */}
                  {msg.replyTo && (
                    <div
                      className={`mb-2 p-2 rounded-xl border-l-4 text-xs font-sans select-none flex flex-col gap-0.5 ${
                        isMe
                          ? 'bg-black/25 border-emerald-400 text-neutral-200'
                          : 'bg-black/30 border-cyan-400 text-neutral-100'
                      }`}
                    >
                      <div className={`font-bold text-[11px] font-offside truncate ${isMe ? 'text-emerald-400' : 'text-cyan-300'}`}>
                        @{msg.replyTo.sender}
                      </div>
                      <div className="text-[11px] truncate opacity-90">
                        {msg.replyTo.content}
                      </div>
                    </div>
                  )}

                  {renderMessageContent(msg.content)}

                  {/* Reply Button on Hover & Touch (Vertically Right-Centered) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInitiateReply(msg);
                    }}
                    title="Reply to this message"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                    className="absolute -right-9 p-1.5 rounded-full dark:bg-black/90 bg-white/95 border dark:border-white/15 border-neutral-300 shadow-md opacity-0 group-hover/bubble:opacity-100 group-hover:opacity-100 transition hover:scale-110 active:scale-95 z-10"
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

      {/* Gen-Z & Expressive Sticker Picker Overlay */}
      <MemeStickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleSendSticker}
        currentUser={currentUser}
      />

      {/* Message Input Bar (Fixed at bottom, dark frosted glass theme, keyboard resilient) */}
      <div className="p-2.5 sm:p-4 dark:bg-black/85 bg-white/85 backdrop-blur-2xl border-t dark:border-white/10 border-neutral-200 shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))] relative">
        {/* Live Partner Game Milestone Alert (e.g. 100 Points in Bounce Paddle) */}
        {partnerGameMilestone && (
          <div className="max-w-md mx-auto mb-2.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 backdrop-blur-xl flex items-center justify-between text-xs text-purple-200 animate-bounce shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎾</span>
              <span>
                <strong>@{partnerGameMilestone.player}</strong>{' '}
                {partnerGameMilestone.milestone
                  ? `reached a huge milestone: ${partnerGameMilestone.score} POINTS in 2D Bounce Paddle!`
                  : `scored ${partnerGameMilestone.score} points in 2D Bounce Paddle!`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPartnerGameMilestone(null)}
              className="p-1 rounded-lg text-purple-300 hover:text-white hover:bg-purple-500/30 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

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
            {/* Gaming Controller Shaped Mini-Games Menu */}
            <MiniGamesMenu
              isOpen={showGameMenu}
              onClose={() => setShowGameMenu(false)}
              onSelectGame={handleSelectGame}
              activeTarget={activeTarget}
            />

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
                className="w-full pl-3.5 pr-20 py-2.5 sm:py-3 rounded-2xl glass-input text-xs sm:text-sm placeholder:text-neutral-400 font-sans focus:outline-none"
              />

              {/* Dedicated Game Section Controller Button (Immediately left of Sticker Pack) */}
              <button
                type="button"
                onClick={() => setShowGameMenu((prev) => !prev)}
                title="Mini-Games & Interactive Challenges"
                className="absolute right-10 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-indigo-400 transition cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5" />
              </button>

              {/* Gen-Z Sticker Button inside input */}
              <button
                type="button"
                onClick={() => setShowStickerPicker((prev) => !prev)}
                title="Send a Sticker Badge"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-purple-400 transition cursor-pointer"
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

      {/* Synchronized Coin Toss & Dice Roll 3D Animated Overlay */}
      <CoinDiceOverlay
        activeGameData={activeGameData}
        onClose={() => setActiveGameData(null)}
        onReplay={handleReplayGame}
      />

      {/* Bounce Paddle Interactive Mini-Game Modal */}
      <BouncePaddleGame
        isOpen={isBounceGameOpen}
        onClose={() => setIsBounceGameOpen(false)}
        activeTarget={activeTarget}
        currentUser={currentUser}
      />

      {/* Private Chat Theme Pack Modal */}
      {activeTarget && (
        <PrivateThemePickerModal
          isOpen={showThemePicker}
          onClose={() => setShowThemePicker(false)}
          activeTarget={activeTarget}
          themeConfig={privateThemeConfig}
          onApplyTheme={handleApplyPrivateTheme}
          onResetTheme={handleResetPrivateTheme}
        />
      )}
    </main>
  );
}
