-- Run once in the SQL editor of a Supabase project used only for this demo.
-- The browser has no policies on these tables. The server uses the secret key.

create table public.leadflow_leads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  preset text not null check (preset in ('home-services', 'agency', 'real-estate')),
  original_message text not null,
  extraction jsonb not null,
  missing_fields text[] not null,
  route text not null,
  draft_reply text not null,
  status text not null default 'needs_review',
  elapsed_ms integer not null
);

alter table public.leadflow_leads enable row level security;
revoke all on public.leadflow_leads from anon, authenticated;
grant select, insert, update, delete on public.leadflow_leads to service_role;

create table public.leadflow_usage (
  bucket timestamptz primary key,
  attempts integer not null default 0
);

alter table public.leadflow_usage enable row level security;
revoke all on public.leadflow_usage from anon, authenticated;
grant select, insert, update, delete on public.leadflow_usage to service_role;

-- One row per database hour. The count goes up before a model call.
create or replace function public.reserve_leadflow_attempt()
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
begin
  insert into public.leadflow_usage (bucket, attempts)
  values (date_trunc('hour', now()), 1)
  on conflict (bucket) do update
    set attempts = public.leadflow_usage.attempts + 1
  returning attempts into current_count;

  return current_count <= 30;
end;
$$;

revoke all on function public.reserve_leadflow_attempt() from public, anon, authenticated;
grant execute on function public.reserve_leadflow_attempt() to service_role;

-- Cleanup is manual. Nothing here runs on a schedule.
-- delete from public.leadflow_leads where created_at < now() - interval '7 days';
-- delete from public.leadflow_usage where bucket < now() - interval '7 days';
