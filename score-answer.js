# PlacementPilot — Backend + Landing Page

This is the full project: the landing page (`index.html`) plus three serverless
API routes (`/api/*`) that keep your Anthropic API key on the server instead of
exposing it in the browser.

## What's in here

```
placementpilot-backend/
├── index.html              ← the landing page (calls /api/* instead of api.anthropic.com directly)
├── api/
│   ├── analyze-resume.js   ← POST — scores an uploaded resume
│   ├── score-answer.js     ← POST — scores a typed mock-interview answer
│   └── waitlist.js         ← POST — saves a waitlist signup
├── package.json
├── .env.example
└── .gitignore
```

## Deploy it (free, ~10 minutes)

**1. Get an Anthropic API key**
Go to https://console.anthropic.com/settings/keys → Create Key. Copy it — you won't be able to see it again.

**2. Push this folder to GitHub**
```bash
cd placementpilot-backend
git init
git add .
git commit -m "PlacementPilot v1"
```
Create a new repo on github.com, then follow its "push an existing repo" instructions.

**3. Deploy on Vercel**
- Go to https://vercel.com → sign up free with your GitHub account
- Click "Add New Project" → import the repo you just pushed
- Before deploying, open **Environment Variables** and add:
  - `ANTHROPIC_API_KEY` = the key from step 1
- Click **Deploy**

That's it — you'll get a live URL like `https://placementpilot.vercel.app`.
The resume scanner and mock interview will now work for anyone who visits that
URL, in any browser, whether or not they're inside Claude.ai.

## Optional: persist the waitlist

Right now `/api/waitlist` accepts signups but doesn't save them anywhere
unless you connect storage — it just logs them (visible in Vercel's function
logs, not lost, but not queryable either).

To actually persist signups:
- In your Vercel project → **Storage** tab → **Create Database** → choose **KV**
- Connect it to this project (Vercel auto-fills `KV_REST_API_URL` and
  `KV_REST_API_TOKEN` as environment variables for you)
- Redeploy — signups will now be saved permanently

If you outgrow KV later, swap it for a real database (Supabase/Postgres is a
good free next step) — the only file you'd touch is `api/waitlist.js`.

## Local testing before you deploy

```bash
npm install -g vercel
npm install
vercel dev
```
This runs the site + API routes on `http://localhost:3000` using a `.env`
file you create from `.env.example` (never commit `.env` — it's already in
`.gitignore`).

## Cost note

Every resume scan and every interview answer now costs a small amount on
your Anthropic account (pay-as-you-go). Fine for testing and a soft launch;
if this gets real traffic, consider adding a simple rate limit (e.g. max 3
free scans per IP/day) in the API routes before sharing the link widely.
