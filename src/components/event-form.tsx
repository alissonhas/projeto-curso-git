'use client';
import { useActionState, useEffect, useState } from 'react';
import { saveEvent } from '@/app/eventos/actions';
import type { EventRecord, EventState } from '@/lib/events';
const initial: EventState = { status: 'idle', message: '' };
export function EventForm({ record, initialId, operationId, onClose }: { record?: EventRecord; initialId: string; operationId: string; onClose?: () => void }) {
  const [state, action, pending] = useActionState(saveEvent, initial);
  const [title, setTitle] = useState(record?.title ?? '');
  const [city, setCity] = useState(record?.city ?? '');
  const [date, setDate] = useState(record?.event_date ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [id, setId] = useState(initialId);
  const [op, setOp] = useState(operationId);
  const [resolvedConflict, setResolvedConflict] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [version, setVersion] = useState(record?.version ?? 0);
  useEffect(() => {
    if (state.status === 'saved') {
      if (record) { onClose?.(); }
      else { setTitle(''); setCity(''); setDate(''); setDescription(''); setId(crypto.randomUUID()); setOp(crypto.randomUUID()); setDeleteRequested(false); }
    }
  }, [state, record, onClose]);
  function changed() { setOp(crypto.randomUUID()); }
  const conflict = state.status === 'conflict' && !resolvedConflict;
  return <div>
    <form action={action} className="event-form" onChange={changed} onSubmit={() => setResolvedConflict(false)}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="operation_id" value={op} />
      <input type="hidden" name="version" value={version} /><input type="hidden" name="deleted" value={String(deleteRequested)} />
      <label>Título<input name="title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={160} disabled={pending} /></label>
      <label>Cidade<input name="city" value={city} onChange={event => setCity(event.target.value)} maxLength={120} placeholder="Ex.: Cuiabá" disabled={pending} /></label>
      <label>Data do evento<input name="event_date" type="date" value={date} onChange={event => setDate(event.target.value)} required min="1900-01-01" max="2100-12-31" disabled={pending} /></label>
      <label>Descrição<textarea name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={5000} rows={3} disabled={pending} /></label>
      <button disabled={pending || conflict}>{pending ? 'Enviando…' : deleteRequested ? 'Confirmar exclusão' : record ? 'Salvar alterações' : 'Salvar evento'}</button>
      {record && <button type="button" disabled={pending || conflict} onClick={() => { setDeleteRequested(!deleteRequested); changed(); }}>{deleteRequested ? 'Cancelar exclusão' : 'Excluir evento'}</button>}
      {deleteRequested && <p>A exclusão é lógica e não pode ser desfeita nesta versão. Confirme somente se deseja retirar o evento da lista.</p>}
      {onClose && <button type="button" disabled={pending} onClick={onClose}>Fechar sem salvar</button>}
    </form>
    {state.message && <p role={state.status === 'saved' ? 'status' : 'alert'}>{state.message}</p>}
    {conflict && <section className="setup-notice"><div><strong>Versão atual no servidor</strong>
      {state.current ? <><p>Título: {state.current.title}</p><p>Data: {state.current.event_date}</p><p>Cidade: {state.current.city || 'Não informada'}</p><p>Descrição: {state.current.description || '(sem descrição)'}</p><p>Versão: {state.current.version}{state.current.deleted_at ? ' · Excluído' : ''}</p></> : <p>O evento não está disponível.</p>}
      {state.current && !state.current.deleted_at && <button type="button" onClick={() => { setVersion(state.current!.version); setOp(crypto.randomUUID()); setResolvedConflict(true); }}>Manter meu rascunho para substituir a versão exibida</button>}
      <p>O botão prepara uma nova tentativa; o salvamento só acontece ao confirmar no formulário. Outra mudança será detectada novamente.</p>
    </div></section>}
  </div>;
}
export function EventEditor({ record }: { record: EventRecord }) {
  const [editing, setEditing] = useState(false);
  const [operationId, setOperationId] = useState('');
  if (editing) return <EventForm record={record} initialId={record.id} operationId={operationId} onClose={() => setEditing(false)} />;
  return <button onClick={() => { setOperationId(crypto.randomUUID()); setEditing(true); }}>Editar ou excluir</button>;
}
