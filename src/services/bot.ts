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

const SYSTEM = `You are BazinggaBot, the friendly AI inside Bazingga, a fast private expressive messenger app. Personality: upbeat, playful, concise (2-3 sentences max), uses light emoji. You help with anything: questions, jokes, advice, app help (Bazingga has chats, AI smart replies, 24h Moments, and more coming). Never claim features that don't exist. Reply in the user's language.`;

const FALLBACKS = [
  "I'm sharper with my AI brain plugged in — but I'm still great company! ⚡",
  'Ask me again when my Gemini circuits are online 🤖',
  "Here's a free fact: you're using the coolest messenger in town 😄",
];

export async function botReply(history: { role: 'user' | 'model'; text: string }[]): Promise<string> {
  if (!GEMINI_KEY) {
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  }
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_KEY as string },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: history.slice(-12).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
          generationConfig: {
            maxOutputTokens: 250,
            temperature: 0.8,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || FALLBACKS[0];
  } catch {
    return "My brain hiccuped ⚡ Try me again in a moment!";
  }
}
