import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { 
  ShieldAlert, 
  Lock, 
  Key, 
  Trash2, 
  Users, 
  Activity, 
  Clock, 
  Monitor, 
  Smartphone, 
  Search, 
  CheckCircle2, 
  MapPin, 
  MessageSquare, 
  MessageSquarePlus,
  Radio,
  Sun,
  Moon,
  ArrowRightLeft,
  AlertTriangle,
  RotateCw,
  Cpu,
  Wifi
} from 'lucide-react';
import { getOrCreateDeviceToken } from '../utils/device';

export default function AdminDashboard({ onExitAdmin, theme, onToggleTheme }) {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAdminSyncing, setIsAdminSyncing] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(() => {
    return localStorage.getItem('chaattiko_admin_locked') === 'true';
  });
  const [remainingAttempts, setRemainingAttempts] = useState(() => {
    const saved = localStorage.getItem('chaattiko_admin_remaining');
    return saved !== null ? parseInt(saved, 10) : 3;
  });

  // Admin Data State
  const [activeMembers, setActiveMembers] = useState([]);
  const [pairedThreads, setPairedThreads] = useState([]);
  const [selectedPairKey, setSelectedPairKey] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [bannedList, setBannedList] = useState([]);
  const [kickedList, setKickedList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [selectedTab, setSelectedTab] = useState('threads'); // 'threads' | 'users' | 'bans' | 'feedback' | 'logs'
  const [filterQuery, setFilterQuery] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [loadingThread, setLoadingThread] = useState(false);

  // Handle Passcode Submission with 3-Attempt Lockout
  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLockedOut || !passcode.trim() || isVerifying) return;

    setIsVerifying(true);
    setAuthError('');

    const deviceToken = getOrCreateDeviceToken();

    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim(), deviceToken })
      });
      const data = await res.json();

      if (!data.success) {
        setIsVerifying(false);
        if (data.locked || data.remainingAttempts === 0) {
          setIsLockedOut(true);
          setRemainingAttempts(0);
          localStorage.setItem('chaattiko_admin_locked', 'true');
          localStorage.setItem('chaattiko_admin_remaining', '0');
          setAuthError('Access Locked: Maximum password attempts exceeded.');
        } else {
          setRemainingAttempts(data.remainingAttempts);
          localStorage.setItem('chaattiko_admin_remaining', data.remainingAttempts.toString());
          setAuthError(data.message || 'Invalid passcode.');
        }
        return;
      }

      // Success: Reset lockout tracking
      localStorage.removeItem('chaattiko_admin_locked');
      localStorage.removeItem('chaattiko_admin_remaining');
      setRemainingAttempts(3);

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('admin:authenticate', { passcode: passcode.trim() }, (response) => {
        setIsVerifying(false);
        if (response.success) {
          setIsAuthenticated(true);
          setActiveMembers(response.activeMembers || []);
          setPairedThreads(response.pairedThreads || []);
          setBannedList(response.bannedList || []);
          setKickedList(response.kickedList || []);
          setLogs(response.logs || []);
          setFeedback(response.feedback || []);

          if (response.pairedThreads && response.pairedThreads.length > 0) {
            selectThread(response.pairedThreads[0].pairKey, passcode.trim());
          }
        } else {
          setAuthError(response.message || 'Authentication rejected by server.');
        }
      });
    } catch (err) {
      setIsVerifying(false);
      setAuthError('Connection failed: ' + err.message);
    }
  };

  const selectThread = (pairKey, currentPasscode = passcode.trim()) => {
    setSelectedPairKey(pairKey);
    setLoadingThread(true);
    socket.emit('admin:get-thread-messages', { pairKey, passcode: currentPasscode }, (res) => {
      setLoadingThread(false);
      if (res?.success) {
        setThreadMessages(res.messages || []);
      }
    });
  };

  // Manual Refresh / Sync handler for Admin
  const handleAdminSync = () => {
    if (!isAuthenticated || !passcode.trim()) return;
    setIsAdminSyncing(true);
    socket.emit('admin:authenticate', { passcode: passcode.trim() }, (response) => {
      if (response?.success) {
        setActiveMembers(response.activeMembers || []);
        setPairedThreads(response.pairedThreads || []);
        setBannedList(response.bannedList || []);
        setKickedList(response.kickedList || []);
        setLogs(response.logs || []);
        setFeedback(response.feedback || []);
        if (selectedPairKey) {
          selectThread(selectedPairKey, passcode.trim());
        }
      }
      setTimeout(() => setIsAdminSyncing(false), 600);
    });
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewMessage = (msg) => {
      if (selectedPairKey) {
        let belongs = false;
        if (selectedPairKey === '#lounge' && msg.recipient === null) {
          belongs = true;
        } else {
          const parts = selectedPairKey.split(' ↔ ');
          if (parts.length === 2) {
            const uA = parts[0].toLowerCase();
            const uB = parts[1].toLowerCase();
            const s = msg.sender.toLowerCase();
            const r = msg.recipient ? msg.recipient.toLowerCase() : null;
            if ((s === uA && r === uB) || (s === uB && r === uA)) {
              belongs = true;
            }
          }
        }
        if (belongs) {
          setThreadMessages((prev) => [...prev, msg]);
        }
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setThreadMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m))
      );
    };

    const handleActiveMembers = (list) => {
      setActiveMembers(list || []);
    };

    const handlePairedThreads = (threads) => {
      setPairedThreads(threads || []);
    };

    const handleLogsUpdate = (updatedLogs) => {
      setLogs(updatedLogs || []);
    };

    const handleFeedbackNew = (newFb) => {
      setFeedback((prev) => [newFb, ...prev]);
      setActionNotice(`New feedback from @${newFb.sender}!`);
      setTimeout(() => setActionNotice(''), 4000);
    };

    const handleFeedbackList = (list) => {
      setFeedback(list || []);
    };

    const handleAdminEvent = (evt) => {
      if (evt.type === 'USER_JOINED' || evt.type === 'USER_AUTO_LOGIN' || evt.type === 'USER_OFFLINE') {
        socket.emit('admin:authenticate', { passcode: passcode.trim() }, (res) => {
          if (res?.success) {
            setActiveMembers(res.activeMembers || []);
            setPairedThreads(res.pairedThreads || []);
          }
        });
      }
    };

    const handleBannedList = (list) => {
      setBannedList(list || []);
    };

    const handleKickedList = (list) => {
      setKickedList(list || []);
    };

    socket.on('admin:new-message', handleNewMessage);
    socket.on('admin:message-deleted', handleMessageDeleted);
    socket.on('admin:members-list', handleActiveMembers);
    socket.on('admin:paired-threads', handlePairedThreads);
    socket.on('admin:banned-list', handleBannedList);
    socket.on('admin:kicked-list', handleKickedList);
    socket.on('admin:logs-list', handleLogsUpdate);
    socket.on('admin:logs-update', handleLogsUpdate);
    socket.on('admin:feedback-new', handleFeedbackNew);
    socket.on('admin:feedback-list', handleFeedbackList);
    socket.on('admin:event', handleAdminEvent);

    return () => {
      socket.off('admin:new-message', handleNewMessage);
      socket.off('admin:message-deleted', handleMessageDeleted);
      socket.off('admin:members-list', handleActiveMembers);
      socket.off('admin:paired-threads', handlePairedThreads);
      socket.off('admin:banned-list', handleBannedList);
      socket.off('admin:kicked-list', handleKickedList);
      socket.off('admin:logs-list', handleLogsUpdate);
      socket.off('admin:logs-update', handleLogsUpdate);
      socket.off('admin:feedback-new', handleFeedbackNew);
      socket.off('admin:feedback-list', handleFeedbackList);
      socket.off('admin:event', handleAdminEvent);
    };
  }, [isAuthenticated, selectedPairKey, passcode]);

  const handleKickUser = (handle) => {
    if (!confirm(`Are you sure you want to terminate session and cooldown @${handle}?`)) return;
    socket.emit('admin:kick-user', { handle, passcode: passcode.trim() }, (res) => {
      if (res?.success) {
        setActionNotice(`User @${handle} was disconnected.`);
        if (res.kickedList) setKickedList(res.kickedList);
        setTimeout(() => setActionNotice(''), 4000);
      }
    });
  };

  const handleUnkickUser = (handle) => {
    socket.emit('admin:unkick-user', { handle, passcode: passcode.trim() }, (res) => {
      if (res?.success) {
        setActionNotice(`Cooldown lifted for @${handle}. User may rejoin immediately.`);
        if (res.kickedList) setKickedList(res.kickedList);
        setTimeout(() => setActionNotice(''), 4000);
      }
    });
  };

  const handleBanUser = (handle) => {
    if (!confirm(`Are you sure you want to PERMANENTLY BAN @${handle}?`)) return;
    socket.emit('admin:ban-user', { handle, passcode: passcode.trim() }, (res) => {
      if (res?.success) {
        setActionNotice(`User @${handle} has been permanently banned.`);
        if (res.bannedList) setBannedList(res.bannedList);
        setTimeout(() => setActionNotice(''), 4000);
      }
    });
  };

  const handleUnbanUser = (handle) => {
    socket.emit('admin:unban-user', { handle, passcode: passcode.trim() }, (res) => {
      if (res?.success) {
        setActionNotice(`Ban lifted for @${handle}. User may now access Chaattiko.`);
        if (res.bannedList) setBannedList(res.bannedList);
        setTimeout(() => setActionNotice(''), 4000);
      }
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (!confirm('Permanently purge this message from all user views?')) return;
    socket.emit('admin:delete-message', { messageId, passcode: passcode.trim() }, (res) => {
      if (res?.success) {
        setActionNotice('Message purged from server and client screens.');
        setTimeout(() => setActionNotice(''), 4000);
      }
    });
  };

  // 1. Password Gate View (with Strict 3-Attempt Limit & Lockout)
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center dark:bg-black bg-neutral-100 dark:text-white text-neutral-900 p-4 font-sans select-none">
        <div className="w-full max-w-sm glass-panel rounded-3xl p-6 sm:p-8 border dark:border-white/10 border-neutral-300 dark:bg-black/90 bg-white/95 shadow-2xl relative">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-rose-500 font-mono text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Chaattiko Admin Console</span>
            </div>
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg dark:text-neutral-400 text-neutral-500 hover:dark:text-white hover:text-black transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
            </button>
          </div>

          <h2 className="text-xl font-bold font-syncopate tracking-wide mb-1">
            Access Verification
          </h2>
          <p className="text-xs font-electrolize dark:text-neutral-400 text-neutral-600 mb-6">
            Restricted administrative management portal. Max 3 password attempts.
          </p>

          {isLockedOut ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-center space-y-2 mb-6">
              <AlertTriangle className="w-6 h-6 mx-auto text-rose-500" />
              <h3 className="text-xs font-bold font-offside uppercase">
                Access Locked
              </h3>
              <p className="text-[11px] font-sans leading-relaxed">
                Maximum password attempts exceeded. This device has been permanently locked out from the administrative console.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-electrolize uppercase dark:text-neutral-400 text-neutral-500 tracking-wider">
                  Passcode ({remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'} remaining)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter security passcode..."
                    disabled={isVerifying}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                    autoFocus
                  />
                </div>
              </div>

              {authError && (
                <div className="text-[11px] font-sans text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !passcode.trim()}
                className="w-full py-2.5 rounded-xl dark:bg-white dark:text-black bg-neutral-900 text-white font-offside text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {isVerifying ? 'Verifying Credentials...' : 'Unlock Admin Portal'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t dark:border-white/10 border-neutral-200 text-center">
            <button
              onClick={onExitAdmin}
              className="text-xs font-electrolize dark:text-neutral-500 text-neutral-400 hover:dark:text-white hover:text-black transition"
            >
              ← Return to Chaattiko Live Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Authenticated Admin Dashboard View
  const activePairObj = pairedThreads.find((p) => p.pairKey === selectedPairKey);

  return (
    <div className="flex h-full h-[100dvh] w-full max-w-full overflow-hidden dark:bg-black bg-neutral-100 dark:text-neutral-100 text-neutral-900 font-sans select-none">
      {/* Top Admin Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 border-b dark:border-white/10 border-neutral-200 dark:bg-black/80 bg-white/80 backdrop-blur-2xl z-30 px-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg dark:bg-rose-500/10 bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-bold font-syncopate tracking-wider">
              Chaattiko Admin Console
            </div>
            <div className="text-[9px] font-electrolize text-emerald-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Oversight Active</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher (Scrollable horizontally on narrow mobile screens) */}
        <div className="flex items-center gap-1 p-1 rounded-xl dark:bg-white/5 bg-neutral-200 border dark:border-white/5 border-neutral-300 overflow-x-auto max-w-[50vw] sm:max-w-none">
          <button
            onClick={() => setSelectedTab('threads')}
            className={`px-3 py-1 rounded-lg text-xs font-offside transition ${
              selectedTab === 'threads'
                ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-bold'
                : 'dark:text-neutral-400 text-neutral-600'
            }`}
          >
            Paired Threads ({pairedThreads.length})
          </button>
          <button
            onClick={() => setSelectedTab('users')}
            className={`px-3 py-1 rounded-lg text-xs font-offside transition ${
              selectedTab === 'users'
                ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-bold'
                : 'dark:text-neutral-400 text-neutral-600'
            }`}
          >
            Users & Devices ({activeMembers.length})
          </button>
          <button
            onClick={() => setSelectedTab('bans')}
            className={`px-3 py-1 rounded-lg text-xs font-offside transition ${
              selectedTab === 'bans'
                ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-bold'
                : 'dark:text-neutral-400 text-neutral-600'
            }`}
          >
            Bans & Timeouts ({bannedList.length + kickedList.length})
          </button>
          <button
            onClick={() => setSelectedTab('feedback')}
            className={`px-3 py-1 rounded-lg text-xs font-offside transition ${
              selectedTab === 'feedback'
                ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-bold'
                : 'dark:text-neutral-400 text-neutral-600'
            }`}
          >
            User Feedback ({feedback.length})
          </button>
          <button
            onClick={() => setSelectedTab('logs')}
            className={`px-3 py-1 rounded-lg text-xs font-offside transition ${
              selectedTab === 'logs'
                ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-bold'
                : 'dark:text-neutral-400 text-neutral-600'
            }`}
          >
            Audit Logs
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {actionNotice && (
            <span className="text-[11px] font-electrolize text-emerald-500 animate-fade-in">
              {actionNotice}
            </span>
          )}
          {/* Manual Refresh / Sync Button */}
          <button
            onClick={handleAdminSync}
            title="Refresh & Sync All Threads, Users, and Feedback"
            className="p-2 rounded-xl dark:bg-satin-obsidian bg-neutral-100 hover:dark:bg-white/10 hover:bg-neutral-200 border dark:border-satin-slate/30 border-neutral-200 text-neutral-600 dark:text-neutral-300 transition"
          >
            <RotateCw className={`w-4 h-4 text-satin-denim ${isAdminSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl dark:bg-white/5 bg-neutral-100 border dark:border-white/10 border-neutral-200"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-700" />}
          </button>
          <button
            onClick={onExitAdmin}
            className="px-3 py-1.5 rounded-xl dark:bg-white/10 bg-neutral-200 hover:dark:bg-white/20 hover:bg-neutral-300 text-xs font-offside transition"
          >
            Exit Console
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 pt-14 flex overflow-hidden">
        {selectedTab === 'threads' && (
          <div className="flex w-full h-full">
            {/* Left Column: Paired Threads List */}
            <div className="w-80 sm:w-96 border-r dark:border-white/10 border-neutral-200 flex flex-col dark:bg-black/50 bg-white/50">
              <div className="p-3 border-b dark:border-white/10 border-neutral-200 flex items-center justify-between text-xs font-electrolize dark:text-neutral-400 text-neutral-500">
                <span>CONVERSATION THREADS</span>
                <span>{pairedThreads.length} Total</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {pairedThreads.length === 0 ? (
                  <div className="p-8 text-center text-xs font-electrolize dark:text-neutral-500 text-neutral-400">
                    No active 1-on-1 conversations yet.
                  </div>
                ) : (
                  pairedThreads.map((pair) => (
                    <button
                      key={pair.pairKey}
                      onClick={() => selectThread(pair.pairKey)}
                      className={`w-full p-3 rounded-2xl text-left transition flex flex-col gap-1.5 ${
                        selectedPairKey === pair.pairKey
                          ? 'dark:bg-white dark:text-black bg-neutral-900 text-white shadow-sm'
                          : 'dark:hover:bg-white/5 hover:bg-neutral-100 dark:text-neutral-200 text-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-offside tracking-wide truncate">
                          {pair.pairKey === '#lounge' ? (
                            'Public Room'
                          ) : (
                            <>
                              {pair.participantsDetailed ? (
                                `${pair.participantsDetailed[0].handle}${pair.participantsDetailed[0].realName ? ` (${pair.participantsDetailed[0].realName})` : ''} ↔ ${pair.participantsDetailed[1].handle}${pair.participantsDetailed[1].realName ? ` (${pair.participantsDetailed[1].realName})` : ''}`
                              ) : (
                                pair.pairKey
                              )}
                            </>
                          )}
                        </span>
                        <span className="text-[10px] font-electrolize opacity-70">
                          {pair.messageCount} msg{pair.messageCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans truncate opacity-80">
                        {pair.lastMessage || 'No recent messages'}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Exact Mirror Chat View */}
            <div className="flex-1 flex flex-col dark:bg-black bg-neutral-50">
              {activePairObj ? (
                <>
                  <div className="h-12 px-6 border-b dark:border-white/10 border-neutral-200 flex items-center justify-between dark:bg-black/40 bg-white/60">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold font-offside">
                        Mirror: {activePairObj.pairKey}
                      </span>
                    </div>
                    <span className="text-[10px] font-electrolize text-emerald-500">
                      Live Mirror Stream
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {loadingThread ? (
                      <div className="h-full flex items-center justify-center text-xs font-electrolize">
                        Loading paired conversation thread...
                      </div>
                    ) : threadMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs font-electrolize opacity-60">
                        No messages in this conversation.
                      </div>
                    ) : (
                      threadMessages.map((msg) => (
                        <div key={msg.id} className="flex flex-col group space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-electrolize dark:text-neutral-400 text-neutral-500">
                            <span className="font-bold font-offside">@{msg.sender}</span>
                            <span>→</span>
                            <span>{msg.recipient ? `@${msg.recipient}` : 'Public Room'}</span>
                            <span>·</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:underline transition ml-2"
                            >
                              Purge Message
                            </button>
                          </div>
                          <div className="max-w-xl p-3 rounded-2xl glass-panel text-xs font-sans dark:text-neutral-100 text-neutral-900 border dark:border-white/10 border-neutral-200">
                            {msg.replyTo && (
                              <div className="mb-2 p-2 rounded-xl bg-black/10 dark:bg-white/5 border-l-4 border-emerald-500 text-[11px] font-sans">
                                <div className="font-bold font-offside text-emerald-400">@{msg.replyTo.sender}</div>
                                <div className="truncate opacity-80">{msg.replyTo.content}</div>
                              </div>
                            )}
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-electrolize opacity-60">
                  Select a paired thread from the left column to view the exact conversation mirror.
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'users' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold font-electrolize uppercase dark:text-neutral-400 text-neutral-500">
                Member Directory & Visitor Device Telemetry ({activeMembers.length} Total Users)
              </h3>
              <div className="text-[11px] font-electrolize text-emerald-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{activeMembers.filter(m => m.isOnline).length} Active Online</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeMembers.map((user) => (
                <div key={user.handle} className="glass-panel p-4 rounded-2xl border dark:border-white/10 border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-xl dark:bg-white/10 bg-neutral-200 border dark:border-white/15 border-neutral-300 flex items-center justify-center text-xs font-offside font-bold dark:text-white text-neutral-900 shrink-0">
                        {user.handle.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm font-bold font-offside truncate">@{user.handle}</span>
                          {user.realName && (
                            <span className="text-xs font-mono text-satin-taupe font-semibold truncate">
                              ({user.realName})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-electrolize flex items-center gap-1.5">
                          {user.isOnline ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="text-emerald-500 font-medium">Online Now</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                              <span className="text-neutral-400">Offline · {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString() : 'Recently'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-electrolize px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 shrink-0">
                      {user.currentChat || '#lounge'}
                    </span>
                  </div>

                  {/* Device, OS, Hardware, Network, and Public IP Details */}
                  <div className="p-3 rounded-xl dark:bg-white/[0.03] bg-neutral-100/70 border dark:border-white/5 border-neutral-200/60 text-[11px] font-electrolize dark:text-neutral-300 text-neutral-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Public IP:</span>
                      <span className="font-mono text-emerald-400 font-medium">{user.metadata?.ip || 'Hidden / Localhost'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        <span>Approx. Location:</span>
                      </span>
                      <span className="font-sans text-right truncate max-w-[190px] font-medium text-emerald-400">
                        {user.metadata?.location || 'Localhost / Private Network'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Device / Model:</span>
                      <span className="font-sans font-medium text-right truncate max-w-[180px]">{user.metadata?.mobileModel || user.metadata?.device || 'Desktop PC'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Operating System:</span>
                      <span className="font-sans text-right truncate max-w-[180px]">{user.metadata?.os || 'Unknown OS'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Browser:</span>
                      <span className="font-sans text-right truncate max-w-[180px]">{user.metadata?.browser || 'Browser'}</span>
                    </div>

                    {user.metadata?.screen && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Screen Resolution:</span>
                        <span className="font-mono text-right">{user.metadata.screen}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-satin-taupe" />
                        <span>Hardware (CPU/RAM):</span>
                      </span>
                      <span className="font-sans text-right truncate max-w-[180px]">
                        {user.metadata?.hardwareSpecs || `${user.metadata?.cpuCores || 'N/A'} · ${user.metadata?.ram || 'N/A'}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-satin-denim" />
                        <span>Network / Speed:</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          user.metadata?.connectionSpeed === 'Slow'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {user.metadata?.connectionSpeed || 'Fast'}
                        </span>
                        <span className="text-[10px] opacity-80 font-mono">
                          {user.metadata?.networkType && user.metadata.networkType !== 'Unknown Network'
                            ? user.metadata.networkType
                            : (user.metadata?.connectionSpeed === 'Slow' ? 'Low-Speed' : '4G/WiFi')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t dark:border-white/10 border-neutral-200">
                    <button
                      onClick={() => handleKickUser(user.handle)}
                      className="flex-1 py-1 rounded-lg bg-neutral-200 dark:bg-white/10 text-xs font-offside hover:bg-neutral-300 dark:hover:bg-white/20 transition"
                    >
                      Kick
                    </button>
                    <button
                      onClick={() => handleBanUser(user.handle)}
                      className="flex-1 py-1 rounded-lg bg-rose-500/20 text-rose-500 text-xs font-offside hover:bg-rose-500/30 transition"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'bans' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto space-y-6">
            {/* Banned Accounts & IPs Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold font-electrolize uppercase dark:text-neutral-400 text-neutral-500">
                  Banned Members & IP Addresses ({bannedList.length})
                </h3>
                <span className="text-[10px] font-electrolize text-rose-500">Permanent Restrictions</span>
              </div>

              {bannedList.length === 0 ? (
                <div className="p-8 text-center text-xs font-electrolize dark:text-neutral-500 text-neutral-400 glass-panel rounded-2xl border dark:border-white/10 border-neutral-200">
                  No active banned accounts.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bannedList.map((ban) => (
                    <div key={ban.handle} className="glass-panel p-4 rounded-2xl border dark:border-rose-500/20 border-rose-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-offside text-rose-400">
                          @{ban.handle} {ban.realName ? `(${ban.realName})` : ''}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                          Banned
                        </span>
                      </div>
                      <div className="text-[11px] font-electrolize dark:text-neutral-300 text-neutral-700 space-y-1">
                        <div>Public IP: <span className="font-mono text-emerald-400">{ban.ip || 'Unknown'}</span></div>
                        <div>Device: {ban.device || 'Unknown Device'}</div>
                        <div>Reason: <span className="italic">{ban.reason || 'Violating Community Standards'}</span></div>
                        <div className="text-[10px] opacity-60">Banned on: {new Date(ban.bannedAt).toLocaleString()}</div>
                      </div>
                      <div className="pt-2 border-t dark:border-white/10 border-neutral-200">
                        <button
                          onClick={() => handleUnbanUser(ban.handle)}
                          className="w-full py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-offside font-semibold border border-emerald-500/30 transition flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Unban User & Restore Access</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Kicked / Cooldown Users Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold font-electrolize uppercase dark:text-neutral-400 text-neutral-500">
                  Kicked Members / Active Cooldowns ({kickedList.length})
                </h3>
                <span className="text-[10px] font-electrolize text-amber-500">Temporary Timeout Restrictions</span>
              </div>

              {kickedList.length === 0 ? (
                <div className="p-8 text-center text-xs font-electrolize dark:text-neutral-500 text-neutral-400 glass-panel rounded-2xl border dark:border-white/10 border-neutral-200">
                  No active user timeouts or cooldowns.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kickedList.map((kick) => {
                    const remainingSecs = Math.max(0, Math.round((kick.timeoutUntil - Date.now()) / 1000));
                    return (
                      <div key={kick.handle} className="glass-panel p-4 rounded-2xl border dark:border-amber-500/20 border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold font-offside text-amber-400">
                            @{kick.handle} {kick.realName ? `(${kick.realName})` : ''}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            {remainingSecs}s remaining
                          </span>
                        </div>
                        <div className="text-[11px] font-electrolize dark:text-neutral-300 text-neutral-700 space-y-1">
                          <div>Public IP: <span className="font-mono text-emerald-400">{kick.ip || 'Unknown'}</span></div>
                          <div>Device: {kick.device || 'Unknown Device'}</div>
                          <div>Reason: <span className="italic">{kick.reason || 'Kicked by administrator'}</span></div>
                        </div>
                        <div className="pt-2 border-t dark:border-white/10 border-neutral-200">
                          <button
                            onClick={() => handleUnkickUser(kick.handle)}
                            className="w-full py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 text-xs font-offside font-semibold border border-sky-500/30 transition flex items-center justify-center gap-1.5"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Unkick / Lift Timeout Early</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'feedback' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto space-y-3">
            <h3 className="text-xs font-bold font-electrolize uppercase dark:text-neutral-400 text-neutral-500 mb-2">
              Direct User Feedback & Reports
            </h3>
            {feedback.length === 0 ? (
              <div className="text-xs font-electrolize opacity-60">No user feedback submitted yet.</div>
            ) : (
              feedback.map((item, idx) => (
                <div key={idx} className="glass-panel p-4 rounded-2xl border dark:border-white/10 border-neutral-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-electrolize">
                    <span className="font-bold font-offside">@{item.sender} ({item.type})</span>
                    <span className="opacity-60">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs font-sans dark:text-neutral-200 text-neutral-800 pt-1">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {selectedTab === 'logs' && (
          <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto space-y-2">
            <h3 className="text-xs font-bold font-electrolize uppercase dark:text-neutral-400 text-neutral-500 mb-2">
              System Audit & Moderation Logs
            </h3>
            {logs.map((log, idx) => (
              <div key={idx} className="p-3 rounded-xl dark:bg-white/[0.02] bg-neutral-100 border dark:border-white/5 border-neutral-200 text-xs font-mono flex items-center justify-between">
                <span>{log.action} · {log.details}</span>
                <span className="text-[10px] opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
