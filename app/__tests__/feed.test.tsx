import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import App from '../src/App';
import { useFeed } from '../src/features/feed/queries';
import { nextCursor } from '../src/lib/keyset';
import { queryClient, queryKeys } from '../src/lib/queryClient';
import { supabase } from '../src/lib/supabase';
import { useRefreshFromStart } from '../src/lib/useRefreshFromStart';
import type { SupabaseMock } from '../testing/mockSupabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: require('../testing/mockSupabase').createSupabaseMock(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

const mock = supabase as unknown as SupabaseMock;

const row = (n: number, author = 'u2') => ({
  id: `w${n}`,
  author_id: author,
  title: `Wallpaper ${n}`,
  thumb_key: `w/w${n}/thumb.webp`,
  width: 1080,
  height: 2340,
  created_at: `2026-11-${String(n).padStart(2, '0')}T00:00:00Z`,
});

beforeEach(() => {
  jest.clearAllMocks();
  mock.__setSession({ access_token: 'jwt', user: { id: 'u1' } });
  mock.__state.tables = {
    profiles: [{ id: 'u1', display_name: 'Maya', avatar_url: null }],
  };
  mock.__state.rpc = { feed: [row(3, 'u1'), row(2), row(1)] };
});

describe('feed', () => {
  it('shows the newest 20 thumbnails, mine included, without counts or text', async () => {
    await render(<App />);
    const tiles = await screen.findAllByRole('button', { name: /Wallpaper/ });
    expect(tiles.map(t => t.props.accessibilityLabel)).toEqual([
      'Wallpaper 3',
      'Wallpaper 2',
      'Wallpaper 1',
    ]);
    expect(screen.queryByText('Wallpaper 3')).toBeNull();
    expect(mock.rpc).toHaveBeenCalledWith('feed', {
      p_categories: null,
      p_cursor: null,
      p_limit: 20,
    });
  });

  it('shows an empty state when nothing is published', async () => {
    mock.__state.rpc.feed = [];
    await render(<App />);
    expect(await screen.findByText('No wallpapers yet')).toBeTruthy();
  });

  it('shows an error with a retry that reloads', async () => {
    let fail = true;
    mock.__state.rpc.feed = () =>
      fail
        ? { data: null, error: new Error('offline') }
        : { data: [row(1)], error: null };
    await render(<App />);
    expect(
      await screen.findByText("Couldn't load the feed", {}, { timeout: 4000 }),
    ).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('button', { name: 'Wallpaper 1' }),
    ).toBeTruthy();
  });
});

describe('pagination', () => {
  it('asks for the page after the last row of a full page', () => {
    const page = Array.from({ length: 20 }, (_, i) => row(20 - i));
    expect(nextCursor(page, 20)).toEqual({
      created_at: '2026-11-01T00:00:00Z',
      id: 'w1',
    });
    expect(nextCursor(page.slice(0, 19), 20)).toBeUndefined();
  });

  it('pull-to-refresh drops loaded pages and reloads from the top', async () => {
    const full = (from: number) =>
      Array.from({ length: 20 }, (_, i) => row(from - i));
    mock.__state.rpc.feed = (args: { p_cursor: unknown }) => ({
      data: args.p_cursor ? full(20) : full(40),
      error: null,
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = await renderHook(
      () => {
        const feed = useFeed();
        // Read in render so React Query's tracked result re-renders on page changes.
        const pages = feed.data?.pages.length ?? 0;
        return { feed, pages, pull: useRefreshFromStart(queryKeys.feed) };
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.feed.isSuccess).toBe(true));
    await act(() => result.current.feed.fetchNextPage());
    await waitFor(() => expect(result.current.pages).toBe(2));

    mock.rpc.mockClear();
    await act(() => result.current.pull.refresh());
    await waitFor(() => expect(result.current.pages).toBe(1));
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc).toHaveBeenCalledWith(
      'feed',
      expect.objectContaining({ p_cursor: null }),
    );
    expect(result.current.pull.refreshing).toBe(false);
  });
});
