import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';
export async function requireMember() {
  const client = await supabaseServer();
  if (!client) redirect('/login');
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect('/login');
  const { data: member, error: membershipError } = await client.from('app_members').select('user_id').eq('user_id', user.id).maybeSingle();
  if (membershipError || !member) redirect('/login?status=access');
  return { client, user };
}
