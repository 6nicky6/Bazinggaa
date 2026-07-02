// Dummy data for Sprint 1 UI. Replaced by real Supabase data in Sprint 3.
export type ChatFilter = 'All' | 'Friends' | 'Family' | 'Work';

export type DummyChat = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  avatarColor: string;
  initials: string;
  group: Exclude<ChatFilter, 'All'>;
};

export const FILTERS: ChatFilter[] = ['All', 'Friends', 'Family', 'Work'];

export const DUMMY_CHATS: DummyChat[] = [
  {
    id: '1',
    name: 'Aisha',
    preview: 'Did you see the game last night?? 🔥',
    time: '7:42 PM',
    unread: 3,
    avatarColor: '#7C3AED',
    initials: 'A',
    group: 'Friends',
  },
  {
    id: '2',
    name: 'Mom',
    preview: 'Call me when you are free beta',
    time: '6:15 PM',
    unread: 1,
    avatarColor: '#0891B2',
    initials: 'M',
    group: 'Family',
  },
  {
    id: '3',
    name: 'Rahul (Work)',
    preview: 'Sent the deck, review before standup',
    time: '4:03 PM',
    unread: 0,
    avatarColor: '#16A34A',
    initials: 'R',
    group: 'Work',
  },
  {
    id: '4',
    name: 'Zara',
    preview: 'hahaha that meme is exactly you',
    time: 'Yesterday',
    unread: 5,
    avatarColor: '#DB2777',
    initials: 'Z',
    group: 'Friends',
  },
  {
    id: '5',
    name: 'Dad',
    preview: 'Good morning 🌞',
    time: 'Yesterday',
    unread: 0,
    avatarColor: '#EA580C',
    initials: 'D',
    group: 'Family',
  },
];
