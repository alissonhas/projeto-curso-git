-- Cidade do evento. Preserva eventos e a função original para clientes antigos.
begin;
alter table public.events add column if not exists city text not null default '';
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.events'::regclass and conname='event_city_valid') then
    alter table public.events add constraint event_city_valid check(length(city) <= 120);
  end if;
end; $$;
create or replace function public.mutate_event_with_city(
  p_operation_id uuid, p_id uuid, p_expected_version integer,
  p_title text, p_description text, p_event_date date, p_deleted boolean, p_city text
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
     or p_city is null or length(trim(p_city)) > 120
     or p_event_date is null or p_event_date not between date '1900-01-01' and date '2100-12-31' then
    raise exception 'Invalid event' using errcode = '22023';
  end if;
  payload := jsonb_build_object('id', p_id, 'version', p_expected_version, 'title', p_title,
    'description', p_description, 'event_date', p_event_date, 'deleted', p_deleted, 'city', p_city);
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
      insert into public.events(id, user_id, title, description, event_date, city)
        values(p_id, owner_id, trim(p_title), p_description, p_event_date, trim(p_city)) returning * into existing;
      outcome := jsonb_build_object('status', 'saved', 'current', to_jsonb(existing));
    end if;
  elsif existing.version <> p_expected_version or existing.deleted_at is not null then
    outcome := jsonb_build_object('status', 'conflict', 'current', to_jsonb(existing));
  else
    update public.events set title = trim(p_title), description = p_description, event_date = p_event_date, city = trim(p_city),
      version = version + 1, updated_at = clock_timestamp(),
      deleted_at = case when p_deleted then clock_timestamp() else null end
      where id = p_id and user_id = owner_id returning * into existing;
    outcome := jsonb_build_object('status', 'saved', 'current', to_jsonb(existing));
  end if;
  insert into public.event_operations(user_id, operation_id, payload, result) values(owner_id, p_operation_id, payload, outcome);
  return outcome;
end;
$$;
revoke all on function public.mutate_event_with_city(uuid,uuid,integer,text,text,date,boolean,text) from public, anon;
grant execute on function public.mutate_event_with_city(uuid,uuid,integer,text,text,date,boolean,text) to authenticated;
commit;
