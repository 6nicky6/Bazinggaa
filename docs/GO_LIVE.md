# Go Live Checklist — 10 minutes, from any browser

Do these from the office (personal email only). Paste the 3 keys back to
Claude Code afterwards — the app flips from demo to live automatically.

## 1. Supabase (~6 min)

1. Go to **supabase.com** → Sign up with your PERSONAL email → New project
   - Name: `bazingga` · Database password: anything strong (save it) · Region: closest to UAE
2. Wait ~2 min for the project to provision
3. Left sidebar → **SQL Editor** → New query → paste the ENTIRE contents of
   `docs/SUPABASE_SCHEMA.sql` → **Run** (should say "Success")
4. Left sidebar → **Authentication → Sign In / Up → Email** → make sure
   **Email OTP** is enabled (it is by default). Phone/SMS needs Twilio — skip it,
   we launch with email login (free); SMS can come later.
5. Left sidebar → **Project Settings → API** → copy two values:
   - `Project URL` (https://xxxx.supabase.co)
   - `anon public` key (long string starting with eyJ…)

## 2. Gemini key (~2 min)

1. Go to **aistudio.google.com** → sign in with your PERSONAL Google account
2. **Get API key** → Create API key → copy it

## 3. Hand off (~1 min)

Paste all three into the Claude Code chat like this:

```
SUPABASE_URL: https://xxxx.supabase.co
SUPABASE_ANON_KEY: eyJ...
GEMINI_KEY: AIza...
```

Claude Code will create `.env` (never committed), restart the server, and
verify live signup + realtime chat.

## Notes

- Email OTP codes arrive from `noreply@mail.app.supabase.io` — check spam
  the first time.
- Free tiers cover the whole MVP: Supabase (500MB DB, 50k monthly users),
  Gemini Flash (rate-limited but plenty for testing).
- Phone SMS login: later, needs Twilio (~$1/mo trial). The app already
  supports it — it's just a Supabase settings toggle + Twilio keys.
