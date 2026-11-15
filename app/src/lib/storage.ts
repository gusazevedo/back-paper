import { env } from '../config/env';

/** Builds the public URL of a stored object. The only place that knows the storage host. */
export function publicUrl(key: string): string {
  return `${env.storagePublicBaseUrl}/${key}`;
}
