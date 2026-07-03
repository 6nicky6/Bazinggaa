// Live-mode operations against Supabase. Only used when backendMode === 'live'
// (i.e., EXPO_PUBLIC_SUPABASE_URL/ANON_KEY exist in .env). Every call is
// defensive: on failure we log and return a safe value — the UI never breaks.
import { supabase } from './supabase';
import { avatarGradients } from '../theme/colors';
import { Chat, Contact, Message, Moment, Profile } from '../types';

const gradFor = (i?: number | null) =>
  avatarGradients[Math.abs(i ?? 1) % avatarGradients.length];

const gradIndex = (g: readonly [string, string]) => {
  const i = avatarGradients.findIndex((x) => x[0] === g[0] && x[1] === g[1]);
  return i >= 0 ? i : 1;
};

export async function myUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------- auth ----------
// Phone OTP needs an SMS provider (Twilio) configured in Supabase — paid.
// Email OTP is free out of the box, so it's the recommended path for MVP.
export type OtpTarget = { phone?: string; email?: string };

export async function sendOtp(target: OtpTarget): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'demo mode' };
  const { error } = target.email
    ? await supabase.auth.signInWithOtp({ email: target.email })
    : await supabase.auth.signInWithOtp({ phone: target.phone! });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function verifyOtp(target: OtpTarget, token: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'demo mode' };
  const { error } = target.email
    ? await supabase.auth.verifyOtp({ email: target.email, token, type: 'email' })
    : await supabase.auth.verifyOtp({ phone: target.phone!, token, type: 'sms' });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOutLive() {
  await supabase?.auth.signOut().catch(() => {});
}

// ---------- profile ----------
export async function fetchMyProfile(): Promise<Partial<Profile> | null> {
  if (!supabase) return null;
  const uid = await myUserId();
  if (!uid) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (!data || !data.name) return null;
  return {
    name: data.name,
    username: data.username ?? '',
    phone: data.phone ?? '',
    statusText: data.status ?? '',
    avatarEmoji: data.avatar_emoji ?? '⚡',
    avatarGradient: gradFor(data.avatar_gradient),
  };
}

export async function upsertProfile(p: Profile): Promise<boolean> {
  if (!supabase) return false;
  const uid = await myUserId();
  if (!uid) return false;
  const { error } = await supabase.from('profiles').upsert({
    id: uid,
    phone: p.phone || null,
    name: p.name,
    username: p.username || null,
    status: p.statusText,
    avatar_emoji: p.avatarEmoji,
    avatar_gradient: gradIndex(p.avatarGradient),
  });
  if (error) console.warn('[live] upsertProfile:', error.message);
  return !error;
}

// ---------- initial load ----------
export type LiveData = {
  contacts: Contact[];
  chats: Chat[];
  messages: Message[];
  moments: Moment[];
  blocked: string[];
};

export async function loadAll(): Promise<LiveData | null> {
  if (!supabase) return null;
  const uid = await myUserId();
  if (!uid) return null;
  try {
    const [profilesQ, membersQ, momentsQ, blocksQ] = await Promise.all([
      supabase.from('profiles').select('*').neq('id', uid),
      supabase.from('chat_members').select('chat_id, user_id, role'),
      supabase.from('moments').select('*, moment_views(viewer_id)').gt('expires_at', new Date().toISOString()),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', uid),
    ]);

    const contacts: Contact[] = (profilesQ.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name || p.username || 'User',
      username: p.username ?? '',
      status: p.status ?? '',
      gradient: gradFor(p.avatar_gradient),
      initials: (p.avatar_emoji as string) || (p.name?.[0] ?? '?').toUpperCase(),
      group: 'Friends',
      online: false,
    }));

    // my chats: direct → other member = contactId; group/channel → name/icon/members
    const members = membersQ.data ?? [];
    const myChats = [...new Set(
      members.filter((m: any) => m.user_id === uid).map((m: any) => m.chat_id as string)
    )];
    let chats: Chat[] = [];
    if (myChats.length) {
      const { data: chatRows } = await supabase
        .from('chats').select('id, type, name, icon_emoji').in('id', myChats);
      chats = (chatRows ?? []).map((c: any) => {
        const chatMembers = members.filter((m: any) => m.chat_id === c.id);
        const mine = chatMembers.find((m: any) => m.user_id === uid);
        if (c.type === 'direct') {
          const other = chatMembers.find((m: any) => m.user_id !== uid);
          return { id: c.id, contactId: other?.user_id ?? '', kind: 'direct' as const };
        }
        return {
          id: c.id, contactId: '', kind: c.type as 'group' | 'channel',
          name: c.name ?? 'Group', iconEmoji: c.icon_emoji ?? '👥',
          memberIds: chatMembers.map((m: any) => m.user_id),
          myRole: (mine?.role ?? 'member') as Chat['myRole'],
        };
      });
    }

    let messages: Message[] = [];
    if (chats.length) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .in('chat_id', chats.map((c) => c.id))
        .order('sent_at', { ascending: true })
        .limit(1000);
      messages = (msgs ?? []).map((m: any) => toMessage(m, uid));
    }

    const moments: Moment[] = (momentsQ.data ?? []).map((m: any) => ({
      id: m.id,
      authorId: m.author_id === uid ? 'me' : m.author_id,
      text: m.content,
      gradient: gradFor(m.gradient),
      createdAt: new Date(m.created_at).getTime(),
      expiresAt: new Date(m.expires_at).getTime(),
      views: (m.moment_views ?? []).map((v: any) => (v.viewer_id === uid ? 'me' : v.viewer_id)),
    }));

    const blocked = (blocksQ.data ?? []).map((b: any) => b.blocked_id as string);
    return { contacts, chats, messages, moments, blocked };
  } catch (e) {
    console.warn('[live] loadAll failed:', e);
    return null;
  }
}

function toMessage(m: any, uid: string): Message {
  return {
    id: m.id,
    chatId: m.chat_id,
    senderId: m.sender_id === uid ? 'me' : m.sender_id,
    text: m.content,
    sentAt: new Date(m.sent_at).getTime(),
    status: m.read_at ? 'read' : m.delivered_at ? 'delivered' : 'sent',
  };
}

// ---------- chat ops ----------
export async function createGroupLive(
  kind: 'group' | 'channel', name: string, icon: string, memberIds: string[]
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('create_group_chat', {
    p_type: kind, p_name: name, p_icon: icon, p_member_ids: memberIds,
  });
  if (error) {
    console.warn('[live] create_group_chat:', error.message);
    return null;
  }
  return data as string;
}

export async function ensureDirectChat(otherUserId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('create_direct_chat', { p_other_user: otherUserId });
  if (error) {
    console.warn('[live] create_direct_chat:', error.message);
    return null;
  }
  return data as string;
}

export async function sendMessageLive(chatId: string, text: string): Promise<Message | null> {
  if (!supabase) return null;
  const uid = await myUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: uid, content: text })
    .select()
    .single();
  if (error) {
    console.warn('[live] sendMessage:', error.message);
    return null;
  }
  return toMessage(data, uid);
}

// ---------- moments ops ----------
export async function postMomentLive(text: string, gradient: readonly [string, string]) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  await supabase.from('moments').insert({ author_id: uid, content: text, gradient: gradIndex(gradient) });
}

export async function viewMomentLive(momentId: string) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  await supabase.from('moment_views').upsert({ moment_id: momentId, viewer_id: uid });
}

export async function deleteMomentLive(momentId: string) {
  await supabase?.from('moments').delete().eq('id', momentId);
}

// ---------- safety ----------
export async function reportLive(reportedUserId: string, reason: string): Promise<boolean> {
  if (!supabase) return true; // demo mode: accept locally
  const uid = await myUserId();
  if (!uid) return false;
  const { error } = await supabase.from('reports').insert({
    reporter_id: uid,
    reported_user_id: reportedUserId,
    reason,
  });
  if (error) console.warn('[live] report:', error.message);
  return !error;
}

export async function blockLive(otherUserId: string) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  await supabase.from('blocks').upsert({ blocker_id: uid, blocked_id: otherUserId });
}

export async function unblockLive(otherUserId: string) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  await supabase.from('blocks').delete().match({ blocker_id: uid, blocked_id: otherUserId });
}

// ---------- calls (signaling; media ships with the dev-client build) ----------
export async function startCallLive(chatId: string, calleeId: string, video: boolean): Promise<string | null> {
  if (!supabase) return null;
  const uid = await myUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('calls')
    .insert({ chat_id: chatId, caller_id: uid, callee_id: calleeId, video })
    .select()
    .single();
  if (error) {
    console.warn('[live] startCall:', error.message);
    return null;
  }
  return data.id as string;
}

export async function updateCallLive(callId: string, status: 'accepted' | 'declined' | 'ended' | 'missed') {
  if (!supabase) return;
  await supabase
    .from('calls')
    .update({ status, ...(status !== 'accepted' ? { ended_at: new Date().toISOString() } : {}) })
    .eq('id', callId);
}

// ---------- realtime ----------
export function subscribeLive(handlers: {
  onMessage: (m: Message) => void;
  onMomentChange: () => void;
  onCall?: (row: any, myId: string) => void;
}): () => void {
  const sb = supabase;
  if (!sb) return () => {};
  let uid: string | null = null;
  myUserId().then((u) => { uid = u; });

  const ch = sb
    .channel('bazingga-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      if (!uid) return;
      handlers.onMessage(toMessage(payload.new, uid));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'moments' }, () => {
      handlers.onMomentChange();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (payload) => {
      if (uid && handlers.onCall) handlers.onCall(payload.new, uid);
    })
    .subscribe();

  return () => {
    sb.removeChannel(ch);
  };
}
