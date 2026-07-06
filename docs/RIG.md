# 2-User Chrome Test Rig

Two logged-in Bazingga clients side by side in Nikhil's Chrome, for watching real
2-user behaviour before any OTA. **Aisha QA** and **Omar QA** are real Supabase
accounts (in `.test-accounts.json`).

## Why two origins
Browsers isolate `localStorage` per origin, so two same-machine sessions need two:
- **Aisha** → `http://localhost:8081`
- **Omar** → `http://127.0.0.1:8081`
Same dev server, two independent logins.

## Bring it up
1. Dev server running on 8081 (`preview_start` / `expo start --web`).
2. `python scripts/rig_inject.py` — refreshes both sessions, writes `.qa-rig-inject.json`.
3. In each tab, paste that account's `session` into `localStorage['sb-<ref>-auth-token']`
   and its `persisted` into `localStorage['bazingga-store']`, then reload.
4. Both land on Chats in live mode; `bootLive()` fills chats within ~8s.

## Golden rule (learned the hard way)
Supabase refresh tokens are **single-use and rotate**. Once injected, let ONLY the
browser client refresh — do NOT re-run a PowerShell refresh on the same account, or
the browser's token 401s. Re-mint + re-inject if that happens.

## Verified working (6 Jul 2026)
Bidirectional live delivery: Aisha→Omar and Omar→Aisha both arrive in <5s via the
3.5s poll + realtime net. Smart-reply chips render. This is the standard test surface
for wave 3 — phones only for final native feel (gestures/keyboard/push).
