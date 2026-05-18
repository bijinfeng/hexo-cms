import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("editor styles integration", () => {
  it("imports the shared tiptap editor styles", () => {
    const stylesPath = join(process.cwd(), "src/styles.css");
    const styles = readFileSync(stylesPath, "utf8");

    expect(styles).toContain('@import "@hexo-cms/editor/styles";');
  });
});
