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

async function runSummarizationTests() {
  console.log("\n==========================================================");
  console.log("   CONNECTIFY AI SUMMARIZATION TEST SUITE                 ");
  console.log("==========================================================\n");

  const rand = Math.floor(Math.random() * 100000);

  // 1. Setup users
  console.log("--- 1. Setting up Users and Posts ---");

  const userReg = await apiRequest("/auth/signup", "POST", {
    fullname: "Summary Tester",
    username: `sum_tester_${rand}`,
    email: `sum_tester_${rand}@example.com`,
    password: "password123",
  });
  assert(userReg.status === 201, "Test user registered");
  const userToken = userReg.token;

  // Create posts with substantive text (>50 chars) for summarization
  const post1Res = await apiRequest(
    "/posts/create",
    "POST",
    {
      text: "The Connectify platform has been significantly upgraded with real-time messaging, cursor-based pagination, and an AI-powered content moderation pipeline that runs every post through a deterministic safety policy engine.",
    },
    userToken
  );
  assert(post1Res.status === 201, "Post 1 created (technical discussion)");
  const post1 = post1Res.data.data;

  const post2Res = await apiRequest(
    "/posts/create",
    "POST",
    {
      text: "MongoDB aggregation pipelines are incredibly powerful for analytics. We built trending hashtags extraction using regexFindAll and user engagement leaderboards with multi-stage faceted queries.",
    },
    userToken
  );
  assert(post2Res.status === 201, "Post 2 created (MongoDB discussion)");
  const post2 = post2Res.data.data;

  const post3Res = await apiRequest(
    "/posts/create",
    "POST",
    {
      text: "Role-based access control ensures that only admins can suspend users and change roles. Moderators can review flagged content but cannot execute destructive administrative actions.",
    },
    userToken
  );
  assert(post3Res.status === 201, "Post 3 created (RBAC discussion)");
  const post3 = post3Res.data.data;

  // 2. Test: Valid Summarization Request (Single Post)
  console.log("\n--- 2. Test: Valid Summarization Request (Single Post) ---");

  const singleSumRes = await apiRequest(
    "/ai/summarize",
    "POST",
    { postIds: [post1._id] },
    userToken
  );
  assert(singleSumRes.status === 200, "Single post summarization returned 200 OK");
  assert(singleSumRes.data.success === true, "Response indicates success");
  assert(typeof singleSumRes.data.data.summary === "string", "Summary is a string");
  assert(singleSumRes.data.data.summary.length > 0, "Summary is non-empty");
  assert(singleSumRes.data.data.postCount === 1, "Post count reflects 1 post");
  console.log(`   Summary: "${singleSumRes.data.data.summary}"`);

  // 3. Test: Valid Summarization Request (Multiple Posts / Thread)
  console.log("\n--- 3. Test: Valid Summarization Request (Multi-Post Thread) ---");

  const multiSumRes = await apiRequest(
    "/ai/summarize",
    "POST",
    { postIds: [post1._id, post2._id, post3._id] },
    userToken
  );
  assert(multiSumRes.status === 200, "Multi-post summarization returned 200 OK");
  assert(multiSumRes.data.data.postCount === 3, "Post count reflects 3 posts");
  assert(multiSumRes.data.data.summary.length > 0, "Multi-post summary is non-empty");
  console.log(`   Summary: "${multiSumRes.data.data.summary}"`);

  // 4. Test: Empty Request (No Post IDs)
  console.log("\n--- 4. Test: Empty Request (No Post IDs) ---");

  const emptyRes = await apiRequest(
    "/ai/summarize",
    "POST",
    { postIds: [] },
    userToken
  );
  assert(emptyRes.status === 400, "Empty postIds array rejected with 400");

  const missingFieldRes = await apiRequest(
    "/ai/summarize",
    "POST",
    {},
    userToken
  );
  assert(missingFieldRes.status === 400, "Missing postIds field rejected with 400");

  // 5. Test: Non-Existent Post IDs
  console.log("\n--- 5. Test: Non-Existent Post IDs ---");

  const fakeId = "000000000000000000000000";
  const nonExistentRes = await apiRequest(
    "/ai/summarize",
    "POST",
    { postIds: [fakeId] },
    userToken
  );
  assert(nonExistentRes.status === 404, "Non-existent post ID returns 404");

  // 6. Test: Oversized Input (>50 Post IDs)
  console.log("\n--- 6. Test: Oversized Input (>50 Post IDs) ---");

  const oversizedIds = Array.from({ length: 51 }, (_, i) =>
    `${String(i).padStart(24, "0")}`
  );
  const oversizedRes = await apiRequest(
    "/ai/summarize",
    "POST",
    { postIds: oversizedIds },
    userToken
  );
  assert(oversizedRes.status === 400, "Request with >50 post IDs rejected with 400");
  assert(
    oversizedRes.data.message.includes("50") || oversizedRes.data.message.toLowerCase().includes("maximum"),
    "Error message mentions the 50-post limit"
  );

  // 7. Test: Successful Summary Content Quality
  console.log("\n--- 7. Test: Summary Content Quality ---");

  assert(typeof multiSumRes.data.data.provider === "string", "Response includes provider identifier");
  assert(multiSumRes.data.data.truncated === false || multiSumRes.data.data.truncated === true, "Response includes truncated indicator");

  // 8. Test: Unauthenticated Access
  console.log("\n--- 8. Test: Unauthenticated Access ---");

  const unauthRes = await apiRequest(
    "/ai/summarize",
    "POST",
    { postIds: [post1._id] },
    null
  );
  assert(unauthRes.status === 401, "Unauthenticated request rejected with 401");

  // 9. Test: Response does not leak AI keys or internal data
  console.log("\n--- 9. Test: Security & Key Isolation ---");

  const serialized = JSON.stringify(singleSumRes.data);
  assert(!serialized.includes("AI_API_KEY"), "Response contains no AI_API_KEY");
  assert(!serialized.includes("systemPrompt"), "Response contains no system prompts");

  console.log("\n==========================================================");
  console.log(`  AI SUMMARIZATION RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSummarizationTests().catch((err) => {
  console.error("AI Summarization test runner encountered error:", err);
  process.exit(1);
});
