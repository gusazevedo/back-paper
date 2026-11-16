import { assertEquals } from 'jsr:@std/assert@1';
import { checkImageRules, MAX_BYTES } from './uploads.ts';

const jpeg = (width: number, height: number) => ({ mime: 'image/jpeg', width, height });

Deno.test('accepts a portrait image that meets every rule', () => {
  assertEquals(checkImageRules(jpeg(1080, 1620), 1000), null);
  assertEquals(checkImageRules(jpeg(1440, 3200), MAX_BYTES), null);
});

Deno.test('rejects unknown or unreadable formats', () => {
  assertEquals(checkImageRules(null, 1000), 'unsupported_format');
  assertEquals(checkImageRules({ mime: 'image/gif', width: 1080, height: 1920 }, 1000), 'unsupported_format');
});

Deno.test('rejects originals over 15 MB', () => {
  assertEquals(checkImageRules(jpeg(1080, 1920), MAX_BYTES + 1), 'file_too_large');
});

Deno.test('rejects a shorter side under 1080 px', () => {
  assertEquals(checkImageRules(jpeg(720, 1280), 1000), 'resolution_too_low');
});

Deno.test('rejects images that are not tall enough', () => {
  assertEquals(checkImageRules(jpeg(1920, 1080), 1000), 'not_portrait');
  assertEquals(checkImageRules(jpeg(1080, 1619), 1000), 'not_portrait');
});
