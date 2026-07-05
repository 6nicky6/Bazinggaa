// Discover content. Official Bazingga channels are client-seeded today (they
// work as real, joinable, readable channels in your chat list); they migrate to
// server-backed channels once schema v3 lands. Stickers are local packs.
import { gradients } from '../theme/colors';

export type OfficialChannel = {
  id: string;
  name: string;
  handle: string;
  emoji: string;
  gradient: readonly [string, string];
  category: 'News' | 'Sports' | 'Entertainment' | 'Tech' | 'Lifestyle' | 'Bazingga';
  subscribers: string;
  description: string;
  posts: { text: string; agoMin: number }[];
};

export const OFFICIAL_CHANNELS: OfficialChannel[] = [
  {
    id: 'ch-bazingga', name: 'Bazingga HQ', handle: 'bazingga', emoji: '⚡',
    gradient: gradients.primary, category: 'Bazingga', subscribers: '12.4K',
    description: 'Official news, tips & updates from the Bazingga team.',
    posts: [
      { text: '👋 Welcome to Bazingga! Tap the ⚡ bolt anytime to chat with BazinggaBot — your AI sidekick.', agoMin: 30 },
      { text: '🔒 Your privacy is the whole point. Every chat is protected by server-enforced access rules.', agoMin: 180 },
      { text: '🌙 Try Moments — share a thought that vanishes in 24 hours. Tap the + on the Moments tab.', agoMin: 600 },
    ],
  },
  {
    id: 'ch-news', name: 'World Now', handle: 'worldnow', emoji: '🌍',
    gradient: gradients.avatar2, category: 'News', subscribers: '48.1K',
    description: 'Fast, balanced headlines from around the globe.',
    posts: [
      { text: '📰 Tip: Ask BazinggaBot "today\'s top headlines" — it can search the web live.', agoMin: 45 },
      { text: '🗳️ Follow World Now for morning + evening briefings.', agoMin: 240 },
    ],
  },
  {
    id: 'ch-football', name: 'Football Live', handle: 'footballlive', emoji: '⚽',
    gradient: gradients.avatar3, category: 'Sports', subscribers: '89.7K',
    description: 'Scores, transfers & match threads.',
    posts: [
      { text: '⚽ Match threads every game night. Ask BazinggaBot for live scores anytime!', agoMin: 20 },
      { text: '🔥 Transfer season is heating up. Who\'s your dream signing?', agoMin: 300 },
    ],
  },
  {
    id: 'ch-movies', name: 'Screen Room', handle: 'screenroom', emoji: '🎬',
    gradient: gradients.avatar1, category: 'Entertainment', subscribers: '33.2K',
    description: 'Reviews, trailers & what to watch tonight.',
    posts: [
      { text: '🍿 Weekend watchlist drops every Friday.', agoMin: 90 },
      { text: '🎬 What was the last film that genuinely surprised you?', agoMin: 420 },
    ],
  },
  {
    id: 'ch-tech', name: 'Tech Pulse', handle: 'techpulse', emoji: '💡',
    gradient: gradients.avatar4, category: 'Tech', subscribers: '27.8K',
    description: 'AI, gadgets & the future, decoded.',
    posts: [
      { text: '🤖 AI tip of the day: BazinggaBot can summarize, translate, and brainstorm — just ask.', agoMin: 60 },
      { text: '📱 Fun fact: this whole app was built by a founder + an AI in a few days. ⚡', agoMin: 500 },
    ],
  },
  {
    id: 'ch-food', name: 'Tasty', handle: 'tasty', emoji: '🍜',
    gradient: gradients.avatar5, category: 'Lifestyle', subscribers: '41.0K',
    description: 'Recipes, food trends & where to eat.',
    posts: [
      { text: '🍜 5-minute recipes every day. Save the ones you love with a ⭐ (coming soon).', agoMin: 120 },
      { text: '🥘 What\'s cooking in your kitchen tonight?', agoMin: 360 },
    ],
  },
];

export const DISCOVER_TABS = ['Channels', 'People', 'Stickers'] as const;
export type DiscoverTab = (typeof DISCOVER_TABS)[number];

export const STICKER_PACKS = [
  { id: 'bolt', name: 'Bolt Pack', emojis: ['⚡', '🔥', '💥', '✨', '🌟', '💫', '⭐', '🎇'] },
  { id: 'love', name: 'Love', emojis: ['❤️', '😍', '🥰', '😘', '💕', '💖', '💗', '💝'] },
  { id: 'laugh', name: 'LOL', emojis: ['😂', '🤣', '😆', '😹', '🙈', '💀', '😅', '🤪'] },
  { id: 'react', name: 'Reactions', emojis: ['👍', '👏', '🙏', '🤝', '💪', '🫶', '👌', '🤙'] },
  { id: 'party', name: 'Party', emojis: ['🎉', '🥳', '🎊', '🎈', '🍾', '🎂', '🎁', '🪅'] },
];
