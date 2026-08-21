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

async function runRBACTests() {
  console.log("\n==========================================================");
  console.log("     CONNECTIFY ROLE-BASED ACCESS CONTROL (RBAC) TEST     ");
  console.log("==========================================================\n");

  const rand = Math.floor(Math.random() * 100000);

  // 1. Setup Users
  console.log("--- 1. Setting up Users with Different Roles ---");

  // Regular User
  const regUser = await apiRequest("/auth/signup", "POST", {
    fullname: "Regular User",
    username: `user_${rand}`,
    email: `user_${rand}@example.com`,
    password: "password123",
  });
  assert(regUser.status === 201, "Regular User registered");
  const user = regUser.data.data;
  const userToken = regUser.token;

  // Victim User (for testing post deletion & suspension)
  const regVictim = await apiRequest("/auth/signup", "POST", {
    fullname: "Victim User",
    username: `victim_${rand}`,
    email: `victim_${rand}@example.com`,
    password: "password123",
  });
  assert(regVictim.status === 201, "Victim User registered");
  const victim = regVictim.data.data;
  let victimToken = regVictim.token;

  // Moderator User
  const regMod = await apiRequest("/auth/signup", "POST", {
    fullname: "Moderator User",
    username: `mod_${rand}`,
    email: `mod_${rand}@example.com`,
    password: "password123",
  });
  assert(regMod.status === 201, "Moderator registered");
  const mod = regMod.data.data;
  const modToken = regMod.token;

  // Admin User
  const regAdmin = await apiRequest("/auth/signup", "POST", {
    fullname: "Super Admin",
    username: `admin_${rand}`,
    email: `admin_${rand}@example.com`,
    password: "password123",
  });
  assert(regAdmin.status === 201, "Admin registered");
  const admin = regAdmin.data.data;
  const adminToken = regAdmin.token;

  // Directly assign roles in DB for Mod and Admin via direct mongoose connection or promote using admin
  // Since admin is currently created as default USER, let's update admin's and mod's role in MongoDB
  // We can do this by importing connectMongoDB and User model, or executing a quick helper
  const { default: mongoose } = await import("mongoose");
  const { default: User } = await import("../model/user.model.js");
  const { default: env } = await import("../config/env.js");

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_URI);
  }

  await User.findByIdAndUpdate(mod._id, { role: "MODERATOR" });
  await User.findByIdAndUpdate(admin._id, { role: "ADMIN" });

  const verifyAdmin = await User.findById(admin._id);
  assert(verifyAdmin.role === "ADMIN", "Admin role updated in DB to ADMIN");
  const verifyMod = await User.findById(mod._id);
  assert(verifyMod.role === "MODERATOR", "Moderator role updated in DB to MODERATOR");

  // Create a post by Victim
  const victimPostRes = await apiRequest(
    "/posts/create",
    "POST",
    { text: "This is a post created by victim user for moderation testing." },
    victimToken
  );
  assert(victimPostRes.status === 201, "Victim created post for moderation testing");
  const victimPost = victimPostRes.data.data;

  // 2. Unauthenticated Access Tests (401)
  console.log("\n--- 2. Unauthenticated Access Tests (401 Unauthorized) ---");

  const unauthAdminUsers = await apiRequest("/admin/users", "GET", null, null);
  assert(unauthAdminUsers.status === 401, "Unauthenticated GET /api/admin/users rejected with 401");

  const unauthAdminReports = await apiRequest("/admin/reports", "GET", null, null);
  assert(unauthAdminReports.status === 401, "Unauthenticated GET /api/admin/reports rejected with 401");

  const unauthCreateReport = await apiRequest("/reports", "POST", { reason: "spam" }, null);
  assert(unauthCreateReport.status === 401, "Unauthenticated POST /api/reports rejected with 401");

  // 3. USER Role Access Control (403 Forbidden for Admin Endpoints)
  console.log("\n--- 3. USER Role Access Control (403 Forbidden) ---");

  const userAccessUsers = await apiRequest("/admin/users", "GET", null, userToken);
  assert(userAccessUsers.status === 403, "Regular User calling GET /api/admin/users rejected with 403");

  const userAccessReports = await apiRequest("/admin/reports", "GET", null, userToken);
  assert(userAccessReports.status === 403, "Regular User calling GET /api/admin/reports rejected with 403");

  const userAccessLogs = await apiRequest("/admin/logs", "GET", null, userToken);
  assert(userAccessLogs.status === 403, "Regular User calling GET /api/admin/logs rejected with 403");

  const userSuspendAttempt = await apiRequest(
    `/admin/users/${victim._id}/suspend`,
    "POST",
    { reason: "I dont like them" },
    userToken
  );
  assert(userSuspendAttempt.status === 403, "Regular User calling POST /api/admin/users/:id/suspend rejected with 403");

  const userChangeRoleAttempt = await apiRequest(
    `/admin/users/${user._id}/role`,
    "POST",
    { role: "ADMIN" },
    userToken
  );
  assert(userChangeRoleAttempt.status === 403, "Regular User calling POST /api/admin/users/:id/role rejected with 403");

  // Regular user unauthorized post delete
  const userDeleteVictimPost = await apiRequest(`/posts/${victimPost._id}`, "DELETE", null, userToken);
  assert(userDeleteVictimPost.status === 403, "Regular User deleting someone else's post rejected with 403");

  // 4. USER Allowed Operations (Submit Report)
  console.log("\n--- 4. USER Allowed Operations (Report Submission) ---");

  const submitReportRes = await apiRequest(
    "/reports",
    "POST",
    {
      reportedPostId: victimPost._id,
      reason: "spam",
      details: "This post contains unsolicited promotion",
    },
    userToken
  );
  assert(submitReportRes.status === 201, "Regular User submitted report via POST /api/reports (201)");
  const createdReport = submitReportRes.data.data;

  // 5. MODERATOR Role Access Control & Permissions
  console.log("\n--- 5. MODERATOR Role Access Control & Permissions ---");

  const modGetUsers = await apiRequest("/admin/users", "GET", null, modToken);
  assert(modGetUsers.status === 200, "Moderator allowed to view users directory (200 OK)");

  const modGetReports = await apiRequest("/admin/reports", "GET", null, modToken);
  assert(modGetReports.status === 200, "Moderator allowed to view reports list (200 OK)");
  assert(modGetReports.data.data.reports.length >= 1, "Moderator retrieved user's submitted report");

  const modGetLogs = await apiRequest("/admin/logs", "GET", null, modToken);
  assert(modGetLogs.status === 200, "Moderator allowed to view moderation audit logs (200 OK)");

  // Moderator deleting another user's post (allowed for mods)
  const modDeletePost = await apiRequest(`/posts/${victimPost._id}`, "DELETE", null, modToken);
  assert(modDeletePost.status === 200, "Moderator successfully deleted another user's post (200 OK)");

  // Moderator attempting Admin-only endpoints (Forbidden)
  const modSuspendAttempt = await apiRequest(
    `/admin/users/${victim._id}/suspend`,
    "POST",
    { reason: "Mod attempt" },
    modToken
  );
  assert(modSuspendAttempt.status === 403, "Moderator forbidden from suspending users (403 Forbidden - Admin only)");

  const modRoleAttempt = await apiRequest(
    `/admin/users/${user._id}/role`,
    "POST",
    { role: "ADMIN" },
    modToken
  );
  assert(modRoleAttempt.status === 403, "Moderator forbidden from changing user roles (403 Forbidden - Admin only)");

  // 6. ADMIN Role Full Access & Account Suspension
  console.log("\n--- 6. ADMIN Role Full Access & Account Suspension Flow ---");

  const adminGetUsers = await apiRequest("/admin/users", "GET", null, adminToken);
  assert(adminGetUsers.status === 200, "Admin fetched users directory (200 OK)");

  // Admin suspends Victim
  const suspendRes = await apiRequest(
    `/admin/users/${victim._id}/suspend`,
    "POST",
    { reason: "Repeated spam violations" },
    adminToken
  );
  assert(suspendRes.status === 200, "Admin suspended victim user account (200 OK)");
  assert(suspendRes.data.data.isSuspended === true, "Victim account isSuspended marked true");

  // Suspended victim attempts login -> expect 403
  const victimLoginAttempt = await apiRequest("/auth/login", "POST", {
    username: `victim_${rand}`,
    password: "password123",
  });
  assert(
    victimLoginAttempt.status === 403,
    "Suspended user login rejected with 403 Forbidden ('account suspended')"
  );

  // Suspended victim attempts API call with existing token -> expect 403
  const victimPostAttempt = await apiRequest(
    "/posts/create",
    "POST",
    { text: "I should not be able to post while suspended" },
    victimToken
  );
  assert(
    victimPostAttempt.status === 403,
    "Suspended user API call rejected with 403 Forbidden"
  );

  // Admin reactivates Victim
  const activateRes = await apiRequest(`/admin/users/${victim._id}/activate`, "POST", null, adminToken);
  assert(activateRes.status === 200, "Admin reactivated victim user account (200 OK)");
  assert(activateRes.data.data.isSuspended === false, "Victim account isSuspended is false");

  // Victim logs in successfully now
  const victimLoginAfterActivate = await apiRequest("/auth/login", "POST", {
    username: `victim_${rand}`,
    password: "password123",
  });
  assert(victimLoginAfterActivate.status === 200, "Reactivated victim successfully logged in");
  victimToken = victimLoginAfterActivate.token;

  // 7. Role Change & Promotion
  console.log("\n--- 7. Role Change & Promotion ---");

  const promoteRes = await apiRequest(
    `/admin/users/${user._id}/role`,
    "POST",
    { role: "MODERATOR" },
    adminToken
  );
  assert(promoteRes.status === 200, "Admin promoted regular user to MODERATOR");

  // Promoted user can now access moderation reports
  const promotedUserReports = await apiRequest("/admin/reports", "GET", null, userToken);
  assert(promotedUserReports.status === 200, "Promoted user can now access /api/admin/reports (200 OK)");

  // 8. Resolve Report & Verify Audit Logs
  console.log("\n--- 8. Report Resolution & Moderation Audit Logs ---");

  const resolveRes = await apiRequest(
    `/admin/reports/${createdReport._id}/resolve`,
    "POST",
    {
      status: "RESOLVED",
      resolutionNotes: "Post was reviewed and removed",
      actionTaken: "POST_DELETED",
    },
    adminToken
  );
  assert(resolveRes.status === 200, "Admin resolved report via POST /api/admin/reports/:id/resolve (200)");

  // Verify Moderation Audit Logs
  const auditLogsRes = await apiRequest("/admin/logs", "GET", null, adminToken);
  assert(auditLogsRes.status === 200, "Admin fetched moderation audit logs");
  const logs = auditLogsRes.data.data.logs;
  const actionsInLog = logs.map((l) => l.action);

  assert(actionsInLog.includes("DELETE_POST"), "Audit log contains DELETE_POST event");
  assert(actionsInLog.includes("SUSPEND_USER"), "Audit log contains SUSPEND_USER event");
  assert(actionsInLog.includes("ACTIVATE_USER"), "Audit log contains ACTIVATE_USER event");
  assert(actionsInLog.includes("CHANGE_ROLE"), "Audit log contains CHANGE_ROLE event");
  assert(actionsInLog.includes("RESOLVE_REPORT"), "Audit log contains RESOLVE_REPORT event");

  console.log("\n==========================================================");
  console.log(`  RBAC RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==========================================================\n");

  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runRBACTests().catch((err) => {
  console.error("RBAC Test runner encountered error:", err);
  process.exit(1);
});
