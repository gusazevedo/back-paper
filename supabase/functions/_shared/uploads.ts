/** Shared upload rules and object key layout (R-PUB, §6.1). */
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export const MAX_BYTES = 15 * 1024 * 1024;
/** R-PUB-5: the shorter side must be at least this many pixels. */
export const MIN_SHORT_SIDE = 1080;
/** R-PUB-6: portrait only, height >= width × this. */
export const MIN_ASPECT = 1.5;

export type ImageRuleError = 'unsupported_format' | 'file_too_large' | 'resolution_too_low' | 'not_portrait';

/**
 * Checks R-PUB-3 to R-PUB-6 against what was read from the stored object.
 * Returns the first rule broken, in the order the app reports them, or null.
 */
export function checkImageRules(
  info: { mime: string; width: number; height: number } | null,
  sizeBytes: number,
): ImageRuleError | null {
  if (!info || !isAllowedMime(info.mime)) return 'unsupported_format';
  if (sizeBytes > MAX_BYTES) return 'file_too_large';
  if (Math.min(info.width, info.height) < MIN_SHORT_SIDE) return 'resolution_too_low';
  if (info.height < info.width * MIN_ASPECT) return 'not_portrait';
  return null;
}

const EXT: Record<AllowedMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const isAllowedMime = (m: unknown): m is AllowedMime =>
  typeof m === 'string' && (ALLOWED_MIME as readonly string[]).includes(m);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

export function pendingKeys(userId: string, uploadId: string, mime: AllowedMime) {
  const base = `pending/${userId}/${uploadId}`;
  return { original: `${base}/original.${EXT[mime]}`, thumb: `${base}/thumb.webp` };
}

export function finalKeys(wallpaperId: string, mime: AllowedMime) {
  const base = `w/${wallpaperId}`;
  return { original: `${base}/original.${EXT[mime]}`, thumb: `${base}/thumb.webp` };
}
