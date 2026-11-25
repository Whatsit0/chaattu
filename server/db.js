import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatic detection of Render Persistent Disk (/var/data) or custom PERSISTENT_DATA_DIR
const DATA_DIR = process.env.PERSISTENT_DATA_DIR || 
  (fs.existsSync('/var/data') ? '/var/data' : path.join(__dirname, 'data'));
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const BACKUP_PATH = path.join(DATA_DIR, 'store.backup.json');
const DB_PATH = path.join(DATA_DIR, 'chaattiko.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Native Node.js SQLite (Zero external dependencies, built-in to Node 22+)
let sqliteDb = null;
try {
  const { DatabaseSync } = await import('node:sqlite');
  if (DatabaseSync) {
    sqliteDb = new DatabaseSync(DB_PATH);
    sqliteDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS users (
        unique_id TEXT PRIMARY KEY,
        handle TEXT NOT NULL,
        password_hash TEXT,
        password_salt TEXT,
        real_name TEXT,
        gender TEXT,
        terms_accepted INTEGER DEFAULT 1,
        terms_accepted_at INTEGER,
        created_at INTEGER,
        last_seen INTEGER,
        last_login_at INTEGER,
        avatar TEXT,
        tier TEXT,
        referral_count INTEGER DEFAULT 0,
        referred_by TEXT,
        device_token TEXT,
        metadata TEXT,
        is_banned INTEGER DEFAULT 0,
        is_kicked INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        recipient TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        reply_to TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        unique_id TEXT NOT NULL,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS blocks (
        user_id TEXT,
        blocked_id TEXT,
        PRIMARY KEY(user_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS devices (
        device_token TEXT PRIMARY KEY,
        unique_id TEXT NOT NULL
      );
    `);
    console.log('[Database] Native SQLite persistence active at:', DB_PATH);
  }
} catch (sqliteErr) {
  console.warn('[Database] Native SQLite notice (fallback to atomic JSON store):', sqliteErr.message);
}

const defaultState = {
  users: {}, // { handleKey: { handle, realName, gender, deviceToken, ip, userAgent, device, browser, os, location, joinedAt, lastSeen, currentChat, isBanned, passwordHash, passwordSalt, termsAcceptedAt } }
  devices: {}, // { deviceToken: handleKey }
  sessions: {}, // { sessionToken: handleKey }
  messages: [], // [ { id, sender, recipient, content, createdAt, timestamp, isDeleted } ]
  bannedHandles: [], // [ handle ]
  bannedDetails: {}, // { handleKey: { handle, ip, reason, bannedAt } }
  kickedUsers: {}, // { handleKey: { handle, ip, reason, kickedAt, timeoutUntil } }
  adminLogs: [], // [ { id, action, target, details, timestamp } ]
  feedback: [], // [ { id, sender, type, message, timestamp } ]
  blocks: {} // { userHandle: [ blockedHandle, ... ] }
};

let state = { ...defaultState };

function loadStore() {
  let loaded = false;

  // 1. Load primary store.json
  if (fs.existsSync(STORE_PATH)) {
    try {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        state = { ...defaultState, ...parsed };
        loaded = true;
      }
    } catch (err) {
      console.error('[Database] Failed to parse primary store.json, checking backup:', err.message);
    }
  }

  // 2. Fallback to backup file if primary was corrupted
  if (!loaded && fs.existsSync(BACKUP_PATH)) {
    try {
      const raw = fs.readFileSync(BACKUP_PATH, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        state = { ...defaultState, ...parsed };
        loaded = true;
        console.log('[Database] Restored state from backup file:', BACKUP_PATH);
      }
    } catch (err) {
      console.error('[Database] Failed to load backup:', err.message);
    }
  }

  if (!loaded) {
    state = { ...defaultState };
  }

  if (!state.users) state.users = {};
  if (!state.devices) state.devices = {};
  if (!state.sessions) state.sessions = {};
  if (!state.messages) state.messages = [];
  if (!state.bannedHandles) state.bannedHandles = [];
  if (!state.bannedDetails) state.bannedDetails = {};
  if (!state.kickedUsers) state.kickedUsers = {};
  if (!state.adminLogs) state.adminLogs = [];
  if (!state.feedback) state.feedback = [];
  if (!state.blocks) state.blocks = {};

  // Populate devices reverse index if missing
  for (const [key, user] of Object.entries(state.users)) {
    if (user.deviceToken && !state.devices[user.deviceToken]) {
      state.devices[user.deviceToken] = key;
    }
  }
}

// Atomic crash-safe file write (prevents corruption if process restarts mid-write)
function saveStore() {
  try {
    const tempPath = `${STORE_PATH}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jsonStr = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf-8');
    fs.renameSync(tempPath, STORE_PATH);

    // Periodically sync backup file (every 5 minutes or on demand)
    if (!global._lastBackupTime || Date.now() - global._lastBackupTime > 300000) {
      global._lastBackupTime = Date.now();
      try {
        fs.writeFileSync(BACKUP_PATH, jsonStr, 'utf-8');
      } catch (e) {}
    }
  } catch (err) {
    console.error('[Database] Failed to save store atomically, attempting direct write:', err.message);
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {}
  }
}

// Bidirectional sync between SQLite and JSON store on startup
function syncWithSQLite() {
  if (!sqliteDb) return;
  try {
    // A. Read any existing users from SQLite into memory state
    const rows = sqliteDb.prepare('SELECT * FROM users').all();
    let importedFromSqlite = 0;
    for (const r of rows) {
      const key = r.unique_id.toLowerCase();
      if (!state.users[key]) {
        state.users[key] = {
          handle: r.handle,
          passwordHash: r.password_hash,
          passwordSalt: r.password_salt,
          realName: r.real_name || null,
          gender: r.gender || 'Prefer not to say',
          agreedTerms: Boolean(r.terms_accepted),
          termsAcceptedAt: r.terms_accepted_at || r.created_at,
          joinedAt: r.created_at,
          lastSeen: r.last_seen || r.created_at,
          lastLoginAt: r.last_login_at || r.created_at,
          avatar: r.avatar || null,
          tier: r.tier || null,
          referralCount: r.referral_count || 0,
          referredBy: r.referred_by || null,
          deviceToken: r.device_token || null,
          isBanned: Boolean(r.is_banned),
          isKicked: Boolean(r.is_kicked),
          ...(r.metadata ? JSON.parse(r.metadata) : {})
        };
        importedFromSqlite++;
      }
    }
    if (importedFromSqlite > 0) {
      console.log(`[Database] Recovered ${importedFromSqlite} user accounts from SQLite.`);
    }

    // B. Insert/Sync all users from state.users into SQLite
    const insertUserStmt = sqliteDb.prepare(`
      INSERT OR REPLACE INTO users (
        unique_id, handle, password_hash, password_salt, real_name, gender,
        terms_accepted, terms_accepted_at, created_at, last_seen, last_login_at,
        avatar, tier, referral_count, referred_by, device_token, metadata, is_banned, is_kicked
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    sqliteDb.exec('BEGIN TRANSACTION');
    for (const [key, u] of Object.entries(state.users)) {
      insertUserStmt.run(
        key,
        u.handle,
        u.passwordHash || null,
        u.passwordSalt || null,
        u.realName || null,
        u.gender || 'Prefer not to say',
        u.agreedTerms ? 1 : 0,
        u.termsAcceptedAt || u.joinedAt || Date.now(),
        u.joinedAt || Date.now(),
        u.lastSeen || Date.now(),
        u.lastLoginAt || u.joinedAt || Date.now(),
        u.avatar || null,
        u.tier || null,
        u.referralCount || 0,
        u.referredBy || null,
        u.deviceToken || null,
        JSON.stringify(u.metadata || {}),
        u.isBanned ? 1 : 0,
        u.isKicked ? 1 : 0
      );
    }
    sqliteDb.exec('COMMIT');

    // C. Sync sessions
    if (state.sessions) {
      const sessStmt = sqliteDb.prepare('INSERT OR REPLACE INTO sessions (token, unique_id, created_at) VALUES (?, ?, ?)');
      for (const [token, uid] of Object.entries(state.sessions)) {
        sessStmt.run(token, uid, Date.now());
      }
    }

    // D. Purge any messages in SQLite older than 24h
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    sqliteDb.prepare('DELETE FROM messages WHERE created_at < ? OR timestamp < ?').run(cutoff24h, cutoff24h);

    // Save atomic JSON store with any recovered accounts
    saveStore();
    console.log(`[Database] Dual-layer sync complete. Total permanent registered users: ${Object.keys(state.users).length}`);
  } catch (err) {
    console.error('[Database] SQLite sync error:', err);
  }
}

// Initial boot load and SQLite sync
loadStore();
syncWithSQLite();

export function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(String(password), salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  const computed = crypto.pbkdf2Sync(String(password), salt, 10000, 64, 'sha512').toString('hex');
  return computed === hash;
}

export function getUserTier(count = 0) {
  if (count >= 9) return 'gold';
  if (count >= 6) return 'silver';
  if (count >= 3) return 'bronze';
  return null;
}

export const db = {
  // --- USERS & PERMANENT STORAGE ---
  getUserByDeviceToken(deviceToken) {
    if (!deviceToken) return null;
    const handleKey = state.devices[deviceToken];
    if (!handleKey) return null;
    return state.users[handleKey] || null;
  },

  getUser(handle) {
    if (!handle) return null;
    const key = handle.toLowerCase();
    if (state.users[key]) return state.users[key];

    // Check SQLite fallback if in-memory was missing
    if (sqliteDb) {
      try {
        const row = sqliteDb.prepare('SELECT * FROM users WHERE unique_id = ?').get(key);
        if (row) {
          state.users[key] = {
            handle: row.handle,
            passwordHash: row.password_hash,
            passwordSalt: row.password_salt,
            realName: row.real_name || null,
            gender: row.gender || 'Prefer not to say',
            agreedTerms: Boolean(row.terms_accepted),
            termsAcceptedAt: row.terms_accepted_at || row.created_at,
            joinedAt: row.created_at,
            lastSeen: row.last_seen || row.created_at,
            lastLoginAt: row.last_login_at || row.created_at,
            avatar: row.avatar || null,
            tier: row.tier || null,
            referralCount: row.referral_count || 0,
            referredBy: row.referred_by || null,
            deviceToken: row.device_token || null,
            isBanned: Boolean(row.is_banned),
            isKicked: Boolean(row.is_kicked),
            ...(row.metadata ? JSON.parse(row.metadata) : {})
          };
          saveStore();
          return state.users[key];
        }
      } catch (err) {}
    }
    return null;
  },

  isHandleTaken(handle) {
    if (!handle) return false;
    return !!this.getUser(handle);
  },

  // Authenticate returning user by password (Case A of Step 1)
  authenticateUser(handle, password) {
    if (!handle || !password) {
      return { success: false, reason: 'Username and password required.' };
    }
    const user = this.getUser(handle);
    if (!user) {
      return { success: false, notFound: true, reason: 'User does not exist.' };
    }

    // Verify salted PBKDF2 password
    if (user.passwordHash && user.passwordSalt) {
      const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
      if (!isValid) {
        return { success: false, reason: 'Incorrect password for this Unique ID' };
      }
      return { success: true, user };
    } else {
      // Legacy user without a password: initialize password on first entry
      const { hash, salt } = hashPassword(password);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      this.upsertUser(user);
      return { success: true, user, isNewPasswordSet: true };
    }
  },

  createSession(handle) {
    if (!handle) return null;
    const key = handle.toLowerCase();
    const sessionToken = `sess_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    if (!state.sessions) state.sessions = {};
    state.sessions[sessionToken] = key;

    if (sqliteDb) {
      try {
        sqliteDb.prepare('INSERT OR REPLACE INTO sessions (token, unique_id, created_at) VALUES (?, ?, ?)').run(sessionToken, key, Date.now());
      } catch (err) {}
    }

    saveStore();
    return sessionToken;
  },

  getUserBySessionToken(sessionToken) {
    if (!sessionToken) return null;
    let handleKey = state.sessions ? state.sessions[sessionToken] : null;

    if (!handleKey && sqliteDb) {
      try {
        const row = sqliteDb.prepare('SELECT unique_id FROM sessions WHERE token = ?').get(sessionToken);
        if (row && row.unique_id) {
          handleKey = row.unique_id;
          if (!state.sessions) state.sessions = {};
          state.sessions[sessionToken] = handleKey;
        }
      } catch (err) {}
    }

    if (!handleKey) return null;
    return this.getUser(handleKey);
  },

  invalidateSession(sessionToken) {
    if (sessionToken) {
      if (state.sessions && state.sessions[sessionToken]) {
        delete state.sessions[sessionToken];
        saveStore();
      }
      if (sqliteDb) {
        try {
          sqliteDb.prepare('DELETE FROM sessions WHERE token = ?').run(sessionToken);
        } catch (err) {}
      }
    }
  },

  // Check if a device can register a handle (guarantees Unique ID uniqueness without locking devices)
  canDeviceRegisterHandle(deviceToken, handle) {
    const handleKey = handle.toLowerCase();
    if (this.isHandleTaken(handleKey)) {
      return {
        allowed: false,
        reason: 'This Unique ID is already registered.'
      };
    }
    return { allowed: true };
  },

  // Permanently save or update user in SQLite & atomic JSON store
  upsertUser(user) {
    const handleKey = user.handle.toLowerCase();
    const existing = state.users[handleKey] || {};

    let passwordHash = user.passwordHash || existing.passwordHash || null;
    let passwordSalt = user.passwordSalt || existing.passwordSalt || null;

    if (user.password && (!passwordHash || !passwordSalt)) {
      const hashed = hashPassword(user.password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }

    const { password: _pw, ...cleanUser } = user;
    const now = Date.now();

    const mergedUser = {
      referredBy: null,
      referredUsers: [],
      referralCount: 0,
      avatar: null,
      termsAcceptedAt: user.agreedTerms ? (user.termsAcceptedAt || now) : null,
      joinedAt: existing.joinedAt || now,
      ...existing,
      ...cleanUser,
      passwordHash,
      passwordSalt,
      handle: user.handle,
      lastSeen: now,
      lastLoginAt: user.lastLoginAt || existing.lastLoginAt || now
    };

    state.users[handleKey] = mergedUser;

    if (user.deviceToken) {
      state.devices[user.deviceToken] = handleKey;
    }

    // Persist immediately to SQLite
    if (sqliteDb) {
      try {
        sqliteDb.prepare(`
          INSERT OR REPLACE INTO users (
            unique_id, handle, password_hash, password_salt, real_name, gender,
            terms_accepted, terms_accepted_at, created_at, last_seen, last_login_at,
            avatar, tier, referral_count, referred_by, device_token, metadata, is_banned, is_kicked
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `).run(
          handleKey,
          mergedUser.handle,
          mergedUser.passwordHash,
          mergedUser.passwordSalt,
          mergedUser.realName || null,
          mergedUser.gender || 'Prefer not to say',
          mergedUser.agreedTerms ? 1 : 0,
          mergedUser.termsAcceptedAt || now,
          mergedUser.joinedAt || now,
          mergedUser.lastSeen || now,
          mergedUser.lastLoginAt || now,
          mergedUser.avatar || null,
          mergedUser.tier || null,
          mergedUser.referralCount || 0,
          mergedUser.referredBy || null,
          mergedUser.deviceToken || null,
          JSON.stringify(mergedUser.metadata || {}),
          mergedUser.isBanned ? 1 : 0,
          mergedUser.isKicked ? 1 : 0
        );

        if (user.deviceToken) {
          sqliteDb.prepare('INSERT OR REPLACE INTO devices (device_token, unique_id) VALUES (?, ?)').run(user.deviceToken, handleKey);
        }
      } catch (err) {
        console.error('[Database] Failed to upsert user to SQLite:', err);
      }
    }

    saveStore();
    return mergedUser;
  },

  updateUserAvatar(handle, avatarId) {
    if (!handle) return null;
    const key = handle.toLowerCase();
    if (state.users[key]) {
      state.users[key].avatar = avatarId;
      if (sqliteDb) {
        try {
          sqliteDb.prepare('UPDATE users SET avatar = ? WHERE unique_id = ?').run(avatarId, key);
        } catch (err) {}
      }
      saveStore();
      return state.users[key];
    }
    return null;
  },

  deleteUser(handle, adminHandle = 'ADMIN') {
    if (!handle) return false;
    const key = handle.toLowerCase();
    const user = state.users[key];
    if (!user) return false;

    // Remove from devices
    if (user.deviceToken && state.devices[user.deviceToken]) {
      delete state.devices[user.deviceToken];
    }

    // Remove user
    delete state.users[key];

    // Remove from SQLite
    if (sqliteDb) {
      try {
        sqliteDb.prepare('DELETE FROM users WHERE unique_id = ?').run(key);
        sqliteDb.prepare('DELETE FROM sessions WHERE unique_id = ?').run(key);
        sqliteDb.prepare('DELETE FROM messages WHERE LOWER(sender) = ? OR LOWER(recipient) = ?').run(key, key);
      } catch (err) {}
    }

    // Remove from blocks
    delete state.blocks[key];
    for (const bKey of Object.keys(state.blocks)) {
      state.blocks[bKey] = (state.blocks[bKey] || []).filter(h => h !== key);
    }

    // Delete all messages involving this user (sent or received)
    state.messages = state.messages.filter(m => {
      const s = m.sender.toLowerCase();
      const r = m.recipient ? m.recipient.toLowerCase() : null;
      return s !== key && r !== key;
    });

    this.addAdminLog('DELETE_USER_FULL', handle, `Admin permanently purged account @${handle}, device lock, and all chat history.`);
    saveStore();
    return true;
  },

  recordReferral(inviterHandle, newUserHandle, clientIp = null, deviceToken = null) {
    if (!inviterHandle || !newUserHandle) return null;
    const invKey = inviterHandle.trim().toLowerCase();
    const newKey = newUserHandle.trim().toLowerCase();

    // Prevent self referral
    if (invKey === newKey) return null;

    const inviter = state.users[invKey];
    if (!inviter) return null;

    if (!Array.isArray(inviter.referredUsers)) {
      inviter.referredUsers = [];
    }

    // Check if new user is already counted
    if (!inviter.referredUsers.includes(newKey)) {
      inviter.referredUsers.push(newKey);
      inviter.referralCount = inviter.referredUsers.length;
      inviter.tier = getUserTier(inviter.referralCount);

      // Record referredBy on the new user
      if (state.users[newKey]) {
        state.users[newKey].referredBy = inviter.handle;
      }

      this.addAdminLog('REFERRAL_SUCCESS', inviter.handle, `@${inviter.handle} successfully referred @${newUserHandle} (Milestone: ${inviter.referralCount} invites)`);
      this.upsertUser(inviter);
      return inviter;
    }
    return inviter;
  },

  updateUserStatus(handle, updates = {}) {
    if (!handle) return;
    const key = handle.toLowerCase();
    if (state.users[key]) {
      const { isOnline, currentChat, lastSeen = Date.now(), lastLoginAt, ...rest } = updates;
      if (currentChat !== undefined) state.users[key].currentChat = currentChat;
      state.users[key].lastSeen = lastSeen;
      if (lastLoginAt) state.users[key].lastLoginAt = lastLoginAt;
      Object.assign(state.users[key], rest);

      if (sqliteDb) {
        try {
          sqliteDb.prepare('UPDATE users SET last_seen = ?, last_login_at = ? WHERE unique_id = ?').run(lastSeen, state.users[key].lastLoginAt || lastSeen, key);
        } catch (err) {}
      }

      saveStore();
    }
  },

  getAllUsers() {
    return Object.values(state.users);
  },

  // Persistent Member Directory: All registered members remain saved permanently
  // Online users at the top, offline users at the bottom (never vanishes after 3 hours or days)
  getPersistentMemberList(activeHandlesSet) {
    return Object.values(state.users).map((user) => {
      const lower = user.handle.toLowerCase();
      const isOnline = activeHandlesSet.has(lower);
      const refCount = user.referralCount || (Array.isArray(user.referredUsers) ? user.referredUsers.length : 0);
      return {
        handle: user.handle,
        gender: user.gender === 'Prefer not to say' ? null : user.gender,
        avatar: user.avatar || null,
        isOnline,
        lastSeen: user.lastSeen || user.joinedAt || Date.now(),
        connectedAt: user.lastLoginAt || user.joinedAt || Date.now(),
        lastLoginAt: user.lastLoginAt || user.joinedAt || user.lastSeen || Date.now(),
        referralCount: refCount,
        tier: getUserTier(refCount)
      };
    }).sort((a, b) => {
      // Online users at the top, offline users at the bottom
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (b.lastSeen || 0) - (a.lastSeen || 0);
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
    if (sqliteDb) {
      try {
        sqliteDb.prepare('UPDATE users SET is_banned = 1 WHERE unique_id = ?').run(key);
      } catch (err) {}
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
    if (sqliteDb) {
      try {
        sqliteDb.prepare('UPDATE users SET is_banned = 0 WHERE unique_id = ?').run(key);
      } catch (err) {}
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
    return Object.values(state.kickedUsers).filter(k => k.timeoutUntil > now);
  },

  // --- BLOCKS (1-on-1 Block Management) ---
  addBlock(userHandle, blockedHandle) {
    const uKey = userHandle.toLowerCase();
    const bKey = blockedHandle.toLowerCase();
    if (!state.blocks[uKey]) state.blocks[uKey] = [];
    if (!state.blocks[uKey].includes(bKey)) {
      state.blocks[uKey].push(bKey);
      if (sqliteDb) {
        try {
          sqliteDb.prepare('INSERT OR REPLACE INTO blocks (user_id, blocked_id) VALUES (?, ?)').run(uKey, bKey);
        } catch (err) {}
      }
      saveStore();
    }
  },

  removeBlock(userHandle, blockedHandle) {
    const uKey = userHandle.toLowerCase();
    const bKey = blockedHandle.toLowerCase();
    if (state.blocks[uKey]) {
      state.blocks[uKey] = state.blocks[uKey].filter(h => h !== bKey);
      if (sqliteDb) {
        try {
          sqliteDb.prepare('DELETE FROM blocks WHERE user_id = ? AND blocked_id = ?').run(uKey, bKey);
        } catch (err) {}
      }
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

  // --- STRICT 24-HOUR PERSISTENT MESSAGES (ONLINE & OFFLINE) ---
  addMessage({ sender, recipient = null, content, replyTo = null }) {
    const now = Date.now();
    const msg = {
      id: 'msg_' + now + '_' + Math.random().toString(36).substring(2, 9),
      sender,
      recipient: recipient ? recipient : null,
      content,
      replyTo: replyTo && replyTo.id ? {
        id: replyTo.id,
        sender: replyTo.sender,
        content: (replyTo.content || '').substring(0, 300)
      } : null,
      createdAt: now,
      timestamp: now,
      isDeleted: false
    };
    state.messages.push(msg);

    // Persist to SQLite
    if (sqliteDb) {
      try {
        sqliteDb.prepare(`
          INSERT OR REPLACE INTO messages (id, sender, recipient, content, created_at, timestamp, is_deleted, reply_to)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          msg.id,
          msg.sender,
          msg.recipient,
          msg.content,
          msg.createdAt,
          msg.timestamp,
          0,
          msg.replyTo ? JSON.stringify(msg.replyTo) : null
        );
      } catch (err) {
        console.error('[Database] Failed to insert message into SQLite:', err);
      }
    }

    saveStore();
    return msg;
  },

  // Public & direct messages strictly within 24h TTL (accessible even when users are offline)
  getPublicMessages({ userA = null, userB = null } = {}) {
    const ttlCutoff = Date.now() - 24 * 60 * 60 * 1000;
    return state.messages.filter(msg => {
      const msgTime = msg.createdAt || msg.timestamp || 0;
      if (msg.isDeleted || msgTime < ttlCutoff) return false;

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

  // Admin: get all messages for a specific conversation pair strictly within 24h
  getMessagesForPair(pairKey) {
    const ttlCutoff = Date.now() - 24 * 60 * 60 * 1000;
    if (pairKey === '#lounge') {
      return state.messages.filter(m => m.recipient === null && !m.isDeleted && (m.createdAt || m.timestamp) >= ttlCutoff);
    }

    const parts = pairKey.split(' ↔ ');
    if (parts.length !== 2) return [];

    const uA = parts[0].toLowerCase();
    const uB = parts[1].toLowerCase();

    return state.messages.filter(msg => {
      const msgTime = msg.createdAt || msg.timestamp || 0;
      if (msg.isDeleted || msgTime < ttlCutoff) return false;
      const s = msg.sender.toLowerCase();
      const r = msg.recipient ? msg.recipient.toLowerCase() : null;
      return (s === uA && r === uB) || (s === uB && r === uA);
    }).sort((a, b) => (a.createdAt || a.timestamp) - (b.createdAt || b.timestamp));
  },

  // Admin: aggregate all active conversation pairs strictly within 24h
  getPairedConversations() {
    const ttlCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const pairsMap = new Map();

    // Ensure #lounge thread exists if there are lounge messages
    const loungeMsgs = state.messages.filter(m => m.recipient === null && !m.isDeleted && (m.createdAt || m.timestamp) >= ttlCutoff);
    if (loungeMsgs.length > 0) {
      const lastLounge = loungeMsgs[loungeMsgs.length - 1];
      pairsMap.set('#lounge', {
        pairKey: '#lounge',
        isLounge: true,
        participants: ['Public Broadcast'],
        lastMessage: lastLounge.content,
        lastSender: lastLounge.sender,
        lastTimestamp: lastLounge.createdAt || lastLounge.timestamp,
        totalMessages: loungeMsgs.length
      });
    }

    // Process 1-on-1 direct messages
    const directMsgs = state.messages.filter(m => m.recipient !== null && !m.isDeleted && (m.createdAt || m.timestamp) >= ttlCutoff);
    for (const msg of directMsgs) {
      const sorted = [msg.sender, msg.recipient].sort((a, b) => a.localeCompare(b));
      const pairKey = `${sorted[0]} ↔ ${sorted[1]}`;

      const senderUser = state.users[msg.sender.toLowerCase()];
      const recipientUser = state.users[msg.recipient.toLowerCase()];

      if (!pairsMap.has(pairKey)) {
        pairsMap.set(pairKey, {
          pairKey,
          isLounge: false,
          participants: [sorted[0], sorted[1]],
          lastMessage: msg.content,
          lastSender: msg.sender,
          lastTimestamp: msg.createdAt || msg.timestamp,
          totalMessages: 1,
          participantDetails: {
            [msg.sender]: {
              realName: senderUser?.realName || null,
              gender: senderUser?.gender || null,
              ip: senderUser?.ip || null,
              device: senderUser?.device || null,
              screen: senderUser?.screen || null,
              avatar: senderUser?.avatar || null
            },
            [msg.recipient]: {
              realName: recipientUser?.realName || null,
              gender: recipientUser?.gender || null,
              ip: recipientUser?.ip || null,
              device: recipientUser?.device || null,
              screen: recipientUser?.screen || null,
              avatar: recipientUser?.avatar || null
            }
          }
        });
      } else {
        const p = pairsMap.get(pairKey);
        p.totalMessages++;
        const msgTime = msg.createdAt || msg.timestamp;
        if (msgTime > p.lastTimestamp) {
          p.lastMessage = msg.content;
          p.lastSender = msg.sender;
          p.lastTimestamp = msgTime;
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

      if (sqliteDb) {
        try {
          sqliteDb.prepare('UPDATE messages SET is_deleted = 1 WHERE id = ?').run(messageId);
        } catch (err) {}
      }

      this.addAdminLog('DELETE_MESSAGE', messageId, `Deleted message from ${msg.sender}`);
      saveStore();
      return msg;
    }
    return null;
  },

  getMessage(messageId) {
    return state.messages.find(m => m.id === messageId) || null;
  },

  updateMessageContent(messageId, newContent) {
    const msg = state.messages.find(m => m.id === messageId);
    if (msg) {
      msg.content = newContent;
      msg.updatedAt = Date.now();

      if (sqliteDb) {
        try {
          sqliteDb.prepare('UPDATE messages SET content = ? WHERE id = ?').run(newContent, messageId);
        } catch (err) {}
      }

      saveStore();
      return msg;
    }
    return null;
  },

  // Strict 24-Hour Auto-Vanish Message Retention (Permanent purge from SQLite and JSON)
  purgeExpiredMessages() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const initialCount = state.messages.length;
    const expiredIds = [];

    state.messages = state.messages.filter(m => {
      const msgTime = m.createdAt || m.timestamp || 0;
      if (msgTime < cutoff) {
        expiredIds.push(m.id);
        return false;
      }
      return true;
    });

    // Delete permanently from SQLite table
    if (sqliteDb) {
      try {
        sqliteDb.prepare('DELETE FROM messages WHERE created_at < ? OR timestamp < ?').run(cutoff, cutoff);
      } catch (err) {
        console.error('[Database] Failed to purge expired messages from SQLite:', err);
      }
    }

    if (state.messages.length !== initialCount) {
      saveStore();
    }
    return expiredIds;
  },

  // Security Feature: Admin Full-Chat Deletion Power
  deleteConversation(pairKey, adminHandle = 'ADMIN') {
    let deletedCount = 0;
    if (pairKey === '#lounge') {
      const remaining = [];
      for (const m of state.messages) {
        if (m.recipient === null) {
          deletedCount++;
        } else {
          remaining.push(m);
        }
      }
      state.messages = remaining;

      if (sqliteDb) {
        try {
          sqliteDb.prepare('DELETE FROM messages WHERE recipient IS NULL').run();
        } catch (err) {}
      }
    } else {
      const parts = pairKey.split(' ↔ ');
      if (parts.length === 2) {
        const uA = parts[0].toLowerCase();
        const uB = parts[1].toLowerCase();
        const remaining = [];
        for (const m of state.messages) {
          if (m.recipient !== null) {
            const s = m.sender.toLowerCase();
            const r = m.recipient.toLowerCase();
            if ((s === uA && r === uB) || (s === uB && r === uA)) {
              deletedCount++;
              continue;
            }
          }
          remaining.push(m);
        }
        state.messages = remaining;

        if (sqliteDb) {
          try {
            sqliteDb.prepare(`
              DELETE FROM messages 
              WHERE (LOWER(sender) = ? AND LOWER(recipient) = ?) 
                 OR (LOWER(sender) = ? AND LOWER(recipient) = ?)
            `).run(uA, uB, uB, uA);
          } catch (err) {}
        }
      }
    }
    this.addAdminLog('DELETE_CHAT_THREAD', pairKey, `Permanently purged entire chat thread (${deletedCount} messages deleted).`);
    saveStore();
    return { success: true, deletedCount };
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
