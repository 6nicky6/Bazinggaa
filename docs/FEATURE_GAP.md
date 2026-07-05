# Bazingga — Vision vs. Reality (Feature Gap Report)

> Generated 5 Jul 2026 by auditing the actual code in `src/` against the original ChatGPT planning vision.
> Coverage note: one document extractor crashed during the automated run; that file ("Bazinggaa - ChatGPT Conv i saved.docx") was subsequently read in full manually and reconciled — its content overlapped the other two docs except Unified Inbox, added below. All 3 source documents are now fully covered.
> Plain-English status for every feature the vision ever mentioned.

**How to read the statuses:**

| Status | Meaning |
|---|---|
| ✅ BUILT | Works today (in the current APK / demo mode) |
| 🟡 PARTIAL | The screen or mechanism exists, but a real piece is still pending (backend, streams, or a button to trigger it) |
| ❌ MISSING | Nothing exists in the code yet |
| ⏳ DEFERRED | Nothing built — but that's on purpose; CLAUDE.md / ROADMAP.md documents it as a later phase |

**Big picture:** the MVP core (onboarding, login, 1:1 chat, Smart Replies, text Moments, notifications, block/report) is genuinely built and live-capable. The biggest *unplanned* gaps in the core vision are the message-level actions (reactions, reply, forward, delete) and the social layer around Moments (reactions, reply-to-chat, Close Friends/Family circles). Several "important" settings screens (dark/light toggle, storage, language, disappearing messages, Saved Messages) have nothing yet and aren't on the roadmap either.

---

## 1. Onboarding & Auth

| Feature | Status | Note |
|---|---|---|
| Apple-style animated onboarding (Hi. / Hello. / Let's talk. / Welcome) | ✅ BUILT | `OnboardingScreen.tsx` — word-by-word spring reveal, haptics, progress dots, exactly the vision sequence |
| Phone OTP login | 🟡 PARTIAL | Full flow coded (`PhoneScreen`, `OtpScreen`, Supabase SMS) but real SMS needs Twilio (paid) — email is the working path today |
| Email login | ✅ BUILT | Email OTP works live end-to-end (free path, OTP-length bug fixed in APK #4) |
| Google login | ❌ MISSING | No Google sign-in button or Supabase OAuth wiring anywhere |

## 2. Navigation

| Feature | Status | Note |
|---|---|---|
| 5-tab bottom nav: Chats / Moments / Discover / Calls / Profile | ✅ BUILT | Frosted-glass tab bar in `navigation/index.tsx` — matches the vision exactly |

## 3. Chat & Messaging

| Feature | Status | Note |
|---|---|---|
| 1-to-1 chat | ✅ BUILT | Realtime via Supabase + a 3.5s polling safety net; verified live between two real accounts |
| Chat list | ✅ BUILT | Unread badges, story rings, filter tabs, search, last-message preview |
| Group chat | 🟡 PARTIAL | Create-group flow, group bubbles + sender names all built; **live** groups blocked until SCHEMA_V3.sql runs on Supabase |
| Message reactions | ❌ MISSING | No long-press, no reaction UI, no DB column |
| Reply / forward / delete messages | ❌ MISSING | No message actions at all (you can delete a whole chat in the store code, but there's no button — and no per-message delete) |
| Typing indicator | 🟡 PARTIAL | Beautiful UI, works with demo contacts + BazinggaBot; real user-to-user typing broadcast doesn't exist in live mode |
| Seen & delivered ticks | 🟡 PARTIAL | Full tick UI (sending→sent→delivered→read); real in live mode only if the DB sets delivered/read — nothing writes those back yet, so live ticks stop at "sent" |
| Search chats & messages | 🟡 PARTIAL | Chat-list search by contact name works; searching *inside* messages doesn't exist |
| Media preview (images, video, voice notes) | 🟡 PARTIAL | Photos + camera work today but images stay **on your device** (no upload/sync between phones); voice has a hold-to-record UI shell only; video not started |
| Pinned chats | 🟡 PARTIAL | Pin logic + pin icon + pinned-first sorting all coded — but no long-press menu to actually pin a chat |
| Chat folders (Family, Friends, Work) | 🟡 PARTIAL | All/Friends/Family/Work filter tabs work in demo; live contacts are all hard-coded "Friends" and there's no way to assign a contact to a folder |
| Premium chat UI (rounded bubbles, one-hand, dark default) | ✅ BUILT | Gradient bubbles, dark-first, one-hand layout — the design rules are followed throughout |

## 4. AI Features

| Feature | Status | Note |
|---|---|---|
| Smart Reply (3 AI chips above keyboard) | ✅ BUILT | Live in `ChatScreen` + `services/ai.ts`; Gemini-ready with mock fallback, toggleable, fails silently as the rules demand |
| BazinggaBot (built-in AI assistant) | ✅ BUILT | Real Gemini contact with memory + typing indicator, lives in the chat list; not yet surfaced in Discover |
| AI Chat Summary | ⏳ DEFERRED | CLAUDE.md MVP "OUT" list; ROADMAP Phase 2 — note: the original vision called this **MVP core** |
| AI Mood Engine | ⏳ DEFERRED | Phase 2 (shown as a "Coming to Bazingga" card in Discover) — vision called it MVP core |
| AI Translate (tone-preserving) | ⏳ DEFERRED | Phase 2 (also a Discover coming-soon card) — vision called it MVP core |
| AI optional / respectful / non-intrusive rule | ✅ BUILT | Toggle exists, AI failures hide silently, no error toasts |
| Per-feature AI on/off controls | 🟡 PARTIAL | One toggle (Smart Replies) exists; a per-feature settings list will only matter once more AI features ship |
| Smart memory of contacts | ❌ MISSING | Idea-stage; nothing built |
| Voice↔text with emotion matching | ❌ MISSING | Idea-stage; nothing built |
| AI meeting mode | ❌ MISSING | Idea-stage; nothing built |
| AI journal / memory moments | ❌ MISSING | Idea-stage; nothing built |
| Semantic conversation rewind | ❌ MISSING | Idea-stage; nothing built |

## 5. Social / Moments

| Feature | Status | Note |
|---|---|---|
| Bazingga Moments (24-hour stories) | 🟡 PARTIAL | **Text** moments with gradients, 24h expiry, story viewer with progress bars + view counts — all live. Photo/video moments and audience selection (Everyone / Contacts / Close Friends / Family) don't exist |
| Reactions to Moments | ❌ MISSING | Viewer has no reaction UI |
| Reply to Moments via private chat | ❌ MISSING | No reply box in the Moment viewer |
| Close Friends & Family Circles | ❌ MISSING | No circles concept anywhere — everything posts to all contacts |
| Status updates with mood | 🟡 PARTIAL | Editable status text exists on the profile; no mood attached to it |
| AI Avatar chats / voice rooms / shared AI playlists | ❌ MISSING | Idea-stage brainstorms; nothing built |
| Unified Inbox (merge WhatsApp/Telegram/SMS/Instagram DMs into one AI feed) | ❌ MISSING | Idea-stage from the original brainstorm. Honest note: WhatsApp/Instagram forbid third-party clients (ToS + technical blocks), so full unification isn't legally buildable; an SMS-inbox integration on Android is the only realistic slice |

## 6. Calls

| Feature | Status | Note |
|---|---|---|
| Audio calls | 🟡 PARTIAL | Real ring-through signaling via Supabase + full call UI — but **no actual audio stream yet** (banner in-app says so honestly; needs WebRTC/Agora + dev-client build) |
| Video calls | 🟡 PARTIAL | Same as audio — signaling + UI live, no video stream |
| Incoming call screen | ✅ BUILT | Dedicated incoming-call UI with accept/decline, wired to realtime signaling |
| Call history & missed calls | ✅ BUILT | `CallsScreen` log with direction + missed flags |
| Group calls (future-ready design) | ❌ MISSING | Not designed or coded; also absent from the roadmap (roadmap Phase 2 only covers 1:1 calls) |

## 7. Power Features (Telegram-style)

| Feature | Status | Note |
|---|---|---|
| Channels (public/private broadcast) | 🟡 PARTIAL | Channel creation, admin-only posting, read-only member view all built; live channels wait on SCHEMA_V3; six "official channels" are written in `data/discover.ts` but not wired to any screen |
| Bots platform (commands, profiles, directory) | ⏳ DEFERRED | ROADMAP Phase 3 ("bot ecosystem"); BazinggaBot is the only bot today |
| Large file sharing | ⏳ DEFERRED | ROADMAP Phase 3 (Cloudflare R2); attach sheet shows Documents as "next update" |
| Saved Messages (personal cloud chat) | ❌ MISSING | No message-yourself chat; not on the roadmap either |

## 8. Discover & Ecosystem

| Feature | Status | Note |
|---|---|---|
| Discover tab (featured bots, trending channels, communities) | 🟡 PARTIAL | Tab exists with trending-topic cards + "Coming to Bazingga" list; the real content (channels/people/stickers tabs in `data/discover.ts`) is written but **not connected to the screen** — already queued as a task |
| Stickers & themes | 🟡 PARTIAL | 5 local sticker packs defined in data + a Sticker button in the attach sheet — but both are placeholders; no theme system at all (dark only) |
| Mini-apps in Discover | ❌ MISSING | Future slot; nothing built |

## 9. Profile, Settings, Privacy & Security

| Feature | Status | Note |
|---|---|---|
| User profile screen | ✅ BUILT | Avatar, @username, status, edit modal |
| Privacy controls | 🟡 PARTIAL | Blocked-users manager works (block/unblock, live-synced); last-seen and read-receipt **toggles** don't exist |
| Block / report | ✅ BUILT | Both wired to the database with confirmation toasts |
| Disappearing messages | ❌ MISSING | No per-chat timer anywhere; not on the roadmap |
| Storage usage management | ❌ MISSING | No storage screen |
| Language & accessibility settings | ❌ MISSING | No language picker or accessibility options |
| Dark / light mode toggle | ❌ MISSING | App is dark-only (the premium default) — there is no light theme or toggle |
| E2E encrypted backups / ghost mode / face-voice locks / context self-destruct | ❌ MISSING | Idea-stage brainstorms; profile screen honestly says "E2E encryption on the roadmap" |

## 10. Monetization & Growth

| Feature | Status | Note |
|---|---|---|
| Bazingga+ subscription | ⏳ DEFERRED | ROADMAP Phase 4 ($2.99/mo plan written down); vision itself said design-only for now |
| Premium themes / AI add-ons / storage upgrades / sticker & avatar items | ⏳ DEFERRED | Phase 4 monetization inventory; nothing coded |
| Invite-based early access | 🟡 PARTIAL | Invite-only beta card + "Invite Friends" share row shipped in APK #3 — the growth hook exists in lite form |
| AI companion bot store / gamified privacy badges | ❌ MISSING | Idea-stage; nothing built |

## 11. Design, Branding & Vision

| Feature | Status | Note |
|---|---|---|
| Brand identity (logo + red/yellow/black palette) | ✅ BUILT | Exact hex colors in `theme/colors.ts` (red for actions, yellow accents, #0B0B0B base); logo component in place |
| Design language (premium, rounded, smooth animations) | ✅ BUILT | Reanimated micro-interactions, glass surfaces, Space Grotesk/Inter, haptics — the WOW pass delivered this |
| No AI-generated faces / stock photos | ✅ BUILT | Gradients, emoji avatars, typography only — rule followed everywhere |
| MVP vs Future visual separation | 🟡 PARTIAL | Discover shows "Phase 2/3" pills and attach sheet says "next update" — but there's no single all-screens design brief marking MVP vs Future |
| AI-first global messenger vision | ✅ BUILT | The direction (WhatsApp simplicity + Telegram power + AI layer, dark premium, family-safe) is faithfully what's in the code |
| Recommended build workflow (Blink.new → FlutterFlow) | ⏳ SUPERSEDED | Deliberately replaced (documented 2 Jul 2026): Claude Code + React Native/Expo + Supabase + Gemini. Better outcome, same backend idea |

---

## 🚨 MISSING FROM CORE — build these next

These were **core** in the original vision, are **not** documented as deferred anywhere, and have nothing in the code today:

1. **Message reactions** — long-press a message to react. Table stakes vs WhatsApp/Telegram. (Already queued as "Parity wave 1".)
2. **Reply / forward / delete messages** — quote-reply, forward to another chat, delete-for-everyone. Also in "Parity wave 1".
3. **Reactions to Moments** — viewers should be able to react from the story viewer.
4. **Reply to Moments via private chat** — the viewer needs a reply box that drops into a 1:1 chat with the poster. This is the loop that makes Moments social.
5. **Close Friends & Family Circles** — circles + audience picker when posting a Moment (Everyone / Contacts / Close Friends / Family). This was a headline differentiator in the vision.

Also worth flagging (core in the vision, currently *deferred* by CLAUDE.md — a deliberate call, but revisit after launch):
- **AI Chat Summary, AI Mood Engine, AI Translate** — the vision listed all three as MVP; the current plan pushes them to Phase 2. Fine for launch speed, but they're the "signature AI layer" selling point.
- **Google login** — the third promised login method; a small Supabase OAuth job.

## ❌ Missing "important" features (not core, but promised)

- **Group calls** — not even a future-ready screen; also absent from ROADMAP.
- **Saved Messages** — personal cloud chat; cheap to build (a chat with yourself).
- **Disappearing messages** — privacy is the brand; this is a visible privacy feature with nothing behind it.
- **Storage usage management** — settings screen not started.
- **Language & accessibility settings** — not started.
- **Dark / light mode toggle** — app is dark-only with no toggle.

## 🟡 PARTIAL — exists, needs finishing

| Feature | What's done | What's left |
|---|---|---|
| Phone OTP login | Full flow coded | Twilio SMS config (paid) or keep email-first |
| Group chat | UI + create flow + demo | Run SCHEMA_V3.sql on Supabase (blocked by their outage) |
| Channels | Create/post/read-only UI | Same SCHEMA_V3; wire official channels into Discover |
| Ticks (delivered/read) | Full UI, demo simulation | Live mode must write delivered_at/read_at back to the DB (queued: "Real presence + read receipts") |
| Typing indicator | UI + demo/bot | Real-user typing broadcast in live mode |
| Media messages | Photos/camera on-device | Supabase Storage upload so images reach the other phone (queued task) |
| Voice notes | Hold-to-record + lock UI | Actual recording + playback + upload (queued task) |
| Pinned chats | Sorting + icon + store logic | A long-press chat menu to trigger pin/unpin (and delete chat) |
| Chat folders | Filter tabs work | Let users assign contacts to Family/Friends/Work; persist per-user |
| Search | Chat-name search | In-message search |
| Moments | Text + 24h + viewer, live | Photo/video moments; audience picker (needs Circles above) |
| Status with mood | Status text | Mood attachment |
| Discover | Tab + static content | Wire `data/discover.ts` channels/people/stickers into real tabs (queued task) |
| Stickers & themes | Data + placeholder button | Sticker sending; any theme system |
| Privacy controls | Blocked users | Last-seen + read-receipt toggles |
| Per-feature AI controls | Smart Replies toggle | Grows automatically as each AI feature ships |
| Audio/video calls | Signaling + full call UI + log | Real media streams (WebRTC/Agora) — needs dev-client APK, planned Phase 2 |
| Invite-based early access | Beta card + share row | Real invite codes/gating if you want true Clubhouse-style scarcity |
| MVP vs Future separation | Phase pills in Discover | A one-page design brief marking every future screen (optional, docs-only) |

---

*Sources: `CLAUDE.md`, `docs/PROGRESS_LOG.md`, `docs/ROADMAP.md`, and a read-through of every screen in `src/screens/`, services in `src/services/`, and the store (`src/store/appStore.ts`) as of 5 Jul 2026.*
