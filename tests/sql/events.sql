insert into public.app_members(user_id) values
 ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
do $$
declare first_result jsonb; repeated jsonb; updated jsonb; conflict jsonb; deleted jsonb;
begin
 first_result := public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 0, 'Produção', 'Descrição', '2026-10-14', false);
 repeated := public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 0, 'Produção', 'Descrição', '2026-10-14', false);
 if first_result <> repeated or first_result->>'status' <> 'saved' or (select count(*) from public.events) <> 1 then raise exception 'Creation/retry failed'; end if;
 if (first_result->'current'->>'version')::integer <> 1 or first_result->'current'->>'user_id' <> auth.uid()::text then raise exception 'Metadata failed'; end if;
 begin
  perform public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 0, 'Outro conteúdo', 'Descrição', '2026-10-14', false);
  raise exception 'Operation accepted different payload';
 exception when invalid_parameter_value then null; end;
 updated := public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 1, 'Versão atual', 'Descrição', '2026-10-14', false);
 if (updated->'current'->>'version')::integer <> 2 then raise exception 'Update failed'; end if;
 conflict := public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 1, 'Rascunho antigo', 'Descrição', '2026-10-14', false);
 if conflict->>'status' <> 'conflict' or conflict->'current'->>'title' <> 'Versão atual' then raise exception 'Conflict did not preserve current version'; end if;
 if (select title from public.events limit 1) <> 'Versão atual' then raise exception 'Silent data loss'; end if;
 deleted := public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 2, 'Versão atual', 'Descrição', '2026-10-14', true);
 repeated := public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 2, 'Versão atual', 'Descrição', '2026-10-14', true);
 if deleted <> repeated or deleted->'current'->>'deleted_at' is null or (select count(*) from public.events) <> 1 then raise exception 'Tombstone/retry failed'; end if;
 conflict := public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 3, 'Restauração indevida', '', '2026-10-14', false);
 if conflict->>'status' <> 'conflict' then raise exception 'Deleted event restored'; end if;
 begin
  update public.events set title = 'Bypass' where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
  raise exception 'Direct mutation allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.app_members values('33333333-3333-4333-8333-333333333333', now());
  raise exception 'Self-authorization allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 0, '  ', '', '2026-10-14', false);
  raise exception 'Invalid title allowed';
 exception when invalid_parameter_value then null; end;
 raise notice 'PASS: creation, UUID metadata, retry, reused operation, version update, conflict, tombstone, direct-write denial, self-authorization denial, validation';
end; $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
do $$ begin
 if (select count(*) from public.events) <> 0 then raise exception 'RLS leaked other user data'; end if;
 if (select count(*) from public.app_members) <> 1 then raise exception 'RLS leaked membership'; end if;
 begin
  perform public.mutate_event('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 3, 'Ataque', '', '2026-10-14', false);
  raise exception 'Cross-user mutation allowed';
 exception when insufficient_privilege then null; end;
 raise notice 'PASS: cross-user reads and writes denied';
end; $$;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);
do $$ begin
 if (select count(*) from public.events) <> 0 then raise exception 'Non-member read allowed'; end if;
 begin
  perform public.mutate_event('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 0, 'Ataque', '', '2026-10-14', false);
  raise exception 'Non-member creation allowed';
 exception when insufficient_privilege then null; end;
 raise notice 'PASS: non-member denied';
end; $$;
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
 begin perform * from public.events; raise exception 'Anonymous read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.mutate_event('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 0, 'Ataque', '', '2026-10-14', false); raise exception 'Anonymous write allowed'; exception when insufficient_privilege then null; end;
 raise notice 'PASS: anonymous reads and writes denied';
end; $$;
reset role;
