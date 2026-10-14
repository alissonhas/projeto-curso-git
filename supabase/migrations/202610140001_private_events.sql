-- Execute no SQL Editor do seu projeto Supabase. Não há credenciais nesta migração.
begin;
create table public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_members enable row level security;
create policy member_reads_own_access on public.app_members for select to authenticated using (auth.uid() = user_id);
revoke all on public.app_members from public, anon, authenticated;
grant select on public.app_members to authenticated;

create table public.events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 5000),
  event_date date not null check (event_date between date '1900-01-01' and date '2100-12-31'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index events_user_date on public.events(user_id, event_date) where deleted_at is null;
alter table public.events enable row level security;
create policy private_events on public.events for select to authenticated using (
  user_id = auth.uid() and exists(select 1 from public.app_members m where m.user_id = auth.uid())
);
revoke all on public.events from public, anon, authenticated;
grant select on public.events to authenticated;

-- Persistência de confirmação: uma mesma operação nunca aplica duas mutações.
create table public.event_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  payload jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id, operation_id)
);
alter table public.event_operations enable row level security;
revoke all on public.event_operations from public, anon, authenticated;

-- Apenas esta função escreve. A autorização é explícita pois SECURITY DEFINER
-- executa como proprietário; políticas RLS continuam protegendo leituras diretas.
create function public.mutate_event(
  p_operation_id uuid, p_id uuid, p_expected_version integer,
  p_title text, p_description text, p_event_date date, p_deleted boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  existing public.events%rowtype;
  operation public.event_operations%rowtype;
  payload jsonb;
  outcome jsonb;
begin
  if owner_id is null or not exists(select 1 from public.app_members where user_id = owner_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if p_operation_id is null or p_id is null or p_expected_version is null
     or p_expected_version < 0 or p_expected_version > 2147483646 or p_deleted is null
     or p_title is null or length(trim(p_title)) not between 1 and 160
     or p_description is null or length(p_description) > 5000
     or p_event_date is null or p_event_date not between date '1900-01-01' and date '2100-12-31' then
    raise exception 'Invalid event' using errcode = '22023';
  end if;
  payload := jsonb_build_object('id', p_id, 'version', p_expected_version, 'title', p_title,
    'description', p_description, 'event_date', p_event_date, 'deleted', p_deleted);
  -- Locks transacionais também protegem criações concorrentes e retries.
  perform pg_advisory_xact_lock(hashtextextended('operation:' || owner_id::text || ':' || p_operation_id::text, 0));
  select * into operation from public.event_operations where user_id = owner_id and operation_id = p_operation_id;
  if found then
    if operation.payload <> payload then raise exception 'Operation UUID reused with another payload' using errcode = '22023'; end if;
    return operation.result;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('event:' || p_id::text, 0));
  select * into existing from public.events where id = p_id;
  if found and existing.user_id <> owner_id then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if existing.id is null then
    if p_expected_version <> 0 or p_deleted then
      outcome := jsonb_build_object('status', 'conflict', 'current', null);
    else
      insert into public.events(id, user_id, title, description, event_date)
        values(p_id, owner_id, trim(p_title), p_description, p_event_date) returning * into existing;
      outcome := jsonb_build_object('status', 'saved', 'current', to_jsonb(existing));
    end if;
  elsif existing.version <> p_expected_version or existing.deleted_at is not null then
    outcome := jsonb_build_object('status', 'conflict', 'current', to_jsonb(existing));
  else
    update public.events set title = trim(p_title), description = p_description, event_date = p_event_date,
      version = version + 1, updated_at = clock_timestamp(),
      deleted_at = case when p_deleted then clock_timestamp() else null end
      where id = p_id and user_id = owner_id returning * into existing;
    outcome := jsonb_build_object('status', 'saved', 'current', to_jsonb(existing));
  end if;
  insert into public.event_operations(user_id, operation_id, payload, result) values(owner_id, p_operation_id, payload, outcome);
  return outcome;
end;
$$;
revoke all on function public.mutate_event(uuid,uuid,integer,text,text,date,boolean) from public, anon;
grant execute on function public.mutate_event(uuid,uuid,integer,text,text,date,boolean) to authenticated;
commit;
