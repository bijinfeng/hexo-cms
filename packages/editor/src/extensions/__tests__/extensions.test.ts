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
    expect(names).toContain("codeBlock");
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

  it("uses lowlight for syntax highlighted code blocks", () => {
    const extensions = getBuiltinExtensions();
    const codeBlockExt = extensions.find((e) => e.name === "codeBlock");

    expect(codeBlockExt).toBeDefined();
    expect(codeBlockExt?.options.lowlight).toBeDefined();
    expect(codeBlockExt?.options.lowlight.listLanguages()).toContain("typescript");
    expect(codeBlockExt?.options.defaultLanguage).toBe("javascript");
    expect(
      codeBlockExt?.options.lowlight
        .highlight("javascript", "function hello() { return true; }")
        .children.some((node: { properties?: { className?: string[] } }) =>
          node.properties?.className?.some((className) => className.startsWith("hljs-")),
        ),
    ).toBe(true);
  });
});
