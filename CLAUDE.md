# CLAUDE.md — Bazingga (Claude Code Build)

> Auto-read by Claude Code. Full project context for any Claude instance. Last updated: July 2, 2026. Supersedes the old Blink.new plan.

@AGENTS.md

## Owner & Constraints

- **Nikhil** — IT Manager, father of 3 (incl. a baby). ~10 hrs/week in 45-min sprints (evenings + weekend mornings).
- **NOT a coder.** Claude Code does ALL coding. Explain things simply. Give copy-paste terminal commands with plain-English explanations.
- **Communication style:** bullet points, co-founder energy, brutally honest on practical matters. No long paragraphs.
- Family time is protected. Never suggest all-nighters or huge sessions.
- **HARD RULE:** never use company (NewTech) resources — no Azure, no company tenants/accounts/services. Personal accounts + Nikhil's laptop only.
- **Machine:** Windows 11 laptop (not Mac — ignore Homebrew steps in docs/SETUP_GUIDE.md). Node v24, npm, git installed. Shell = PowerShell.

## The Product

**Bazingga** — global social-first messenger (WhatsApp simplicity + Telegram power + Snapchat energy) with a signature AI layer. Target: global youth + families. Family-safe, premium.

- **Logo:** red/yellow lightning bolt in chat bubble (exists — never regenerate). Drop file at `assets/logo.png` to replace the placeholder in `src/components/Logo.tsx`.
- **Colors:** Red #E10600 (primary actions only), Yellow #F6B800 (accents), Black #0B0B0B (dark base), White #FFFFFF, soft greys — see `src/theme/colors.ts`
- **Tagline:** "Fast. Private. Expressive."
- **Design rules:** dark-mode first, rounded UI, smooth animations, premium not childish, NO AI-generated faces — gradients/typography/icons only
- **Signature onboarding:** animated text: "Hi." → "Hello." → "Let's talk." → "Welcome to Bazingga." (fade + slide-up, ~700ms per phrase, logo pulse at end)

## Stack (DECIDED — do not relitigate)

| Layer | Choice | Why |
|---|---|---|
| App | React Native + Expo SDK 57 (managed workflow, TypeScript) | Android now, iOS later, same code |
| Builds | EAS Build cloud | APK without Android Studio |
| Backend | Supabase free tier | Auth, Postgres, Realtime, Storage |
| AI (Smart Replies) | Google Gemini Flash via a thin provider wrapper | Free tier covers MVP; swappable |
| Testing | Expo Go on Nikhil's Android phone | Instant reload, zero setup |
| Builder | Claude Code on Nikhil's Windows laptop | This repo |

- Old Blink.new build (Dec 2025) is retired. Its UI is the visual reference: animated onboarding, branded login (phone+email buttons), chat list with filter tabs (All/Friends/Family/Work), unread badges, bottom nav (Chats/Moments/Discover/Calls/Profile). Recreate that look in React Native.

## Engineering Rules for Claude Code

- Keep it simple: Expo managed workflow, TypeScript, no unnecessary libraries.
- AI provider behind `src/services/ai.ts` interface — swapping Gemini→OpenAI/Claude must be a 5-minute change.
- Secrets in `.env` (never committed). Provide `.env.example`.
- Every session: small scope, runnable result, commit with clear message.
- Supabase Row Level Security ON from day one (privacy is brand identity).
- Rate-limit + cache AI calls. AI failures fail silently in UI (hide chips, never error toasts).
- After each working feature, update `docs/PROGRESS_LOG.md` (3 lines).

## MVP Scope (Phase 1 only — guard this hard)

IN: phone OTP auth (email fallback), profiles, 1:1 realtime text chat, delivery ticks, chat list, AI Smart Replies (3 chips above keyboard, toggleable), text Moments (24h expiry), push notifications, block/report.
OUT (defer, don't build): groups, media messages, calls, mood engine, translate, summary, bots, big files, channels, monetization, avatars, iOS.

## Database Schema

See `docs/SUPABASE_SCHEMA.sql` — paste into Supabase SQL editor. Tables: users, chats, chat_members, messages, moments, moment_views, blocks, reports.

## Milestones

1. **M1:** App runs on Nikhil's phone via Expo Go with onboarding + login UI ← Sprint 1 code done 2 Jul 2026, awaiting phone test
2. **M2:** Real auth works (OTP), profile saved
3. **M3:** Two accounts exchange realtime messages
4. **M4:** Smart Replies live (Gemini)
5. **M5:** Text Moments + push notifications
6. **M6:** Signed APK via EAS → Google Play internal testing
7. **LAUNCH:** Play Store public (~Sep-Oct 2026). iOS after traction.

## Post-Launch (Cowork's job, not Code's)

Social pages + content (Canva connected, Higgsfield for AI video ads), store listing copy, landing page, growth experiments.
