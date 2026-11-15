import { assertEquals } from 'jsr:@std/assert@1';
import { readImageInfo } from './imageInfo.ts';

const fixture = (name: string) => Deno.readFile(new URL(`./fixtures/${name}`, import.meta.url));

Deno.test('reads JPEG size from the SOF marker', async () => {
  assertEquals(readImageInfo(await fixture('36x64.jpg')), { mime: 'image/jpeg', width: 36, height: 64 });
});

Deno.test('reads PNG size from IHDR', async () => {
  assertEquals(readImageInfo(await fixture('36x64.png')), { mime: 'image/png', width: 36, height: 64 });
});

Deno.test('reads WebP size', async () => {
  assertEquals(readImageInfo(await fixture('720x1280.webp')), {
    mime: 'image/webp',
    width: 720,
    height: 1280,
  });
});

Deno.test('works on just the first 64 KB', async () => {
  const bytes = (await fixture('36x64.jpg')).subarray(0, 65536);
  assertEquals(readImageInfo(bytes)?.width, 36);
});

Deno.test('rejects other formats', () => {
  const gif = new TextEncoder().encode('GIF89a\x01\x00\x01\x00');
  assertEquals(readImageInfo(gif), null);
  assertEquals(readImageInfo(new Uint8Array()), null);
});
