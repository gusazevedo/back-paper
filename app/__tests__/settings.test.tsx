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
  mock.__state.onWrite = null;
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

const openSettings = async () => {
  await render(<App />);
  await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Settings' }),
  );
  await screen.findByRole('header', { name: 'Settings' });
};

describe('settings', () => {
  it('opens from the gear with Edit display name and Log out', async () => {
    await openSettings();
    expect(
      screen.getByRole('button', { name: 'Edit display name, Maya' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
  });

  it('validates the name: 1 to 40 characters', async () => {
    await openSettings();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Edit display name, Maya' }),
    );
    const field = await screen.findByLabelText('Display name');
    expect(field.props.value).toBe('Maya');
    expect(field.props.maxLength).toBe(40);
    await fireEvent.changeText(field, '   ');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves the new name and shows it on my profile and the detail', async () => {
    await openSettings();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Edit display name, Maya' }),
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Display name'),
      '  Maya Costa ',
    );
    // The detail embeds the author's name; the mock serves it from the row.
    (mock.__state.tables.wallpapers as { author: object }[])[2].author = {
      display_name: 'Maya Costa',
      avatar_url: null,
    };
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByRole('button', {
        name: 'Edit display name, Maya Costa',
      }),
    ).toBeTruthy();
    expect(
      (
        mock.__state.tables.profiles as { id: string; display_name: string }[]
      ).find(p => p.id === ME)?.display_name,
    ).toBe('Maya Costa');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(
      await screen.findByRole('header', { name: 'Maya Costa' }),
    ).toBeTruthy();
    await fireEvent.press(await screen.findByRole('tab', { name: 'Feed' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Mine' }));
    expect(
      await screen.findByRole('button', { name: 'By Maya Costa' }),
    ).toBeTruthy();
  });

  it('says so when saving fails', async () => {
    mock.__state.onWrite = () => ({
      data: null,
      error: { code: '500', message: 'down' },
    });
    await openSettings();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Edit display name, Maya' }),
    );
    await fireEvent.changeText(
      await screen.findByLabelText('Display name'),
      'Maya C',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText("Couldn't save your name. Try again."),
    ).toBeTruthy();
  });
});
