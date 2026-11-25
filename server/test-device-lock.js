import { io as Client } from '../client/node_modules/socket.io-client/build/esm/index.js';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from './db.js';

const PORT = 3012; // Dedicated test port
const ADMIN_PASSCODE = 'levin514326@2008';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const activeUsers = new Map();

function getPersistentMembers() {
  return db.getPersistentMemberList(new Set(activeUsers.keys()));
}

io.on('connection', (socket) => {
  let userHandle = null;

  socket.on('user:auto-login', ({ deviceToken }, callback) => {
    const user = db.getUserByDeviceToken(deviceToken);
    if (!user) return callback({ success: false, notRegistered: true });
    userHandle = user.handle;
    activeUsers.set(user.handle.toLowerCase(), { handle: user.handle });
    socket.join(`user_${user.handle.toLowerCase()}`);
    io.emit('members:update', getPersistentMembers());
    callback({ success: true, user });
  });

  socket.on('user:join', ({ handle, gender, agreedTerms, deviceToken }, callback) => {
    if (!deviceToken) return callback({ success: false, message: 'Device token required' });
    const check = db.canDeviceRegisterHandle(deviceToken, handle);
    if (!check.allowed) return callback({ success: false, message: check.reason });

    userHandle = handle.trim();
    db.upsertUser({ handle: userHandle, gender, deviceToken });
    activeUsers.set(userHandle.toLowerCase(), { handle: userHandle });
    socket.join(`user_${userHandle.toLowerCase()}`);
    io.emit('members:update', getPersistentMembers());
    callback({ success: true, user: { handle: userHandle } });
  });

  socket.on('message:send', ({ recipient, content }, callback) => {
    const msg = db.addMessage({ sender: userHandle, recipient, content });
    if (recipient) {
      io.to(`user_${recipient.toLowerCase()}`).emit('message:receive', msg);
    }
    callback({ success: true, message: msg });
  });

  socket.on('messages:history', ({ targetUser }, callback) => {
    const history = db.getPublicMessages({ userA: userHandle, userB: targetUser });
    callback(history);
  });

  socket.on('admin:authenticate', ({ passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) return callback({ success: false });
    callback({
      success: true,
      pairedThreads: db.getPairedConversations()
    });
  });

  socket.on('admin:get-thread-messages', ({ pairKey, passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) return callback({ success: false });
    callback({ success: true, messages: db.getMessagesForPair(pairKey) });
  });

  socket.on('disconnect', () => {
    if (userHandle) {
      activeUsers.delete(userHandle.toLowerCase());
      db.updateUserStatus(userHandle, { isOnline: false, lastSeen: Date.now() });
      io.emit('members:update', getPersistentMembers());
    }
  });
});

server.listen(PORT, async () => {
  console.log(`Test verification server running on port ${PORT}...`);
  try {
    const sDeviceA = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });
    const sDeviceB = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });
    const sAdmin = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });

    await new Promise(r => sDeviceA.on('connect', r));
    await new Promise(r => sDeviceB.on('connect', r));
    await new Promise(r => sAdmin.on('connect', r));

    const tokenA = 'dev_token_batman_unique_1';
    const tokenB = 'dev_token_spiderman_unique_2';

    // 1. Device A registers Batman
    console.log('\n[Test 1] Device A registers @Batman...');
    const regBatman = await new Promise(r => sDeviceA.emit('user:join', {
      handle: 'Batman',
      gender: 'Male',
      agreedTerms: true,
      deviceToken: tokenA
    }, r));
    if (!regBatman.success) throw new Error('Device A failed to register Batman');
    console.log('Registered Batman successfully:', regBatman);

    // 2. Device A tries to register Robin (should be rejected because Device A is locked to Batman)
    console.log('\n[Test 2] Device A attempts to register a 2nd handle (@Robin)...');
    const regRobin = await new Promise(r => sDeviceA.emit('user:join', {
      handle: 'Robin',
      gender: 'Male',
      agreedTerms: true,
      deviceToken: tokenA
    }, r));
    if (regRobin.success) throw new Error('Expected Device A to be blocked from registering Robin');
    console.log('Second handle correctly rejected for Device A:', regRobin.message);

    // 3. Device B tries to claim Batman (should be rejected because Batman is bound to Device A)
    console.log('\n[Test 3] Device B attempts to claim @Batman...');
    const claimBatman = await new Promise(r => sDeviceB.emit('user:join', {
      handle: 'Batman',
      gender: 'Male',
      agreedTerms: true,
      deviceToken: tokenB
    }, r));
    if (claimBatman.success) throw new Error('Expected Device B to be blocked from claiming Batman');
    console.log('Claiming Batman correctly rejected for Device B:', claimBatman.message);

    // 4. Device B registers SpiderMan
    console.log('\n[Test 4] Device B registers @SpiderMan...');
    const regSpidey = await new Promise(r => sDeviceB.emit('user:join', {
      handle: 'SpiderMan',
      gender: 'Male',
      agreedTerms: true,
      deviceToken: tokenB
    }, r));
    if (!regSpidey.success) throw new Error('Device B failed to register SpiderMan');
    console.log('Registered SpiderMan successfully:', regSpidey);

    // 5. Test Auto-Login: Disconnect Device A, reconnect and auto-login with tokenA
    console.log('\n[Test 5] Testing Automatic Login via deviceToken...');
    sDeviceA.disconnect();
    await new Promise(r => setTimeout(r, 400));

    const sDeviceA2 = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });
    await new Promise(r => sDeviceA2.on('connect', r));

    const autoRes = await new Promise(r => sDeviceA2.emit('user:auto-login', { deviceToken: tokenA }, r));
    if (!autoRes.success || autoRes.user.handle !== 'Batman') {
      throw new Error('Auto login failed for Batman');
    }
    console.log('Device A successfully auto-logged in as:', autoRes.user.handle);

    // 6. Test Offline 24h Chat Persistence: Disconnect Batman, SpiderMan sends message to offline Batman
    console.log('\n[Test 6] Testing 24h Message Storage to Offline User...');
    sDeviceA2.disconnect(); // Batman goes offline
    await new Promise(r => setTimeout(r, 400));

    // SpiderMan sends message to offline Batman
    const offlineMsg = await new Promise(r => sDeviceB.emit('message:send', {
      recipient: 'Batman',
      content: 'Hey Batman, are you in the Batcave? (Sent while offline)'
    }, r));
    console.log('SpiderMan sent message to offline Batman:', offlineMsg.message.id);

    // Batman re-opens app later and fetches history for SpiderMan
    const sDeviceA3 = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });
    await new Promise(r => sDeviceA3.on('connect', r));
    await new Promise(r => sDeviceA3.emit('user:auto-login', { deviceToken: tokenA }, r));

    const batmanHistory = await new Promise(r => sDeviceA3.emit('messages:history', { targetUser: 'SpiderMan' }, r));
    console.log('Batman reconnected and loaded history count:', batmanHistory.length);
    const foundMsg = batmanHistory.find(m => m.content.includes('Batcave'));
    if (!foundMsg) throw new Error('Offline message not found in Batman history');
    console.log('Verified offline message persisted and retrieved intact:', foundMsg.content);

    // 7. Test Admin Paired Conversation View
    console.log('\n[Test 7] Testing Admin Paired Conversation Thread View...');
    const adminAuth = await new Promise(r => sAdmin.emit('admin:authenticate', { passcode: ADMIN_PASSCODE }, r));
    if (!adminAuth.success) throw new Error('Admin auth failed');

    console.log('Admin paired threads count:', adminAuth.pairedThreads.length);
    const thread = adminAuth.pairedThreads.find(t => t.pairKey.includes('Batman') && t.pairKey.includes('SpiderMan'));
    if (!thread) throw new Error('Batman ↔ SpiderMan paired thread not found in admin console');
    console.log('Found paired thread for admin:', thread.pairKey, 'Last message:', thread.lastMessage);

    // Admin queries exact mirror messages for thread
    const mirrorMessages = await new Promise(r => sAdmin.emit('admin:get-thread-messages', {
      pairKey: thread.pairKey,
      passcode: ADMIN_PASSCODE
    }, r));
    if (!mirrorMessages.success || mirrorMessages.messages.length === 0) {
      throw new Error('Admin failed to load mirror messages');
    }
    console.log('Admin verified mirror messages count in thread:', mirrorMessages.messages.length);

    sDeviceA3.disconnect();
    sDeviceB.disconnect();
    sAdmin.disconnect();

    console.log('\n>>> ALL TARGETED UPGRADE VERIFICATIONS PASSED CLEANLY! <<<');
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('Test execution error:', err);
    server.close(() => process.exit(1));
  }
});
