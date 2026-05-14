create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  strategy_name text not null,
  instrument text not null,
  title text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  trade_date date not null,
  description text not null,
  profit numeric not null,
  screenshot_url text,
  outcome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_trades_trade_date on public.trades(trade_date);
create index if not exists idx_trades_session_id on public.trades(session_id);

alter table public.sessions enable row level security;
alter table public.trades enable row level security;

-- Dev-only open policies. Tighten these before production auth rollout.
drop policy if exists "sessions_all" on public.sessions;
create policy "sessions_all" on public.sessions for all using (true) with check (true);

drop policy if exists "trades_all" on public.trades;
create policy "trades_all" on public.trades for all using (true) with check (true);
