import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/themes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        try {
          const [themes, configContent] = await Promise.all([
            ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: "themes" }).then(r => Array.isArray(r.data) ? r.data.filter((f: any) => f.type === "dir").map((f: any) => ({ name: f.name, path: f.path })) : []).catch(() => []),
            ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: "_config.yml" }).then(r => Buffer.from((r.data as any).content, "base64").toString("utf-8")).catch(() => ""),
          ]);
          return json({ themes, currentTheme: configContent.match(/^theme:\s*(.+)/m)?.[1]?.trim() || "unknown" });
        } catch { return json({ themes: [], currentTheme: "unknown" }); }
      },
      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        const { theme } = await request.json();
        try {
          const { data: existing } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: "_config.yml" });
          const content = Buffer.from((existing as any).content, "base64").toString("utf-8");
          await ctx.octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", { owner: ctx.config.owner, repo: ctx.config.repo, path: "_config.yml", message: `Switch theme to ${theme}`, content: Buffer.from(content.replace(/^theme:\s*.+/m, `theme: ${theme}`)).toString("base64"), sha: (existing as any).sha });
          return json({ success: true });
        } catch (e: any) { return json({ error: e.message }, 500); }
      },
    },
  },
});
