import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { loadAllPages } from '@/lib/pagination';
import { UUID_PATTERN } from '@/lib/validation';
import { planningInfo, type PlanningKind, type PlanningRecord } from '@/lib/planning';
import type { EventRecord } from '@/lib/events';
import { ModuleHeader } from './module-header';
import { PlanningForm, PlanningEditor } from './planning-form';
export async function PlanningPage({ kind, eventFilter }: { kind: PlanningKind; eventFilter?: string }) {
  const { client,user } = await requireMember();
  const info = planningInfo[kind];
  if (eventFilter && !UUID_PATTERN.test(eventFilter)) return <main className="event-shell"><ModuleHeader title={info.title} /><p role="alert">O filtro de evento é inválido.</p><Link href={info.route}>Remover filtro</Link></main>;
  const [recordsResult,eventsResult] = await Promise.all([
    loadAllPages<PlanningRecord>((from,to) => client.from('planning_records').select('*').eq('user_id',user.id).order('id').range(from,to)),
    kind === 'supplier' ? Promise.resolve({ data: [] as EventRecord[], error: null }) : loadAllPages<EventRecord>((from,to) => client.from('events').select('*').eq('user_id',user.id).order('event_date').order('id').range(from,to)),
  ]);
  const failed = recordsResult.error || eventsResult.error;
  const records = recordsResult.data ?? [], events = eventsResult.data ?? [];
  const options = { events: events.map(item => ({ id:item.id,name:`${item.title} — ${item.event_date.split('-').reverse().join('/')}`,deleted_at:item.deleted_at })), suppliers: records.filter(item => item.kind === 'supplier').map(item => ({ id:item.id,name:item.name,deleted_at:item.deleted_at })) };
  const items = records.filter(item => item.kind === kind && !item.deleted_at && (!eventFilter || item.event_id === eventFilter)).sort((a,b) => a.name.localeCompare(b.name,'pt-BR') || a.id.localeCompare(b.id));
  const linked = events.find(item => item.id === eventFilter);
  const validFilter = !eventFilter || !!linked;
  return <main className="event-shell"><ModuleHeader title={info.title} />
    <p>{kind === 'supplier' ? 'Cadastre somente nome, contato e produto ofertado.' : kind === 'material' ? 'Organize os materiais de cada evento e altere quantidades ou fornecedor. Materiais não geram despesas automaticamente.' : 'Defina cada ação do evento, seu responsável e se já foi concluída.'}</p>
    {failed ? <p role="alert">Não foi possível carregar os cadastros. Confira a conexão e execute a nova migração de planejamento no Supabase. Os eventos existentes permanecem preservados.</p> : !validFilter ? <p role="alert">O evento do filtro não foi encontrado no seu espaço. <Link href={info.route}>Remover filtro</Link></p> : <>
      {eventFilter && <p className="setup-notice">Mostrando: {linked?.title}{linked?.deleted_at ? ' (evento excluído)' : ''} · <Link href={info.route}>Ver todos</Link></p>}
      {kind === 'supplier' || events.some(item => !item.deleted_at) ? <><h2>{kind === 'action' ? 'Nova ação' : `Novo ${info.singular}`}</h2><PlanningForm kind={kind} initialId={randomUUID()} operationId={randomUUID()} options={options} selectedEvent={linked && !linked.deleted_at ? linked.id : ''} /></> : <p>Cadastre um evento ativo antes de adicionar {kind === 'material' ? 'materiais' : 'ações'}. <Link href="/eventos">Abrir Eventos</Link></p>}
      <section className="event-list" aria-label={`${info.title} cadastrados`}>
        {!items.length && <p>Nenhum cadastro encontrado{eventFilter ? ' para este evento' : ''}.</p>}
        {items.map(item => <article className="event-row" key={item.id}><h2>{item.name}</h2>
          {kind === 'supplier' ? <><p>Contato: {item.contact}</p><p>Produto ofertado: {item.product}</p></> : <p>Evento: {events.find(event => event.id === item.event_id)?.title ?? 'Não disponível'}{events.find(event => event.id === item.event_id)?.deleted_at ? ' (excluído)' : ''}</p>}
          {kind === 'material' && <><p>Quantidade: {item.quantity.toLocaleString('pt-BR')}</p><p>Fornecedor: {item.supplier_id ? records.find(supplier => supplier.id === item.supplier_id)?.name ?? 'Não disponível' : 'Sem fornecedor definido'}{records.find(supplier => supplier.id === item.supplier_id)?.deleted_at ? ' (excluído)' : ''}</p></>}
          {kind === 'action' && <><p>Responsável: {item.responsible}</p><p>Estado: {item.completed ? 'Concluída' : 'Pendente'}</p></>}
          <PlanningEditor record={item} options={options} />
        </article>)}
      </section>
    </>}
  </main>;
}
