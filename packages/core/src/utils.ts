export const GITHUB_API_VERSION = "2022-11-28";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function assertNonEmptyString(value: string, name: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} must be a non-empty string`);
  }
}

export function parseYamlScalar(yaml: string, key: string): string | null {
  const match = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

export function setYamlScalar(yaml: string, key: string, value: string): string {
  const pattern = new RegExp(`^(${key}:\\s*)(.+)$`, "m");
  if (pattern.test(yaml)) return yaml.replace(pattern, `$1${value}`);
  return `${yaml.trimEnd()}\n${key}: ${value}\n`;
}
