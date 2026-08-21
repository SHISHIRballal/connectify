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

  const setCookie = res.headers.get("set-cookie");
  let cookieToken = null;
  if (setCookie) {
    const match = setCookie.match(/jwt=([^;]+)/);
    if (match) cookieToken = match[1];
  }

  return { status: res.status, ok: res.ok, data, token: cookieToken };
}

async function runFullIntegrationTest() {
  console.log("\n==========================================================");
  console.log("   CONNECTIFY FULL APPLICATION E2E INTEGRATION SUITE      ");
  console.log("==========================================================\n");

  const rand = Math.floor(Math.random() * 100000);
  const userElena = {
    fullname: "Elena Rostova",
    username: `elena_${rand}`,
    email: `elena_${rand}@example.com`,
    password: "password123",
  };
  const userFelix = {
    fullname: "Felix Vance",
    username: `felix_${rand}`,
    email: `felix_${rand}@example.com`,
    password: "password123",
  };

  // 1. Register Users
  console.log("--- 1. Registration & Authentication ---");
  const regElena = await apiRequest("/auth/signup", "POST", userElena);
  assert(regElena.status === 201, "Elena registered via /api/auth/signup");
  const elena = regElena.data.data;
  let elenaToken = regElena.token;

  const regFelix = await apiRequest("/auth/signup", "POST", userFelix);
  assert(regFelix.status === 201, "Felix registered via /api/auth/signup");
  const felix = regFelix.data.data;
  const felixToken = regFelix.token;

  // 2. Login & Session Persistence
  console.log("\n--- 2. Login & Protected /me Endpoint ---");
  const loginElena = await apiRequest("/auth/login", "POST", {
    username: userElena.username,
    password: userElena.password,
  });
  assert(loginElena.status === 200, "Elena logged in via /api/auth/login");
  elenaToken = loginElena.token || elenaToken;

  const meElena = await apiRequest("/auth/me", "GET", null, elenaToken);
  assert(meElena.status === 200 && meElena.data.data.username === userElena.username, "Authenticated /api/auth/me returned Elena");

  // 3. Post Creation & Publishing
  console.log("\n--- 3. Post Creation ---");
  const createPostRes = await apiRequest(
    "/posts/create",
    "POST",
    { text: "Hello Connectify community! Testing the full frontend-backend integration." },
    elenaToken
  );
  assert(createPostRes.status === 201, "Elena published post via /api/posts/create");
  const elenaPost = createPostRes.data.data;

  // 4. Post Interactions (Like & Comment)
  console.log("\n--- 4. Post Interactions (Like & Comment) ---");
  const likeRes = await apiRequest(`/posts/like/${elenaPost._id}`, "POST", null, felixToken);
  assert(likeRes.status === 200 && likeRes.data.data.liked === true, "Felix liked Elena's post via /api/posts/like/:id");

  const commentRes = await apiRequest(
    `/posts/comment/${elenaPost._id}`,
    "POST",
    { text: "Welcome to Connectify, Elena! Great to have you here." },
    felixToken
  );
  assert(commentRes.status === 200, "Felix added comment via /api/posts/comment/:id");
  assert(
    commentRes.data.data.some((c) => c.text.includes("Welcome to Connectify")),
    "Comment persisted and returned in comments array"
  );

  // 5. User Profile & Follow System
  console.log("\n--- 5. User Profile & Follow System ---");
  const profileRes = await apiRequest(`/users/profile/${userElena.username}`, "GET", null, felixToken);
  assert(profileRes.status === 200, "Felix fetched Elena's profile via /api/users/profile/:username");
  assert(profileRes.data.data.username === userElena.username, "Profile data matches Elena");

  const followRes = await apiRequest(`/users/follow/${elena._id}`, "POST", null, felixToken);
  assert(followRes.status === 200, "Felix followed Elena via /api/users/follow/:id");

  const updatedProfileRes = await apiRequest(`/users/profile/${userElena.username}`, "GET", null, felixToken);
  assert(
    updatedProfileRes.data.data.followers.includes(felix._id),
    "Elena's profile reflects Felix in followers list"
  );

  // 6. User Profile Update
  console.log("\n--- 6. Profile Editing & Settings ---");
  const updateRes = await apiRequest(
    "/users/update",
    "POST",
    {
      bio: "Software Architect & Open Source Enthusiast 🚀",
      link: "https://elena-tech.io",
    },
    elenaToken
  );
  assert(updateRes.status === 200, "Elena updated bio & website via /api/users/update");
  assert(updateRes.data.data.bio.includes("Software Architect"), "Updated bio verified");

  // 7. User Specific Post Stream
  console.log("\n--- 7. Profile Posts Query ---");
  const userPostsRes = await apiRequest(`/posts/user/${userElena.username}?limit=5`, "GET", null, felixToken);
  assert(userPostsRes.status === 200, "Fetched Elena's profile posts stream");
  assert(userPostsRes.data.data.posts.length >= 1, "Elena's published post returned in profile stream");

  // 8. Real-Time Chat & Direct Messaging (Socket.IO + REST)
  console.log("\n--- 8. Real-Time Socket.IO Direct Messaging ---");
  const elenaSocket = Client(BASE_URL, {
    auth: { token: elenaToken },
    transports: ["websocket"],
  });
  const felixSocket = Client(BASE_URL, {
    auth: { token: felixToken },
    transports: ["websocket"],
  });

  await Promise.all([
    new Promise((resolve) => elenaSocket.on("connect", resolve)),
    new Promise((resolve) => felixSocket.on("connect", resolve)),
  ]);
  assert(elenaSocket.connected && felixSocket.connected, "Elena & Felix connected to real-time Socket.IO server");

  const felixMessagePromise = new Promise((resolve) => {
    felixSocket.on("newMessage", (msg) => resolve(msg));
  });

  const chatSendRes = await apiRequest(
    `/messages/send/${felix._id}`,
    "POST",
    { message: "Hey Felix! Thanks for following me. Let's collaborate!" },
    elenaToken
  );
  assert(chatSendRes.status === 201, "Elena sent direct message via /api/messages/send/:id");

  const instantMsg = await Promise.race([
    felixMessagePromise,
    new Promise((r) => setTimeout(() => r(null), 3000)),
  ]);
  assert(
    instantMsg && instantMsg.message.includes("Thanks for following me"),
    "Felix received instant Socket.IO direct message"
  );

  // Read receipt test
  const elenaReadReceiptPromise = new Promise((resolve) => {
    elenaSocket.on("messagesRead", (data) => resolve(data));
  });

  felixSocket.emit("markMessagesAsRead", { senderId: elena._id });
  const readReceipt = await Promise.race([
    elenaReadReceiptPromise,
    new Promise((r) => setTimeout(() => r(null), 3000)),
  ]);
  assert(readReceipt?.readerId === felix._id, "Elena received real-time read receipt from Felix");

  // Close sockets
  elenaSocket.close();
  felixSocket.close();

  // 9. Global Infinite Scroll Feed
  console.log("\n--- 9. Global Feed with Cursor Pagination ---");
  const feedRes = await apiRequest("/posts/feed?limit=5", "GET", null, elenaToken);
  assert(feedRes.status === 200, "Elena fetched global feed via /api/posts/feed");
  assert(feedRes.data.data.posts.length > 0, "Global feed returned populated posts with authors and comments");

  // 10. Logout Flow
  console.log("\n--- 10. Logout ---");
  const logoutElena = await apiRequest("/auth/logout", "POST", null, elenaToken);
  assert(logoutElena.status === 200, "Elena logged out via /api/auth/logout");

  const meAfterLogout = await apiRequest("/auth/me", "GET", null, null);
  assert(meAfterLogout.status === 401, "Protected /api/auth/me rejected after logout (401 Unauthorized)");

  console.log("\n==========================================================");
  console.log(`   FULL INTEGRATION RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runFullIntegrationTest().catch((err) => {
  console.error("Full integration runner failed:", err);
  process.exit(1);
});
