'use client';
import { useActionState, useEffect, useState } from 'react';
import { savePlanning } from '@/app/planejamento/actions';
import { planningInfo, type PlanningKind, type PlanningRecord, type PlanningState } from '@/lib/planning';
type Option = { id: string; name: string; deleted_at: string | null };
export type PlanningOptions = { events: Option[]; suppliers: Option[] };
const initial: PlanningState = { status: 'idle', message: '' };
export function PlanningForm({ kind, record, initialId, operationId, options, selectedEvent = '', onClose }: {
  kind: PlanningKind; record?: PlanningRecord; initialId: string; operationId: string; options: PlanningOptions; selectedEvent?: string; onClose?: () => void;
}) {
  const [state, action, pending] = useActionState(savePlanning, initial);
  const defaults = () => ({ name: record?.name ?? '', contact: record?.contact ?? '', product: record?.product ?? '', city: record?.city ?? '', quantity: String(record?.quantity ?? 1), responsible: record?.responsible ?? '', completed: record?.completed ?? false, event_id: record?.event_id ?? selectedEvent, supplier_id: record?.supplier_id ?? '' });
  const [fields, setFields] = useState(defaults);
  const [id, setId] = useState(initialId), [op, setOp] = useState(operationId);
  const [version, setVersion] = useState(record?.version ?? 0);
  const [resolved, setResolved] = useState(false), [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (state.status === 'saved') {
      if (record) onClose?.();
      else { setFields({ name:'',contact:'',product:'',city:'',quantity:'1',responsible:'',completed:false,event_id:selectedEvent,supplier_id:'' }); setId(crypto.randomUUID()); setOp(crypto.randomUUID()); setDeleting(false); }
    }
  }, [state, record, onClose, selectedEvent]);
  const conflict = state.status === 'conflict' && !resolved;
  function change(key: keyof typeof fields, value: string | boolean) { setFields(previous => ({ ...previous, [key]: value })); setOp(crypto.randomUUID()); }
  function choices(items: Option[]) { return items.map(item => <option key={item.id} value={item.id}>{item.name}{item.deleted_at ? ' (excluído — selecione outro para salvar alterações)' : ''}</option>); }
  return <div><form action={action} className="event-form" onSubmit={() => setResolved(false)}>
    <input name="kind" type="hidden" value={kind} /><input name="id" type="hidden" value={id} /><input name="operation_id" type="hidden" value={op} /><input name="version" type="hidden" value={version} /><input name="deleted" type="hidden" value={String(deleting)} />
    <label>{kind === 'supplier' ? 'Nome' : kind === 'material' ? 'Material' : 'Ação'}<input name="name" value={fields.name} onChange={event => change('name',event.target.value)} required maxLength={160} disabled={pending} /></label>
    {kind === 'supplier' ? <>
      <label>Contato<input name="contact" value={fields.contact} onChange={event => change('contact',event.target.value)} required maxLength={200} placeholder="Telefone, WhatsApp ou e-mail" disabled={pending} /></label>
      <label>Cidade<input name="city" value={fields.city} onChange={event => change('city',event.target.value)} maxLength={120} placeholder="Ex.: Cuiabá" disabled={pending} /></label>
      <label>Produto ofertado<input name="product" value={fields.product} onChange={event => change('product',event.target.value)} required maxLength={500} disabled={pending} /></label>
    </> : <label>Evento<select name="event_id" value={fields.event_id} onChange={event => change('event_id',event.target.value)} required disabled={pending}><option value="">Selecione um evento</option>{choices(options.events.filter(item => !item.deleted_at || item.id === fields.event_id))}</select></label>}
    {kind === 'material' && <>
      <label>Quantidade (unidades)<input name="quantity" type="number" min="1" max="1000000" step="1" value={fields.quantity} onChange={event => change('quantity',event.target.value)} required disabled={pending} /></label>
      <label>Fornecedor<select name="supplier_id" value={fields.supplier_id} onChange={event => change('supplier_id',event.target.value)} disabled={pending}><option value="">Sem fornecedor definido</option>{choices(options.suppliers.filter(item => !item.deleted_at || item.id === fields.supplier_id))}</select></label>
    </>}
    {kind === 'action' && <>
      <label>Responsável<input name="responsible" value={fields.responsible} onChange={event => change('responsible',event.target.value)} required maxLength={160} disabled={pending} /></label>
      <label className="checkbox-label"><input name="completed" type="checkbox" checked={fields.completed} onChange={event => change('completed',event.target.checked)} disabled={pending} />Ação concluída</label>
    </>}
    <button disabled={pending || conflict}>{pending ? 'Enviando…' : deleting ? 'Confirmar exclusão' : record ? 'Salvar alterações' : `Salvar ${planningInfo[kind].singular}`}</button>
    {record && <button type="button" disabled={pending || conflict} onClick={() => { setDeleting(!deleting); setOp(crypto.randomUUID()); }}>{deleting ? 'Cancelar exclusão' : 'Excluir cadastro'}</button>}
    {deleting && <p>A exclusão remove o cadastro das listas, mas preserva o histórico e os vínculos antigos. Confirme no botão acima.</p>}
    {onClose && <button type="button" disabled={pending} onClick={onClose}>Fechar sem salvar</button>}
  </form>
  {state.message && <p role={state.status === 'saved' ? 'status' : 'alert'}>{state.message}</p>}
  {conflict && <section className="setup-notice"><div><strong>Versão atual no servidor</strong>{state.current ? <>
    <p>Nome: {state.current.name}</p>
    {kind === 'supplier' && <><p>Contato: {state.current.contact}</p><p>Cidade: {state.current.city || 'Não informada'}</p><p>Produto ofertado: {state.current.product}</p></>}
    {kind !== 'supplier' && <p>Evento: {options.events.find(item => item.id === state.current?.event_id)?.name ?? state.current.event_id}</p>}
    {kind === 'material' && <><p>Quantidade: {state.current.quantity}</p><p>Fornecedor: {options.suppliers.find(item => item.id === state.current?.supplier_id)?.name ?? 'Sem fornecedor definido'}</p></>}
    {kind === 'action' && <><p>Responsável: {state.current.responsible}</p><p>Estado: {state.current.completed ? 'Concluída' : 'Pendente'}</p></>}
    <p>Versão: {state.current.version}{state.current.deleted_at ? ' · Excluído' : ''}</p>
  </> : <p>Cadastro não encontrado.</p>}
  {state.current && !state.current.deleted_at && <button type="button" onClick={() => { setVersion(state.current!.version); setOp(crypto.randomUUID()); setResolved(true); }}>Manter meu rascunho para substituir a versão exibida</button>}
  <p>Nenhuma alteração será aplicada sem confirmar o formulário. Novas mudanças serão detectadas novamente.</p></div></section>}
  </div>;
}
export function PlanningEditor({ record, options }: { record: PlanningRecord; options: PlanningOptions }) {
  const [editing,setEditing] = useState(false), [op,setOp] = useState('');
  if (editing) return <PlanningForm kind={record.kind} record={record} initialId={record.id} operationId={op} options={options} onClose={() => setEditing(false)} />;
  return <button onClick={() => { setOp(crypto.randomUUID()); setEditing(true); }}>Editar ou excluir</button>;
}
