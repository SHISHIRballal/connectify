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

async function runInfiniteScrollTests() {
  console.log("\n==================================================");
  console.log("  CONNECTIFY CURSOR PAGINATION & FEED TEST SUITE  ");
  console.log("==================================================\n");

  const rand = Math.floor(Math.random() * 100000);
  const userCarol = {
    fullname: "Carol Feed",
    username: `carol_${rand}`,
    email: `carol_${rand}@example.com`,
    password: "password123",
  };
  const userDave = {
    fullname: "Dave Intruder",
    username: `dave_${rand}`,
    email: `dave_${rand}@example.com`,
    password: "password123",
  };

  // 1. Setup Users
  console.log("--- 1. User Setup & Auth ---");
  const signupCarol = await apiRequest("/auth/signup", "POST", userCarol);
  assert(signupCarol.status === 201, "Carol registered");
  const carol = signupCarol.data.data;
  const carolToken = signupCarol.token;

  const signupDave = await apiRequest("/auth/signup", "POST", userDave);
  assert(signupDave.status === 201, "Dave registered");
  const dave = signupDave.data.data;
  const daveToken = signupDave.token;

  // 2. Seed 25 Posts
  console.log("\n--- 2. Seeding 25 Test Posts for Pagination ---");
  const TOTAL_POSTS = 25;
  const createdPostIds = [];

  for (let i = 1; i <= TOTAL_POSTS; i++) {
    await new Promise((r) => setTimeout(r, 25));
    const postRes = await apiRequest(
      "/posts/create",
      "POST",
      { text: `Cursor Paginated Post #${i.toString().padStart(2, "0")} by Carol` },
      carolToken
    );
    if (postRes.status === 201) {
      createdPostIds.push(postRes.data.data._id);
    }
  }

  assert(
    createdPostIds.length === TOTAL_POSTS,
    `Successfully created ${TOTAL_POSTS} test posts with ordered timestamps`
  );

  // 3. Multi-Page Cursor-Based Pagination on User Stream
  console.log("\n--- 3. Multi-Page Cursor-Based Pagination ---");

  // Page 1: limit 10
  const page1Res = await apiRequest(`/posts/user/${carol.username}?limit=10`, "GET", null, carolToken);
  assert(page1Res.status === 200, "Page 1 fetch succeeded (200)");
  const page1Data = page1Res.data.data;
  assert(page1Data.posts.length === 10, "Page 1 returned exactly 10 posts");
  assert(page1Data.hasNextPage === true, "Page 1 indicates hasNextPage: true");
  assert(page1Data.nextCursor !== null, "Page 1 generated a valid nextCursor");
  assert(
    page1Data.posts[0].text.includes("Post #25"),
    "Page 1 first post is newest (Post #25)"
  );

  const cursor1 = page1Data.nextCursor;

  // Page 2: limit 10 using cursor1
  const page2Res = await apiRequest(
    `/posts/user/${carol.username}?limit=10&cursor=${encodeURIComponent(cursor1)}`,
    "GET",
    null,
    carolToken
  );
  assert(page2Res.status === 200, "Page 2 fetch succeeded (200)");
  const page2Data = page2Res.data.data;
  assert(page2Data.posts.length === 10, "Page 2 returned exactly 10 posts");
  assert(page2Data.hasNextPage === true, "Page 2 indicates hasNextPage: true");
  assert(page2Data.nextCursor !== null, "Page 2 generated nextCursor");

  const cursor2 = page2Data.nextCursor;

  // Page 3: limit 10 using cursor2 (expect remaining 5 posts)
  const page3Res = await apiRequest(
    `/posts/user/${carol.username}?limit=10&cursor=${encodeURIComponent(cursor2)}`,
    "GET",
    null,
    carolToken
  );
  assert(page3Res.status === 200, "Page 3 fetch succeeded (200)");
  const page3Data = page3Res.data.data;
  assert(page3Data.posts.length === 5, "Page 3 returned remaining 5 posts");
  assert(page3Data.hasNextPage === false, "Page 3 indicates hasNextPage: false (End of Feed)");
  assert(page3Data.nextCursor === null, "Page 3 nextCursor is null (End of Feed)");

  // 4. Duplicate Prevention Assertion Across All Pages
  console.log("\n--- 4. Duplicate Prevention Across Cursor Hops ---");
  const allFetchedIds = [
    ...page1Data.posts.map((p) => p._id),
    ...page2Data.posts.map((p) => p._id),
    ...page3Data.posts.map((p) => p._id),
  ];

  assert(
    allFetchedIds.length === TOTAL_POSTS,
    `Total fetched post count matches total seeded posts (${TOTAL_POSTS})`
  );

  const uniqueIds = new Set(allFetchedIds);
  assert(
    uniqueIds.size === TOTAL_POSTS,
    `Zero duplicate posts across all 3 pages (25 unique IDs / 25 items)`
  );

  // 5. Post Operations (Like, Comment, Delete)
  console.log("\n--- 5. Post Operations & Interactions ---");

  const targetPostId = page1Data.posts[0]._id;

  // Like
  const likeRes1 = await apiRequest(`/posts/like/${targetPostId}`, "POST", null, carolToken);
  assert(likeRes1.status === 200 && likeRes1.data.data.liked === true, "Carol liked post");

  // Unlike
  const likeRes2 = await apiRequest(`/posts/like/${targetPostId}`, "POST", null, carolToken);
  assert(likeRes2.status === 200 && likeRes2.data.data.liked === false, "Carol unliked post");

  // Comment
  const commentRes = await apiRequest(
    `/posts/comment/${targetPostId}`,
    "POST",
    { text: "Awesome post about cursor pagination!" },
    daveToken
  );
  assert(commentRes.status === 200, "Dave added a comment to Carol's post");
  assert(
    commentRes.data.data.some((c) => c.text === "Awesome post about cursor pagination!"),
    "Comment persisted and returned in comments list"
  );

  // Global Feed Query with cursor
  const globalFeedRes = await apiRequest("/posts/feed?limit=5", "GET", null, carolToken);
  assert(globalFeedRes.status === 200, "Global feed query succeeded");
  assert(globalFeedRes.data.data.posts.length === 5, "Global feed returned 5 posts");

  // Unauthorized Delete Attempt
  const unauthDeleteRes = await apiRequest(`/posts/${targetPostId}`, "DELETE", null, daveToken);
  assert(
    unauthDeleteRes.status === 403,
    "Dave forbidden from deleting Carol's post (403 Forbidden)"
  );

  // Authorized Delete
  const authDeleteRes = await apiRequest(`/posts/${targetPostId}`, "DELETE", null, carolToken);
  assert(authDeleteRes.status === 200, "Carol successfully deleted her own post (200 OK)");

  // 6. Validation & Security Edge Cases
  console.log("\n--- 6. Limit & Cursor Validation Edge Cases ---");

  // Empty post
  const emptyPostRes = await apiRequest("/posts/create", "POST", { text: "" }, carolToken);
  assert(emptyPostRes.status === 400, "Empty post creation rejected with 400");

  // Invalid limit 0
  const limit0Res = await apiRequest("/posts/feed?limit=0", "GET", null, carolToken);
  assert(limit0Res.status === 400, "Limit=0 rejected with 400");

  // Limit exceeding 50
  const limit51Res = await apiRequest("/posts/feed?limit=51", "GET", null, carolToken);
  assert(limit51Res.status === 400, "Limit=51 (>50) rejected with 400");

  // Invalid cursor string
  const badCursorRes = await apiRequest(
    "/posts/feed?cursor=invalid_garbage_base64",
    "GET",
    null,
    carolToken
  );
  assert(badCursorRes.status === 400, "Invalid cursor rejected with 400");

  console.log("\n==================================================");
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runInfiniteScrollTests().catch((err) => {
  console.error("Test runner encountered error:", err);
  process.exit(1);
});
