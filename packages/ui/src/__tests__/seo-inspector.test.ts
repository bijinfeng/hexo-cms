import { describe, expect, it } from "vitest";
import { checkPostSeo } from "../plugin/diagnostics/seo-inspector";
import type { HexoPost } from "@hexo-cms/core";

function createPost(overrides: Partial<HexoPost> = {}): HexoPost {
  return {
    path: "test.md",
    title: "这是一个测试文章的标题内容",
    date: "2026-05-12",
    content: "body",
    frontmatter: {
      title: "这是一个测试文章的标题内容",
      slug: "test-post",
      excerpt: "这是文章摘要",
      categories: ["技术"],
    },
    ...overrides,
  };
}

describe("SEO Inspector diagnostics", () => {
  it("returns no issues for a well-formed post", () => {
    const issues = checkPostSeo(createPost(), {});
    expect(issues).toEqual([]);
  });

  it("flags missing titles as errors", () => {
    const issues = checkPostSeo(createPost({ title: "" }), {});
    const titleIssue = issues.find((i) => i.id === "seo.title.missing");
    expect(titleIssue).toBeDefined();
    expect(titleIssue?.severity).toBe("error");
  });

  it("flags titles shorter than the configured minimum", () => {
    const issues = checkPostSeo(createPost({ title: "短" }), { minTitleLength: "10" });
    const tooShort = issues.find((i) => i.id === "seo.title.too-short");
    expect(tooShort?.severity).toBe("warn");
  });

  it("flags titles longer than the configured maximum", () => {
    const issues = checkPostSeo(
      createPost({ title: "a".repeat(80) }),
      { maxTitleLength: "60" },
    );
    const tooLong = issues.find((i) => i.id === "seo.title.too-long");
    expect(tooLong?.severity).toBe("warn");
  });

  it("flags missing excerpt when required", () => {
    const issues = checkPostSeo(
      createPost({ frontmatter: { title: "这是一个测试文章的标题内容", slug: "test", categories: ["技术"] } }),
      { requireExcerpt: true },
    );
    expect(issues.some((i) => i.id === "seo.excerpt.missing")).toBe(true);
  });

  it("skips excerpt check when disabled", () => {
    const issues = checkPostSeo(
      createPost({ frontmatter: { title: "这是一个测试文章的标题内容", slug: "test", categories: ["技术"] } }),
      { requireExcerpt: false },
    );
    expect(issues.some((i) => i.id === "seo.excerpt.missing")).toBe(false);
  });

  it("flags missing categories when required", () => {
    const issues = checkPostSeo(
      createPost({ frontmatter: { title: "这是一个测试文章的标题内容", slug: "test", excerpt: "摘要" } }),
      { requireCategories: true },
    );
    expect(issues.some((i) => i.id === "seo.categories.missing")).toBe(true);
  });

  it("flags missing slug", () => {
    const issues = checkPostSeo(
      createPost({ frontmatter: { title: "这是一个测试文章的标题内容", excerpt: "摘要", categories: ["技术"] } }),
      {},
    );
    expect(issues.some((i) => i.id === "seo.slug.missing")).toBe(true);
  });
});
