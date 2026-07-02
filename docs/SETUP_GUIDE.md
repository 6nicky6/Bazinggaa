# Setup Guide — One-Time Mac Setup (~30-40 min total)

Do these once. Copy-paste each command into Terminal (Cmd+Space → type "Terminal").

## Step 1 — Install Homebrew + Node (10 min)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Then:
```bash
brew install node
```
Check it worked:
```bash
node --version
```
✅ Should print a version number (v20+ is fine).

## Step 2 — Install Claude Code (5 min)

```bash
npm install -g @anthropic-ai/claude-code
```
- Log in with your Claude account when prompted (`claude` command, first run).

## Step 3 — Create the project folder (2 min)

```bash
mkdir -p ~/Bazingga && cd ~/Bazingga
```
- Unzip the Bazingga kit files into this folder (CLAUDE.md + docs/).

## Step 4 — Phone setup (5 min)

- Install **Expo Go** from Play Store on your Android phone
- Phone and Mac must be on the **same WiFi**
- That's it — no Android Studio, no cables

## Step 5 — Free accounts (10 min)

- **Supabase:** supabase.com → New project → name it `bazingga` → save the URL + anon key somewhere safe
- **Gemini API key:** aistudio.google.com → Get API key → save it
- **Expo:** expo.dev → free account (needed later for APK builds)
- (Later, launch week only: Google Play Console — $25)

## Step 6 — Start building (the fun part)

```bash
cd ~/Bazingga
claude
```
- Claude Code opens, auto-reads CLAUDE.md
- Paste the prompt from `docs/FIRST_PROMPT.md`
- Watch it build. Answer its questions. Test on your phone.

## Every future sprint = 3 commands

```bash
cd ~/Bazingga
claude
```
Then tell it what today's sprint goal is (or continue where it left off).
