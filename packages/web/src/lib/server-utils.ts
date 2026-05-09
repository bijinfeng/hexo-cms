import type { Octokit as OctokitType } from "octokit";

type StatementLike = {
  get: (...args: any[]) => unknown;
};

type DatabaseLike = {
  prepare: (sql: string) => StatementLike;
};

export type GitHubCtxError = "unauthorized" | "config_missing" | "reauthorization_required";

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

export function getGitHubAccessToken(db: DatabaseLike, userId: string): string | null {
  const account = db
    .prepare("SELECT accessToken FROM account WHERE userId = ? AND providerId = ? ORDER BY updatedAt DESC LIMIT 1")
    .get(userId, "github") as { accessToken?: string | null } | undefined;

  return account?.accessToken ?? null;
}

type BetterAuthAccessTokenApi = {
  getAccessToken: (input: {
    body: { providerId: "github" };
    headers: Headers;
  }) => Promise<{ accessToken?: string | null } | null | undefined>;
};

export async function getGitHubAccessTokenFromAuth(
  authApi: BetterAuthAccessTokenApi,
  headers: Headers,
): Promise<string | null> {
  let tokens: { accessToken?: string | null } | null | undefined;
  try {
    tokens = await authApi.getAccessToken({
      body: { providerId: "github" },
      headers,
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
    if (code === "ACCOUNT_NOT_FOUND" || code === "FAILED_TO_GET_ACCESS_TOKEN") {
      return null;
    }
    throw error;
  }

  return tokens?.accessToken ?? null;
}

export function githubCtxErrorResponse(error: GitHubCtxError): Response {
  switch (error) {
    case "unauthorized":
      return json({ error: "UNAUTHORIZED" }, 401);
    case "reauthorization_required":
      return json({ error: "REAUTH_REQUIRED" }, 401);
    case "config_missing":
      return json({ error: "CONFIG_REQUIRED" }, 404);
  }
}

export async function getGitHubCtx(request: Request) {
  const session = await getAuth(request);
  if (!session) return { ok: false as const, error: "unauthorized" as const };
  const db = await getDb();
  const config = db.prepare("SELECT * FROM github_config WHERE user_id = ?").get(session.user.id) as any;
  if (!config) return { ok: false as const, error: "config_missing" as const };
  const { auth } = await import("../lib/auth");
  const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
  if (!accessToken) return { ok: false as const, error: "reauthorization_required" as const };
  const { Octokit } = await import("octokit");
  return { ok: true as const, session, config, octokit: new Octokit({ auth: accessToken }) as OctokitType };
}
