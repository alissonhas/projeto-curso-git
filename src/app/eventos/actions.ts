'use server';
import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/auth';
import { parseEvent } from '@/lib/validation';
import type { EventState } from '@/lib/events';
export async function saveEvent(_state: EventState, form: FormData): Promise<EventState> {
  const { client } = await requireMember();
  let event: ReturnType<typeof parseEvent>;
  try { event = parseEvent(form); }
  catch (error) { return { status: 'error', message: error instanceof Error ? error.message : 'Dados inválidos.' }; }
  try {
    const { data, error } = await client.rpc('mutate_event', {
      p_operation_id: event.operationId, p_id: event.id, p_expected_version: event.version,
      p_title: event.title, p_description: event.description, p_event_date: event.date, p_deleted: event.deleted,
    });
    if (error || !data || !['saved', 'conflict'].includes(data.status)) return { status: 'error', message: 'Não foi possível confirmar o salvamento. Seu rascunho foi preservado; tente reenviar sem alterá-lo.' };
    if (data.status === 'conflict') return { status: 'conflict', message: 'Este evento mudou em outra sessão. Seu rascunho foi preservado. Compare as versões antes de continuar.', current: data.current };
    revalidatePath('/eventos');
    return { status: 'saved', message: event.deleted ? 'Evento excluído.' : 'Evento salvo.' };
  } catch { return { status: 'error', message: 'Sem confirmação do servidor. Seu rascunho foi preservado; tente novamente.' }; }
}
