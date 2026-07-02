-- Bazingga MVP Schema (paste into Supabase SQL Editor)
-- Claude Code will guide you through running this in Sprint 2.

-- USERS (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique,
  name text not null default '',
  username text unique,
  photo_url text,
  status text default 'Hey there! I am using Bazingga',
  language text default 'en',
  created_at timestamptz default now()
);

-- CHATS
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group')),
  name text,
  created_at timestamptz default now()
);

create table public.chat_members (
  chat_id uuid references public.chats on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  joined_at timestamptz default now(),
  primary key (chat_id, user_id)
);

-- MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats on delete cascade not null,
  sender_id uuid references public.profiles not null,
  content text not null,
  type text not null default 'text' check (type in ('text')),
  sent_at timestamptz default now(),
  delivered_at timestamptz,
  read_at timestamptz
);
create index idx_messages_chat_time on public.messages (chat_id, sent_at desc);

-- MOMENTS (text-only v1, 24h expiry)
create table public.moments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles on delete cascade not null,
  content text not null,
  gradient int not null default 1,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

create table public.moment_views (
  moment_id uuid references public.moments on delete cascade,
  viewer_id uuid references public.profiles on delete cascade,
  viewed_at timestamptz default now(),
  primary key (moment_id, viewer_id)
);

-- SAFETY
create table public.blocks (
  blocker_id uuid references public.profiles on delete cascade,
  blocked_id uuid references public.profiles on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles not null,
  reported_user_id uuid references public.profiles,
  reported_message_id uuid references public.messages,
  reason text not null,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY (Claude Code will add full policies in Sprint 2;
-- baseline: enable on all tables)
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.moments enable row level security;
alter table public.moment_views enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- REALTIME
alter publication supabase_realtime add table public.messages;
