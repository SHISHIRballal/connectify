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

async function runAdminDashboardTests() {
  console.log("\n==========================================================");
  console.log("    CONNECTIFY FULL FUNCTIONAL ADMIN DASHBOARD TEST      ");
  console.log("==========================================================\n");

  const rand = Math.floor(Math.random() * 100000);

  // 1. Setup Users
  console.log("--- 1. Setting up Users, Admins, and Seed Data ---");

  // Admin User
  const adminReg = await apiRequest("/auth/signup", "POST", {
    fullname: "Dashboard Admin",
    username: `dash_admin_${rand}`,
    email: `dash_admin_${rand}@example.com`,
    password: "password123",
  });
  assert(adminReg.status === 201, "Admin user registered");
  const adminUser = adminReg.data.data;
  const adminToken = adminReg.token;

  // Regular User
  const regularReg = await apiRequest("/auth/signup", "POST", {
    fullname: "Regular Poster",
    username: `dash_user_${rand}`,
    email: `dash_user_${rand}@example.com`,
    password: "password123",
  });
  assert(regularReg.status === 201, "Regular user registered");
  const regUser = regularReg.data.data;
  const regToken = regularReg.token;

  // Update Admin role in MongoDB
  const { default: mongoose } = await import("mongoose");
  const { default: User } = await import("../model/user.model.js");
  const { default: env } = await import("../config/env.js");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_URI);
  }

  await User.findByIdAndUpdate(adminUser._id, { role: "ADMIN" });
  console.log("Admin role confirmed in database");

  // Create a post by regular user
  const postRes = await apiRequest(
    "/posts/create",
    "POST",
    { text: `Dashboard test post content #${rand}` },
    regToken
  );
  assert(postRes.status === 201, "Test post created by regular user");
  const createdPost = postRes.data.data;

  // File a report on this post
  const reportRes = await apiRequest(
    "/reports",
    "POST",
    {
      reportedPostId: createdPost._id,
      reason: "inappropriate",
      details: "Flagged for testing admin dashboard triage",
    },
    adminToken
  );
  assert(reportRes.status === 201, "Report submitted against test post");
  const createdReport = reportRes.data.data;

  // 2. Section 1: Overview API
  console.log("\n--- 2. Testing Section 1: Overview API (/api/admin/overview) ---");

  const overviewRes = await apiRequest("/admin/overview", "GET", null, adminToken);
  assert(overviewRes.status === 200, "Admin fetched /api/admin/overview (200 OK)");
  const overviewData = overviewRes.data.data;

  assert(overviewData.metrics !== undefined, "Overview contains metrics object");
  assert(overviewData.metrics.users.total >= 2, "Overview reflects total users >= 2");
  assert(overviewData.metrics.users.admins >= 1, "Overview reflects at least 1 admin");
  assert(overviewData.metrics.posts.total >= 1, "Overview reflects total posts >= 1");
  assert(overviewData.metrics.reports.total >= 1, "Overview reflects total reports >= 1");
  assert(overviewData.metrics.reports.pending >= 1, "Overview reflects pending reports >= 1");
  assert(Array.isArray(overviewData.recentPendingReports), "Overview contains recentPendingReports array");
  assert(Array.isArray(overviewData.recentLogs), "Overview contains recentLogs array");

  // Non-staff forbidden on overview
  const regularOverview = await apiRequest("/admin/overview", "GET", null, regToken);
  assert(regularOverview.status === 403, "Regular user rejected on /api/admin/overview (403 Forbidden)");

  // 3. Section 2: Users Management API
  console.log("\n--- 3. Testing Section 2: Users API (/api/admin/users) ---");

  const usersRes = await apiRequest(`/admin/users?search=${regUser.username}`, "GET", null, adminToken);
  assert(usersRes.status === 200, "Admin searched user directory (200 OK)");
  assert(usersRes.data.data.users.length === 1, "Search returned exactly 1 matching user");
  assert(usersRes.data.data.users[0].username === regUser.username, "Returned user matches searched username");
  assert(usersRes.data.data.totalPages >= 1, "Users query returned valid totalPages");

  // 4. Section 3: Posts Management API
  console.log("\n--- 4. Testing Section 3: Posts Management API (/api/admin/posts) ---");

  const postsRes = await apiRequest(`/admin/posts?search=${encodeURIComponent(createdPost.text)}`, "GET", null, adminToken);
  assert(postsRes.status === 200, "Admin searched posts directory (200 OK)");
  assert(postsRes.data.data.posts.length === 1, "Found created test post in posts directory");
  const postInAdmin = postsRes.data.data.posts[0];
  assert(postInAdmin.reportCount >= 1, "Post in admin directory reflects associated report count >= 1");
  assert(postInAdmin.pendingReportCount >= 1, "Post reflects pending report count >= 1");

  // Test Post Inspection API
  const inspectRes = await apiRequest(`/admin/posts/${createdPost._id}/reports`, "GET", null, adminToken);
  assert(inspectRes.status === 200, "Admin inspected post reports via /api/admin/posts/:id/reports (200 OK)");
  assert(Array.isArray(inspectRes.data.data), "Inspected reports returned array");
  assert(inspectRes.data.data.length >= 1, "Inspected reports list contains filed report");
  assert(inspectRes.data.data[0].reason === "inappropriate", "Inspected report reason matches filed report");

  // 5. Section 4: Reports Management API
  console.log("\n--- 5. Testing Section 4: Reports API (/api/admin/reports) ---");

  const reportsListRes = await apiRequest("/admin/reports?status=PENDING", "GET", null, adminToken);
  assert(reportsListRes.status === 200, "Admin fetched pending reports list (200 OK)");
  const matchingReport = reportsListRes.data.data.reports.find((r) => r._id === createdReport._id);
  assert(matchingReport !== undefined, "Pending reports list contains created report");

  // 6. Section 5: Moderation Audit Logs API
  console.log("\n--- 6. Testing Section 5: Moderation Audit Logs API (/api/admin/logs) ---");

  const logsRes = await apiRequest("/admin/logs", "GET", null, adminToken);
  assert(logsRes.status === 200, "Admin fetched moderation audit logs (200 OK)");
  assert(Array.isArray(logsRes.data.data.logs), "Moderation logs returned array");

  // 7. Section 6: Analytics API
  console.log("\n--- 7. Testing Section 6: Analytics API (/api/admin/analytics) ---");

  const analyticsRes = await apiRequest("/admin/analytics", "GET", null, adminToken);
  assert(analyticsRes.status === 200, "Admin fetched /api/admin/analytics (200 OK)");
  const analyticsData = analyticsRes.data.data;

  assert(Array.isArray(analyticsData.reportsByReason), "Analytics contains reportsByReason array");
  assert(Array.isArray(analyticsData.reportsByStatus), "Analytics contains reportsByStatus array");
  assert(Array.isArray(analyticsData.actionsByType), "Analytics contains actionsByType array");
  assert(Array.isArray(analyticsData.usersByRole), "Analytics contains usersByRole array");
  assert(Array.isArray(analyticsData.usersByStatus), "Analytics contains usersByStatus array");

  const inappropriateCategory = analyticsData.reportsByReason.find((r) => r.reason === "inappropriate");
  assert(inappropriateCategory !== undefined && inappropriateCategory.count >= 1, "Analytics includes count for 'inappropriate' reports");

  // 8. Complete Admin Resolution Workflow
  console.log("\n--- 8. Complete Admin Resolution Workflow ---");

  // Admin resolves report with POST_DELETED action
  const resolveWithDelete = await apiRequest(
    `/admin/reports/${createdReport._id}/resolve`,
    "POST",
    {
      status: "RESOLVED",
      resolutionNotes: "Content violated policy and was removed by admin",
      actionTaken: "POST_DELETED",
    },
    adminToken
  );
  assert(resolveWithDelete.status === 200, "Report resolved with action POST_DELETED (200 OK)");

  // Verify post is now deleted
  const checkPostDeleted = await apiRequest(`/posts/${createdPost._id}`, "GET", null, adminToken);
  assert(checkPostDeleted.status === 404, "Target post was deleted following resolution (404 Not Found)");

  // Verify Audit log contains RESOLVE_REPORT
  const updatedLogs = await apiRequest("/admin/logs", "GET", null, adminToken);
  const logActions = updatedLogs.data.data.logs.map((l) => l.action);
  assert(logActions.includes("RESOLVE_REPORT"), "Audit log reflects RESOLVE_REPORT action");

  console.log("\n==========================================================");
  console.log(`  ADMIN DASHBOARD RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================\n");

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminDashboardTests().catch((err) => {
  console.error("Admin dashboard test runner encountered error:", err);
  process.exit(1);
});
