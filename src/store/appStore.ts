import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gradients } from '../theme/colors';
import {
  CallLog, Chat, Contact, Message, Moment, Profile,
} from '../types';
import {
  CONTACTS, pickReply, seedCalls, seedMessages, seedMoments,
} from '../services/personas';
import { backendMode } from '../services/supabase';
import * as live from '../services/live';

const isLive = backendMode === 'live';

let idc = 0;
const uid = () => `${Date.now().toString(36)}-${(idc++).toString(36)}`;
let liveUnsub: (() => void) | null = null;

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
  markChatRead: (chatId: string) => void;
  ensureChat: (contactId: string) => Promise<string | null>;
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
      // live mode starts empty and fills from Supabase in bootLive()
      contacts: isLive ? [] : CONTACTS,
      chats: isLive
        ? []
        : [
            { id: 'aisha', contactId: 'aisha' },
            { id: 'mom', contactId: 'mom' },
            { id: 'rahul', contactId: 'rahul' },
            { id: 'zara', contactId: 'zara' },
            { id: 'dad', contactId: 'dad' },
            { id: 'welcome', contactId: 'sana' },
          ],
      messages: isLive ? [] : seedMessages(),
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
        if (isLive) {
          live.sendMessageLive(chatId, text).then((serverMsg) => {
            set((st) => ({
              messages: serverMsg
                ? st.messages.map((m) => (m.id === tempId ? serverMsg : m))
                : st.messages.filter((m) => m.id !== tempId), // failed → remove optimistic
            }));
          });
        } else {
          scheduleAutoReply(chatId, text);
        }
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

      bootLive: async () => {
        if (!isLive) return;
        const data = await live.loadAll();
        if (data) {
          set({
            contacts: data.contacts,
            chats: data.chats,
            messages: data.messages,
            moments: data.moments,
            blocked: data.blocked,
            calls: [],
          });
        }
        liveUnsub?.();
        liveUnsub = live.subscribeLive({
          onMessage: (m) => {
            set((st) =>
              st.messages.some((x) => x.id === m.id)
                ? st // already have it (own optimistic replaced by server copy)
                : { messages: [...st.messages, m] }
            );
          },
          onMomentChange: () => {
            live.loadAll().then((d) => d && set({ moments: d.moments }));
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
