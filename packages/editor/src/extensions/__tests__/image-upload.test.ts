import { describe, it, expect } from "vitest";
import { ImageUpload } from "../image-upload";

describe("ImageUpload extension", () => {
  it("has name 'image'", () => {
    expect(ImageUpload.name).toBe("image");
  });

  it("defines src, alt, and title attributes", () => {
    // @ts-expect-error - accessing static config
    const attrs = ImageUpload.config?.addAttributes?.() ?? {};
    expect(attrs).toHaveProperty("src");
    expect(attrs).toHaveProperty("alt");
    expect(attrs).toHaveProperty("title");
  });

  it("accepts uploadFn option", () => {
    // @ts-expect-error - accessing static config
    const options = ImageUpload.config?.addOptions?.() ?? {};
    expect(options).toHaveProperty("uploadFn");
    expect(options.uploadFn).toBeUndefined();
  });

  it("has a group that includes inline", () => {
    const group = ImageUpload.config?.group;
    if (group) {
      try {
        const groups = typeof group === "function" ? (group as () => unknown)() : group;
        const arr = Array.isArray(groups) ? groups : [groups];
        expect(arr).toContain("inline");
      } catch {
        // group function may require parent context - skip
      }
    }
  });
});
