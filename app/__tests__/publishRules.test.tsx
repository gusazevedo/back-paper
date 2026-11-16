import ImageResizer from '@bam.tech/react-native-image-resizer';
import { pick } from '@react-native-documents/picker';
import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../src/App';
import { queryClient } from '../src/lib/queryClient';
import { supabase } from '../src/lib/supabase';
import type { SupabaseMock } from '../testing/mockSupabase';
import { encodeAs } from '../testing/resizer';

jest.mock('../src/lib/supabase', () => ({
  supabase: require('../testing/mockSupabase').createSupabaseMock(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

const mock = supabase as unknown as SupabaseMock;
const resize = ImageResizer.createResizedImage as jest.Mock;

const quota = (remaining: number, nextAt: string | null = null) => [
  { lim: 10, used: 10 - remaining, remaining, next_at: nextAt },
];

const file = (over: Partial<Record<string, unknown>> = {}) => ({
  uri: 'content://docs/IMG_0042.HEIC',
  name: 'IMG_0042.HEIC',
  type: 'image/heic',
  size: 3_000_000,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  mock.__setSession({ access_token: 'jwt', user: { id: 'u1' } });
  mock.__state.tables = {
    profiles: [{ id: 'u1', display_name: 'Maya', avatar_url: null }],
    categories: [{ slug: 'nature', label: 'Nature' }],
  };
  mock.__state.rpc = { my_publish_quota: quota(10) };
  mock.__state.functions = {
    'request-upload': () => ({
      data: {
        upload_id: 'up-1',
        original: { url: 'https://s3/o', content_type: 'image/jpeg' },
        thumb: { url: 'https://s3/t', content_type: 'image/webp' },
      },
      error: null,
    }),
    'publish-wallpaper': () => ({
      data: { id: 'w1', thumb_key: 'w/w1/thumb.webp', original_key: 'k' },
      error: null,
    }),
  };
  encodeAs({ width: 1170, height: 2532, size: 2_400_000 });
});

async function openPublish() {
  await render(<App />);
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Publish a wallpaper' }),
  );
}

async function pickFile(f: ReturnType<typeof file>) {
  (pick as jest.Mock).mockResolvedValue([f]);
  await fireEvent.press(
    await screen.findByRole('button', { name: 'From files' }),
  );
}

describe('choosing a file', () => {
  it('converts HEIC to JPEG without metadata and publishes it', async () => {
    await openPublish();
    await pickFile(file());
    await screen.findByLabelText('Preview of the selected image');

    expect(resize).toHaveBeenCalledWith(
      'content://docs/IMG_0042.HEIC',
      expect.any(Number),
      expect.any(Number),
      'JPEG',
      expect.any(Number),
      0,
      null,
      false,
      expect.objectContaining({ onlyScaleDown: true }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Nature' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Publish' }));
    await screen.findByText('Your wallpaper is now in the feed.');
    expect(mock.functions.invoke).toHaveBeenCalledWith('request-upload', {
      body: { mime: 'image/jpeg', size_bytes: 2_400_000 },
    });
  });

  it('does nothing when the picker is cancelled', async () => {
    await openPublish();
    (pick as jest.Mock).mockRejectedValue({ code: 'OPERATION_CANCELED' });
    await fireEvent.press(
      await screen.findByRole('button', { name: 'From files' }),
    );
    expect(await screen.findByText('Choose an image')).toBeTruthy();
    expect(resize).not.toHaveBeenCalled();
  });
});

describe('rejected images', () => {
  it('refuses other formats without decoding them', async () => {
    await openPublish();
    await pickFile(file({ name: 'lake-loop.gif', type: 'image/gif' }));
    expect(await screen.findByText('Unsupported format')).toBeTruthy();
    expect(screen.getByText('Use a JPEG, PNG or WebP image.')).toBeTruthy();
    expect(screen.getByText('lake-loop.gif')).toBeTruthy();
    expect(resize).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('refuses files over 15 MB', async () => {
    await openPublish();
    await pickFile(
      file({ name: 'harbor-full.png', type: 'image/png', size: 23_488_102 }),
    );
    expect(await screen.findByText('File is too large')).toBeTruthy();
    expect(screen.getByText('harbor-full.png · 22.4 MB')).toBeTruthy();
  });

  it('refuses a shorter side under 1080 px', async () => {
    encodeAs({ width: 720, height: 1280, size: 300_000 });
    await openPublish();
    await pickFile(file({ name: 'old-phone.jpg', type: 'image/jpeg' }));
    expect(await screen.findByText('Resolution is too low')).toBeTruthy();
    expect(screen.getByText('old-phone.jpg · 720 × 1280 px')).toBeTruthy();
  });

  it('refuses images that are not portrait', async () => {
    encodeAs({ width: 1920, height: 1080, size: 900_000 });
    await openPublish();
    await pickFile(file({ name: 'skyline-wide.jpg', type: 'image/jpeg' }));
    expect(await screen.findByText('This image is not portrait')).toBeTruthy();
    expect(
      screen.getByText(
        'It must be tall, with a height of at least 1.5× the width.',
      ),
    ).toBeTruthy();
  });

  it('reports images the device cannot decode', async () => {
    resize.mockRejectedValue(new Error('Unable to load source image'));
    await openPublish();
    await pickFile(file());
    expect(await screen.findByText("Couldn't read this image")).toBeTruthy();
  });

  it('offers gallery or files to choose another image', async () => {
    await openPublish();
    await pickFile(file({ name: 'clip.gif', type: 'image/gif' }));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Choose another image' }),
    );
    expect(await screen.findByText('Replace image')).toBeTruthy();
    expect(
      screen.getByText('Your title and categories stay as they are.'),
    ).toBeTruthy();
  });
});

describe('daily limit', () => {
  it('shows how many posts are left when the limit is close', async () => {
    mock.__state.rpc.my_publish_quota = quota(2);
    await openPublish();
    expect(await screen.findByText('2 posts left today')).toBeTruthy();
  });

  it('hides the notice while plenty are left', async () => {
    await openPublish();
    await screen.findByText('Choose an image');
    expect(screen.queryByText(/left today/)).toBeNull();
  });

  it('blocks publishing once the limit is reached', async () => {
    const inFiveHours = new Date(Date.now() + 4.5 * 3_600_000).toISOString();
    mock.__state.rpc.my_publish_quota = quota(0, inFiveHours);
    await openPublish();
    expect(
      await screen.findByText("You've reached today's limit"),
    ).toBeTruthy();
    expect(
      screen.getByText('You can publish again in about 5 hours.'),
    ).toBeTruthy();
    expect(screen.queryByText('Choose an image')).toBeNull();
  });

  it('switches to the limit panel when the server refuses', async () => {
    mock.__state.functions['publish-wallpaper'] = () => {
      mock.__state.rpc.my_publish_quota = quota(
        0,
        new Date(Date.now() + 3_600_000).toISOString(),
      );
      return {
        data: null,
        error: Object.assign(new Error('limit'), {
          context: {
            json: async () => ({ error: { code: 'publish_limit_reached' } }),
          },
        }),
      };
    };
    await openPublish();
    await pickFile(file());
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Nature' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByText("You've reached today's limit"),
    ).toBeTruthy();
    expect(
      screen.getByText('You can publish again in about 1 hour.'),
    ).toBeTruthy();
  });
});
