import { UploadMime } from './types';

/** R-PUB-4: largest original accepted. Mirrors supabase/functions/_shared/uploads.ts. */
export const MAX_BYTES = 15 * 1024 * 1024;
/** R-PUB-5: the shorter side must be at least this many pixels. */
export const MIN_SHORT_SIDE = 1080;
/** R-PUB-6: portrait only, height >= width × this. */
export const MIN_ASPECT = 1.5;

export type ImageRuleError =
  | 'unsupported_format'
  | 'file_too_large'
  | 'resolution_too_low'
  | 'not_portrait'
  | 'unreadable';

/** Formats the app reads. HEIC/HEIF is accepted here and converted to JPEG (R-PUB-3). */
export type SourceFormat = 'jpeg' | 'png' | 'webp' | 'heic';

const BY_MIME: Record<string, SourceFormat> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/pjpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'image/heic-sequence': 'heic',
  'image/heif-sequence': 'heic',
};

const BY_EXT: Record<string, SourceFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
};

/**
 * Works out the source format from the MIME type, falling back to the file
 * extension when a provider reports none. Anything else (GIF, SVG, BMP, TIFF…) is null.
 */
export function detectFormat(
  mime: string | null,
  name: string | null,
): SourceFormat | null {
  const byMime = mime ? BY_MIME[mime.toLowerCase()] : undefined;
  if (byMime) return byMime;
  if (mime && mime !== 'application/octet-stream') return null;
  const ext = name?.split('.').pop()?.toLowerCase();
  return (ext && BY_EXT[ext]) || null;
}

/** What each source format is re-encoded to before upload. */
export const OUTPUT: Record<
  SourceFormat,
  { mime: UploadMime; resizerFormat: 'JPEG' | 'PNG' | 'WEBP' }
> = {
  jpeg: { mime: 'image/jpeg', resizerFormat: 'JPEG' },
  heic: { mime: 'image/jpeg', resizerFormat: 'JPEG' },
  png: { mime: 'image/png', resizerFormat: 'PNG' },
  webp: { mime: 'image/webp', resizerFormat: 'WEBP' },
};

/** R-PUB-4 to R-PUB-6, checked in the order the screen reports them. */
export function checkImageRules(image: {
  sizeBytes: number;
  width: number;
  height: number;
}): ImageRuleError | null {
  if (image.sizeBytes > MAX_BYTES) return 'file_too_large';
  if (Math.min(image.width, image.height) < MIN_SHORT_SIDE) {
    return 'resolution_too_low';
  }
  if (image.height < image.width * MIN_ASPECT) return 'not_portrait';
  return null;
}
