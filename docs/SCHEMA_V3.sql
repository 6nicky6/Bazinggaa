-- ============================================================
-- Bazingga Schema v3 — Groups, Channels, Calls + test-data sweep
-- Run AFTER v2 (SUPABASE_SCHEMA.sql). Paste whole file in SQL editor.
-- ============================================================

-- 1) TEST DATA SWEEP (from QA audit sessions that hit live)
delete from public.messages where content in ('Bazingga test') or content like 'QA-TEST%';
delete from auth.users where email like '%+test%@gmail.com';

-- 2) GROUPS & CHANNELS (chats.type already supports 'direct'/'group')
alter table public.chats drop constraint if exists chats_type_check;
alter table public.chats add constraint chats_type_check
  check (type in ('direct','group','channel'));
alter table public.chats add column if not exists name text;
alter table public.chats add column if not exists icon_emoji text default '👥';
alter table public.chats add column if not exists created_by uuid references public.profiles;
alter table public.chat_members add column if not exists role text not null default 'member'
  check (role in ('owner','admin','member'));

-- members can insert themselves when joining via link; creators add anyone
create or replace function public.create_group_chat(
  p_type text, p_name text, p_icon text, p_member_ids uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_chat uuid;
  m uuid;
begin
  if p_type not in ('group','channel') then raise exception 'bad type'; end if;
  insert into chats (type, name, icon_emoji, created_by)
    values (p_type, p_name, p_icon, auth.uid()) returning id into v_chat;
  insert into chat_members (chat_id, user_id, role) values (v_chat, auth.uid(), 'owner');
  foreach m in array p_member_ids loop
    if m <> auth.uid() then
      insert into chat_members (chat_id, user_id, role) values (v_chat, m, 'member')
      on conflict do nothing;
    end if;
  end loop;
  return v_chat;
end;
$$;

-- channels: only owner/admin may post
create or replace function public.can_post(p_chat_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when (select type from chats where id = p_chat_id) = 'channel'
      then exists (select 1 from chat_members where chat_id = p_chat_id
                   and user_id = auth.uid() and role in ('owner','admin'))
    else public.is_chat_member(p_chat_id)
  end;
$$;
drop policy if exists "messages insert by sender" on public.messages;
create policy "messages insert by sender" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.can_post(chat_id));

-- 3) CALLS (signaling mechanism; media ships with dev-client build)
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats on delete cascade not null,
  caller_id uuid references public.profiles not null,
  callee_id uuid references public.profiles not null,
  video boolean not null default false,
  status text not null default 'ringing'
    check (status in ('ringing','accepted','declined','ended','missed')),
  started_at timestamptz default now(),
  ended_at timestamptz
);
alter table public.calls enable row level security;
create policy "calls visible to participants" on public.calls
  for select to authenticated using (caller_id = auth.uid() or callee_id = auth.uid());
create policy "calls insert by caller" on public.calls
  for insert to authenticated with check (caller_id = auth.uid());
create policy "calls update by participants" on public.calls
  for update to authenticated using (caller_id = auth.uid() or callee_id = auth.uid());
alter publication supabase_realtime add table public.calls;

-- 4) USERNAME SEARCH (discovery redesign: find by handle, not list-everyone)
create index if not exists idx_profiles_username on public.profiles (username);
