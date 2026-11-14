import { Image } from 'react-native';
import type { StoryMediaType } from './types';

/**
 * Resolves a URL string, `{ uri }` object, or local `require(...)` numeric asset into a URI string.
 */
export function resolveMediaUri(source: unknown): string | undefined {
  if (typeof source === 'string') {
    const trimmed = source.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof source === 'number') {
    const resolved = Image.resolveAssetSource(source);
    return resolved?.uri;
  }
  if (source && typeof source === 'object' && 'uri' in source) {
    const uri = (source as { uri?: unknown }).uri;
    return typeof uri === 'string' && uri.trim().length > 0
      ? uri.trim()
      : undefined;
  }
  return undefined;
}

/**
 * Resolves an image URL string, `{ uri }` object, or local `require(...)` numeric asset into a URI string.
 */
export const resolveImageUri = resolveMediaUri;

const VIDEO_EXTENSION_REGEX =
  /\.(mp4|mov|m4v|webm|m3u8|mkv|3gp|avi|ts)(?:$|[?#])/i;

/**
 * Infers `'video'` when a URI path ends with a recognized video file extension.
 */
export function inferMediaTypeFromUri(
  uri: unknown
): StoryMediaType | undefined {
  const resolved = resolveMediaUri(uri);
  if (!resolved) return undefined;
  return VIDEO_EXTENSION_REGEX.test(resolved) ? 'video' : undefined;
}

const MEDIA_URI_KEYS = [
  'avatarUri',
  'userUri',
  'imageUri',
  'videoUri',
  'video',
  'posterUri',
  'thumbnailUri',
] as const;

/**
 * Normalizes an arbitrary backend story data object/array for the native Fabric prop,
 * converting local `require(...)` asset IDs on media URI keys (`avatarUri`, `userUri`,
 * `imageUri`, `videoUri`, `video`, `posterUri`, `thumbnailUri`) into resolved URI strings
 * while preserving all other custom backend fields.
 */
export function normalizeNativeStoryData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeNativeStoryData(entry));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(record)) {
      if (
        (MEDIA_URI_KEYS as readonly string[]).includes(key) &&
        fieldValue != null
      ) {
        normalized[key] = resolveMediaUri(fieldValue) ?? fieldValue;
      } else if (
        Array.isArray(fieldValue) ||
        (fieldValue && typeof fieldValue === 'object')
      ) {
        normalized[key] = normalizeNativeStoryData(fieldValue);
      } else {
        normalized[key] = fieldValue;
      }
    }
    return normalized;
  }
  return value;
}
