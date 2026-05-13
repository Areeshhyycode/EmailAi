# InboxAI — AI Email Automation Assistant

Reads your unread Gmail, categorizes each message with Groq (LLaMA 3.3), detects urgency, drafts replies, and pushes action items to Notion. Optional Slack alerts for urgent threads.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · NextAuth (Google OAuth) · Groq SDK · Gmail API · Notion · Slack webhooks.

---

## Quick start

```powershell
# 1. Install
npm install

# 2. Copy env template and fill in keys (see below)
copy .env.local.example .env.local

# 3. Run
npm run dev
# open http://localhost:3000
```

---

## Getting every API key

### 1. Groq API key (free)
1. Go to <https://console.groq.com>
2. Sign in → **API Keys** → **Create API Key**
3. Paste into `GROQ_API_KEY` in `.env.local`
4. Models: `llama-3.3-70b-versatile` (default), `llama-3.1-8b-instant`, `mixtral-8x7b-32768`

### 2. Google OAuth + Gmail API (free)
1. Open <https://console.cloud.google.com>
2. Create a new project (e.g. "InboxAI")
3. **APIs & Services → Library** → search **Gmail API** → **Enable**
4. **OAuth consent screen**:
   - User type: **External**
   - Fill app name / support email
   - **Scopes** → Add: `gmail.readonly`, `gmail.send`, `gmail.modify`, `userinfo.email`, `userinfo.profile`
   - **Test users** → add your own Gmail address (required while app is in "Testing" mode)
5. **Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Copy **Client ID** → `GOOGLE_CLIENT_ID`
7. Copy **Client secret** → `GOOGLE_CLIENT_SECRET`

### 3. NextAuth secret
PowerShell:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```
Or use any 32+ character random string. Paste into `NEXTAUTH_SECRET`.

### 4. Notion integration (free)
1. Go to <https://www.notion.so/my-integrations>
2. **New integration** → name it "InboxAI" → Capabilities: Read content, Update content, Insert content
3. Copy the **Internal Integration Token** → `NOTION_API_KEY`
4. Create a database in Notion (must have a property called **Name** of type Title)
5. Open the database → **⋯ menu → Add connections** → pick your integration
6. Copy the database ID from the URL: `https://notion.so/<workspace>/<DATABASE_ID>?v=...`
   - The ID is the 32-character string before `?v=`
   - Paste into `NOTION_DATABASE_ID`

### 5. Slack webhook (optional)
1. <https://api.slack.com/apps> → **Create New App** → From scratch
2. Pick a workspace → **Incoming Webhooks** → toggle **On**
3. **Add New Webhook to Workspace** → choose channel
4. Copy the webhook URL → `SLACK_WEBHOOK_URL`

Leave blank to disable Slack alerts (the app will skip them silently).

### 6. Cron secret
Any random string. Used to protect the `/api/cron/check` endpoint.

---

## How the app works

```
Browser
   │
   ▼
Next.js (localhost:3000)
   │
   ├── /login                → NextAuth → Google OAuth (Gmail scopes)
   ├── /dashboard            → fetches /api/emails/fetch
   │
   ├── /api/emails/fetch     → Gmail API (unread) → Groq (analyze) → JSON
   ├── /api/emails/analyze   → Groq (refine drafts)
   ├── /api/emails/reply     → Gmail send + mark-as-read
   ├── /api/tasks/create     → Notion page in your database
   └── /api/cron/check       → background batch: analyze + Slack + Notion
```

**Decision logic** (`/api/cron/check`):
- Urgency ≥ 8 → Slack ping + star the message in Gmail
- Category = Work OR urgency ≥ 7 → create Notion task

---

## Scheduling the cron

The route at `/api/cron/check` needs a Gmail access token. Two options:

**Option A — Vercel Cron (production):**
Add to `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/check?token=YOUR_CRON_SECRET", "schedule": "*/10 * * * *" }] }
```
You'd extend the auth layer to persist refresh tokens in a DB so the cron can mint a fresh access token.

**Option B — Local node-cron (dev):**
After signing in via the dashboard, copy your access token from devtools (or run a script that uses your refresh token), then:
```powershell
curl "http://localhost:3000/api/cron/check?token=YOUR_CRON_SECRET&accessToken=YOUR_GMAIL_TOKEN&limit=10"
```

For a real demo, the dashboard's "Refresh" button is enough — it triggers the full pipeline using the live session.

---

## Project structure

```
.
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   NextAuth handler
│   │   ├── emails/{fetch,analyze,reply}/route.ts
│   │   ├── tasks/create/route.ts
│   │   └── cron/check/route.ts
│   ├── dashboard/page.tsx                Main UI
│   ├── login/page.tsx                    Google sign-in
│   ├── page.tsx                          Landing
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Dashboard.tsx
│   ├── EmailCard.tsx
│   ├── CategoryBadge.tsx
│   └── Providers.tsx
├── lib/
│   ├── auth.ts          NextAuth config + token refresh
│   ├── gmail.ts         fetch / send / label
│   ├── groq.ts          analyze + refine
│   ├── notion.ts        task creation
│   └── slack.ts         urgent webhook
├── types/
│   ├── index.ts         shared types
│   └── next-auth.d.ts   session augmentation
└── .env.local.example
```

---

## Troubleshooting

- **"Access blocked: This app's request is invalid"** — redirect URI mismatch. It must be exactly `http://localhost:3000/api/auth/callback/google`.
- **"App is not verified"** — normal for Testing mode. Click **Advanced → Go to InboxAI (unsafe)** during dev.
- **Notion "object_not_found"** — you forgot to share the database with the integration (Add connections).
- **Groq 401** — bad API key, or you regenerated it but didn't restart `npm run dev`.
- **Empty inbox in dashboard** — your inbox might genuinely be zero. Try sending yourself an unread test email.

---

## Security notes

- Tokens live in the encrypted JWT session — they never touch the browser.
- `.env.local` is gitignored. **Never** commit it.
- The `/api/cron/check` route is gated by `CRON_SECRET`.
- For production: persist refresh tokens server-side (Redis / Postgres) and use them in the cron instead of passing access tokens.
