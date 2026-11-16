import { useCallback, useState } from 'react';
import { ToastAndroid } from 'react-native';
import { t } from '../../i18n';
import { DownloadError, saveToGallery } from './saveToGallery';

export type DownloadStatus = 'idle' | 'downloading' | 'done';

/** Saves a wallpaper to the gallery and reports the outcome in a toast (R-DL-3). */
export function useDownload(wallpaperId: string, originalKey: string) {
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const download = useCallback(async () => {
    setStatus('downloading');
    try {
      await saveToGallery(wallpaperId, originalKey);
      setStatus('done');
      ToastAndroid.show(t('detail.downloaded'), ToastAndroid.SHORT);
    } catch (e) {
      setStatus('idle');
      const permission =
        e instanceof DownloadError && e.reason === 'permission';
      ToastAndroid.show(
        permission
          ? t('detail.downloadNoPermission')
          : t('detail.downloadFailed'),
        ToastAndroid.LONG,
      );
    }
  }, [wallpaperId, originalKey]);
  return { status, download };
}
