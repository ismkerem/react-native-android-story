import { Image } from 'react-native';

/**
 * Resolves a URL string, `{ uri }` object, or local `require(...)` numeric asset into a URI string.
 */
export function resolveImageUri(source: unknown): string | undefined {
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
    return typeof uri === 'string' && uri.trim().length > 0 ? uri : undefined;
  }
  return undefined;
}

const IMAGE_URI_KEYS = ['avatarUri', 'userUri', 'imageUri'] as const;

/**
 * Normalizes an arbitrary backend story data object/array for the native Fabric prop,
 * converting local `require(...)` asset IDs on `avatarUri`, `userUri`, and `imageUri`
 * into resolved URI strings while preserving all other custom backend fields.
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
        (IMAGE_URI_KEYS as readonly string[]).includes(key) &&
        fieldValue != null
      ) {
        normalized[key] = resolveImageUri(fieldValue) ?? fieldValue;
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
