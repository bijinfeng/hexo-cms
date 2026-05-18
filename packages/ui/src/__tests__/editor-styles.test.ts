import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("editor styles integration", () => {
  it("imports the shared tiptap editor styles", () => {
    const stylesPath = join(process.cwd(), "src/styles.css");
    const styles = readFileSync(stylesPath, "utf8");

    expect(styles).toContain('@import "@hexo-cms/editor/styles";');
  });

  it("editor package styles include syntax highlight token colors", () => {
    const stylesPath = join(process.cwd(), "../editor/src/styles/editor.css");
    const styles = readFileSync(stylesPath, "utf8");

    expect(styles).toContain(".hljs-keyword");
    expect(styles).toContain(".hljs-string");
    expect(styles).toContain(".hljs-comment");
    expect(styles).toContain("background: #1e1e1e");
    expect(styles).toContain("color: #d4d4d4");
  });
});
