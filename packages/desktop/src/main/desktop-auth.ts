import type { AuthSession } from "@hexo-cms/ui/types/auth";
import {
  createAnonymousSession,
  createAuthenticatedSession,
  createDeviceFlowSession,
  fetchGitHubUser as defaultFetchGitHubUser,
  parseStoredOAuthSession,
  pollGitHubDeviceFlowToken as defaultPollGitHubDeviceFlowToken,
  serializeStoredOAuthSession,
  startGitHubDeviceFlow as defaultStartGitHubDeviceFlow,
  type StoredOAuthSession,
} from "./auth";
import type { KeychainAdapter } from "./desktop-persistence";

const DEFAULT_OAUTH_SESSION_ACCOUNT = "github-oauth-session";
const DEFAULT_LEGACY_TOKEN_ACCOUNT = "github-token";
const DEFAULT_POLL_SLEEP_MS = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface DesktopAuthManager {
  getSession(): Promise<AuthSession>;
  getAccessToken(): Promise<string | null>;
  startDeviceFlow(): Promise<AuthSession>;
  signOut(): Promise<void>;
  reauthorize(): Promise<AuthSession>;
}

export interface DesktopAuthManagerOptions {
  clientId: string;
  keytarService: string;
  oauthSessionAccount?: string;
  legacyTokenAccount?: string;
  keychain?: () => Promise<KeychainAdapter>;
  invalidateGitHubService: () => void;
  openExternal(url: string): void;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  startGitHubDeviceFlow?: typeof defaultStartGitHubDeviceFlow;
  pollGitHubDeviceFlowToken?: typeof defaultPollGitHubDeviceFlowToken;
  fetchGitHubUser?: typeof defaultFetchGitHubUser;
}

export function createDesktopAuthManager({
  clientId,
  keytarService,
  oauthSessionAccount = DEFAULT_OAUTH_SESSION_ACCOUNT,
  legacyTokenAccount = DEFAULT_LEGACY_TOKEN_ACCOUNT,
  keychain = loadDefaultKeychain,
  invalidateGitHubService,
  openExternal,
  now = () => new Date(),
  sleep = DEFAULT_POLL_SLEEP_MS,
  startGitHubDeviceFlow = defaultStartGitHubDeviceFlow,
  pollGitHubDeviceFlowToken = defaultPollGitHubDeviceFlowToken,
  fetchGitHubUser = defaultFetchGitHubUser,
}: DesktopAuthManagerOptions): DesktopAuthManager {
  let activeDeviceFlow: { deviceCode: string; deviceFlow: NonNullable<AuthSession["deviceFlow"]> } | null = null;
  let lastDeviceFlowError: string | null = null;
  let pollingDeviceFlow = false;

  async function loadStoredOAuthSession(): Promise<StoredOAuthSession | null> {
    try {
      const keychainClient = await keychain();
      const value = await keychainClient.getPassword(keytarService, oauthSessionAccount);
      return parseStoredOAuthSession(value);
    } catch {
      return null;
    }
  }

  async function saveStoredOAuthSession(session: StoredOAuthSession): Promise<void> {
    const keychainClient = await keychain();
    await keychainClient.setPassword(keytarService, oauthSessionAccount, serializeStoredOAuthSession(session));
  }

  async function deleteStoredOAuthSession(): Promise<void> {
    try {
      const keychainClient = await keychain();
      await keychainClient.deletePassword(keytarService, oauthSessionAccount);
      await keychainClient.deletePassword(keytarService, legacyTokenAccount);
    } catch {
      // Signing out should be idempotent even if the OS keychain is unavailable.
    }
    activeDeviceFlow = null;
    lastDeviceFlowError = null;
    invalidateGitHubService();
  }

  async function getSession(): Promise<AuthSession> {
    const session = await loadStoredOAuthSession();
    if (session) return createAuthenticatedSession(session);
    if (activeDeviceFlow || lastDeviceFlowError) {
      return createDeviceFlowSession(activeDeviceFlow?.deviceFlow ?? null, lastDeviceFlowError);
    }
    return createAnonymousSession();
  }

  async function getAccessToken(): Promise<string | null> {
    const session = await loadStoredOAuthSession();
    return session?.accessToken ?? null;
  }

  async function startDeviceFlow(): Promise<AuthSession> {
    const started = await startGitHubDeviceFlow({ clientId, now });
    if (started.session.state !== "authenticating" || !started.session.deviceFlow) {
      return started.session;
    }

    activeDeviceFlow = {
      deviceCode: started.deviceCode,
      deviceFlow: started.session.deviceFlow,
    };
    lastDeviceFlowError = null;

    openExternal(started.session.deviceFlow.verificationUri);
    void pollActiveDeviceFlow();
    return started.session;
  }

  async function reauthorize(): Promise<AuthSession> {
    await deleteStoredOAuthSession();
    return startDeviceFlow();
  }

  async function pollActiveDeviceFlow(): Promise<void> {
    if (!activeDeviceFlow || pollingDeviceFlow) return;
    pollingDeviceFlow = true;

    try {
      while (activeDeviceFlow) {
        if (now().getTime() >= new Date(activeDeviceFlow.deviceFlow.expiresAt).getTime()) {
          activeDeviceFlow = null;
          lastDeviceFlowError = "AUTH_TIMEOUT";
          return;
        }

        await sleep(Math.max(activeDeviceFlow?.deviceFlow.interval ?? 5, 1) * 1000);
        if (!activeDeviceFlow) return;

        const result = await pollGitHubDeviceFlowToken({
          clientId,
          deviceCode: activeDeviceFlow.deviceCode,
        });

        if (result.status === "pending") continue;
        if (result.status === "slow_down") {
          activeDeviceFlow.deviceFlow.interval += result.intervalDelta ?? 5;
          continue;
        }
        if (result.status === "error") {
          activeDeviceFlow = null;
          lastDeviceFlowError = result.error;
          return;
        }
        if (result.status !== "success") continue;

        const user = await fetchGitHubUser(result.token);
        await saveStoredOAuthSession({
          accessToken: result.token,
          tokenType: result.tokenType,
          scope: result.scope,
          githubUserId: user?.id,
          user,
          createdAt: now().toISOString(),
          lastValidatedAt: now().toISOString(),
        });
        activeDeviceFlow = null;
        lastDeviceFlowError = null;
        invalidateGitHubService();
      }
    } finally {
      pollingDeviceFlow = false;
    }
  }

  return {
    getSession,
    getAccessToken,
    startDeviceFlow,
    signOut: deleteStoredOAuthSession,
    reauthorize,
  };
}

async function loadDefaultKeychain(): Promise<KeychainAdapter> {
  const keytar = await import("keytar");
  return keytar.default;
}
