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
  // flash and flash-lite have SEPARATE free-tier quotas — when one is
  // exhausted (429), the other usually still has headroom
  const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

  const callModel = async (
    model: string,
    contents: { role: 'user' | 'model'; text: string }[],
    withSearch: boolean
  ) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_KEY as string },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: contents.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
          // internet access: Google Search grounding (free-tier daily quota)
          ...(withSearch ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
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

  const tryModels = async (
    contents: { role: 'user' | 'model'; text: string }[],
    withSearch: boolean
  ) => {
    for (const m of MODELS) {
      try {
        return await callModel(m, contents, withSearch);
      } catch {}
    }
    return null;
  };

  const recent = history.slice(-12);
  const lastUser = [...history].reverse().find((h) => h.role === 'user')?.text ?? '';

  // 1. grounded (real internet) when quota allows
  const grounded = await tryModels(recent, true);
  if (grounded) return grounded;

  // 2. grounding quota gone — fetch live data ourselves from free keyless
  //    APIs and let a model phrase it
  let live: string | null = null;
  try {
    live = await fetchLiveData(lastUser);
  } catch {}
  if (live) {
    const withData = [
      ...history.slice(-11),
      {
        role: 'user' as const,
        text: `${lastUser}\n\n[LIVE DATA fetched seconds ago — trust it and answer with it, mention it's live]:\n${live}`,
      },
    ];
    const phrased = await tryModels(withData, false);
    if (phrased) return phrased;
    // 3. every model is rate-limited — the data is still real, serve it raw
    return `📡 Live data:\n${live}`;
  }

  // 4. plain model chat (no fresh data needed)
  const plain = await tryModels(recent, false);
  if (plain) return plain;

  return "I'm super popular right now and hit my thinking limit 😅 Give me a minute and ask again!";
}

// ---------- free keyless live-data sources ----------
const CCY: Record<string, string> = {
  rupee: 'INR', rupees: 'INR', inr: 'INR', dirham: 'AED', dirhams: 'AED', aed: 'AED',
  dollar: 'USD', dollars: 'USD', usd: 'USD', euro: 'EUR', euros: 'EUR', eur: 'EUR',
  pound: 'GBP', gbp: 'GBP', yen: 'JPY', jpy: 'JPY', riyal: 'SAR', sar: 'SAR',
  dinar: 'KWD', kwd: 'KWD', qar: 'QAR', cad: 'CAD', aud: 'AUD', chf: 'CHF', cny: 'CNY',
};

async function fetchLiveData(q: string): Promise<string | null> {
  const lower = q.toLowerCase();

  // currency: "inr to aed", "dollar rate", "convert 100 rupees to dirhams"
  const codes = Object.keys(CCY).filter((k) => new RegExp(`\\b${k}\\b`, 'i').test(lower)).map((k) => CCY[k]);
  const uniq = [...new Set(codes)];
  if (uniq.length >= 2 && /rate|convert|exchange|to|in|how much|price/i.test(lower)) {
    const [from, to] = uniq;
    const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    if (r.ok) {
      const d = await r.json();
      const rate = d?.rates?.[to];
      if (rate) return `Exchange rate: 1 ${from} = ${rate} ${to} (source: open.er-api.com, updated ${d.time_last_update_utc ?? 'today'})`;
    }
  }

  // weather: "weather in dubai", "will it rain in kochi"
  if (/weather|temperature|rain|forecast|hot|cold|humid/i.test(lower)) {
    const m = lower.match(/(?:in|at|for)\s+([a-z\s]{2,30}?)(?:\?|$|today|tomorrow|now)/i);
    const city = (m?.[1] ?? '').trim();
    if (city) {
      const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      if (g.ok) {
        const gd = await g.json();
        const loc = gd?.results?.[0];
        if (loc) {
          const w = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2`
          );
          if (w.ok) {
            const wd = await w.json();
            return `Weather for ${loc.name}, ${loc.country ?? ''}: now ${wd.current?.temperature_2m}°C, humidity ${wd.current?.relative_humidity_2m}%, wind ${wd.current?.wind_speed_10m} km/h. Today max ${wd.daily?.temperature_2m_max?.[0]}°C / min ${wd.daily?.temperature_2m_min?.[0]}°C, rain chance ${wd.daily?.precipitation_probability_max?.[0]}%. Tomorrow max ${wd.daily?.temperature_2m_max?.[1]}°C, rain chance ${wd.daily?.precipitation_probability_max?.[1]}%.`;
          }
        }
      }
    }
  }

  // news / scores / prices / anything current: Google News RSS (keyless)
  if (/news|today|latest|current|score|won|match|price|stock|bitcoin|election|update on/i.test(lower)) {
    const r = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
    );
    if (r.ok) {
      const xml = await r.text();
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/g)]
        .slice(0, 5)
        .map((m2) => `• ${decodeXml(m2[1])} (${m2[2].slice(0, 16)})`);
      if (items.length) return `Latest headlines from Google News:\n${items.join('\n')}`;
    }
  }

  return null;
}

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
