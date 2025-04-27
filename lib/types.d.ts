import '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface RealtimeChannel {
    on(
      eventType: 'postgres_changes',
      filterObject: { event: string; schema: string; table: string },
      callback: (payload: any) => void
    ): RealtimeChannel;
  }
} 