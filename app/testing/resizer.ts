import ImageResizer from '@bam.tech/react-native-image-resizer';

const THUMB = {
  uri: 'file:///cache/thumb.webp',
  path: '/cache/thumb.webp',
  size: 1000,
  width: 720,
  height: 1280,
  name: 'thumb.webp',
};

/**
 * Makes the mocked resizer return `clean` for the full-size re-encode (EXIF
 * removal) and a 720 px WebP for the thumbnail.
 */
export function encodeAs(clean: {
  width: number;
  height: number;
  size: number;
}) {
  (ImageResizer.createResizedImage as jest.Mock).mockImplementation(
    async (_uri: string, width: number, _h: number, format: string) =>
      format === 'WEBP' && width === 720
        ? THUMB
        : {
            uri: 'file:///cache/clean',
            path: '/cache/clean',
            name: 'clean',
            ...clean,
          },
  );
}
