import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { parseClientMetadata } from './metadata.js';
import { ICE_BREAKER_QUESTIONS, getRandomUnaskedQuestion, getQuestionById } from './questionsData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

const PORT = process.env.PORT || 3001;
// Protected admin passcode per user requirement
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'levin514326@2008';

const app = express();
app.use(cors());
app.use(express.json());

// Serve built frontend if available
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory active presence tracker: handleLowerCase -> { handle, gender, socketId, connectedAt, currentChat, metadata, deviceToken }
const activeUsers = new Map();

// 45-Second Disconnect Grace Period Timers: handleLowerCase -> timeoutId
const disconnectGraceTimers = new Map();

// In-memory single-reaction tracker per message per user:
// messageId -> Map(userHandleLower -> emoji)
const messageReactions = new Map();

// In-memory failed admin login attempt counter: IP -> count
const adminFailedAttempts = new Map();

// In-memory anti-bot IP registration tracker: IP -> [timestamp, timestamp]
const ipRegistrationMap = new Map();

// In-memory Active Tic-Tac-Toe (XO) Games: gameId -> gameData
const activeXOGames = new Map();

// In-memory Active Private Chat Themes: roomKey ('userA:userB') -> themeConfig
const activePrivateThemes = new Map();

// In-memory Asked Questions per chat session: roomKey -> Set of asked question IDs
const chatAskedQuestions = new Map();

// In-memory Active Question (Ice Breaker) Games: gameId -> gameData
const activeQuestionGames = new Map();

const XO_WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

function checkXOWinner(board) {
  for (const line of XO_WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'DRAW', winningLine: null };
  }
  return null;
}

function getAggregateReactions(messageId) {
  const userMap = messageReactions.get(messageId);
  if (!userMap || userMap.size === 0) return [];
  const counts = new Map();
  for (const [, emoji] of userMap) {
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }));
}

// Helper: build persistent member list with online/offline indicators
function getPersistentMemberList() {
  const activeHandles = new Set(activeUsers.keys());
  return db.getPersistentMemberList(activeHandles);
}

// Helper: build admin member list (with IP, device, OS, userAgent, location, currentChat, realName, screen, isOnline)
function getAdminMemberList() {
  const allDbUsers = db.getAllUsers();
  const activeHandles = new Set(activeUsers.keys());

  return allDbUsers.map((dbUser) => {
    const lower = dbUser.handle.toLowerCase();
    const activeSession = activeUsers.get(lower);

    return {
      handle: dbUser.handle,
      avatar: dbUser.avatar || null,
      realName: dbUser.realName || null,
      gender: dbUser.gender,
      tier: dbUser.tier || null,
      referralCount: dbUser.referralCount || (Array.isArray(dbUser.referredUsers) ? dbUser.referredUsers.length : 0),
      isOnline: activeHandles.has(lower),
      socketId: activeSession ? activeSession.socketId : null,
      connectedAt: activeSession ? activeSession.connectedAt : (dbUser.joinedAt || dbUser.lastSeen),
      lastLoginAt: activeSession ? activeSession.connectedAt : (dbUser.lastLoginAt || dbUser.joinedAt || dbUser.lastSeen),
      joinedAt: dbUser.joinedAt || null,
      lastSeen: dbUser.lastSeen || dbUser.joinedAt,
      currentChat: activeSession ? (activeSession.currentChat || '#lounge') : (dbUser.currentChat || '#lounge'),
      metadata: activeSession?.metadata || {
        ip: dbUser.ip || 'Unknown IP',
        device: dbUser.device || dbUser.deviceType || 'Unknown Device',
        deviceType: dbUser.deviceType || dbUser.device || 'Desktop',
        mobileModel: dbUser.mobileModel || dbUser.device,
        os: dbUser.os || 'Unknown OS',
        browser: dbUser.browser || 'Unknown Browser',
        location: dbUser.location || 'Location Unavailable',
        screen: dbUser.screen || 'Unknown Resolution',
        cpuCores: dbUser.cpuCores || 'N/A',
        ram: dbUser.ram || 'N/A',
        hardwareSpecs: dbUser.hardwareSpecs || 'Standard Hardware',
        networkType: dbUser.networkType || 'Standard Network',
        connectionSpeed: dbUser.connectionSpeed || 'Fast',
        userAgent: dbUser.userAgent || ''
      }
    };
  }).sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || (b.lastSeen - a.lastSeen));
}

// REST: Check handle availability
app.get('/api/check-handle', (req, res) => {
  const rawHandle = req.query.handle;
  const deviceToken = req.query.deviceToken;
  if (!rawHandle || typeof rawHandle !== 'string') {
    return res.status(400).json({ available: false, reason: 'Invalid username format.' });
  }

  const handle = rawHandle.trim();
  if (handle.length < 3 || handle.length > 20) {
    return res.json({ available: false, reason: 'Username must be 3-20 characters long.' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
    return res.json({ available: false, reason: 'Only letters, numbers, and underscores allowed.' });
  }

  const lower = handle.toLowerCase();

  // Check if banned
  if (db.isHandleBanned(lower)) {
    return res.json({ available: false, reason: 'This username has been suspended.' });
  }

  // Check if reserved
  if (lower === 'admin' || lower === 'system' || lower === 'moderator' || lower === 'chaattiko') {
    return res.json({ available: false, reason: 'This username is reserved.' });
  }

  // Check device-lock availability
  if (deviceToken) {
    const check = db.canDeviceRegisterHandle(deviceToken, handle);
    if (!check.allowed) {
      return res.json({ available: false, reason: check.reason });
    }
  } else {
    // If handle already claimed
    const existing = db.getUser(handle);
    if (existing) {
      return res.json({ available: false, reason: 'This username is already permanently registered.' });
    }
  }

  // Check if currently active online
  if (activeUsers.has(lower)) {
    return res.json({ available: false, reason: 'Username is currently active online.' });
  }

  return res.json({ available: true });
});

// REST: Admin login with strict 3-attempt limit & permanent lockout
app.post('/api/admin/verify', (req, res) => {
  const { passcode, deviceToken } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'unknown_ip';
  const lockKey = deviceToken ? `dev_${deviceToken}` : `ip_${ip}`;

  const currentAttempts = adminFailedAttempts.get(lockKey) || 0;
  if (currentAttempts >= 3) {
    return res.status(403).json({
      success: false,
      locked: true,
      remainingAttempts: 0,
      message: 'Access Locked: Maximum password attempts exceeded.'
    });
  }

  if (!passcode || passcode !== ADMIN_PASSCODE) {
    const nextAttempts = currentAttempts + 1;
    adminFailedAttempts.set(lockKey, nextAttempts);
    const remaining = Math.max(0, 3 - nextAttempts);

    if (remaining === 0) {
      return res.status(403).json({
        success: false,
        locked: true,
        remainingAttempts: 0,
        message: 'Access Locked: Maximum password attempts exceeded.'
      });
    }

    return res.status(401).json({
      success: false,
      locked: false,
      remainingAttempts: remaining,
      message: `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    });
  }

  // Clear attempts on success
  adminFailedAttempts.delete(lockKey);
  return res.json({ success: true, token: 'admin_auth_token_' + Buffer.from(ADMIN_PASSCODE).toString('base64') });
});

// Real-time WebSockets
io.on('connection', async (socket) => {
  const metadata = await parseClientMetadata(socket);
  let userHandle = null;

  // 1. Automatic Login via Session Token or Device Token
  socket.on('user:auto-login', ({ sessionToken, deviceToken, clientDeviceInfo }, callback) => {
    let boundUser = null;
    if (sessionToken) {
      boundUser = db.getUserBySessionToken(sessionToken);
    }
    if (!boundUser && deviceToken) {
      boundUser = db.getUserByDeviceToken(deviceToken);
    }

    if (!boundUser) {
      return callback({ success: false, notRegistered: true });
    }

    const lower = boundUser.handle.toLowerCase();

    if (db.isHandleBanned(lower)) {
      return callback({ success: false, message: 'This account has been suspended.' });
    }

    if (db.isHandleKicked(lower)) {
      const kick = db.getKickedInfo(lower);
      const remainingSecs = Math.max(1, Math.round((kick.timeoutUntil - Date.now()) / 1000));
      return callback({ success: false, message: `Account temporarily on cooldown (${remainingSecs}s remaining).` });
    }

    userHandle = boundUser.handle;
    socket.data.handle = userHandle;

    // Disconnect any existing socket for this user
    if (activeUsers.has(lower)) {
      const prev = activeUsers.get(lower);
      if (prev && prev.socketId && prev.socketId !== socket.id) {
        const oldSock = io.sockets.sockets.get(prev.socketId);
        if (oldSock) oldSock.disconnect(true);
      }
    }

    // Clear any active 45-second disconnect grace timer for this user
    if (disconnectGraceTimers.has(lower)) {
      clearTimeout(disconnectGraceTimers.get(lower));
      disconnectGraceTimers.delete(lower);
    }

    // Merge client-provided high accuracy device info if available
    const enrichedMetadata = {
      ...metadata,
      ...(clientDeviceInfo ? {
        device: clientDeviceInfo.deviceModel || clientDeviceInfo.deviceType || metadata.device,
        deviceType: clientDeviceInfo.deviceType || metadata.device,
        os: clientDeviceInfo.os || metadata.os,
        browser: clientDeviceInfo.browser || metadata.browser,
        screen: clientDeviceInfo.screen,
        mobileModel: clientDeviceInfo.deviceModel,
        cpuCores: clientDeviceInfo.cpuCores,
        ram: clientDeviceInfo.ram,
        hardwareSpecs: clientDeviceInfo.hardwareSpecs,
        networkType: clientDeviceInfo.networkType,
        connectionSpeed: clientDeviceInfo.connectionSpeed
      } : {})
    };

    console.log(`[Security / Auth Log] User Auto-Login: @${userHandle} | IP: ${metadata.ip} | Device: ${enrichedMetadata.device || enrichedMetadata.deviceType} | OS: ${enrichedMetadata.os} | Browser: ${enrichedMetadata.browser}`);

    db.addAdminLog('USER_CONNECT', userHandle, `Connected from IP: ${metadata.ip} (${enrichedMetadata.os} · ${enrichedMetadata.device || enrichedMetadata.deviceType} · ${enrichedMetadata.browser})`);

    const newSessionToken = db.createSession(userHandle);

    const sessionInfo = {
      handle: userHandle,
      gender: boundUser.gender || 'Prefer not to say',
      socketId: socket.id,
      connectedAt: Date.now(),
      currentChat: '#lounge',
      metadata: enrichedMetadata,
      deviceToken: deviceToken || boundUser.deviceToken
    };

    activeUsers.set(lower, sessionInfo);

    db.updateUserStatus(userHandle, {
      isOnline: true,
      currentChat: '#lounge',
      lastSeen: Date.now(),
      lastLoginAt: sessionInfo.connectedAt,
      ...enrichedMetadata
    });

    socket.join('lounge');
    socket.join(`user_${lower}`);

    // Broadcast updated persistent member list to all clients
    io.emit('members:update', getPersistentMemberList());

    io.to('admin_room').emit('admin:event', {
      type: 'USER_AUTO_LOGIN',
      user: sessionInfo,
      timestamp: Date.now()
    });
    io.to('admin_room').emit('admin:active-members', getAdminMemberList());

    callback({
      success: true,
      sessionToken: newSessionToken,
      user: {
        handle: userHandle,
        avatar: boundUser.avatar || null,
        gender: boundUser.gender,
        connectedAt: sessionInfo.connectedAt,
        referralCount: boundUser.referralCount || (Array.isArray(boundUser.referredUsers) ? boundUser.referredUsers.length : 0),
        tier: boundUser.tier || null,
        referredBy: boundUser.referredBy || null
      }
    });
  });

  // Step 1: Unique ID & Password check / Returning User Login
  socket.on('auth:step1', ({ handle: rawHandle, password, deviceToken, clientDeviceInfo }, callback) => {
    if (!rawHandle || typeof rawHandle !== 'string') {
      return callback({ success: false, reason: 'Valid Unique ID is required.' });
    }
    const trimmed = rawHandle.trim();
    if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return callback({ success: false, reason: 'Unique ID must be 3-20 letters, numbers, or underscores.' });
    }
    const lower = trimmed.toLowerCase();
    if (lower === 'admin' || lower === 'system' || lower === 'chaattiko' || lower === 'moderator') {
      return callback({ success: false, reason: 'This Unique ID is reserved.' });
    }
    if (db.isHandleBanned(lower)) {
      return callback({ success: false, reason: 'This Unique ID has been suspended.' });
    }
    if (db.isHandleKicked(lower)) {
      const kick = db.getKickedInfo(lower);
      const remainingSecs = Math.max(1, Math.round((kick.timeoutUntil - Date.now()) / 1000));
      return callback({ success: false, reason: `Account temporarily on cooldown (${remainingSecs}s remaining).` });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return callback({ success: false, reason: 'Password must be at least 4 characters long.' });
    }

    const existingUser = db.getUser(trimmed);

    // Returning user flow: authenticate directly without step 2
    if (existingUser) {
      const auth = db.authenticateUser(trimmed, password);
      if (!auth.success) {
        return callback({
          exists: true,
          success: false,
          reason: auth.reason || 'Incorrect password for this Unique ID'
        });
      }

      userHandle = existingUser.handle;
      socket.data.handle = userHandle;

      if (activeUsers.has(lower)) {
        const prev = activeUsers.get(lower);
        if (prev && prev.socketId && prev.socketId !== socket.id) {
          const oldSock = io.sockets.sockets.get(prev.socketId);
          if (oldSock) oldSock.disconnect(true);
        }
      }

      if (disconnectGraceTimers.has(lower)) {
        clearTimeout(disconnectGraceTimers.get(lower));
        disconnectGraceTimers.delete(lower);
      }

      const enrichedMetadata = {
        ...metadata,
        ...(clientDeviceInfo ? {
          device: clientDeviceInfo.deviceModel || clientDeviceInfo.deviceType || metadata.device,
          deviceType: clientDeviceInfo.deviceType || metadata.device,
          os: clientDeviceInfo.os || metadata.os,
          browser: clientDeviceInfo.browser || metadata.browser,
          screen: clientDeviceInfo.screen,
          mobileModel: clientDeviceInfo.deviceModel,
          cpuCores: clientDeviceInfo.cpuCores,
          ram: clientDeviceInfo.ram,
          hardwareSpecs: clientDeviceInfo.hardwareSpecs,
          networkType: clientDeviceInfo.networkType,
          connectionSpeed: clientDeviceInfo.connectionSpeed
        } : {})
      };

      console.log(`[Security / Auth Log] Returning User Logged In: @${userHandle} | IP: ${metadata.ip} | Device: ${enrichedMetadata.device || enrichedMetadata.deviceType}`);
      db.addAdminLog('USER_LOGIN', userHandle, `Logged in with password from IP: ${metadata.ip} (${enrichedMetadata.os} · ${enrichedMetadata.device || enrichedMetadata.deviceType} · ${enrichedMetadata.browser})`);

      const sessionToken = db.createSession(userHandle);

      const sessionInfo = {
        handle: userHandle,
        gender: existingUser.gender || 'Prefer not to say',
        socketId: socket.id,
        connectedAt: Date.now(),
        currentChat: '#lounge',
        metadata: enrichedMetadata,
        deviceToken: deviceToken || existingUser.deviceToken
      };

      activeUsers.set(lower, sessionInfo);

      db.updateUserStatus(userHandle, {
        isOnline: true,
        currentChat: '#lounge',
        lastSeen: Date.now(),
        lastLoginAt: sessionInfo.connectedAt,
        ...enrichedMetadata
      });

      socket.join('lounge');
      socket.join(`user_${lower}`);

      io.emit('members:update', getPersistentMemberList());
      io.to('admin_room').emit('admin:event', {
        type: 'USER_LOGIN',
        user: sessionInfo,
        timestamp: Date.now()
      });
      io.to('admin_room').emit('admin:active-members', getAdminMemberList());

      return callback({
        exists: true,
        success: true,
        sessionToken,
        user: {
          handle: userHandle,
          avatar: existingUser.avatar || null,
          gender: existingUser.gender,
          connectedAt: sessionInfo.connectedAt,
          referralCount: existingUser.referralCount || (Array.isArray(existingUser.referredUsers) ? existingUser.referredUsers.length : 0),
          tier: existingUser.tier || null,
          referredBy: existingUser.referredBy || null
        }
      });
    }

    // New user flow: handle is available, stage credentials and proceed to Step 2
    if (deviceToken) {
      const lockCheck = db.canDeviceRegisterHandle(deviceToken, trimmed);
      if (!lockCheck.allowed) {
        return callback({ exists: false, success: false, reason: lockCheck.reason });
      }
    }

    return callback({
      exists: false,
      success: true,
      message: 'Unique ID available. Proceed to Step 2.'
    });
  });

  // Handle availability check over socket
  socket.on('check:handle', ({ handle: rawHandle, deviceToken }, callback) => {
    if (!rawHandle || typeof rawHandle !== 'string') {
      return callback({ available: false, reason: 'Invalid handle.' });
    }
    const handle = rawHandle.trim();
    if (handle.length < 3 || handle.length > 20) {
      return callback({ available: false, reason: 'Username must be 3-20 characters.' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      return callback({ available: false, reason: 'Only letters, numbers, and underscores.' });
    }
    const lower = handle.toLowerCase();
    if (db.isHandleBanned(lower)) {
      return callback({ available: false, reason: 'This username is banned.' });
    }
    if (lower === 'admin' || lower === 'system' || lower === 'moderator' || lower === 'chaattiko') {
      return callback({ available: false, reason: 'Username is reserved.' });
    }

    if (deviceToken) {
      const check = db.canDeviceRegisterHandle(deviceToken, handle);
      if (!check.allowed) {
        return callback({ available: false, reason: check.reason });
      }
    } else {
      if (db.getUser(handle)) {
        return callback({ available: false, reason: 'Username is already permanently registered.' });
      }
    }

    if (activeUsers.has(lower)) {
      return callback({ available: false, reason: 'Already in use by an active member.' });
    }
    return callback({ available: true });
  });

  // User Onboarding Join (Step 2: Permanent Registration + Private Real Name + Device Detection Payload)
  socket.on('user:join', ({ handle, password, realName, gender, agreedTerms, deviceToken, clientDeviceInfo, referredBy }, callback) => {
    if (!agreedTerms) {
      return callback({ success: false, message: 'You must agree to the Terms & Conditions.' });
    }

    if (!handle || typeof handle !== 'string') {
      return callback({ success: false, message: 'Valid handle is required.' });
    }

    const trimmed = handle.trim();
    if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return callback({ success: false, message: 'Invalid username format (3-20 letters/numbers/_).' });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return callback({ success: false, message: 'Password must be at least 4 characters long.' });
    }

    const lower = trimmed.toLowerCase();

    // Anti-Bot: IP rate limit check (max 5 new registrations per IP per hour)
    const clientIp = metadata.ip || 'unknown';
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    let regTimes = ipRegistrationMap.get(clientIp) || [];
    regTimes = regTimes.filter(t => t > oneHourAgo);
    if (regTimes.length >= 5) {
      return callback({ success: false, message: 'Too many registrations from this network. Please try again later.' });
    }
    regTimes.push(now);
    ipRegistrationMap.set(clientIp, regTimes);

    if (db.isHandleBanned(lower)) {
      return callback({ success: false, message: 'This handle is suspended from the platform.' });
    }

    if (db.isHandleKicked(lower)) {
      const kick = db.getKickedInfo(lower);
      const remainingSecs = Math.max(1, Math.round((kick.timeoutUntil - Date.now()) / 1000));
      return callback({ success: false, message: `Account temporarily on cooldown (${remainingSecs}s remaining).` });
    }

    if (lower === 'admin' || lower === 'system' || lower === 'chaattiko' || lower === 'moderator') {
      return callback({ success: false, message: 'Username is reserved.' });
    }

    if (db.getUser(trimmed)) {
      return callback({ success: false, message: 'This Unique ID is already registered.' });
    }

    // Check device lock
    if (deviceToken) {
      const lockCheck = db.canDeviceRegisterHandle(deviceToken, trimmed);
      if (!lockCheck.allowed) {
        return callback({ success: false, message: lockCheck.reason });
      }
    }

    if (activeUsers.has(lower)) {
      return callback({ success: false, message: 'This username is currently active.' });
    }

    userHandle = trimmed;
    socket.data.handle = userHandle;

    const cleanGender = ['Male', 'Female', 'Prefer not to say'].includes(gender) ? gender : 'Prefer not to say';
    const cleanRealName = (typeof realName === 'string' && realName.trim()) ? realName.trim().slice(0, 50) : null;

    // Merge high accuracy frontend device detection with socket headers metadata
    const enrichedMetadata = {
      ...metadata,
      ...(clientDeviceInfo ? {
        device: clientDeviceInfo.deviceModel || clientDeviceInfo.deviceType || metadata.device,
        deviceType: clientDeviceInfo.deviceType || metadata.device,
        os: clientDeviceInfo.os || metadata.os,
        browser: clientDeviceInfo.browser || metadata.browser,
        screen: clientDeviceInfo.screen,
        mobileModel: clientDeviceInfo.deviceModel,
        cpuCores: clientDeviceInfo.cpuCores,
        ram: clientDeviceInfo.ram,
        hardwareSpecs: clientDeviceInfo.hardwareSpecs,
        networkType: clientDeviceInfo.networkType,
        connectionSpeed: clientDeviceInfo.connectionSpeed
      } : {})
    };

    console.log(`[Security / Auth Log] New User Registered: @${userHandle} (Real Name: ${cleanRealName || 'None'}) | IP: ${metadata.ip} | Device: ${enrichedMetadata.device || enrichedMetadata.deviceType} | OS: ${enrichedMetadata.os} | Browser: ${enrichedMetadata.browser}`);

    db.addAdminLog('USER_JOIN', userHandle, `Registered device from IP: ${metadata.ip} (${enrichedMetadata.os} · ${enrichedMetadata.device || enrichedMetadata.deviceType} · ${enrichedMetadata.browser})`);

    const sessionInfo = {
      handle: userHandle,
      realName: cleanRealName,
      gender: cleanGender,
      deviceToken,
      socketId: socket.id,
      connectedAt: Date.now(),
      currentChat: '#lounge',
      metadata: enrichedMetadata
    };

    activeUsers.set(lower, sessionInfo);

    // Persist permanently bound account in DB with password, terms, and Real Name (Admin-only visibility)
    db.upsertUser({
      handle: userHandle,
      password,
      realName: cleanRealName,
      gender: cleanGender,
      agreedTerms: true,
      termsAcceptedAt: Date.now(),
      deviceToken,
      currentChat: '#lounge',
      ...enrichedMetadata,
      joinedAt: sessionInfo.connectedAt,
      lastLoginAt: sessionInfo.connectedAt
    });

    const sessionToken = db.createSession(userHandle);

    // Record Referral if provided (with anti-bot IP self-referral prevention)
    if (referredBy) {
      const inviter = db.getUser(referredBy);
      if (inviter && inviter.ip && metadata.ip && inviter.ip === metadata.ip) {
        console.log(`[Anti-Bot] Referral rejected: Same IP match (${metadata.ip}) between inviter @${referredBy} and @${userHandle}`);
      } else {
        db.recordReferral(referredBy, userHandle, metadata.ip, deviceToken);
      }
    }

    // Join lounge and personal room
    socket.join('lounge');
    socket.join(`user_${lower}`);

    // Broadcast updated persistent directory to all clients (realName is EXCLUDED)
    io.emit('members:update', getPersistentMemberList());

    io.to('admin_room').emit('admin:event', {
      type: 'USER_JOINED',
      user: sessionInfo,
      timestamp: Date.now()
    });
    io.to('admin_room').emit('admin:active-members', getAdminMemberList());
    io.to('admin_room').emit('admin:paired-threads', db.getPairedConversations());

    const savedUser = db.getUser(userHandle);

    callback({
      success: true,
      sessionToken,
      user: {
        handle: userHandle,
        avatar: savedUser?.avatar || null,
        gender: cleanGender,
        connectedAt: sessionInfo.connectedAt,
        referralCount: savedUser?.referralCount || 0,
        tier: savedUser?.tier || null,
        referredBy: savedUser?.referredBy || null
      }
    });
  });

  // User Logout
  socket.on('user:logout', ({ sessionToken }, callback) => {
    if (sessionToken) {
      db.invalidateSession(sessionToken);
    }
    if (userHandle) {
      const lower = userHandle.toLowerCase();
      activeUsers.delete(lower);
      db.updateUserStatus(userHandle, { isOnline: false, lastSeen: Date.now() });
      io.emit('members:update', getPersistentMemberList());
      io.to('admin_room').emit('admin:event', {
        type: 'USER_LOGOUT',
        handle: userHandle,
        timestamp: Date.now()
      });
      io.to('admin_room').emit('admin:active-members', getAdminMemberList());
      userHandle = null;
      socket.data.handle = null;
    }
    if (callback) callback({ success: true });
  });

  // Track who user is chatting with in real-time
  socket.on('user:chatting-with', ({ targetUser }) => {
    if (!userHandle) return;
    const lower = userHandle.toLowerCase();
    const chatDisplay = targetUser ? `@${targetUser}` : '#lounge';
    if (activeUsers.has(lower)) {
      activeUsers.get(lower).currentChat = chatDisplay;
    }
    db.updateUserCurrentChat(userHandle, targetUser);
    io.to('admin_room').emit('admin:active-members', getAdminMemberList());
  });

  // Request Persistent Members List
  socket.on('members:get', (callback) => {
    callback(getPersistentMemberList());
  });

  // Request Message History (24-Hour TTL filtered, accessible even when offline)
  socket.on('messages:history', ({ targetUser }, callback) => {
    if (!userHandle) return callback({ messages: [], isBlockedByTarget: false });
    const msgs = db.getPublicMessages({
      userA: targetUser ? userHandle : null,
      userB: targetUser ? targetUser : null
    });
    const isBlockedByTarget = targetUser ? db.isBlocked(targetUser, userHandle) : false;
    callback({ messages: msgs, isBlockedByTarget });
  });

  // Send Message (Direct or Lounge)
  socket.on('message:send', ({ recipient = null, content, replyTo = null }, callback) => {
    if (!userHandle) {
      return callback && callback({ success: false, message: 'Not authenticated.' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return callback && callback({ success: false, message: 'Message content cannot be empty.' });
    }

    const trimmedContent = content.trim().substring(0, 2000);

    // If 1-on-1 direct message, check if recipient blocked sender
    if (recipient) {
      if (db.isBlocked(recipient, userHandle)) {
        return callback && callback({ success: false, message: 'Message could not be delivered.' });
      }
    }

    const savedMsg = db.addMessage({
      sender: userHandle,
      recipient: recipient ? recipient.trim() : null,
      content: trimmedContent,
      replyTo
    });

    if (recipient) {
      // 1-on-1 Direct Message
      const recipientLower = recipient.trim().toLowerCase();
      const senderLower = userHandle.toLowerCase();

      // Send to recipient if currently online
      io.to(`user_${recipientLower}`).emit('message:receive', savedMsg);
      // Echo back to sender
      io.to(`user_${senderLower}`).emit('message:receive', savedMsg);
    } else {
      // Public Lounge Message
      io.to('lounge').emit('message:receive', savedMsg);
    }

    // Broadcast to Admin Oversight Feed & Paired Threads in real-time
    io.to('admin_room').emit('admin:new-message', savedMsg);
    io.to('admin_room').emit('admin:paired-threads', db.getPairedConversations());

    if (callback) callback({ success: true, message: savedMsg });
  });

  // Single-Selection Toggle emoji reaction handler (one reaction per user per message)
  socket.on('message:react', ({ messageId, emoji, targetUser }) => {
    if (!userHandle || !messageId || !emoji) return;
    const userKey = userHandle.toLowerCase();

    if (!messageReactions.has(messageId)) {
      messageReactions.set(messageId, new Map());
    }
    const userMap = messageReactions.get(messageId);

    if (userMap.get(userKey) === emoji) {
      // Toggle off / remove reaction
      userMap.delete(userKey);
    } else {
      // Replace with new reaction
      userMap.set(userKey, emoji);
    }

    const updatedAggregates = getAggregateReactions(messageId);
    const userActiveEmoji = userMap.get(userKey) || null;

    const payload = {
      messageId,
      reactions: updatedAggregates,
      user: userHandle,
      activeEmoji: userActiveEmoji,
      targetUser
    };

    if (targetUser) {
      io.to(`user_${targetUser.toLowerCase()}`).emit('message:reactions-updated', payload);
      socket.emit('message:reactions-updated', payload);
    } else {
      io.to('lounge').emit('message:reactions-updated', payload);
    }
  });

  // --- Live Synchronized Mini-Games Handlers (Coin Toss, Dice Roll, Bounce Paddle Score Sync) ---
  socket.on('game:coin_toss', ({ targetUser }) => {
    if (!userHandle) return;
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    const payload = {
      game: 'coin_toss',
      result,
      initiatedBy: userHandle,
      targetUser: targetUser || null,
      timestamp: Date.now()
    };

    // Save and broadcast authoritative game message into chat stream
    const gameMsg = db.addMessage({
      sender: userHandle,
      recipient: targetUser ? targetUser.trim() : null,
      content: `[game:coin_toss:${result}:${userHandle}]`
    });

    // Show the live coin-flipping animation ONLY to the user who initiated it
    socket.emit('game:coin_toss_result', payload);

    // Other chat participants only receive the final chat message result
    if (targetUser) {
      const targetLower = targetUser.trim().toLowerCase();
      const senderLower = userHandle.toLowerCase();
      io.to(`user_${targetLower}`).emit('message:receive', gameMsg);
      io.to(`user_${senderLower}`).emit('message:receive', gameMsg);
    } else {
      io.to('lounge').emit('message:receive', gameMsg);
    }
  });

  socket.on('game:dice_roll', ({ targetUser }) => {
    if (!userHandle) return;
    const result = Math.floor(Math.random() * 6) + 1; // 1 to 6
    const payload = {
      game: 'dice_roll',
      result,
      initiatedBy: userHandle,
      targetUser: targetUser || null,
      timestamp: Date.now()
    };

    // Save and broadcast authoritative game message into chat stream
    const gameMsg = db.addMessage({
      sender: userHandle,
      recipient: targetUser ? targetUser.trim() : null,
      content: `[game:dice_roll:${result}:${userHandle}]`
    });

    // Show the live dice-rolling animation ONLY to the user who initiated it
    socket.emit('game:dice_roll_result', payload);

    // Other chat participants only receive the final chat message result
    if (targetUser) {
      const targetLower = targetUser.trim().toLowerCase();
      const senderLower = userHandle.toLowerCase();
      io.to(`user_${targetLower}`).emit('message:receive', gameMsg);
      io.to(`user_${senderLower}`).emit('message:receive', gameMsg);
    } else {
      io.to('lounge').emit('message:receive', gameMsg);
    }
  });

  socket.on('game:ball_score', ({ targetUser, score, milestone, isGameOver }) => {
    if (!userHandle || !targetUser) return;
    const payload = {
      player: userHandle,
      score: Number(score) || 0,
      milestone: Boolean(milestone),
      isGameOver: Boolean(isGameOver),
      timestamp: Date.now()
    };

    const targetLower = targetUser.trim().toLowerCase();
    const senderLower = userHandle.toLowerCase();
    io.to(`user_${targetLower}`).emit('game:ball_score_update', payload);
    io.to(`user_${senderLower}`).emit('game:ball_score_update', payload);

    // Save and broadcast score card message into chat stream for milestones or game over
    if (milestone || isGameOver) {
      const status = milestone ? '100_MILESTONE' : 'GAME_OVER';
      const gameMsg = db.addMessage({
        sender: userHandle,
        recipient: targetUser ? targetUser.trim() : null,
        content: `[game:ball_score:${score}:${status}:${userHandle}]`
      });
      io.to(`user_${targetLower}`).emit('message:receive', gameMsg);
      io.to(`user_${senderLower}`).emit('message:receive', gameMsg);
    }
  });

  // Interactive In-Chat Tic-Tac-Toe (XO) Handlers
  socket.on('game:xo_start', ({ targetUser }, callback) => {
    if (!userHandle) return;
    const gameId = 'xo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const gameData = {
      gameId,
      playerX: userHandle,
      playerO: targetUser ? targetUser.trim() : null,
      board: Array(9).fill(null),
      turn: userHandle, // Player X goes first
      winner: null,
      winningLine: null,
      status: 'ACTIVE',
      startedAt: Date.now()
    };

    activeXOGames.set(gameId, gameData);

    const gameMsg = db.addMessage({
      sender: userHandle,
      recipient: targetUser ? targetUser.trim() : null,
      content: `[game:xo:${JSON.stringify(gameData)}]`
    });

    gameData.messageId = gameMsg.id;
    const fullContent = `[game:xo:${JSON.stringify(gameData)}]`;
    db.updateMessageContent(gameMsg.id, fullContent);
    gameMsg.content = fullContent;

    if (targetUser) {
      const targetLower = targetUser.trim().toLowerCase();
      const senderLower = userHandle.toLowerCase();
      io.to(`user_${targetLower}`).emit('message:receive', gameMsg);
      io.to(`user_${senderLower}`).emit('message:receive', gameMsg);
    } else {
      io.to('lounge').emit('message:receive', gameMsg);
    }

    if (callback) callback({ success: true, gameId, messageId: gameMsg.id });
  });

  socket.on('game:xo_move', ({ gameId, messageId, cellIndex, targetUser }, callback) => {
    if (!userHandle || cellIndex < 0 || cellIndex > 8) {
      return callback && callback({ success: false, message: 'Invalid move' });
    }

    let gameData = activeXOGames.get(gameId);
    if (!gameData && messageId) {
      const msg = db.getMessage(messageId);
      if (msg && msg.content && msg.content.startsWith('[game:xo:')) {
        try {
          const raw = msg.content.slice(9, -1);
          gameData = JSON.parse(raw);
          activeXOGames.set(gameId, gameData);
        } catch (e) {}
      }
    }

    if (!gameData || gameData.status !== 'ACTIVE') {
      return callback && callback({ success: false, message: 'Game is not active' });
    }

    if (gameData.board[cellIndex] !== null) {
      return callback && callback({ success: false, message: 'Cell already occupied' });
    }

    const myHandle = userHandle.trim();
    const isPlayerX = myHandle.toLowerCase() === gameData.playerX.toLowerCase();

    // If Player O hasn't been locked yet (e.g. Lounge challenge) and someone else clicks:
    if (!gameData.playerO && !isPlayerX) {
      gameData.playerO = myHandle;
    }

    const isPlayerO = gameData.playerO && myHandle.toLowerCase() === gameData.playerO.toLowerCase();

    if (!isPlayerX && !isPlayerO) {
      return callback && callback({ success: false, message: 'Only game participants can play' });
    }

    // Strict turn validation
    const currentTurn = gameData.turn ? gameData.turn.toLowerCase() : '';
    if (currentTurn !== myHandle.toLowerCase() && currentTurn !== 'waiting_for_o') {
      return callback && callback({ success: false, message: 'Not your turn' });
    }

    const symbol = isPlayerX ? 'X' : 'O';
    gameData.board[cellIndex] = symbol;

    const outcome = checkXOWinner(gameData.board);
    if (outcome) {
      gameData.winner = outcome.winner;
      gameData.winningLine = outcome.winningLine;
      gameData.status = outcome.winner === 'DRAW' ? 'DRAW' : 'WON';
      gameData.turn = null;
    } else {
      if (isPlayerX) {
        gameData.turn = gameData.playerO || 'WAITING_FOR_O';
      } else {
        gameData.turn = gameData.playerX;
      }
    }

    const updatedContent = `[game:xo:${JSON.stringify(gameData)}]`;
    db.updateMessageContent(messageId, updatedContent);

    const updatePayload = {
      id: messageId,
      content: updatedContent,
      gameData
    };

    if (targetUser) {
      const targetLower = targetUser.trim().toLowerCase();
      const senderLower = userHandle.toLowerCase();
      io.to(`user_${targetLower}`).emit('message:update', updatePayload);
      io.to(`user_${senderLower}`).emit('message:update', updatePayload);
    } else {
      io.to('lounge').emit('message:update', updatePayload);
    }

    if (callback) callback({ success: true, gameData });
  });

  // --- Private Chat Theme Live Synchronization Handlers ---
  socket.on('private:theme_change', ({ targetUser, themeConfig }, callback) => {
    if (!userHandle || !targetUser) return;
    const roomKey = [userHandle.toLowerCase(), targetUser.toLowerCase()].sort().join(':');
    activePrivateThemes.set(roomKey, themeConfig);

    const targetLower = targetUser.trim().toLowerCase();
    const senderLower = userHandle.toLowerCase();

    // Broadcast live synced theme to both parties
    io.to(`user_${targetLower}`).emit('private:theme_sync', {
      targetUser: userHandle,
      themeConfig
    });
    io.to(`user_${senderLower}`).emit('private:theme_sync', {
      targetUser,
      themeConfig
    });

    if (callback) callback({ success: true, themeConfig });
  });

  socket.on('private:theme_reset', ({ targetUser }, callback) => {
    if (!userHandle || !targetUser) return;
    const roomKey = [userHandle.toLowerCase(), targetUser.toLowerCase()].sort().join(':');
    activePrivateThemes.delete(roomKey);

    const targetLower = targetUser.trim().toLowerCase();
    const senderLower = userHandle.toLowerCase();

    io.to(`user_${targetLower}`).emit('private:theme_sync', {
      targetUser: userHandle,
      themeConfig: null
    });
    io.to(`user_${senderLower}`).emit('private:theme_sync', {
      targetUser,
      themeConfig: null
    });

    if (callback) callback({ success: true });
  });

  socket.on('private:theme_get', ({ targetUser }, callback) => {
    if (!userHandle || !targetUser) return callback && callback(null);
    const roomKey = [userHandle.toLowerCase(), targetUser.toLowerCase()].sort().join(':');
    const theme = activePrivateThemes.get(roomKey) || null;
    if (callback) callback(theme);
  });

  // --- Ice Breaker (50+ / 130+ Questions) Prompt Game Handlers ---
  socket.on('game:question_start', ({ targetUser }, callback) => {
    if (!userHandle) return;
    const roomKey = targetUser
      ? [userHandle.toLowerCase(), targetUser.toLowerCase()].sort().join(':')
      : 'lounge';

    if (!chatAskedQuestions.has(roomKey)) {
      chatAskedQuestions.set(roomKey, new Set());
    }
    const askedSet = chatAskedQuestions.get(roomKey);
    const { question, isRecycled } = getRandomUnaskedQuestion(Array.from(askedSet));
    if (isRecycled) {
      askedSet.clear();
    }
    askedSet.add(question.id);

    const gameId = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const gameData = {
      gameId,
      questionId: question.id,
      questionText: question.text,
      category: question.category,
      playerA: userHandle,
      playerB: targetUser ? targetUser.trim() : null,
      answers: {},
      submittedUsers: [],
      skips: [],
      status: 'ACTIVE',
      startedAt: Date.now()
    };

    activeQuestionGames.set(gameId, gameData);

    const gameMsg = db.addMessage({
      sender: userHandle,
      recipient: targetUser ? targetUser.trim() : null,
      content: `[game:question:${JSON.stringify(gameData)}]`
    });

    gameData.messageId = gameMsg.id;
    const fullContent = `[game:question:${JSON.stringify(gameData)}]`;
    db.updateMessageContent(gameMsg.id, fullContent);
    gameMsg.content = fullContent;

    if (targetUser) {
      const targetLower = targetUser.trim().toLowerCase();
      const senderLower = userHandle.toLowerCase();
      io.to(`user_${targetLower}`).emit('message:receive', gameMsg);
      io.to(`user_${senderLower}`).emit('message:receive', gameMsg);
    } else {
      io.to('lounge').emit('message:receive', gameMsg);
    }

    if (callback) callback({ success: true, gameId, messageId: gameMsg.id });
  });

  socket.on('game:question_answer', ({ gameId, messageId, answer, targetUser }, callback) => {
    if (!userHandle || !answer || typeof answer !== 'string') {
      return callback && callback({ success: false, message: 'Invalid answer' });
    }

    let gameData = activeQuestionGames.get(gameId);
    if (!gameData && messageId) {
      const msg = db.getMessage(messageId);
      if (msg && msg.content && msg.content.startsWith('[game:question:')) {
        try {
          const raw = msg.content.slice(15, -1);
          gameData = JSON.parse(raw);
          activeQuestionGames.set(gameId, gameData);
        } catch (e) {}
      }
    }

    if (!gameData || gameData.status !== 'ACTIVE') {
      return callback && callback({ success: false, message: 'Question game is not active' });
    }

    const trimmedAnswer = answer.trim().slice(0, 500);
    if (!gameData.answers) gameData.answers = {};
    if (!gameData.submittedUsers) gameData.submittedUsers = [];

    gameData.answers[userHandle] = trimmedAnswer;
    if (!gameData.submittedUsers.includes(userHandle)) {
      gameData.submittedUsers.push(userHandle);
    }

    const playerA = gameData.playerA;
    if (!gameData.playerB && targetUser && targetUser.toLowerCase() !== playerA.toLowerCase()) {
      gameData.playerB = targetUser.trim();
    } else if (!gameData.playerB && userHandle.toLowerCase() !== playerA.toLowerCase()) {
      gameData.playerB = userHandle;
    }
    const playerB = gameData.playerB;

    const hasSubmitted = (player) => player && gameData.submittedUsers.some(u => u.toLowerCase() === player.toLowerCase());
    const bothSubmitted = playerB
      ? (hasSubmitted(playerA) && hasSubmitted(playerB))
      : (gameData.submittedUsers.length >= 2);

    if (bothSubmitted) {
      // Both submitted! Post reveal message with format: <userId>/answer=<their answer>
      const getPlayerAnswer = (player) => {
        if (!player) return '';
        const matchKey = Object.keys(gameData.answers || {}).find(k => k.toLowerCase() === player.toLowerCase());
        return matchKey ? gameData.answers[matchKey] : '';
      };
      const ansA = getPlayerAnswer(playerA);
      const ansB = getPlayerAnswer(playerB);
      const answersContent = `[icebreaker:answers:@${playerA}/answer=${ansA}|@${playerB}/answer=${ansB}:${gameData.questionText}]`;

      const ansMsg = db.addMessage({
        sender: userHandle,
        recipient: targetUser ? targetUser.trim() : null,
        content: answersContent
      });

      const targetLower = targetUser ? targetUser.trim().toLowerCase() : null;
      const senderLower = userHandle.toLowerCase();

      if (targetUser) {
        io.to(`user_${targetLower}`).emit('message:receive', ansMsg);
        io.to(`user_${senderLower}`).emit('message:receive', ansMsg);
      } else {
        io.to('lounge').emit('message:receive', ansMsg);
      }

      // Advance that SAME question card to a fresh unasked random question
      const roomKey = targetUser
        ? [userHandle.toLowerCase(), targetUser.toLowerCase()].sort().join(':')
        : 'lounge';

      let askedSet = chatAskedQuestions.get(roomKey) || new Set();
      const nextResult = getRandomUnaskedQuestion(Array.from(askedSet));
      if (nextResult.isRecycled) {
        askedSet = new Set();
      }
      askedSet.add(nextResult.question.id);
      chatAskedQuestions.set(roomKey, askedSet);

      gameData.questionId = nextResult.question.id;
      gameData.questionText = nextResult.question.text;
      gameData.category = nextResult.question.category;
      gameData.answers = {};
      gameData.submittedUsers = [];
      gameData.skips = [];
      gameData.status = 'ACTIVE';

      const updatedCardContent = `[game:question:${JSON.stringify(gameData)}]`;
      db.updateMessageContent(messageId, updatedCardContent);

      const updatePayload = {
        id: messageId,
        content: updatedCardContent,
        gameData
      };

      if (targetUser) {
        io.to(`user_${targetLower}`).emit('message:update', updatePayload);
        io.to(`user_${senderLower}`).emit('message:update', updatePayload);
      } else {
        io.to('lounge').emit('message:update', updatePayload);
      }

      if (callback) callback({ success: true, revealed: true });
    } else {
      // Only one player submitted: keep answer hidden from other player
      const updatedCardContent = `[game:question:${JSON.stringify(gameData)}]`;
      db.updateMessageContent(messageId, updatedCardContent);

      // Create a masked copy for public emit so answers remain 100% hidden until mutual reveal
      const maskedGameData = {
        ...gameData,
        answers: Object.keys(gameData.answers).reduce((acc, u) => {
          acc[u] = '***';
          return acc;
        }, {})
      };

      const updatePayload = {
        id: messageId,
        content: `[game:question:${JSON.stringify(maskedGameData)}]`,
        gameData: maskedGameData
      };

      const targetLower = targetUser ? targetUser.trim().toLowerCase() : null;
      const senderLower = userHandle.toLowerCase();

      if (targetUser) {
        io.to(`user_${targetLower}`).emit('message:update', updatePayload);
        io.to(`user_${senderLower}`).emit('message:update', updatePayload);
      } else {
        io.to('lounge').emit('message:update', updatePayload);
      }

      if (callback) callback({ success: true, waiting: true });
    }
  });

  socket.on('game:question_skip', ({ gameId, messageId, targetUser }, callback) => {
    if (!userHandle) return;

    let gameData = activeQuestionGames.get(gameId);
    if (!gameData && messageId) {
      const msg = db.getMessage(messageId);
      if (msg && msg.content && msg.content.startsWith('[game:question:')) {
        try {
          const raw = msg.content.slice(15, -1);
          gameData = JSON.parse(raw);
          activeQuestionGames.set(gameId, gameData);
        } catch (e) {}
      }
    }

    if (!gameData || gameData.status !== 'ACTIVE') {
      return callback && callback({ success: false, message: 'Question game is not active' });
    }

    if (!gameData.skips) gameData.skips = [];
    if (!gameData.skips.includes(userHandle)) {
      gameData.skips.push(userHandle);
    }

    const playerA = gameData.playerA;
    if (!gameData.playerB && targetUser && targetUser.toLowerCase() !== playerA.toLowerCase()) {
      gameData.playerB = targetUser.trim();
    } else if (!gameData.playerB && userHandle.toLowerCase() !== playerA.toLowerCase()) {
      gameData.playerB = userHandle;
    }
    const playerB = gameData.playerB;

    const hasSkipped = (player) => player && gameData.skips.some(u => u.toLowerCase() === player.toLowerCase());
    const bothSkipped = playerB
      ? (hasSkipped(playerA) && hasSkipped(playerB))
      : (gameData.skips.length >= 2);

    const targetLower = targetUser ? targetUser.trim().toLowerCase() : null;
    const senderLower = userHandle.toLowerCase();

    if (bothSkipped) {
      // Both skipped! Advance to next unasked question in the same card
      const roomKey = targetUser
        ? [userHandle.toLowerCase(), targetUser.toLowerCase()].sort().join(':')
        : 'lounge';

      let askedSet = chatAskedQuestions.get(roomKey) || new Set();
      const nextResult = getRandomUnaskedQuestion(Array.from(askedSet));
      if (nextResult.isRecycled) {
        askedSet = new Set();
      }
      askedSet.add(nextResult.question.id);
      chatAskedQuestions.set(roomKey, askedSet);

      gameData.questionId = nextResult.question.id;
      gameData.questionText = nextResult.question.text;
      gameData.category = nextResult.question.category;
      gameData.answers = {};
      gameData.submittedUsers = [];
      gameData.skips = [];
      gameData.status = 'ACTIVE';

      const updatedCardContent = `[game:question:${JSON.stringify(gameData)}]`;
      db.updateMessageContent(messageId, updatedCardContent);

      const updatePayload = {
        id: messageId,
        content: updatedCardContent,
        gameData
      };

      if (targetUser) {
        io.to(`user_${targetLower}`).emit('message:update', updatePayload);
        io.to(`user_${senderLower}`).emit('message:update', updatePayload);
      } else {
        io.to('lounge').emit('message:update', updatePayload);
      }

      if (callback) callback({ success: true, skipped: true });
    } else {
      // Only 1 player skipped: show waiting state
      const updatedCardContent = `[game:question:${JSON.stringify(gameData)}]`;
      db.updateMessageContent(messageId, updatedCardContent);

      const updatePayload = {
        id: messageId,
        content: updatedCardContent,
        gameData
      };

      if (targetUser) {
        io.to(`user_${targetLower}`).emit('message:update', updatePayload);
        io.to(`user_${senderLower}`).emit('message:update', updatePayload);
      } else {
        io.to('lounge').emit('message:update', updatePayload);
      }

      if (callback) callback({ success: true, voted: true });
    }
  });

  // Block management
  socket.on('block:toggle', ({ targetUser, isBlocked }, callback) => {
    if (!userHandle || !targetUser) return;
    if (isBlocked) {
      db.addBlock(userHandle, targetUser);
    } else {
      db.removeBlock(userHandle, targetUser);
    }
    // Notify target user if they are currently chatting or viewing
    io.to(`user_${targetUser.toLowerCase()}`).emit('user:block-status', {
      blockedBy: userHandle,
      isBlocked
    });
    if (callback) callback({ success: true });
  });

  // Private User Feedback Submission
  socket.on('feedback:submit', ({ type, message }, callback) => {
    if (!message || typeof message !== 'string' || !message.trim()) {
      return callback && callback({ success: false, message: 'Feedback message cannot be empty.' });
    }

    const fb = db.addFeedback({
      sender: userHandle || 'Anonymous',
      type: type || 'Suggestion',
      message: message.trim()
    });

    io.to('admin_room').emit('admin:feedback-new', fb);
    io.to('admin_room').emit('admin:feedback-list', db.getFeedbackForAdmin());

    if (callback) callback({ success: true });
  });

  // Profile Avatar Update
  socket.on('user:update-avatar', ({ avatarId }, callback) => {
    if (!userHandle) return callback && callback({ success: false, message: 'Not authenticated.' });
    if (!avatarId || typeof avatarId !== 'string') return callback && callback({ success: false, message: 'Invalid avatar.' });

    db.updateUserAvatar(userHandle, avatarId.slice(0, 50));
    io.emit('members:update', getPersistentMemberList());
    io.to('admin_room').emit('admin:active-members', getAdminMemberList());
    if (callback) callback({ success: true, avatar: avatarId });
  });

  // Typing indicator
  socket.on('typing:start', ({ targetUser }) => {
    if (!userHandle) return;
    if (targetUser) {
      io.to(`user_${targetUser.toLowerCase()}`).emit('typing:status', {
        user: userHandle,
        isTyping: true,
        targetUser
      });
    } else {
      socket.to('lounge').emit('typing:status', {
        user: userHandle,
        isTyping: true,
        targetUser: null
      });
    }
  });

  socket.on('typing:stop', ({ targetUser }) => {
    if (!userHandle) return;
    if (targetUser) {
      io.to(`user_${targetUser.toLowerCase()}`).emit('typing:status', {
        user: userHandle,
        isTyping: false,
        targetUser
      });
    } else {
      socket.to('lounge').emit('typing:status', {
        user: userHandle,
        isTyping: false,
        targetUser: null
      });
    }
  });

  // --- ADMIN ROOM ACTIONS ---
  socket.on('admin:authenticate', ({ passcode }, callback) => {
    if (!passcode || passcode !== ADMIN_PASSCODE) {
      return callback({ success: false, message: 'Unauthorized passcode.' });
    }

    socket.join('admin_room');

    callback({
      success: true,
      activeMembers: getAdminMemberList(),
      allUsers: db.getAllUsers(),
      pairedThreads: db.getPairedConversations(),
      bannedList: db.getBannedList(),
      kickedList: db.getKickedList(),
      logs: db.getAdminLogs(),
      feedback: db.getFeedbackForAdmin()
    });
  });

  // Fetch all messages for a specific paired thread
  socket.on('admin:get-thread-messages', ({ pairKey, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback({ success: false, message: 'Unauthorized.' });
    }
    const threadMsgs = db.getMessagesForPair(pairKey);
    callback({ success: true, messages: threadMsgs });
  });

  socket.on('admin:delete-message', ({ messageId, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback && callback({ success: false, message: 'Unauthorized.' });
    }

    const deleted = db.deleteMessage(messageId);
    if (deleted) {
      io.emit('message:deleted', { messageId });
      io.to('admin_room').emit('admin:message-deleted', { messageId });
      io.to('admin_room').emit('admin:paired-threads', db.getPairedConversations());
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, message: 'Message not found.' });
    }
  });

  // Security Feature: Admin Full-Chat Deletion Power (Clear Entire Conversation Thread)
  socket.on('admin:delete-conversation', ({ pairKey, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback && callback({ success: false, message: 'Unauthorized.' });
    }

    if (!pairKey) {
      return callback && callback({ success: false, message: 'pairKey is required.' });
    }

    const result = db.deleteConversation(pairKey, 'ADMIN');

    if (pairKey === '#lounge') {
      io.to('lounge').emit('chat:thread-cleared', { pairKey, channel: 'lounge' });
    } else {
      const parts = pairKey.split(' ↔ ');
      if (parts.length === 2) {
        const uA = parts[0].toLowerCase();
        const uB = parts[1].toLowerCase();
        io.to(`user_${uA}`).emit('chat:thread-cleared', { pairKey, otherUser: parts[1] });
        io.to(`user_${uB}`).emit('chat:thread-cleared', { pairKey, otherUser: parts[0] });
      }
    }

    io.to('admin_room').emit('admin:paired-threads', db.getPairedConversations());
    io.to('admin_room').emit('admin:thread-cleared', { pairKey });

    if (callback) callback({ success: true, deletedCount: result.deletedCount });
  });

  socket.on('admin:kick-user', ({ handle, reason = 'Kicked by administrator', timeoutSeconds = 300, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback && callback({ success: false, message: 'Unauthorized.' });
    }

    const lower = handle.toLowerCase();
    const active = activeUsers.get(lower);
    const clientIp = active?.metadata?.ip || null;

    if (active) {
      io.to(active.socketId).emit('user:kicked', { reason });
      const targetSocket = io.sockets.sockets.get(active.socketId);
      if (targetSocket) {
        targetSocket.disconnect(true);
      }
      activeUsers.delete(lower);
      db.updateUserStatus(handle, { isOnline: false, lastSeen: Date.now() });
      io.emit('members:update', getPersistentMemberList());
      io.to('admin_room').emit('admin:active-members', getAdminMemberList());
    }

    db.kickUser(handle, reason, timeoutSeconds, clientIp);
    io.to('admin_room').emit('admin:kicked-list', db.getKickedList());
    io.to('admin_room').emit('admin:logs-update', db.getAdminLogs());
    if (callback) callback({ success: true, kickedList: db.getKickedList() });
  });

  socket.on('admin:unkick-user', ({ handle, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback && callback({ success: false, message: 'Unauthorized.' });
    }
    db.unkickUser(handle);
    io.to('admin_room').emit('admin:kicked-list', db.getKickedList());
    io.to('admin_room').emit('admin:logs-update', db.getAdminLogs());
    if (callback) callback({ success: true, kickedList: db.getKickedList() });
  });

  socket.on('admin:ban-user', ({ handle, reason = 'Violating Community Standards', passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback && callback({ success: false, message: 'Unauthorized.' });
    }

    const lower = handle.toLowerCase();
    const active = activeUsers.get(lower);
    const clientIp = active?.metadata?.ip || null;

    db.banUser(handle, reason, clientIp);

    if (active) {
      io.to(active.socketId).emit('user:banned', { reason });
      const targetSocket = io.sockets.sockets.get(active.socketId);
      if (targetSocket) {
        targetSocket.disconnect(true);
      }
      activeUsers.delete(lower);
    }

    db.updateUserStatus(handle, { isOnline: false, lastSeen: Date.now() });
    io.emit('members:update', getPersistentMemberList());
    io.to('admin_room').emit('admin:active-members', getAdminMemberList());
    io.to('admin_room').emit('admin:banned-list', db.getBannedList());
    io.to('admin_room').emit('admin:logs-update', db.getAdminLogs());

    if (callback) callback({ success: true, bannedList: db.getBannedList() });
  });

  socket.on('admin:unban-user', ({ handle, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback && callback({ success: false, message: 'Unauthorized.' });
    }
    db.unbanUser(handle);
    io.to('admin_room').emit('admin:banned-list', db.getBannedList());
    io.to('admin_room').emit('admin:logs-update', db.getAdminLogs());
    if (callback) callback({ success: true, bannedList: db.getBannedList() });
  });

  // Admin Full User Kick & Delete Control (Removes user permanently from everywhere)
  socket.on('admin:delete-user', ({ handle, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) {
      return callback && callback({ success: false, message: 'Unauthorized.' });
    }
    if (!handle) {
      return callback && callback({ success: false, message: 'Handle is required.' });
    }

    const lower = handle.toLowerCase();
    const active = activeUsers.get(lower);

    if (active) {
      io.to(active.socketId).emit('user:kicked', { reason: 'Your account was deleted by an administrator.' });
      const targetSocket = io.sockets.sockets.get(active.socketId);
      if (targetSocket) {
        targetSocket.disconnect(true);
      }
      activeUsers.delete(lower);
    }

    const deleted = db.deleteUser(handle, 'ADMIN');
    if (deleted) {
      io.emit('members:update', getPersistentMemberList());
      io.to('admin_room').emit('admin:active-members', getAdminMemberList());
      io.to('admin_room').emit('admin:paired-threads', db.getPairedConversations());
      io.to('admin_room').emit('admin:logs-update', db.getAdminLogs());
      if (callback) callback({ success: true });
    } else {
      if (callback) callback({ success: false, message: 'User not found.' });
    }
  });

  // Handle Disconnect with 45-Second Mobile App-Switch Grace Period
  socket.on('disconnect', () => {
    if (userHandle) {
      const lower = userHandle.toLowerCase();
      const currentHandle = userHandle;

      // Start 45-second grace period timer before declaring user offline
      if (disconnectGraceTimers.has(lower)) {
        clearTimeout(disconnectGraceTimers.get(lower));
      }

      const graceTimer = setTimeout(() => {
        disconnectGraceTimers.delete(lower);
        // If user hasn't reconnected within 45s, mark them offline
        activeUsers.delete(lower);
        db.updateUserStatus(currentHandle, { isOnline: false, lastSeen: Date.now() });

        // Broadcast persistent directory with user now marked Offline
        io.emit('members:update', getPersistentMemberList());
        io.to('admin_room').emit('admin:event', {
          type: 'USER_OFFLINE',
          handle: currentHandle,
          timestamp: Date.now()
        });
        io.to('admin_room').emit('admin:active-members', getAdminMemberList());
      }, 45 * 1000); // 45-second grace window

      disconnectGraceTimers.set(lower, graceTimer);
    }
  });
});

// Strict 24-hour cleanup: automatically purge expired messages every 60 seconds (zero persistence)
function runStrictAutoVanish() {
  const expiredIds = db.purgeExpiredMessages();
  if (expiredIds && expiredIds.length > 0) {
    io.emit('messages:vanished', { messageIds: expiredIds });
    io.to('admin_room').emit('admin:paired-threads', db.getPairedConversations());
  }
}
runStrictAutoVanish();
setInterval(runStrictAutoVanish, 60 * 1000);

// SPA Fallback for /admin and client routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  if (fs.existsSync(CLIENT_DIST)) {
    return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  }
  res.status(404).send('Frontend not built. Run npm run build in client directory.');
});

server.listen(PORT, () => {
  console.log(`[Chaattiko Server] Real-time chat server listening on http://localhost:${PORT}`);
});
