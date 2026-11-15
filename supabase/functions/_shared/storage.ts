import { AwsClient } from 'npm:aws4fetch@1.0.20';

/**
 * Object storage over the S3 protocol: Cloudflare R2 in production, the local
 * Supabase Storage S3 endpoint in development. Keys only, no provider specifics.
 *
 * STORAGE_S3_ENDPOINT         endpoint this function talks to
 * STORAGE_S3_PUBLIC_ENDPOINT  endpoint the phone uploads to (presigned URLs); defaults to the above
 */
function config() {
  const need = (name: string) => {
    const v = Deno.env.get(name);
    if (!v) throw new Error(`missing env ${name}`);
    return v;
  };
  const endpoint = need('STORAGE_S3_ENDPOINT').replace(/\/$/, '');
  return {
    endpoint,
    publicEndpoint: (Deno.env.get('STORAGE_S3_PUBLIC_ENDPOINT') || endpoint).replace(/\/$/, ''),
    bucket: need('STORAGE_BUCKET'),
    client: new AwsClient({
      accessKeyId: need('STORAGE_S3_ACCESS_KEY_ID'),
      secretAccessKey: need('STORAGE_S3_SECRET_ACCESS_KEY'),
      region: Deno.env.get('STORAGE_S3_REGION') || 'auto',
      service: 's3',
    }),
  };
}

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

function objectUrl(key: string, base?: string) {
  const c = config();
  return `${base ?? c.endpoint}/${c.bucket}/${encodeKey(key)}`;
}

/** Presigned PUT the app uses to upload straight to storage. */
export async function presignPut(key: string, contentType: string, expiresSeconds = 600) {
  const c = config();
  const url = new URL(objectUrl(key, c.publicEndpoint));
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds));
  const signed = await c.client.sign(url.toString(), {
    method: 'PUT',
    headers: { 'content-type': contentType },
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function headObject(key: string): Promise<{ size: number } | null> {
  const res = await config().client.fetch(objectUrl(key), { method: 'HEAD' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HEAD ${key} failed: ${res.status}`);
  return { size: Number(res.headers.get('content-length') ?? 0) };
}

/** First `length` bytes of an object (enough to read an image header). */
export async function readHead(key: string, length = 65536): Promise<Uint8Array> {
  const res = await config().client.fetch(objectUrl(key), {
    headers: { range: `bytes=0-${length - 1}` },
  });
  if (!res.ok) throw new Error(`GET ${key} failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function copyObject(from: string, to: string) {
  const c = config();
  const res = await c.client.fetch(objectUrl(to), {
    method: 'PUT',
    headers: { 'x-amz-copy-source': `/${c.bucket}/${encodeKey(from)}` },
  });
  if (!res.ok) throw new Error(`COPY ${from} -> ${to} failed: ${res.status} ${await res.text()}`);
}

export async function deleteObjects(keys: string[]) {
  await Promise.all(
    keys.map(async (key) => {
      const res = await config().client.fetch(objectUrl(key), { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error(`DELETE ${key} failed: ${res.status}`);
      }
    }),
  );
}
