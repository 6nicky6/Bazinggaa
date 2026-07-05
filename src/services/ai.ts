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
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_KEY as string,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You suggest 3 short casual chat replies (max 6 words each, match the language and vibe, emojis ok) to this message from ${contactName}: "${lastMessage}". Reply ONLY with the 3 options separated by | no numbering.`,
              }],
            }],
            generationConfig: {
              maxOutputTokens: 100,
              temperature: 0.9,
              // flash "thinking" burns the budget before any text — turn it off
              thinkingConfig: { thinkingBudget: 0 },
            },
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

// ---------- AI trio: summarize, translate, mood (silent-fail like everything) ----------
async function gemini(prompt: string, maxTokens = 400): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_KEY as string },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.4,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p.text ?? '')
      .join('')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function summarizeChat(
  lines: { from: string; text: string }[]
): Promise<string | null> {
  const convo = lines.slice(-60).map((l) => `${l.from}: ${l.text}`).join('\n');
  return gemini(
    `Summarize this chat conversation in 3-5 short bullet points (plain language, keep names, note any decisions/plans/questions still open). Reply in the conversation's language.\n\n${convo}`
  );
}

const translateCache = new Map<string, string>();
export async function translateText(text: string, targetLang: string): Promise<string | null> {
  const key = `${targetLang}:${text}`;
  const hit = translateCache.get(key);
  if (hit) return hit;
  const out = await gemini(
    `Translate the following message into ${targetLang}, preserving tone, emoji and informal style. Reply ONLY with the translation.\n\n"${text}"`,
    200
  );
  if (out) translateCache.set(key, out);
  return out;
}

export type ChatMood = 'happy' | 'calm' | 'romantic' | 'serious' | 'neutral';
const moodCache = new Map<string, ChatMood>();
export async function detectMood(chatId: string, texts: string[]): Promise<ChatMood> {
  const hit = moodCache.get(chatId);
  if (hit) return hit;
  const out = await gemini(
    `Classify the overall mood of this conversation as exactly one word from: happy, calm, romantic, serious, neutral.\n\n${texts.slice(-15).join('\n')}`,
    10
  );
  const mood = (['happy', 'calm', 'romantic', 'serious'].includes((out ?? '').toLowerCase().trim())
    ? (out as string).toLowerCase().trim()
    : 'neutral') as ChatMood;
  moodCache.set(chatId, mood);
  return mood;
}
