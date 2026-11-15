export const en = {
  common: {
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    dismiss: 'Dismiss',
  },
  tabs: {
    feed: 'Feed',
    profile: 'Profile',
  },
  feed: {
    title: 'BackPaper',
  },
  publish: {
    title: 'Publish',
    open: 'Publish a wallpaper',
  },
  profile: {
    title: 'Profile',
    logOut: 'Log out',
  },
  login: {
    title: 'BackPaper',
    tagline:
      'A shared gallery of phone wallpapers to browse, like, save and download.',
    continueWithGoogle: 'Continue with Google',
    signingIn: 'Signing in…',
    signedInOnly: 'The feed is only visible to signed-in users.',
    errors: {
      notConfigured: 'Google sign-in is not configured in this build.',
      playServices: 'Google Play services are required to sign in.',
      failed: "Couldn't sign in. Please try again.",
    },
  },
};

export type Translations = typeof en;
