import Image from 'next/image';
import { LoginForm } from '@/components/login-form';
import { readPublicSupabaseConfig } from '@/lib/environment';
export const dynamic = 'force-dynamic';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const config = readPublicSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const { status } = await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <Image src="/logo-ah.png" alt="Logo AH Produções" width={88} height={88} priority />
    <p className="eyebrow">MARCA AH PRODUÇÕES</p><h1>Seu espaço, com acesso privado.</h1><p>Entre para organizar suas produções.</p>
    {config.status !== 'configured' && <p className="setup-notice" role="status">{config.status === 'invalid' ? 'A configuração de acesso precisa ser revisada.' : 'O acesso ainda não foi configurado.'} Configure as variáveis do Supabase na Vercel e autorize seu usuário para habilitar o login.</p>}
    {status === 'access' && <p role="alert">Seu acesso não está autorizado ou a tabela de usuários ainda não foi configurada.</p>}
    <LoginForm configured={config.status === 'configured'} />
  </section></main>;
}
