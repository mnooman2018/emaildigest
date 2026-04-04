# EmailDigest 📧

> Turn your Gmail into daily actionable insights with AI

EmailDigest connects to your Gmail account and uses AI to read, rank, summarize, and categorize all your emails received today — so you never miss what's important.

---

## What it does

- 🔐 **Google OAuth login** — securely connect your Gmail account
- 📬 **Reads today's emails** — fetches up to 50 emails from your inbox
- 🤖 **AI-powered ranking** — scores each email by importance (1–10)
- 🗂️ **Smart categorization** — sorts emails into:
  - 📅 Meeting
  - ✅ Task
  - 🏷️ Promo
  - 👤 Personal
  - 📧 Other
- 📝 **AI summaries** — get a one-line summary of every email
- 👁️ **View full email** — read the complete email in a modal
- ↩️ **Reply in Gmail** — opens Gmail in a new tab with reply pre-filled
- 🚪 **Logout** — securely sign out anytime

---

## Tech Stack

- **Frontend** — Next.js 16 (App Router), React, TypeScript
- **Auth** — Supabase Auth with Google OAuth
- **Database** — Supabase (PostgreSQL)
- **Email API** — Gmail API (Google Cloud)
- **AI** — Groq API with Llama 3.3 70B
- **Styling** — Tailwind CSS

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/mnooman2018/emaildigest.git
cd emaildigest
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GROQ_API_KEY=your_groq_api_key
```

### 4. Set up Supabase

Go to your Supabase project and run this in the SQL Editor:
```sql
create table gmail_connections (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) unique,
  access_token text,
  refresh_token text,
  created_at timestamptz default now()
);
```

### 5. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Gmail API**
4. Go to **APIs & Services → Credentials**
5. Create **OAuth 2.0 Client ID**
6. Add authorized redirect URI:
```
   https://your-supabase-project.supabase.co/auth/v1/callback
```
7. Copy the Client ID and Secret into `.env.local`

### 6. Set up Supabase Auth

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Paste your Google Client ID and Secret
3. Go to **Authentication → URL Configuration**
4. Set Site URL to `http://localhost:3000`
5. Add redirect URL: `http://localhost:3000/auth/callback`

### 7. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How it works

1. User clicks **Connect with Google**
2. Google OAuth flow connects Gmail to the app
3. Access and refresh tokens are stored in Supabase
4. Dashboard fetches today's emails via Gmail API
5. Each email is sent to Groq AI for analysis
6. AI returns a summary, importance score, priority, and category
7. Emails are sorted by importance and top 10 are displayed
8. User can view full email or reply directly in Gmail

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | Your app URL (localhost or production) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GROQ_API_KEY` | Groq API key for AI features |

---

## Security

- We only **read** your emails — never send, delete, or modify anything
- Tokens are stored securely in Supabase
- All API calls are server-side only
- `.env.local` is gitignored and never committed

---

## License

MIT