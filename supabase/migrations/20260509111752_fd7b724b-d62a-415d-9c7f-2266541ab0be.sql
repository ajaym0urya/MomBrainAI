
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('task','reminder')),
  title text not null,
  who text,
  when_at timestamptz,
  recurrence text,
  status text not null default 'active' check (status in ('active','done','cancelled')),
  created_at timestamptz not null default now()
);
alter table public.items enable row level security;
create policy "items_select_own" on public.items for select using (auth.uid() = user_id);
create policy "items_insert_own" on public.items for insert with check (auth.uid() = user_id);
create policy "items_update_own" on public.items for update using (auth.uid() = user_id);
create policy "items_delete_own" on public.items for delete using (auth.uid() = user_id);
create index items_user_when_idx on public.items(user_id, when_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "messages_select_own" on public.messages for select using (auth.uid() = user_id);
create policy "messages_insert_own" on public.messages for insert with check (auth.uid() = user_id);
create policy "messages_delete_own" on public.messages for delete using (auth.uid() = user_id);
create index messages_user_created_idx on public.messages(user_id, created_at);
