import { describe, expect, it } from 'vitest';
import { parseEvent, validLogin } from '../src/lib/validation';
function eventForm() {
  const data = new FormData();
  Object.entries({ id: '11111111-1111-4111-8111-111111111111', operation_id: '22222222-2222-4222-8222-222222222222', title: '  Produção AH  ', description: 'Planejamento', event_date: '2026-10-14', version: '0' }).forEach(([key, value]) => data.set(key, value));
  return data;
}
describe('Validação dos eventos', () => {
  it('preserva identificadores estáveis e normaliza o título', () => {
    const event = parseEvent(eventForm());
    expect(event.title).toBe('Produção AH');
    expect(event.version).toBe(0);
    expect(event.deleted).toBe(false);
  });
  it.each([['event_date', '2026-02-30'], ['event_date', '2026-99-99'], ['event_date', '1899-12-31'], ['version', '-1'], ['version', '1.5'], ['version', '2147483647'], ['id', 'outro'], ['operation_id', ''], ['title', '   '], ['description', 'x'.repeat(5001)]])('rejeita %s inválido', (field, value) => {
    const form = eventForm(); form.set(field, value); expect(() => parseEvent(form)).toThrow();
  });
});
it('valida o login sem modificar a senha', () => {
  expect(validLogin('pessoa@example.com', ' senha de teste ')).toBe(true);
  expect(validLogin('invalido', 'teste')).toBe(false);
  expect(validLogin('pessoa@example.com', '')).toBe(false);
});

it('cidade do evento é opcional, normalizada e limitada',()=>{const data=eventForm();expect(parseEvent(data).city).toBe('');data.set('city',' Cuiabá ');expect(parseEvent(data).city).toBe('Cuiabá');data.set('city','x'.repeat(121));expect(()=>parseEvent(data)).toThrow('cidade');});
