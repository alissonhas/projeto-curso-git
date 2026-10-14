-- Fixtures e assertivas, somente no PostgreSQL descartável.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.mutate_event('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000020',0,'Evento planejamento','','2026-10-15',false);
do $$
declare supplier jsonb; material jsonb; action jsonb; first jsonb; retry jsonb; changed jsonb; stale jsonb;
begin
 supplier := '{"name":"Fornecedor AH","contact":"WhatsApp","product":"Microfones","quantity":1,"responsible":"","completed":false,"event_id":null,"supplier_id":null}';
 first := public.mutate_planning('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',0,'supplier',supplier,false);
 retry := public.mutate_planning('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',0,'supplier',supplier,false);
 if first <> retry or first->>'status'<>'saved' or (select count(*) from public.planning_records)<>1 then raise exception 'Supplier idempotence failed'; end if;
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',0,'supplier',jsonb_set(supplier,'{name}','"Outro"'),false);
  raise exception 'Reused operation accepted';
 exception when invalid_parameter_value then null; end;
 material := '{"name":"Microfone","contact":"","product":"","quantity":2,"responsible":"","completed":false,"event_id":"00000000-0000-4000-8000-000000000020","supplier_id":"20000000-0000-4000-8000-000000000001"}';
 first := public.mutate_planning('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',0,'material',material,false);
 if first->>'status'<>'saved' or first->'current'->>'user_id'<>auth.uid()::text then raise exception 'Material linking failed'; end if;
 changed := public.mutate_planning('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002',1,'material',jsonb_set(material,'{quantity}','5'),false);
 stale := public.mutate_planning('10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002',1,'material',material,false);
 if changed->'current'->>'quantity'<>'5' or stale->>'status'<>'conflict' or stale->'current'->>'quantity'<>'5' then raise exception 'Material update/conflict failed'; end if;
 action := '{"name":"Montagem","contact":"","product":"","quantity":1,"responsible":"Ana","completed":false,"event_id":"00000000-0000-4000-8000-000000000020","supplier_id":null}';
 perform public.mutate_planning('10000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000003',0,'action',action,false);
 action := jsonb_set(jsonb_set(action,'{responsible}','"Bruno"'),'{completed}','true');
 changed := public.mutate_planning('10000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000003',1,'action',action,false);
 if changed->'current'->>'responsible'<>'Bruno' or changed->'current'->>'completed'<>'true' then raise exception 'Responsibility update failed'; end if;
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000004',0,'action',jsonb_set(action,'{responsible}','""'),false);
  raise exception 'Empty responsible accepted';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000004',0,'material',jsonb_set(material,'{supplier_id}','"20000000-0000-4000-8000-000000000003"'),false);
  raise exception 'Action used as supplier';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000004',0,'supplier',supplier || '{"user_id":"22222222-2222-4222-8222-222222222222"}',false);
  raise exception 'Owner injection accepted';
 exception when invalid_parameter_value then null; end;
 begin update public.planning_records set name='Bypass';raise exception 'Direct write allowed';exception when insufficient_privilege then null;end;
 raise notice 'PASS: suppliers, materials, actions, responsibility, completion, retries, conflict, type/owner validation, write denial';
end; $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare material jsonb; supplier jsonb; begin
 if (select count(*) from public.planning_records)<>0 then raise exception 'RLS leaked records';end if;
 supplier := '{"name":"Fornecedor B","contact":"Contato B","product":"Produto B","quantity":1,"responsible":"","completed":false,"event_id":null,"supplier_id":null}';
 perform public.mutate_planning('10000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000010',0,'supplier',supplier,false);
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000001',1,'supplier',supplier,false);
  raise exception 'Cross-owner edit';
 exception when insufficient_privilege then null;end;
 material := '{"name":"Ataque","contact":"","product":"","quantity":1,"responsible":"","completed":false,"event_id":"00000000-0000-4000-8000-000000000020","supplier_id":null}';
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000012',0,'material',material,false);
  raise exception 'Cross-owner event link';
 exception when invalid_parameter_value then null;end;
 raise notice 'PASS: cross-owner reads, mutation and event assignment denied';
end; $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ declare material jsonb; supplier jsonb; result jsonb; begin
 material := '{"name":"Microfone","contact":"","product":"","quantity":5,"responsible":"","completed":false,"event_id":"00000000-0000-4000-8000-000000000020","supplier_id":"20000000-0000-4000-8000-000000000001"}';
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000013','20000000-0000-4000-8000-000000000013',0,'material',jsonb_set(material,'{supplier_id}','"20000000-0000-4000-8000-000000000010"'),false);
  raise exception 'Cross-owner supplier link';
 exception when invalid_parameter_value then null;end;
 supplier := '{"name":"Fornecedor AH","contact":"WhatsApp","product":"Microfones","quantity":1,"responsible":"","completed":false,"event_id":null,"supplier_id":null}';
 perform public.mutate_planning('10000000-0000-4000-8000-000000000014','20000000-0000-4000-8000-000000000001',1,'supplier',supplier,true);
 if (select supplier_id from public.planning_records where id='20000000-0000-4000-8000-000000000002')<>'20000000-0000-4000-8000-000000000001' then raise exception 'Historical supplier link lost';end if;
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000015','20000000-0000-4000-8000-000000000015',0,'material',material,false);
  raise exception 'Deleted supplier assignment';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.mutate_planning('10000000-0000-4000-8000-000000000017','20000000-0000-4000-8000-000000000002',2,'material',jsonb_set(material,'{supplier_id}','"20000000-0000-4000-8000-000000000010"'),true);
  raise exception 'Cross-owner link accepted during deletion';
 exception when invalid_parameter_value then null;end;
 result := public.mutate_planning('10000000-0000-4000-8000-000000000016','20000000-0000-4000-8000-000000000002',2,'material',material,true);
 if result->'current'->>'deleted_at' is null then raise exception 'Material tombstone failed';end if;
 if (select count(*) from public.events where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')<>1 then raise exception 'Existing event removed';end if;
 raise notice 'PASS: supplier ownership, archived references, soft deletion, existing events preserved';
end; $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
 if (select count(*) from public.planning_records)<>0 then raise exception 'Nonmember read';end if;
 begin perform public.mutate_planning('10000000-0000-4000-8000-000000000019','20000000-0000-4000-8000-000000000019',0,'supplier','{}',false);raise exception 'Nonmember write';exception when insufficient_privilege then null;end;
 raise notice 'PASS: nonmember planning denied';
end; $$;
reset role;set role anon;
do $$ begin
 begin perform * from public.planning_records;raise exception 'Anonymous read';exception when insufficient_privilege then null;end;
 begin perform public.mutate_planning('10000000-0000-4000-8000-000000000019','20000000-0000-4000-8000-000000000019',0,'supplier','{}',false);raise exception 'Anonymous write';exception when insufficient_privilege then null;end;
 raise notice 'PASS: anonymous planning denied';
end; $$;
reset role;
