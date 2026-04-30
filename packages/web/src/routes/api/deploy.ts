import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "../../../lib/auth";
import { Octokit } from "octokit";

export const APIRoute = createAPIFileRoute("/api/deploy")({
  GET: async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const url = new URL(request.url);
      const owner = url.searchParams.get("owner");
      const repo = url.searchParams.get("repo");
      const token = url.searchParams.get("token");

      if (!owner || !repo || !token) {
        return new Response(
          JSON.stringify({ error: "Missing owner, repo, or token" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const octokit = new Octokit({ auth: token });

      // Get workflow runs
      const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 20,
      });

      const runs = data.workflow_runs.map((run) => ({
        id: String(run.id),
        name: run.name || run.display_title,
        message: run.display_title || run.head_commit?.message?.split("\n")[0] || "—",
        branch: run.head_branch,
        sha: run.head_sha.slice(0, 7),
        author: run.actor?.login || "—",
        status: mapStatus(run.status, run.conclusion),
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        duration: calcDuration(run.created_at, run.updated_at, run.status),
        url: run.html_url,
        workflowName: run.name,
      }));

      // Get latest Pages deployment URL
      let siteUrl: string | null = null;
      try {
        const { data: pagesData } = await octokit.rest.repos.getPages({ owner, repo });
        siteUrl = pagesData.html_url || null;
      } catch {
        // Pages not configured — ignore
      }

      const successCount = runs.filter((r) => r.status === "success").length;
      const failedCount = runs.filter((r) => r.status === "failed").length;
      const avgDurationMs = runs
        .filter((r) => r.status === "success" && r.duration !== null)
        .reduce((sum, r, _, arr) => sum + (r.duration as number) / arr.length, 0);

      return new Response(
        JSON.stringify({ runs, siteUrl, successCount, failedCount, avgDurationMs }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      console.error("Failed to fetch deployments:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to fetch deployments" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  POST: async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await request.json();
      const { owner, repo, token, workflowFile, branch } = body;

      if (!owner || !repo || !token || !workflowFile) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const octokit = new Octokit({ auth: token });

      await octokit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowFile,
        ref: branch || "main",
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Failed to trigger deployment:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to trigger deployment" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});

function mapStatus(
  status: string | null,
  conclusion: string | null
): "success" | "failed" | "running" | "pending" {
  if (status === "completed") {
    return conclusion === "success" ? "success" : "failed";
  }
  if (status === "in_progress") return "running";
  return "pending";
}

function calcDuration(
  createdAt: string,
  updatedAt: string,
  status: string | null
): number | null {
  if (status !== "completed") return null;
  const ms = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  return ms > 0 ? ms : null;
}
