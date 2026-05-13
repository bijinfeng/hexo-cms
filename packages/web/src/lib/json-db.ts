export type JsonColumnParseResult<T> =
  | { ok: true; value: T }
  | { ok: false };

export function tryParseJsonColumn<T>(value: string | null | undefined): JsonColumnParseResult<T> {
  if (!value) return { ok: false };

  try {
    return { ok: true, value: JSON.parse(value) as T };
  } catch {
    return { ok: false };
  }
}

export function parseJsonColumn<T>(value: string | null | undefined, fallback: T): T {
  const result = tryParseJsonColumn<T>(value);
  return result.ok ? result.value : fallback;
}

export function stringifyJsonColumn(value: unknown): string {
  return JSON.stringify(value);
}
