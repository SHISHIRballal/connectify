const BASE_URL = "http://localhost:5000/api";

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
  const res = await fetch(`${BASE_URL}${endpoint}`, opts);
  const data = await res.json().catch(() => null);

  const setCookie = res.headers.get("set-cookie");
  let cookieToken = null;
  if (setCookie) {
    const match = setCookie.match(/jwt=([^;]+)/);
    if (match) cookieToken = match[1];
  }

  return { status: res.status, ok: res.ok, data, token: cookieToken };
}

async function runAIAssistantTests() {
  console.log("\n==========================================================");
  console.log("     CONNECTIFY AI ASSISTANT CHAT TEST SUITE              ");
  console.log("==========================================================\n");

  const rand = Math.floor(Math.random() * 100000);

  // 1. Setup authenticated test user
  console.log("--- 1. Setting up User Authentication ---");

  const userReg = await apiRequest("/auth/signup", "POST", {
    fullname: "Assistant Tester",
    username: `asst_user_${rand}`,
    email: `asst_user_${rand}@example.com`,
    password: "password123",
  });
  assert(userReg.status === 201, "Test user registered successfully");
  const userToken = userReg.token;

  // 2. Test: General Chat Mode
  console.log("\n--- 2. Test: General Chat Request ---");

  const generalRes = await apiRequest(
    "/ai/chat",
    "POST",
    {
      message: "Hello! What can you help me with?",
      mode: "general",
    },
    userToken
  );
  assert(generalRes.status === 200, "General chat returned 200 OK");
  assert(generalRes.data.success === true, "Response indicates success");
  assert(typeof generalRes.data.data.reply === "string", "Reply is a string");
  assert(generalRes.data.data.reply.length > 20, "Reply contains substantive text");
  assert(generalRes.data.data.mode === "general", "Mode is 'general'");

  // 3. Test: Improving a Tweet
  console.log("\n--- 3. Test: Mode 1 - Improving a Tweet ---");

  const improveRes = await apiRequest(
    "/ai/chat",
    "POST",
    {
      message: "improve this: I launched my app connectify and it has sockets",
      mode: "improve",
    },
    userToken
  );
  assert(improveRes.status === 200, "Tweet improvement returned 200 OK");
  assert(improveRes.data.data.mode === "improve", "Mode is 'improve'");
  assert(
    improveRes.data.data.reply.includes("Connectify") || improveRes.data.data.reply.includes("Enhancements"),
    "Improvement reply contains enhanced draft and tips"
  );
  console.log(`   Sample Reply:\n${improveRes.data.data.reply.slice(0, 150)}...\n`);

  // 4. Test: Generating a Draft Post
  console.log("--- 4. Test: Mode 2 - Generating a Draft ---");

  const draftRes = await apiRequest(
    "/ai/chat",
    "POST",
    {
      message: "draft a post about real-time database architecture",
      mode: "draft",
    },
    userToken
  );
  assert(draftRes.status === 200, "Draft generation returned 200 OK");
  assert(draftRes.data.data.mode === "draft", "Mode is 'draft'");
  assert(draftRes.data.data.reply.length > 30, "Generated draft is substantive");

  // 5. Test: Content Summarization via Chat
  console.log("\n--- 5. Test: Mode 3 - Summarizing Content ---");

  const sumRes = await apiRequest(
    "/ai/chat",
    "POST",
    {
      message: "summarize: Full-stack applications require robust databases, caching, and real-time sockets.",
      mode: "summarize",
    },
    userToken
  );
  assert(sumRes.status === 200, "Chat summarization returned 200 OK");
  assert(sumRes.data.data.mode === "summarize", "Mode is 'summarize'");

  // 6. Test: Explaining Trends
  console.log("\n--- 6. Test: Mode 4 - Explaining Trends ---");

  const trendsRes = await apiRequest(
    "/ai/chat",
    "POST",
    {
      message: "what's trending on Connectify right now?",
      mode: "trends",
    },
    userToken
  );
  assert(trendsRes.status === 200, "Trend explanation returned 200 OK");
  assert(trendsRes.data.data.mode === "trends", "Mode is 'trends'");
  assert(
    trendsRes.data.data.reply.includes("#connectify") || trendsRes.data.data.reply.includes("#realtime"),
    "Trend explanation mentions trending hashtags"
  );

  // 7. Test: Connectify Features Guidance
  console.log("\n--- 7. Test: Mode 5 - Connectify Features Guidance ---");

  const featuresRes = await apiRequest(
    "/ai/chat",
    "POST",
    {
      message: "how does connectify work and what features does it have?",
      mode: "features",
    },
    userToken
  );
  assert(featuresRes.status === 200, "Feature guide returned 200 OK");
  assert(featuresRes.data.data.mode === "features", "Mode is 'features'");
  assert(
    featuresRes.data.data.reply.includes("Messaging") || featuresRes.data.data.reply.includes("Feed"),
    "Feature explanation describes platform capabilities"
  );

  // 8. Test: Conversation History Bounding (Sliding Window)
  console.log("\n--- 8. Test: Conversation History Bounding ---");

  // Send a history array with 10 turns (exceeds 6-message cap)
  const longHistory = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Historical message turn #${i + 1} discussing features`,
  }));

  const boundedHistoryRes = await apiRequest(
    "/ai/chat",
    "POST",
    {
      message: "What were we discussing?",
      history: longHistory,
      mode: "general",
    },
    userToken
  );
  assert(boundedHistoryRes.status === 200, "Long history processed safely without error (200 OK)");

  // 9. Test: Input Validation & Edge Cases
  console.log("\n--- 9. Test: Input Validation & Edge Cases ---");

  const emptyMsgRes = await apiRequest("/ai/chat", "POST", { message: "" }, userToken);
  assert(emptyMsgRes.status === 400, "Empty message rejected with 400");

  const whitespaceMsgRes = await apiRequest("/ai/chat", "POST", { message: "   " }, userToken);
  assert(whitespaceMsgRes.status === 400, "Whitespace message rejected with 400");

  const oversizedMsg = "a".repeat(2001);
  const oversizedRes = await apiRequest("/ai/chat", "POST", { message: oversizedMsg }, userToken);
  assert(oversizedRes.status === 400, "Message exceeding 2000 chars rejected with 400");

  // 10. Test: Security & Authentication
  console.log("\n--- 10. Test: Security, Key Isolation & Auth ---");

  const unauthRes = await apiRequest("/ai/chat", "POST", { message: "Hello without token" }, null);
  assert(unauthRes.status === 401, "Unauthenticated request rejected with 401");

  const serializedData = JSON.stringify(generalRes.data);
  assert(!serializedData.includes("AI_API_KEY"), "Response does not leak AI_API_KEY");
  assert(!serializedData.includes("systemInstruction"), "Response does not leak system prompts");

  console.log("\n==========================================================");
  console.log(`  AI ASSISTANT RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAIAssistantTests().catch((err) => {
  console.error("AI Assistant test runner encountered error:", err);
  process.exit(1);
});
