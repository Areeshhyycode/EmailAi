# 📬 InboxAI — AI Email Automation Assistant

> An end-to-end AI-powered email triage pipeline. Connects to Gmail, uses Groq's LLaMA 3.3 to analyze every unread email — categorizing, scoring urgency, detecting sentiment, drafting replies — then pushes action items to Notion and pings Slack for urgent threads. Built with Next.js 14, TypeScript, and Tailwind CSS.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3-f55036)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 What it does

Imagine you have 50 unread emails. Manually reading each one, deciding what's important, and drafting replies takes 1-2 hours. **InboxAI cuts that to 30 seconds.**

| Task | Without InboxAI | With InboxAI |
|------|----------------|--------------|
| Read inbox | Open each email manually | Auto-fetches all unread |
| Categorize | Read & decide yourself | AI tags: `Work` / `Personal` / `Urgent` / `Newsletter` / `Spam` |
| Detect urgency | Guess from subject | AI scores 1–10 with reasoning |
| Detect mood | Read between lines | Sentiment: `positive` / `neutral` / `negative` / `angry` |
| Write replies | Type from scratch | AI drafts polite, context-aware response |
| Track action items | Forget by tomorrow | Auto-creates Notion tasks |
| Get urgent alerts | Check inbox every hour | Slack pings the moment one lands |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     YOU (Browser)                        │
│                http://localhost:3000                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│            NEXT.JS APP (App Router, TypeScript)          │
│                                                          │
│  Frontend (React) ──── API Routes (Node runtime)         │
│  ─────────────────────────────────────────────────────   │
│  • /              landing page                           │
│  • /login         Google OAuth                           │
│  • /dashboard     email cards + AI suggestions           │
│                                                          │
│  • /api/auth/[...nextauth]    NextAuth handler           │
│  • /api/emails/fetch          Gmail + Groq pipeline      │
│  • /api/emails/analyze        on-demand reanalysis       │
│  • /api/emails/reply          send + mark-as-read        │
│  • /api/tasks/create          push to Notion             │
│  • /api/cron/check            background job             │
└──────────────────────┬───────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐
   │ Gmail   │   │  Groq    │   │ Notion  │   │  Slack   │
   │   API   │   │LLaMA 3.3 │   │   API   │   │ Webhook  │
   └─────────┘   └──────────┘   └─────────┘   └──────────┘
   Read/Send     Think/Decide   Save tasks    Send alerts
```

---

## 🛠️ Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| **Framework** | Next.js 14 (App Router) | Full-stack in one codebase — API routes + React UI |
| **Language** | TypeScript | Type safety across frontend & backend |
| **Styling** | Tailwind CSS + lucide-react | Utility-first CSS, clean icons |
| **Auth** | NextAuth.js | Google OAuth with refresh-token rotation |
| **LLM** | Groq SDK (LLaMA 3.3 70B) | Fast, free, structured JSON output |
| **Email** | Google APIs (`gmail.readonly`, `gmail.send`, `gmail.modify`) | Read, send, label messages |
| **Tasks** | Notion SDK | Structured task storage with blocks |
| **Alerts** | Slack Incoming Webhooks | Real-time urgent notifications |
| **Scheduling** | node-cron / Vercel Cron | Background email checks |

---

## 🔄 How it works — Real-World Example

You receive this email at 9 AM:

> **From:** boss@company.com
> **Subject:** URGENT — Client demo Friday
> "The client moved their demo to Friday 3 PM. Please prepare new slides and share the demo URL by Thursday EOD. This is critical."

### Step 1 · Dashboard fetches unread emails
Browser → `GET /api/emails/fetch?limit=10`
Server calls **Gmail API** with `q: "is:unread in:inbox"`.

### Step 2 · Groq analyzes each email in parallel
For every email, a structured prompt is sent to **LLaMA 3.3 70B**:

```typescript
groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    { role: "system", content: STRICT_JSON_TRIAGE_PROMPT },
    { role: "user", content: emailText }
  ],
  temperature: 0.2,
  response_format: { type: "json_object" }
});
```

Groq returns:

```json
{
  "category": "Urgent",
  "sentiment": "neutral",
  "urgency": 9,
  "summary": "Client demo moved to Friday 3 PM; slides + URL needed by Thursday EOD.",
  "needsReply": true,
  "suggestedReply": "Hi, noted. I'll have the new slides and demo URL ready by Thursday EOD.",
  "actionItems": [
    "Prepare new client demo slides",
    "Share demo URL by Thursday EOD",
    "Demo scheduled for Friday 3 PM"
  ]
}
```

All 10 emails run **concurrently via `Promise.all`** — total time ≈ 2 seconds, not 20.

### Step 3 · Dashboard renders cards
Top stats (`10 unread · 3 urgent · 5 need reply · 4 work`) + an editable card per email.

### Step 4 · You click "Send reply"
Frontend → `POST /api/emails/reply` → Gmail sends the message and marks the original as read.

### Step 5 · You click "Create Notion task"
Frontend → `POST /api/tasks/create` → Notion gets a new page in your database with title, summary, action items, and metadata.

### Step 6 · Background cron (optional)
Every 10 minutes, `/api/cron/check` re-runs the pipeline:
- **Urgency ≥ 8?** → ping Slack + star the email
- **Work category or urgency ≥ 7?** → create a Notion task automatically

So urgent emails get triaged even when you're not on the dashboard.

---

## ✨ Features

- 🔐 **Google OAuth 2.0** with automatic refresh-token rotation
- 🤖 **AI categorization** — Work / Personal / Urgent / Newsletter / Promotional / Spam
- 📊 **Urgency scoring (1–10)** with reasoning
- 💭 **Sentiment analysis** — positive / neutral / negative / angry
- ✍️ **AI-drafted replies** you can edit, refine with natural language ("make it shorter and formal"), and send in one click
- 📝 **Auto-extracted action items** pushed to Notion as structured tasks
- 🔔 **Slack alerts** for urgent emails (urgency ≥ 8)
- ⭐ **Auto-star** in Gmail for urgent threads
- ⏰ **Cron-based background processing** for unattended triage
- 📱 **Responsive dashboard** with live stats

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Google account (for Gmail)
- A Groq account (free) — <https://console.groq.com>
- A Notion workspace (free)
- (Optional) A Slack workspace

### 1. Clone & install

```bash
git clone https://github.com/Areeshhyycode/EmailAi.git
cd EmailAi
npm install --legacy-peer-deps
```

### 2. Configure environment

Copy the template and fill in your keys:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

```env
# Groq AI (https://console.groq.com/keys)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Notion (https://www.notion.so/profile/integrations)
NOTION_API_KEY=ntn_...
NOTION_DATABASE_ID=<32-char hex from your database URL>

# Slack (optional)
SLACK_WEBHOOK_URL=

# Cron security
CRON_SECRET=any-random-string
```

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>, click **Connect Gmail**, sign in, and watch the dashboard populate.

---

## 🔑 Getting each API key

<details>
<summary><strong>Groq API key</strong> (free, 1 min)</summary>

1. Go to <https://console.groq.com/keys>
2. Sign in → **Create API Key** → name it `inboxai`
3. Copy the key → paste into `GROQ_API_KEY`

</details>

<details>
<summary><strong>Google OAuth + Gmail API</strong> (10 min)</summary>

1. Open <https://console.cloud.google.com>
2. Create a new project (e.g. `InboxAI`)
3. **APIs & Services → Library** → enable **Gmail API**
4. **APIs & Services → OAuth consent screen**:
   - User type: External, fill required fields
   - Scopes: add `gmail.readonly`, `gmail.send`, `gmail.modify`, `userinfo.email`, `userinfo.profile`, `openid`
   - Add your Gmail as a **Test user**
5. **APIs & Services → Credentials → Create OAuth client ID**:
   - Type: Web application
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy **Client ID** and **Client secret** into `.env.local`

</details>

<details>
<summary><strong>Notion integration + database</strong> (3 min)</summary>

1. Go to <https://www.notion.so/profile/integrations>
2. **New integration** → name it `InboxAI`, type Internal
3. Copy the secret → `NOTION_API_KEY`
4. In Notion, create a new database (full page) — keep the default `Name` (Title) column
5. Open the database → **⋯ → Connections → + Add connections** → pick your integration
6. Copy the 32-char hex from the URL (before `?v=`) → `NOTION_DATABASE_ID`

</details>

<details>
<summary><strong>Slack webhook</strong> (optional)</summary>

1. <https://api.slack.com/apps> → Create New App → From scratch
2. Pick a workspace → **Incoming Webhooks** → On
3. **Add New Webhook to Workspace** → choose a channel
4. Copy the URL → `SLACK_WEBHOOK_URL`

Leave blank to disable Slack alerts (the app skips them silently).

</details>

---

## 📁 Project structure

```
.
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   NextAuth handler
│   │   ├── emails/
│   │   │   ├── fetch/route.ts            Gmail + Groq pipeline
│   │   │   ├── analyze/route.ts          on-demand reanalysis
│   │   │   └── reply/route.ts            send + mark-as-read
│   │   ├── tasks/create/route.ts         push to Notion
│   │   └── cron/check/route.ts           background job
│   ├── dashboard/page.tsx                authenticated UI
│   ├── login/page.tsx                    Google sign-in
│   ├── page.tsx                          landing
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Dashboard.tsx                     stats + email list
│   ├── EmailCard.tsx                     per-email AI card
│   ├── CategoryBadge.tsx                 category/sentiment/urgency pills
│   └── Providers.tsx                     NextAuth SessionProvider
├── lib/
│   ├── auth.ts                           NextAuth + token refresh
│   ├── gmail.ts                          fetch / send / label
│   ├── groq.ts                           analyze + refine drafts
│   ├── notion.ts                         create task pages
│   └── slack.ts                          urgent webhook
├── types/
│   ├── index.ts                          shared types
│   └── next-auth.d.ts                    session augmentation
├── .env.local.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 💡 What this project demonstrates

| Skill | Where in the code |
|-------|-------------------|
| **OAuth 2.0 + token refresh** | [lib/auth.ts](lib/auth.ts) — handles `expires_at`, refresh flow |
| **Async pipelines** | `Promise.all` in [app/api/emails/fetch/route.ts](app/api/emails/fetch/route.ts) |
| **Prompt engineering** | Strict JSON schema in [lib/groq.ts](lib/groq.ts) |
| **External API orchestration** | 4 APIs working in concert |
| **Graceful failure** | Per-email try/catch — one bad email never breaks the batch |
| **Secured background jobs** | `CRON_SECRET` gate on `/api/cron/check` |
| **Full-stack TypeScript** | Shared types in [types/index.ts](types/index.ts) used by both client and server |
| **Server/Client component split** | Server-side data fetching + client-side interactivity |

---

## 🗺️ Roadmap

- [ ] Persist refresh tokens in a database (currently in-memory JWT)
- [ ] Multi-account support (manage multiple Gmail inboxes)
- [ ] Voice summary of daily inbox (ElevenLabs TTS)
- [ ] Smart filtering rules (auto-archive promos, route invoices to a folder)
- [ ] Vector embeddings + similarity search across email history
- [ ] Per-user analytics: response time, top senders, sentiment trends

---

## 🔒 Security notes

- `.env.local` is gitignored — never commit your secrets.
- Access tokens live only in the encrypted JWT session, never in browser localStorage.
- The `/api/cron/check` route requires `CRON_SECRET` query token.
- For production, persist refresh tokens server-side (Redis / Postgres) and rotate access tokens in the cron rather than passing them in the URL.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `Access blocked: This app's request is invalid` | The redirect URI must be **exactly** `http://localhost:3000/api/auth/callback/google` |
| `Google hasn't verified this app` | Normal in Testing mode → click **Advanced → Go to InboxAI (unsafe)** |
| Notion: `object_not_found` | You forgot to **add the integration as a connection** on the database |
| Groq: 401 Unauthorized | Bad API key, or you regenerated it and didn't restart `npm run dev` |
| Dashboard empty | Either your inbox truly has no unread, or the token expired — sign out and back in |
| `npm install` peer-dep error | Run `npm install --legacy-peer-deps` |

---

## 📄 License

MIT © [Areesha](https://github.com/Areeshhyycode)

---

<p align="center">
  Built with ❤️ for inboxes that never sleep.
</p>
