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
    fromFiles: 'From files',
    requirements:
      'JPEG, PNG or WebP, up to 15 MB. Portrait, at least 1080 px wide.',
    checking: 'Checking image…',
    postsLeftOne: '1 post left today',
    postsLeftMany: '{count} posts left today',
    limit: {
      title: "You've reached today's limit",
      body: 'You can publish up to {limit} wallpapers every 24 hours. Wallpapers you deleted count too.',
      nextOne: 'You can publish again in about 1 hour.',
      nextMany: 'You can publish again in about {hours} hours.',
    },
    rejected: {
      chooseAnother: 'Choose another image',
      unnamed: 'Selected image',
      fileSize: '{name} · {size} MB',
      fileDimensions: '{name} · {width} × {height} px',
      unsupported_format: {
        title: 'Unsupported format',
        detail: 'Use a JPEG, PNG or WebP image.',
      },
      file_too_large: {
        title: 'File is too large',
        detail: 'The limit is 15 MB.',
      },
      resolution_too_low: {
        title: 'Resolution is too low',
        detail: 'The shorter side must be at least 1080 px.',
      },
      not_portrait: {
        title: 'This image is not portrait',
        detail: 'It must be tall, with a height of at least 1.5× the width.',
      },
      unreadable: {
        title: "Couldn't read this image",
        detail: 'Try another file. HEIC photos need Android 9 or newer.',
      },
    },
    replaceSheet: {
      title: 'Replace image',
      body: 'Your title and categories stay as they are.',
    },
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
