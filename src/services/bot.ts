// BazinggaBot — a real AI contact everyone can chat with.
// Uses Gemini when a key exists; falls back to witty canned replies in demo.
import { gradients } from '../theme/colors';
import { Contact } from '../types';

export const BOT_ID = 'bazingga-bot';

export const BOT_CONTACT: Contact = {
  id: BOT_ID,
  name: 'BazinggaBot',
  username: 'bazinggabot',
  status: 'Your AI sidekick. Ask me anything ⚡',
  gradient: gradients.bolt,
  initials: '🤖',
  group: 'Friends',
  online: true,
};

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const SYSTEM = `You are BazinggaBot, the friendly AI inside Bazingga, a fast private expressive messenger app. Personality: upbeat, playful, concise (2-3 sentences max), uses light emoji. You help with anything: questions, jokes, advice, app help (Bazingga has chats, AI smart replies, 24h Moments, and more coming). You can search the web for current information (news, scores, weather, facts) — use it when the question needs fresh data. Never claim app features that don't exist. Reply in the user's language.`;

const FALLBACKS = [
  "I'm sharper with my AI brain plugged in — but I'm still great company! ⚡",
  'Ask me again when my Gemini circuits are online 🤖',
  "Here's a free fact: you're using the coolest messenger in town 😄",
];

export async function botReply(history: { role: 'user' | 'model'; text: string }[]): Promise<string> {
  if (!GEMINI_KEY) {
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  }
  const call = async (withSearch: boolean) => {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_KEY as string },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: history.slice(-12).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
          // internet access: Google Search grounding (free-tier daily quota)
          ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.8,
            ...(withSearch ? {} : { thinkingConfig: { thinkingBudget: 0 } }),
          },
        }),
      }
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p: any) => p.text ?? '').join('').trim();
    if (!text) throw new Error('empty');
    return text;
  };

  try {
    return await call(true); // grounded (internet) first
  } catch {
    try {
      return await call(false); // plain model if grounding unavailable
    } catch {
      return "My brain hiccuped ⚡ Try me again in a moment!";
    }
  }
}
