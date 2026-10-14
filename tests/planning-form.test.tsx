// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const { save } = vi.hoisted(()=>({save:vi.fn()}));
vi.mock('../src/app/planejamento/actions',()=>({savePlanning:save}));
import { PlanningForm } from '../src/components/planning-form';
const id='11111111-1111-4111-8111-111111111111',op='22222222-2222-4222-8222-222222222222';
const options={events:[{id,name:'Evento AH',deleted_at:null}],suppliers:[{id:op,name:'Fornecedor AH',deleted_at:null}]};
afterEach(cleanup);beforeEach(()=>save.mockReset());
it('cadastro de fornecedor exibe apenas os campos básicos e preserva os dados no erro/retry',async()=>{
  const submitted:FormData[]=[];save.mockImplementation(async(_state,form:FormData)=>{submitted.push(form);return {status:'error',message:'Falha de rede.'};});
  render(<PlanningForm kind="supplier" initialId={id} operationId={op} options={options}/>);
  const user=userEvent.setup();await user.type(screen.getByLabelText('Nome'),'Fornecedor teste');await user.type(screen.getByLabelText('Contato'),'WhatsApp teste');await user.type(screen.getByLabelText('Cidade'),'Cuiabá');await user.type(screen.getByLabelText('Produto ofertado'),'Palco');
  expect(screen.queryByLabelText('Evento')).toBeNull();expect(screen.queryByLabelText('Responsável')).toBeNull();
  await user.click(screen.getByRole('button',{name:'Salvar fornecedor'}));await screen.findByRole('alert');
  expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Fornecedor teste');
  await user.click(screen.getByRole('button',{name:'Salvar fornecedor'}));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
  expect(submitted[1].get('city')).toBe('Cuiabá');
  expect((screen.getByLabelText('Cidade') as HTMLInputElement).value).toBe('Cuiabá');
  expect(submitted[1].get('operation_id')).toBe(submitted[0].get('operation_id'));
});
it('material envia quantidade e os vínculos selecionados',async()=>{
  save.mockResolvedValue({status:'saved',message:'Cadastro salvo.'});
  render(<PlanningForm kind="material" initialId={id} operationId={op} options={options} selectedEvent={id}/>);
  const user=userEvent.setup();await user.type(screen.getByLabelText('Material'),'Microfone');await user.clear(screen.getByLabelText('Quantidade (unidades)'));await user.type(screen.getByLabelText('Quantidade (unidades)'),'4');await user.selectOptions(screen.getByLabelText('Fornecedor'),op);
  await user.click(screen.getByRole('button',{name:'Salvar material'}));await screen.findByRole('status');
  const form=save.mock.calls[0][1] as FormData;expect(form.get('event_id')).toBe(id);expect(form.get('supplier_id')).toBe(op);expect(form.get('quantity')).toBe('4');
});
it('ação preserva responsável no conflito e só reenviará após decisão explícita',async()=>{
  save.mockResolvedValue({status:'conflict',message:'Conflito.',current:{id,kind:'action',name:'Montagem atual',responsible:'Bruno',completed:true,event_id:id,version:3,deleted_at:null}});
  render(<PlanningForm kind="action" initialId={id} operationId={op} options={options} selectedEvent={id}/>);
  const user=userEvent.setup();await user.type(screen.getByLabelText('Ação',{exact:true}),'Montagem');await user.type(screen.getByLabelText('Responsável'),'Ana');await user.click(screen.getByRole('button',{name:'Salvar ação'}));
  await screen.findByText('Responsável: Bruno');expect((screen.getByLabelText('Responsável') as HTMLInputElement).value).toBe('Ana');expect((screen.getByRole('button',{name:'Salvar ação'}) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button',{name:'Manter meu rascunho para substituir a versão exibida'}));expect(save).toHaveBeenCalledTimes(1);
  save.mockResolvedValue({status:'error',message:'Erro.'});await user.click(screen.getByRole('button',{name:'Salvar ação'}));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
  const form=save.mock.calls[1][1] as FormData;expect(form.get('version')).toBe('3');expect(form.get('responsible')).toBe('Ana');
});
