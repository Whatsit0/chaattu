import React, { useState } from 'react';
import chatticoHorizontalLogo from '../assets/chattico-logo-horizontal.png';
import ProfileAvatarPickerModal, { renderUserAvatar } from './ProfileAvatarPickerModal';
import { 
  Users, 
  LogOut, 
  Search, 
  Radio, 
  Sparkles, 
  ChevronRight,
  Sun,
  Moon,
  Star,
  MessageSquarePlus,
  Shuffle,
  PanelLeftClose,
  PanelLeft,
  X,
  Gift,
  Copy,
  Check
} from 'lucide-react';

export function UserTierBadge({ tier, className = '' }) {
  if (!tier) return null;

  if (tier === 'gold') {
    return (
      <span
        title="Gold Milestone VIP (9+ Invites)"
        className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 text-amber-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.8)] border border-yellow-100 z-10 ${className}`}
      >
        👑
      </span>
    );
  }

  if (tier === 'silver') {
    return (
      <span
        title="Silver Member (6+ Invites)"
        className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] bg-gradient-to-tr from-slate-200 via-white to-slate-400 text-slate-900 font-black shadow-[0_0_6px_rgba(255,255,255,0.7)] border border-white z-10 ${className}`}
      >
        🥈
      </span>
    );
  }

  if (tier === 'bronze') {
    return (
      <span
        title="Bronze Member (3+ Invites)"
        className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-800 text-amber-200 font-black shadow-[0_0_6px_rgba(217,119,6,0.6)] border border-amber-400/80 z-10 ${className}`}
      >
        🥉
      </span>
    );
  }

  return null;
}

export default function MemberDirectory({
  currentUser,
  activeMembers,
  activeTarget,
  onSelectTarget,
  onLogout,
  unreadCounts = {},
  isMobileOpen,
  setIsMobileOpen,
  theme,
  onToggleTheme,
  favorites = [],
  blockedUsers = [],
  onOpenFeedback,
  onRandomStranger,
  sidebarWidth = 320,
  onStartResize,
  isCollapsed = false,
  onToggleCollapse,
  isSplitView = false,
  isMobile = false,
  socket,
  onUpdateAvatar
}) {
  const [search, setSearch] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const inviteLink = typeof window !== 'undefined' && currentUser?.handle
    ? `${window.location.origin}/?ref=${encodeURIComponent(currentUser.handle)}`
    : '';

  const handleCopyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    });
  };

  // Filter members excluding current user
  const otherMembers = (activeMembers || []).filter(
    (m) => m.handle.toLowerCase() !== (currentUser?.handle || '').toLowerCase()
  );

  const filteredMembers = otherMembers.filter((m) =>
    m.handle.toLowerCase().includes(search.toLowerCase().trim())
  );

  // Sort helper: currently online users strictly at the top, offline users below at the bottom
  const sortByOnlineStatus = (a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    const timeA = a.lastSeen || a.connectedAt || 0;
    const timeB = b.lastSeen || b.connectedAt || 0;
    if (timeB !== timeA) return timeB - timeA;
    return a.handle.localeCompare(b.handle);
  };

  // Split into Favorites and Regular Friends (online top, offline bottom)
  const favoriteMembers = filteredMembers
    .filter((m) => favorites.includes(m.handle.toLowerCase()))
    .sort(sortByOnlineStatus);

  const regularFriends = filteredMembers
    .filter((m) => !favorites.includes(m.handle.toLowerCase()))
    .sort(sortByOnlineStatus);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Offline';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return 'Offline';
  };

  const onlineCount = (activeMembers || []).filter(m => m.isOnline).length;

  return (
    <aside
      style={isSplitView ? { width: `${sidebarWidth}px` } : undefined}
      className={
        isSplitView
          ? 'relative shrink-0 h-full flex flex-col dark:bg-satin-obsidian/90 bg-white/90 backdrop-blur-xl border-r dark:border-satin-slate/30 border-neutral-200 select-none z-20 transition-all duration-200'
          : `fixed inset-y-0 left-0 z-40 flex flex-col dark:bg-satin-obsidian/95 bg-white/95 backdrop-blur-2xl border-r dark:border-satin-slate/30 border-neutral-200 select-none shadow-2xl w-[85vw] max-w-[340px] h-full h-[100dvh] transition-transform duration-300 ease-in-out ${
              isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`
      }
    >
      {/* Draggable Vertical Resize Divider Handle (on Split View only) */}
      {isSplitView && (
        <div
          onMouseDown={onStartResize}
          className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-satin-denim active:bg-satin-denim z-50 transition-colors"
          title="Drag to resize sidebar width"
        />
      )}

      {/* Brand Header */}
      <div className="p-3.5 sm:p-4 border-b dark:border-white/10 border-neutral-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <img
                src={chatticoHorizontalLogo}
                alt="Chaattiko"
                className="h-7 w-auto object-contain drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
              />
              <span className="font-offside font-bold text-xs tracking-wider text-emerald-400">Chaattiko</span>
            </div>
            <div className="text-[10px] dark:text-neutral-400 text-neutral-500 font-electrolize flex items-center gap-1.5 pl-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{onlineCount} online · {activeMembers.length} friends</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Collapse Sidebar Button (Split View only) */}
          {isSplitView && (
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar to screen edge"
              className="flex p-2 rounded-lg dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black hover:bg-neutral-100 dark:hover:bg-white/5 transition"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {/* Theme switcher */}
          <button
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            className="p-2 rounded-lg dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black hover:bg-neutral-100 dark:hover:bg-white/5 transition"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>

          {/* Disconnect */}
          <button
            onClick={onLogout}
            title="Disconnect session"
            className="p-2 rounded-lg dark:text-neutral-400 text-neutral-600 hover:dark:text-white hover:text-black hover:bg-neutral-100 dark:hover:bg-white/5 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Close Drawer Button (X) - visible in Drawer mode */}
          {!isSplitView && (
            <button
              onClick={() => setIsMobileOpen(false)}
              title="Close Drawer"
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-white/10 dark:text-neutral-200 text-neutral-700 hover:bg-white/20 transition ml-1"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Current User Card */}
      <div className="p-3 mx-3 mt-2 mb-1.5 rounded-2xl dark:bg-white/[0.02] bg-neutral-50 border dark:border-white/5 border-neutral-200 flex items-center justify-between relative">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            {renderUserAvatar(currentUser?.avatar, currentUser?.handle, 'w-8 h-8 text-sm')}
            {/* Profile Grade Badge (Bottom-Left Corner) */}
            <UserTierBadge tier={currentUser?.tier} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-offside font-medium dark:text-white text-neutral-900 truncate flex items-center gap-1.5">
              <span>@{currentUser?.handle}</span>
              {currentUser?.gender === 'Male' && (
                <span className="px-1.5 py-0.2 text-[9px] rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/20 font-sans font-medium">
                  M
                </span>
              )}
              {currentUser?.gender === 'Female' && (
                <span className="px-1.5 py-0.2 text-[9px] rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 font-sans font-medium">
                  F
                </span>
              )}
            </div>
            <div className="text-[10px] text-emerald-500 font-electrolize flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>This Device (Online)</span>
            </div>
          </div>
        </div>

        {/* Profile Button in Top-Right Corner */}
        <button
          type="button"
          onClick={() => setIsAvatarModalOpen(true)}
          className="px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1 transition shadow-sm cursor-pointer shrink-0"
          title="Change profile avatar"
        >
          <Sparkles className="w-3 h-3" />
          <span>Profile</span>
        </button>
      </div>

      {/* Referral Link & Tier Unlock Card */}
      <div className="px-3 pb-1">
        <div className="p-2.5 rounded-2xl bg-white/[0.03] dark:bg-white/[0.02] border dark:border-white/10 border-neutral-200 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span>Invite Friends</span>
            </span>
            <span className="px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold">
              {currentUser?.referralCount || 0}/9 Invites
            </span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, ((currentUser?.referralCount || 0) / 9) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[9px] text-neutral-400 font-mono">
              {(currentUser?.referralCount || 0) < 3
                ? `Invite ${3 - (currentUser?.referralCount || 0)} for Bronze 🥉`
                : (currentUser?.referralCount || 0) < 6
                ? `Invite ${6 - (currentUser?.referralCount || 0)} for Silver 🥈`
                : (currentUser?.referralCount || 0) < 9
                ? `Invite ${9 - (currentUser?.referralCount || 0)} for Gold 🥇`
                : 'All Badges Unlocked! 👑'}
            </span>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono flex items-center gap-1 active:scale-95 transition cursor-pointer"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-neutral-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search & Random Stranger */}
      <div className="px-3 py-1 space-y-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl glass-input font-offside"
          />
        </div>

        {/* Random Stranger Quick Match Button */}
        <button
          onClick={onRandomStranger}
          className="w-full py-2 px-3 rounded-xl dark:bg-emerald-500/10 bg-emerald-50 hover:dark:bg-emerald-500/20 hover:bg-emerald-100 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-offside text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-98 shadow-sm"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Random Stranger 🎲</span>
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        {/* Public Room Item */}
        <button
          onClick={() => {
            onSelectTarget(null);
            setIsMobileOpen(false);
          }}
          className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition ${
            activeTarget === null
              ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-semibold shadow-sm'
              : 'dark:text-neutral-300 text-neutral-700 hover:dark:text-white hover:text-black hover:dark:bg-white/[0.04] hover:bg-neutral-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-1.5 rounded-xl border shrink-0 ${
                activeTarget === null
                  ? 'dark:bg-black/10 dark:border-black/20 bg-white/20 border-white/30 text-white dark:text-black'
                  : 'dark:bg-white/5 dark:border-white/10 bg-neutral-100 border-neutral-200'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-offside font-bold truncate">
                Public Room
              </div>
              <div
                className={`text-[10px] font-electrolize truncate ${
                  activeTarget === null ? 'dark:text-black/70 text-neutral-300' : 'dark:text-neutral-500 text-neutral-400'
                }`}
              >
                Campus Broadcast Room
              </div>
            </div>
          </div>
          {unreadCounts['lounge'] > 0 && activeTarget !== null && (
            <span className="px-2 py-0.5 text-[10px] rounded-full dark:bg-white dark:text-black bg-neutral-900 text-white font-electrolize font-bold shrink-0">
              {unreadCounts['lounge']}
            </span>
          )}
        </button>

        {/* --- FAVORITES SECTION --- */}
        {favoriteMembers.length > 0 && (
          <div className="pt-3 pb-1">
            <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-electrolize text-amber-500 uppercase tracking-wider">
              <span className="flex items-center gap-1.5 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                Favorites ({favoriteMembers.length})
              </span>
            </div>
            <div className="space-y-1">
              {favoriteMembers.map((member) => (
                <MemberButton
                  key={member.handle}
                  member={member}
                  isSelected={activeTarget === member.handle}
                  unread={unreadCounts[member.handle.toLowerCase()] || 0}
                  isBlocked={blockedUsers.includes(member.handle.toLowerCase())}
                  isFavorite={true}
                  formatLastSeen={formatLastSeen}
                  onSelect={() => {
                    onSelectTarget(member.handle);
                    setIsMobileOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* --- YOUR FRIENDS SECTION --- */}
        <div className="pt-3 pb-1 px-2 flex items-center justify-between text-[11px] font-electrolize dark:text-neutral-500 text-neutral-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Your Friends ({regularFriends.length})
          </span>
        </div>

        {regularFriends.length === 0 && favoriteMembers.length === 0 ? (
          <div className="py-8 px-4 text-center text-xs dark:text-neutral-500 text-neutral-400 font-electrolize">
            {search ? 'No friends match search' : 'There is no friends available for now'}
          </div>
        ) : (
          regularFriends.map((member) => (
            <MemberButton
              key={member.handle}
              member={member}
              isSelected={activeTarget === member.handle}
              unread={unreadCounts[member.handle.toLowerCase()] || 0}
              isBlocked={blockedUsers.includes(member.handle.toLowerCase())}
              isFavorite={false}
              formatLastSeen={formatLastSeen}
              onSelect={() => {
                onSelectTarget(member.handle);
                setIsMobileOpen(false);
              }}
            />
          ))
        )}
      </div>

      {/* Footer / Feedback & Stealth /admin Link */}
      <div className="p-3 border-t dark:border-white/10 border-neutral-200 text-[10px] dark:text-neutral-500 text-neutral-500 font-electrolize flex items-center justify-between">
        <button
          onClick={onOpenFeedback}
          className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition font-medium"
        >
          <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-500" />
          <span>Send Feedback</span>
        </button>

        {/* Stealth /admin link */}
        <a
          href="/admin"
          target="_blank"
          rel="noreferrer"
          className="text-neutral-400/50 hover:text-neutral-600 dark:hover:text-neutral-300 text-[9px] tracking-widest font-mono transition"
          title="Administrative System"
        >
          /admin
        </a>
      </div>

      {/* Profile Avatar Picker Modal */}
      <ProfileAvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatarId={currentUser?.avatar}
        currentUser={currentUser}
        socket={socket}
        onAvatarUpdated={(avatarId) => {
          if (onUpdateAvatar) onUpdateAvatar(avatarId);
        }}
      />
    </aside>
  );
}

function MemberButton({ member, isSelected, unread, isBlocked, isFavorite, formatLastSeen, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition group ${
        isSelected
          ? 'dark:bg-white dark:text-black bg-neutral-900 text-white font-semibold shadow-sm'
          : 'dark:text-neutral-300 text-neutral-700 hover:dark:text-white hover:text-black hover:dark:bg-white/[0.04] hover:bg-neutral-100'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          {renderUserAvatar(member.avatar, member.handle, 'w-8 h-8 text-sm')}

          {/* Profile Grade Badge (Bottom-Left Corner) */}
          <UserTierBadge tier={member.tier} />

          {member.isOnline ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 dark:ring-black ring-white animate-pulse"></span>
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 ring-2 dark:ring-black ring-white"></span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-offside font-bold truncate">@{member.handle}</span>

            {isFavorite && (
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            )}

            {isBlocked && (
              <span className="px-1 py-0.2 text-[8px] rounded bg-red-500/20 text-red-500 font-mono shrink-0">
                Blocked
              </span>
            )}

            {member.gender === 'Male' && (
              <span
                className={`px-1.5 py-0.2 text-[9px] rounded-md font-sans font-medium shrink-0 border ${
                  isSelected
                    ? 'dark:bg-black/15 dark:text-black dark:border-black/30 bg-white/20 text-white border-white/30'
                    : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                }`}
              >
                Male
              </span>
            )}
            {member.gender === 'Female' && (
              <span
                className={`px-1.5 py-0.2 text-[9px] rounded-md font-sans font-medium shrink-0 border ${
                  isSelected
                    ? 'dark:bg-black/15 dark:text-black dark:border-black/30 bg-white/20 text-white border-white/30'
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}
              >
                Female
              </span>
            )}
          </div>
          <div
            className={`text-[10px] font-electrolize truncate ${
              isSelected 
                ? 'dark:text-black/70 text-neutral-300' 
                : member.isOnline ? 'text-emerald-500 font-medium' : 'dark:text-neutral-500 text-neutral-400'
            }`}
          >
            {member.isOnline ? 'Online' : `Offline · ${formatLastSeen(member.lastSeen)}`}
          </div>
        </div>
      </div>

      <div className="shrink-0 pl-2">
        {unread > 0 && !isSelected ? (
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500 text-white font-electrolize font-bold">
            {unread}
          </span>
        ) : (
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
              isSelected ? 'dark:text-black text-white' : 'text-neutral-400'
            }`}
          />
        )}
      </div>
    </button>
  );
}
