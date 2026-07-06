# Server-side pieces (deployed via Supabase dashboard, recorded here)

Deployed on 6 Jul 2026 through the dashboard editor. These files are the source of truth
copies — if a function needs changing, edit here AND redeploy in the dashboard.

| Piece | What it does | Status |
|---|---|---|
| `push/index.ts` | Sends Expo push notifications on new messages. Triggered by DB webhook `push_on_message` (public.messages INSERT). | LIVE — permanent |
| `sweep/index.ts` | Nightly test-data sweep: inline media messages, uploaded chat media (keeps avatars), calls log, expired moments. Triggered by pg_cron job `nightly-sweep` at `0 20 * * *` UTC (= 00:00 Dubai). | LIVE — **testing only** |

## ⚠️ BEFORE PLAY STORE LAUNCH (task #19)
1. `select cron.unschedule('nightly-sweep');` in the SQL editor
2. Delete the `sweep` function in the dashboard

## Related plumbing
- Webhook: Integrations → Database Webhooks → `push_on_message`
- Cron: Integrations → Cron → `nightly-sweep`
- Push chain: app registers token → `devices` table → webhook → `push` fn → Expo push API → FCM
  (needs the FCM service-account key uploaded at expo.dev credentials + APK #7 with google-services.json)
