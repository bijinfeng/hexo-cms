import { createFileRoute } from "@tanstack/react-router";
import type { HexoPost } from "@hexo-cms/core";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function resolvePagePath(page: Partial<HexoPost>): string | null {
  if (typeof page.path === "string" && page.path.trim()) return page.path;
  const slug = typeof page.frontmatter?.slug === "string" ? page.frontmatter.slug.trim() : "";
  return slug ? `source/${slug}/index.md` : null;
}

export const Route = createFileRoute("/api/github/pages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const url = new URL(request.url);
        const path = url.searchParams.get("path");

        try {
          if (path) {
            const page = await ctx.github.getPost(path);
            if (!page) return json({ error: "NOT_FOUND" }, 404);
            return json({ page });
          }

          const entries = await ctx.github.listDirectory("source");
          const pages = await Promise.all(
            entries
              .filter((entry) => entry.type === "dir" || (entry.type === "file" && entry.name.endsWith(".md") && entry.name !== "index.md"))
              .map(async (entry) => {
                const pagePath = entry.type === "dir" ? `${entry.path}/index.md` : entry.path;
                return ctx.github.getPost(pagePath);
              }),
          );

          return json({ pages: pages.filter((page): page is HexoPost => page !== null) });
        } catch (error) {
          return json({ error: getErrorMessage(error), pages: [] }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as Partial<HexoPost>;
        const path = resolvePagePath(body);
        if (!path || typeof body.content !== "string") {
          return json({ error: "INVALID_PAGE" }, 400);
        }

        const page: HexoPost = {
          path,
          title: typeof body.title === "string" ? body.title : String(body.frontmatter?.title ?? ""),
          date: typeof body.date === "string" ? body.date : String(body.frontmatter?.date ?? ""),
          content: body.content,
          frontmatter: body.frontmatter ?? {},
        };

        try {
          await ctx.github.savePost(page);
          return json({ success: true });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },

      DELETE: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const { path } = (await request.json()) as { path?: string };
        if (!path) return json({ error: "INVALID_PATH" }, 400);

        try {
          await ctx.github.deletePost(path);
          return json({ success: true });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
