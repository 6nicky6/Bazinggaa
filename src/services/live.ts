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

// Wait (briefly) for a valid session — getSession() transparently refreshes
// an expired token using the stored refresh token.
export async function waitForSession(): Promise<{ access_token: string } | null> {
  if (!supabase) return null;
  for (let i = 0; i < 5; i++) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) return data.session;
    } catch {}
    await new Promise((r) => setTimeout(r, 1200));
  }
  return null;
}

export function setRealtimeAuth(token: string) {
  try {
    supabase?.realtime.setAuth(token);
  } catch {}
}

// Keep realtime authorized across token refreshes; re-boot the store's live
// pipeline whenever auth lands or rotates (fixes silent dead subscriptions).
let authArmed = false;
export function armAuthListeners(onAuthReady: () => void) {
  if (!supabase || authArmed) return;
  authArmed = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.access_token) {
      try {
        supabase!.realtime.setAuth(session.access_token);
      } catch {}
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') onAuthReady();
    }
  });
}

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
      // 'role' only exists after schema v3 — never let a missing column
      // silently kill chat loading again (the great "not receiving" bug).
      supabase.from('chat_members').select('chat_id, user_id, role')
        .then((r) => r.error
          ? supabase!.from('chat_members').select('chat_id, user_id')
          : r),
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
      online: false, // presence channel flips this in the store
      lastSeenAt: p.last_seen_at ? new Date(p.last_seen_at).getTime() : undefined,
      avatarUrl: p.avatar_url ?? undefined,
    }));

    // my chats: direct → other member = contactId; group/channel → name/icon/members
    const members = membersQ.data ?? [];
    const myChats = [...new Set(
      members.filter((m: any) => m.user_id === uid).map((m: any) => m.chat_id as string)
    )];
    if (membersQ.error) console.warn('[live] chat_members:', membersQ.error.message);
    let chats: Chat[] = [];
    if (myChats.length) {
      const q1 = await supabase
        .from('chats').select('id, type, name, icon_emoji').in('id', myChats);
      let chatRows: any[] | null = q1.data;
      if (q1.error) {
        // pre-v3 schema: no icon_emoji column
        const retry = await supabase.from('chats').select('id, type, name').in('id', myChats);
        chatRows = retry.data;
        if (retry.error) console.warn('[live] chats:', retry.error.message);
      }
      chats = (chatRows ?? []).map((c: any) => {
        const chatMembers: any[] = members.filter((m: any) => m.chat_id === c.id);
        const mine: any = chatMembers.find((m: any) => m.user_id === uid);
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
    // parity columns (exist after schema v3; harmless before)
    imageUrl: m.image_url ?? undefined,
    audioUrl: m.audio_url ?? undefined,
    audioDurationSec: m.audio_duration ?? undefined,
    replyToId: m.reply_to ?? undefined,
    reactions: m.reactions && Object.keys(m.reactions).length ? remapReactions(m.reactions, uid) : undefined,
    deleted: m.deleted || undefined,
    forwarded: m.forwarded || undefined,
  };
}

// server reactions store uids; the app uses 'me' for the current user
function remapReactions(r: Record<string, string[]>, uid: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [emoji, ids] of Object.entries(r)) {
    out[emoji] = ids.map((i) => (i === uid ? 'me' : i));
  }
  return out;
}

// ---------- message parity ops (schema-tolerant: no-op before v3) ----------
export async function reactLive(messageId: string, emoji: string, add: boolean) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  try {
    const { data } = await supabase.from('messages').select('reactions').eq('id', messageId).maybeSingle();
    const r: Record<string, string[]> = (data as any)?.reactions ?? {};
    const cur = new Set(r[emoji] ?? []);
    if (add) cur.add(uid); else cur.delete(uid);
    if (cur.size) r[emoji] = [...cur]; else delete r[emoji];
    const { error } = await supabase.from('messages').update({ reactions: r }).eq('id', messageId);
    if (error) console.warn('[live] react:', error.message);
  } catch {}
}

export async function deleteMessageLive(messageId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('messages')
    .update({ deleted: true, content: '' })
    .eq('id', messageId);
  if (error) console.warn('[live] delete:', error.message);
}

// ---------- chat ops ----------
// discovery: find people by @username or name — no browsing the whole userbase
export async function searchProfiles(query: string): Promise<Contact[]> {
  if (!supabase) return [];
  const uid = await myUserId();
  const q = query.trim().replace(/^@/, '');
  if (q.length < 2) return [];
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.${q}%,name.ilike.${q}%`)
    .neq('id', uid ?? '')
    .limit(10);
  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name || p.username || 'User',
    username: p.username ?? '',
    status: p.status ?? '',
    gradient: gradFor(p.avatar_gradient),
    initials: (p.avatar_emoji as string) || (p.name?.[0] ?? '?').toUpperCase(),
    group: 'Friends' as const,
    online: false,
  }));
}

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

// Upload local media to Supabase Storage; returns the public URL or null.
// (Bucket + policies land with schema v3 — until then this fails gracefully.)
export async function uploadMedia(
  chatId: string,
  localUri: string,
  kind: 'image' | 'audio'
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const resp = await fetch(localUri);
    const buf = await resp.arrayBuffer();
    const ext = kind === 'audio' ? 'm4a' : localUri.includes('.png') ? 'png' : 'jpg';
    const type = kind === 'audio' ? 'audio/m4a' : ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${chatId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('media').upload(path, buf, { contentType: type });
    if (error) {
      console.warn('[live] media upload:', error.message);
      return null;
    }
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  } catch (e: any) {
    console.warn('[live] media upload failed:', e?.message ?? e);
    return null;
  }
}
export const uploadImage = (chatId: string, uri: string) => uploadMedia(chatId, uri, 'image');

// real profile photo: upload + save on profile (tolerant pre-v3)
export async function uploadAvatar(localUri: string): Promise<string | null> {
  if (!supabase) return null;
  const uid = await myUserId();
  if (!uid) return null;
  const url = await uploadMedia(`avatars-${uid}`, localUri, 'image');
  if (!url) return null;
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid);
  if (error) console.warn('[live] avatar save:', error.message);
  return url;
}

export async function sendMessageLive(
  chatId: string,
  text: string,
  extras?: { replyToId?: string; forwarded?: boolean; imageUrl?: string; audioUrl?: string; audioDurationSec?: number }
): Promise<Message | null> {
  if (!supabase) return null;
  const uid = await myUserId();
  if (!uid) return null;
  const base: any = { chat_id: chatId, sender_id: uid, content: text };
  const rich: any = { ...base };
  if (extras?.replyToId) rich.reply_to = extras.replyToId;
  if (extras?.forwarded) rich.forwarded = true;
  if (extras?.imageUrl) rich.image_url = extras.imageUrl;
  if (extras?.audioUrl) { rich.audio_url = extras.audioUrl; rich.audio_duration = extras.audioDurationSec ?? 0; }
  let { data, error } = await supabase.from('messages').insert(rich).select().single();
  if (error && Object.keys(rich).length > Object.keys(base).length) {
    // pre-v3 schema: parity columns missing — send plain rather than fail
    ({ data, error } = await supabase.from('messages').insert(base).select().single());
  }
  if (error) {
    console.warn('[live] sendMessage:', error.message);
    return null;
  }
  return toMessage(data, uid);
}

// ---------- moments ops ----------
export async function postMomentLive(
  text: string,
  gradient: readonly [string, string],
  audience: 'everyone' | 'close' | 'family' = 'everyone'
) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  const base = { author_id: uid, content: text, gradient: gradIndex(gradient) };
  const { error } = await supabase.from('moments').insert({ ...base, audience });
  if (error) await supabase.from('moments').insert(base); // pre-v3: no audience column
}

// circles: owner-only lists powering moment audiences (tolerant pre-v3)
export async function setCircleLive(memberId: string, circle: 'close' | 'family', member: boolean) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  try {
    if (member) {
      await supabase.from('circles').upsert({ owner_id: uid, member_id: memberId, circle });
    } else {
      await supabase.from('circles').delete().match({ owner_id: uid, member_id: memberId, circle });
    }
  } catch {}
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

// ---------- presence + read receipts ----------
export async function markReadLive(chatId: string) {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .neq('sender_id', uid)
    .is('read_at', null);
}

export async function updateLastSeen() {
  if (!supabase) return;
  const uid = await myUserId();
  if (!uid) return;
  // tolerant: column lands with schema v3
  const { error } = await supabase
    .from('profiles')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', uid);
  if (error && !/last_seen_at/.test(error.message)) console.warn('[live] lastSeen:', error.message);
}

// Realtime Presence: who's online right now + typing broadcasts.
export function joinPresence(handlers: {
  onOnline: (ids: string[]) => void;
  onTyping: (chatId: string, fromId: string) => void;
}): { sendTyping: (chatId: string) => void; cleanup: () => void } {
  const sb = supabase;
  if (!sb) return { sendTyping: () => {}, cleanup: () => {} };
  let uid: string | null = null;
  const ch = sb.channel('bazingga-presence', { config: { presence: { key: 'presence' } } });
  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState() as Record<string, { uid?: string }[]>;
    const ids = new Set<string>();
    for (const metas of Object.values(state)) {
      for (const m of metas) if (m.uid) ids.add(m.uid);
    }
    handlers.onOnline([...ids]);
  });
  ch.on('broadcast', { event: 'typing' }, (payload) => {
    const p = payload.payload as { chatId?: string; uid?: string };
    if (p?.chatId && p?.uid && p.uid !== uid) handlers.onTyping(p.chatId, p.uid);
  });
  ch.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      uid = await myUserId();
      if (uid) ch.track({ uid, online_at: new Date().toISOString() });
    }
  });
  return {
    sendTyping: (chatId: string) => {
      if (uid) ch.send({ type: 'broadcast', event: 'typing', payload: { chatId, uid } });
    },
    cleanup: () => {
      sb.removeChannel(ch);
    },
  };
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
