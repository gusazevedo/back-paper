import ImageResizer from '@bam.tech/react-native-image-resizer';
import {
  checkImageRules,
  detectFormat,
  ImageRuleError,
  MAX_BYTES,
  OUTPUT,
} from './imageRules';
import { PickedImage, SourceFile } from './types';

export type Rejection = {
  error: ImageRuleError;
  fileName: string | null;
  sizeBytes?: number;
  width?: number;
  height?: number;
};

export type PrepareResult =
  | { ok: true; image: PickedImage }
  | { ok: false; rejection: Rejection };

/** Large enough that the resizer never scales the original down. */
const NO_SCALE = 20_000;
const QUALITY = 92;

/**
 * Turns a picked file into an uploadable image (R-PUB-3 to R-PUB-7):
 * checks the format, re-encodes it (HEIC/HEIF becomes JPEG; EXIF, GPS included,
 * is dropped and the orientation is baked in), then checks size, resolution and
 * proportion on the re-encoded result, which is what gets uploaded.
 */
export async function prepareImage(file: SourceFile): Promise<PrepareResult> {
  const reject = (
    error: ImageRuleError,
    extra: Omit<Rejection, 'error' | 'fileName'> = {},
  ): PrepareResult => ({
    ok: false,
    rejection: { error, fileName: file.name, ...extra },
  });

  const format = detectFormat(file.mime, file.name);
  if (!format) return reject('unsupported_format');
  // Checked before decoding so a huge file never reaches the decoder.
  if (file.sizeBytes != null && file.sizeBytes > MAX_BYTES) {
    return reject('file_too_large', { sizeBytes: file.sizeBytes });
  }

  const output = OUTPUT[format];
  let encoded;
  try {
    encoded = await ImageResizer.createResizedImage(
      file.uri,
      NO_SCALE,
      NO_SCALE,
      output.resizerFormat,
      QUALITY,
      0,
      null,
      false, // keepMeta: false drops EXIF
      { mode: 'contain', onlyScaleDown: true },
    );
  } catch {
    return reject('unreadable');
  }

  const image: PickedImage = {
    uri: encoded.uri,
    mime: output.mime,
    sizeBytes: encoded.size,
    width: encoded.width,
    height: encoded.height,
    fileName: file.name ?? undefined,
  };
  const broken = checkImageRules(image);
  if (broken) {
    return reject(broken, {
      sizeBytes: image.sizeBytes,
      width: image.width,
      height: image.height,
    });
  }
  return { ok: true, image };
}
