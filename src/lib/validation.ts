export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseEvent(form: FormData) {
  const id = String(form.get('id') ?? '');
  const operationId = String(form.get('operation_id') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const city = String(form.get('city') ?? '').trim();
  if (city.length > 120) throw new Error('A cidade deve ter até 120 caracteres.');
  const date = String(form.get('event_date') ?? '');
  const versionText = String(form.get('version') ?? '');
  const version = Number(versionText);
  if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(operationId)) throw new Error('Identificador inválido. Recarregue o formulário.');
  if (!title || title.length > 160 || description.length > 5000) throw new Error('Informe um título de até 160 caracteres e descrição de até 5.000 caracteres.');
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsedDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01' || date > '2100-12-31' || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Informe uma data válida entre 1900 e 2100.');
  if (!/^\d+$/.test(versionText) || !Number.isSafeInteger(version) || version < 0 || version > 2147483646) throw new Error('Versão inválida.');
  return { id, operationId, title, description, city, date, version, deleted: form.get('deleted') === 'true' };
}
export function validLogin(email: string, password: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length > 0 && password.length <= 1024;
}
