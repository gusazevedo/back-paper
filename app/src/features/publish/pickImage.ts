import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { SourceFile } from './types';

/** Opens the system photo picker. Resolves null when the user backs out. */
export async function pickFromGallery(): Promise<SourceFile | null> {
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
    mime: asset.type ?? null,
    sizeBytes: asset.fileSize ?? null,
    name: asset.fileName ?? null,
  };
}

/** Opens the system file picker filtered to images. Resolves null when the user backs out. */
export async function pickFromFiles(): Promise<SourceFile | null> {
  try {
    const [file] = await pick({ type: [types.images] });
    return {
      uri: file.uri,
      mime: file.type,
      sizeBytes: file.size,
      name: file.name,
    };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw e;
  }
}
