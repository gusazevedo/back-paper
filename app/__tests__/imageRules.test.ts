import {
  checkImageRules,
  detectFormat,
  MAX_BYTES,
} from '../src/features/publish/imageRules';

describe('detectFormat', () => {
  it('accepts JPEG, PNG and WebP, and HEIC/HEIF for conversion', () => {
    expect(detectFormat('image/jpeg', 'a.jpg')).toBe('jpeg');
    expect(detectFormat('image/png', null)).toBe('png');
    expect(detectFormat('image/webp', null)).toBe('webp');
    expect(detectFormat('image/heic', 'IMG_1.HEIC')).toBe('heic');
    expect(detectFormat('image/heif', null)).toBe('heic');
  });

  it('refuses GIF, SVG, BMP, TIFF and the like', () => {
    for (const mime of [
      'image/gif',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
    ]) {
      expect(detectFormat(mime, 'x.jpg')).toBeNull();
    }
  });

  it('falls back to the extension when the provider gives no type', () => {
    expect(detectFormat(null, 'photo.JPEG')).toBe('jpeg');
    expect(detectFormat('application/octet-stream', 'x.heif')).toBe('heic');
    expect(detectFormat(null, 'clip.gif')).toBeNull();
    expect(detectFormat(null, null)).toBeNull();
  });
});

describe('checkImageRules', () => {
  const ok = { sizeBytes: 1000, width: 1080, height: 1620 };

  it('passes a portrait image at the minimums', () => {
    expect(checkImageRules(ok)).toBeNull();
    expect(checkImageRules({ ...ok, sizeBytes: MAX_BYTES })).toBeNull();
  });

  it('reports each broken rule', () => {
    expect(checkImageRules({ ...ok, sizeBytes: MAX_BYTES + 1 })).toBe(
      'file_too_large',
    );
    expect(checkImageRules({ ...ok, width: 1079, height: 2000 })).toBe(
      'resolution_too_low',
    );
    expect(checkImageRules({ ...ok, height: 1619 })).toBe('not_portrait');
    expect(checkImageRules({ ...ok, width: 1920, height: 1080 })).toBe(
      'not_portrait',
    );
  });
});
