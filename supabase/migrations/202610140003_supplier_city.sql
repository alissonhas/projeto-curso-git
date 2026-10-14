-- Atualização adicional. Preserva todos os cadastros existentes.
begin;
alter table public.planning_records add column if not exists city text not null default '';
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.planning_records'::regclass and conname='planning_city_valid') then
    alter table public.planning_records add constraint planning_city_valid check (length(city) <= 120 and (kind = 'supplier' or city = ''));
  end if;
end; $$;
create or replace function public.mutate_planning(p_operation_id uuid, p_id uuid, p_expected_version integer,
  p_kind text, p_data jsonb, p_deleted boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  existing public.planning_records%rowtype;
  operation public.planning_operations%rowtype;
  payload jsonb;
  outcome jsonb;
  record_name text;
  record_contact text;
  record_city text;
  record_product text;
  record_responsible text;
  record_quantity integer;
  record_completed boolean;
  linked_event uuid;
  linked_supplier uuid;
begin
  if owner_id is null or not exists(select 1 from public.app_members where user_id = owner_id) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  if p_id is null or p_operation_id is null or p_expected_version is null or p_expected_version not between 0 and 2147483646
    or p_kind is null or p_kind not in ('supplier','material','action') or p_deleted is null
    or p_data is null or jsonb_typeof(p_data) <> 'object'
    or p_data - array['name','contact','city','product','quantity','responsible','completed','event_id','supplier_id'] <> '{}'::jsonb then
    raise exception 'Invalid record' using errcode = '22023';
  end if;
  if jsonb_typeof(p_data->'name') is distinct from 'string'
    or jsonb_typeof(p_data->'contact') is distinct from 'string'
    or jsonb_typeof(p_data->'product') is distinct from 'string'
    or jsonb_typeof(p_data->'responsible') is distinct from 'string'
    or jsonb_typeof(p_data->'quantity') is distinct from 'number'
    or jsonb_typeof(p_data->'completed') is distinct from 'boolean'
    or p_data->>'quantity' !~ '^[0-9]{1,7}$'
    or jsonb_typeof(p_data->'event_id') not in ('string','null') or not (p_data ? 'event_id')
    or jsonb_typeof(p_data->'supplier_id') not in ('string','null') or not (p_data ? 'supplier_id') then
    raise exception 'Invalid record fields' using errcode = '22023';
  end if;
  if p_data ? 'city' and jsonb_typeof(p_data->'city') is distinct from 'string' then
    raise exception 'Invalid city' using errcode = '22023';
  end if;
  record_city := trim(coalesce(p_data->>'city',''));
  record_name := trim(p_data->>'name'); record_contact := trim(p_data->>'contact');
  record_product := trim(p_data->>'product'); record_responsible := trim(p_data->>'responsible');
  record_quantity := (p_data->>'quantity')::integer; record_completed := (p_data->>'completed')::boolean;
  linked_event := (p_data->>'event_id')::uuid; linked_supplier := (p_data->>'supplier_id')::uuid;
  if length(record_city) > 120 or (p_kind <> 'supplier' and record_city <> '') or length(record_name) not between 1 and 160 or length(record_contact) > 200 or length(record_product) > 500
    or length(record_responsible) > 160 or record_quantity not between 1 and 1000000
    or (p_kind = 'supplier' and (linked_event is not null or linked_supplier is not null or record_contact = '' or record_product = ''))
    or (p_kind <> 'supplier' and (linked_event is null or record_contact <> '' or record_product <> ''))
    or (p_kind <> 'material' and (record_quantity <> 1 or linked_supplier is not null))
    or (p_kind = 'action' and record_responsible = '')
    or (p_kind <> 'action' and (record_responsible <> '' or record_completed)) then
    raise exception 'Invalid record values' using errcode = '22023';
  end if;
  payload := jsonb_build_object('id',p_id,'version',p_expected_version,'kind',p_kind,'data',p_data,'deleted',p_deleted);
  perform pg_advisory_xact_lock(hashtextextended('planning-operation:' || owner_id::text || ':' || p_operation_id::text,0));
  select * into operation from public.planning_operations where user_id=owner_id and operation_id=p_operation_id;
  if found then
    if operation.payload <> payload then raise exception 'Operation UUID reused' using errcode = '22023'; end if;
    return operation.result;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('planning:' || p_id::text,0));
  select * into existing from public.planning_records where id=p_id;
  if found and (existing.user_id <> owner_id or existing.kind <> p_kind) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
  -- Older clients omit city: keep the stored value instead of erasing it.
  if not (p_data ? 'city') and existing.id is not null then record_city := existing.city; end if;
  if (existing.id is null and (p_expected_version <> 0 or p_deleted))
    or (existing.id is not null and (existing.version <> p_expected_version or existing.deleted_at is not null)) then
    outcome := jsonb_build_object('status','conflict','current',case when existing.id is null then null else to_jsonb(existing) end);
  else
    -- Row locks prevent a link from being assigned while its parent is deleted.
    -- Existing links are kept as history after later soft deletions.
    if linked_event is not null then
      perform id from public.events where id=linked_event and user_id=owner_id and (p_deleted or deleted_at is null) for share;
      if not found then raise exception 'Invalid event link' using errcode = '22023'; end if;
    end if;
    if linked_supplier is not null then
      perform id from public.planning_records where id=linked_supplier and user_id=owner_id and kind='supplier' and (p_deleted or deleted_at is null) for share;
      if not found then raise exception 'Invalid supplier link' using errcode = '22023'; end if;
    end if;
    if existing.id is null then
      insert into public.planning_records(id,user_id,kind,name,contact,city,product,quantity,responsible,completed,event_id,supplier_id)
        values(p_id,owner_id,p_kind,record_name,record_contact,record_city,record_product,record_quantity,record_responsible,record_completed,linked_event,linked_supplier)
        returning * into existing;
    else
      update public.planning_records set name=record_name,contact=record_contact,city=record_city,product=record_product,quantity=record_quantity,
        responsible=record_responsible,completed=record_completed,event_id=linked_event,supplier_id=linked_supplier,
        version=version+1,updated_at=clock_timestamp(),deleted_at=case when p_deleted then clock_timestamp() else null end
        where id=p_id and user_id=owner_id returning * into existing;
    end if;
    outcome := jsonb_build_object('status','saved','current',to_jsonb(existing));
  end if;
  insert into public.planning_operations(user_id,operation_id,payload,result) values(owner_id,p_operation_id,payload,outcome);
  return outcome;
end; $$;
revoke all on function public.mutate_planning(uuid,uuid,integer,text,jsonb,boolean) from public,anon;
grant execute on function public.mutate_planning(uuid,uuid,integer,text,jsonb,boolean) to authenticated;
commit;
