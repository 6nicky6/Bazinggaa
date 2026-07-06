// Shared app types
export type ChatFilter = 'All' | 'Friends' | 'Family' | 'Work';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type Message = {
  id: string;
  chatId: string;
  senderId: string; // 'me' or contact id
  text: string;
  imageUri?: string; // local uri (sender's device)
  imageUrl?: string; // remote uri (synced via Supabase Storage — arrives on both sides)
  audioUri?: string; // local voice note
  audioUrl?: string; // synced voice note
  audioDurationSec?: number;
  sentAt: number;
  status: MessageStatus;
  replyToId?: string; // quoted message id
  reactions?: Record<string, string[]>; // emoji -> reactor ids ('me' or uid)
  deleted?: boolean; // deleted for everyone
  forwarded?: boolean;
  starred?: boolean; // local bookmark (WhatsApp-style star)
  missedCall?: boolean; // renders as a centered "missed call" pill
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
  lastSeenAt?: number;
  avatarUrl?: string; // real profile photo
};

export type Chat = {
  id: string;
  contactId: string; // direct: other user; group/channel: '' (members list instead)
  kind?: 'direct' | 'group' | 'channel';
  name?: string; // group/channel display name
  iconEmoji?: string;
  memberIds?: string[];
  myRole?: 'owner' | 'admin' | 'member';
  pinned?: boolean;
  muted?: boolean;
  wallpaper?: number; // index into avatarGradients for a subtle chat backdrop
  createdAt?: number; // when this chat first appeared on THIS device (fresh chats sort to top)
};

export type CallState = {
  id: string;
  contactId: string;
  video: boolean;
  direction: 'outgoing' | 'incoming';
  status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed' | 'unavailable';
  startedAt: number;
};

export type MomentAudience = 'everyone' | 'close' | 'family';

export type Moment = {
  id: string;
  authorId: string; // 'me' or contact id
  text: string;
  gradient: readonly [string, string];
  createdAt: number;
  expiresAt: number;
  views: string[]; // viewer ids
  audience?: MomentAudience;
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
  avatarUri?: string; // real photo (local; uploads in live mode)
};
