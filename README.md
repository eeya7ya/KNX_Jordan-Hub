# KNX Jordan Hub

Public site for **KNX Jordan Club** — a non-profit, member-led society of
certified building-automation professionals in Jordan.

The frontend is a single static `index.html` (Tailwind CDN, vanilla JS,
EN/AR + light/dark + tweak panel) deployed to **Vercel**. The
membership-application form and member directory are backed by **Neon**
serverless Postgres via Vercel Edge Functions.

## Stack

- **Hosting:** Vercel (static + Edge functions)
- **Database:** Neon serverless Postgres (`@neondatabase/serverless`)
- **Frontend:** HTML + Tailwind (CDN) + vanilla JS

## Project layout

```
.
├── index.html            # the public site (primary deliverable)
├── assets/
│   └── knx-logo.png
├── admin.html            # member portal: sign-in + dashboard
├── api/
│   ├── apply.js          # POST  /api/apply           — write application
│   ├── members.js        # GET   /api/members         — read directory
│   ├── _lib/auth.js      # password hashing, sessions, cookie helpers
│   ├── auth/
│   │   ├── login.js      # POST  /api/auth/login
│   │   ├── logout.js     # POST  /api/auth/logout
│   │   └── me.js         # GET   /api/auth/me
│   └── admin/
│       └── applications.js  # GET /api/admin/applications  (admin only)
├── db/
│   └── schema.sql        # Neon tables (applications, members, users, sessions)
├── scripts/
│   └── create-user.mjs   # CLI to create or update a user
├── package.json
├── vercel.json
└── .env.example
```

## Deploy

### 1. Create a Neon database

1. Go to <https://console.neon.tech>, create a project.
2. Copy the **pooled** connection string (recommended for Edge runtimes).
3. Run the schema once:

   ```sh
   psql "$DATABASE_URL" -f db/schema.sql
   ```

### 2. Deploy to Vercel

1. Push this repo to GitHub.
2. <https://vercel.com/new> → import the repo.
3. Under **Environment Variables**, add:
   - `DATABASE_URL` = your Neon pooled connection string.
4. Deploy. Vercel auto-detects the static `index.html` + the `/api/*`
   edge functions; no build step is required.

### Local development

```sh
npm install
cp .env.example .env.local        # paste your Neon DATABASE_URL
npx vercel dev                    # runs the static site + /api/* locally
```

## API

### `POST /api/apply`

Insert a membership application.

```json
{
  "full_name":  "Marwa Al-Habashneh",
  "email":      "marwa@example.com",
  "location":   "Amman",
  "tier":       "Professional",
  "experience": "12 years commissioning KNX systems for hospitality projects."
}
```

→ `201 { "ok": true, "id": 1, "created_at": "…" }`

### `GET /api/members`

Returns the published member directory (used to hydrate the homepage
directory grid). Falls back to a hard-coded list if the API is
unavailable, so the page renders even without a database.

## Authentication

Auth is rolled in-house against Neon — no third-party auth provider.

- Passwords: PBKDF2-SHA-256 (100k iterations, 16-byte salt) using Web Crypto.
- Sessions: 256-bit opaque token in an `HttpOnly; Secure; SameSite=Lax`
  cookie (`knx_session`); only the SHA-256 of the token is stored, in the
  `sessions` table. Default TTL is 14 days.
- Roles: `member` (default) and `admin`. Admin-only endpoints check
  `user.role === 'admin'`.

### Endpoints

- `POST /api/auth/login`  — `{ email, password }` → sets cookie, returns user
- `POST /api/auth/logout` — clears cookie + deletes the session row
- `GET  /api/auth/me`     — returns `{ user }` or `{ user: null }`
- `GET  /api/admin/applications` — admin only, lists recent applications

### Seeding the first admin

There's no public sign-up. Create the first admin from your machine:

```sh
DATABASE_URL="postgres://…neon.tech/…?sslmode=require" \
  npm run db:create-user -- admin@knxjordan.org "a-strong-password" "Admin Name" admin
```

Re-running the command with the same email **updates** that user's
password and role.
