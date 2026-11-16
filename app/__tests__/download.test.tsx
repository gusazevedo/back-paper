import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { PermissionsAndroid, Platform, ToastAndroid } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import App from '../src/App';
import {
  DownloadError,
  saveToGallery,
} from '../src/features/download/saveToGallery';
import { supabase } from '../src/lib/supabase';
import type { SupabaseMock } from '../testing/mockSupabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: require('../testing/mockSupabase').createSupabaseMock(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

const mock = supabase as unknown as SupabaseMock;
const ME = 'u1';
const saveAsset = CameraRoll.saveAsset as jest.Mock;
const config = ReactNativeBlobUtil.config as jest.Mock;

/** Makes the next download answer with this HTTP status; returns its flush mock. */
const nextDownload = (status = 200) => {
  const flush = jest.fn();
  config.mockImplementationOnce(({ path }: { path: string }) => ({
    fetch: jest.fn(async () => ({
      path: () => path,
      info: () => ({ status }),
      flush,
    })),
  }));
  return flush;
};

const onAndroid = (version: number) => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(version);
};

const wallpaper = (id: string, author: string, title: string) => ({
  id,
  author_id: author,
  title,
  original_key: `w/${id}/original.png`,
  thumb_key: `w/${id}/thumb.webp`,
  width: 1080,
  height: 2340,
  like_count: 0,
  liked_by_me: false,
  created_at: new Date().toISOString(),
  author: { display_name: 'Someone', avatar_url: null },
  wallpaper_categories: [],
  my_like: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
  mock.__setSession({ access_token: 'jwt', user: { id: ME } });
  const others = wallpaper('w1', 'u2', 'Quiet Ridge');
  const mine = wallpaper('w2', ME, 'Half Past');
  mock.__state.tables = {
    profiles: [{ id: ME, display_name: 'Maya', avatar_url: null }],
    categories: [],
    wallpapers: [others, mine],
  };
  mock.__state.rpc = { feed: [others, mine] };
});

describe('saveToGallery', () => {
  it('saves the original, not the thumbnail, to the BackPapers album', async () => {
    const flush = nextDownload();
    await saveToGallery('w1', 'w/w1/original.png');
    expect(config).toHaveBeenCalledWith({
      path: '/data/cache/backpaper-w1.png',
    });
    const fetch = config.mock.results[0].value.fetch as jest.Mock;
    expect(fetch).toHaveBeenCalledWith(
      'GET',
      expect.stringMatching(/\/w\/w1\/original\.png$/),
    );
    expect(saveAsset).toHaveBeenCalledWith(
      'file:///data/cache/backpaper-w1.png',
      { type: 'photo', album: 'BackPapers' },
    );
    expect(flush).toHaveBeenCalled();
  });

  it('fails on an HTTP error without touching the gallery, and cleans up', async () => {
    const flush = nextDownload(404);
    await expect(saveToGallery('w1', 'w/w1/original.png')).rejects.toEqual(
      new DownloadError('failed'),
    );
    expect(saveAsset).not.toHaveBeenCalled();
    expect(flush).toHaveBeenCalled();
  });

  it('does not ask for a permission on Android 10+', async () => {
    onAndroid(33);
    const request = jest.spyOn(PermissionsAndroid, 'request');
    await saveToGallery('w1', 'w/w1/original.png');
    expect(request).not.toHaveBeenCalled();
  });

  it('asks for storage access on Android 9 and stops if refused', async () => {
    onAndroid(28);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    const request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    await expect(saveToGallery('w1', 'w/w1/original.png')).rejects.toEqual(
      new DownloadError('permission'),
    );
    expect(request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    expect(config).not.toHaveBeenCalled();
  });
});

describe('Download button', () => {
  const openDetail = async (title: string) => {
    await render(<App />);
    await fireEvent.press(await screen.findByRole('button', { name: title }));
    return screen.findByRole('button', { name: 'Download' });
  };

  it.each([
    ['someone else’s', 'Quiet Ridge'],
    ['my own', 'Half Past'],
  ])('saves %s wallpaper and confirms with a toast', async (_, title) => {
    await fireEvent.press(await openDetail(title));
    expect(
      await screen.findByRole('button', { name: 'Downloaded' }),
    ).toBeTruthy();
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'Saved to the BackPapers album',
      ToastAndroid.SHORT,
    );
  });

  it('reports a failure and lets the user try again', async () => {
    saveAsset.mockRejectedValueOnce(new Error('disk full'));
    await fireEvent.press(await openDetail('Quiet Ridge'));
    await waitFor(() =>
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Couldn't save the wallpaper. Try again.",
        ToastAndroid.LONG,
      ),
    );
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
  });
});
