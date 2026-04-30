import { createAPIFileRoute } from "@tanstack/react-start/api";
import { GitHubService } from "@hexo-cms/core";
import { auth } from "../../lib/auth";

export const APIRoute = createAPIFileRoute("/api/github/media")({
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
      const directory = url.searchParams.get("dir") || "source/images";

      if (!owner || !repo || !accessToken) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(accessToken, { owner, repo });
      const files = await github.getMediaFiles(directory);

      return new Response(JSON.stringify({ files }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to fetch media:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch media" }),
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

      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const owner = formData.get("owner") as string;
      const repo = formData.get("repo") as string;
      const token = formData.get("token") as string;
      const directory = (formData.get("dir") as string) || "source/images";

      if (!file || !owner || !repo || !token) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64Content = Buffer.from(arrayBuffer).toString("base64");
      const filePath = `${directory}/${file.name}`;

      const github = new GitHubService(token, { owner, repo });
      const result = await github.uploadMedia(filePath, base64Content, file.name);

      if (!result) {
        return new Response(
          JSON.stringify({ error: "Failed to upload file" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true, path: filePath, url: result.url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to upload media:", error);
      return new Response(
        JSON.stringify({ error: "Failed to upload media" }),
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
      const { owner, repo, token, path } = body;

      if (!owner || !repo || !token || !path) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });
      const success = await github.deleteMedia(path);

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to delete file" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to delete media:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete media" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
