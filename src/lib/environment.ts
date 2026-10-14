export function readPublicSupabaseConfig(url?: string, key?: string) {
  if (!url && !key) return { status: 'missing' } as const;
  if (!url || !key) return { status: 'invalid' } as const;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash || !key.startsWith('sb_publishable_')) {
      return { status: 'invalid' } as const;
    }
    return { status: 'configured', url: parsed.origin, publishableKey: key } as const;
  } catch { return { status: 'invalid' } as const; }
}
