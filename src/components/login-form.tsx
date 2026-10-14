'use client';
import { useActionState } from 'react';
import { login } from '@/app/login/actions';
export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, { error: '' });
  return <form action={action} className="auth-form">
    <label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} disabled={!configured || pending} />
    <label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={!configured || pending} />
    {state.error && <p role="alert">{state.error}</p>}
    <button type="submit" disabled={!configured || pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
    <p>Uso pessoal. O acesso é criado e autorizado pelo administrador; não há cadastro público.</p>
  </form>;
}
