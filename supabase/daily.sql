-- Run in Supabase SQL Editor; safe to rerun for upgrades. Only the server service key has access.
create table if not exists public.daily_runs (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  started_at timestamptz not null default now(),
  used boolean not null default false,
  player_id uuid
);
create index if not exists daily_runs_started on public.daily_runs(started_at);
create table if not exists public.daily_scores (
  day date not null,
  player_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 20),
  score integer not null check (score between 1 and 100000),
  wpm integer not null check (wpm between 0 and 1000),
  accuracy integer not null check (accuracy between 0 and 100),
  best_combo integer not null check (best_combo between 0 and 10000),
  primary key (day, player_id)
);
-- Existing scores keep their rules version; 15-second faster-decay scoring uses version 5; versions 3/4 remain isolated for old deployments.
alter table public.daily_runs add column if not exists rules_version smallint not null default 1;
alter table public.daily_scores add column if not exists rules_version smallint not null default 1;
alter table public.daily_scores drop constraint if exists daily_scores_pkey;
alter table public.daily_scores add primary key (day, rules_version, player_id);
create index if not exists daily_scores_rules_rank on public.daily_scores(day, rules_version, score desc, accuracy desc, wpm desc);
create index if not exists daily_scores_rank on public.daily_scores(day, score desc, accuracy desc, wpm desc);
alter table public.daily_runs enable row level security;
alter table public.daily_scores enable row level security;
revoke all on public.daily_runs, public.daily_scores from anon, authenticated;
grant all on public.daily_runs, public.daily_scores to service_role;

drop function if exists public.begin_daily(date);
create or replace function public.begin_daily(p_day date, p_rules_version smallint)
returns setof public.daily_runs language plpgsql security invoker set search_path = '' as $$
begin
  if p_rules_version not in (3, 4, 5) or p_day <> (now() at time zone 'UTC')::date then raise exception 'Invalid day'; end if;
  delete from public.daily_runs where started_at < now() - interval '2 days';
  return query insert into public.daily_runs(day, rules_version) values (p_day, p_rules_version) returning *;
end;
$$;

create or replace function public.complete_daily(p_id uuid, p_player uuid, p_name text, p_score integer, p_wpm integer, p_accuracy integer, p_combo integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare r public.daily_runs%rowtype;
begin
  select * into r from public.daily_runs where id = p_id for update;
  if not found or r.rules_version not in (3, 4, 5) or r.used or r.started_at > now() - interval '13 seconds' or r.started_at < now() - interval '10 minutes' then raise exception 'Invalid run'; end if;
  update public.daily_runs set used = true, player_id = p_player where id = p_id;
  insert into public.daily_scores(day, rules_version, player_id, display_name, score, wpm, accuracy, best_combo)
    values (r.day, r.rules_version, p_player, p_name, p_score, p_wpm, p_accuracy, p_combo)
    on conflict (day, rules_version, player_id) do update set display_name = excluded.display_name, score = excluded.score, wpm = excluded.wpm, accuracy = excluded.accuracy, best_combo = excluded.best_combo
    where (excluded.score, excluded.accuracy, excluded.wpm) > (public.daily_scores.score, public.daily_scores.accuracy, public.daily_scores.wpm);
end;
$$;
revoke all on function public.begin_daily(date, smallint) from public, anon, authenticated;
revoke all on function public.complete_daily(uuid, uuid, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.begin_daily(date, smallint) to service_role;
grant execute on function public.complete_daily(uuid, uuid, text, integer, integer, integer, integer) to service_role;
