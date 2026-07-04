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

const isLive = backendMode === 'live';

let idc = 0;
const uid = () => `${Date.now().toString(36)}-${(idc++).toString(36)}`;
let liveUnsub: (() => void) | null = null;
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
  sendMessage: (chatId: string, text: string) => void;
  retryMessage: (messageId: string) => void;
  sendImage: (chatId: string, imageUri: string) => void;
  activeCall: CallState | null;
  startCall: (contactId: string, video: boolean) => void;
  answerCall: (accept: boolean) => void;
  endCall: () => void;
  markChatRead: (chatId: string) => void;
  ensureChat: (contactId: string) => Promise<string | null>;
  createGroup: (kind: 'group' | 'channel', name: string, icon: string, memberIds: string[]) => Promise<string | null>;
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
          live.signOutLive();
          set({
            authed: false, profile: defaultProfile,
            contacts: [], chats: [], messages: [], moments: [], blocked: [],
          });
        } else {
          set({ authed: false, profile: defaultProfile });
        }
      },

      sendMessage: (chatId, text) => {
        const tempId = uid();
        const msg: Message = {
          id: tempId, chatId, senderId: 'me', text,
          sentAt: Date.now(), status: isLive ? 'sending' : 'sent',
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
          live.sendMessageLive(chatId, text).then((serverMsg) => {
            set((st) => ({
              messages: st.messages.map((m) =>
                m.id === tempId
                  ? serverMsg ?? { ...m, status: 'failed' as const } // never drop a message
                  : m
              ),
            }));
          });
        } else {
          scheduleAutoReply(chatId, text);
        }
      },

      sendImage: (chatId, imageUri) => {
        const msg: Message = {
          id: uid(), chatId, senderId: 'me', text: '', imageUri,
          sentAt: Date.now(), status: 'sent',
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
        }
        // live: image stays on-device until media sync ships (bubble shows a note)
      },

      retryMessage: (messageId: string) => {
        const msg = get().messages.find((m) => m.id === messageId);
        if (!msg || msg.status !== 'failed') return;
        set((st) => ({
          messages: st.messages.map((m) =>
            m.id === messageId ? { ...m, status: 'sending' as const, sentAt: Date.now() } : m
          ),
        }));
        live.sendMessageLive(msg.chatId, msg.text).then((serverMsg) => {
          set((st) => ({
            messages: st.messages.map((m) =>
              m.id === messageId
                ? serverMsg ?? { ...m, status: 'failed' as const }
                : m
            ),
          }));
        });
      },

      markChatRead: (chatId) =>
        set((st) => ({ lastReadAt: { ...st.lastReadAt, [chatId]: Date.now() } })),

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

      bootLive: async () => {
        if (!isLive) return;
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

// Helpers
export const contactFor = (chatId: string) => {
  const st = useAppStore.getState();
  const chat = st.chats.find((c) => c.id === chatId);
  return st.contacts.find((c) => c.id === chat?.contactId);
};

export const liveMoments = (moments: Moment[]) =>
  moments.filter((m) => m.expiresAt > Date.now());
