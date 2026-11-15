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
    empty: {
      title: 'Choose an image',
      body: 'One image per post.',
    },
    fromGallery: 'From gallery',
    requirements:
      'JPEG, PNG or WebP, up to 15 MB. Portrait, at least 1080 px wide.',
    previewLabel: 'Preview of the selected image',
    replace: 'Replace',
    remove: 'Remove',
    titleLabel: 'Title (optional)',
    categoriesLabel: 'Categories (choose 1 to 5)',
    publish: 'Publish',
    retry: 'Try again',
    sending: 'Publishing…',
    failed:
      "Couldn't publish your wallpaper. Your image and details are still here.",
    done: {
      title: 'Published',
      body: 'Your wallpaper is now in the feed.',
      view: 'View wallpaper',
      another: 'Publish another',
    },
  },
  profile: {
    title: 'Profile',
    logOut: 'Log out',
    settings: 'Settings',
    publishedOne: '1 wallpaper published',
    publishedMany: '{count} wallpapers published',
    emptyPublished: "You haven't published any wallpapers yet.",
  },
  login: {
    title: 'BackPaper',
    tagline:
      'A shared gallery of phone wallpapers to browse, like, save and download.',
    continueWithGoogle: 'Continue with Google',
    signingIn: 'Signing in…',
    signedInOnly: 'The feed is only visible to signed-in users.',
    devSignIn: 'Dev sign-in (local only)',
    errors: {
      notConfigured: 'Google sign-in is not configured in this build.',
      playServices: 'Google Play services are required to sign in.',
      failed: "Couldn't sign in. Please try again.",
    },
  },
};

export type Translations = typeof en;
