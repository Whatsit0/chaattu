import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultState = {
  users: {}, // { handleKey: { handle, realName, gender, deviceToken, ip, userAgent, device, browser, os, location, joinedAt, lastSeen, currentChat, isBanned } }
  devices: {}, // { deviceToken: handleKey }
  messages: [], // [ { id, sender, recipient, content, timestamp, isDeleted } ]
  bannedHandles: [], // [ handle ]
  bannedDetails: {}, // { handleKey: { handle, ip, reason, bannedAt } }
  kickedUsers: {}, // { handleKey: { handle, ip, reason, kickedAt, timeoutUntil } }
  adminLogs: [], // [ { id, action, target, details, timestamp } ]
  feedback: [], // [ { id, sender, type, message, timestamp } ]
  blocks: {} // { userHandle: [ blockedHandle, ... ] }
};

let state = { ...defaultState };

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      state = { ...defaultState, ...parsed };
      if (!state.devices) state.devices = {};
      if (!state.feedback) state.feedback = [];
      if (!state.blocks) state.blocks = {};
      // Populate devices reverse index if missing
      for (const [key, user] of Object.entries(state.users)) {
        if (user.deviceToken && !state.devices[user.deviceToken]) {
          state.devices[user.deviceToken] = key;
        }
      }
    } else {
      saveStore();
    }
  } catch (err) {
    console.error('Failed to load store, initializing default:', err);
    state = { ...defaultState };
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

loadStore();

export const db = {
  // --- USERS & PERMANENT DEVICE-LOCK ---
  getUserByDeviceToken(deviceToken) {
    if (!deviceToken) return null;
    const handleKey = state.devices[deviceToken];
    if (!handleKey) return null;
    return state.users[handleKey] || null;
  },

  getUser(handle) {
    if (!handle) return null;
    return state.users[handle.toLowerCase()] || null;
  },

  // Check if a device can register a handle
  canDeviceRegisterHandle(deviceToken, handle) {
    const handleKey = handle.toLowerCase();
    const existingHandleForDevice = state.devices[deviceToken];
    
    // If device is already locked to a different username
    if (existingHandleForDevice && existingHandleForDevice !== handleKey) {
      const boundUser = state.users[existingHandleForDevice];
      return { 
        allowed: false, 
        reason: `This device is permanently registered as @${boundUser ? boundUser.handle : existingHandleForDevice}.` 
      };
    }

    // If username is already claimed by a different device token
    const existingUser = state.users[handleKey];
    if (existingUser && existingUser.deviceToken && existingUser.deviceToken !== deviceToken) {
      return { 
        allowed: false, 
        reason: `Username @${existingUser.handle} is permanently bound to another device.` 
      };
    }

    return { allowed: true };
  },

  upsertUser(user) {
    const handleKey = user.handle.toLowerCase();
    state.users[handleKey] = {
      ...(state.users[handleKey] || {}),
      ...user,
      handle: user.handle,
      lastSeen: Date.now()
    };
    if (user.deviceToken) {
      state.devices[user.deviceToken] = handleKey;
    }
    saveStore();
    return state.users[handleKey];
  },

  updateUserStatus(handle, updates = {}) {
    if (!handle) return;
    const key = handle.toLowerCase();
    if (state.users[key]) {
      const { isOnline, currentChat, lastSeen = Date.now(), ...rest } = updates;
      if (currentChat !== undefined) state.users[key].currentChat = currentChat;
      state.users[key].lastSeen = lastSeen;
      Object.assign(state.users[key], rest);
      saveStore();
    }
  },

  getAllUsers() {
    return Object.values(state.users);
  },

  // Persistent Member Directory: All registered members with live Online/Offline status
  getPersistentMemberList(activeHandlesSet) {
    return Object.values(state.users).map((user) => {
      const lower = user.handle.toLowerCase();
      const isOnline = activeHandlesSet.has(lower);
      return {
        handle: user.handle,
        gender: user.gender === 'Prefer not to say' ? null : user.gender,
        isOnline,
        lastSeen: user.lastSeen || user.joinedAt || Date.now(),
        connectedAt: user.joinedAt || Date.now()
      };
    });
  },

  updateUserCurrentChat(handle, target) {
    if (!handle) return;
    const key = handle.toLowerCase();
    if (state.users[key]) {
      state.users[key].currentChat = target ? target : '#lounge';
      state.users[key].lastSeen = Date.now();
      saveStore();
    }
  },

  isHandleBanned(handle) {
    if (!handle) return false;
    const key = handle.toLowerCase();
    return state.bannedHandles.includes(key) || !!(state.users[key] && state.users[key].isBanned);
  },

  isHandleKicked(handle) {
    if (!handle) return false;
    const key = handle.toLowerCase();
    const kickInfo = state.kickedUsers?.[key];
    if (kickInfo && kickInfo.timeoutUntil > Date.now()) {
      return true;
    }
    return false;
  },

  getKickedInfo(handle) {
    if (!handle) return null;
    const key = handle.toLowerCase();
    return state.kickedUsers?.[key] || null;
  },

  banUser(handle, reason = 'Administrative ban', ip = null) {
    const key = handle.toLowerCase();
    if (!state.bannedHandles.includes(key)) {
      state.bannedHandles.push(key);
    }
    if (!state.bannedDetails) state.bannedDetails = {};
    const user = state.users[key];
    const clientIp = ip || user?.ip || 'Unknown IP';
    state.bannedDetails[key] = {
      handle: user ? user.handle : handle,
      realName: user?.realName || null,
      ip: clientIp,
      device: user?.device || 'Unknown',
      reason,
      bannedAt: Date.now()
    };
    if (user) {
      user.isBanned = true;
    }
    this.addAdminLog('BAN_USER', handle, `Banned user from IP ${clientIp}: ${reason}`);
    saveStore();
  },

  unbanUser(handle) {
    const key = handle.toLowerCase();
    state.bannedHandles = (state.bannedHandles || []).filter(h => h !== key);
    if (state.bannedDetails && state.bannedDetails[key]) {
      delete state.bannedDetails[key];
    }
    if (state.users[key]) {
      state.users[key].isBanned = false;
    }
    this.addAdminLog('UNBAN_USER', handle, 'Administrative unban lifted');
    saveStore();
  },

  getBannedList() {
    if (!state.bannedDetails) state.bannedDetails = {};
    return Object.values(state.bannedDetails);
  },

  kickUser(handle, reason = 'Kicked by administrator', timeoutSeconds = 300, ip = null) {
    const key = handle.toLowerCase();
    if (!state.kickedUsers) state.kickedUsers = {};
    const user = state.users[key];
    const clientIp = ip || user?.ip || 'Unknown IP';
    state.kickedUsers[key] = {
      handle: user ? user.handle : handle,
      realName: user?.realName || null,
      ip: clientIp,
      device: user?.device || 'Unknown',
      reason,
      kickedAt: Date.now(),
      timeoutUntil: Date.now() + (timeoutSeconds * 1000)
    };
    this.addAdminLog('KICK_USER', handle, `Kicked with ${timeoutSeconds}s cooldown (IP: ${clientIp})`);
    saveStore();
  },

  unkickUser(handle) {
    const key = handle.toLowerCase();
    if (state.kickedUsers && state.kickedUsers[key]) {
      delete state.kickedUsers[key];
    }
    this.addAdminLog('UNKICK_USER', handle, 'Kick timeout lifted early');
    saveStore();
  },

  getKickedList() {
    if (!state.kickedUsers) state.kickedUsers = {};
    const now = Date.now();
    // Return active timeouts
    return Object.values(state.kickedUsers).filter(k => k.timeoutUntil > now);
  },

  // --- BLOCKS (1-on-1 Block Management) ---
  addBlock(userHandle, blockedHandle) {
    const uKey = userHandle.toLowerCase();
    const bKey = blockedHandle.toLowerCase();
    if (!state.blocks[uKey]) state.blocks[uKey] = [];
    if (!state.blocks[uKey].includes(bKey)) {
      state.blocks[uKey].push(bKey);
      saveStore();
    }
  },

  removeBlock(userHandle, blockedHandle) {
    const uKey = userHandle.toLowerCase();
    const bKey = blockedHandle.toLowerCase();
    if (state.blocks[uKey]) {
      state.blocks[uKey] = state.blocks[uKey].filter(h => h !== bKey);
      saveStore();
    }
  },

  isBlocked(recipientHandle, senderHandle) {
    if (!recipientHandle || !senderHandle) return false;
    const rKey = recipientHandle.toLowerCase();
    const sKey = senderHandle.toLowerCase();
    return Boolean(state.blocks[rKey] && state.blocks[rKey].includes(sKey));
  },

  // --- FEEDBACK ---
  addFeedback({ sender, type = 'Suggestion', message }) {
    const fb = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      sender,
      type,
      message: message.trim(),
      timestamp: Date.now()
    };
    state.feedback.unshift(fb);
    if (state.feedback.length > 500) {
      state.feedback = state.feedback.slice(0, 500);
    }
    saveStore();
    return fb;
  },

  getFeedbackForAdmin() {
    return state.feedback;
  },

  // --- 24-HOUR PERSISTENT MESSAGES (ONLINE & OFFLINE) ---
  addMessage({ sender, recipient = null, content, replyTo = null }) {
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      sender,
      recipient: recipient ? recipient : null,
      content,
      replyTo: replyTo && replyTo.id ? {
        id: replyTo.id,
        sender: replyTo.sender,
        content: (replyTo.content || '').substring(0, 300)
      } : null,
      timestamp: Date.now(),
      isDeleted: false
    };
    state.messages.push(msg);
    saveStore();
    return msg;
  },

  // Public messages within 24h TTL (accessible even when users are offline)
  getPublicMessages({ userA = null, userB = null } = {}) {
    const ttlCutoff = Date.now() - 24 * 60 * 60 * 1000;
    return state.messages.filter(msg => {
      if (msg.isDeleted || msg.timestamp < ttlCutoff) return false;

      // Public Lounge
      if (!userA && !userB) {
        return msg.recipient === null;
      }

      // 1-on-1 direct conversation between userA and userB
      if (userA && userB) {
        const uA = userA.toLowerCase();
        const uB = userB.toLowerCase();
        const s = msg.sender.toLowerCase();
        const r = msg.recipient ? msg.recipient.toLowerCase() : null;
        return (s === uA && r === uB) || (s === uB && r === uA);
      }

      return false;
    });
  },

  // Admin: get all messages for a specific conversation pair
  getMessagesForPair(pairKey) {
    const ttlCutoff = Date.now() - 24 * 60 * 60 * 1000;
    if (pairKey === '#lounge') {
      return state.messages.filter(m => m.recipient === null && m.timestamp >= ttlCutoff);
    }

    const parts = pairKey.split(' ↔ ');
    if (parts.length !== 2) return [];

    const uA = parts[0].toLowerCase();
    const uB = parts[1].toLowerCase();

    return state.messages.filter(msg => {
      if (msg.timestamp < ttlCutoff) return false;
      const s = msg.sender.toLowerCase();
      const r = msg.recipient ? msg.recipient.toLowerCase() : null;
      return (s === uA && r === uB) || (s === uB && r === uA);
    }).sort((a, b) => a.timestamp - b.timestamp);
  },

  // Admin: aggregate all active conversation pairs
  getPairedConversations() {
    const ttlCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const pairsMap = new Map();

    // Ensure #lounge thread exists if there are lounge messages
    const loungeMsgs = state.messages.filter(m => m.recipient === null && m.timestamp >= ttlCutoff);
    if (loungeMsgs.length > 0) {
      const lastLounge = loungeMsgs[loungeMsgs.length - 1];
      pairsMap.set('#lounge', {
        pairKey: '#lounge',
        isLounge: true,
        participants: ['Public Broadcast'],
        lastMessage: lastLounge.content,
        lastSender: lastLounge.sender,
        lastTimestamp: lastLounge.timestamp,
        totalMessages: loungeMsgs.length
      });
    }

    // Process 1-on-1 direct messages
    const directMsgs = state.messages.filter(m => m.recipient !== null && m.timestamp >= ttlCutoff);
    for (const msg of directMsgs) {
      const sorted = [msg.sender, msg.recipient].sort((a, b) => a.localeCompare(b));
      const pairKey = `${sorted[0]} ↔ ${sorted[1]}`;

      const senderUser = state.users[msg.sender.toLowerCase()];
      const recipientUser = state.users[msg.recipient.toLowerCase()];

      if (!pairsMap.has(pairKey)) {
        pairsMap.set(pairKey, {
          pairKey,
          isLounge: false,
          participants: sorted,
          participantsDetailed: [
            {
              handle: sorted[0],
              realName: (state.users[sorted[0].toLowerCase()]?.realName) || null
            },
            {
              handle: sorted[1],
              realName: (state.users[sorted[1].toLowerCase()]?.realName) || null
            }
          ],
          lastMessage: msg.content,
          lastSender: msg.sender,
          lastTimestamp: msg.timestamp,
          totalMessages: 1
        });
      } else {
        const p = pairsMap.get(pairKey);
        p.totalMessages++;
        if (msg.timestamp > p.lastTimestamp) {
          p.lastMessage = msg.content;
          p.lastSender = msg.sender;
          p.lastTimestamp = msg.timestamp;
        }
      }
    }

    return Array.from(pairsMap.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  },

  deleteMessage(messageId, adminHandle = 'ADMIN') {
    const msg = state.messages.find(m => m.id === messageId);
    if (msg) {
      msg.isDeleted = true;
      msg.deletedAt = Date.now();
      msg.deletedBy = adminHandle;
      this.addAdminLog('DELETE_MESSAGE', messageId, `Deleted message from ${msg.sender}`);
      saveStore();
      return msg;
    }
    return null;
  },

  // Clean messages older than 24h
  purgeExpiredMessages() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const initialCount = state.messages.length;
    state.messages = state.messages.filter(m => m.timestamp >= cutoff);
    if (state.messages.length !== initialCount) {
      saveStore();
    }
  },

  // --- ADMIN LOGS ---
  addAdminLog(action, target, details) {
    const log = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      action,
      target,
      details,
      timestamp: Date.now()
    };
    state.adminLogs.unshift(log);
    if (state.adminLogs.length > 500) {
      state.adminLogs = state.adminLogs.slice(0, 500);
    }
    saveStore();
    return log;
  },

  getAdminLogs() {
    return state.adminLogs;
  }
};
