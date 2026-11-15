/**
 * Public client configuration. Everything here ships inside the APK, so it must
 * never hold secrets: the Supabase anon key and Google client IDs are public by design.
 *
 * Defaults target the local Supabase stack (`npm run db:start` at the repo root);
 * 10.0.2.2 is the host machine as seen from the Android emulator.
 */
export const env = {
  supabaseUrl: 'http://10.0.2.2:54321',
  // Local stack demo anon key (same for every `supabase start`).
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  /** Web OAuth client ID (Google Cloud). Empty until configured; login then reports it. */
  googleWebClientId: '',
};
