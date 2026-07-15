# 🏋️ IronForge Gym — Node.js Backend

Express + MySQL backend for the IronForge Gym website.  
Handles membership signups via a REST API and provides an admin dashboard.

---

## 📁 Project Structure

```
gym-backend/
├── server.js              ← Entry point — Express app + route registration
├── package.json
├── .env.example           ← Copy to .env and fill in your credentials
│
├── config/
│   └── db.js              ← MySQL connection pool
│
├── db/
│   └── init.js            ← One-time DB + table creation script
│
├── routes/
│   ├── signups.js         ← POST/GET/DELETE /api/signups
│   └── stats.js           ← GET /api/stats (dashboard metrics)
│
├── middleware/
│   └── basicAuth.js       ← HTTP Basic Auth for admin endpoints
│
├── utils/
│   └── validateSignup.js  ← Server-side validation for join-form data
│
└── public/
    ├── index.html         ← Main gym website (served statically)
    └── admin.html         ← Admin signups dashboard
```

---

## ⚡ Quick Start

### 1 — Prerequisites

- **Node.js** v18 or newer
- **MySQL** 8.x running locally (or remote)

### 2 — Clone & install

```bash
cd gym-backend
npm install
```

### 3 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ironforge_gym

PORT=3000

ADMIN_USER=admin
ADMIN_PASSWORD=change_this_password

ALLOWED_ORIGINS=http://localhost:3000
```

### 4 — Initialize the database

```bash
npm run init-db
```

This creates the `ironforge_gym` database and the `signups` table if they don't already exist.

### 5 — Start the server

```bash
# Production
npm start

# Development (auto-restart on file change — Node 18+)
npm run dev
```

Visit:
- 🌐 **Website** → http://localhost:3000
- 👑 **Admin panel** → http://localhost:3000/admin *(uses ADMIN_USER / ADMIN_PASSWORD)*
- 📡 **Health check** → http://localhost:3000/health

---

## 🔌 API Reference

All API endpoints return JSON.

### `POST /api/signups` — Submit join form
**Public** (rate-limited: 10 requests / 15 min per IP)

**Request body:**
```json
{
  "firstName":  "Alex",
  "lastName":   "Mercer",
  "email":      "alex@email.com",
  "phone":      "+1 555 000 0000",
  "plan":       "Performance – $79/mo",
  "goal":       "Build Muscle & Strength",
  "experience": "Intermediate (1–3 yrs)",
  "message":    "Any notes here",
  "agreeTerms": true
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Welcome to IronForge, Alex! Your free week is confirmed.",
  "data": { "id": 1, "name": "Alex Mercer", "plan": "Performance – $79/mo" }
}
```

**Response `422` (validation error):**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": { "email": "A valid email address is required." }
}
```

---

### `GET /api/signups` — List signups
**Admin only** (HTTP Basic Auth)

Query params:
| Param    | Default | Description                         |
|----------|---------|-------------------------------------|
| `page`   | 1       | Page number                         |
| `limit`  | 20      | Records per page (max 100)          |
| `search` | —       | Filter by name or email             |
| `plan`   | —       | Filter by exact plan string         |

---

### `GET /api/signups/:id` — Get one signup
**Admin only**

---

### `DELETE /api/signups/:id` — Delete a signup
**Admin only**

---

### `GET /api/stats` — Dashboard metrics
**Admin only**

Returns totals, daily counts (last 14 days), and goal distribution.

---

### `GET /health` — Health check
**Public**

```json
{ "status": "ok", "timestamp": "...", "service": "ironforge-gym-backend" }
```

---

## 🔐 Admin Panel Access

Navigate to `http://localhost:3000/admin`.  
The browser will prompt for a username and password — use the `ADMIN_USER` and `ADMIN_PASSWORD` values from your `.env` file.

**Features:**
- Live stats cards (total, today, 7-day, 30-day, per-plan)
- Searchable, filterable, paginated signups table
- Delete individual signups
- Goal distribution bar chart

---

## 🛡️ Security Notes

- All admin routes (GET/DELETE signups, stats, admin page) are protected by HTTP Basic Auth over HTTPS (use HTTPS in production).
- The signup POST endpoint is rate-limited to 10 requests per 15 minutes per IP.
- Server-side validation mirrors the client-side validation — the backend never trusts frontend data.
- Duplicate email addresses return a `409 Conflict` response.
- Request bodies are capped at 16 KB.

---

## 🗄️ Database Schema

```sql
CREATE TABLE signups (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(100)  NOT NULL,
  last_name     VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  phone         VARCHAR(30)   NULL,
  plan          VARCHAR(50)   NOT NULL,
  goal          VARCHAR(100)  NOT NULL,
  experience    VARCHAR(50)   NOT NULL,
  message       TEXT          NULL,
  agreed_terms  TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
);
```
