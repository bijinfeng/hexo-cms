import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/pages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        try {
          const { data: contents } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: "source" });
          const files = Array.isArray(contents) ? contents.filter((f: any) => f.name.endsWith(".md") && f.name !== "index.md") : [];
          return json({ pages: files.map((f: any) => ({ path: f.path, slug: f.name.replace(/\.md$/, ""), title: f.name.replace(/\.md$/, "") })) });
        } catch { return json({ pages: [] }); }
      },
      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        const page = await request.json();
        try {
          let sha: string | undefined;
          try { const { data: existing } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: `source/${page.slug}.md` }); sha = (existing as any).sha; } catch { void 0; }
          await ctx.octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: `source/${page.slug}.md`, message: sha ? `Update page: ${page.slug}` : `New page: ${page.slug}`, content: Buffer.from(page.content || "").toString("base64"), sha });
          return json({ success: true });
        } catch (e: any) { return json({ error: e.message }, 500); }
      },
      DELETE: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        const { path: pagePath } = await request.json();
        try { const { data: existing } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: pagePath }); await ctx.octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: pagePath, message: `Delete page: ${pagePath}`, sha: (existing as any).sha }); return json({ success: true }); } catch (e: any) { return json({ error: e.message }, 500); }
      },
    },
  },
});
