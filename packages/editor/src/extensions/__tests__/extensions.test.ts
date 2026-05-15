import { describe, it, expect } from "vitest";
import { getBuiltinExtensions } from "../index";

describe("getBuiltinExtensions", () => {
  it("returns an array of valid TipTap extension objects", () => {
    const extensions = getBuiltinExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
    extensions.forEach((ext) => {
      expect(ext).toHaveProperty("type");
      expect(ext).toHaveProperty("name");
      expect(typeof ext.name).toBe("string");
    });
  });

  it("includes the Markdown extension for markdown support", () => {
    const extensions = getBuiltinExtensions();
    const markdownExt = extensions.find((e) => e.name === "markdown");
    expect(markdownExt).toBeDefined();
  });

  it("includes key content extensions", () => {
    const extensions = getBuiltinExtensions();
    const names = extensions.map((e) => e.name);
    expect(names).toContain("starterKit");
    expect(names).toContain("markdown");
    expect(names).toContain("table");
    expect(names).toContain("tableRow");
    expect(names).toContain("tableCell");
    expect(names).toContain("tableHeader");
    expect(names).toContain("taskList");
    expect(names).toContain("taskItem");
    expect(names).toContain("link");
    expect(names).toContain("placeholder");
    expect(names).toContain("image");
  });
});
