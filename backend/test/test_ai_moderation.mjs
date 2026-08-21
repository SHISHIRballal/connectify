import { evaluatePolicy, fallbackHeuristicScanner } from "../services/ai/policyEngine.js";

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

async function runAIModerationTests() {
  console.log("\n==========================================================");
  console.log("     CONNECTIFY AI-POWERED POST MODERATION TEST SUITE     ");
  console.log("==========================================================\n");

  const rand = Math.floor(Math.random() * 100000);

  // 1. Unit Tests for Deterministic Policy Engine
  console.log("--- 1. Unit Tests for Policy Engine & Thresholds ---");

  const lowRiskOutcome = evaluatePolicy({ riskScore: 0.05, categories: [] });
  assert(lowRiskOutcome.status === "SAFE", "Low risk score (0.05) evaluated to SAFE");
  assert(lowRiskOutcome.action === "PUBLISH", "Low risk action is PUBLISH");

  const mediumRiskOutcome = evaluatePolicy({ riskScore: 0.55, categories: ["spam"], reason: "Promotional spam" });
  assert(mediumRiskOutcome.status === "FLAGGED", "Medium risk score (0.55) evaluated to FLAGGED");
  assert(mediumRiskOutcome.action === "PUBLISH_AND_FLAG_FOR_REVIEW", "Medium risk action is PUBLISH_AND_FLAG_FOR_REVIEW");

  const highRiskOutcome = evaluatePolicy({ riskScore: 0.90, categories: ["violence"], reason: "Violent threat" });
  assert(highRiskOutcome.status === "BLOCKED", "High risk score (0.90) evaluated to BLOCKED");
  assert(highRiskOutcome.action === "BLOCK_AND_HOLD", "High risk action is BLOCK_AND_HOLD");

  const severeCategoryOverride = evaluatePolicy({ riskScore: 0.70, categories: ["hate_speech"] });
  assert(severeCategoryOverride.status === "BLOCKED", "Severe category (hate_speech @ 0.70) triggers BLOCKED override");

  // 2. Unit Tests for Fault-Tolerant Heuristic Fallback Scanner
  console.log("\n--- 2. Unit Tests for Offline / Fallback Safety Scanner ---");

  const fallbackSafe = fallbackHeuristicScanner("Excited to share my new open source project!");
  assert(fallbackSafe.status === "SAFE", "Fallback scanner allows benign content");

  const fallbackBlock = fallbackHeuristicScanner("Warning: bomb threat in building");
  assert(fallbackBlock.status === "BLOCKED", "Fallback scanner blocks emergency dangerous content");

  // 3. User Setup & Auth for Integration Tests
  console.log("\n--- 3. Setting up Users for Integration Testing ---");

  const adminReg = await apiRequest("/auth/signup", "POST", {
    fullname: "AI Mod Admin",
    username: `ai_admin_${rand}`,
    email: `ai_admin_${rand}@example.com`,
    password: "password123",
  });
  assert(adminReg.status === 201, "Admin user registered");
  const adminUser = adminReg.data.data;
  const adminToken = adminReg.token;

  const userReg = await apiRequest("/auth/signup", "POST", {
    fullname: "Regular Poster",
    username: `ai_poster_${rand}`,
    email: `ai_poster_${rand}@example.com`,
    password: "password123",
  });
  assert(userReg.status === 201, "Regular poster registered");
  const user = userReg.data.data;
  const userToken = userReg.token;

  // Elevate Admin role in DB
  const { default: mongoose } = await import("mongoose");
  const { default: User } = await import("../model/user.model.js");
  const { default: Post } = await import("../model/post.model.js");
  const { default: Report } = await import("../model/report.model.js");
  const { default: env } = await import("../config/env.js");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_URI);
  }

  await User.findByIdAndUpdate(adminUser._id, { role: "ADMIN" });
  console.log("Admin role updated in DB to ADMIN");

  // 4. Low Risk Flow: Content -> SAFE -> Published to Feed
  console.log("\n--- 4. Integration Test: Low Risk Content (Outcome: SAFE) ---");

  const safePostRes = await apiRequest(
    "/posts/create",
    "POST",
    { text: "Just joined Connectify! Excited to connect with fellow software engineers." },
    userToken
  );
  assert(safePostRes.status === 201, "Low risk post created successfully (201 Created)");
  const safePost = safePostRes.data.data;
  assert(safePost.moderationStatus === "SAFE", "Post stored with moderationStatus: 'SAFE'");
  assert(safePost.moderationScore < 0.40, `Post risk score (${safePost.moderationScore}) < 0.40`);

  // Verify safe post is visible in public feed
  const feedRes = await apiRequest("/posts/feed", "GET", null, userToken);
  assert(feedRes.status === 200, "Feed query succeeded");
  const isSafeInFeed = feedRes.data.data.posts.some((p) => p._id === safePost._id);
  assert(isSafeInFeed === true, "SAFE post is visible in public feed");

  // 5. Medium Risk Flow: Content -> FLAGGED -> Auto-Report Generated for Review
  console.log("\n--- 5. Integration Test: Medium Risk Content (Outcome: FLAGGED) ---");

  const flaggedPostRes = await apiRequest(
    "/posts/create",
    "POST",
    { text: "Claim your free crypto tokens click here now before giveaway ends!" },
    userToken
  );
  assert(flaggedPostRes.status === 201, "Medium risk post published with review flag (201 Created)");
  const flaggedPost = flaggedPostRes.data.data;
  assert(flaggedPost.moderationStatus === "FLAGGED", "Post stored with moderationStatus: 'FLAGGED'");
  assert(flaggedPost.moderationScore >= 0.40 && flaggedPost.moderationScore < 0.75, "Risk score in medium range [0.40, 0.75)");

  // Verify automated pending Report was filed for Moderator Triage
  const autoReport = await Report.findOne({ reportedPost: flaggedPost._id });
  assert(autoReport !== null, "Automated Report was generated for FLAGGED post in MongoDB");
  assert(autoReport.status === "PENDING", "Auto-generated report status is PENDING");
  assert(autoReport.details.includes("[AI Auto-Flagged"), "Report details indicate AI Auto-Flag origin");

  // 6. High Risk Flow: Content -> BLOCKED -> Rejection & Audit Log
  console.log("\n--- 6. Integration Test: High Risk Content (Outcome: BLOCKED) ---");

  const blockedPostAttempt = await apiRequest(
    "/posts/create",
    "POST",
    { text: "I am going to violently attack everyone in the town tomorrow morning" },
    userToken
  );
  assert(blockedPostAttempt.status === 400, "High risk post was rejected with 400 Bad Request");
  assert(
    blockedPostAttempt.data.message.toLowerCase().includes("safety policies") ||
    blockedPostAttempt.data.message.toLowerCase().includes("blocked"),
    "Rejection message explains safety policy violation"
  );

  // Verify blocked post was never created in Post collection
  const checkPostInDB = await Post.findOne({ text: /violently attack everyone/ });
  assert(checkPostInDB === null, "BLOCKED post was prevented from persisting in Post collection");

  // 7. Admin Moderation Review & Inspection
  console.log("\n--- 7. Admin Moderation & AI Badges Verification ---");

  const adminPostsRes = await apiRequest("/admin/posts", "GET", null, adminToken);
  assert(adminPostsRes.status === 200, "Admin fetched /api/admin/posts");
  const flaggedPostInAdmin = adminPostsRes.data.data.posts.find((p) => p._id === flaggedPost._id);
  assert(flaggedPostInAdmin !== undefined, "Admin post directory reflects FLAGGED post");
  assert(flaggedPostInAdmin.moderationStatus === "FLAGGED", "Admin view receives moderationStatus: 'FLAGGED'");
  assert(flaggedPostInAdmin.moderationScore !== undefined, "Admin view receives numerical moderationScore");

  // 8. Key Isolation Security Check
  console.log("\n--- 8. Security Verification: Key Isolation ---");
  const serializedPost = JSON.stringify(safePostRes.data);
  assert(!serializedPost.includes("AI_API_KEY"), "Post response contains no AI key secrets");
  assert(!serializedPost.includes("gemini"), "Post response exposes no internal provider keys");

  console.log("\n==========================================================");
  console.log(`  AI MODERATION RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================\n");

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAIModerationTests().catch((err) => {
  console.error("AI Moderation test runner encountered error:", err);
  process.exit(1);
});
