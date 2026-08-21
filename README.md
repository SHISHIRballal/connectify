# 🌐 Connectify — Production Real-Time Social Platform & AI Intelligence Suite

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D%2018.0.0-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?logo=socketdotio&logoColor=white)
![Tests](https://img.shields.io/badge/Automated%20Tests-284%20Passed-brightgreen.svg)

**Connectify** is a full-stack, enterprise-ready social media application featuring real-time direct messaging, high-performance cursor-paginated feeds, a provider-independent AI moderation & assistant engine, role-based access control, and server-side MongoDB aggregation analytics.

[Features](#-key-features) • [Architecture](#-architecture) • [API Reference](#-api-endpoints) • [AI Subsystem](#-ai-intelligence-subsystem) • [Installation](#-getting-started) • [Testing](#-automated-testing)

</div>

---

## 🚀 Key Features

### 1. ⚡ Real-Time One-to-One Messaging
- **Socket.IO Engine**: Instant bi-directional messaging authenticated with JWT cookies/headers.
- **Live Presence & Typing Indicators**: Real-time online/offline presence tracking and responsive debounce typing broadcast.
- **Read Receipts & Delivery**: Real-time read status updates with instant database synchronization.
- **Connection Resiliency**: Heartbeat liveness checks, graceful reconnect handling, and socket memory cleanup.

### 2. 📜 Infinite Scrolling Social Feed
- **Cursor-Based Pagination (`GET /api/posts/feed?cursor=...&limit=10`)**: High-performance composite cursor indexing on `{ createdAt: -1, _id: -1 }` guaranteeing zero duplicate posts and zero skipped posts during real-time feed updates.
- **Frontend IntersectionObserver**: Seamless lazy loading with smooth loading spinners, error retry states, and end-of-feed indicators.

### 3. 🛡️ AI Content Moderation & Policy Engine
- **Provider-Independent AI Architecture**: Pluggable AI abstraction supporting Google Gemini API, OpenAI-compatible models, and offline deterministic mock providers.
- **Deterministic Policy Layer**: Separates raw AI classification from final database decisions using configurable risk thresholds:
  - 🟢 **SAFE ($\text{Risk} < 40\%$)**: Published directly to public feeds.
  - 🟡 **FLAGGED ($40\% \le \text{Risk} < 75\%$)**: Published with a review flag & an auto-generated pending report for moderator triage.
  - 🔴 **BLOCKED ($\text{Risk} \ge 75\%$)**: Rejected with HTTP 400 and recorded to the audit log without touching public feeds.
- **Fault-Tolerant Fallback**: Emergency heuristic scanner prevents platform downtime if external AI APIs time out or error (`AI_SERVICE_UNAVAILABLE`).

### 4. ✨ AI Post & Thread Summarizer
- **Inline Summarization**: One-click summary button on substantive posts and active discussion threads.
- **Thread Context Awareness**: Synthesizes the main post along with community replies into coherent takeaways.
- **Data Minimization**: Content is sanitized (URLs $\rightarrow$ `[link]`, stripped HTML) and capped at 10,000 characters before AI processing.

### 5. 🤖 Interactive AI Assistant (`POST /api/ai/chat`)
- **Multi-Mode Social Co-Pilot**:
  - ✍️ **Improve Tweet**: Sharpens opening hooks, tone, and appends engagement hashtags.
  - 💡 **Generate Draft**: Creates compelling post drafts on any requested topic.
  - 📝 **Summarize Content**: Condenses external articles or text into key bullet points.
  - 📈 **Explain Trends**: Explains trending hashtags and popular community topics.
  - ❓ **Feature Guidance**: Answers user questions about Connectify features.
- **Bounded Context Window**: Sliding-window truncation keeping the last 6 turns (max 4,000 characters total) to protect latency and token limits.
- **Clean Chat UI**: Floating action button and slide-out modal with prompt chips, one-click draft copying, and conversation reset.

### 6. 📊 Real MongoDB Aggregation Analytics
- **Zero Frontend Metric Calculation**: 12 platform analytics computed entirely on the server using MongoDB aggregation pipelines (`$facet`, `$group`, `$unwind`, `$regexFindAll`, `$lookup`):
  1. Total registered users & account growth rate
  2. New user signups in timeframe
  3. Active creator & commenter count
  4. Total published posts
  5. Daily post publishing time series (`YYYY-MM-DD`)
  6. Total likes sum & average likes/post
  7. Total comments sum & average comments/post
  8. Follow relationships graph size
  9. Reports count categorized by reason
  10. Staff moderation action distribution
  11. **Trending Hashtags Ranking**: Extracted dynamically from post text using `$regexFindAll: { regex: "#[a-zA-Z0-9_]+" }`
  12. **Top Content Creators Leaderboard**: Ranked by total post count and likes received.
- **Timeframe Selector**: Interactive toggle between `7 Days`, `30 Days`, `90 Days`, and `All Time`.

### 7. 🔒 Role-Based Access Control (RBAC) & Admin Dashboard
- **Hierarchical Roles**: `USER`, `MODERATOR`, `ADMIN` enforced on all privileged API endpoints.
- **Account Suspension Enforcement**: Suspended users are immediately rejected across all API calls and socket connections with HTTP 403.
- **6-Section Administrative Control Panel (`/admin`)**:
  - 📊 **Overview**: System KPI metric cards and split-view activity feeds.
  - 👥 **Users Management**: Search, filter by role/status, suspend/reactivate accounts, promote/demote roles.
  - 📝 **Posts Management**: Directory with AI moderation badges (`SAFE`, `FLAGGED`, `BLOCKED`), risk scores, report badges, and deletion.
  - 🚩 **Reports Triage**: Content moderation workflow (triage pending reports, dismiss, or resolve with post deletion / user suspension).
  - 📋 **Moderation Audit Logs**: Immutable chronological record of staff actions.
  - 📈 **Analytics**: Interactive time-series bar charts, hashtag ranking bars, and creator leaderboards.

---

## 🏗️ Architecture

```
                                  ┌────────────────────────┐
                                  │   React 18 Frontend    │
                                  │   (Vite + Lucide Icons)│
                                  └───────────┬────────────┘
                                              │
                         HTTP / REST API (JWT)│ WebSocket (Socket.IO)
                                              │
                                  ┌───────────▼────────────┐
                                  │   Express 5 Backend    │
                                  │   (Rate Limiter, Auth) │
                                  └─────┬────────────┬─────┘
                                        │            │
             ┌──────────────────────────┴──┐      ┌──┴──────────────────────────┐
             │    AI Intelligence Layer    │      │    MongoDB Database Engine  │
             ├─────────────────────────────┤      ├─────────────────────────────┤
             │ • aiProvider (Gemini/Mock)  │      │ • Compound-Indexed Models   │
             │ • policyEngine (Thresholds) │      │ • Aggregation Pipelines     │
             │ • moderationService         │      │ • Cursor Pagination Cursors │
             │ • summarizationService      │      │ • Moderation Audit Trails   │
             │ • assistantService (Chat)   │      │ • Auto-Generated Reports    │
             └─────────────────────────────┘      └─────────────────────────────┘
```

---

## 📁 Repository Structure

```text
connectify/
├── backend/
│   ├── config/             # Environment configuration (backend-only AI keys)
│   ├── controllers/        # Express route controllers (Auth, Posts, Admin, AI, Analytics, etc.)
│   ├── db/                 # MongoDB Atlas Mongoose connection
│   ├── middleware/         # Auth verification (JWT), RBAC (requireRole), error handler
│   ├── model/              # Mongoose schemas (User, Post, Message, Report, ModerationLog)
│   ├── routes/             # Express API routes
│   ├── services/           # Business logic & Database layer
│   │   ├── ai/             # Provider abstraction, policy engine, summarizer, assistant
│   │   ├── analytics.service.js  # 12 MongoDB aggregation pipelines
│   │   ├── admin.service.js      # Privileged administrative operations
│   │   ├── post.service.js       # Post lifecycle & AI moderation integration
│   │   └── message.service.js    # One-to-one messaging logic
│   ├── socket/             # Socket.IO event handlers & presence tracker
│   ├── test/               # Automated test suites (284 tests across 9 suites)
│   ├── utils/              # Base64 cursor encoder/decoder, ApiError classes
│   ├── validators/         # Zod schemas for query/body validation
│   └── server.js           # Server bootstrap & WebSocket initialization
│
├── frontend/twitterclone/
│   ├── src/
│   │   ├── api/            # Centralized API clients (auth, post, admin, ai, analytics, etc.)
│   │   ├── components/
│   │   │   ├── admin/      # 6 Admin dashboard sections, modals, confirm dialogs
│   │   │   ├── ai/         # AI Assistant Chat Modal & prompt chips
│   │   │   ├── chat/       # Conversation list, chat thread, typing bubble
│   │   │   ├── feed/       # Post cards, compose post, infinite scroll, AI summarize
│   │   │   └── layout/     # SidebarNav, RightSidebar, MobileBottomNav
│   │   ├── context/        # AuthContext (JWT session), SocketContext (Real-time events)
│   │   ├── pages/          # FeedPage, ChatPage, ProfilePage, AdminPage, LoginPage
│   │   ├── App.jsx         # React Router configuration & route protection
│   │   └── index.css       # Production styles, animations, responsive layouts
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🔌 API Endpoints

### Authentication & Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register a new account | Public |
| `POST` | `/api/auth/login` | Authenticate and issue JWT cookie | Public |
| `POST` | `/api/auth/logout` | Clear auth token cookie | Public |
| `GET` | `/api/auth/me` | Fetch authenticated profile | `User` |
| `GET` | `/api/users/profile/:username` | View user profile by handle | `User` |
| `POST` | `/api/users/follow/:id` | Follow / unfollow user | `User` |
| `POST` | `/api/users/update` | Update profile information | `User` |

### Posts & Feed (Cursor Paginated)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/posts/feed?cursor=...&limit=10` | Cursor-paginated global social feed | `User` |
| `GET` | `/api/posts/user/:username?cursor=...` | User profile post stream | `User` |
| `POST` | `/api/posts/create` | Create post with AI content moderation | `User` |
| `POST` | `/api/posts/like/:id` | Toggle like/unlike | `User` |
| `POST` | `/api/posts/comment/:id` | Add comment to post | `User` |
| `DELETE`| `/api/posts/:id` | Delete post (Author or Mod/Admin) | `User` |

### AI Intelligence Subsystem
| Method | Endpoint | Description | Rate Limit | Auth |
|---|---|---|---|---|
| `POST` | `/api/ai/summarize` | Summarize post or conversation thread | 20 req / 15 min | `User` |
| `POST` | `/api/ai/chat` | Interactive multi-mode AI Assistant chat | 30 req / 15 min | `User` |

### Admin & Moderation Controls
| Method | Endpoint | Description | Required Role |
|---|---|---|---|
| `GET` | `/api/admin/overview` | KPI overview stat cards & recent events | `MODERATOR` / `ADMIN` |
| `GET` | `/api/admin/users` | Paginated user directory with search/filters | `MODERATOR` / `ADMIN` |
| `POST` | `/api/admin/users/:id/suspend` | Suspend user account with reason | `ADMIN` |
| `POST` | `/api/admin/users/:id/activate`| Reactivate suspended user account | `ADMIN` |
| `POST` | `/api/admin/users/:id/role` | Update user role (`USER`, `MODERATOR`, `ADMIN`)| `ADMIN` |
| `GET` | `/api/admin/posts` | Posts directory with AI moderation badges | `MODERATOR` / `ADMIN` |
| `GET` | `/api/admin/reports` | Content violation reports triage | `MODERATOR` / `ADMIN` |
| `POST` | `/api/admin/reports/:id/resolve`| Resolve report with audit action | `MODERATOR` / `ADMIN` |
| `GET` | `/api/admin/logs` | Immutable moderation audit trail | `MODERATOR` / `ADMIN` |
| `GET` | `/api/analytics/summary` | Full 12-metric MongoDB aggregation summary | `MODERATOR` / `ADMIN` |

---

## 🤖 AI Intelligence Subsystem

### Provider-Independent Abstraction
The AI architecture separates provider communication from business logic:
- **`MockAIProvider`**: Built-in deterministic natural language engine for unit tests, offline development, and zero-cost local execution.
- **`GeminiAIProvider`**: Connects to Google Gemini models with JSON mode enforcement and 5000ms abort signals.

```javascript
// Switch providers seamlessly via .env
AI_PROVIDER=gemini        # "gemini" | "mock"
AI_MODEL=gemini-1.5-flash
AI_TIMEOUT_MS=5000
```

### Deterministic Moderation Policy Engine
```text
User Post ────► AI Classification ────► Deterministic Policy Engine ────► Action
                  (Risk Score 0-1)        • Score < 0.40  ─────────────►  SAFE (Publish)
                                          • 0.40 <= Score < 0.75 ──────►  FLAGGED (Auto-Report)
                                          • Score >= 0.75 ─────────────►  BLOCKED (400 Rejection)
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster connection string
- **Cloudinary Account**: For media uploads

### 1. Clone the Repository
```bash
git clone https://github.com/SHISHIRballal/connectify.git
cd connectify
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/connectify?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CORS_ORIGIN=http://localhost:5173

# AI Intelligence Configuration (Backend-Only)
AI_PROVIDER=mock          # Use "mock" for local dev or "gemini" with API key
AI_API_KEY=your_google_gemini_api_key_here
AI_MODEL=gemini-1.5-flash
AI_TIMEOUT_MS=5000
```

### 3. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend/twitterclone
npm install
cd ../..
```

### 4. Run Development Servers
```bash
# Terminal 1: Start Backend Server (Port 5000)
node backend/server.js

# Terminal 2: Start Frontend Dev Server (Port 5173)
cd frontend/twitterclone
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Testing

Connectify includes **284 automated integration and unit tests** verifying security, pagination, real-time messaging, RBAC, analytics aggregations, and AI features.

Run individual test suites:

```bash
# AI Assistant Chat Suite (27 tests)
node backend/test/test_ai_assistant.mjs

# AI Thread Summarizer Suite (22 tests)
node backend/test/test_ai_summarization.mjs

# AI Post Moderation & Policy Engine (31 tests)
node backend/test/test_ai_moderation.mjs

# MongoDB Aggregation Analytics (42 tests)
node backend/test/test_analytics.mjs

# Admin Dashboard Full Workflow (40 tests)
node backend/test/test_admin_dashboard.mjs

# Role-Based Access Control (41 tests)
node backend/test/test_rbac.mjs

# Full Application E2E Integration (24 tests)
node backend/test/test_full_integration.mjs

# Infinite Scrolling & Cursor Pagination (30 tests)
node backend/test/test_infinite_scroll.mjs

# Socket.IO Real-Time Messaging & Presence (27 tests)
node backend/test/test_messaging.mjs
```

---

## 👥 Default Test Credentials

| Role | Username | Password | Access Privileges |
|---|---|---|---|
| **Regular User** | `testuser` | `password123` | Social feed, posting, messaging, AI summarization, AI chat |
| **Moderator** | `testmod` | `password123` | Content inspection, report review, post deletion, audit logs |
| **Administrator**| `testadmin`| `password123` | Full system control, account suspension, role changes, analytics |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
