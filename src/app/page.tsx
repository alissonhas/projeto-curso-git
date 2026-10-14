import { Workspace } from '@/components/workspace';
import { requireMember } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  await requireMember();
  return <Workspace />;
}
