import { describe, expect, it } from 'vitest';
import { formatCentavos, formatDate } from '../src/lib/format';
import { readPublicSupabaseConfig } from '../src/lib/environment';
import { sections } from '../src/lib/navigation';
describe('Formatação brasileira', () => {
  it('formata centavos sem cálculos monetários em ponto flutuante', () => {
    expect(formatCentavos(123456)).toBe('R$ 1.234,56');
    expect(formatCentavos(-1)).toBe('-R$ 0,01');
    expect(formatCentavos(0)).toBe('R$ 0,00');
    expect(() => formatCentavos(1.5)).toThrow();
    expect(() => formatCentavos(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
  it('usa a data local de Cuiabá', () => {
    expect(formatDate(new Date('2026-10-14T02:00:00Z'))).toBe('13 de outubro de 2026');
  });
});
describe('Configuração pública', () => {
  it('distingue ausência, configuração parcial e formato permitido', () => {
    expect(readPublicSupabaseConfig().status).toBe('missing');
    expect(readPublicSupabaseConfig('https://example.supabase.co').status).toBe('invalid');
    expect(readPublicSupabaseConfig('https://example.supabase.co', 'sb_publishable_example').status).toBe('configured');
  });
  it('rejeita protocolos inseguros, credenciais embutidas e chaves secretas', () => {
    for (const [url, key] of [['http://example.com', 'sb_publishable_example'], ['https://user:pass@example.com', 'sb_publishable_example'], ['https://example.com', 'sb_secret_example']]) {
      expect(readPublicSupabaseConfig(url, key).status).toBe('invalid');
    }
  });
});
it('define identificadores únicos para todas as áreas', () => {
  expect(new Set(sections.map(section => section.slug)).size).toBe(7);
});
