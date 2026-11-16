import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { PermissionsAndroid, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { publicUrl } from '../../lib/storage';

export const ALBUM = 'BackPaper';

export class DownloadError extends Error {
  constructor(readonly reason: 'permission' | 'failed', cause?: unknown) {
    super(
      reason === 'permission' ? 'storage permission denied' : 'download failed',
    );
    this.cause = cause;
  }
}

/** R-DL-2: Android 10+ saves through MediaStore without asking; 7–9 need the storage permission. */
async function ensurePermission(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) >= 29) return;
  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  if (await PermissionsAndroid.check(permission)) return;
  const result = await PermissionsAndroid.request(permission);
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new DownloadError('permission');
  }
}

/**
 * R-DL-1: downloads the original file (not the thumbnail) and adds it to the
 * "BackPaper" album: DCIM/BackPaper on Android 10+, Pictures/BackPaper before.
 */
export async function saveToGallery(
  wallpaperId: string,
  originalKey: string,
): Promise<void> {
  await ensurePermission();
  // The extension in the name is what MediaStore uses to pick the MIME type.
  const ext = originalKey.slice(originalKey.lastIndexOf('.') + 1);
  let response;
  try {
    response = await ReactNativeBlobUtil.config({
      path: `${ReactNativeBlobUtil.fs.dirs.CacheDir}/backpaper-${wallpaperId}.${ext}`,
    }).fetch('GET', publicUrl(originalKey));
  } catch (e) {
    throw new DownloadError('failed', e);
  }
  try {
    if (response.info().status !== 200) {
      throw new DownloadError('failed', `HTTP ${response.info().status}`);
    }
    await CameraRoll.saveAsset(`file://${response.path()}`, {
      type: 'photo',
      album: ALBUM,
    });
  } catch (e) {
    throw e instanceof DownloadError ? e : new DownloadError('failed', e);
  } finally {
    // The gallery keeps its own copy; drop the cached download.
    response.flush();
  }
}
