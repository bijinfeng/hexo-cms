import { createAPIFileRoute } from "@tanstack/react-start/api";
import { GitHubService } from "@hexo-cms/core";
import { auth } from "../../lib/auth";

export const APIRoute = createAPIFileRoute("/api/github/pages")({
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
      const accessToken = url.searchParams.get("token");
      const path = url.searchParams.get("path");

      if (!owner || !repo || !accessToken) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters: owner, repo, token" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(accessToken, { owner, repo });

      // If path is provided, get single page
      if (path) {
        const page = await github.getPost(path);
        if (!page) {
          return new Response(
            JSON.stringify({ error: "Page not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ page }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Otherwise get all pages from source/ directory (excluding _posts)
      const pages = await github.getPosts("source");

      return new Response(JSON.stringify({ pages }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to fetch pages:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pages" }),
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
      const { owner, repo, token, page, commitMessage } = body;

      if (!owner || !repo || !token || !page) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });
      const success = await github.savePost(page, commitMessage);

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to save page" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to save page:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save page" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },

  DELETE: async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await request.json();
      const { owner, repo, token, path, commitMessage } = body;

      if (!owner || !repo || !token || !path) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });
      const success = await github.deletePost(path, commitMessage);

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to delete page" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to delete page:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete page" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
