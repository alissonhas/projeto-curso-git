set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.mutate_planning('10000000-0000-4000-8000-000000000099','20000000-0000-4000-8000-000000000099',0,'supplier',
 '{"name":"Fornecedor concorrente","contact":"Contato teste","product":"Palco","quantity":1,"responsible":"","completed":false,"event_id":null,"supplier_id":null}',false);
