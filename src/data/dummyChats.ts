// Dummy data for Sprint 1 UI. Replaced by real Supabase data in Sprint 3.
import { gradients } from '../theme/colors';

export type ChatFilter = 'All' | 'Friends' | 'Family' | 'Work';

export type DummyChat = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  gradient: readonly [string, string];
  initials: string;
  group: Exclude<ChatFilter, 'All'>;
  online?: boolean;
  typing?: boolean;
};

export const FILTERS: ChatFilter[] = ['All', 'Friends', 'Family', 'Work'];

export const DUMMY_CHATS: DummyChat[] = [
  {
    id: '1',
    name: 'Aisha',
    preview: 'Did you see the game last night?? 🔥',
    time: '7:42 PM',
    unread: 3,
    gradient: gradients.avatar1,
    initials: 'A',
    group: 'Friends',
    online: true,
    typing: true,
  },
  {
    id: '2',
    name: 'Mom',
    preview: 'Call me when you are free beta',
    time: '6:15 PM',
    unread: 1,
    gradient: gradients.avatar2,
    initials: 'M',
    group: 'Family',
    online: true,
  },
  {
    id: '3',
    name: 'Rahul (Work)',
    preview: 'Sent the deck, review before standup',
    time: '4:03 PM',
    unread: 0,
    gradient: gradients.avatar3,
    initials: 'R',
    group: 'Work',
  },
  {
    id: '4',
    name: 'Zara',
    preview: 'hahaha that meme is exactly you',
    time: 'Yesterday',
    unread: 5,
    gradient: gradients.avatar4,
    initials: 'Z',
    group: 'Friends',
    online: true,
  },
  {
    id: '5',
    name: 'Dad',
    preview: 'Good morning 🌞',
    time: 'Yesterday',
    unread: 0,
    gradient: gradients.avatar5,
    initials: 'D',
    group: 'Family',
  },
];

// Moments teaser row (feature ships in Sprint 5 — UI preview only)
export const DUMMY_MOMENTS = [
  { id: 'me', name: 'You', initials: '+', isMe: true, gradient: gradients.primary },
  { id: 'm1', name: 'Aisha', initials: 'A', gradient: gradients.avatar1 },
  { id: 'm2', name: 'Zara', initials: 'Z', gradient: gradients.avatar4 },
  { id: 'm3', name: 'Mom', initials: 'M', gradient: gradients.avatar2 },
  { id: 'm4', name: 'Rahul', initials: 'R', gradient: gradients.avatar3 },
];
