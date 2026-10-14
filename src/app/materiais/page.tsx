import { PlanningPage } from '@/components/planning-page';
export const dynamic = 'force-dynamic';
export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  return <PlanningPage kind="material" eventFilter={event} />;
}
