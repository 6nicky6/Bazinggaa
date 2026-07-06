// GIF search — provider-agnostic. Uses whichever key is present:
//   EXPO_PUBLIC_TENOR_API_KEY  → Tenor (Google)
//   EXPO_PUBLIC_GIPHY_API_KEY  → Giphy
// Pure fetch, ships OTA, fails silently to [] like every other network feature
// (the UI shows an empty state, never an error toast).
const TENOR_KEY = process.env.EXPO_PUBLIC_TENOR_API_KEY;
const GIPHY_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
const provider: 'tenor' | 'giphy' | null = TENOR_KEY ? 'tenor' : GIPHY_KEY ? 'giphy' : null;

export type Gif = {
  id: string;
  preview: string; // small thumbnail for the grid (cheap to load)
  full: string;    // what actually gets sent
  desc: string;
};

export const gifsEnabled = () => provider !== null;

// ---- Tenor mappers/urls ----
const TENOR = 'https://tenor.googleapis.com/v2';
const tenorUrl = (path: string, extra: string) =>
  `${TENOR}/${path}?key=${TENOR_KEY}&client_key=bazingga&limit=24&media_filter=tinygif,gif&contentfilter=medium${extra}`;
function mapTenor(json: any): Gif[] {
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

// ---- Giphy mappers/urls ----
const GIPHY = 'https://api.giphy.com/v1/gifs';
const giphyUrl = (path: string, extra: string) =>
  `${GIPHY}/${path}?api_key=${GIPHY_KEY}&limit=24&rating=pg-13${extra}`;
function mapGiphy(json: any): Gif[] {
  return (json?.data ?? [])
    .map((r: any) => {
      const img = r.images ?? {};
      const preview = img.fixed_width_small?.url ?? img.preview_gif?.url ?? img.fixed_width?.url;
      const full = img.downsized_medium?.url ?? img.fixed_width?.url ?? img.original?.url;
      if (!preview || !full) return null;
      return { id: String(r.id), preview, full, desc: r.title || 'GIF' };
    })
    .filter(Boolean) as Gif[];
}

// simple in-memory cache so re-opening the panel / re-typing is instant
const cache = new Map<string, Gif[]>();

async function fetchGifs(kind: 'trending' | 'search', query: string): Promise<Gif[]> {
  if (!provider) return [];
  const cacheKey = `${kind}:${query}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  try {
    let url: string;
    let mapper: (j: any) => Gif[];
    if (provider === 'tenor') {
      url = kind === 'search' ? tenorUrl('search', `&q=${encodeURIComponent(query)}`) : tenorUrl('featured', '');
      mapper = mapTenor;
    } else {
      url = kind === 'search' ? giphyUrl('search', `&q=${encodeURIComponent(query)}`) : giphyUrl('trending', '');
      mapper = mapGiphy;
    }
    const res = await fetch(url);
    if (!res.ok) return [];
    const out = mapper(await res.json());
    if (out.length) cache.set(cacheKey, out);
    return out;
  } catch {
    return [];
  }
}

export const trendingGifs = () => fetchGifs('trending', '');
export function searchGifs(query: string): Promise<Gif[]> {
  const q = query.trim().toLowerCase();
  return q ? fetchGifs('search', q) : trendingGifs();
}
