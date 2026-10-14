// Evita perder eventos/cadastros quando o projeto possui mais que o limite por consulta do Supabase.
export async function loadAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const result = await fetchPage(from, from + size - 1);
    if (result.error || !result.data) return { data: null, error: result.error ?? new Error('Sem resposta de dados') };
    rows.push(...result.data);
    if (result.data.length < size) return { data: rows, error: null };
  }
}
