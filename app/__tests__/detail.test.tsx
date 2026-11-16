import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../src/App';
import { formatCount, relativeTime } from '../src/lib/format';
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

const gridRow = (id: string, author: string) => ({
  id,
  author_id: author,
  title: id === 'w1' ? 'Quiet Ridge' : 'Half Past',
  thumb_key: `w/${id}/thumb.webp`,
  width: 1080,
  height: 2340,
  created_at: ago(HOUR),
});

const detailRow = (
  id: string,
  author: string,
  over: Record<string, unknown> = {},
) => ({
  ...gridRow(id, author),
  original_key: `w/${id}/original.jpg`,
  like_count: 1284,
  author: {
    display_name: author === ME ? 'Maya' : 'Yuki Mori',
    avatar_url: null,
  },
  // Stored in pick order; the screen shows them in category order.
  wallpaper_categories: [{ category_slug: 'nature' }, { category_slug: 'ai' }],
  my_like: [] as unknown[],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mock.__state.onWrite = null;
  mock.__setSession({ access_token: 'jwt', user: { id: ME } });
  mock.__state.tables = {
    profiles: [{ id: ME, display_name: 'Maya', avatar_url: null }],
    categories: [
      { slug: 'ai', label: 'AI' },
      { slug: 'dark', label: 'Dark' },
      { slug: 'nature', label: 'Nature' },
    ],
    wallpapers: [
      detailRow('w1', 'u2', { created_at: ago(3 * 24 * HOUR) }),
      detailRow('w2', ME, { created_at: ago(9 * HOUR), like_count: 2110 }),
    ],
  };
  mock.__state.rpc = {
    feed: [gridRow('w1', 'u2'), gridRow('w2', ME)],
    user_wallpapers: [gridRow('w2', ME)],
    my_publish_quota: [{ lim: 10, used: 0, remaining: 10, next_at: null }],
  };
});

const open = async (title: string) => {
  await render(<App />);
  await fireEvent.press(await screen.findByRole('button', { name: title }));
};

describe('wallpaper detail', () => {
  it("shows someone else's wallpaper with Like, Save, Download and Report", async () => {
    await open('Quiet Ridge');
    expect(
      await screen.findByRole('header', { name: 'Quiet Ridge' }),
    ).toBeTruthy();
    expect(screen.getByText('Yuki Mori')).toBeTruthy();
    expect(screen.getByText('3 days ago')).toBeTruthy();
    expect(
      screen
        .getAllByRole('button', { name: /^(AI|Nature)$/ })
        .map(c => c.props.accessibilityLabel),
    ).toEqual(['AI', 'Nature']);
    expect(
      screen.getByRole('button', { name: 'Like, 1,284 likes' }),
    ).toBeTruthy();
    for (const name of ['Save', 'Download', 'Report']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    for (const name of ['Edit', 'Delete']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('loads the original over the thumbnail', async () => {
    await open('Quiet Ridge');
    const original = await screen.findByTestId('detail-original');
    expect(original.props.source).toEqual(
      expect.objectContaining({
        uri: expect.stringMatching(/w\/w1\/original\.jpg$/),
      }),
    );
  });

  it('shows my own wallpaper with Download, Edit and Delete only', async () => {
    await open('Half Past');
    expect(await screen.findByText('2,110 likes')).toBeTruthy();
    for (const name of ['Download', 'Edit', 'Delete']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    for (const name of [/^Like/, 'Save', 'Report']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('hides Edit after the first 24 hours', async () => {
    mock.__state.tables.wallpapers[1] = detailRow('w2', ME, {
      created_at: ago(25 * HOUR),
    });
    await open('Half Past');
    expect(await screen.findByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('closes back to the grid', async () => {
    await open('Quiet Ridge');
    await screen.findByRole('header', { name: 'Quiet Ridge' });
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('header', { name: 'Quiet Ridge' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Quiet Ridge' })).toBeTruthy();
  });

  it('opens from the profile grid', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
    const tiles = await screen.findAllByRole('button', { name: 'Half Past' });
    await fireEvent.press(tiles[tiles.length - 1]);
    expect(await screen.findByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('says so when the wallpaper cannot be loaded', async () => {
    mock.__state.tables.wallpapers = [];
    await open('Quiet Ridge');
    expect(
      await screen.findByText(
        "Couldn't load this wallpaper",
        {},
        { timeout: 4000 },
      ),
    ).toBeTruthy();
  });
});

describe('likes', () => {
  const likeButton = (name: RegExp) => screen.findByRole('button', { name });

  it('likes and unlikes with the button, updating the count', async () => {
    await open('Quiet Ridge');
    await fireEvent.press(await likeButton(/^Like, 1,284 likes$/));
    expect(await likeButton(/^Unlike, 1,285 likes$/)).toBeTruthy();
    expect(mock.__state.tables.likes).toEqual([
      { user_id: ME, wallpaper_id: 'w1' },
    ]);

    await fireEvent.press(await likeButton(/^Unlike/));
    expect(await likeButton(/^Like, 1,284 likes$/)).toBeTruthy();
    expect(mock.__state.tables.likes).toEqual([]);
  });

  it('starts liked when the viewer already liked it', async () => {
    mock.__state.tables.wallpapers[0] = detailRow('w1', 'u2', {
      my_like: [{ user_id: ME }],
    });
    await open('Quiet Ridge');
    const button = await likeButton(/^Unlike, 1,284 likes$/);
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('rolls back when the server refuses', async () => {
    mock.__state.onWrite = () => ({
      data: null,
      error: { code: '500', message: 'offline' },
    });
    await open('Quiet Ridge');
    await fireEvent.press(await likeButton(/^Like, 1,284 likes$/));
    expect(await likeButton(/^Like, 1,284 likes$/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Unlike/ })).toBeNull();
  });

  it('a double tap on the image likes, and never unlikes', async () => {
    await open('Quiet Ridge');
    await likeButton(/^Like, 1,284 likes$/);
    const image = screen.getByTestId('detail-image');
    await fireEvent.press(image);
    await fireEvent.press(image);
    expect(await likeButton(/^Unlike, 1,285 likes$/)).toBeTruthy();

    await fireEvent.press(image);
    await fireEvent.press(image);
    expect(await likeButton(/^Unlike, 1,285 likes$/)).toBeTruthy();
    expect(mock.__state.tables.likes).toHaveLength(1);
  });

  it('a double tap on my own wallpaper does nothing', async () => {
    await open('Half Past');
    await screen.findByText('2,110 likes');
    const image = screen.getByTestId('detail-image');
    await fireEvent.press(image);
    await fireEvent.press(image);
    expect(screen.getByText('2,110 likes')).toBeTruthy();
    expect(mock.__state.tables.likes).toBeUndefined();
  });
});

describe('format', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  it.each([
    [30_000, 'just now'],
    [60_000, '1 minute ago'],
    [5 * HOUR, '5 hours ago'],
    [24 * HOUR, '1 day ago'],
    [3 * 24 * HOUR, '3 days ago'],
    [14 * 24 * HOUR, '2 weeks ago'],
    [65 * 24 * HOUR, '2 months ago'],
    [400 * 24 * HOUR, '1 year ago'],
  ])('%i ms ago reads "%s"', (ms, text) => {
    expect(relativeTime(new Date(now - ms).toISOString(), now)).toBe(text);
  });

  it('groups thousands', () => {
    expect([7, 1284, 1234567].map(formatCount)).toEqual([
      '7',
      '1,284',
      '1,234,567',
    ]);
  });
});
