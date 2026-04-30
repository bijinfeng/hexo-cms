import { createAPIFileRoute } from "@tanstack/react-start/api";
import { GitHubService } from "@hexo-cms/core";
import { auth } from "../../lib/auth";

function parseYamlValue(yaml: string, key: string): string | null {
  const regex = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = yaml.match(regex);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

function setYamlValue(yaml: string, key: string, value: string): string {
  const regex = new RegExp(`^(${key}:\\s*)(.+)$`, "m");
  if (regex.test(yaml)) {
    return yaml.replace(regex, `$1${value}`);
  }
  return yaml + `\n${key}: ${value}`;
}

export const APIRoute = createAPIFileRoute("/api/github/themes")({
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
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });

      // Read _config.yml to get current theme
      const configFile = await github.getRawFile("_config.yml");
      const currentTheme = configFile ? parseYamlValue(configFile.content, "theme") : null;

      // List themes/ directory to get installed themes
      const themeEntries = await github.listDirectory("themes");
      const installedThemes = themeEntries
        .filter((e) => e.type === "dir")
        .map((e) => e.name);

      return new Response(
        JSON.stringify({ currentTheme, installedThemes }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Failed to fetch themes:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch themes" }),
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
      const { owner, repo, token, theme } = body;

      if (!owner || !repo || !token || !theme) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const github = new GitHubService(token, { owner, repo });

      const configFile = await github.getRawFile("_config.yml");
      if (!configFile) {
        return new Response(
          JSON.stringify({ error: "_config.yml not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const updatedConfig = setYamlValue(configFile.content, "theme", theme);
      const success = await github.writeRawFile(
        "_config.yml",
        updatedConfig,
        `切换主题为: ${theme}`
      );

      if (!success) {
        return new Response(
          JSON.stringify({ error: "Failed to update theme" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to switch theme:", error);
      return new Response(
        JSON.stringify({ error: "Failed to switch theme" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
