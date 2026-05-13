import type { AuthSession, AuthUser } from "@hexo-cms/ui/types/auth";

export interface StoredOAuthSession {
  accessToken: string;
  tokenType?: string;
  scope?: string;
  githubUserId?: string;
  user?: AuthUser | null;
  createdAt: string;
  lastValidatedAt?: string;
}

export interface DeviceFlowStartResult {
  deviceCode: string;
  session: AuthSession;
}

type Fetcher = typeof fetch;

const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

const DEFAULT_SCOPE = "repo user";

export function createAnonymousSession(): AuthSession {
  return { state: "anonymous" };
}

export function createAuthenticatedSession(stored: StoredOAuthSession): AuthSession {
  return {
    state: "authenticated",
    user: stored.user ?? (stored.githubUserId ? { id: stored.githubUserId } : null),
  };
}

export function createDeviceFlowSession(
  deviceFlow: AuthSession["deviceFlow"] | null,
  error?: string | null,
): AuthSession {
  if (deviceFlow) {
    return {
      state: "authenticating",
      deviceFlow,
    };
  }

  if (error) {
    return {
      state: "error",
      error,
    };
  }

  return createAnonymousSession();
}

export function parseStoredOAuthSession(value: string | null): StoredOAuthSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredOAuthSession>;
    if (!parsed.accessToken) return null;
    return {
      accessToken: parsed.accessToken,
      tokenType: parsed.tokenType,
      scope: parsed.scope,
      githubUserId: parsed.githubUserId,
      user: parsed.user ?? null,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      lastValidatedAt: parsed.lastValidatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeStoredOAuthSession(session: StoredOAuthSession): string {
  return JSON.stringify(session);
}

export async function startGitHubDeviceFlow({
  clientId,
  fetcher = fetch,
  now = () => new Date(),
}: {
  clientId: string;
  fetcher?: Fetcher;
  now?: () => Date;
}): Promise<DeviceFlowStartResult> {
  if (!clientId) {
    return {
      deviceCode: "",
      session: { state: "error", error: "AUTH_NOT_CONFIGURED" },
    };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    scope: DEFAULT_SCOPE,
  });

  const response = await fetcher(GITHUB_DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    return {
      deviceCode: "",
      session: { state: "error", error: "AUTH_NETWORK_ERROR" },
    };
  }

  const payload = await response.json() as {
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    expires_in?: number;
    interval?: number;
    error?: string;
  };

  if (payload.error || !payload.device_code || !payload.user_code || !payload.verification_uri) {
    return {
      deviceCode: "",
      session: { state: "error", error: mapDeviceFlowError(payload.error) },
    };
  }

  const expiresAt = new Date(now().getTime() + (payload.expires_in ?? 900) * 1000).toISOString();
  const interval = payload.interval ?? 5;

  return {
    deviceCode: payload.device_code,
    session: {
      state: "authenticating",
      deviceFlow: {
        userCode: payload.user_code,
        verificationUri: payload.verification_uri,
        expiresAt,
        interval,
      },
    },
  };
}

export async function pollGitHubDeviceFlowToken({
  clientId,
  deviceCode,
  fetcher = fetch,
}: {
  clientId: string;
  deviceCode: string;
  fetcher?: Fetcher;
}): Promise<{ status: "pending" | "slow_down"; intervalDelta?: number } | { status: "success"; token: string; tokenType?: string; scope?: string } | { status: "error"; error: string }> {
  const body = new URLSearchParams({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });

  const response = await fetcher(GITHUB_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) return { status: "error", error: "AUTH_NETWORK_ERROR" };

  const payload = await response.json() as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
  };

  if (payload.access_token) {
    return {
      status: "success",
      token: payload.access_token,
      tokenType: payload.token_type,
      scope: payload.scope,
    };
  }

  if (payload.error === "authorization_pending") return { status: "pending" };
  if (payload.error === "slow_down") return { status: "slow_down", intervalDelta: 5 };
  return { status: "error", error: mapDeviceFlowError(payload.error) };
}

export async function fetchGitHubUser(accessToken: string, fetcher: Fetcher = fetch): Promise<AuthUser | null> {
  const response = await fetcher(GITHUB_USER_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) return null;

  const user = await response.json() as {
    id?: number;
    login?: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  };

  return {
    id: user.id ? String(user.id) : undefined,
    login: user.login,
    name: user.name ?? user.login ?? null,
    email: user.email ?? null,
    avatarUrl: user.avatar_url ?? null,
  };
}

function mapDeviceFlowError(error?: string): string {
  switch (error) {
    case "expired_token":
      return "AUTH_TIMEOUT";
    case "access_denied":
      return "AUTH_REJECTED";
    case "device_flow_disabled":
      return "AUTH_DEVICE_FLOW_DISABLED";
    case "incorrect_client_credentials":
    case "incorrect_device_code":
      return "AUTH_NOT_CONFIGURED";
    default:
      return "AUTH_NETWORK_ERROR";
  }
}
