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
  author_id: 'u2',
  title: 'Half Past',
  thumb_key: 'w/w2/thumb.webp',
  original_key: 'w/w2/original.jpg',
  width: 1080,
  height: 2340,
  like_count: 4,
  created_at: ago(2 * HOUR),
  author: { display_name: 'Yuki Mori', avatar_url: null },
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
    feed: [row],
    user_wallpapers: [row],
    my_publish_quota: [{ lim: 10, used: 0, remaining: 10, next_at: null }],
    update_wallpaper: () => ({ data: null, error: null }),
  };
});

const openReport = async () => {
  await render(<App />);
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Half Past' }),
  );
  await fireEvent.press(await screen.findByRole('button', { name: 'Report' }));
  await screen.findByRole('header', { name: 'Report this wallpaper?' });
};

const confirmButton = () =>
  screen.getAllByRole('button', { name: 'Report' }).slice(-1)[0];

describe('report wallpaper', () => {
  it('offers the six fixed reasons and needs one picked', async () => {
    await openReport();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(
      screen.getByRole('radio', { name: 'Copyright infringement' }),
    ).toBeTruthy();
    expect(confirmButton()).toBeDisabled();
    // No free text.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('reports with the reason, leaves the detail and hides it from the feed', async () => {
    await openReport();
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Spam or low quality' }),
    );
    expect(
      screen.getByRole('radio', { name: 'Spam or low quality', checked: true }),
    ).toBeTruthy();
    // The server hides reported wallpapers from the reporter from now on.
    mock.__state.rpc.feed = [];
    await fireEvent.press(confirmButton());

    expect(mock.__state.tables.reports).toEqual([
      { reporter_id: ME, wallpaper_id: 'w2', reason: 'spam_low_quality' },
    ]);
    expect(await screen.findByText('No wallpapers yet')).toBeTruthy();
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      "Reported. You won't see this wallpaper again.",
      ToastAndroid.SHORT,
    );
  });

  it('treats an earlier report of the same wallpaper as done', async () => {
    mock.__state.onWrite = () => ({
      data: null,
      error: { code: '23505', message: 'dup' },
    });
    await openReport();
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Something else' }),
    );
    await fireEvent.press(confirmButton());
    await waitFor(() =>
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Reported. You won't see this wallpaper again.",
        ToastAndroid.SHORT,
      ),
    );
  });

  it('stays and says so when the report fails', async () => {
    mock.__state.onWrite = () => ({
      data: null,
      error: { code: '500', message: 'down' },
    });
    await openReport();
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Something else' }),
    );
    await fireEvent.press(confirmButton());
    await waitFor(() =>
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Couldn't send the report. Try again.",
        ToastAndroid.LONG,
      ),
    );
    expect(
      screen.getByRole('header', { name: 'Report this wallpaper?' }),
    ).toBeTruthy();
  });

  it('is not offered on my own wallpapers', async () => {
    mock.__state.tables.wallpapers = [{ ...row, author_id: ME }];
    mock.__state.rpc.feed = [{ ...row, author_id: ME }];
    await render(<App />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Half Past' }),
    );
    await screen.findByRole('button', { name: 'Delete' });
    expect(screen.queryByRole('button', { name: 'Report' })).toBeNull();
  });
});
