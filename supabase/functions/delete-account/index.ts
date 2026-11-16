import { adminClient, fail, json, requireUser } from '../_shared/http.ts';

/**
 * §6.2, R-ACC-1..4: deletes the caller's account right away. Removing the auth
 * user cascades through profiles to wallpapers, likes (given and received),
 * folders, other people's folder items and reports; the AFTER DELETE trigger
 * on wallpapers queues every object for removal from R2.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');
  const user = await requireUser(req);
  if (!user) return fail(401, 'unauthorized');

  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error('delete-account failed', error);
    return fail(500, 'delete_failed');
  }
  return json({ deleted: true });
});
