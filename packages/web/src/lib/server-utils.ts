import type { Octokit as OctokitType } from "octokit";
import { GitHubService } from "@hexo-cms/core";
import type { GitHubConfig } from "@hexo-cms/core";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { account, githubConfig } from "./schema";

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

export function getGitHubAccessToken(userId: string): string | null {
  const row = db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
    .orderBy(desc(account.updatedAt))
    .limit(1)
    .get();

  return row?.accessToken ?? null;
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

  const config = db
    .select()
    .from(githubConfig)
    .where(eq(githubConfig.userId, session.user.id))
    .get();

  if (!config) return { ok: false as const, error: "config_missing" as const };

  const { auth } = await import("../lib/auth");
  const accessToken = await getGitHubAccessTokenFromAuth(auth.api, request.headers);
  if (!accessToken) return { ok: false as const, error: "reauthorization_required" as const };

  const { Octokit } = await import("octokit");
  const normalizedConfig: GitHubConfig = {
    owner: config.owner,
    repo: config.repo,
    branch: config.branch ?? "main",
    postsDir: config.postsDir ?? "source/_posts",
    mediaDir: config.mediaDir ?? "source/images",
    workflowFile: config.workflowFile ?? ".github/workflows/deploy.yml",
    autoDeploy: config.autoDeploy ?? true,
    deployNotifications: config.deployNotifications ?? true,
  };

  return {
    ok: true as const,
    session,
    config: normalizedConfig,
    octokit: new Octokit({
      auth: accessToken,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }) as OctokitType,
    github: new GitHubService(accessToken, normalizedConfig),
  };
}
