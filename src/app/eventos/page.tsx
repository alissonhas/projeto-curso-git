import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireMember } from '@/lib/auth';
import { EventEditor, EventForm } from '@/components/event-form';
import { ModuleHeader } from '@/components/module-header';
import { loadAllPages } from '@/lib/pagination';
import { UUID_PATTERN } from '@/lib/validation';
import type { EventRecord } from '@/lib/events';
export const dynamic = 'force-dynamic';
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { client, user } = await requireMember();
  const { event: selected } = await searchParams;
  if (selected && !UUID_PATTERN.test(selected)) return <main className="event-shell"><ModuleHeader title="Eventos" /><p role="alert">Filtro de evento inválido.</p><Link href="/eventos">Ver todos os eventos</Link></main>;
  const { data, error } = await loadAllPages<EventRecord>((from,to) => {
    let query = client.from('events').select('*').eq('user_id',user.id).is('deleted_at',null).order('event_date').order('id').range(from,to);
    if (selected) query = query.eq('id',selected);
    return query;
  });
  return <main className="event-shell"><ModuleHeader title="Eventos" />
    <p>Planeje sua produção. Os dados são salvos no servidor; esta etapa exige conexão.</p>
    {error ? <p role="alert">Não foi possível consultar seus eventos. Verifique a conexão e se a migração foi aplicada no Supabase. Recarregue para tentar novamente.</p> : <>
      {selected && <p><Link href="/eventos">Ver todos os eventos</Link></p>}
      <h2>Novo evento</h2><EventForm initialId={randomUUID()} operationId={randomUUID()} />
      <section className="event-list" aria-label="Eventos cadastrados">
        {data?.length === 0 && <p>Nenhum evento cadastrado. Comece pelo formulário acima.</p>}
        {(data as EventRecord[] | null)?.map(event => <article key={event.id} className="event-row"><h2>{event.title}</h2><time dateTime={event.event_date}>{event.event_date.split('-').reverse().join('/')}</time><p>Cidade: {event.city || 'Não informada'}</p><p>{event.description}</p><nav className="module-nav" aria-label={`Planejamento de ${event.title}`}><Link href={`/agenda#evento-${event.id}`}>Ver na agenda</Link><Link href={`/materiais?event=${event.id}`}>Materiais do evento</Link><Link href={`/tarefas?event=${event.id}`}>Ações e responsáveis</Link></nav><EventEditor record={event} /></article>)}
      </section>
    </>}
  </main>;
}
