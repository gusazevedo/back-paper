import { adminClient, fail, json, requireUser } from '../_shared/http.ts';
import { readImageInfo } from '../_shared/imageInfo.ts';
import { copyObject, deleteObjects, headObject, readHead } from '../_shared/storage.ts';
import { finalKeys, isAllowedMime, isUuid, MAX_BYTES, pendingKeys } from '../_shared/uploads.ts';

/**
 * Step 2 of publishing (§6.1): checks the uploaded objects, moves them out of
 * pending/ and records the wallpaper, its categories and the publish event.
 * Any failure removes the pending objects.
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed');
  const user = await requireUser(req);
  if (!user) return fail(401, 'unauthorized');

  const body = await req.json().catch(() => null);
  const { upload_id: uploadId, mime, title, categories } = body ?? {};
  if (!isUuid(uploadId) || !isAllowedMime(mime)) return fail(400, 'invalid_upload');

  const pending = pendingKeys(user.id, uploadId, mime);
  const discard = () => deleteObjects([pending.original, pending.thumb]).catch(() => undefined);

  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  if (cleanTitle.length > 60) {
    await discard();
    return fail(400, 'title_too_long');
  }
  const slugs = Array.isArray(categories) ? [...new Set(categories)] : [];
  if (slugs.length < 1 || slugs.length > 5 || !slugs.every((s) => typeof s === 'string')) {
    await discard();
    return fail(400, 'invalid_categories');
  }

  try {
    const [original, thumb] = await Promise.all([
      headObject(pending.original),
      headObject(pending.thumb),
    ]);
    if (!original || !thumb) {
      await discard();
      return fail(400, 'upload_missing');
    }
    if (original.size > MAX_BYTES) {
      await discard();
      return fail(400, 'file_too_large');
    }
    const info = readImageInfo(await readHead(pending.original));
    const thumbInfo = readImageInfo(await readHead(pending.thumb, 64));
    if (!info || info.mime !== mime || thumbInfo?.mime !== 'image/webp') {
      await discard();
      return fail(400, 'unsupported_format');
    }

    const wallpaperId = crypto.randomUUID();
    const final = finalKeys(wallpaperId, mime);
    await Promise.all([
      copyObject(pending.original, final.original),
      copyObject(pending.thumb, final.thumb),
    ]);

    const { data, error } = await adminClient().rpc('create_wallpaper', {
      p_id: wallpaperId,
      p_author_id: user.id,
      p_title: cleanTitle || null,
      p_categories: slugs,
      p_original_key: final.original,
      p_thumb_key: final.thumb,
      p_mime: mime,
      p_width: info.width,
      p_height: info.height,
      p_size_bytes: original.size,
    });
    if (error) {
      await deleteObjects([final.original, final.thumb]).catch(() => undefined);
      await discard();
      return fail(400, error.code === '23503' ? 'invalid_categories' : 'publish_failed', error.message);
    }

    await discard();
    return json({ id: data, thumb_key: final.thumb, original_key: final.original }, 201);
  } catch (e) {
    console.error(e);
    await discard();
    return fail(500, 'publish_failed');
  }
});
