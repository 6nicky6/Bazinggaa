import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gradients } from '../theme/colors';
import {
  CallLog, CallState, Chat, Contact, Message, Moment, Profile,
} from '../types';
import {
  CONTACTS, pickReply, seedCalls, seedMessages, seedMoments,
} from '../services/personas';
import { backendMode } from '../services/supabase';
import * as live from '../services/live';
import { BOT_CONTACT, BOT_ID, botReply } from '../services/bot';
import { OfficialChannel } from '../data/discover';
import { notifyMessage } from '../services/notifications';
import { AppState } from 'react-native';

// app foreground/background tracking (native; web stays 'active')
let appActive = true;
try {
  AppState.addEventListener('change', (s) => {
    appActive = s === 'active';
  });
} catch {}

// fire a local notification for messages that arrive while backgrounded —
// honoring the in-app Notifications toggle and the blocked list
function alertIncoming(
  newMsgs: Message[],
  contacts: Contact[],
  opts: { enabled: boolean; blocked: string[] }
) {
  if (appActive || !opts.enabled) return;
  for (const m of newMsgs.slice(-3)) {
    if (m.senderId === 'me' || opts.blocked.includes(m.senderId)) continue;
    const from = contacts.find((c) => c.id === m.senderId);
    notifyMessage(from?.name ?? 'New message', m.text.slice(0, 120));
  }
}

const isLive = backendMode === 'live';

let idc = 0;
const uid = () => `${Date.now().toString(36)}-${(idc++).toString(36)}`;
let liveUnsub: (() => void) | null = null;
let livePoll: number | null = null;
let presenceHandle: { sendTyping: (chatId: string) => void; cleanup: () => void } | null = null;
let lastSeenTimer: number | null = null;
const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const lastTypingSent: Record<string, number> = {};
const lastReadSync: Record<string, number> = {};
const STATUS_RANK: Record<string, number> = { sending: 0, failed: 0, sent: 1, delivered: 2, read: 3 };

// Merge server messages with local state without losing still-sending
// optimistic messages or duplicating anything. Keyed by id, sorted by time.
function mergeMessages(incoming: Message[], current: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of current) byId.set(m.id, m);
  for (const m of incoming) {
    const existing = byId.get(m.id);
    if (!existing) {
      byId.set(m.id, m);
    } else if (existing.status !== 'sending' && existing.status !== 'failed') {
      // adopt server-side changes: others' reactions, remote deletes, and
      // forward-only status upgrades (sent -> delivered -> read = real ticks)
      const statusUpgrade = STATUS_RANK[m.status] > STATUS_RANK[existing.status];
      if (
        statusUpgrade ||
        JSON.stringify(m.reactions ?? null) !== JSON.stringify(existing.reactions ?? null) ||
        !!m.deleted !== !!existing.deleted
      ) {
        byId.set(m.id, {
          ...existing,
          status: statusUpgrade ? m.status : existing.status,
          reactions: m.reactions,
          deleted: m.deleted,
          text: m.deleted ? '' : existing.text,
        });
      }
    }
  }
  // keep local optimistic 'sending'/'failed' messages the server hasn't echoed
  for (const m of current) {
    if ((m.status === 'sending' || m.status === 'failed') && !byId.has(m.id)) {
      byId.set(m.id, m);
    }
  }
  return [...byId.values()].sort((a, b) => a.sentAt - b.sentAt);
}
let lastLiveRefresh = 0;

type State = {
  hydrated: boolean;
  authed: boolean;
  onboarded: boolean;
  profile: Profile;
  contacts: Contact[];
  chats: Chat[];
  messages: Message[];
  moments: Moment[];
  calls: CallLog[];
  blocked: string[];
  typing: Record<string, boolean>; // chatId -> contact typing
  lastReadAt: Record<string, number>; // chatId -> ts I last read
  settings: { smartReplies: boolean; notifications: boolean };

  // actions
  setOnboarded: () => void;
  signIn: (phone: string) => void;
  completeProfile: (p: Partial<Profile>) => void;
  signOut: () => void;
  sendMessage: (chatId: string, text: string, extras?: { replyToId?: string; forwarded?: boolean }) => void;
  retryMessage: (messageId: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  deleteMessage: (messageId: string, forEveryone: boolean) => void;
  forwardMessage: (messageId: string, toChatId: string) => void;
  sendImage: (chatId: string, imageUri: string) => void;
  activeCall: CallState | null;
  startCall: (contactId: string, video: boolean) => void;
  answerCall: (accept: boolean) => void;
  endCall: () => void;
  markChatRead: (chatId: string) => void;
  notifyTyping: (chatId: string) => void;
  ensureChat: (contactId: string) => Promise<string | null>;
  createGroup: (kind: 'group' | 'channel', name: string, icon: string, memberIds: string[]) => Promise<string | null>;
  joinChannel: (ch: OfficialChannel) => string;
  leaveChannel: (channelId: string) => void;
  bootLive: () => Promise<void>;
  togglePin: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  block: (contactId: string) => void;
  unblock: (contactId: string) => void;
  postMoment: (text: string, gradient: readonly [string, string]) => void;
  viewMoment: (momentId: string) => void;
  deleteMoment: (momentId: string) => void;
  setSetting: (k: 'smartReplies' | 'notifications', v: boolean) => void;
  updateProfile: (p: Partial<Profile>) => void;
};

const defaultProfile: Profile = {
  name: '',
  username: '',
  phone: '',
  statusText: 'Hey there! I am using Bazingga',
  avatarEmoji: '⚡',
  avatarGradient: gradients.primary,
};

// Simulated network: contact replies after a realistic delay with typing.
function scheduleAutoReply(chatId: string, myText: string) {
  const s = useAppStore.getState;
  const set = useAppStore.setState;
  const contact = s().contacts.find((c) => c.id === s().chats.find((ch) => ch.id === chatId)?.contactId);
  if (!contact) return;
  if (s().blocked.includes(contact.id)) return;
  if (s().typing[chatId]) return; // already replying — no reply storms on rapid sends

  const thinkMs = 1200 + Math.random() * 1800;
  const typeMs = 1100 + Math.random() * 1600;

  // ticks: sent -> delivered -> read
  setTimeout(() => {
    set((st) => ({
      messages: st.messages.map((m) =>
        m.chatId === chatId && m.senderId === 'me' && m.status === 'sent'
          ? { ...m, status: 'delivered' }
          : m
      ),
    }));
  }, 700 + Math.random() * 600);
  setTimeout(() => {
    set((st) => ({
      messages: st.messages.map((m) =>
        m.chatId === chatId && m.senderId === 'me' && m.status !== 'read'
          ? { ...m, status: 'read' }
          : m
      ),
    }));
  }, thinkMs);

  setTimeout(() => {
    set((st) => ({ typing: { ...st.typing, [chatId]: true } }));
  }, thinkMs + 300);

  setTimeout(() => {
    set((st) => ({
      typing: { ...st.typing, [chatId]: false },
      messages: [
        ...st.messages,
        {
          id: uid(), chatId, senderId: contact.id,
          text: pickReply(contact.id, myText),
          sentAt: Date.now(), status: 'read',
        },
      ],
    }));
  }, thinkMs + 300 + typeMs);
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      authed: false,
      onboarded: false,
      profile: defaultProfile,
      // live mode starts near-empty and fills from Supabase in bootLive();
      // BazinggaBot lives locally in BOTH modes (client-side AI contact)
      contacts: isLive ? [BOT_CONTACT] : [...CONTACTS, BOT_CONTACT],
      chats: isLive
        ? [{ id: BOT_ID, contactId: BOT_ID }]
        : [
            { id: BOT_ID, contactId: BOT_ID },
            { id: 'aisha', contactId: 'aisha' },
            { id: 'mom', contactId: 'mom' },
            { id: 'rahul', contactId: 'rahul' },
            { id: 'zara', contactId: 'zara' },
            { id: 'dad', contactId: 'dad' },
            { id: 'welcome', contactId: 'sana' },
          ],
      messages: [
        {
          id: 'bot-hello', chatId: BOT_ID, senderId: BOT_ID,
          text: "Hey! I'm BazinggaBot, your AI sidekick ⚡ Ask me anything — questions, jokes, help with the app. I'm all yours.",
          sentAt: Date.now() - 60_000, status: 'read' as const,
        },
        ...(isLive ? [] : seedMessages()),
      ],
      moments: isLive ? [] : seedMoments(),
      calls: isLive ? [] : seedCalls(),
      blocked: [],
      typing: {},
      lastReadAt: { aisha: 0, mom: 0, rahul: Date.now(), zara: 0, dad: Date.now(), welcome: 0 },
      settings: { smartReplies: true, notifications: true },

      setOnboarded: () => set({ onboarded: true }),
      signIn: (phone) => set((st) => ({ authed: true, profile: { ...st.profile, phone } })),
      completeProfile: (p) => set((st) => ({ profile: { ...st.profile, ...p } })),
      signOut: () => {
        if (isLive) {
          liveUnsub?.();
          liveUnsub = null;
          if (livePoll) { clearInterval(livePoll); livePoll = null; }
          presenceHandle?.cleanup();
          presenceHandle = null;
          if (lastSeenTimer) { clearInterval(lastSeenTimer); lastSeenTimer = null; }
          live.signOutLive();
          set({
            authed: false, profile: defaultProfile,
            contacts: [], chats: [], messages: [], moments: [], blocked: [],
          });
        } else {
          set({ authed: false, profile: defaultProfile });
        }
      },

      sendMessage: (chatId, text, extras) => {
        const tempId = uid();
        const msg: Message = {
          id: tempId, chatId, senderId: 'me', text,
          sentAt: Date.now(), status: isLive ? 'sending' : 'sent',
          replyToId: extras?.replyToId,
          forwarded: extras?.forwarded,
        };
        set((st) => ({ messages: [...st.messages, msg] }));
        if (chatId === BOT_ID) {
          // BazinggaBot: local echo + real Gemini reply with typing indicator
          set((st) => ({
            messages: st.messages.map((m) => (m.id === tempId ? { ...m, status: 'read' as const } : m)),
          }));
          setTimeout(() => set((st) => ({ typing: { ...st.typing, [BOT_ID]: true } })), 350);
          const history = get()
            .messages.filter((m) => m.chatId === BOT_ID)
            .slice(-12)
            .map((m) => ({ role: (m.senderId === 'me' ? 'user' : 'model') as 'user' | 'model', text: m.text }));
          botReply([...history, { role: 'user', text }]).then((reply) => {
            set((st) => ({
              typing: { ...st.typing, [BOT_ID]: false },
              messages: [
                ...st.messages,
                { id: uid(), chatId: BOT_ID, senderId: BOT_ID, text: reply, sentAt: Date.now(), status: 'read' as const },
              ],
            }));
          });
          return;
        }
        if (isLive) {
          live.sendMessageLive(chatId, text, extras).then((serverMsg) => {
            set((st) => ({
              messages: st.messages.map((m) =>
                m.id === tempId
                  ? serverMsg ?? { ...m, status: 'failed' as const } // never drop a message
                  : m
              ),
            }));
            // Remote push fan-out intentionally NOT done client-side: it would
            // require exposing recipients' push tokens to every user (spoofing
            // risk, caught in security review). Ships as a Supabase Edge
            // Function triggered by message inserts once the dashboard is back.
          });
        } else {
          scheduleAutoReply(chatId, text);
        }
      },

      sendImage: (chatId, imageUri) => {
        const tempId = uid();
        const isRealChat = isLive && chatId !== BOT_ID && !chatId.startsWith('official-');
        const msg: Message = {
          id: tempId, chatId, senderId: 'me', text: '', imageUri,
          sentAt: Date.now(), status: isRealChat ? 'sending' : 'sent',
        };
        set((st) => ({ messages: [...st.messages, msg] }));
        if (chatId === BOT_ID) {
          setTimeout(() => set((st) => ({
            messages: [...st.messages, {
              id: uid(), chatId, senderId: BOT_ID,
              text: "Nice shot! 📸 I can't see images yet — my vision upgrade lands soon. Describe it to me?",
              sentAt: Date.now(), status: 'read' as const,
            }],
          })), 1200);
        } else if (!isLive) {
          scheduleAutoReply(chatId, 'sent you a photo 📸');
        } else if (isRealChat) {
          // upload to Storage, then send the message with the remote URL so it
          // arrives on the other person's phone
          live.uploadImage(chatId, imageUri).then(async (url) => {
            if (!url) {
              // storage not ready (pre-v3) or offline — keep local, mark failed
              set((st) => ({
                messages: st.messages.map((m) =>
                  m.id === tempId ? { ...m, status: 'failed' as const } : m
                ),
              }));
              return;
            }
            const serverMsg = await live.sendMessageLive(chatId, '📷 Photo', { imageUrl: url });
            set((st) => ({
              messages: st.messages.map((m) =>
                m.id === tempId
                  ? serverMsg
                    ? { ...serverMsg, imageUri, text: '' }
                    : { ...m, status: 'failed' as const }
                  : m
              ),
            }));
          });
        }
      },

      retryMessage: (messageId: string) => {
        const msg = get().messages.find((m) => m.id === messageId);
        if (!msg || msg.status !== 'failed') return;
        if (msg.imageUri && !msg.imageUrl) {
          // failed photo: remove the tombstone and re-run the upload pipeline
          set((st) => ({ messages: st.messages.filter((m) => m.id !== messageId) }));
          get().sendImage(msg.chatId, msg.imageUri);
          return;
        }
        set((st) => ({
          messages: st.messages.map((m) =>
            m.id === messageId ? { ...m, status: 'sending' as const, sentAt: Date.now() } : m
          ),
        }));
        live.sendMessageLive(msg.chatId, msg.text, { replyToId: msg.replyToId, forwarded: msg.forwarded }).then((serverMsg) => {
          set((st) => ({
            messages: st.messages.map((m) =>
              m.id === messageId
                ? serverMsg ?? { ...m, status: 'failed' as const }
                : m
            ),
          }));
        });
      },

      reactToMessage: (messageId, emoji) => {
        const msg = get().messages.find((m) => m.id === messageId);
        if (!msg || msg.deleted) return;
        const r = { ...(msg.reactions ?? {}) };
        const cur = new Set(r[emoji] ?? []);
        const adding = !cur.has('me');
        if (adding) cur.add('me'); else cur.delete('me');
        if (cur.size) r[emoji] = [...cur]; else delete r[emoji];
        set((st) => ({
          messages: st.messages.map((m) =>
            m.id === messageId ? { ...m, reactions: Object.keys(r).length ? r : undefined } : m
          ),
        }));
        if (isLive && msg.chatId !== BOT_ID && !msg.chatId.startsWith('official-')) {
          live.reactLive(messageId, emoji, adding);
        }
      },

      deleteMessage: (messageId, forEveryone) => {
        const msg = get().messages.find((m) => m.id === messageId);
        if (!msg) return;
        if (forEveryone && msg.senderId === 'me') {
          set((st) => ({
            messages: st.messages.map((m) =>
              m.id === messageId
                ? { ...m, deleted: true, text: '', imageUri: undefined, reactions: undefined }
                : m
            ),
          }));
          if (isLive && msg.chatId !== BOT_ID && !msg.chatId.startsWith('official-')) {
            live.deleteMessageLive(messageId);
          }
        } else {
          // delete for me: local removal only
          set((st) => ({ messages: st.messages.filter((m) => m.id !== messageId) }));
        }
      },

      forwardMessage: (messageId, toChatId) => {
        const msg = get().messages.find((m) => m.id === messageId);
        if (!msg || msg.deleted) return;
        get().sendMessage(toChatId, msg.text, { forwarded: true });
      },

      markChatRead: (chatId) => {
        set((st) => ({ lastReadAt: { ...st.lastReadAt, [chatId]: Date.now() } }));
        // read receipts: tell the sender their message was seen (throttled)
        if (isLive && chatId !== BOT_ID && !chatId.startsWith('official-')) {
          const now = Date.now();
          if (now - (lastReadSync[chatId] ?? 0) > 2500) {
            lastReadSync[chatId] = now;
            live.markReadLive(chatId);
          }
        }
      },

      notifyTyping: (chatId) => {
        if (!isLive || chatId === BOT_ID || chatId.startsWith('official-')) return;
        const now = Date.now();
        if (now - (lastTypingSent[chatId] ?? 0) > 2500) {
          lastTypingSent[chatId] = now;
          presenceHandle?.sendTyping(chatId);
        }
      },

      ensureChat: async (contactId) => {
        const existing = get().chats.find((c) => c.contactId === contactId);
        if (existing) return existing.id;
        if (isLive) {
          const chatId = await live.ensureDirectChat(contactId);
          if (!chatId) return null;
          set((st) => ({ chats: [{ id: chatId, contactId }, ...st.chats] }));
          return chatId;
        }
        const chat: Chat = { id: contactId, contactId };
        set((st) => ({ chats: [chat, ...st.chats] }));
        return chat.id;
      },

      createGroup: async (kind, name, icon, memberIds) => {
        if (isLive) {
          const id = await live.createGroupLive(kind, name, icon, memberIds);
          if (!id) return null;
          set((st) => ({
            chats: [
              { id, contactId: '', kind, name, iconEmoji: icon, memberIds: [...memberIds, 'me'], myRole: 'owner' as const },
              ...st.chats,
            ],
          }));
          return id;
        }
        const id = uid();
        set((st) => ({
          chats: [
            { id, contactId: '', kind, name, iconEmoji: icon, memberIds: [...memberIds, 'me'], myRole: 'owner' as const },
            ...st.chats,
          ],
          messages: [
            ...st.messages,
            {
              id: uid(), chatId: id, senderId: memberIds[0] ?? 'me',
              text: kind === 'channel' ? `Welcome to ${name} 📢` : `${name} created. Say hi! 👋`,
              sentAt: Date.now(), status: 'read' as const,
            },
          ],
        }));
        return id;
      },

      joinChannel: (ch) => {
        const id = `official-${ch.id}`;
        if (get().chats.some((c) => c.id === id)) return id; // already joined
        const now = Date.now();
        const seeded: Message[] = ch.posts
          .slice()
          .reverse()
          .map((p, i) => ({
            id: `${id}-post-${i}`,
            chatId: id,
            senderId: id, // channel itself is the sender
            text: p.text,
            sentAt: now - p.agoMin * 60_000,
            status: 'read' as const,
          }));
        set((st) => ({
          contacts: [
            {
              id, name: ch.name, username: ch.handle, status: ch.description,
              gradient: ch.gradient, initials: ch.emoji, group: 'Friends' as const, online: false,
            },
            ...st.contacts.filter((c) => c.id !== id),
          ],
          chats: [
            { id, contactId: id, kind: 'channel' as const, name: ch.name, iconEmoji: ch.emoji, myRole: 'member' as const },
            ...st.chats,
          ],
          messages: [...st.messages, ...seeded],
        }));
        return id;
      },

      leaveChannel: (channelId) => {
        set((st) => ({
          chats: st.chats.filter((c) => c.id !== channelId),
          messages: st.messages.filter((m) => m.chatId !== channelId),
        }));
      },

      bootLive: async () => {
        if (!isLive) return;
        // CRITICAL: wait for a VALID session before loading or subscribing.
        // Reopening the app with an expired token used to make loadAll and the
        // realtime subscribe fail silently -> stale chats, no incoming messages.
        const session = await live.waitForSession();
        if (!session) {
          // token refresh still in flight or offline — retry shortly, forever
          setTimeout(() => get().bootLive(), 3000);
          return;
        }
        live.setRealtimeAuth(session.access_token); // realtime must carry the JWT
        live.armAuthListeners(() => get().bootLive()); // re-boot on token refresh
        const data = await live.loadAll();
        if (data) {
          set((st) => ({
            contacts: [BOT_CONTACT, ...data.contacts],
            chats: [
              ...st.chats.filter((c) => c.id === BOT_ID),
              ...data.chats,
            ],
            // server messages + local bot history (bot is client-side)
            messages: [
              ...data.messages,
              ...st.messages.filter((m) => m.chatId === BOT_ID),
            ],
            moments: data.moments,
            blocked: data.blocked,
            calls: st.calls,
          }));
        }
        liveUnsub?.();
        liveUnsub = live.subscribeLive({
          onMessage: (m) => {
            const st0 = get();
            if (!st0.messages.some((x) => x.id === m.id)) {
              alertIncoming([m], st0.contacts, {
                enabled: st0.settings.notifications,
                blocked: st0.blocked,
              });
            }
            set((st) =>
              st.messages.some((x) => x.id === m.id)
                ? st // already have it (own optimistic replaced by server copy)
                : { messages: [...st.messages, m] }
            );
            // Message for a chat we don't know yet (someone just started it)?
            // Refresh chats + contacts so the conversation appears instantly.
            const st = get();
            if (!st.chats.some((c) => c.id === m.chatId)) {
              const now = Date.now();
              if (now - lastLiveRefresh > 4000) {
                lastLiveRefresh = now;
                live.loadAll().then((d) => {
                  if (!d) return;
                  set((s2) => ({
                    contacts: [BOT_CONTACT, ...d.contacts],
                    chats: [
                      ...s2.chats.filter((c) => c.id === BOT_ID),
                      ...d.chats,
                    ],
                    messages: [
                      ...d.messages,
                      ...s2.messages.filter((x) => x.chatId === BOT_ID),
                    ],
                  }));
                });
              }
            }
          },
          onMomentChange: () => {
            live.loadAll().then((d) => d && set({ moments: d.moments }));
          },
          onCall: (row, myId) => {
            const st = get();
            if (row.callee_id === myId && row.status === 'ringing' && !st.activeCall) {
              set({
                activeCall: {
                  id: row.id, contactId: row.caller_id, video: !!row.video,
                  direction: 'incoming', status: 'ringing',
                  startedAt: Date.now(),
                },
              });
            } else if (st.activeCall && row.id === st.activeCall.id) {
              if (row.status === 'accepted' && st.activeCall.status === 'ringing') {
                set({ activeCall: { ...st.activeCall, status: 'accepted', startedAt: Date.now() } });
              } else if (['declined', 'ended', 'missed'].includes(row.status)) {
                get().endCall();
              }
            }
          },
        });

        // PRESENCE: real online status + typing across devices
        presenceHandle?.cleanup();
        presenceHandle = live.joinPresence({
          onOnline: (ids) => {
            const online = new Set(ids);
            set((st) => ({
              contacts: st.contacts.map((c) =>
                c.id === BOT_ID ? c : { ...c, online: online.has(c.id) }
              ),
            }));
          },
          onTyping: (tChatId, fromId) => {
            set((st) => ({ typing: { ...st.typing, [tChatId]: true } }));
            if (typingTimers[tChatId]) clearTimeout(typingTimers[tChatId]);
            typingTimers[tChatId] = setTimeout(() => {
              set((st) => ({ typing: { ...st.typing, [tChatId]: false } }));
            }, 3500);
          },
        });
        live.updateLastSeen();
        if (lastSeenTimer) clearInterval(lastSeenTimer);
        lastSeenTimer = setInterval(() => live.updateLastSeen(), 60_000) as unknown as number;

        // RELIABILITY NET: realtime sockets can degrade (esp. during provider
        // incidents). Poll every 3.5s and merge anything new so messages,
        // moments and calls ALWAYS arrive — the WhatsApp-grade guarantee.
        if (livePoll) clearInterval(livePoll);
        livePoll = setInterval(async () => {
          const d = await live.loadAll();
          if (!d) return;
          set((s2) => {
            const merged = mergeMessages(
              [...d.messages, ...s2.messages.filter((x) => x.chatId === BOT_ID)],
              s2.messages
            );
            const changed =
              merged.length !== s2.messages.length ||
              d.chats.length !== s2.chats.filter((c) => c.id !== BOT_ID).length;
            if (!changed) return {} as any;
            const known = new Set(s2.messages.map((m) => m.id));
            alertIncoming(merged.filter((m) => !known.has(m.id)), [BOT_CONTACT, ...d.contacts], {
              enabled: s2.settings.notifications,
              blocked: d.blocked, // freshest block list from the server
            });
            return {
              contacts: [BOT_CONTACT, ...d.contacts],
              chats: [...s2.chats.filter((c) => c.id === BOT_ID), ...d.chats],
              messages: merged,
              moments: d.moments,
              blocked: d.blocked,
            };
          });
        }, 3500) as unknown as number;
      },

      togglePin: (chatId) =>
        set((st) => ({
          chats: st.chats.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c)),
        })),

      deleteChat: (chatId) =>
        set((st) => ({
          chats: st.chats.filter((c) => c.id !== chatId),
          messages: st.messages.filter((m) => m.chatId !== chatId),
        })),

      block: (contactId) => {
        set((st) => ({ blocked: [...new Set([...st.blocked, contactId])] }));
        if (isLive) live.blockLive(contactId);
      },
      unblock: (contactId) => {
        set((st) => ({ blocked: st.blocked.filter((b) => b !== contactId) }));
        if (isLive) live.unblockLive(contactId);
      },

      postMoment: (text, gradient) => {
        set((st) => ({
          moments: [
            {
              id: uid(), authorId: 'me', text, gradient,
              createdAt: Date.now(), expiresAt: Date.now() + 24 * 3_600_000,
              views: [],
            },
            ...st.moments,
          ],
        }));
        if (isLive) live.postMomentLive(text, gradient); // realtime refresh syncs real id
      },
      viewMoment: (momentId) => {
        set((st) => ({
          moments: st.moments.map((m) =>
            m.id === momentId && !m.views.includes('me')
              ? { ...m, views: [...m.views, 'me'] }
              : m
          ),
        }));
        if (isLive) live.viewMomentLive(momentId);
      },
      deleteMoment: (momentId) => {
        set((st) => ({ moments: st.moments.filter((m) => m.id !== momentId) }));
        if (isLive) live.deleteMomentLive(momentId);
      },

      activeCall: null,

      startCall: (contactId, video) => {
        const callId = uid();
        const chat = get().chats.find((c) => c.contactId === contactId);
        set({
          activeCall: {
            id: callId, contactId, video,
            direction: 'outgoing', status: 'ringing', startedAt: Date.now(),
          },
        });
        if (isLive && chat) {
          live.startCallLive(chat.id, contactId, video).then((serverId) => {
            if (serverId) {
              set((st) => st.activeCall?.id === callId
                ? { activeCall: { ...st.activeCall, id: serverId } }
                : {});
            }
          });
        } else {
          // demo: contact "answers" after a few rings
          setTimeout(() => {
            set((st) =>
              st.activeCall?.id === callId && st.activeCall.status === 'ringing'
                ? { activeCall: { ...st.activeCall, status: 'accepted' as const, startedAt: Date.now() } }
                : {}
            );
          }, 3500);
        }
      },

      answerCall: (accept) => {
        const call = get().activeCall;
        if (!call) return;
        if (isLive) live.updateCallLive(call.id, accept ? 'accepted' : 'declined');
        set((st) => ({
          activeCall: accept
            ? { ...call, status: 'accepted' as const, startedAt: Date.now() }
            : null,
          calls: accept
            ? st.calls
            : [
                {
                  id: call.id, contactId: call.contactId, at: call.startedAt,
                  direction: call.direction, missed: true, video: call.video,
                },
                ...st.calls,
              ],
        }));
      },

      endCall: () => {
        const call = get().activeCall;
        if (!call) return;
        const final = call.status === 'ringing' ? 'missed' : 'ended';
        if (isLive) live.updateCallLive(call.id, final as 'ended' | 'missed');
        set((st) => ({
          activeCall: null,
          calls: [
            {
              id: call.id, contactId: call.contactId, at: call.startedAt,
              direction: call.direction, missed: final === 'missed', video: call.video,
            },
            ...st.calls,
          ],
        }));
      },

      setSetting: (k, v) =>
        set((st) => ({ settings: { ...st.settings, [k]: v } })),
      updateProfile: (p) =>
        set((st) => ({ profile: { ...st.profile, ...p } })),
    }),
    {
      name: 'bazingga-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (st) => ({
        authed: st.authed,
        onboarded: st.onboarded,
        profile: st.profile,
        chats: st.chats,
        messages: st.messages.slice(-500),
        moments: st.moments,
        calls: st.calls,
        blocked: st.blocked,
        lastReadAt: st.lastReadAt,
        settings: st.settings,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hydrated: true });
      },
    }
  )
);

// dev-only: expose the store for automated QA drivers (stripped from
// production bundles — __DEV__ is false there)
if (__DEV__) {
  (globalThis as any).__bazStore = useAppStore;
}

// Helpers
export const contactFor = (chatId: string) => {
  const st = useAppStore.getState();
  const chat = st.chats.find((c) => c.id === chatId);
  return st.contacts.find((c) => c.id === chat?.contactId);
};

export const liveMoments = (moments: Moment[]) =>
  moments.filter((m) => m.expiresAt > Date.now());
