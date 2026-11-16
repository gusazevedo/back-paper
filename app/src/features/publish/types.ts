/** An image ready to upload: re-encoded without metadata and checked against the rules. */
export type PickedImage = {
  uri: string;
  mime: UploadMime;
  sizeBytes: number;
  width: number;
  height: number;
  fileName?: string;
};

/** A file as it comes from the gallery or the file picker, before any checks. */
export type SourceFile = {
  uri: string;
  mime: string | null;
  sizeBytes: number | null;
  name: string | null;
};

export type UploadMime = 'image/jpeg' | 'image/png' | 'image/webp';

export const MAX_TITLE = 60;
export const MAX_CATEGORIES = 5;
