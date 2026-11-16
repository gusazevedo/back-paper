import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const fail = (status: number, code: string, message?: string) =>
  json({ error: { code, message: message ?? code } }, status);

/** Admin client (service role): bypasses RLS, used only after the caller is authenticated. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
}

/** Resolves the signed-in user from the request's bearer token, or null. */
export async function requireUser(req: Request): Promise<{ id: string } | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}
