import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../lib/server-utils";

export const Route = createFileRoute("/api/deploy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        try {
          const { data: workflow } = await ctx.octokit.request("GET /repos/{owner}/{repo}/actions/workflows", { owner: ctx.config.owner, repo: ctx.config.repo });
          const { data: runs } = await ctx.octokit.request("GET /repos/{owner}/{repo}/actions/runs", { owner: ctx.config.owner, repo: ctx.config.repo, per_page: 10 });
          return json({ workflows: workflow.workflows, recentRuns: runs.workflow_runs });
        } catch { return json({ workflows: [], recentRuns: [] }); }
      },
      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);
        const { workflow_id, ref = "main" } = await request.json();
        try { await ctx.octokit.request("POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", { owner: ctx.config.owner, repo: ctx.config.repo, workflow_id, ref }); return json({ success: true }); } catch (e: any) { return json({ error: e.message }, 500); }
      },
    },
  },
});
