set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare data jsonb; result jsonb; retry jsonb;
begin
 if exists(select 1 from public.planning_records where city <> '') then raise exception 'Existing city not initialized';end if;
 data := '{"name":"Fornecedor cidade","contact":"Contato","product":"Palco","city":"Cuiabá","quantity":1,"responsible":"","completed":false,"event_id":null,"supplier_id":null}';
 result := public.mutate_planning('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',0,'supplier',data,false);
 retry := public.mutate_planning('30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',0,'supplier',data,false);
 if result <> retry or result->'current'->>'city'<>'Cuiabá' then raise exception 'City persistence/retry failed';end if;
 result := public.mutate_planning('30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',1,'supplier',jsonb_set(data,'{city}','"Várzea Grande"'),false);
 if result->'current'->>'city'<>'Várzea Grande' then raise exception 'City edit failed';end if;
 result := public.mutate_planning('30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001',2,'supplier',data - 'city',false);
 if result->'current'->>'city'<>'Várzea Grande' then raise exception 'Legacy client erased city';end if;
 begin
  perform public.mutate_planning('30000000-0000-4000-8000-000000000004','40000000-0000-4000-8000-000000000001',3,'supplier',jsonb_set(data,'{city}',to_jsonb(repeat('x',121))),false);
  raise exception 'Oversized city accepted';
 exception when invalid_parameter_value then null;end;
 raise notice 'PASS: existing suppliers, city creation/edit/retry, legacy compatibility, city validation';
end; $$;
reset role;
