import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

export function readJsonFile<T>(filePath: string, fallback: () => T): T {
  if (!existsSync(filePath)) return fallback();

  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return fallback();
  }
}

export function writeJsonFile(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2));
}

export function createJsonFileStore<T>(filePath: () => string, fallback: () => T) {
  return {
    load: () => readJsonFile(filePath(), fallback),
    save: (value: T) => writeJsonFile(filePath(), value),
  };
}
