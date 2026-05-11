const SENSITIVE_KEY_PATTERN = /(token|api[-_ ]?key|password|secret|cookie)/i;

export function redactPluginRuntimeText(value: string): string {
  return value
    .replace(/\b(token|api[-_ ]?key|password|secret|cookie)=([^\s"'`]+)/gi, "$1=[redacted]")
    .replace(/[A-Za-z]:\\(?:[^\\\s"'`]+\\)*[^\\\s"'`]+/g, "[redacted-path]")
    .replace(/\/(?:Users|home)\/[^\s"'`]+/g, "[redacted-path]");
}

export function redactPluginRuntimeValue(value: unknown, key?: string): unknown {
  return redactValue(value, key, new WeakSet<object>(), 0);
}

function redactValue(value: unknown, key: string | undefined, seen: WeakSet<object>, depth: number): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) return "[redacted]";
  if (typeof value === "string") return redactPluginRuntimeText(value);
  if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "undefined") {
    return value;
  }
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    return String(value);
  }
  if (depth >= 5) return "[truncated]";

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactPluginRuntimeText(value.message),
      stack: value.stack ? redactPluginRuntimeText(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    return value.map((item) => redactValue(item, undefined, seen, depth + 1));
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        redactValue(entryValue, entryKey, seen, depth + 1),
      ]),
    );
  }

  return value;
}
