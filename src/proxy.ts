import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { readPublicSupabaseConfig } from './lib/environment';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  const config = readPublicSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (config.status !== 'configured') return response;
  const client = createServerClient(config.url, config.publishableKey, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set('Cache-Control', 'private, no-store, max-age=0');
      },
    },
  });
  // Validates the session with Supabase; page/actions independently enforce membership.
  await client.auth.getUser();
  return response;
}
export const config = { matcher: ['/', '/login', '/eventos/:path*', '/agenda', '/materiais', '/tarefas', '/fornecedores'] };
