/** Shared upload rules and object key layout (R-PUB, §6.1). */
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export const MAX_BYTES = 15 * 1024 * 1024;

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
