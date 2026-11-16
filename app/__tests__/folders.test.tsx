import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import App from '../src/App';
import { folderNameProblem } from '../src/features/folders/queries';
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

type Row = Record<string, unknown>;
const rows = (table: string) => (mock.__state.tables[table] ?? []) as Row[];

const gridRow = (id: string, title: string, author = 'u2') => ({
  id,
  author_id: author,
  title,
  thumb_key: `w/${id}/thumb.webp`,
  width: 1080,
  height: 2340,
  created_at: ago(HOUR),
});

const detailRow = (id: string, title: string, author = 'u2') => ({
  ...gridRow(id, title, author),
  original_key: `w/${id}/original.jpg`,
  like_count: 3,
  author: { display_name: 'Yuki Mori', avatar_url: null },
  wallpaper_categories: [],
  my_like: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  mock.__state.onWrite = null;
  mock.__setSession({ access_token: 'jwt', user: { id: ME } });
  mock.__state.tables = {
    profiles: [{ id: ME, display_name: 'Maya', avatar_url: null }],
    categories: [],
    wallpapers: [
      detailRow('w1', 'Quiet Ridge'),
      detailRow('w2', 'Half Past'),
      detailRow('w3', 'Mine', ME),
    ],
    folders: [
      { id: 'f1', owner_id: ME, name: 'Favorites' },
      { id: 'f2', owner_id: ME, name: 'Lock screen' },
    ],
    folder_items: [
      { folder_id: 'f1', wallpaper_id: 'w2' },
      { folder_id: 'f2', wallpaper_id: 'w1' },
    ],
  };
  // Computed from the tables, like the real RPCs, so writes show up on refetch.
  mock.__state.rpc = {
    feed: [gridRow('w1', 'Quiet Ridge'), gridRow('w2', 'Half Past')],
    user_wallpapers: [gridRow('w3', 'Mine', ME)],
    my_publish_quota: [{ lim: 10, used: 0, remaining: 10, next_at: null }],
    my_folders: () => ({
      data: rows('folders').map(f => {
        const items = rows('folder_items').filter(i => i.folder_id === f.id);
        const last = items[items.length - 1];
        return {
          id: f.id,
          name: f.name,
          item_count: items.length,
          cover_thumb_key: last ? `w/${last.wallpaper_id}/thumb.webp` : null,
          created_at: ago(HOUR),
        };
      }),
      error: null,
    }),
    folder_wallpapers: (args: { p_folder_id: string }) => ({
      data: rows('folder_items')
        .filter(i => i.folder_id === args.p_folder_id)
        .reverse()
        .map(i => ({
          ...gridRow(
            i.wallpaper_id as string,
            rows('wallpapers').find(w => w.id === i.wallpaper_id)
              ?.title as string,
          ),
          added_at: ago(HOUR),
        })),
      error: null,
    }),
  };
});

const openDetail = async (title: string) => {
  await render(<App />);
  await fireEvent.press(await screen.findByRole('button', { name: title }));
  await screen.findByRole('header', { name: title });
};

const openSaveSheet = async () => {
  await fireEvent.press(await screen.findByRole('button', { name: 'Save' }));
  return screen.findByRole('header', { name: 'Save to folder' });
};

describe('save to folder', () => {
  it('lists my folders with a check on those holding the wallpaper', async () => {
    await openDetail('Quiet Ridge');
    // w1 is in Lock screen, so the button already reads Saved.
    await fireEvent.press(await screen.findByRole('button', { name: 'Saved' }));
    expect(
      await screen.findByRole('checkbox', {
        name: 'Lock screen',
        checked: true,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('checkbox', { name: 'Favorites', checked: false }),
    ).toBeTruthy();
  });

  it('a tap adds the wallpaper to a folder and another removes it', async () => {
    await openDetail('Half Past');
    await fireEvent.press(await screen.findByRole('button', { name: 'Saved' }));
    await fireEvent.press(
      await screen.findByRole('checkbox', { name: 'Lock screen' }),
    );
    expect(
      await screen.findByRole('checkbox', { name: 'Lock screen', checked: true }),
    ).toBeTruthy();
    expect(rows('folder_items')).toContainEqual({
      folder_id: 'f2',
      wallpaper_id: 'w2',
    });

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Favorites' }));
    await fireEvent.press(
      screen.getByRole('checkbox', { name: 'Lock screen' }),
    );
    await waitFor(() =>
      expect(rows('folder_items').filter(i => i.wallpaper_id === 'w2')).toEqual(
        [],
      ),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('rolls the check back when the server refuses', async () => {
    mock.__state.onWrite = () => ({
      data: null,
      error: { code: 'BP403', message: 'nope' },
    });
    await openDetail('Half Past');
    await fireEvent.press(await screen.findByRole('button', { name: 'Saved' }));
    await fireEvent.press(
      await screen.findByRole('checkbox', { name: 'Favorites' }),
    );
    expect(
      await screen.findByRole('checkbox', { name: 'Favorites', checked: true }),
    ).toBeTruthy();
  });

  it('"New folder" creates the folder and saves the wallpaper in it', async () => {
    mock.__state.tables.folder_items = [];
    await openDetail('Quiet Ridge');
    await openSaveSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'New folder' }));
    const create = await screen.findByRole('button', {
      name: 'Create and save',
    });
    expect(create).toBeDisabled();

    const field = screen.getByLabelText('Folder name');
    await fireEvent.changeText(field, ' favorites ');
    expect(
      screen.getByText('You already have a folder with this name.'),
    ).toBeTruthy();
    expect(create).toBeDisabled();

    await fireEvent.changeText(field, '  Home screen ');
    await fireEvent.press(create);
    expect(
      await screen.findByRole('checkbox', {
        name: 'Home screen',
        checked: true,
      }),
    ).toBeTruthy();
    expect(rows('folders')).toContainEqual({
      id: 'folders-3',
      owner_id: ME,
      name: 'Home screen',
    });
    expect(rows('folder_items')).toEqual([
      { folder_id: 'folders-3', wallpaper_id: 'w1' },
    ]);
  });

  it('keeps the name sheet open when the server says the name is taken', async () => {
    mock.__state.onWrite = table =>
      table === 'folders'
        ? { data: null, error: { code: '23505', message: 'dup' } }
        : undefined;
    mock.__state.tables.folder_items = [];
    await openDetail('Quiet Ridge');
    await openSaveSheet();
    await fireEvent.press(screen.getByRole('button', { name: 'New folder' }));
    await fireEvent.changeText(
      await screen.findByLabelText('Folder name'),
      'Phone',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Create and save' }),
    );
    expect(
      await screen.findByText('You already have a folder with this name.'),
    ).toBeTruthy();
  });

  it('is not offered on my own wallpapers', async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Mine' }));
    await screen.findByRole('button', { name: 'Delete' });
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});

describe('folders in the profile', () => {
  const openFolders = async () => {
    await render(<App />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
    await fireEvent.press(await screen.findByRole('tab', { name: 'Folders' }));
  };

  it('lists my folders with name and count, privately', async () => {
    await openFolders();
    expect(
      await screen.findByRole('button', { name: 'Favorites, 1 wallpaper' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Lock screen, 1 wallpaper' }),
    ).toBeTruthy();
    expect(screen.getByText('Only you can see your folders.')).toBeTruthy();
  });

  it('opens a folder and its wallpapers open the detail', async () => {
    await openFolders();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Favorites, 1 wallpaper' }),
    );
    expect(
      await screen.findByRole('header', { name: 'Favorites' }),
    ).toBeTruthy();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Half Past' }),
    );
    expect(
      await screen.findByRole('header', { name: 'Half Past' }),
    ).toBeTruthy();
  });

  it('says when a folder is empty', async () => {
    mock.__state.tables.folder_items = [];
    await openFolders();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Favorites, 0 wallpapers' }),
    );
    expect(await screen.findByText('This folder is empty')).toBeTruthy();
  });
});

describe('folder names', () => {
  it('must be non-empty and unique whatever the case', () => {
    expect(folderNameProblem('   ', [])).toBe('empty');
    expect(folderNameProblem(' LOCK screen ', ['Lock screen'])).toBe('taken');
    expect(folderNameProblem('Home', ['Lock screen'])).toBeNull();
  });
});
