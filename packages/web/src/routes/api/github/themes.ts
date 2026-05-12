import { createFileRoute } from "@tanstack/react-router";
import { getGitHubCtx, githubCtxErrorResponse, json } from "../../../lib/server-utils";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function parseYamlScalar(content: string, key: string): string {
  const match = content.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function setYamlScalar(content: string, key: string, value: string): string {
  const pattern = new RegExp(`^(${key}:\\s*)(.+)$`, "m");
  if (pattern.test(content)) return content.replace(pattern, `$1${value}`);
  return `${content.trimEnd()}\n${key}: ${value}\n`;
}

export const Route = createFileRoute("/api/github/themes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        try {
          const [themeEntries, configFile] = await Promise.all([
            ctx.github.listDirectory("themes"),
            ctx.github.getRawFile("_config.yml"),
          ]);

          const installedThemes = themeEntries
            .filter((entry) => entry.type === "dir")
            .map((entry) => ({ name: entry.name, path: entry.path }));
          const currentTheme = configFile ? parseYamlScalar(configFile.content, "theme") : "";

          return json({ currentTheme, installedThemes });
        } catch (error) {
          return json({ error: getErrorMessage(error), currentTheme: "", installedThemes: [] }, 500);
        }
      },

      POST: async ({ request }) => {
        const ctx = await getGitHubCtx(request);
        if (!ctx.ok) return githubCtxErrorResponse(ctx.error);

        const { theme } = (await request.json()) as { theme?: string };
        if (!theme) return json({ error: "INVALID_THEME" }, 400);

        try {
          const configFile = await ctx.github.getRawFile("_config.yml");
          if (!configFile) return json({ error: "CONFIG_NOT_FOUND" }, 404);

          await ctx.github.writeRawFile("_config.yml", setYamlScalar(configFile.content, "theme", theme), `Switch theme to ${theme}`);
          return json({ success: true });
        } catch (error) {
          return json({ error: getErrorMessage(error) }, 500);
        }
      },
    },
  },
});
