import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import OnboardingModal from './components/OnboardingModal';
import MemberDirectory from './components/MemberDirectory';
import ChatArea from './components/ChatArea';
import AdminDashboard from './components/AdminDashboard';
import FeedbackModal from './components/FeedbackModal';
import AboutInfoModal from './components/AboutInfoModal';
import SandSpaceBackground from './components/SandSpaceBackground';
import { getOrCreateDeviceToken, getClientDeviceInfo } from './utils/device';

export default function App() {
  // Theme Management (Dark / Light with persistence)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chaattiko_theme') || 'dark';
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [isAutoChecking, setIsAutoChecking] = useState(true);
  const [activeMembers, setActiveMembers] = useState([]);
  const [activeTarget, setActiveTarget] = useState(null); // null = Public Lounge, string = handle
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [alertNotice, setAlertNotice] = useState(null);

  // 1-on-1 Chat Controls State (Favorites & Blocks)
  const [favorites, setFavorites] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);

  // Random stranger mode tracking
  const [isRandomChat, setIsRandomChat] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Block status from the other side (they blocked me)
  const [isBlockedByTarget, setIsBlockedByTarget] = useState(false);

  // Window dimensions & Mobile/Responsive layout detection
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return window.innerWidth < 768 || (window.innerWidth < 1024 && hasTouch);
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(w < 768 || (w < 1024 && hasTouch));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modals & Dynamic UI State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [reactions, setReactions] = useState({}); // messageId -> [ { emoji, count } ]
  const [userReactions, setUserReactions] = useState({}); // messageId -> active emoji string
  const [hasStartedChat, setHasStartedChat] = useState(false);

  // Resizable & Collapsible Left Friends Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('chaattiko_sidebar_width');
    return saved ? parseInt(saved, 10) : 320;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('chaattiko_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('chaattiko_sidebar_collapsed', next.toString());
      return next;
    });
  };

  // Persistent side-by-side split view is active ONLY on fully maximized / wide screens (>= 1200px)
  // When un-maximized, resized, or narrow, sidebar collapses into a slide-out overlay drawer automatically
  const isSplitView = windowWidth >= 1200 && !isSidebarCollapsed;

  const handleStartSidebarResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 240), 540);
      setSidebarWidth(newWidth);
      localStorage.setItem('chaattiko_sidebar_width', newWidth.toString());
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Apply Theme to <html> root
  useEffect(() => {
    localStorage.setItem('chaattiko_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check URL for /admin or ?admin
  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path === '/admin' || search.includes('admin=true')) {
      setAdminView(true);
    }
  }, []);

  // 1. Permanent Device-Locked Account: Auto-Login on Load
  useEffect(() => {
    const autoLogin = async () => {
      const sessionToken = localStorage.getItem('chaattiko_session_token');
      const deviceToken = getOrCreateDeviceToken();
      const clientDeviceInfo = await getClientDeviceInfo();

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('user:auto-login', { sessionToken, deviceToken, clientDeviceInfo }, (res) => {
        setIsAutoChecking(false);
        if (res?.success && res.user) {
          if (res.sessionToken) {
            localStorage.setItem('chaattiko_session_token', res.sessionToken);
          }
          if (res.user.handle) {
            localStorage.setItem('chaattiko_saved_handle', res.user.handle);
          }
          setCurrentUser(res.user);
          // Keep hero display visible in public chat center until user taps anywhere or sends message
          setHasStartedChat(false);
        }
      });
    };

    autoLogin();

    // Timeout fallback if server is slow
    const timeout = setTimeout(() => {
      setIsAutoChecking(false);
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  // 45-Second Mobile App-Switch Auto-Reconnect & Focus Sync
  useEffect(() => {
    const handleReactivate = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        const sessionToken = localStorage.getItem('chaattiko_session_token');
        const deviceToken = getOrCreateDeviceToken();
        if (!socket.connected) {
          socket.connect();
        }
        socket.emit('user:auto-login', { sessionToken, deviceToken }, (res) => {
          if (res?.success && res.user) {
            if (res.sessionToken) {
              localStorage.setItem('chaattiko_session_token', res.sessionToken);
            }
            if (res.user.handle) {
              localStorage.setItem('chaattiko_saved_handle', res.user.handle);
            }
            setCurrentUser(res.user);
          }
        });
        // Sync members & current chat messages
        socket.emit('members:get', (list) => {
          setActiveMembers(list || []);
        });
        socket.emit('messages:history', { targetUser: activeTarget }, (res) => {
          const history = res?.messages || res || [];
          const blockedByTarget = res?.isBlockedByTarget || false;
          const cleanHistory = (history || []).filter(
            (m) => !blockedUsers.includes(m.sender.toLowerCase())
          );
          setMessages(cleanHistory);
          setIsBlockedByTarget(blockedByTarget);
        });
      }
    };

    window.addEventListener('visibilitychange', handleReactivate);
    window.addEventListener('focus', handleReactivate);
    return () => {
      window.removeEventListener('visibilitychange', handleReactivate);
      window.removeEventListener('focus', handleReactivate);
    };
  }, [activeTarget, blockedUsers]);

  // Manual Refresh / Sync trigger
  const handleManualSync = () => {
    setIsSyncing(true);
    const deviceToken = getOrCreateDeviceToken();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('user:auto-login', { deviceToken }, (res) => {
      if (res?.success && res.user) {
        setCurrentUser(res.user);
      }
    });

    socket.emit('members:get', (list) => {
      setActiveMembers(list || []);
    });

    socket.emit('messages:history', { targetUser: activeTarget }, (res) => {
      const history = res?.messages || res || [];
      const blockedByTarget = res?.isBlockedByTarget || false;
      const cleanHistory = (history || []).filter(
        (m) => !blockedUsers.includes(m.sender.toLowerCase())
      );
      setMessages(cleanHistory);
      setIsBlockedByTarget(blockedByTarget);
      setTimeout(() => setIsSyncing(false), 600);
    });
  };

  // Load User Preferences (Favorites & Blocks) when currentUser is set
  useEffect(() => {
    if (!currentUser) return;
    const myKey = currentUser.handle.toLowerCase();
    try {
      const savedFavs = JSON.parse(localStorage.getItem(`chaattiko_favs_${myKey}`) || '[]');
      const savedBlocks = JSON.parse(localStorage.getItem(`chaattiko_blocks_${myKey}`) || '[]');
      setFavorites(savedFavs);
      setBlockedUsers(savedBlocks);
    } catch {
      setFavorites([]);
      setBlockedUsers([]);
    }
  }, [currentUser]);

  // Toggle Favorite
  const handleToggleFavorite = () => {
    if (!activeTarget || !currentUser) return;
    const targetLower = activeTarget.toLowerCase();
    const myKey = currentUser.handle.toLowerCase();

    setFavorites((prev) => {
      let updated;
      if (prev.includes(targetLower)) {
        updated = prev.filter((h) => h !== targetLower);
      } else {
        updated = [...prev, targetLower];
      }
      localStorage.setItem(`chaattiko_favs_${myKey}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Toggle Block
  const handleToggleBlock = () => {
    if (!activeTarget || !currentUser) return;
    const targetLower = activeTarget.toLowerCase();
    const myKey = currentUser.handle.toLowerCase();
    const isCurrentlyBlocked = blockedUsers.includes(targetLower);

    if (!isCurrentlyBlocked) {
      if (!confirm(`Are you sure you want to block @${activeTarget}? You will no longer receive messages from this user.`)) {
        return;
      }
    }

    const nextState = !isCurrentlyBlocked;
    const updated = nextState
      ? [...blockedUsers, targetLower]
      : blockedUsers.filter((h) => h !== targetLower);

    setBlockedUsers(updated);
    localStorage.setItem(`chaattiko_blocks_${myKey}`, JSON.stringify(updated));

    socket.emit('block:toggle', { targetUser: activeTarget, isBlocked: nextState });
  };

  // Socket event binding
  useEffect(() => {
    if (!currentUser) return;

    // Listen for persistent member directory updates (includes online/offline states and tier badges)
    const handleMembersUpdate = (list) => {
      setActiveMembers(list || []);
      if (currentUser?.handle) {
        const me = (list || []).find((m) => m.handle.toLowerCase() === currentUser.handle.toLowerCase());
        if (me && (me.tier !== currentUser.tier || me.referralCount !== currentUser.referralCount)) {
          setCurrentUser((prev) => ({
            ...prev,
            tier: me.tier,
            referralCount: me.referralCount
          }));
        }
      }
    };

    // Listen for incoming messages
    const handleMessageReceive = (newMsg) => {
      const sender = newMsg.sender.toLowerCase();
      if (blockedUsers.includes(sender)) {
        return; // Silently drop message from blocked sender
      }

      const isLounge = newMsg.recipient === null;
      const myHandle = currentUser.handle.toLowerCase();
      const recipient = newMsg.recipient ? newMsg.recipient.toLowerCase() : null;

      let isCurrentView = false;
      if (activeTarget === null && isLounge) {
        isCurrentView = true;
      } else if (activeTarget !== null && !isLounge) {
        const targetLower = activeTarget.toLowerCase();
        if (
          (sender === targetLower && recipient === myHandle) ||
          (sender === myHandle && recipient === targetLower)
        ) {
          isCurrentView = true;
        }
      }

      if (isCurrentView) {
        setMessages((prev) => [...prev, newMsg]);
      } else {
        const channelKey = isLounge ? 'lounge' : sender;
        setUnreadCounts((prev) => ({
          ...prev,
          [channelKey]: (prev[channelKey] || 0) + 1
        }));
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    const handleMessagesVanished = ({ messageIds }) => {
      if (Array.isArray(messageIds) && messageIds.length > 0) {
        const idSet = new Set(messageIds);
        setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
      }
    };

    const handleThreadCleared = ({ channel, otherUser }) => {
      if (channel === 'lounge' && activeTarget === null) {
        setMessages([]);
      } else if (otherUser && activeTarget && otherUser.toLowerCase() === activeTarget.toLowerCase()) {
        setMessages([]);
      }
    };

    const handleMessageUpdate = ({ id, content }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content } : m))
      );
    };

    const handleTypingStatus = ({ user, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(user) ? prev : [...prev, user];
        } else {
          return prev.filter((u) => u !== user);
        }
      });
    };

    const handleUserKicked = ({ reason }) => {
      setAlertNotice({ title: 'Session Terminated', message: reason || 'You were disconnected by an administrator.' });
      handleLogout();
    };

    const handleUserBanned = ({ reason }) => {
      setAlertNotice({ title: 'Account Suspended', message: reason || 'Your handle has been banned by an administrator.' });
      handleLogout();
    };

    const handleReactionReceived = ({ messageId, reactions: updatedReactions, user, activeEmoji }) => {
      setReactions((prev) => ({
        ...prev,
        [messageId]: updatedReactions || []
      }));
      if (currentUser && user && user.toLowerCase() === currentUser.handle.toLowerCase()) {
        setUserReactions((prev) => ({
          ...prev,
          [messageId]: activeEmoji || null
        }));
      }
    };

    const handleBlockStatus = ({ blockedBy, isBlocked }) => {
      if (activeTarget && blockedBy && blockedBy.toLowerCase() === activeTarget.toLowerCase()) {
        setIsBlockedByTarget(isBlocked);
      }
    };

    socket.on('members:update', handleMembersUpdate);
    socket.on('message:receive', handleMessageReceive);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('messages:vanished', handleMessagesVanished);
    socket.on('chat:thread-cleared', handleThreadCleared);
    socket.on('message:update', handleMessageUpdate);
    socket.on('typing:status', handleTypingStatus);
    socket.on('user:kicked', handleUserKicked);
    socket.on('user:banned', handleUserBanned);
    socket.on('message:reactions-updated', handleReactionReceived);
    socket.on('user:block-status', handleBlockStatus);

    // Initial member list fetch
    socket.emit('members:get', (list) => {
      setActiveMembers(list || []);
    });

    // Strict 24-hour client-side cleanup timer (checks every 30 seconds)
    const clientVanishInterval = setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      setMessages((prev) => {
        const clean = prev.filter((m) => (m.createdAt || m.timestamp) >= cutoff);
        return clean.length === prev.length ? prev : clean;
      });
    }, 30 * 1000);

    return () => {
      clearInterval(clientVanishInterval);
      socket.off('members:update', handleMembersUpdate);
      socket.off('message:receive', handleMessageReceive);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('messages:vanished', handleMessagesVanished);
      socket.off('chat:thread-cleared', handleThreadCleared);
      socket.off('message:update', handleMessageUpdate);
      socket.off('typing:status', handleTypingStatus);
      socket.off('user:kicked', handleUserKicked);
      socket.off('user:banned', handleUserBanned);
      socket.off('message:reactions-updated', handleReactionReceived);
      socket.off('user:block-status', handleBlockStatus);
    };
  }, [currentUser, activeTarget, blockedUsers]);

  // Load message history & emit real-time chat target tracking
  useEffect(() => {
    if (!currentUser) return;

    const channelKey = activeTarget ? activeTarget.toLowerCase() : 'lounge';
    setUnreadCounts((prev) => ({ ...prev, [channelKey]: 0 }));
    setTypingUsers([]);
    setIsBlockedByTarget(false); // reset before fetching fresh history

    // Inform server of active chat target (for admin live session visibility)
    socket.emit('user:chatting-with', { targetUser: activeTarget });

    // Fetch 24h ephemeral messages (works even if target user is currently offline)
    socket.emit('messages:history', { targetUser: activeTarget }, (res) => {
      const history = res?.messages || res || [];
      const blockedByTarget = res?.isBlockedByTarget || false;
      const cleanHistory = (history || []).filter(
        (m) => !blockedUsers.includes(m.sender.toLowerCase())
      );
      setMessages(cleanHistory);
      setIsBlockedByTarget(blockedByTarget);
    });
  }, [currentUser, activeTarget, blockedUsers]);

  // Send message handler
  const handleSendMessage = (content, replyTo = null) => {
    if (activeTarget && blockedUsers.includes(activeTarget.toLowerCase())) {
      alert('You cannot send messages to a blocked user. Unblock them first.');
      return;
    }
    setHasStartedChat(true);
    socket.emit('message:send', {
      recipient: activeTarget,
      content,
      replyTo
    });
  };

  // Pop emoji reaction emission
  const handleAddReaction = (messageId, emoji) => {
    socket.emit('message:react', {
      messageId,
      emoji,
      targetUser: activeTarget
    });
  };

  // Random stranger matcher: Strictly ONLINE members only
  const handleRandomStranger = () => {
    const onlineCandidates = (activeMembers || []).filter(
      (m) =>
        m.handle.toLowerCase() !== (currentUser?.handle || '').toLowerCase() &&
        !blockedUsers.includes(m.handle.toLowerCase()) &&
        m.isOnline === true &&
        (activeTarget ? m.handle.toLowerCase() !== activeTarget.toLowerCase() : true)
    );

    if (onlineCandidates.length === 0) {
      alert('No online users available right now. Try again soon!');
      return;
    }

    const picked = onlineCandidates[Math.floor(Math.random() * onlineCandidates.length)];

    setActiveTarget(picked.handle);
    setIsRandomChat(true);
    setHasStartedChat(true);
  };

  // Dedicated "Skip" Handler for Random Stranger Chats
  const handleSkipStranger = () => {
    handleRandomStranger();
  };

  // Disconnect / Go Offline (Clears session token so returning user enters Step 1, keeps savedHandle for quick selection)
  const handleLogout = () => {
    const sessionToken = localStorage.getItem('chaattiko_session_token');
    socket.emit('user:logout', { sessionToken });
    localStorage.removeItem('chaattiko_session_token');
    socket.disconnect();
    setCurrentUser(null);
    setMessages([]);
    setActiveTarget(null);
  };

  // Selected partner object from persistent directory
  const targetUserObj = activeTarget
    ? activeMembers.find((m) => m.handle.toLowerCase() === activeTarget.toLowerCase())
    : null;

  // View: Admin Portal
  if (adminView) {
    return (
      <AdminDashboard
        theme={theme}
        onToggleTheme={toggleTheme}
        onExitAdmin={() => {
          setAdminView(false);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // Loading screen while auto-login checks
  if (isAutoChecking && !currentUser) {
    return (
      <div className="flex h-full h-[100dvh] w-full items-center justify-center dark:bg-black bg-neutral-100 font-mono text-xs dark:text-neutral-400 text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Connecting to Chaattiko device session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full h-[100dvh] w-full max-w-full overflow-hidden dark:bg-black/90 bg-neutral-100/90 dark:text-neutral-100 text-neutral-900 font-sans selection:bg-neutral-500/30 transition-colors duration-200 relative">
      {/* Background Sand-into-Space Particle Dispersion Layer */}
      <SandSpaceBackground theme={theme} />

      {/* Alert Notice Modal */}
      {alertNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-[92vw] max-w-sm glass-panel rounded-2xl p-6 text-center border dark:border-white/10 border-neutral-200 shadow-2xl dark:bg-black bg-white">
            <h3 className="text-base font-bold text-rose-500 font-mono">{alertNotice.title}</h3>
            <p className="text-xs dark:text-neutral-300 text-neutral-600 mt-2 mb-5 font-normal leading-relaxed">
              {alertNotice.message}
            </p>
            <button
              onClick={() => setAlertNotice(null)}
              className="w-full py-2.5 rounded-xl dark:bg-white dark:text-black bg-neutral-900 text-white text-xs font-semibold hover:opacity-90 transition"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={currentUser}
      />

      {/* About Chaattiko / How to Use Modal */}
      <AboutInfoModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Onboarding View (if device is not yet registered) */}
      {!currentUser ? (
        <OnboardingModal
          theme={theme}
          onToggleTheme={toggleTheme}
          onJoinSuccess={(user) => {
            setCurrentUser(user);
            setActiveTarget(null); // Direct entry into Public Room
            // User sees "Chaattiko" centered in the public room, tapping or typing dissolves it like sand
            setHasStartedChat(false);
            setIsMobileOpen(false); // Friends sidebar hidden by default on mobile
          }}
        />
      ) : (
        /* Main Real-Time Split-Screen Layout (Semi-transparent to show sand particle background) */
        <div className="flex w-full h-full relative overflow-hidden z-10">
          {/* Sidebar / Member Directory */}
          <MemberDirectory
            currentUser={currentUser}
            activeMembers={activeMembers}
            activeTarget={activeTarget}
            socket={socket}
            onUpdateAvatar={(avatarId) => setCurrentUser(prev => prev ? ({ ...prev, avatar: avatarId }) : prev)}
            onSelectTarget={(target) => {
              setActiveTarget(target);
              setIsRandomChat(false);
              setHasStartedChat(true);
            }}
            onLogout={handleLogout}
            unreadCounts={unreadCounts}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
            theme={theme}
            onToggleTheme={toggleTheme}
            favorites={favorites}
            blockedUsers={blockedUsers}
            onOpenFeedback={() => setIsFeedbackOpen(true)}
            onRandomStranger={handleRandomStranger}
            sidebarWidth={sidebarWidth}
            onStartResize={handleStartSidebarResize}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
            isSplitView={isSplitView}
            isMobile={isMobile}
          />

          {/* Drawer Overlay Backdrop (visible whenever sidebar is in overlay drawer mode and opened) */}
          {!isSplitView && isMobileOpen && (
            <div
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity"
            />
          )}

          {/* Active Chat Area (always occupies full available width) */}
          <ChatArea
            currentUser={currentUser}
            activeTarget={activeTarget}
            targetUserObj={targetUserObj}
            messages={messages}
            onSendMessage={handleSendMessage}
            onOpenMobileSidebar={() => setIsMobileOpen(true)}
            typingUsers={typingUsers}
            theme={theme}
            onToggleTheme={toggleTheme}
            isFavorite={activeTarget ? favorites.includes(activeTarget.toLowerCase()) : false}
            isBlocked={activeTarget ? blockedUsers.includes(activeTarget.toLowerCase()) : false}
            isBlockedByTarget={isBlockedByTarget}
            isMobile={isMobile}
            isSplitView={isSplitView}
            onToggleFavorite={handleToggleFavorite}
            onToggleBlock={handleToggleBlock}
            onRandomStranger={handleRandomStranger}
            onOpenAbout={() => setIsAboutOpen(true)}
            reactions={reactions}
            userReactions={userReactions}
            onToggleReaction={handleAddReaction}
            hasStartedChat={hasStartedChat}
            onChatInitiated={() => setHasStartedChat(true)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebarCollapse={handleToggleSidebarCollapse}
            isRandomChat={isRandomChat}
            onSkipStranger={handleSkipStranger}
            isSyncing={isSyncing}
            onManualSync={handleManualSync}
          />
        </div>
      )}
    </div>
  );
}
