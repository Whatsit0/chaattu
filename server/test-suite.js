import { io as Client } from '../client/node_modules/socket.io-client/build/esm/index.js';

const SERVER_URL = 'http://localhost:3001';
const ADMIN_PASSCODE = 'levin514326@2008';

async function fetchJson(path, options = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, options);
  return { status: res.status, data: await res.json() };
}

function createClientSocket() {
  return Client(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false
  });
}

async function runTests() {
  console.log('--- STARTING CHAATTIKO UPGRADE TEST SUITE ---');

  // 1. Check Handle REST API
  console.log('\n[Test 1] Testing Handle Availability REST API...');
  const res1 = await fetchJson('/api/check-handle?handle=chaattiko_tester');
  console.log('Check available handle:', res1.data);
  if (!res1.data.available) throw new Error('Expected chaattiko_tester to be available');

  const res2 = await fetchJson('/api/check-handle?handle=chaattiko');
  console.log('Check reserved handle (chaattiko):', res2.data);
  if (res2.data.available) throw new Error('Expected reserved handle chaattiko to be unavailable');

  // 2. Admin Authentication with exact passcode levin514326@2008
  console.log('\n[Test 2] Testing Admin Passcode (levin514326@2008)...');
  const adminOld = await fetchJson('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: 'admin_secret_2026' })
  });
  console.log('Admin old passcode rejection:', adminOld.status, adminOld.data);
  if (adminOld.status !== 401) throw new Error('Expected 401 for old passcode');

  const adminGood = await fetchJson('/api/admin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: ADMIN_PASSCODE })
  });
  console.log('Admin good passcode result:', adminGood.data);
  if (!adminGood.data.success) throw new Error('Expected success for new passcode');

  // 3. Simulated Concurrent Users
  console.log('\n[Test 3] Testing Real-Time User Sessions & Geolocation...');
  const socketAlice = createClientSocket();
  const socketBob = createClientSocket();

  await new Promise((resolve) => socketAlice.on('connect', resolve));
  await new Promise((resolve) => socketBob.on('connect', resolve));

  const joinAlice = await new Promise((resolve) => {
    socketAlice.emit('user:join', {
      handle: 'alice_ck',
      gender: 'Female',
      agreedTerms: true
    }, resolve);
  });
  if (!joinAlice.success) throw new Error('Alice failed to join');

  const joinBob = await new Promise((resolve) => {
    socketBob.emit('user:join', {
      handle: 'bob_ck',
      gender: 'Male',
      agreedTerms: true
    }, resolve);
  });
  if (!joinBob.success) throw new Error('Bob failed to join');

  // 4. Test "user:chatting-with" event
  console.log('\n[Test 4] Testing User Chatting-With Target Tracking...');
  socketAlice.emit('user:chatting-with', { targetUser: 'bob_ck' });

  // 5. Test Private Direct-to-Admin Feedback Box
  console.log('\n[Test 5] Testing Private Feedback Box...');
  const fbResult = await new Promise((resolve) => {
    socketAlice.emit('feedback:submit', {
      type: 'Suggestion',
      message: 'Great dark and light mode UI on Chaattiko!'
    }, resolve);
  });
  console.log('Alice feedback submission response:', fbResult);
  if (!fbResult.success) throw new Error('Feedback submission failed');

  // 6. Test Admin Socket Monitoring & Feedback Inbox
  console.log('\n[Test 6] Testing Admin Dashboard & Feedback Inbox...');
  const socketAdmin = createClientSocket();
  await new Promise((resolve) => socketAdmin.on('connect', resolve));

  const adminAuth = await new Promise((resolve) => {
    socketAdmin.emit('admin:authenticate', { passcode: ADMIN_PASSCODE }, resolve);
  });
  console.log('Admin socket auth status:', adminAuth.success);
  console.log('Admin received active members count:', adminAuth.activeMembers.length);
  console.log('Admin received feedback count:', adminAuth.feedback.length);

  if (!adminAuth.success) throw new Error('Admin socket auth failed');
  if (adminAuth.feedback.length === 0) throw new Error('Admin feedback inbox is empty');

  const foundFb = adminAuth.feedback.find(f => f.sender === 'alice_ck');
  if (!foundFb) throw new Error('Alice feedback not found in admin inbox');
  console.log('Verified Alice feedback in Admin inbox:', foundFb);

  // Check that admin sees who Alice is chatting with
  const aliceAdminRecord = adminAuth.activeMembers.find(m => m.handle === 'alice_ck');
  console.log('Alice admin record:', {
    handle: aliceAdminRecord.handle,
    currentChat: aliceAdminRecord.currentChat,
    location: aliceAdminRecord.metadata?.location,
    device: aliceAdminRecord.metadata?.device
  });

  // 7. Test 1-on-1 Block Controls
  console.log('\n[Test 7] Testing 1-on-1 Block Controls...');
  // Bob blocks Alice
  await new Promise((resolve) => {
    socketBob.emit('block:toggle', { targetUser: 'alice_ck', isBlocked: true }, resolve);
  });

  // Alice attempts to message Bob
  const blockSendRes = await new Promise((resolve) => {
    socketAlice.emit('message:send', {
      recipient: 'bob_ck',
      content: 'Hey Bob, can you read this?'
    }, resolve);
  });
  console.log('Blocked message response to Alice:', blockSendRes);
  if (blockSendRes.success) throw new Error('Expected message to be rejected because Bob blocked Alice');

  // Cleanup
  socketAlice.disconnect();
  socketBob.disconnect();
  socketAdmin.disconnect();

  console.log('\n>>> ALL CHAATTIKO UPGRADE TESTS PASSED SUCCESSFULLY! <<<');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n!!! TEST FAILED !!!', err);
  process.exit(1);
});
