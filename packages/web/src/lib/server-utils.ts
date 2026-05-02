import type { Octokit as OctokitType } from "octokit";

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export async function getAuth(request: Request) {
  const { auth } = await import("../lib/auth");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  return session;
}

export async function getDb() {
  const Database = (await import("better-sqlite3")).default;
  const db = new Database("./hexo-cms.db");
  db.exec(`CREATE TABLE IF NOT EXISTS github_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
    owner TEXT NOT NULL, repo TEXT NOT NULL, branch TEXT DEFAULT 'main',
    posts_dir TEXT DEFAULT 'source/_posts', media_dir TEXT DEFAULT 'source/images',
    workflow_file TEXT DEFAULT '.github/workflows/deploy.yml',
    auto_deploy INTEGER DEFAULT 1, deploy_notifications INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  return db;
}

export async function getGitHubCtx(request: Request) {
  const session = await getAuth(request);
  if (!session) return null;
  const db = await getDb();
  const config = db.prepare("SELECT * FROM github_config WHERE user_id = ?").get(session.user.id) as any;
  if (!config) return null;
  const { Octokit } = await import("octokit");
  return { session, config, octokit: new Octokit({ auth: (session as any).session?.token || "" }) as OctokitType };
}
