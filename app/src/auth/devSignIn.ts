import { env } from '../config/env';
import { supabase } from '../lib/supabase';

const DEV_USER = {
  email: 'dev@backpaper.local',
  password: 'backpaper-dev',
  name: 'Dev User',
};

/**
 * Debug builds only, while Google sign-in is not configured: signs in a fixed
 * email/password user on the local Supabase stack, creating it on first use.
 */
export const devSignInAvailable = __DEV__ && !env.googleWebClientId;

export async function devSignIn(): Promise<void> {
  if (!devSignInAvailable) {
    throw new Error('dev sign-in is disabled');
  }
  const attempt = await supabase.auth.signInWithPassword({
    email: DEV_USER.email,
    password: DEV_USER.password,
  });
  if (!attempt.error) return;
  const { error } = await supabase.auth.signUp({
    email: DEV_USER.email,
    password: DEV_USER.password,
    options: { data: { full_name: DEV_USER.name } },
  });
  if (error) throw error;
}
