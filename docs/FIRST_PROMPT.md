# First Prompt for Claude Code (Sprint 1 → Milestone 1)

Paste this as your first message after running `claude` in ~/Bazingga:

---

Read CLAUDE.md fully, then execute Sprint 1:

GOAL: Get Bazingga running on my Android phone via Expo Go with the signature onboarding + login UI. UI only this sprint — no backend yet.

TASKS:
1. Scaffold an Expo (managed) TypeScript app in this folder. Minimal dependencies.
2. Build the onboarding screen: black background (#0B0B0B), animated text sequence "Hi." → "Hello." → "Let's talk." → "Welcome to Bazingga." — fade + slide-up, ~700ms each, smooth easing. Ends on the login screen.
3. Build the login screen: centered logo placeholder (I'll add the real logo file — tell me where to put it), tagline "Fast. Private. Expressive.", two buttons: "Continue with Phone" (white) and "Continue with Email" (outlined), terms text at bottom. Buttons don't need to work yet.
4. Build the chat list screen with dummy data: search bar, filter tabs (All / Friends / Family / Work — red #E10600 active pill), 4-5 fake chats with avatars, preview text, timestamps, unread badges. Bottom nav: Chats, Moments, Discover, Calls, Profile (Chats active, red icon).
5. Start the dev server and give me the exact steps to open it in Expo Go on my phone.

RULES:
- Follow all design rules in CLAUDE.md (dark premium, rounded, red only for primary actions)
- Explain anything I need to do in simple non-coder terms
- When done, update docs/PROGRESS_LOG.md and commit

---

## After Sprint 1 works, next prompts (one per sprint):

- **Sprint 2:** "Connect Supabase: here are my URL and anon key [paste]. Set up auth — phone OTP with email fallback. Run docs/SUPABASE_SCHEMA.sql instructions for me. Make login actually work and save my profile."
- **Sprint 3:** "Build realtime 1:1 chat: chat screen UI, send/receive via Supabase Realtime, timestamps, single-tick delivery. Replace dummy chat list with real data."
- **Sprint 4:** "Add AI Smart Replies with Gemini Flash (key: [paste]). 3 chips above keyboard on received messages, tap to insert, cached, rate-limited, settings toggle, silent failure."
- **Sprint 5:** "Add text Moments (24h expiry) + push notifications per CLAUDE.md scope."
- **Sprint 6:** "Set up EAS Build, generate signed APK, walk me through Google Play internal testing upload."
