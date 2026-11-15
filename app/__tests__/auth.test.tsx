import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import App from '../src/App';
import { supabase } from '../src/lib/supabase';
import type { SupabaseMock } from '../testing/mockSupabase';

jest.mock('../src/config/env', () => ({
  env: {
    supabaseUrl: 'http://test',
    supabaseAnonKey: 'anon',
    googleWebClientId: 'web-client-id',
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
  },
  isCancelledResponse: (r: { type: string }) => r.type === 'cancelled',
  isErrorWithCode: (e: unknown) =>
    typeof e === 'object' && e !== null && 'code' in e,
  statusCodes: {
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PSNA',
  },
}));

jest.mock('../src/lib/supabase', () => ({
  supabase: require('../testing/mockSupabase').createSupabaseMock(),
}));

const mock = supabase as unknown as SupabaseMock;

describe('authentication gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock.__setSession(null);
  });

  it('shows only the login screen without a session', async () => {
    await render(<App />);
    expect(
      await screen.findByRole('button', { name: /Continue with Google/ }),
    ).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Feed' })).toBeNull();
  });

  it('opens the tabs directly when a session is persisted', async () => {
    mock.__setSession({ access_token: 'jwt', user: { id: 'u1' } });
    await render(<App />);
    expect(await screen.findByRole('tab', { name: 'Feed' })).toBeTruthy();
  });

  it('exchanges the Google ID token for a Supabase session', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    await render(<App />);
    await fireEvent.press(
      await screen.findByRole('button', { name: /Continue with Google/ }),
    );
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
    });
    expect(await screen.findByRole('tab', { name: 'Feed' })).toBeTruthy();
  });

  it('stays on login when the user cancels the Google dialog', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'cancelled',
      data: null,
    });
    await render(<App />);
    await fireEvent.press(
      await screen.findByRole('button', { name: /Continue with Google/ }),
    );
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows an error when Supabase rejects the token', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: 'success',
      data: { idToken: 'bad' },
    });
    (supabase.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({
      error: new Error('invalid'),
    });
    await render(<App />);
    await fireEvent.press(
      await screen.findByRole('button', { name: /Continue with Google/ }),
    );
    expect(
      await screen.findByText("Couldn't sign in. Please try again."),
    ).toBeTruthy();
  });

  it('log out clears Google and Supabase and returns to login', async () => {
    mock.__setSession({ access_token: 'jwt', user: { id: 'u1' } });
    await render(<App />);
    await fireEvent.press(await screen.findByRole('tab', { name: 'Profile' }));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Settings' }),
    );
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Log out' }),
    );
    await waitFor(() => expect(GoogleSignin.signOut).toHaveBeenCalled());
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(
      await screen.findByRole('button', { name: /Continue with Google/ }),
    ).toBeTruthy();
  });
});
