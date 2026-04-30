import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "../../lib/auth";
import Database from "better-sqlite3";

const db = new Database("./hexo-cms.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS github_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    branch TEXT DEFAULT 'main',
    posts_dir TEXT DEFAULT 'source/_posts',
    media_dir TEXT DEFAULT 'source/images',
    workflow_file TEXT DEFAULT '.github/workflows/deploy.yml',
    auto_deploy INTEGER DEFAULT 1,
    deploy_notifications INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export const APIRoute = createAPIFileRoute("/api/github/config")({
  GET: async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const config = db
        .prepare("SELECT * FROM github_config WHERE user_id = ? ORDER BY id DESC LIMIT 1")
        .get(session.user.id);

      return new Response(JSON.stringify({ config }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to get GitHub config:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get config" }),
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
      const {
        owner,
        repo,
        branch = "main",
        posts_dir = "source/_posts",
        media_dir = "source/images",
        workflow_file = ".github/workflows/deploy.yml",
        auto_deploy = true,
        deploy_notifications = true,
      } = body;

      if (!owner || !repo) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: owner, repo" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const existingConfig = db
        .prepare("SELECT id FROM github_config WHERE user_id = ?")
        .get(session.user.id);

      if (existingConfig) {
        db.prepare(`
          UPDATE github_config
          SET owner = ?, repo = ?, branch = ?, posts_dir = ?, media_dir = ?,
              workflow_file = ?, auto_deploy = ?, deploy_notifications = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(
          owner, repo, branch, posts_dir, media_dir,
          workflow_file, auto_deploy ? 1 : 0, deploy_notifications ? 1 : 0,
          session.user.id
        );
      } else {
        db.prepare(`
          INSERT INTO github_config
          (user_id, owner, repo, branch, posts_dir, media_dir, workflow_file, auto_deploy, deploy_notifications)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          session.user.id, owner, repo, branch, posts_dir,
          media_dir, workflow_file, auto_deploy ? 1 : 0, deploy_notifications ? 1 : 0
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to save GitHub config:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save config" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
