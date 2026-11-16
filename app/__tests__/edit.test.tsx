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

const openEdit = async () => {
  await render(<App />);
  await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Half Past' }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: 'Edit' }));
  await screen.findByRole('header', { name: 'Edit wallpaper' });
};

describe('edit wallpaper', () => {
  it('starts from the saved title and categories', async () => {
    await openEdit();
    expect(screen.getByLabelText('Title (optional)').props.value).toBe(
      'Half Past',
    );
    expect(
      screen.getByRole('button', { name: 'Nature', selected: true }),
    ).toBeTruthy();
    expect(screen.getByText('1/5')).toBeTruthy();
  });

  it('saves title and categories and shows them in the detail', async () => {
    await openEdit();
    await fireEvent.changeText(
      screen.getByLabelText('Title (optional)'),
      '  Quarter To ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Dark' }));
    await fireEvent.press(screen.getByRole('button', { name: 'AI' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(mock.rpc).toHaveBeenCalledWith('update_wallpaper', {
      p_id: 'w2',
      p_title: 'Quarter To',
      // In the fixed category order, not the order they were tapped in.
      p_categories: ['ai', 'dark', 'nature'],
    });
    expect(
      await screen.findByRole('header', { name: 'Quarter To' }),
    ).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Edit wallpaper' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeTruthy();
  });

  it('needs at least one category', async () => {
    await openEdit();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Nature', selected: true }),
    );
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('says so when the server says the 24 hours are over', async () => {
    mock.__state.rpc.update_wallpaper = () => ({
      data: null,
      error: { code: 'BP410', message: 'closed' },
    });
    await openEdit();
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('The 24 hours for editing are over.'),
    ).toBeTruthy();
  });
});
