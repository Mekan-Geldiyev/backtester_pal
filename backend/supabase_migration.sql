-- Run this in Supabase SQL Editor AFTER the initial supabase_schema.sql.

-- 1. Strategies table (one per user, defines strat + instrument)
create table if not exists public.strategies (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  instrument  text        not null,
  description text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_strategies_user_id on public.strategies(user_id);

alter table public.strategies enable row level security;
drop policy if exists "strategies_own" on public.strategies;
create policy "strategies_own" on public.strategies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Extend sessions with user_id + strategy_id FK
alter table public.sessions
  add column if not exists user_id     uuid references auth.users(id)      on delete cascade,
  add column if not exists strategy_id uuid references public.strategies(id) on delete set null;

-- Make legacy NOT NULL cols nullable (strategy_id FK carries the info now)
alter table public.sessions
  alter column strategy_name drop not null,
  alter column instrument    drop not null;

create index if not exists idx_sessions_user_id     on public.sessions(user_id);
create index if not exists idx_sessions_strategy_id on public.sessions(strategy_id);

-- 3. Extend trades with user_id
alter table public.trades
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_trades_user_id on public.trades(user_id);

-- 4. Tighten RLS on sessions + trades to per-user
drop policy if exists "sessions_all" on public.sessions;
drop policy if exists "sessions_own" on public.sessions;
create policy "sessions_own" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "trades_all" on public.trades;
drop policy if exists "trades_own" on public.trades;
create policy "trades_own" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
