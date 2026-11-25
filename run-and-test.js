import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from './db.js';
import { parseClientMetadata } from './metadata.js';
import { io as Client } from '../client/node_modules/socket.io-client/build/esm/index.js';

const PORT = 3009; // separate test port
const ADMIN_PASSCODE = 'levin514326@2008';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const activeUsers = new Map();

app.get('/api/check-handle', (req, res) => {
  const rawHandle = req.query.handle;
  if (!rawHandle) return res.status(400).json({ available: false });
  const handle = rawHandle.trim();
  const lower = handle.toLowerCase();
  if (lower === 'chaattiko' || lower === 'admin') return res.json({ available: false });
  if (activeUsers.has(lower)) return res.json({ available: false });
  return res.json({ available: true });
});

app.post('/api/admin/verify', (req, res) => {
  const { passcode } = req.body;
  if (passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ success: false, message: 'Invalid passcode.' });
  }
  return res.json({ success: true });
});

io.on('connection', async (socket) => {
  const metadata = await parseClientMetadata(socket);
  let userHandle = null;

  socket.on('user:join', ({ handle, gender, agreedTerms }, callback) => {
    userHandle = handle.trim();
    const lower = userHandle.toLowerCase();
    activeUsers.set(lower, {
      handle: userHandle,
      gender,
      currentChat: '#lounge',
      metadata
    });
    callback({ success: true, user: { handle: userHandle, gender } });
  });

  socket.on('user:chatting-with', ({ targetUser }) => {
    if (!userHandle) return;
    const lower = userHandle.toLowerCase();
    if (activeUsers.has(lower)) {
      activeUsers.get(lower).currentChat = targetUser ? `@${targetUser}` : '#lounge';
    }
  });

  socket.on('block:toggle', ({ targetUser, isBlocked }, callback) => {
    if (isBlocked) db.addBlock(userHandle, targetUser);
    else db.removeBlock(userHandle, targetUser);
    callback({ success: true });
  });

  socket.on('message:send', ({ recipient, content }, callback) => {
    if (recipient && db.isBlocked(recipient, userHandle)) {
      return callback({ success: false, message: 'Message blocked.' });
    }
    const msg = db.addMessage({ sender: userHandle, recipient, content });
    callback({ success: true, message: msg });
  });

  socket.on('feedback:submit', ({ type, message }, callback) => {
    const fb = db.addFeedback({ sender: userHandle, type, message });
    callback({ success: true, feedback: fb });
  });

  socket.on('admin:authenticate', ({ passcode }, callback) => {
    if (passcode !== ADMIN_PASSCODE) return callback({ success: false });
    callback({
      success: true,
      activeMembers: Array.from(activeUsers.values()),
      feedback: db.getFeedbackForAdmin()
    });
  });
});

server.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}...`);
  try {
    // 1. Check Handle API
    const res1 = await fetch(`http://localhost:${PORT}/api/check-handle?handle=tester`);
    const data1 = await res1.json();
    if (!data1.available) throw new Error('Check handle tester should be available');

    const res2 = await fetch(`http://localhost:${PORT}/api/check-handle?handle=chaattiko`);
    const data2 = await res2.json();
    if (data2.available) throw new Error('Handle chaattiko should be reserved');

    // 2. Admin Passcode Check
    const resAdminBad = await fetch(`http://localhost:${PORT}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: 'wrong_pw' })
    });
    if (resAdminBad.status !== 401) throw new Error('Wrong passcode should return 401');

    const resAdminGood = await fetch(`http://localhost:${PORT}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: ADMIN_PASSCODE })
    });
    if (resAdminGood.status !== 200) throw new Error('Correct passcode levin514326@2008 should return 200');

    // 3. Socket Testing
    const sAlice = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });
    const sBob = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });
    const sAdmin = Client(`http://localhost:${PORT}`, { transports: ['websocket'] });

    await new Promise(r => sAlice.on('connect', r));
    await new Promise(r => sBob.on('connect', r));
    await new Promise(r => sAdmin.on('connect', r));

    // Join Alice & Bob
    const joinA = await new Promise(r => sAlice.emit('user:join', { handle: 'alice_ck', gender: 'Female', agreedTerms: true }, r));
    if (!joinA.success) throw new Error('Alice join failed');

    const joinB = await new Promise(r => sBob.emit('user:join', { handle: 'bob_ck', gender: 'Male', agreedTerms: true }, r));
    if (!joinB.success) throw new Error('Bob join failed');

    // Alice chatting with Bob
    sAlice.emit('user:chatting-with', { targetUser: 'bob_ck' });

    // Alice submits feedback
    const fbRes = await new Promise(r => sAlice.emit('feedback:submit', { type: 'Suggestion', message: 'Chaattiko is great!' }, r));
    if (!fbRes.success) throw new Error('Alice feedback submission failed');

    // Admin Authenticate & Verify Data
    const adminData = await new Promise(r => sAdmin.emit('admin:authenticate', { passcode: ADMIN_PASSCODE }, r));
    if (!adminData.success) throw new Error('Admin auth failed');
    if (adminData.feedback.length === 0) throw new Error('Feedback not received by admin');
    console.log('Admin feedback count:', adminData.feedback.length);

    const aliceRecord = adminData.activeMembers.find(m => m.handle === 'alice_ck');
    if (!aliceRecord || aliceRecord.currentChat !== '@bob_ck') {
      throw new Error('Alice currentChat tracking failed');
    }
    console.log('Alice currentChat correctly verified as:', aliceRecord.currentChat);

    // Bob blocks Alice
    await new Promise(r => sBob.emit('block:toggle', { targetUser: 'alice_ck', isBlocked: true }, r));

    // Alice sends message to Bob -> should be rejected
    const sendRes = await new Promise(r => sAlice.emit('message:send', { recipient: 'bob_ck', content: 'Blocked hello' }, r));
    if (sendRes.success) throw new Error('Expected message to be blocked');
    console.log('Blocked message correctly rejected:', sendRes.message);

    sAlice.disconnect();
    sBob.disconnect();
    sAdmin.disconnect();

    console.log('\n>>> ALL CHAATTIKO UPGRADE TESTS PASSED CLEANLY! <<<');
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('Test execution error:', err);
    server.close(() => process.exit(1));
  }
});
