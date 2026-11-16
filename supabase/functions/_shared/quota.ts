import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

/** SQLSTATE raised by create_wallpaper when the 10-per-24h limit is hit (R-PUB-9). */
export const LIMIT_SQLSTATE = 'BP429';

/** Publishes the user has left in the rolling 24h window. */
export async function remainingPublishes(admin: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await admin.rpc('publish_quota', { p_user_id: userId }).single<{ remaining: number }>();
  if (error) throw error;
  return data.remaining;
}
