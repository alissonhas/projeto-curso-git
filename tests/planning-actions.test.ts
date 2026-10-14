import { beforeEach, expect, it, vi } from 'vitest';
const { require, rpc, revalidate } = vi.hoisted(()=>({require:vi.fn(),rpc:vi.fn(),revalidate:vi.fn()}));
vi.mock('../src/lib/auth',()=>({requireMember:require}));
vi.mock('next/cache',()=>({revalidatePath:revalidate}));
import { savePlanning } from '../src/app/planejamento/actions';
import { saveEvent } from '../src/app/eventos/actions';
beforeEach(()=>{vi.clearAllMocks();require.mockResolvedValue({client:{rpc},user:{id:'fixture-owner'}});rpc.mockResolvedValue({data:{status:'saved'},error:null});});
function supplier(){const form=new FormData();Object.entries({kind:'supplier',id:'11111111-1111-4111-8111-111111111111',operation_id:'22222222-2222-4222-8222-222222222222',version:'0',name:'Fornecedor',contact:'Contato',product:'Produto',user_id:'outro usuário'}).forEach(([key,value])=>form.set(key,value));return form;}
it('não chama RPC quando a autenticação falha',async()=>{require.mockRejectedValueOnce(new Error('login obrigatório'));await expect(savePlanning({status:'idle',message:''},supplier())).rejects.toThrow('login obrigatório');expect(rpc).not.toHaveBeenCalled();});
it('não chama RPC com fornecedor incompleto',async()=>{const form=supplier();form.set('contact','');expect((await savePlanning({status:'idle',message:''},form)).status).toBe('error');expect(rpc).not.toHaveBeenCalled();});
it('deriva a propriedade no banco, sem transmitir user_id do formulário, e atualiza os módulos',async()=>{
 const result=await savePlanning({status:'idle',message:''},supplier());expect(result.status).toBe('saved');
 expect(rpc.mock.calls[0][0]).toBe('mutate_planning');expect(rpc.mock.calls[0][1]).not.toHaveProperty('user_id');expect(rpc.mock.calls[0][1].p_data).not.toHaveProperty('user_id');
 for(const path of ['/eventos','/agenda','/materiais','/tarefas','/fornecedores'])expect(revalidate).toHaveBeenCalledWith(path);
});
it('um conflito devolve a versão atual sem revalidar nem fazer nova tentativa automática',async()=>{
 rpc.mockResolvedValueOnce({data:{status:'conflict',current:{version:2,name:'Atual'}},error:null});const result=await savePlanning({status:'idle',message:''},supplier());expect(result.status).toBe('conflict');expect(result.current?.name).toBe('Atual');expect(rpc).toHaveBeenCalledTimes(1);expect(revalidate).not.toHaveBeenCalled();
});
it('mudança no evento invalida agenda e listas com vínculos',async()=>{
 const form=new FormData();Object.entries({id:'11111111-1111-4111-8111-111111111111',operation_id:'22222222-2222-4222-8222-222222222222',version:'1',title:'Nova data',description:'',event_date:'2027-01-01'}).forEach(([key,value])=>form.set(key,value));
 expect((await saveEvent({status:'idle',message:''},form)).status).toBe('saved');expect(revalidate).toHaveBeenCalledWith('/agenda');expect(revalidate).toHaveBeenCalledWith('/materiais');expect(revalidate).toHaveBeenCalledWith('/tarefas');
});
