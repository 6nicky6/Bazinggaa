// Shared app types
export type ChatFilter = 'All' | 'Friends' | 'Family' | 'Work';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type Message = {
  id: string;
  chatId: string;
  senderId: string; // 'me' or contact id
  text: string;
  sentAt: number;
  status: MessageStatus;
};

export type Contact = {
  id: string;
  name: string;
  username: string;
  status: string;
  gradient: readonly [string, string];
  initials: string;
  group: 'Friends' | 'Family' | 'Work';
  online: boolean;
};

export type Chat = {
  id: string;
  contactId: string;
  pinned?: boolean;
  muted?: boolean;
};

export type Moment = {
  id: string;
  authorId: string; // 'me' or contact id
  text: string;
  gradient: readonly [string, string];
  createdAt: number;
  expiresAt: number;
  views: string[]; // viewer ids
};

export type CallLog = {
  id: string;
  contactId: string;
  at: number;
  direction: 'incoming' | 'outgoing';
  missed: boolean;
  video: boolean;
};

export type Profile = {
  name: string;
  username: string;
  phone: string;
  statusText: string;
  avatarEmoji: string;
  avatarGradient: readonly [string, string];
};
