import { Workspace } from '@/components/workspace';
import { readPublicSupabaseConfig } from '@/lib/environment';
export default function Home() {
  const config = readPublicSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return <Workspace configurationStatus={config.status} />;
}
