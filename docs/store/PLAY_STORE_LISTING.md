# Bazingga — Google Play Store Listing Pack

> Everything to copy-paste into Play Console when the $25 dev account is ready.
> Fill order in Play Console: App details → Store listing → Data safety → Content rating → Internal testing.

## App details

- **App name (30 chars max):** `Bazingga — Fast. Private.`  *(25 chars)*
  - Alternative if rejected: `Bazingga Messenger`
- **Category:** Communication
- **Tags:** messenger, chat, private
- **Email:** (Nikhil's personal email — NOT the NewTech one)
- **Free / Paid:** Free (no ads, no payments at launch — Bazingga+ screen is informational only)

## Short description (80 chars max)

`Fast, private messaging with AI smart replies, voice notes & 24h Moments.` *(74 chars)*

## Full description (4000 chars max)

```
⚡ Bazingga — Fast. Private. Expressive.

The messenger that combines the simplicity you love with the power you've always wanted — plus an AI layer that actually helps.

💬 CHAT, PERFECTED
• Lightning-fast 1:1 messaging with delivery & read ticks
• Reply to any message with quotes, react with emoji, forward, star
• Delete for everyone, saved messages, chat wallpapers
• Voice notes — hold to record, slide up to lock
• Photo sharing that just works

🤖 AI THAT WORKS FOR YOU
• Smart Replies — three tap-to-send suggestions above your keyboard
• Summarize any chat in one tap ✨
• Instant in-chat translation 🌐
• Mood Engine — your chat subtly reflects the vibe
• BazinggaBot — your built-in AI assistant with live web answers

🌅 MOMENTS
• Share text moments that disappear in 24 hours
• React and reply straight into a private chat
• Close Friends & Family circles — you choose exactly who sees what

🔒 PRIVATE BY DESIGN
• Server-enforced access rules on every table from day one
• Block & report built in
• No ads. We don't sell your data. Ever.

👨‍👩‍👧‍👦 FAMILY-SAFE
Built by a dad of three who wanted a messenger the whole family can use.

⚡ AND IT'S FAST
Premium dark design, buttery animations, instant delivery.

Bazingga is free. Optional Bazingga+ extras (premium themes, unlimited AI, more storage) arrive after launch — always optional, never in your way.

Fast. Private. Expressive. Welcome to Bazingga.
```

## Graphics needed (Nikhil + Claude, Canva or screenshots)

| Asset | Spec | Plan |
|---|---|---|
| App icon | 512×512 PNG | export existing logo on #0B0B0B |
| Feature graphic | 1024×500 | logo + "Fast. Private. Expressive." on dark gradient |
| Phone screenshots | min 2, 1080×1920+ | Chat list, Chat w/ reactions+smart replies, Moments, Discover, Profile, Bazingga+ |

Screenshot capture: run app on phone → screenshot each tab (use QA accounts so chats look alive, no real personal data).

## Data safety form (declare honestly)

- **Collects:** Email address (account creation), Phone number (optional SMS login), User content (messages, moments, photos, voice notes), Photos (only if user shares).
- **Shared with third parties:** Message text sent to Google Gemini API for AI features (smart replies / summarize / translate) — declare as "Data shared for app functionality".
- **Encrypted in transit:** Yes (HTTPS everywhere).
- **Deletion:** users can request account deletion (add in-app + email path before public launch).

## Content rating questionnaire (IARC)

- Chat/communication app → answer "Yes" to user interaction, sharing content.
- No gambling, no violence, no sexual content → expect **Teen** or **Everyone 10+** rating.

## Privacy policy URL (required field)

- File ready at `docs/store/privacy-policy.html`.
- Free hosting: GitHub Pages on the Bazinggaa repo → Settings → Pages → deploy from `main` `/docs` folder → URL becomes `https://6nicky6.github.io/Bazinggaa/store/privacy-policy.html`  *(one click by Nikhil — needs repo owner)*.

## Release track plan

1. **Internal testing** first (up to 100 testers, instant review) — Nikhil + family phones.
2. Fix anything found → promote to **Closed testing**.
3. Google requires 12 testers for 14 days for new personal accounts before Production — start internal track EARLY.
4. Production launch ~Sep–Oct 2026 per roadmap.

## Blockers needing Nikhil (5 min each)

- [ ] Pay $25 Google Play developer registration (personal account)
- [ ] Enable GitHub Pages (privacy policy URL)
- [ ] Confirm support email for the listing
