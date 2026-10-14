'use server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { validLogin } from '@/lib/validation';
export type LoginState = { error: string };
export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!validLogin(email, password)) return { error: 'Informe um e-mail válido e sua senha.' };
  const client = await supabaseServer();
  if (!client) return { error: 'O acesso ainda não foi configurado. Configure o Supabase antes de entrar.' };
  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: 'Não foi possível entrar. Confira seus dados ou tente novamente mais tarde.' };
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return { error: 'Não foi possível validar sua sessão. Tente novamente.' };
    const { data: member, error: memberError } = await client.from('app_members').select('user_id').eq('user_id', user.id).maybeSingle();
    if (memberError || !member) {
      await client.auth.signOut({ scope: 'local' });
      return { error: 'Seu acesso ainda não foi autorizado. Consulte a configuração do usuário no Supabase.' };
    }
  } catch { return { error: 'Não foi possível conectar ao serviço de acesso. Tente novamente.' }; }
  redirect('/');
}
export async function logout() {
  const client = await supabaseServer();
  if (client) {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new Error('Não foi possível encerrar a sessão. Tente novamente.');
  }
  redirect('/login');
}
