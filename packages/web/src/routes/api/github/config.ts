import { createFileRoute } from "@tanstack/react-router";
import { json, getAuth, getDb } from "../../../lib/server-utils";

export const Route = createFileRoute("/api/github/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const db = await getDb();
        const config = db.prepare("SELECT * FROM github_config WHERE user_id = ? ORDER BY id DESC LIMIT 1").get(session.user.id);
        return json({ config });
      },
      POST: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body = await request.json();
        if (!body.owner || !body.repo) return json({ error: "Missing required fields" }, 400);
        const db = await getDb();
        const existing = db.prepare("SELECT id FROM github_config WHERE user_id = ?").get(session.user.id);
        if (existing) {
          db.prepare("UPDATE github_config SET owner=?,repo=?,branch=?,posts_dir=?,media_dir=?,workflow_file=?,auto_deploy=?,deploy_notifications=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").run(body.owner, body.repo, body.branch || "main", body.posts_dir || "source/_posts", body.media_dir || "source/images", body.workflow_file || ".github/workflows/deploy.yml", body.auto_deploy !== false ? 1 : 0, body.deploy_notifications !== false ? 1 : 0, session.user.id);
        } else {
          db.prepare("INSERT INTO github_config (user_id,owner,repo,branch,posts_dir,media_dir,workflow_file,auto_deploy,deploy_notifications) VALUES (?,?,?,?,?,?,?,?,?)").run(session.user.id, body.owner, body.repo, body.branch || "main", body.posts_dir || "source/_posts", body.media_dir || "source/images", body.workflow_file || ".github/workflows/deploy.yml", body.auto_deploy !== false ? 1 : 0, body.deploy_notifications !== false ? 1 : 0);
        }
        return json({ success: true });
      },
    },
  },
});
