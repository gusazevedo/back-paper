import { adminClient, fail, json, requireUser } from '../_shared/http.ts';
import { remainingPublishes } from '../_shared/quota.ts';
import { presignPut } from '../_shared/storage.ts';
import { isAllowedMime, MAX_BYTES, pendingKeys } from '../_shared/uploads.ts';

/**
 * Step 1 of publishing (§6.1): hands the app two presigned PUT URLs under
 * pending/{user}/{upload}/ for the original image and its WebP thumbnail.
 * Refuses when the user has no publishes left in the last 24h (R-PUB-9).
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');
  const user = await requireUser(req);
  if (!user) return fail(401, 'unauthorized');

  const body = await req.json().catch(() => null);
  const mime = body?.mime;
  const size = body?.size_bytes;
  if (!isAllowedMime(mime)) return fail(400, 'unsupported_format');
  if (!Number.isInteger(size) || size <= 0) return fail(400, 'invalid_size');
  if (size > MAX_BYTES) return fail(400, 'file_too_large');
  if ((await remainingPublishes(adminClient(), user.id)) <= 0) {
    return fail(429, 'publish_limit_reached');
  }

  const uploadId = crypto.randomUUID();
  const keys = pendingKeys(user.id, uploadId, mime);
  const [originalUrl, thumbUrl] = await Promise.all([
    presignPut(keys.original, mime),
    presignPut(keys.thumb, 'image/webp'),
  ]);

  return json({
    upload_id: uploadId,
    original: { url: originalUrl, content_type: mime },
    thumb: { url: thumbUrl, content_type: 'image/webp' },
  });
});
