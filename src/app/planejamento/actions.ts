'use server';
import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/auth';
import { parsePlanning, type PlanningState } from '@/lib/planning';
export async function savePlanning(_state: PlanningState, form: FormData): Promise<PlanningState> {
  const { client } = await requireMember();
  let input: ReturnType<typeof parsePlanning>;
  try { input = parsePlanning(form); } catch (error) { return { status: 'error', message: error instanceof Error ? error.message : 'Dados inválidos.' }; }
  try {
    const { data, error } = await client.rpc('mutate_planning', { p_operation_id: input.operationId, p_id: input.id, p_expected_version: input.version, p_kind: input.kind, p_data: input.data, p_deleted: input.deleted });
    if (error || !data || !['saved','conflict'].includes(data.status)) return { status: 'error', message: error?.code === '22023' ? 'Revise os dados e os vínculos: o evento e o fornecedor devem estar ativos e pertencer ao seu espaço. Seu rascunho foi preservado.' : 'Não foi possível confirmar o salvamento. Confira a conexão e a migração de planejamento; seu rascunho foi preservado.' };
    if (data.status === 'conflict') return { status: 'conflict', message: 'Este cadastro foi alterado em outra sessão. Compare as versões antes de salvar; seu rascunho foi preservado.', current: data.current };
    for (const path of ['/eventos','/agenda','/materiais','/tarefas','/fornecedores']) revalidatePath(path);
    return { status: 'saved', message: input.deleted ? 'Cadastro excluído.' : 'Cadastro salvo.' };
  } catch { return { status: 'error', message: 'Não foi possível conectar. Seu rascunho foi preservado; tente novamente.' }; }
}
