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

async function runAnalyticsTests() {
  console.log("\n==========================================================");
  console.log("   CONNECTIFY REAL MONGODB AGGREGATION ANALYTICS TEST     ");
  console.log("==========================================================\n");

  const rand = Math.floor(Math.random() * 100000);

  // 1. Setup Users & Admin
  console.log("--- 1. Setting up Users, Hashtags, and Engagement Seed Data ---");

  // Admin User
  const adminReg = await apiRequest("/auth/signup", "POST", {
    fullname: "Analytics Admin",
    username: `analytics_admin_${rand}`,
    email: `analytics_admin_${rand}@example.com`,
    password: "password123",
  });
  assert(adminReg.status === 201, "Analytics Admin registered");
  const adminUser = adminReg.data.data;
  const adminToken = adminReg.token;

  // Creator User 1
  const user1Reg = await apiRequest("/auth/signup", "POST", {
    fullname: "Creator One",
    username: `creator1_${rand}`,
    email: `creator1_${rand}@example.com`,
    password: "password123",
  });
  assert(user1Reg.status === 201, "Creator 1 registered");
  const user1 = user1Reg.data.data;
  const user1Token = user1Reg.token;

  // Creator User 2
  const user2Reg = await apiRequest("/auth/signup", "POST", {
    fullname: "Creator Two",
    username: `creator2_${rand}`,
    email: `creator2_${rand}@example.com`,
    password: "password123",
  });
  assert(user2Reg.status === 201, "Creator 2 registered");
  const user2 = user2Reg.data.data;
  const user2Token = user2Reg.token;

  // Update Admin role in MongoDB
  const { default: mongoose } = await import("mongoose");
  const { default: User } = await import("../model/user.model.js");
  const { default: env } = await import("../config/env.js");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_URI);
  }

  await User.findByIdAndUpdate(adminUser._id, { role: "ADMIN" });
  console.log("Admin role confirmed in database");

  // 2. Publish posts with hashtags
  const post1Res = await apiRequest(
    "/posts/create",
    "POST",
    { text: "Welcome to Connectify! #connectify #tech #launch" },
    user1Token
  );
  assert(post1Res.status === 201, "Post 1 with #connectify #tech #launch created");
  const post1 = post1Res.data.data;

  const post2Res = await apiRequest(
    "/posts/create",
    "POST",
    { text: "Real-time direct messaging is live #connectify #realtime" },
    user1Token
  );
  assert(post2Res.status === 201, "Post 2 with #connectify #realtime created");
  const post2 = post2Res.data.data;

  const post3Res = await apiRequest(
    "/posts/create",
    "POST",
    { text: "MongoDB aggregations are super fast #tech #database #mongodb" },
    user2Token
  );
  assert(post3Res.status === 201, "Post 3 with #tech #database #mongodb created");
  const post3 = post3Res.data.data;

  // 3. User interactions (Likes, Comments, Follows)
  await apiRequest(`/posts/like/${post1._id}`, "POST", null, user2Token);
  await apiRequest(`/posts/like/${post2._id}`, "POST", null, user2Token);
  console.log("Creator 2 liked Post 1 and Post 2");

  await apiRequest(`/posts/comment/${post2._id}`, "POST", { text: "Love the real-time presence!" }, user2Token);
  console.log("Creator 2 commented on Post 2");

  await apiRequest(`/users/follow/${user1._id}`, "POST", null, user2Token);
  console.log("Creator 2 followed Creator 1");

  // 4. File a moderation report
  await apiRequest(
    "/reports",
    "POST",
    {
      reportedPostId: post3._id,
      reason: "inappropriate",
      details: "Analytics test report",
    },
    user1Token
  );
  console.log("Creator 1 reported Post 3");

  // 5. Test Unified Analytics Summary API
  console.log("\n--- 2. Testing GET /api/analytics/summary ---");

  const summaryRes = await apiRequest("/analytics/summary?timeframe=7d", "GET", null, adminToken);
  assert(summaryRes.status === 200, "Admin fetched /api/analytics/summary (200 OK)");
  const summary = summaryRes.data.data;

  // Metric 1: Total Users
  assert(summary.users.totalUsers >= 3, `Metric 1: Total Users (${summary.users.totalUsers}) >= 3`);

  // Metric 2: New Users
  assert(summary.users.newUsers >= 3, `Metric 2: New Users in timeframe (${summary.users.newUsers}) >= 3`);

  // Metric 3: Active Users
  assert(summary.users.activeUsersCount >= 2, `Metric 3: Active Users (${summary.users.activeUsersCount}) >= 2`);

  // Metric 4: Total Posts
  assert(summary.posts.totalPosts >= 3, `Metric 4: Total Posts (${summary.posts.totalPosts}) >= 3`);

  // Metric 5: Posts Per Day Time Series
  assert(Array.isArray(summary.posts.postsPerDay), "Metric 5: Posts per day is an array");
  assert(summary.posts.postsPerDay.length >= 1, "Metric 5: Posts per day contains dated entries");
  assert(summary.posts.postsPerDay[0].date !== undefined, "Metric 5: Post time series has 'date' field");
  assert(summary.posts.postsPerDay[0].count >= 1, "Metric 5: Post time series has 'count' field");

  // Metric 6: Likes
  assert(summary.posts.totalLikes >= 2, `Metric 6: Total Likes (${summary.posts.totalLikes}) >= 2`);
  assert(summary.posts.averageLikesPerPost > 0, "Metric 6: Average likes per post calculated");

  // Metric 7: Comments
  assert(summary.posts.totalComments >= 1, `Metric 7: Total Comments (${summary.posts.totalComments}) >= 1`);

  // Metric 8: Follows
  assert(summary.engagement.totalFollows >= 1, `Metric 8: Total Follows (${summary.engagement.totalFollows}) >= 1`);

  // Metric 9: Reports
  assert(summary.moderation.totalReports >= 1, `Metric 9: Total Reports (${summary.moderation.totalReports}) >= 1`);
  const reportReasonInappropriate = summary.moderation.reportsByReason.find((r) => r.reason === "inappropriate");
  assert(reportReasonInappropriate !== undefined, "Metric 9: Reports by reason includes 'inappropriate'");

  // Metric 10: Moderation Statistics
  assert(Array.isArray(summary.moderation.actionsByType), "Metric 10: Moderation actions by type is array");
  assert(Array.isArray(summary.moderation.moderatorLeaderboard), "Metric 10: Moderator leaderboard is array");

  // Metric 11: Trending Hashtags Aggregation
  const hashtags = summary.engagement.trendingHashtags;
  assert(Array.isArray(hashtags), "Metric 11: Trending hashtags is array");
  assert(hashtags.length >= 2, "Metric 11: Extracted at least 2 distinct hashtags");
  const connectifyTag = hashtags.find((h) => h.tag === "#connectify");
  assert(connectifyTag !== undefined && connectifyTag.count >= 2, `Metric 11: #connectify extracted with count=${connectifyTag?.count}`);
  const techTag = hashtags.find((h) => h.tag === "#tech");
  assert(techTag !== undefined && techTag.count >= 2, `Metric 11: #tech extracted with count=${techTag?.count}`);

  // Metric 12: Most Active Users Leaderboard
  const activeUsers = summary.engagement.mostActiveUsers;
  assert(Array.isArray(activeUsers), "Metric 12: Most active users is array");
  assert(activeUsers.length >= 2, "Metric 12: Top creators ranked");
  assert(activeUsers[0].username !== undefined, "Metric 12: Creator contains username");
  assert(activeUsers[0].postCount >= 1, "Metric 12: Creator contains postCount");
  assert(activeUsers[0].totalLikesReceived >= 0, "Metric 12: Creator contains totalLikesReceived");

  // 6. Test Dedicated Hashtags & Active Users Endpoints
  console.log("\n--- 3. Testing Dedicated Sub-Endpoints ---");

  const hashtagsEndpointRes = await apiRequest("/analytics/hashtags?timeframe=7d", "GET", null, adminToken);
  assert(hashtagsEndpointRes.status === 200, "Admin fetched /api/analytics/hashtags (200 OK)");
  assert(Array.isArray(hashtagsEndpointRes.data.data), "Hashtags endpoint returned array");

  const activeUsersEndpointRes = await apiRequest("/analytics/active-users?timeframe=7d", "GET", null, adminToken);
  assert(activeUsersEndpointRes.status === 200, "Admin fetched /api/analytics/active-users (200 OK)");
  assert(Array.isArray(activeUsersEndpointRes.data.data), "Active users endpoint returned array");

  // 7. Test Timeframe Filters
  console.log("\n--- 4. Testing Timeframe Filtering (30d, 90d, all) ---");

  const summary30d = await apiRequest("/analytics/summary?timeframe=30d", "GET", null, adminToken);
  assert(summary30d.status === 200, "Fetched 30d analytics (200 OK)");
  assert(summary30d.data.data.timeframe === "30d", "Timeframe parameter reflected as '30d'");

  const summaryAll = await apiRequest("/analytics/summary?timeframe=all", "GET", null, adminToken);
  assert(summaryAll.status === 200, "Fetched all-time analytics (200 OK)");
  assert(summaryAll.data.data.timeframe === "all", "Timeframe parameter reflected as 'all'");

  // 8. Test Security & RBAC Enforcement
  console.log("\n--- 5. Testing Security & RBAC Enforcement ---");

  const unauthRes = await apiRequest("/analytics/summary", "GET", null, null);
  assert(unauthRes.status === 401, "Unauthenticated request to /api/analytics/summary rejected with 401");

  const userForbiddenRes = await apiRequest("/analytics/summary", "GET", null, user1Token);
  assert(userForbiddenRes.status === 403, "Regular user request to /api/analytics/summary rejected with 403 Forbidden");

  console.log("\n==========================================================");
  console.log(`  ANALYTICS RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================\n");

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAnalyticsTests().catch((err) => {
  console.error("Analytics test runner encountered error:", err);
  process.exit(1);
});
