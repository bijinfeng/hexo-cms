import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../lib/server-utils";

type GitHubWorkflowRun = {
  id: number | string;
  status?: string | null;
  conclusion?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function mapWorkflowRun(run: GitHubWorkflowRun) {
  const createdAt = run.created_at ?? "";
  const updatedAt = run.updated_at ?? createdAt;
  const status = run.status === "completed"
    ? (run.conclusion === "success" ? "success" : "failed")
    : run.status === "in_progress"
      ? "running"
      : "pending";

  return {
    id: String(run.id),
    status,
    createdAt,
    duration: createdAt && updatedAt ? new Date(updatedAt).getTime() - new Date(createdAt).getTime() : 0,
    conclusion: run.conclusion ?? "",
  };
}

export const Route = createFileRoute("/api/deploy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        try {
          const { data } = await ctx.octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
            owner: ctx.config.owner,
            repo: ctx.config.repo,
            per_page: 20,
          });
          const runs = Array.isArray(data.workflow_runs)
            ? data.workflow_runs.map((run) => mapWorkflowRun(run as GitHubWorkflowRun))
            : [];
          return json({ runs });
        } catch (error) {
          return json({ error: getErrorMessage(error), runs: [] }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const body = (await request.json()) as { workflowFile?: string; workflow_id?: string; ref?: string };
        const workflowId = body.workflowFile ?? body.workflow_id ?? ctx.config.workflowFile;
        if (!workflowId) return json({ error: "INVALID_WORKFLOW" }, 400);

        try {
          await ctx.octokit.request("POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", {
            owner: ctx.config.owner,
            repo: ctx.config.repo,
            workflow_id: workflowId,
            ref: body.ref ?? ctx.config.branch ?? "main",
          });
          return json({ success: true });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
