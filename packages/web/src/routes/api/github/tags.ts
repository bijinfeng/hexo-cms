import { createFileRoute } from "@tanstack/react-router";
import type { Frontmatter, HexoPost } from "@hexo-cms/core";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

type TaxonomyType = "tag" | "category";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}

function addValues(map: Map<string, number>, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === "string" && item.trim()) map.set(item, (map.get(item) ?? 0) + 1);
    });
    return;
  }

  if (typeof value === "string" && value.trim()) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
}

function toItems(map: Map<string, number>) {
  return Array.from(map.entries())
    .map(([name, count], index) => ({ id: String(index + 1), name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function replaceValue(value: unknown, oldName: string, newName: string): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      if (item === oldName) {
        changed = true;
        return newName;
      }
      return item;
    });
    return { value: next, changed };
  }

  if (value === oldName) return { value: newName, changed: true };
  return { value, changed: false };
}

function removeValue(value: unknown, name: string): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    const next = value.filter((item) => item !== name);
    return { value: next, changed: next.length !== value.length };
  }

  if (value === name) return { value: undefined, changed: true };
  return { value, changed: false };
}

function mergeValues(value: unknown, sourceName: string, targetName: string): { value: unknown; changed: boolean } {
  if (Array.isArray(value)) {
    let changed = false;
    const filtered = value.filter((item) => {
      if (item === sourceName) { changed = true; return false; }
      return true;
    });
    if (changed && !filtered.includes(targetName)) {
      filtered.push(targetName);
    }
    return { value: filtered, changed };
  }
  if (value === sourceName) return { value: targetName, changed: true };
  return { value, changed: false };
}

async function updatePosts(
  posts: HexoPost[],
  type: TaxonomyType,
  update: (value: unknown) => { value: unknown; changed: boolean },
  savePost: (post: HexoPost) => Promise<void>,
): Promise<{ updatedCount: number }> {
  let updatedCount = 0;

  for (const post of posts) {
    const frontmatter: Frontmatter = { ...post.frontmatter };
    let changed = false;

    if (type === "tag") {
      const result = update(frontmatter.tags);
      if (result.changed) {
        changed = true;
        if (typeof result.value === "undefined") delete frontmatter.tags;
        else frontmatter.tags = result.value as Frontmatter["tags"];
      }
    } else {
      const categoryResult = update(frontmatter.category);
      if (categoryResult.changed) {
        changed = true;
        if (typeof categoryResult.value === "undefined") delete frontmatter.category;
        else frontmatter.category = categoryResult.value as string;
      }

      const categoriesResult = update(frontmatter.categories);
      if (categoriesResult.changed) {
        changed = true;
        if (typeof categoriesResult.value === "undefined") delete frontmatter.categories;
        else frontmatter.categories = categoriesResult.value as Frontmatter["categories"];
      }
    }

    if (changed) {
      await savePost({ ...post, frontmatter });
      updatedCount += 1;
    }
  }

  return { updatedCount };
}

export const Route = createFileRoute("/api/github/tags")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        try {
          const posts = await ctx.github.getPosts(ctx.config.postsDir);
          const tagMap = new Map<string, number>();
          const categoryMap = new Map<string, number>();

          posts.forEach((post) => {
            addValues(tagMap, post.frontmatter.tags);
            addValues(categoryMap, post.frontmatter.category);
            addValues(categoryMap, post.frontmatter.categories);
          });

          return json({ tags: toItems(tagMap), categories: toItems(categoryMap), total: posts.length });
        } catch (error) {
          return json({ error: getErrorMessage(error), tags: [], categories: [], total: 0 }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { type?: TaxonomyType; oldName?: string; newName?: string };
        if ((body.type !== "tag" && body.type !== "category") || !body.oldName || !body.newName) {
          return json({ error: "INVALID_TAXONOMY_RENAME" }, 400);
        }

        try {
          const posts = await ctx.github.getPosts(ctx.config.postsDir);
          const result = await updatePosts(
            posts,
            body.type,
            (value) => replaceValue(value, body.oldName as string, body.newName as string),
            (post) => ctx.github.savePost(post),
          );
          return json(result);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      DELETE: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { type?: TaxonomyType; name?: string };
        if ((body.type !== "tag" && body.type !== "category") || !body.name) {
          return json({ error: "INVALID_TAXONOMY_DELETE" }, 400);
        }

        try {
          const posts = await ctx.github.getPosts(ctx.config.postsDir);
          const result = await updatePosts(
            posts,
            body.type,
            (value) => removeValue(value, body.name as string),
            (post) => ctx.github.savePost(post),
          );
          return json(result);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      PUT: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { type?: TaxonomyType; sourceName?: string; targetName?: string };
        if ((body.type !== "tag" && body.type !== "category") || !body.sourceName || !body.targetName) {
          return json({ error: "INVALID_TAXONOMY_MERGE" }, 400);
        }

        try {
          const posts = await ctx.github.getPosts(ctx.config.postsDir);
          const result = await updatePosts(
            posts,
            body.type,
            (value) => mergeValues(value, body.sourceName as string, body.targetName as string),
            (post) => ctx.github.savePost(post),
          );
          return json(result);
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
