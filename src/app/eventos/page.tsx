import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireMember } from '@/lib/auth';
import { EventEditor, EventForm } from '@/components/event-form';
import type { EventRecord } from '@/lib/events';
export const dynamic = 'force-dynamic';
export default async function EventsPage() {
  const { client, user } = await requireMember();
  const { data, error } = await client.from('events').select('id,user_id,title,description,event_date,version,created_at,updated_at,deleted_at').eq('user_id', user.id).is('deleted_at', null).order('event_date').limit(100);
  return <main className="event-shell"><div className="event-header"><div><p className="eyebrow">MARCA AH PRODUÇÕES</p><h1>Eventos</h1></div><Link href="/">← Visão geral</Link></div>
    <p>Planeje sua produção. Os dados são salvos no servidor; esta etapa exige conexão.</p>
    {error ? <p role="alert">Não foi possível consultar seus eventos. Verifique a conexão e se a migração foi aplicada no Supabase. Recarregue para tentar novamente.</p> : <>
      <h2>Novo evento</h2><EventForm initialId={randomUUID()} operationId={randomUUID()} />
      <section className="event-list" aria-label="Eventos cadastrados">
        {data?.length === 0 && <p>Nenhum evento cadastrado. Comece pelo formulário acima.</p>}
        {(data as EventRecord[] | null)?.map(event => <article key={event.id} className="event-row"><h2>{event.title}</h2><time dateTime={event.event_date}>{event.event_date.split('-').reverse().join('/')}</time><p>{event.description}</p><EventEditor record={event} /></article>)}
      </section><p>A lista mostra até 100 eventos. Paginação será adicionada em uma próxima entrega.</p>
    </>}
  </main>;
}
