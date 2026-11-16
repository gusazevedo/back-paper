import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../src/App';
import { supabase } from '../src/lib/supabase';
import type { SupabaseMock } from '../testing/mockSupabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: require('../testing/mockSupabase').createSupabaseMock(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

const mock = supabase as unknown as SupabaseMock;
const ME = 'u1';
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const wallpaper = (id: string, title: string, author: string) => ({
  id,
  author_id: author,
  title,
  thumb_key: `w/${id}/thumb.webp`,
  original_key: `w/${id}/original.jpg`,
  width: 1080,
  height: 2340,
  like_count: 0,
  created_at: ago(3_600_000),
  author: {
    display_name: author === ME ? 'Maya' : 'Yuki Mori',
    avatar_url: null,
  },
  wallpaper_categories: [],
  my_like: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  mock.__setSession({ access_token: 'jwt', user: { id: ME } });
  mock.__state.tables = {
    profiles: [
      { id: ME, display_name: 'Maya', avatar_url: null },
      { id: 'u2', display_name: 'Yuki Mori', avatar_url: null },
    ],
    categories: [],
    wallpapers: [
      wallpaper('w1', 'Quiet Ridge', 'u2'),
      wallpaper('w2', 'Night Shift', 'u2'),
      wallpaper('w3', 'Mine', ME),
    ],
  };
  mock.__state.rpc = {
    feed: [wallpaper('w1', 'Quiet Ridge', 'u2'), wallpaper('w3', 'Mine', ME)],
    user_wallpapers: (args: { p_user_id: string }) => ({
      data: (mock.__state.tables.wallpapers as { author_id: string }[]).filter(
        w => w.author_id === args.p_user_id,
      ),
      error: null,
    }),
    my_publish_quota: [{ lim: 10, used: 0, remaining: 10, next_at: null }],
  };
});

const openDetail = async (title: string) => {
  await render(<App />);
  await fireEvent.press(await screen.findByRole('button', { name: title }));
};

describe('public profile', () => {
  it("opens from the author's name with avatar, name and their wallpapers", async () => {
    await openDetail('Quiet Ridge');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'By Yuki Mori' }),
    );
    expect(
      await screen.findByRole('header', { name: 'Yuki Mori' }),
    ).toBeTruthy();
    expect(
      await screen.findByRole('button', { name: 'Night Shift' }),
    ).toBeTruthy();
    expect(mock.rpc).toHaveBeenCalledWith(
      'user_wallpapers',
      expect.objectContaining({ p_user_id: 'u2' }),
    );
    // Only Published: no folders, settings or counts of anything private.
    expect(screen.queryByRole('tab', { name: 'Folders' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(mock.rpc).not.toHaveBeenCalledWith('my_folders', undefined);
  });

  it('a wallpaper opens its detail, and back returns to the profile', async () => {
    await openDetail('Quiet Ridge');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'By Yuki Mori' }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Night Shift' }),
    );
    expect(
      await screen.findByRole('header', { name: 'Night Shift' }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(
      await screen.findByRole('header', { name: 'Yuki Mori' }),
    ).toBeTruthy();
  });

  it('my own name opens my profile tab', async () => {
    await openDetail('Mine');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'By Maya' }),
    );
    expect(await screen.findByRole('tab', { name: 'Folders' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
  });
});
