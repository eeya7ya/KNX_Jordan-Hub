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
├── api/
│   ├── apply.js          # POST  /api/apply   — write to applications
│   └── members.js        # GET   /api/members — read directory
├── db/
│   └── schema.sql        # Neon tables + seed data
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
