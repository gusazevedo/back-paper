import { launchImageLibrary } from 'react-native-image-picker';
import { PickedImage } from './types';

/** Opens the system photo picker. Resolves null when the user backs out. */
export async function pickFromGallery(): Promise<PickedImage | null> {
  const res = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 1,
  });
  const asset = res.assets?.[0];
  if (res.didCancel || !asset?.uri) {
    return null;
  }
  return {
    uri: asset.uri,
    mime: asset.type ?? 'application/octet-stream',
    sizeBytes: asset.fileSize ?? 0,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    fileName: asset.fileName,
  };
}
