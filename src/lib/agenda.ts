import type { EventRecord } from './events';
export function agendaGroups(events: EventRecord[]) {
  const groups = new Map<string, EventRecord[]>();
  for (const event of [...events].filter(event => !event.deleted_at).sort((a, b) => a.event_date.localeCompare(b.event_date) || a.id.localeCompare(b.id))) {
    const key = event.event_date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()].map(([month, items]) => ({
    month, label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`)), items,
  }));
}
