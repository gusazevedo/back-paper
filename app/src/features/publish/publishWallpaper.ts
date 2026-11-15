import ImageResizer from '@bam.tech/react-native-image-resizer';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { supabase } from '../../lib/supabase';
import { PickedImage } from './types';

export class PublishError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

type UploadTarget = { url: string; content_type: string };
type RequestUploadResponse = {
  upload_id: string;
  original: UploadTarget;
  thumb: UploadTarget;
};
type PublishResponse = { id: string; thumb_key: string; original_key: string };

const THUMB_WIDTH = 720;

const toPath = (uri: string) =>
  decodeURIComponent(uri.replace(/^file:\/\//, ''));

async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    const payload = await (error as { context?: Response }).context
      ?.json?.()
      .catch(() => null);
    throw new PublishError(payload?.error?.code ?? 'publish_failed');
  }
  return data as T;
}

async function put(
  target: UploadTarget,
  fileUri: string,
  onProgress?: (fraction: number) => void,
) {
  const res = await ReactNativeBlobUtil.fetch(
    'PUT',
    target.url,
    { 'Content-Type': target.content_type },
    ReactNativeBlobUtil.wrap(toPath(fileUri)),
  ).uploadProgress({ interval: 100 }, (sent, total) => {
    onProgress?.(total > 0 ? sent / total : 0);
  });
  const status = res.info().status;
  if (status < 200 || status >= 300) {
    throw new PublishError('upload_failed');
  }
}

/** WebP thumbnail about 720 px wide for the grids (R-PUB-7). */
async function makeThumbnail(image: PickedImage) {
  const height = Math.round(
    (THUMB_WIDTH * image.height) / Math.max(image.width, 1),
  );
  return ImageResizer.createResizedImage(
    image.uri,
    THUMB_WIDTH,
    height,
    'WEBP',
    80,
    0,
    null,
    false,
    {
      mode: 'contain',
      onlyScaleDown: true,
    },
  );
}

/**
 * Full publish pipeline (§6.1): thumbnail → presigned URLs → direct uploads → publish.
 * `onProgress` reports 0..1 across both uploads.
 */
export async function publishWallpaper(
  input: { image: PickedImage; title: string; categories: string[] },
  onProgress?: (fraction: number) => void,
): Promise<PublishResponse> {
  const thumb = await makeThumbnail(input.image);
  const target = await invoke<RequestUploadResponse>('request-upload', {
    mime: input.image.mime,
    size_bytes: input.image.sizeBytes,
  });

  const total = input.image.sizeBytes + thumb.size;
  let thumbDone = 0;
  await put(target.thumb, thumb.uri, f => {
    thumbDone = f * thumb.size;
    onProgress?.(thumbDone / total);
  });
  await put(target.original, input.image.uri, f => {
    onProgress?.((thumbDone + f * input.image.sizeBytes) / total);
  });

  return invoke<PublishResponse>('publish-wallpaper', {
    upload_id: target.upload_id,
    mime: input.image.mime,
    title: input.title.trim(),
    categories: input.categories,
  });
}
