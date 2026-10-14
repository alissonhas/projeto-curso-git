export type EventRecord = {
  id: string; user_id: string; title: string; description: string; event_date: string;
  version: number; created_at: string; updated_at: string; deleted_at: string | null;
};
export type EventState = { status: 'idle' | 'saved' | 'error' | 'conflict'; message: string; current?: EventRecord | null };
