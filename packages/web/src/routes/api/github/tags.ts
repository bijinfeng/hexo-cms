import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/tags")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        try {
          const { data: contents } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: ctx.config.posts_dir || "source/_posts" });
          const files = Array.isArray(contents) ? contents.filter((f: any) => f.name.endsWith(".md")) : [];
          const tags = new Set<string>(); const categories = new Set<string>();
          await Promise.all(files.map(async (f: any) => {
            try {
              const { data } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: f.path });
              const content = Buffer.from((data as any).content, "base64").toString("utf-8");
              const m = content.match(/^---\n[\s\S]*?\n---/);
              if (m) {
                for (const line of m[0].split("\n")) {
                  if (line.startsWith("tags:") || line.startsWith("  - ")) {
                    const t = line.replace(/^tags:\s*\[\s*|^\s*-\s*|["',\]\s]/g, "").trim();
                    if (t) tags.add(t);
                  }
                  if (line.startsWith("categories:")) {
                    const c = line.replace(/^categories:\s*\[\s*|^\s*-\s*|["',\]\s]/g, "").trim();
                    if (c) categories.add(c);
                  }
                }
              }
            } catch { void 0; }
          }));
          return json({ tags: Array.from(tags).map((t: string) => ({ name: t })), categories: Array.from(categories).map((c: string) => ({ name: c })) });
        } catch { return json({ tags: [], categories: [] }); }
      },
    },
  },
});
