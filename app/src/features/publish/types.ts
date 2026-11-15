export type PickedImage = {
  uri: string;
  mime: string;
  sizeBytes: number;
  width: number;
  height: number;
  fileName?: string;
};

export const MAX_TITLE = 60;
export const MAX_CATEGORIES = 5;
