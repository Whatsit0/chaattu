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
      realName: dbUser.realName || null,
      gender: dbUser.gender,
      isOnline: activeHandles.has(lower),
      socketId: activeSession ? activeSession.socketId : null,
      connectedAt: activeSession ? activeSession.connectedAt : (dbUser.joinedAt || dbUser.lastSeen),
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

  // 1. Automatic Login via Device Token
  socket.on('user:auto-login', ({ deviceToken, clientDeviceInfo }, callback) => {
    if (!deviceToken) {
      return callback({ success: false, notRegistered: true });
    }

    const boundUser = db.getUserByDeviceToken(deviceToken);
    if (!boundUser) {
      return callback({ success: false, notRegistered: true });
    }

    const lower = boundUser.handle.toLowerCase();

    if (db.isHandleBanned(lower)) {
      return callback({ success: false, message: 'This device account has been suspended.' });
    }

    if (db.isHandleKicked(lower)) {
      const kick = db.getKickedInfo(lower);
      const remainingSecs = Math.max(1, Math.round((kick.timeoutUntil - Date.now()) / 1000));
      return callback({ success: false, message: `Account temporarily on cooldown (${remainingSecs}s remaining).` });
    }

    userHandle = boundUser.handle;
    socket.data.handle = userHandle;

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

    const sessionInfo = {
      handle: userHandle,
      gender: boundUser.gender || 'Prefer not to say',
      socketId: socket.id,
      connectedAt: Date.now(),
      currentChat: '#lounge',
      metadata: enrichedMetadata,
      deviceToken
    };

    activeUsers.set(lower, sessionInfo);

    db.updateUserStatus(userHandle, {
      isOnline: true,
      currentChat: '#lounge',
      lastSeen: Date.now(),
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
      user: {
        handle: userHandle,
        gender: boundUser.gender,
        connectedAt: sessionInfo.connectedAt
      }
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

  // User Onboarding Join (Permanent Device Lock + Private Real Name + Device Detection Payload)
  socket.on('user:join', ({ handle, realName, gender, agreedTerms, deviceToken, clientDeviceInfo }, callback) => {
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

    const lower = trimmed.toLowerCase();

    if (db.isHandleBanned(lower)) {
      return callback({ success: false, message: 'This handle is suspended from the platform.' });
    }

    if (db.isHandleKicked(lower)) {
      const kick = db.getKickedInfo(lower);
      const remainingSecs = Math.max(1, Math.round((kick.timeoutUntil - Date.now()) / 1000));
      return callback({ success: false, message: `Account temporarily on cooldown (${remainingSecs}s remaining).` });
    }

    if (lower === 'admin' || lower === 'system' || lower === 'chaattiko') {
      return callback({ success: false, message: 'Username is reserved.' });
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

    // Persist permanently bound account in DB with Real Name (Admin-only visibility) and device info
    db.upsertUser({
      handle: userHandle,
      realName: cleanRealName,
      gender: cleanGender,
      deviceToken,
      currentChat: '#lounge',
      ...enrichedMetadata,
      joinedAt: sessionInfo.connectedAt
    });

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

    callback({
      success: true,
      user: {
        handle: userHandle,
        gender: cleanGender,
        connectedAt: sessionInfo.connectedAt
      }
    });
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

// Periodic 24-hour cleanup: automatically purge expired messages every 15 minutes
setInterval(() => {
  db.purgeExpiredMessages();
}, 15 * 60 * 1000);

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
