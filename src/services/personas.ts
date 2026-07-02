// Mock-mode personas: the contacts that make the app feel alive before
// Supabase is connected. Replaced by real users in live mode.
import { gradients } from '../theme/colors';
import { CallLog, Contact, Message, Moment } from '../types';

export const CONTACTS: Contact[] = [
  { id: 'aisha', name: 'Aisha', username: 'aisha_k', status: 'Living my best life ✨', gradient: gradients.avatar1, initials: 'A', group: 'Friends', online: true },
  { id: 'mom', name: 'Mom', username: 'mom', status: 'Family first ❤️', gradient: gradients.avatar2, initials: 'M', group: 'Family', online: true },
  { id: 'rahul', name: 'Rahul (Work)', username: 'rahul_pm', status: 'In meetings 9-5', gradient: gradients.avatar3, initials: 'R', group: 'Work', online: false },
  { id: 'zara', name: 'Zara', username: 'zarazara', status: 'probably eating 🍜', gradient: gradients.avatar4, initials: 'Z', group: 'Friends', online: true },
  { id: 'dad', name: 'Dad', username: 'dad', status: 'Hey there! I am using Bazingga', gradient: gradients.avatar5, initials: 'D', group: 'Family', online: false },
  { id: 'sana', name: 'Sana', username: 'sana.designs', status: 'design is life 🎨', gradient: gradients.avatar1, initials: 'S', group: 'Work', online: true },
  { id: 'omar', name: 'Omar', username: 'omar10', status: 'gym → work → gym', gradient: gradients.avatar3, initials: 'O', group: 'Friends', online: false },
];

// Keyword-aware canned replies per persona, so conversations feel real.
const GENERIC: Record<string, string[]> = {
  greeting: ['Heyyy! 👋', 'Hi hi!', 'Yo! what\'s up?', 'Heyy, was just thinking about you'],
  question: ['Hmm let me think about that 🤔', 'Good question... honestly not sure', 'Yes! 100%', 'Haha why do you ask? 😄'],
  laugh: ['😂😂😂', 'HAHAHA stop', 'I\'m crying 😭😂', 'lmaooo'],
  love: ['❤️❤️', 'Aww ❤️', 'Love you too!', '🥹❤️'],
  ok: ['👍', 'Cool cool', 'Perfect 👌', 'Done deal'],
  default: ['That\'s awesome!', 'No way, really?', 'Tell me more!', 'Interesting... 👀', 'Wait what 😮', 'Totally agree', 'Hmm, and then?', 'Send pics or it didn\'t happen 📸'],
};

const PERSONA_FLAVOR: Record<string, string[]> = {
  mom: ['Did you eat? 🍲', 'Call me when free beta', 'Don\'t sleep late!', 'Proud of you ❤️'],
  dad: ['Good good.', 'Ok 👍', 'Check the car oil this weekend', 'Watch the news today?'],
  rahul: ['Let\'s sync on this tomorrow', 'Can you review the deck?', 'Standup at 9:30, don\'t forget', 'Client loved it btw 🎉'],
  aisha: ['omg yes!!', 'We NEED to hang this weekend', 'Did you see the game?? 🔥', 'brb 2 min'],
  zara: ['hahaha that\'s so you', 'wait I have tea ☕ call me', 'nooo wayyy', 'I\'m obsessed 😍'],
  sana: ['That layout is so clean 😍', 'Fonts matter, fight me', 'Send me the file?', 'Working late again 🎨'],
  omar: ['Gym at 6?', 'Bro 💪', 'Say less.', 'Protein first, questions later'],
};

export function pickReply(contactId: string, incoming: string): string {
  const t = incoming.toLowerCase();
  let pool: string[];
  if (/^(hi|hey|hello|yo|salam|hii+)\b/.test(t)) pool = GENERIC.greeting;
  else if (t.includes('?')) pool = GENERIC.question;
  else if (/(haha|lol|😂|funny)/.test(t)) pool = GENERIC.laugh;
  else if (/(love|miss|❤️)/.test(t)) pool = GENERIC.love;
  else if (/^(ok|okay|sure|yes|done|👍)/.test(t)) pool = GENERIC.ok;
  else pool = GENERIC.default;
  // 35% chance of persona flavor instead, keeps each contact distinct
  const flavor = PERSONA_FLAVOR[contactId];
  if (flavor && Math.random() < 0.35) pool = flavor;
  return pool[Math.floor(Math.random() * pool.length)];
}

const now = Date.now();
const min = 60_000;
const hr = 3_600_000;

export function seedMessages(): Message[] {
  const m = (id: string, chatId: string, senderId: string, text: string, ago: number, status: Message['status'] = 'read'): Message => ({
    id, chatId, senderId, text, sentAt: now - ago, status,
  });
  return [
    m('s1', 'aisha', 'aisha', 'Did you see the game last night?? 🔥', 4 * hr),
    m('s2', 'aisha', 'me', 'YES. That last minute goal 😱', 3.9 * hr),
    m('s3', 'aisha', 'aisha', 'We need to watch the next one together', 3.8 * hr),
    m('s4', 'mom', 'mom', 'Call me when you are free beta', 6 * hr),
    m('s5', 'rahul', 'rahul', 'Sent the deck, review before standup', 9 * hr),
    m('s6', 'rahul', 'me', 'On it, will send comments tonight', 8.5 * hr),
    m('s7', 'zara', 'zara', 'hahaha that meme is exactly you', 26 * hr),
    m('s8', 'dad', 'dad', 'Good morning 🌞', 28 * hr),
    m('s9', 'welcome', 'sana', 'Heard you joined Bazingga! Welcome 🎉', 50 * min),
  ];
}

export function seedMoments(): Moment[] {
  return [
    { id: 'mo1', authorId: 'aisha', text: 'Best coffee in town, fight me ☕🔥', gradient: gradients.avatar1, createdAt: now - 2 * hr, expiresAt: now + 22 * hr, views: [] },
    { id: 'mo2', authorId: 'zara', text: 'new week, new me (same me) 😌', gradient: gradients.avatar4, createdAt: now - 5 * hr, expiresAt: now + 19 * hr, views: [] },
    { id: 'mo3', authorId: 'omar', text: 'Leg day. Pray for me 🏋️', gradient: gradients.avatar3, createdAt: now - 8 * hr, expiresAt: now + 16 * hr, views: [] },
  ];
}

export function seedCalls(): CallLog[] {
  return [
    { id: 'c1', contactId: 'mom', at: now - 3 * hr, direction: 'incoming', missed: false, video: false },
    { id: 'c2', contactId: 'aisha', at: now - 7 * hr, direction: 'outgoing', missed: false, video: true },
    { id: 'c3', contactId: 'rahul', at: now - 25 * hr, direction: 'incoming', missed: true, video: false },
    { id: 'c4', contactId: 'zara', at: now - 30 * hr, direction: 'outgoing', missed: false, video: false },
    { id: 'c5', contactId: 'dad', at: now - 49 * hr, direction: 'incoming', missed: false, video: true },
  ];
}
