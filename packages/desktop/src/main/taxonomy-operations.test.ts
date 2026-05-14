import { describe, expect, it, vi } from "vitest";
import type { HexoPost } from "@hexo-cms/core";
import {
  deletePostTaxonomy,
  deleteTaxonomy,
  renamePostTaxonomy,
  renameTaxonomy,
  summarizeTaxonomies,
} from "./taxonomy-operations";

function post(path: string, frontmatter: HexoPost["frontmatter"]): HexoPost {
  return {
    path,
    title: path,
    date: "2026-05-14",
    content: "",
    frontmatter,
  };
}

describe("desktop taxonomy operations", () => {
  it("summarizes tags and categories from string and array frontmatter", () => {
    expect(summarizeTaxonomies([
      post("a.md", { tags: ["Hexo", "CMS"], category: "Dev" }),
      post("b.md", { tags: "Hexo", categories: ["Dev", "Notes"] }),
      post("c.md", { tags: [], categories: "Notes" }),
    ])).toEqual({
      tags: [
        { id: "1", name: "Hexo", slug: "hexo", count: 2 },
        { id: "2", name: "CMS", slug: "cms", count: 1 },
      ],
      categories: [
        { id: "1", name: "Dev", slug: "dev", count: 2 },
        { id: "2", name: "Notes", slug: "notes", count: 2 },
      ],
      total: 3,
    });
  });

  it("renames tag and category values without mutating unchanged posts", () => {
    const source = post("a.md", { tags: ["Hexo", "CMS"], category: "Dev", categories: "Old" });

    expect(renamePostTaxonomy(source, { type: "tag", oldName: "CMS", newName: "Content" })?.frontmatter)
      .toEqual({ tags: ["Hexo", "Content"], category: "Dev", categories: "Old" });
    expect(renamePostTaxonomy(source, { type: "category", oldName: "Old", newName: "Archive" })?.frontmatter)
      .toEqual({ tags: ["Hexo", "CMS"], category: "Dev", categories: "Archive" });
    expect(renamePostTaxonomy(source, { type: "tag", oldName: "Missing", newName: "Next" })).toBeNull();
    expect(source.frontmatter).toEqual({ tags: ["Hexo", "CMS"], category: "Dev", categories: "Old" });
  });

  it("deletes tag and category values", () => {
    expect(deletePostTaxonomy(post("a.md", { tags: ["Hexo", "CMS"] }), { type: "tag", name: "Hexo" })?.frontmatter)
      .toEqual({ tags: ["CMS"] });
    expect(deletePostTaxonomy(post("b.md", { tags: "Hexo" }), { type: "tag", name: "Hexo" })?.frontmatter)
      .toEqual({ tags: [] });
    expect(deletePostTaxonomy(post("c.md", { category: "Dev", categories: "Notes" }), { type: "category", name: "Dev" })?.frontmatter)
      .toEqual({ categories: "Notes" });
    expect(deletePostTaxonomy(post("d.md", { category: "Dev" }), { type: "category", name: "Missing" })).toBeNull();
  });

  it("persists only changed posts for rename and delete operations", async () => {
    const posts = [
      post("a.md", { tags: ["Hexo", "CMS"] }),
      post("b.md", { tags: "Hexo" }),
      post("c.md", { tags: ["Other"] }),
    ];
    const savePost = vi.fn<(_: HexoPost) => Promise<void>>().mockResolvedValue(undefined);
    const repository = {
      getPosts: vi.fn().mockResolvedValue(posts),
      savePost,
    };

    await expect(renameTaxonomy(repository, { type: "tag", oldName: "Hexo", newName: "Blog" }))
      .resolves.toEqual({ updatedCount: 2 });
    expect(savePost).toHaveBeenCalledTimes(2);
    expect(savePost.mock.calls.map(([saved]) => saved.frontmatter.tags)).toEqual([
      ["Blog", "CMS"],
      "Blog",
    ]);

    savePost.mockClear();
    await expect(deleteTaxonomy(repository, { type: "tag", name: "CMS" })).resolves.toEqual({ updatedCount: 1 });
    expect(savePost).toHaveBeenCalledTimes(1);
    expect(savePost.mock.calls[0][0].frontmatter.tags).toEqual(["Hexo"]);
  });
});
