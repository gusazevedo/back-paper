import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ToastAndroid } from 'react-native';
import App from '../src/App';
import { supabase } from '../src/lib/supabase';
import type { SupabaseMock } from '../testing/mockSupabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: require('../testing/mockSupabase').createSupabaseMock(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

const mock = supabase as unknown as SupabaseMock;
const ME = 'u1';
const HOUR = 3_600_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const row = {
  id: 'w2',
  author_id: ME,
  title: 'Half Past',
  thumb_key: 'w/w2/thumb.webp',
  original_key: 'w/w2/original.jpg',
  width: 1080,
  height: 2340,
  like_count: 4,
  created_at: ago(2 * HOUR),
  author: { display_name: 'Maya', avatar_url: null },
  wallpaper_categories: [{ category_slug: 'nature' }],
  my_like: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mock.__state.onWrite = null;
  jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
  mock.__setSession({ access_token: 'jwt', user: { id: ME } });
  mock.__state.tables = {
    profiles: [{ id: ME, display_name: 'Maya', avatar_url: null }],
    categories: [
      { slug: 'ai', label: 'AI' },
      { slug: 'dark', label: 'Dark' },
      { slug: 'nature', label: 'Nature' },
    ],
    wallpapers: [row],
  };
  mock.__state.rpc = {
    feed: [],
    user_wallpapers: [row],
    my_publish_quota: [{ lim: 10, used: 0, remaining: 10, next_at: null }],
    update_wallpaper: () => ({ data: null, error: null }),
  };
});

const openMine = async () => {
  await render(<App />);
  await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Half Past' }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: 'Delete' }));
  await screen.findByRole('header', { name: 'Delete this wallpaper?' });
};

describe('delete wallpaper', () => {
  it('asks first, and Cancel keeps it', async () => {
    await openMine();
    expect(
      screen.getByText(
        "This can't be undone. It will be removed from the feed and from everyone's folders.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mock.__state.tables.wallpapers).toHaveLength(1);
    expect(screen.getByRole('header', { name: 'Half Past' })).toBeTruthy();
  });

  it('deletes after confirming and goes back to the grid', async () => {
    await openMine();
    const confirm = screen
      .getAllByRole('button', { name: 'Delete' })
      .slice(-1)[0];
    mock.__state.rpc.user_wallpapers = [];
    await fireEvent.press(confirm);
    expect(
      await screen.findByText("You haven't published any wallpapers yet."),
    ).toBeTruthy();
    expect(mock.__state.tables.wallpapers).toEqual([]);
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      'Wallpaper deleted',
      ToastAndroid.SHORT,
    );
  });

  it('stays put and says so when the delete fails', async () => {
    mock.__state.onWrite = () => ({
      data: null,
      error: { code: '500', message: 'down' },
    });
    await openMine();
    await fireEvent.press(
      screen.getAllByRole('button', { name: 'Delete' }).slice(-1)[0],
    );
    await waitFor(() =>
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Couldn't delete the wallpaper. Try again.",
        ToastAndroid.LONG,
      ),
    );
    expect(mock.__state.tables.wallpapers).toHaveLength(1);
  });
});
