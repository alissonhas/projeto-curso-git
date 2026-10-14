// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../src/app/eventos/actions', () => ({ saveEvent: save }));
import { EventForm } from '../src/components/event-form';
const id = '11111111-1111-4111-8111-111111111111';
const op = '22222222-2222-4222-8222-222222222222';
beforeEach(() => { save.mockReset(); });
afterEach(cleanup);
async function fill() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Título'), 'Meu rascunho');
  await user.type(screen.getByLabelText('Cidade'), 'Cuiabá');
  await user.type(screen.getByLabelText('Data do evento'), '2026-10-14');
  await user.type(screen.getByLabelText('Descrição'), 'Detalhes ainda não confirmados');
  return user;
}
it('preserva rascunho e UUID de operação no retry após erro', async () => {
  const submitted: { operation: string; title: string }[] = [];
  save.mockImplementation(async (_state, form: FormData) => {
    submitted.push({ operation: String(form.get('operation_id')), title: String(form.get('title')) });
    return { status: 'error', message: 'Sem confirmação do servidor.' };
  });
  render(<EventForm initialId={id} operationId={op} />);
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Salvar evento' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Meu rascunho');
  expect((screen.getByLabelText('Cidade') as HTMLInputElement).value).toBe('Cuiabá');
  expect((screen.getByLabelText('Descrição') as HTMLTextAreaElement).value).toBe('Detalhes ainda não confirmados');
  await user.click(screen.getByRole('button', { name: 'Salvar evento' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(submitted[0]).toEqual(submitted[1]);
});
it('conflito exige decisão explícita e usa a versão atual sem apagar o rascunho', async () => {
  const submitted: FormData[] = [];
  save.mockImplementation(async (_state, form: FormData) => {
    submitted.push(form);
    if (submitted.length === 1) return { status: 'conflict', message: 'Evento mudou.', current: { id, user_id: id, title: 'Versão no servidor', description: 'Outro texto', event_date: '2026-10-15', version: 4, deleted_at: null } };
    return { status: 'error', message: 'Falha de rede.' };
  });
  render(<EventForm initialId={id} operationId={op} />);
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Salvar evento' }));
  await screen.findByText('Título: Versão no servidor');
  expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Meu rascunho');
  expect((screen.getByRole('button', { name: 'Salvar evento' }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Manter meu rascunho para substituir a versão exibida' }));
  expect(save).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Salvar evento' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(submitted[1].get('version')).toBe('4');
  expect(submitted[1].get('title')).toBe('Meu rascunho');
  expect(submitted[1].get('city')).toBe('Cuiabá');
  expect(submitted[1].get('operation_id')).not.toBe(submitted[0].get('operation_id'));
});
it('limpa campos e gera um novo registro somente após confirmação do salvamento', async () => {
  save.mockResolvedValue({ status: 'saved', message: 'Evento salvo.' });
  const { container } = render(<EventForm initialId={id} operationId={op} />);
  const user = await fill();
  await user.click(screen.getByRole('button', { name: 'Salvar evento' }));
  await screen.findByRole('status');
  await waitFor(() => expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe(''));
  expect((container.querySelector('input[name="id"]') as HTMLInputElement).value).not.toBe(id);
});
