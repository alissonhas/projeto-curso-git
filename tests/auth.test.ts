import { beforeEach, expect, it, vi } from 'vitest';
const { server, client, memberQuery } = vi.hoisted(() => {
  const memberQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  memberQuery.select.mockReturnValue(memberQuery); memberQuery.eq.mockReturnValue(memberQuery);
  const client = { auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn() }, from: vi.fn(() => memberQuery) };
  return { client, memberQuery, server: vi.fn() };
});
vi.mock('../src/lib/supabase/server', () => ({ supabaseServer: server }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
import { requireMember } from '../src/lib/auth';
import { login } from '../src/app/login/actions';
beforeEach(() => {
  vi.clearAllMocks(); server.mockResolvedValue(client);
  client.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-test' } }, error: null });
  client.auth.signInWithPassword.mockResolvedValue({ error: null });
  client.auth.signOut.mockResolvedValue({ error: null });
  memberQuery.maybeSingle.mockResolvedValue({ data: { user_id: 'user-test' }, error: null });
});
it('bloqueia rotas sem configuração e sem sessão validada', async () => {
  server.mockResolvedValueOnce(null);
  await expect(requireMember()).rejects.toThrow('redirect:/login');
  expect(client.from).not.toHaveBeenCalled();
  client.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
  await expect(requireMember()).rejects.toThrow('redirect:/login');
  expect(client.from).not.toHaveBeenCalled();
});
it('bloqueia sessão válida que não está na lista autorizada', async () => {
  memberQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  await expect(requireMember()).rejects.toThrow('redirect:/login?status=access');
  expect(memberQuery.eq).toHaveBeenCalledWith('user_id', 'user-test');
});
it('libera apenas sessão validada com membro autorizado', async () => {
  expect((await requireMember()).user.id).toBe('user-test');
  expect(client.auth.getUser).toHaveBeenCalledOnce();
});
function credentials() { const form = new FormData(); form.set('email', 'pessoa@example.com'); form.set('password', 'somente-fixture-teste'); return form; }
it('erro de senha não consulta dados privados e não revela o erro do provedor', async () => {
  client.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'detalhes internos' } });
  const result = await login({ error: '' }, credentials());
  expect(result.error).toContain('Não foi possível entrar');
  expect(result.error).not.toContain('detalhes internos'); expect(client.from).not.toHaveBeenCalled();
});
it('encerra a sessão quando o usuário não foi autorizado', async () => {
  memberQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  expect((await login({ error: '' }, credentials())).error).toContain('não foi autorizado');
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('login autorizado redireciona para a área privada', async () => {
  await expect(login({ error: '' }, credentials())).rejects.toThrow('redirect:/');
});
