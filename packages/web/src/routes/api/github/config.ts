import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "../../../lib/db";
import { githubConfig } from "../../../lib/schema";
import { json, getAuth } from "../../../lib/server-utils";

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return fallback;
}

function withLegacyConfigAliases(config: typeof githubConfig.$inferSelect | null | undefined) {
  if (!config) return null;
  return {
    ...config,
    posts_dir: config.postsDir,
    media_dir: config.mediaDir,
    workflow_file: config.workflowFile,
    auto_deploy: config.autoDeploy,
    deploy_notifications: config.deployNotifications,
  };
}

export const Route = createFileRoute("/api/github/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);

        const config = db
          .select()
          .from(githubConfig)
          .where(eq(githubConfig.userId, session.user.id))
          .get();

        return json({ config: withLegacyConfigAliases(config) });
      },
      POST: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const payload = await request.json();
        const body = payload.config ?? payload;
        if (!body.owner || !body.repo) return json({ error: "Missing required fields" }, 400);

        const existing = db
          .select({ id: githubConfig.id })
          .from(githubConfig)
          .where(eq(githubConfig.userId, session.user.id))
          .get();

        const values = {
          owner: body.owner,
          repo: body.repo,
          branch: body.branch || "main",
          postsDir: body.postsDir || body.posts_dir || "source/_posts",
          mediaDir: body.mediaDir || body.media_dir || "source/images",
          workflowFile: body.workflowFile || body.workflow_file || ".github/workflows/deploy.yml",
          autoDeploy: toBoolean(body.autoDeploy ?? body.auto_deploy, true),
          deployNotifications: toBoolean(body.deployNotifications ?? body.deploy_notifications, true),
          updatedAt: new Date().toISOString(),
        };

        if (existing) {
          db.update(githubConfig).set(values).where(eq(githubConfig.userId, session.user.id)).run();
        } else {
          db.insert(githubConfig).values({
            userId: session.user.id,
            ...values,
            createdAt: new Date().toISOString(),
          }).run();
        }

        return json({ success: true });
      },
    },
  },
});
