// AI Smart Replies — provider interface per CLAUDE.md engineering rules.
// Swapping Gemini for OpenAI/Claude = implement SmartReplyProvider, change one line.
// Failures are ALWAYS silent: return [] and the UI hides the chips.

export interface SmartReplyProvider {
  suggest(lastMessage: string, contactName: string): Promise<string[]>;
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// simple cache + rate limit (per CLAUDE.md: cache + rate-limit AI calls)
const cache = new Map<string, string[]>();
let lastCall = 0;
const MIN_INTERVAL_MS = 2000;

class GeminiProvider implements SmartReplyProvider {
  async suggest(lastMessage: string, contactName: string): Promise<string[]> {
    const key = lastMessage.trim().toLowerCase();
    const hit = cache.get(key);
    if (hit) return hit;
    if (Date.now() - lastCall < MIN_INTERVAL_MS) return [];
    lastCall = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You suggest 3 short casual chat replies (max 6 words each, match the language and vibe, emojis ok) to this message from ${contactName}: "${lastMessage}". Reply ONLY with the 3 options separated by | no numbering.`,
              }],
            }],
            generationConfig: { maxOutputTokens: 60, temperature: 0.9 },
          }),
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const replies = text.split('|').map((s: string) => s.trim()).filter(Boolean).slice(0, 3);
      if (replies.length) cache.set(key, replies);
      return replies;
    } catch {
      return [];
    }
  }
}

// Mock provider: context-aware canned suggestions. Used until a Gemini key
// exists in .env — the UI is identical, so the feature is fully demoable.
class MockProvider implements SmartReplyProvider {
  async suggest(lastMessage: string): Promise<string[]> {
    const t = lastMessage.toLowerCase();
    await new Promise((r) => setTimeout(r, 350)); // feel like a network call
    if (t.includes('?')) return ['Yes! 👍', 'Hmm, not sure', 'Let me check'];
    if (/(game|match|goal)/.test(t)) return ['What a game 🔥', 'Unreal!!', 'Next one together?'];
    if (/(call|free)/.test(t)) return ['Calling you now 📞', 'Free in 10 mins', 'Can we talk later?'];
    if (/(deck|review|standup|meeting)/.test(t)) return ['On it 👍', 'Will review tonight', 'Looks good so far'];
    if (/(haha|lol|😂|meme)/.test(t)) return ['😂😂😂', 'Stopp hahaha', 'So true'];
    if (/(morning|🌞)/.test(t)) return ['Good morning! ☀️', 'Morning! Slept well?', 'Coffee first ☕'];
    if (/(love|miss|❤️)/.test(t)) return ['❤️❤️', 'Miss you too!', 'Come over soon?'];
    return ['Nice! 😄', 'Tell me more', 'Haha true'];
  }
}

export const smartReplies: SmartReplyProvider = GEMINI_KEY
  ? new GeminiProvider()
  : new MockProvider();

export const aiProviderName = GEMINI_KEY ? 'Gemini Flash (live)' : 'Demo mode (add Gemini key in .env)';
