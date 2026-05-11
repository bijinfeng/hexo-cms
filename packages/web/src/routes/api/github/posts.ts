import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/posts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        try {
          const { data: contents } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: ctx.config.postsDir || "source/_posts" });
          const files = Array.isArray(contents) ? contents.filter((f: any) => f.name.endsWith(".md")) : [];
          const posts = (await Promise.all(files.map(async (f: any) => {
            try {
              const { data } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: f.path });
              const content = Buffer.from((data as any).content, "base64").toString("utf-8");
              const fm = content.match(/^---\n([\s\S]*?)\n---\n?/);
              const meta: Record<string, any> = {};
              if (fm) fm[1].split("\n").forEach(l => { const m = l.match(/^(\w+):\s*(.+)/); if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, "").trim(); });
              return { path: f.path, title: meta.title || f.name, slug: f.name.replace(/\.md$/, ""), content, date: meta.date || "", tags: meta.tags ? meta.tags.split(",").map((t: string) => t.trim()) : [], categories: meta.categories ? meta.categories.split(",").map((c: string) => c.trim()) : [], published: !meta.draft };
            } catch { return null; }
          }))).filter(Boolean);
          return json({ posts });
        } catch { return json({ posts: [] }); }
      },
      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        const post = await request.json();
        const filePath = `${ctx.config.postsDir || "source/_posts"}/${post.slug}.md`;
        try {
          let sha: string | undefined;
          try { const { data: existing } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: filePath }); sha = (existing as any).sha; } catch { void 0; }
          await ctx.octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: filePath, message: sha ? `Update: ${post.slug}` : `New: ${post.slug}`, content: Buffer.from(post.content || "").toString("base64"), sha });
          return json({ success: true });
        } catch (e: any) { return json({ error: e.message }, 500); }
      },
      DELETE: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        const body = await request.json();
        const paths = Array.isArray(body) ? body : [body.path];
        try {
          await Promise.all(paths.map(async (p: string) => {
            const fp = p.startsWith(ctx.config.postsDir || "source/_posts") ? p : `${ctx.config.postsDir || "source/_posts"}/${p}`;
            try { const { data: existing } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: fp }); await ctx.octokit.request("DELETE /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: fp, message: `Delete: ${fp}`, sha: (existing as any).sha }); } catch { void 0; }
          }));
          return json({ success: true });
        } catch (e: any) { return json({ error: e.message }, 500); }
      },
    },
  },
});
