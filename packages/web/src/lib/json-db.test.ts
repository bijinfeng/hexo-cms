import { describe, expect, it } from "vitest";
import { parseJsonColumn, stringifyJsonColumn, tryParseJsonColumn } from "./json-db";

describe("json-db helpers", () => {
  it("parses valid JSON columns and falls back for missing or invalid values", () => {
    expect(parseJsonColumn('{"enabled":true}', {})).toEqual({ enabled: true });
    expect(parseJsonColumn("{bad-json", { fallback: true })).toEqual({ fallback: true });
    expect(parseJsonColumn(null, [])).toEqual([]);
  });

  it("reports parse success separately when callers need to skip bad rows", () => {
    expect(tryParseJsonColumn("null")).toEqual({ ok: true, value: null });
    expect(tryParseJsonColumn("{bad-json")).toEqual({ ok: false });
  });

  it("serializes JSON columns consistently", () => {
    expect(stringifyJsonColumn({ count: 2 })).toBe('{"count":2}');
  });
});
