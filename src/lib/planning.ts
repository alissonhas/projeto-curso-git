import { UUID_PATTERN } from './validation';
export const planningKinds = ['supplier', 'material', 'action'] as const;
export type PlanningKind = typeof planningKinds[number];
export type PlanningRecord = {
  id: string; user_id: string; kind: PlanningKind; name: string; contact: string; product: string; city: string;
  quantity: number; responsible: string; completed: boolean; event_id: string | null; supplier_id: string | null;
  version: number; created_at: string; updated_at: string; deleted_at: string | null;
};
export type PlanningState = { status: 'idle' | 'saved' | 'error' | 'conflict'; message: string; current?: PlanningRecord | null };
export const planningInfo = {
  supplier: { title: 'Fornecedores', singular: 'fornecedor', route: '/fornecedores' },
  material: { title: 'Materiais', singular: 'material', route: '/materiais' },
  action: { title: 'Ações e responsáveis', singular: 'ação', route: '/tarefas' },
} as const;
export function parsePlanning(form: FormData) {
  const text = (key: string) => String(form.get(key) ?? '').trim();
  const kind = text('kind') as PlanningKind;
  const id = text('id'), operationId = text('operation_id'), versionText = text('version');
  if (!planningKinds.includes(kind)) throw new Error('Tipo de cadastro inválido.');
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(operationId) || !/^\d+$/.test(versionText) || Number(versionText) > 2147483646) throw new Error('Identificador ou versão inválidos. Recarregue o formulário.');
  const name = text('name');
  if (!name || name.length > 160) throw new Error('Informe um nome de até 160 caracteres.');
  const contact = kind === 'supplier' ? text('contact') : '';
  const product = kind === 'supplier' ? text('product') : '';
  if (kind === 'supplier' && (!contact || contact.length > 200 || !product || product.length > 500)) throw new Error('Informe contato (até 200 caracteres) e produto ofertado (até 500 caracteres).');
  const city = kind === 'supplier' ? text('city') : '';
  if (city.length > 120) throw new Error('A cidade deve ter até 120 caracteres.');
  const responsible = kind === 'action' ? text('responsible') : '';
  if (kind === 'action' && (!responsible || responsible.length > 160)) throw new Error('Informe o responsável pela ação (até 160 caracteres).');
  const quantityText = kind === 'material' ? text('quantity') : '1';
  if (!/^\d{1,7}$/.test(quantityText) || Number(quantityText) < 1 || Number(quantityText) > 1000000) throw new Error('A quantidade deve ser um inteiro entre 1 e 1.000.000.');
  const eventId = kind === 'supplier' ? null : text('event_id');
  const supplierId = kind === 'material' ? text('supplier_id') || null : null;
  if (kind !== 'supplier' && (!eventId || !UUID_PATTERN.test(eventId))) throw new Error('Selecione o evento deste cadastro.');
  if (supplierId && !UUID_PATTERN.test(supplierId)) throw new Error('Fornecedor inválido.');
  return { id, operationId, version: Number(versionText), kind, deleted: text('deleted') === 'true', data: {
    name, contact, product, ...(kind === 'supplier' ? { city } : {}), quantity: Number(quantityText), responsible,
    completed: kind === 'action' && form.get('completed') === 'on', event_id: eventId, supplier_id: supplierId,
  } };
}
