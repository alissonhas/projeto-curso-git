export function formatCentavos(value: number): string {
  if (!Number.isSafeInteger(value)) throw new Error('O valor deve ser um inteiro seguro em centavos.');
  const absolute = Math.abs(value);
  const reais = Math.floor(absolute / 100).toLocaleString('pt-BR');
  return `${value < 0 ? '-' : ''}R$ ${reais},${String(absolute % 100).padStart(2, '0')}`;
}
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Cuiaba' }).format(date);
}
