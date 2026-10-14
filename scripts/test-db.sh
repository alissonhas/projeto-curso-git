#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Banco de teste descartável, sem porta publicada e sem rede. Não usa credenciais de produção.
image='postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24'
container="ah-db-test-$$"
docker run --rm -d --network none --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust "$image" >/dev/null
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
ready=false
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then docker logs "$container"; exit 1; fi
for file in tests/sql/bootstrap.sql supabase/migrations/202610140001_private_events.sql tests/sql/events.sql supabase/migrations/202610140002_planning.sql tests/sql/planning.sql supabase/migrations/202610140003_supplier_city.sql tests/sql/supplier-city.sql supabase/migrations/202610140004_event_city.sql tests/sql/event-city.sql; do
  docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < "$file"
done
# Duas chamadas concorrentes com o mesmo UUID de operação devem criar um registro só.
query="set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false); select public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9',0,'Concorrente','','2026-10-14',false);"
printf '%s\n' "$query" | docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 >/dev/null &
first_pid=$!
printf '%s\n' "$query" | docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 >/dev/null &
second_pid=$!
wait "$first_pid"
wait "$second_pid"
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
 if (select count(*) from public.events where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9') <> 1 then raise exception 'Concurrent duplicate'; end if;
 if (select version from public.events where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9') <> 1 then raise exception 'Concurrent repeat changed version'; end if;
 if (select count(*) from public.event_operations where operation_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9') <> 1 then raise exception 'Concurrent operation duplicated'; end if;
 raise notice 'PASS: concurrent idempotent retry';
end; $$;
SQL

# Duas edições distintas da mesma versão: uma vence; a outra recebe conflito.
query_prefix="set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);"
printf '%s\n' "$query_prefix select public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9',1,'Edição A','','2026-10-14',false);" | docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 >/dev/null &
first_pid=$!
printf '%s\n' "$query_prefix select public.mutate_event('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9',1,'Edição B','','2026-10-14',false);" | docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 >/dev/null &
second_pid=$!
wait "$first_pid"
wait "$second_pid"
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
 if (select version from public.events where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee9') <> 2 then raise exception 'Concurrent stale write'; end if;
 if (select count(*) from public.event_operations where operation_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11') and result->>'status'='saved') <> 1 then raise exception 'Concurrent winners'; end if;
 if (select count(*) from public.event_operations where operation_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11') and result->>'status'='conflict') <> 1 then raise exception 'Concurrent conflict missing'; end if;
 raise notice 'PASS: concurrent version conflict';
end; $$;
SQL
# O protocolo de novos cadastros também precisa resistir a retries simultâneos.
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/sql/planning-concurrent.sql >/dev/null &
first_pid=$!
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/sql/planning-concurrent.sql >/dev/null &
second_pid=$!
wait "$first_pid"
wait "$second_pid"
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
 if (select count(*) from public.planning_records where id='20000000-0000-4000-8000-000000000099')<>1 then raise exception 'Concurrent planning duplicate';end if;
 if (select version from public.planning_records where id='20000000-0000-4000-8000-000000000099')<>1 then raise exception 'Concurrent planning changed version';end if;
 if (select count(*) from public.planning_operations where operation_id='10000000-0000-4000-8000-000000000099')<>1 then raise exception 'Concurrent planning operation duplicate';end if;
 raise notice 'PASS: concurrent planning retry';
end; $$;
SQL
