import { io as Client } from "socket.io-client";

const BASE_URL = "http://localhost:5000";
const API_URL = `${BASE_URL}/api`;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  }
}

async function apiRequest(endpoint, method = "GET", body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Cookie"] = `jwt=${token}`;
  }
  const opts = { method, headers };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_URL}${endpoint}`, opts);
  const data = await res.json().catch(() => null);

  // Extract set-cookie token if any
  const setCookie = res.headers.get("set-cookie");
  let cookieToken = null;
  if (setCookie) {
    const match = setCookie.match(/jwt=([^;]+)/);
    if (match) cookieToken = match[1];
  }

  return { status: res.status, ok: res.ok, data, token: cookieToken };
}

async function runMessagingTests() {
  console.log("\n==================================================");
  console.log("    CONNECTIFY REAL-TIME SOCKET.IO TEST SUITE     ");
  console.log("==================================================\n");

  const rand = Math.floor(Math.random() * 100000);
  const userAData = {
    fullname: "Alice Test",
    username: `alice_${rand}`,
    email: `alice_${rand}@example.com`,
    password: "password123",
  };
  const userBData = {
    fullname: "Bob Test",
    username: `bob_${rand}`,
    email: `bob_${rand}@example.com`,
    password: "password123",
  };

  // 1. Create Users & Authenticate
  console.log("--- 1. User Setup & Authentication ---");
  const signupA = await apiRequest("/auth/signup", "POST", userAData);
  assert(signupA.status === 201 && signupA.data.data?._id, "User A (Alice) registered");
  const alice = signupA.data.data;
  const aliceToken = signupA.token;

  const signupB = await apiRequest("/auth/signup", "POST", userBData);
  assert(signupB.status === 201 && signupB.data.data?._id, "User B (Bob) registered");
  const bob = signupB.data.data;
  const bobToken = signupB.token;

  // 2. Test Socket Authentication
  console.log("\n--- 2. Socket.IO Authentication & Presence ---");

  // Unauthorized socket connection attempt (no token)
  const unauthSocket = Client(BASE_URL, {
    transports: ["websocket"],
    autoConnect: true,
  });

  const unauthErrorPromise = new Promise((resolve) => {
    unauthSocket.on("connect_error", (err) => {
      resolve(err.message);
    });
    unauthSocket.on("connect", () => {
      resolve("CONNECTED_UNEXPECTEDLY");
    });
  });

  const unauthErrMsg = await unauthErrorPromise;
  assert(
    unauthErrMsg.includes("Authentication error"),
    `Unauthorized socket rejected: "${unauthErrMsg}"`
  );
  unauthSocket.close();

  // Connect Alice's Socket
  const aliceSocket = Client(BASE_URL, {
    auth: { token: aliceToken },
    transports: ["websocket"],
  });

  await new Promise((resolve) => aliceSocket.on("connect", resolve));
  assert(aliceSocket.connected, "Alice socket authenticated and connected");

  // Connect Bob's Socket
  const bobSocket = Client(BASE_URL, {
    auth: { token: bobToken },
    transports: ["websocket"],
  });

  const bobOnlinePromise = new Promise((resolve) => {
    bobSocket.on("getOnlineUsers", (users) => {
      if (users.includes(alice._id) && users.includes(bob._id)) {
        resolve(true);
      }
    });
  });

  await new Promise((resolve) => bobSocket.on("connect", resolve));
  assert(bobSocket.connected, "Bob socket authenticated and connected");

  const bothOnline = await Promise.race([
    bobOnlinePromise,
    new Promise((r) => setTimeout(() => r(false), 3000)),
  ]);
  assert(bothOnline, "Both Alice and Bob tracked in real-time online users list");

  // 3. Test Real-Time 1-to-1 Messaging
  console.log("\n--- 3. Real-Time One-to-One Message Delivery ---");

  const testMessageText = `Hey Bob! Test message at ${Date.now()}`;

  // Prepare listener on Bob's socket to catch message instantly
  const bobReceivedPromise = new Promise((resolve) => {
    bobSocket.on("newMessage", (msg) => {
      resolve(msg);
    });
  });

  // Alice sends message to Bob via REST API
  const sendRes = await apiRequest(
    `/messages/send/${bob._id}`,
    "POST",
    { message: testMessageText },
    aliceToken
  );

  assert(sendRes.status === 201, "Alice sent message to Bob via API");
  assert(sendRes.data.data.senderId === alice._id, "Message senderId securely bound to Alice's JWT");

  const receivedByBob = await Promise.race([
    bobReceivedPromise,
    new Promise((r) => setTimeout(() => r(null), 3000)),
  ]);

  assert(
    receivedByBob && receivedByBob.message === testMessageText,
    "Bob received message INSTANTLY in real-time via Socket.IO"
  );
  assert(receivedByBob?.read === false, "Message initial read status is false");

  // 4. Test Message Persistence & History Retrieval
  console.log("\n--- 4. Message Persistence & History Queries ---");

  const historyAlice = await apiRequest(`/messages/${bob._id}`, "GET", null, aliceToken);
  assert(historyAlice.status === 200, "Alice fetched conversation history with Bob");
  assert(
    historyAlice.data.data.some((m) => m.message === testMessageText),
    "Message persisted in MongoDB and retrieved in Alice's history"
  );

  const historyBob = await apiRequest(`/messages/${alice._id}`, "GET", null, bobToken);
  assert(historyBob.status === 200, "Bob fetched conversation history with Alice");
  assert(
    historyBob.data.data.some((m) => m.message === testMessageText),
    "Bob retrieved identical persisted message thread"
  );

  const convsAlice = await apiRequest("/messages/conversations", "GET", null, aliceToken);
  assert(
    convsAlice.status === 200 && convsAlice.data.data.length > 0,
    "Alice retrieved conversations list with lastMessage populated"
  );
  assert(
    convsAlice.data.data[0].otherUser._id === bob._id,
    "Conversation otherUser correctly populated as Bob"
  );

  // 5. Test Real-Time Typing Indicators
  console.log("\n--- 5. Typing Indicators ---");

  const bobTypingPromise = new Promise((resolve) => {
    bobSocket.on("typing", (data) => resolve(data));
  });

  aliceSocket.emit("typing", { receiverId: bob._id });
  const typingEvent = await Promise.race([
    bobTypingPromise,
    new Promise((r) => setTimeout(() => r(null), 3000)),
  ]);
  assert(typingEvent?.senderId === alice._id, "Bob received real-time typing indicator from Alice");

  const bobStopTypingPromise = new Promise((resolve) => {
    bobSocket.on("stopTyping", (data) => resolve(data));
  });

  aliceSocket.emit("stopTyping", { receiverId: bob._id });
  const stopTypingEvent = await Promise.race([
    bobStopTypingPromise,
    new Promise((r) => setTimeout(() => r(null), 3000)),
  ]);
  assert(
    stopTypingEvent?.senderId === alice._id,
    "Bob received real-time stopTyping indicator from Alice"
  );

  // 6. Test Real-Time Read Receipts
  console.log("\n--- 6. Read Status & Read Receipts ---");

  const aliceReadPromise = new Promise((resolve) => {
    aliceSocket.on("messagesRead", (data) => resolve(data));
  });

  // Bob marks messages from Alice as read
  bobSocket.emit("markMessagesAsRead", { senderId: alice._id });

  const readReceipt = await Promise.race([
    aliceReadPromise,
    new Promise((r) => setTimeout(() => r(null), 3000)),
  ]);

  assert(readReceipt?.readerId === bob._id, "Alice received real-time messagesRead receipt from Bob");

  // Verify in DB that message is now read: true
  const updatedHistory = await apiRequest(`/messages/${bob._id}`, "GET", null, aliceToken);
  const updatedMsg = updatedHistory.data.data.find((m) => m.message === testMessageText);
  assert(updatedMsg?.read === true, "Persisted message read status updated to true");

  // 7. Test Reconnection & Presence Cleanup
  console.log("\n--- 7. Reconnection & Presence Cleanup ---");

  const bobSawAliceDisconnect = new Promise((resolve) => {
    bobSocket.on("getOnlineUsers", (users) => {
      if (!users.includes(alice._id)) {
        resolve(true);
      }
    });
  });

  // Alice disconnects
  aliceSocket.disconnect();

  const aliceGone = await Promise.race([
    bobSawAliceDisconnect,
    new Promise((r) => setTimeout(() => r(false), 3000)),
  ]);
  assert(aliceGone, "Alice departure broadcast to Bob (Alice offline)");

  // Alice reconnects
  const bobSawAliceReconnect = new Promise((resolve) => {
    bobSocket.on("getOnlineUsers", (users) => {
      if (users.includes(alice._id)) {
        resolve(true);
      }
    });
  });

  aliceSocket.connect();
  const aliceBack = await Promise.race([
    bobSawAliceReconnect,
    new Promise((r) => setTimeout(() => r(false), 3000)),
  ]);
  assert(aliceBack, "Alice reconnection broadcast to Bob (Alice online again)");

  // 8. Test Validation & Security Edge Cases
  console.log("\n--- 8. Security & Validation Edge Cases ---");

  // Empty message
  const emptyRes = await apiRequest(`/messages/send/${bob._id}`, "POST", { message: "" }, aliceToken);
  assert(emptyRes.status === 400, "Empty message rejected with 400");

  // Whitespace-only message
  const whitespaceRes = await apiRequest(`/messages/send/${bob._id}`, "POST", { message: "   " }, aliceToken);
  assert(whitespaceRes.status === 400, "Whitespace message rejected with 400");

  // Long message > 2000 chars
  const longText = "A".repeat(2001);
  const longRes = await apiRequest(`/messages/send/${bob._id}`, "POST", { message: longText }, aliceToken);
  assert(longRes.status === 400, "Overly long message (>2000 chars) rejected with 400");

  // Invalid receiver ID format
  const invalidIdRes = await apiRequest("/messages/send/not-a-valid-id", "POST", { message: "hi" }, aliceToken);
  assert(invalidIdRes.status === 400, "Invalid receiver ID format rejected with 400");

  // Sending message to oneself
  const selfRes = await apiRequest(`/messages/send/${alice._id}`, "POST", { message: "self note" }, aliceToken);
  assert(selfRes.status === 400, "Self-messaging prohibited with 400");

  // Cleanup sockets
  aliceSocket.close();
  bobSocket.close();

  console.log("\n==================================================");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMessagingTests().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
