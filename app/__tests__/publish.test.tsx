import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import App from '../src/App';
import { queryClient } from '../src/lib/queryClient';
import { supabase } from '../src/lib/supabase';
import type { SupabaseMock } from '../testing/mockSupabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: require('../testing/mockSupabase').createSupabaseMock(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

const mock = supabase as unknown as SupabaseMock;
const ME = 'u1';

const image = {
  uri: 'file:///photos/dunes.jpg',
  type: 'image/jpeg',
  fileSize: 2_000_000,
  width: 1080,
  height: 2340,
  fileName: 'dunes.jpg',
};

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  mock.__setSession({ access_token: 'jwt', user: { id: ME } });
  mock.__state.tables = {
    profiles: [{ id: ME, display_name: 'Maya Costa', avatar_url: null }],
    categories: [
      { slug: 'nature', label: 'Nature' },
      { slug: 'dark', label: 'Dark' },
    ],
    wallpapers: [],
  };
  mock.__state.rpc = { user_wallpapers: [] };
  mock.__state.functions = {
    'request-upload': () => ({
      data: {
        upload_id: 'up-1',
        original: { url: 'https://s3/original', content_type: 'image/jpeg' },
        thumb: { url: 'https://s3/thumb', content_type: 'image/webp' },
      },
      error: null,
    }),
    'publish-wallpaper': () => ({
      data: {
        id: 'w1',
        thumb_key: 'w/w1/thumb.webp',
        original_key: 'w/w1/original.jpg',
      },
      error: null,
    }),
  };
  (launchImageLibrary as jest.Mock).mockResolvedValue({ assets: [image] });
});

async function openPublishWithImage() {
  await render(<App />);
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Publish a wallpaper' }),
  );
  await fireEvent.press(
    await screen.findByRole('button', { name: 'From gallery' }),
  );
  await screen.findByLabelText('Preview of the selected image');
}

describe('publishing a wallpaper', () => {
  it('needs at least one category before Publish is enabled', async () => {
    await openPublishWithImage();
    const publish = screen.getByRole('button', { name: 'Publish' });
    expect(publish).toBeDisabled();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Nature' }),
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('uploads both files and publishes with title and categories', async () => {
    await openPublishWithImage();
    await fireEvent.changeText(
      screen.getByLabelText('Title (optional)'),
      '  Dunes ',
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Nature' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Publish' }));

    expect(
      await screen.findByText('Your wallpaper is now in the feed.'),
    ).toBeTruthy();
    expect(mock.functions.invoke).toHaveBeenCalledWith('request-upload', {
      body: { mime: 'image/jpeg', size_bytes: 2_000_000 },
    });
    expect(mock.functions.invoke).toHaveBeenCalledWith('publish-wallpaper', {
      body: {
        upload_id: 'up-1',
        mime: 'image/jpeg',
        title: 'Dunes',
        categories: ['nature', 'dark'],
      },
    });
  });

  it('keeps the form and offers a retry when publishing fails', async () => {
    mock.__state.functions['publish-wallpaper'] = () => ({
      data: null,
      error: new Error('boom'),
    });
    await openPublishWithImage();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Nature' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Publish' }));

    expect(
      await screen.findByText(
        "Couldn't publish your wallpaper. Your image and details are still here.",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Preview of the selected image')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
});

describe('my profile', () => {
  it('shows my name, the published total and the grid', async () => {
    mock.__state.tables.wallpapers = [
      { id: 'w1', author_id: ME },
      { id: 'w2', author_id: ME },
    ];
    mock.__state.rpc.user_wallpapers = [
      {
        id: 'w2',
        title: 'Tidal',
        thumb_key: 'w/w2/thumb.webp',
        width: 1080,
        height: 2340,
        created_at: '2026-11-15',
      },
      {
        id: 'w1',
        title: 'Dunes',
        thumb_key: 'w/w1/thumb.webp',
        width: 1080,
        height: 2340,
        created_at: '2026-11-14',
      },
    ];
    await render(<App />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
    expect(
      await screen.findByRole('header', { name: 'Maya Costa' }),
    ).toBeTruthy();
    expect(await screen.findByText('2 wallpapers published')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tidal' })).toBeTruthy(),
    );
    expect(mock.rpc).toHaveBeenCalledWith('user_wallpapers', {
      p_user_id: ME,
      p_cursor: null,
      p_limit: 20,
    });
  });

  it('shows the empty message with nothing published', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
    expect(
      await screen.findByText("You haven't published any wallpapers yet."),
    ).toBeTruthy();
  });
});
