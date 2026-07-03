-- ============================================================
-- Bazingga MVP Schema v2 — paste this WHOLE file into
-- Supabase Dashboard → SQL Editor → New query → Run.
-- Includes tables + Row Level Security policies + helpers.
-- Safe to run on a fresh project.
-- ============================================================

-- USERS (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique,
  name text not null default '',
  username text unique,
  avatar_emoji text default '⚡',
  avatar_gradient int default 1,
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

-- ============================================================
-- ROW LEVEL SECURITY (privacy is brand identity)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.moments enable row level security;
alter table public.moment_views enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- helper: is the current user a member of a chat?
create or replace function public.is_chat_member(p_chat_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chat_members
    where chat_id = p_chat_id and user_id = auth.uid()
  );
$$;

-- PROFILES: everyone signed-in can see profiles (needed for contacts);
-- you can only create/update your own.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- CHATS: visible only to members.
create policy "chats visible to members" on public.chats
  for select to authenticated using (public.is_chat_member(id));

-- CHAT MEMBERS: you see rows of chats you belong to.
create policy "members visible to members" on public.chat_members
  for select to authenticated using (public.is_chat_member(chat_id));

-- MESSAGES: members read; sender inserts as self into their chats.
create policy "messages read by members" on public.messages
  for select to authenticated using (public.is_chat_member(chat_id));
create policy "messages insert by sender" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_chat_member(chat_id));
create policy "messages update by members" on public.messages
  for update to authenticated using (public.is_chat_member(chat_id));

-- MOMENTS: any signed-in user reads unexpired ones; author manages own.
create policy "moments readable while live" on public.moments
  for select to authenticated using (expires_at > now());
create policy "moments insert own" on public.moments
  for insert to authenticated with check (author_id = auth.uid());
create policy "moments delete own" on public.moments
  for delete to authenticated using (author_id = auth.uid());

-- MOMENT VIEWS: viewer records own view; author + viewer can read.
create policy "views insert own" on public.moment_views
  for insert to authenticated with check (viewer_id = auth.uid());
create policy "views readable" on public.moment_views
  for select to authenticated using (
    viewer_id = auth.uid()
    or exists (select 1 from moments m where m.id = moment_id and m.author_id = auth.uid())
  );

-- BLOCKS: you manage and see only your own block list.
create policy "blocks own" on public.blocks
  for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- REPORTS: anyone signed-in can file; only staff read (no select policy).
create policy "reports insert own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- ============================================================
-- HELPER: find-or-create a direct chat between me and another user.
-- (security definer so it can create chat + both memberships atomically)
-- ============================================================
create or replace function public.create_direct_chat(p_other_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_chat uuid;
begin
  if p_other_user = auth.uid() then
    raise exception 'cannot chat with yourself';
  end if;
  -- existing direct chat containing exactly these two?
  select cm1.chat_id into v_chat
  from chat_members cm1
  join chat_members cm2 on cm1.chat_id = cm2.chat_id
  join chats c on c.id = cm1.chat_id and c.type = 'direct'
  where cm1.user_id = auth.uid() and cm2.user_id = p_other_user
  limit 1;
  if v_chat is not null then
    return v_chat;
  end if;
  insert into chats (type) values ('direct') returning id into v_chat;
  insert into chat_members (chat_id, user_id) values (v_chat, auth.uid()), (v_chat, p_other_user);
  return v_chat;
end;
$$;

-- REALTIME
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.moments;
