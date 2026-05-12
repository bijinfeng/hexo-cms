import { createFileRoute } from "@tanstack/react-router";
import type { HexoPost } from "@hexo-cms/core";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function resolvePostPath(post: Partial<HexoPost>, postsDir: string): string | null {
  if (typeof post.path === "string" && post.path.trim()) return post.path;
  const slug = typeof post.frontmatter?.slug === "string" ? post.frontmatter.slug.trim() : "";
  return slug ? `${postsDir}/${slug}.md` : null;
}

export const Route = createFileRoute("/api/github/posts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const url = new URL(request.url);
        const path = url.searchParams.get("path");

        try {
          if (path) {
            const post = await ctx.github.getPost(path);
            if (!post) return json({ error: "NOT_FOUND" }, 404);
            return json({ post });
          }

          const posts = await ctx.github.getPosts(ctx.config.postsDir);
          return json({ posts });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as Partial<HexoPost>;
        const path = resolvePostPath(body, ctx.config.postsDir ?? "source/_posts");
        if (!path || typeof body.content !== "string") {
          return json({ error: "INVALID_POST" }, 400);
        }

        const post: HexoPost = {
          path,
          title: typeof body.title === "string" ? body.title : String(body.frontmatter?.title ?? ""),
          date: typeof body.date === "string" ? body.date : String(body.frontmatter?.date ?? ""),
          content: body.content,
          frontmatter: body.frontmatter ?? {},
        };

        try {
          await ctx.github.savePost(post);
          return json({ success: true });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      DELETE: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { path?: string } | string[];
        const paths = Array.isArray(body) ? body : [body.path].filter((path): path is string => typeof path === "string");
        if (paths.length === 0) return json({ error: "INVALID_PATH" }, 400);

        try {
          await Promise.all(paths.map((path) => ctx.github.deletePost(path)));
          return json({ success: true });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
