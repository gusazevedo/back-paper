import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { env } from '../config/env';
import { supabase } from '../lib/supabase';

export type SignInResult = 'signed-in' | 'cancelled';

export class AuthError extends Error {
  constructor(
    public readonly kind: 'not-configured' | 'play-services' | 'failed',
    cause?: unknown,
  ) {
    super(kind);
    this.cause = cause;
  }
}

let configured = false;

function ensureConfigured() {
  if (!env.googleWebClientId) {
    throw new AuthError('not-configured');
  }
  if (!configured) {
    GoogleSignin.configure({ webClientId: env.googleWebClientId });
    configured = true;
  }
}

/** R-AUTH-1: Google is the only sign-in method. The ID token is exchanged for a Supabase session. */
export async function signInWithGoogle(): Promise<SignInResult> {
  ensureConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) {
      return 'cancelled';
    }
    const idToken = response.data.idToken;
    if (!idToken) {
      throw new AuthError('failed', new Error('Google returned no ID token'));
    }
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) {
      throw new AuthError('failed', error);
    }
    return 'signed-in';
  } catch (e) {
    if (e instanceof AuthError) {
      throw e;
    }
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS) {
        return 'cancelled';
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new AuthError('play-services', e);
      }
    }
    throw new AuthError('failed', e);
  }
}

/** Clears both the Google and the Supabase session. */
export async function signOut(): Promise<void> {
  if (env.googleWebClientId) {
    ensureConfigured();
    await GoogleSignin.signOut().catch(() => undefined);
  }
  await supabase.auth.signOut();
}
