set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ declare first jsonb; retry jsonb; result jsonb; begin
 if exists(select 1 from public.events where city<>'') then raise exception 'Existing events changed';end if;
 first := public.mutate_event_with_city('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',0,'Evento cidade','','2026-10-14',false,' Cuiabá ');
 retry := public.mutate_event_with_city('50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',0,'Evento cidade','','2026-10-14',false,' Cuiabá ');
 if first<>retry or first->'current'->>'city'<>'Cuiabá' then raise exception 'City creation/retry failed';end if;
 result := public.mutate_event_with_city('50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',1,'Evento cidade','','2026-10-14',false,'Várzea Grande');
 if result->'current'->>'city'<>'Várzea Grande' then raise exception 'City edit failed';end if;
 result := public.mutate_event_with_city('50000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000001',1,'Evento cidade','','2026-10-14',false,'Rascunho antigo');
 if result->>'status'<>'conflict' or result->'current'->>'city'<>'Várzea Grande' then raise exception 'City lost in conflict';end if;
 result := public.mutate_event('50000000-0000-4000-8000-000000000004','60000000-0000-4000-8000-000000000001',2,'Cliente antigo','','2026-10-14',false);
 if result->'current'->>'city'<>'Várzea Grande' then raise exception 'Legacy client erased city';end if;
 begin
  perform public.mutate_event_with_city('50000000-0000-4000-8000-000000000005','60000000-0000-4000-8000-000000000001',3,'Evento','','2026-10-14',false,repeat('x',121));
  raise exception 'Oversized city';
 exception when invalid_parameter_value then null;end;
 raise notice 'PASS: event city creation/edit/retry/conflict/legacy/validation';
end; $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
 begin perform public.mutate_event_with_city('50000000-0000-4000-8000-000000000006','60000000-0000-4000-8000-000000000001',3,'Ataque','','2026-10-14',false,'Outra');raise exception 'Cross-owner city edit';exception when insufficient_privilege then null;end;
 raise notice 'PASS: event city cross-owner denial';
end; $$;
reset role;set role anon;
do $$ begin
 begin perform public.mutate_event_with_city('50000000-0000-4000-8000-000000000007','60000000-0000-4000-8000-000000000007',0,'Ataque','','2026-10-14',false,'Outra');raise exception 'Anonymous city creation';exception when insufficient_privilege then null;end;
 raise notice 'PASS: event city anonymous denial';
end; $$;
reset role;
