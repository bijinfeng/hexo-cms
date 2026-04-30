import { createAPIFileRoute } from "@tanstack/react-start/api";
import { GitHubService } from "@hexo-cms/core";
import { auth } from "../../lib/auth";

export const APIRoute = createAPIFileRoute("/api/github/posts")({
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

      // If path is provided, get single post
      if (path) {
        const post = await github.getPost(path);
        if (!post) {
          return new Response(
            JSON.stringify({ error: "Post not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ post }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Otherwise get all posts
      const posts = await github.getPosts();

      return new Response(JSON.stringify({ posts }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch posts" }),
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
      const { owner, repo, token, post, commitMessage } = body;

      if (!owner || !repo || !token || !post) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });
      const success = await github.savePost(post, commitMessage);

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to save post" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to save post:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save post" }),
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
          JSON.stringify({ error: "Failed to delete post" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to delete post:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete post" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
