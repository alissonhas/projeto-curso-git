import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { loadAllPages } from '@/lib/pagination';
import { agendaGroups } from '@/lib/agenda';
import { ModuleHeader } from '@/components/module-header';
import type { EventRecord } from '@/lib/events';
export const dynamic = 'force-dynamic';
export default async function AgendaPage() {
  const { client, user } = await requireMember();
  const { data, error } = await loadAllPages<EventRecord>((from,to) => client.from('events').select('*').eq('user_id',user.id).is('deleted_at',null).order('event_date').order('id').range(from,to));
  return <main className="event-shell"><ModuleHeader title="Agenda" /><p>Seus eventos entram automaticamente na agenda, na data cadastrada. Alterações de data e exclusões são refletidas ao atualizar esta página.</p>
    {error ? <p role="alert">Não foi possível carregar a agenda. Confira sua conexão e tente novamente.</p> : <>
      {!data?.length && <p>Nenhum evento cadastrado. <Link href="/eventos">Cadastre seu primeiro evento.</Link></p>}
      {agendaGroups(data ?? []).map(group => <section key={group.month} className="agenda-month"><h2>{group.label}</h2><div className="event-list">{group.items.map(event => <article key={event.id} id={`evento-${event.id}`} className="event-row agenda-item"><time dateTime={event.event_date}>{event.event_date.split('-').reverse().join('/')}</time><div><h3>{event.title}</h3><p>Cidade: {event.city || 'Não informada'}</p><p>{event.description}</p><Link href={`/eventos?event=${event.id}`}>Abrir evento e planejamento →</Link></div></article>)}</div></section>)}
    </>}
  </main>;
}
