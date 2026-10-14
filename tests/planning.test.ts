import { describe, expect, it, vi } from 'vitest';
import { parsePlanning } from '../src/lib/planning';
import { agendaGroups } from '../src/lib/agenda';
import { loadAllPages } from '../src/lib/pagination';
import type { EventRecord } from '../src/lib/events';
function form(kind = 'supplier') {
  const data = new FormData();
  Object.entries({ kind, id:'11111111-1111-4111-8111-111111111111', operation_id:'22222222-2222-4222-8222-222222222222',version:'0',name:'Empresa AH',contact:'WhatsApp informado',product:'Som e iluminação',event_id:'33333333-3333-4333-8333-333333333333',quantity:'2',responsible:'Ana' }).forEach(([k,v])=>data.set(k,v));
  return data;
}
describe('Cadastros de planejamento', () => {
  it('fornecedor envia somente os três campos de negócio e metadados padrão', () => {
    const parsed = parsePlanning(form());
    expect(parsed.data).toEqual({name:'Empresa AH',contact:'WhatsApp informado',product:'Som e iluminação',quantity:1,responsible:'',completed:false,event_id:null,supplier_id:null});
  });
  it('material exige evento, quantidade inteira e permite fornecedor opcional', () => {
    const data=form('material'); expect(parsePlanning(data).data.quantity).toBe(2);
    expect(parsePlanning(data).data.contact).toBe('');
    data.set('quantity','1.5');expect(()=>parsePlanning(data)).toThrow('quantidade');
    data.set('quantity','2');data.set('event_id','');expect(()=>parsePlanning(data)).toThrow('evento');
    data.set('event_id','33333333-3333-4333-8333-333333333333');data.set('supplier_id','inválido');expect(()=>parsePlanning(data)).toThrow('Fornecedor');
  });
  it('ação exige responsável e preserva conclusão', () => {
    const data=form('action');data.set('completed','on');expect(parsePlanning(data).data.completed).toBe(true);
    data.set('responsible',' ');expect(()=>parsePlanning(data)).toThrow('responsável');
  });
  it.each(['contact','product'])('fornecedor exige %s', key=>{const data=form();data.set(key,'');expect(()=>parsePlanning(data)).toThrow();});
  it('rejeita versões inválidas e tipo arbitrário',()=>{const data=form();data.set('version','-1');expect(()=>parsePlanning(data)).toThrow();data.set('version','0');data.set('kind','users');expect(()=>parsePlanning(data)).toThrow();});
});
function event(id:string,date:string,deleted_at:string|null=null):EventRecord {
  return {id,user_id:'fixture',title:id,description:'',event_date:date,version:1,created_at:'',updated_at:'',deleted_at};
}
it('agenda reflete data alterada, ordem cronológica e exclui tombstones sem copiar registros',()=>{
  const first=event('a','2026-10-14');const second=event('b','2026-11-01');
  const input=[second,first,event('deleted','2026-10-02','2026-10-03')];
  expect(agendaGroups(input).map(group=>group.month)).toEqual(['2026-10','2026-11']);
  expect(agendaGroups(input)[0].items).toEqual([first]);
  first.event_date='2026-12-31';expect(agendaGroups(input).map(group=>group.month)).toEqual(['2026-11','2026-12']);
  first.deleted_at='2026-10-14';expect(agendaGroups(input).flatMap(group=>group.items).map(row=>row.id)).toEqual(['b']);
});
it('carrega todas as páginas e não exibe uma lista parcial quando a próxima consulta falha',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce({data:Array.from({length:500},(_,id)=>id),error:null}).mockResolvedValueOnce({data:[500],error:null});
  expect((await loadAllPages<number>(fetch)).data?.length).toBe(501);
  expect(fetch).toHaveBeenNthCalledWith(2,500,999);
  const fail=vi.fn().mockResolvedValueOnce({data:Array(500).fill(0),error:null}).mockResolvedValueOnce({data:null,error:new Error('offline')});
  expect((await loadAllPages<number>(fail)).data).toBeNull();
});
