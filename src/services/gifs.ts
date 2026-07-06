// GIF search via Tenor (Google) REST API — pure fetch, ships OTA.
// Key lives in EXPO_PUBLIC_TENOR_API_KEY (Google Cloud, same project as Gemini).
// Fails silently to [] like every other network feature — the UI just shows
// an empty state, never an error toast.
const KEY = process.env.EXPO_PUBLIC_TENOR_API_KEY;
const CLIENT = 'bazingga';
const BASE = 'https://tenor.googleapis.com/v2';

export type Gif = {
  id: string;
  preview: string; // tinygif (grid thumbnail, cheap to load)
  full: string;    // gif (what gets sent)
  desc: string;
};

export const gifsEnabled = () => !!KEY;

function mapResults(json: any): Gif[] {
  return (json?.results ?? [])
    .map((r: any) => {
      const mf = r.media_formats ?? {};
      const preview = mf.tinygif?.url ?? mf.nanogif?.url ?? mf.gif?.url;
      const full = mf.gif?.url ?? mf.tinygif?.url;
      if (!preview || !full) return null;
      return { id: String(r.id), preview, full, desc: r.content_description ?? 'GIF' };
    })
    .filter(Boolean) as Gif[];
}

// simple in-memory cache so re-opening the panel / re-typing is instant
const cache = new Map<string, Gif[]>();

export async function trendingGifs(): Promise<Gif[]> {
  if (!KEY) return [];
  const hit = cache.get('__featured');
  if (hit) return hit;
  try {
    const res = await fetch(
      `${BASE}/featured?key=${KEY}&client_key=${CLIENT}&limit=24&media_filter=tinygif,gif&contentfilter=medium`
    );
    if (!res.ok) return [];
    const out = mapResults(await res.json());
    if (out.length) cache.set('__featured', out);
    return out;
  } catch {
    return [];
  }
}

export async function searchGifs(query: string): Promise<Gif[]> {
  if (!KEY) return [];
  const q = query.trim().toLowerCase();
  if (!q) return trendingGifs();
  const hit = cache.get(q);
  if (hit) return hit;
  try {
    const res = await fetch(
      `${BASE}/search?q=${encodeURIComponent(q)}&key=${KEY}&client_key=${CLIENT}&limit=24&media_filter=tinygif,gif&contentfilter=medium`
    );
    if (!res.ok) return [];
    const out = mapResults(await res.json());
    if (out.length) cache.set(q, out);
    return out;
  } catch {
    return [];
  }
}
